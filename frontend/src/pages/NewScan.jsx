import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { analyzeSonar } from '../services/api';
import { 
  UploadCloud, 
  FileImage, 
  X, 
  Cpu, 
  Radar, 
  CheckCircle,
  AlertTriangle,
  Crosshair,
  Server,
  Zap,
  Lock,
  ChevronRight
} from 'lucide-react';
import { GlassPanel, GlowButton, SectionHeader } from '../components/ui';

export default function NewScan() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processState, setProcessState] = useState(0); 
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    setError(null);
    if (!selectedFile.type.startsWith('image/')) {
      setError("INVALID FORMAT. SONAR INFERENCE REQUIRES IMAGE PAYLOADS.");
      return;
    }
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
  };

  const removeFile = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
  };

  const triggerAnalysis = async () => {
    if (!file) return;
    
    setProcessing(true);
    setError(null);
    setProcessState(1);

    try {
      setTimeout(() => setProcessState(2), 800);
      setTimeout(() => setProcessState(3), 2000);
      
      const result = await analyzeSonar(file);
      
      setProcessState(4);
      
      setTimeout(() => {
        navigate(`/results/${result.scan_id}`, { state: { result, imagePreview: preview } });
      }, 800);
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "AI INFERENCE PIPELINE FAILURE. PLEASE RETRY.");
      setProcessing(false);
      setProcessState(0);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6 h-full flex flex-col font-sans"
    >
      
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between border-b border-[rgba(32,220,197,0.18)] pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.25em] uppercase text-[#F2F7F5] shadow-black drop-shadow-md">SCAN ANALYSIS</h1>
          </div>
          <p className="text-[#20DCC5] font-mono text-xs tracking-[0.3em] uppercase">
            TARGET ACQUISITION & INFERENCE
          </p>
        </div>
        
        {/* Decorative Status Bar */}
        <div className="hidden md:flex gap-6 text-[9px] font-mono tracking-widest text-[#607874] uppercase">
          <div className="flex items-center gap-2"><Server className="w-3 h-3 text-[#20DCC5]" /> GPU CLUSTER READY</div>
          <div className="flex items-center gap-2"><Lock className="w-3 h-3 text-[#20DCC5]" /> SECURE UPLINK</div>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-500/10 border border-red-500/50 rounded flex items-center justify-between p-4 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <div className="flex items-center text-red-500 font-mono text-xs tracking-widest uppercase">
                <AlertTriangle className="w-4 h-4 mr-3" />
                {error}
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-[#F2F7F5] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Upload & Preview */}
        <motion.div variants={item} className="lg:col-span-8 flex flex-col gap-6 h-full">
          <GlassPanel className="p-0 flex-1 relative flex flex-col overflow-hidden border border-[rgba(32,220,197,0.18)]" borderTop>
            
            {/* Header Area */}
            <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center z-20">
              <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Crosshair className="w-3 h-3 text-[#20DCC5]" /> PAYLOAD ACQUISITION
              </h3>
            </div>

            <div className="flex-1 relative bg-[#02090B] flex flex-col p-6 overflow-hidden">
              <AnimatePresence mode="wait">
                {!processing ? (
                  <motion.div 
                    key="upload-ui"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col h-full z-10"
                  >
                    {!file ? (
                      <div 
                        className={`
                          flex-1 border-2 border-dashed rounded-xl transition-all duration-300
                          flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer
                          ${dragActive ? 'border-[#20DCC5] bg-[#20DCC5]/10 shadow-[0_0_30px_rgba(40,224,196,0.15)]' : 'border-[rgba(32,220,197,0.18)] hover:border-[#20DCC5]/50 hover:bg-white/5'}
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="w-24 h-24 rounded-full bg-[#0F6F70]/30 flex items-center justify-center mb-8 text-[#20DCC5] group-hover:scale-110 group-hover:bg-[#20DCC5]/10 transition-all duration-500 border border-transparent group-hover:border-[#20DCC5]/30">
                          <UploadCloud className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-[#F2F7F5] mb-2 tracking-[0.2em] uppercase">DRAG & DROP SONAR PAYLOAD</h3>
                        <p className="text-[#607874] font-mono text-[10px] tracking-[0.2em] uppercase mb-8">OR CLICK TO BROWSE SECURE DIRECTORY</p>
                        
                        <input 
                          ref={fileInputRef}
                          type="file" 
                          className="hidden" 
                          accept="image/jpeg, image/png, image/jpg"
                          onChange={handleChange}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col flex-1 h-full">
                        <div className="flex justify-between items-center mb-4 p-4 bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded bg-[#20DCC5]/10 border border-[#20DCC5]/30 text-[#20DCC5]">
                              <FileImage className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-[#F2F7F5] font-mono tracking-widest text-xs uppercase">{file.name}</h3>
                              <p className="text-[#607874] font-mono text-[9px] tracking-widest mt-1">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB — READY FOR TRANSFER
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(); }}
                            className="p-2 text-[#A8BDB9] hover:text-red-400 rounded hover:bg-red-400/10 transition-colors border border-transparent hover:border-red-400/30"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="relative w-full flex-1 rounded overflow-hidden border border-[rgba(32,220,197,0.18)] bg-black group">
                          <img 
                            src={preview} 
                            alt="Sonar Preview" 
                            className="absolute inset-0 w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(40,224,196,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(40,224,196,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
                          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]" />
                          
                          {/* Scanning Laser Line (Decorative) */}
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-[#20DCC5] shadow-[0_0_15px_#20DCC5] opacity-0 group-hover:opacity-50 animate-scan pointer-events-none" />

                          <div className="absolute bottom-4 right-4 bg-black/80 px-3 py-1 font-mono text-[9px] text-[#20DCC5] tracking-widest border border-[#20DCC5]/30 backdrop-blur">
                            RAW ACOUSTIC FEED
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="processing-ui"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center flex-1 z-10"
                  >
                    <div className="relative w-48 h-48 mb-12">
                      <div className="absolute inset-0 border border-[rgba(32,220,197,0.18)] rounded-full" />
                      <div className="absolute inset-4 border border-[#20DCC5]/30 rounded-full border-t-[#20DCC5] animate-spin" style={{ animationDuration: '3s' }} />
                      <div className="absolute inset-8 border border-[#20DCC5]/20 rounded-full border-b-[#20DCC5] animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                      <div className="absolute inset-12 border border-[#20DCC5]/10 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(0, 240, 255, 0.4) 100%)', animation: 'spin 1.5s linear infinite' }} />
                      
                      <div className="absolute inset-0 flex items-center justify-center text-[#20DCC5]">
                        <Radar className="w-12 h-12 animate-pulse" />
                      </div>
                    </div>
                    
                    <h2 className="text-2xl font-bold tracking-[0.3em] text-[#F2F7F5] mb-10 uppercase drop-shadow-[0_0_10px_rgba(40,224,196,0.8)]">EXECUTING INTELLIGENCE PROTOCOL</h2>
                    
                    <div className="w-full max-w-md space-y-6 font-mono text-[10px] tracking-[0.2em] uppercase">
                      <ProcessStep active={processState >= 1} done={processState > 1} text="TRANSMITTING SECURE PAYLOAD" />
                      <ProcessStep active={processState >= 2} done={processState > 2} text="YOLO11N NEURAL INFERENCE ENGINE" />
                      <ProcessStep active={processState >= 3} done={processState > 3} text="HEURISTIC RISK CALCULATION" />
                      <ProcessStep active={processState >= 4} done={processState > 4} text="DATABASE SYNCHRONIZATION" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlassPanel>
        </motion.div>

        {/* RIGHT COLUMN: Controls & Info */}
        <motion.div variants={item} className="lg:col-span-4 flex flex-col gap-6">
          
          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center">
              <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Zap className="w-3 h-3 text-[#20DCC5]" /> EXECUTION PROTOCOL
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-xs text-[#607874] font-mono tracking-widest uppercase leading-relaxed">
                Upload raw sonar imagery. The AI pipeline will extract targets, calculate confidence scores, and determine threat classifications via the risk engine.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest uppercase">
                  <CheckCircle className="w-4 h-4 text-[#20DCC5]" /> <span className="text-[#A8BDB9]">JPEG / PNG SUPPORTED</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest uppercase">
                  <CheckCircle className="w-4 h-4 text-[#20DCC5]" /> <span className="text-[#A8BDB9]">640x640 NATIVE RESOLUTION</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest uppercase">
                  <CheckCircle className="w-4 h-4 text-[#20DCC5]" /> <span className="text-[#A8BDB9]">CUDA ACCELERATION</span>
                </div>
              </div>

              <div className="pt-6 border-t border-[rgba(32,220,197,0.18)]">
                <GlowButton 
                  primary 
                  onClick={triggerAnalysis} 
                  disabled={!file || processing}
                  className={`w-full py-4 flex items-center justify-center gap-3 transition-all ${!file || processing ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                >
                  <Cpu className="w-4 h-4" />
                  <span className="tracking-[0.3em] font-bold text-xs uppercase">ANALYZE SCAN</span>
                  <ChevronRight className="w-4 h-4" />
                </GlowButton>
              </div>
            </div>
          </div>

          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded p-5 flex-1">
            <h3 className="text-[10px] font-mono tracking-widest text-[#A8BDB9] uppercase mb-4 border-b border-[rgba(32,220,197,0.18)] pb-2">
              PIPELINE STATUS
            </h3>
            <div className="space-y-4 font-mono text-[9px] tracking-widest uppercase">
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">DATABASE CONNECTION</span>
                <span className="text-[#20DCC5] font-bold">ONLINE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">MODEL INTEGRITY</span>
                <span className="text-[#20DCC5] font-bold">VERIFIED</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">LAST SYNC</span>
                <span className="text-[#F2F7F5]">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}

function ProcessStep({ active, done, text }) {
  if (!active) {
    return (
      <div className="flex items-center gap-5 text-[#0F6F70] opacity-50">
        <div className="w-5 h-5 rounded-full border border-[rgba(32,220,197,0.18)]" />
        <span>{text}</span>
      </div>
    );
  }
  
  if (done) {
    return (
      <div className="flex items-center gap-5 text-emerald-400">
        <CheckCircle className="w-5 h-5" />
        <span className="text-[#F2F7F5]">{text}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-5 text-[#20DCC5]">
      <div className="w-5 h-5 border border-[#20DCC5] rounded-full flex items-center justify-center">
        <div className="w-2.5 h-2.5 bg-[#20DCC5] rounded-full animate-pulse" />
      </div>
      <span className="animate-pulse shadow-[#20DCC5] text-[#F2F7F5] font-bold">{text}...</span>
    </div>
  );
}
