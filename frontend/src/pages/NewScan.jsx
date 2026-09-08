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
  ChevronRight,
  ShieldCheck,
  Layers,
  Activity
} from 'lucide-react';
import { GlassPanel, GlowButton } from '../components/ui';

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
      setError("INVALID FORMAT. SONAR INFERENCE REQUIRES IMAGE PAYLOADS (PNG, JPG, JPEG).");
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
      setTimeout(() => setProcessState(2), 400);
      setTimeout(() => setProcessState(3), 900);
      setTimeout(() => setProcessState(4), 1400);
      setTimeout(() => setProcessState(5), 1900);
      
      const result = await analyzeSonar(file);
      
      setProcessState(6);
      
      setTimeout(() => {
        navigate(`/results/${result.scan_id}`, { state: { result, imagePreview: preview } });
      }, 500);
      
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
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6 h-full flex flex-col font-sans"
    >
      
      {/* Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between border-b border-[rgba(32,220,197,0.18)] pb-4">
        <div className="flex items-center gap-3.5 mb-2 md:mb-0">
          <div className="h-11 w-11 bg-[rgba(4,25,27,0.85)] border border-[rgba(32,220,197,0.30)] flex items-center justify-center rounded shadow-[0_0_15px_rgba(32,220,197,0.12)]">
            <Crosshair className="w-5 h-5 text-[#20DCC5]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-[0.2em] uppercase text-[#F2F7F5] font-mono">SONAR SCAN INTAKE</h1>
            <p className="text-[#20DCC5] font-mono text-[9px] tracking-widest uppercase mt-0.5">
              TARGET ACQUISITION & MULTI-LAYER INFERENCE
            </p>
          </div>
        </div>
        
        {/* Decorative Status Bar */}
        <div className="flex gap-4 text-[8.5px] font-mono tracking-widest text-[#607874] uppercase">
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded border border-[rgba(32,220,197,0.15)]"><Server className="w-3 h-3 text-[#20DCC5]" /> <span className="text-[#A8BDB9]">YOLO11n READY</span></div>
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded border border-[rgba(32,220,197,0.15)]"><Lock className="w-3 h-3 text-[#20DCC5]" /> <span className="text-[#A8BDB9]">IMMUTABLE AUDIT</span></div>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-500/10 border border-red-500/50 rounded flex items-center justify-between p-3.5 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
              <div className="flex items-center text-red-400 font-mono text-xs tracking-wider uppercase">
                <AlertTriangle className="w-4 h-4 mr-2.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-[#F2F7F5] transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Upload & Preview */}
        <motion.div variants={item} className="lg:col-span-8 flex flex-col gap-6 h-full min-h-0">
          <GlassPanel className="p-0 flex-1 relative flex flex-col overflow-hidden border border-[rgba(32,220,197,0.18)]" borderTop>
            
            {/* Header Area */}
            <div className="p-3.5 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center z-20">
              <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-[#20DCC5]" /> ACOUSTIC PAYLOAD ACQUISITION
              </h3>
              <span className="text-[8.5px] font-mono text-[#607874] uppercase">640×640 NATIVE PIPELINE</span>
            </div>

            <div className="flex-1 relative bg-[#02090B]/80 flex flex-col p-5 overflow-hidden">
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
                          flex-1 border-2 border-dashed rounded-lg transition-all duration-200
                          flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer p-8 min-h-[320px]
                          ${dragActive ? 'border-[#20DCC5] bg-[#20DCC5]/10 shadow-[0_0_30px_rgba(32,220,197,0.15)]' : 'border-[rgba(32,220,197,0.20)] hover:border-[#20DCC5]/60 hover:bg-[rgba(32,220,197,0.03)]'}
                        `}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {/* Background Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(32,220,197,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(32,220,197,0.03)_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />

                        {/* Corner Accents */}
                        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#20DCC5]/40" />
                        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#20DCC5]/40" />
                        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#20DCC5]/40" />
                        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#20DCC5]/40" />

                        <div className="w-16 h-16 rounded bg-[rgba(32,220,197,0.08)] border border-[rgba(32,220,197,0.30)] flex items-center justify-center mb-5 text-[#20DCC5] group-hover:scale-105 group-hover:bg-[#20DCC5]/15 transition-all duration-200 shadow-[0_0_20px_rgba(32,220,197,0.10)]">
                          <UploadCloud className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-[#F2F7F5] mb-1.5 tracking-[0.18em] uppercase font-mono">DRAG & DROP SONAR PAYLOAD</h3>
                        <p className="text-[#607874] font-mono text-[9px] tracking-[0.2em] uppercase mb-4">OR CLICK TO BROWSE LOCAL DIRECTORY</p>
                        
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-black/50 border border-[rgba(32,220,197,0.18)] text-[8.5px] font-mono text-[#A8BDB9] uppercase tracking-wider">
                          <span>PNG / JPEG / JPG</span>
                          <span className="text-[#607874]">•</span>
                          <span>SIDE-SCAN SONAR</span>
                        </div>

                        <input 
                          ref={fileInputRef}
                          type="file" 
                          className="hidden" 
                          accept="image/jpeg, image/png, image/jpg"
                          onChange={handleChange}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col flex-1 h-full min-h-[320px]">
                        <div className="flex justify-between items-center mb-3 p-3 bg-black/40 border border-[rgba(32,220,197,0.18)] rounded">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded bg-[#20DCC5]/10 border border-[#20DCC5]/30 text-[#20DCC5] flex-shrink-0">
                              <FileImage className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-[#F2F7F5] font-mono tracking-wider text-xs uppercase truncate font-bold">{file.name}</h3>
                              <p className="text-[#607874] font-mono text-[8.5px] tracking-wider mt-0.5">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB • READY FOR INFERENCE
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(); }}
                            className="p-1.5 text-[#607874] hover:text-red-400 rounded hover:bg-red-400/10 transition-colors border border-transparent hover:border-red-400/30 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="relative w-full flex-1 rounded overflow-hidden border border-[rgba(32,220,197,0.18)] bg-black/80 group min-h-[220px]">
                          <img 
                            src={preview} 
                            alt="Sonar Preview" 
                            className="absolute inset-0 w-full h-full object-contain select-none"
                          />
                          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(32,220,197,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(32,220,197,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
                          
                          <div className="absolute bottom-3 right-3 bg-black/80 px-2.5 py-1 font-mono text-[8.5px] text-[#20DCC5] tracking-widest border border-[#20DCC5]/30 backdrop-blur rounded uppercase">
                            RAW ACOUSTIC FEED
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="processing-ui"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center flex-1 z-10 py-8"
                  >
                    <div className="relative w-36 h-36 mb-8">
                      <div className="absolute inset-0 border border-[rgba(32,220,197,0.20)] rounded-full" />
                      <div className="absolute inset-3 border border-[#20DCC5]/30 rounded-full border-t-[#20DCC5] animate-spin" style={{ animationDuration: '2.5s' }} />
                      <div className="absolute inset-6 border border-[#20DCC5]/20 rounded-full border-b-[#20DCC5] animate-spin" style={{ animationDuration: '1.8s', animationDirection: 'reverse' }} />
                      
                      <div className="absolute inset-0 flex items-center justify-center text-[#20DCC5]">
                        <Radar className="w-8 h-8 animate-pulse" />
                      </div>
                    </div>
                    
                    <h2 className="text-lg font-bold font-mono tracking-[0.25em] text-[#F2F7F5] mb-8 uppercase text-center">
                      EXECUTING INTELLIGENCE PIPELINE
                    </h2>
                    
                    <div className="w-full max-w-sm space-y-3.5 font-mono text-[9.5px] tracking-wider uppercase">
                      <ProcessStep active={processState >= 1} done={processState > 1} text="1. PAYLOAD TRANSMISSION & DECODE" />
                      <ProcessStep active={processState >= 2} done={processState > 2} text="2. YOLO11n NEURAL DETECTION" />
                      <ProcessStep active={processState >= 3} done={processState > 3} text="3. ACOUSTIC EVIDENCE & CONTRAST" />
                      <ProcessStep active={processState >= 4} done={processState > 4} text="4. UNCERTAINTY & RISK EVALUATION" />
                      <ProcessStep active={processState >= 5} done={processState > 5} text="5. MULTI-SIGNAL FUSION TRIAGE" />
                      <ProcessStep active={processState >= 6} done={processState > 6} text="6. MISSION ARCHIVE PERSISTENCE" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlassPanel>
        </motion.div>

        {/* RIGHT COLUMN: Controls & Info */}
        <motion.div variants={item} className="lg:col-span-4 flex flex-col gap-6">
          
          <GlassPanel className="p-0 overflow-hidden">
            <div className="p-3.5 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center">
              <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-[#20DCC5]" /> EXECUTION CONTROLS
              </h3>
            </div>
            
            <div className="p-5 space-y-5">
              <p className="text-[9.5px] text-[#A8BDB9] font-mono tracking-wider leading-relaxed">
                Submit side-scan sonar image payload to execute the 8-stage intelligence pipeline: neural detection, acoustic corroboration, uncertainty analysis, risk engine, and fusion triage.
              </p>
              
              <div className="space-y-2.5 border-t border-[rgba(32,220,197,0.12)] pt-4">
                <div className="flex items-center gap-2.5 text-[9px] font-mono tracking-wider uppercase text-[#A8BDB9]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#20DCC5] flex-shrink-0" />
                  <span>JPG / PNG / JPEG FORMATS</span>
                </div>
                <div className="flex items-center gap-2.5 text-[9px] font-mono tracking-wider uppercase text-[#A8BDB9]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#20DCC5] flex-shrink-0" />
                  <span>640×640 RESOLUTION NORMALIZED</span>
                </div>
                <div className="flex items-center gap-2.5 text-[9px] font-mono tracking-wider uppercase text-[#A8BDB9]">
                  <CheckCircle className="w-3.5 h-3.5 text-[#20DCC5] flex-shrink-0" />
                  <span>PHYSICS-GROUNDED EVIDENCE</span>
                </div>
              </div>

              <div className="pt-2">
                <GlowButton 
                  primary 
                  onClick={triggerAnalysis} 
                  disabled={!file || processing}
                  className="w-full py-3 flex items-center justify-center gap-2 font-mono text-xs font-bold tracking-widest uppercase"
                >
                  <Cpu className="w-4 h-4" />
                  <span>EXECUTE INFERENCE</span>
                  <ChevronRight className="w-4 h-4" />
                </GlowButton>
              </div>
            </div>
          </GlassPanel>

          {/* Architecture Pipeline Specs */}
          <GlassPanel className="p-4 flex-1">
            <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#A8BDB9] uppercase mb-3 border-b border-[rgba(32,220,197,0.15)] pb-2 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#20DCC5]" /> ACTIVE PIPELINE STACK
            </h3>
            <div className="space-y-2.5 font-mono text-[8.5px] uppercase tracking-wider">
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">1. DETECTOR</span>
                <span className="text-[#20DCC5] font-bold">YOLO11n (4 Classes)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">2. EVIDENCE</span>
                <span className="text-[#20DCC5] font-bold">TBCR + Sobel Energy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">3. UNCERTAINTY</span>
                <span className="text-[#D6A84F] font-bold">4-Quadrant Epistemic</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">4. RISK</span>
                <span className="text-[#D6A84F] font-bold">HEURISTIC V2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">5. FUSION</span>
                <span className="text-[#20DCC5] font-bold">Priority Triage</span>
              </div>
            </div>
          </GlassPanel>

        </motion.div>
      </div>
    </motion.div>
  );
}

function ProcessStep({ active, done, text }) {
  if (!active) {
    return (
      <div className="flex items-center gap-3 text-[#607874] opacity-50">
        <div className="w-4 h-4 rounded-full border border-[rgba(32,220,197,0.18)] flex-shrink-0" />
        <span>{text}</span>
      </div>
    );
  }
  
  if (done) {
    return (
      <div className="flex items-center gap-3 text-emerald-400">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-[#F2F7F5] font-semibold">{text}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-3 text-[#20DCC5]">
      <div className="w-4 h-4 border border-[#20DCC5] rounded-full flex items-center justify-center flex-shrink-0">
        <div className="w-2 h-2 bg-[#20DCC5] rounded-full animate-pulse" />
      </div>
      <span className="text-[#F2F7F5] font-bold">{text}...</span>
    </div>
  );
}
