import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileImage, X, Activity, Cpu, CheckCircle, AlertTriangle, Crosshair, Radar } from 'lucide-react';
import { analyzeSonar } from '../services/api';
import { toast } from 'sonner';
import { GlassPanel, GlowButton, SectionHeader } from '../components/ui';

export default function NewScan() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const [processing, setProcessing] = useState(false);
  const [processState, setProcessState] = useState(0); 
  const [error, setError] = useState(null);

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
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    
    if (!validTypes.includes(selectedFile.type)) {
      setError('INVALID DATATYPE. AWAITING JPG/PNG.');
      return;
    }
    
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
  };

  const removeFile = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  React.useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const triggerAnalysis = async () => {
    if (!file) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      setProcessState(1); 
      const analysisPromise = analyzeSonar(file);
      
      setTimeout(() => setProcessState(2), 800); 
      setTimeout(() => setProcessState(3), 1600); 
      
      const result = await analysisPromise;
      
      setProcessState(4); 
      toast.success('SCAN SAVED TO DATABASE');
      
      setTimeout(() => {
        navigate(`/results/${result.scan_id}`, { state: { result, imagePreview: preview } });
      }, 800);
      
    } catch (err) {
      console.error(err);
      toast.error('ANALYSIS FAILED TO PROCESS');
      setProcessing(false);
      setProcessState(0);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 5 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.15, ease: 'easeOut' } },
    exit: { opacity: 0 }
  };

  return (
    <motion.div 
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="max-w-4xl mx-auto space-y-6 h-full flex flex-col"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-[0.25em] uppercase text-white shadow-black drop-shadow-md">NEW ACQUISITION</h1>
        <p className="text-[#00F0FF] font-mono text-xs tracking-[0.2em] uppercase mt-2">
          Initialize AI-Powered Sonar Inspection
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassPanel className="border-red-500/50 bg-red-500/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-400 font-mono tracking-[0.2em] font-bold text-xs">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
              <button onClick={() => setError(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassPanel className="flex-1 p-8 flex flex-col justify-center min-h-[500px] relative overflow-hidden" borderTop>
        
        {/* Subtle Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#00F0FF]/10 blur-3xl rounded-full" />
          <div className="absolute top-10 left-10 w-px h-full bg-gradient-to-b from-transparent via-[#00F0FF]/20 to-transparent" />
        </div>

        <AnimatePresence mode="wait">
          {!processing ? (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col h-full z-10"
            >
              <SectionHeader icon={Crosshair} title="Telemetry Input" subtitle="Awaiting Image Data" />
              
              {!file ? (
                <div 
                  className={`
                    flex-1 border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
                    flex flex-col items-center justify-center relative overflow-hidden group
                    ${dragActive ? 'border-[#00F0FF] bg-[#00F0FF]/10 shadow-[0_0_30px_rgba(0,240,255,0.15)]' : 'border-[#1A2C42] hover:border-[#00F0FF]/50 hover:bg-white/5'}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="w-20 h-20 rounded-full bg-[#1A2C42]/50 flex items-center justify-center mb-6 text-[#00F0FF] group-hover:scale-110 transition-transform duration-500">
                    <UploadCloud className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2 tracking-[0.2em] uppercase">LINK DATA STREAM</h3>
                  <p className="text-gray-500 font-mono text-[10px] mb-8 tracking-[0.2em] uppercase">Drag payload or select manually</p>
                  
                  <GlowButton onClick={() => fileInputRef.current?.click()}>
                    SELECT PAYLOAD
                  </GlowButton>
                  
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
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF]">
                        <FileImage className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-white font-mono tracking-widest text-sm uppercase">{file.name}</h3>
                        <p className="text-gray-500 font-mono text-[10px] tracking-widest mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB • READY FOR TRANSFER</p>
                      </div>
                    </div>
                    <button 
                      onClick={removeFile}
                      className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors border border-transparent hover:border-red-400/30"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="relative w-full flex-1 rounded-lg overflow-hidden border border-[#1A2C42] mb-6 bg-black min-h-[300px]">
                    <img 
                      src={preview} 
                      alt="Sonar Preview" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,240,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.05)_1px,transparent_1px)] bg-[size:30px_30px]" />
                    <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 font-mono text-[9px] text-[#00F0FF] tracking-widest border border-[#00F0FF]/30 backdrop-blur">
                      RAW ACOUSTIC FEED
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <GlowButton primary onClick={triggerAnalysis} className="py-4">
                      <Cpu className="w-5 h-5 mr-2" />
                      ENGAGE AI INFERENCE
                    </GlowButton>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center flex-1 z-10"
            >
              <div className="relative w-40 h-40 mb-10">
                <div className="absolute inset-0 border border-[#1A2C42] rounded-full" />
                <div className="absolute inset-2 border border-[#00F0FF]/30 rounded-full border-t-[#00F0FF] animate-spin" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-6 border border-[#00F0FF]/20 rounded-full border-b-[#00F0FF] animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                <div className="absolute inset-10 border border-[#00F0FF]/10 rounded-full" style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(0, 240, 255, 0.4) 100%)', animation: 'spin 1.5s linear infinite' }} />
                
                <div className="absolute inset-0 flex items-center justify-center text-[#00F0FF]">
                  <Radar className="w-10 h-10 animate-pulse" />
                </div>
              </div>
              
              <h2 className="text-xl font-bold tracking-[0.3em] text-white mb-8 uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">EXECUTING INTELLIGENCE PROTOCOL</h2>
              
              <div className="w-full max-w-sm space-y-5 font-mono text-[10px] tracking-[0.2em] uppercase">
                <ProcessStep active={processState >= 1} done={processState > 1} text="TRANSMITTING PAYLOAD" />
                <ProcessStep active={processState >= 2} done={processState > 2} text="YOLO NEURAL INFERENCE (RTX 4050)" />
                <ProcessStep active={processState >= 3} done={processState > 3} text="DETERMINISTIC RISK CALCULATION" />
                <ProcessStep active={processState >= 4} done={processState > 4} text="DATABASE SYNCHRONIZATION" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassPanel>
    </motion.div>
  );
}

function ProcessStep({ active, done, text }) {
  if (!active) {
    return (
      <div className="flex items-center gap-4 text-[#1A2C42] opacity-50">
        <div className="w-4 h-4 rounded border border-[#1A2C42]" />
        <span>{text}</span>
      </div>
    );
  }
  
  if (done) {
    return (
      <div className="flex items-center gap-4 text-emerald-400">
        <CheckCircle className="w-4 h-4" />
        <span>{text}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-4 text-[#00F0FF]">
      <div className="w-4 h-4 border border-[#00F0FF] flex items-center justify-center">
        <div className="w-2 h-2 bg-[#00F0FF] animate-pulse" />
      </div>
      <span className="animate-pulse shadow-[#00F0FF]">{text}...</span>
    </div>
  );
}


