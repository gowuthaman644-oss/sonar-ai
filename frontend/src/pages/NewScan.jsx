import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileImage, X, Activity, Cpu, CheckCircle, AlertTriangle } from 'lucide-react';
import { analyzeSonar } from '../services/api';
import { toast } from 'sonner';

export default function NewScan() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const [processing, setProcessing] = useState(false);
  const [processState, setProcessState] = useState(0); // 0=none, 1=upload, 2=yolo, 3=risk, 4=done
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
      setError('Please upload a valid JPG or PNG image.');
      return;
    }
    
    setFile(selectedFile);
    
    // Create preview URL
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerAnalysis = async () => {
    if (!file) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      // Simulate step 1 visually
      setProcessState(1); // Uploading
      
      // We start the actual API call
      const analysisPromise = analyzeSonar(file);
      
      // Simulate intermediate states for visual effect while waiting for API
      setTimeout(() => setProcessState(2), 800); // YOLO
      setTimeout(() => setProcessState(3), 1600); // Risk
      
      const result = await analysisPromise;
      
      setProcessState(4); // Done
      
      toast.success('SCAN SAVED TO DATABASE');
      
      // Short delay so user sees "Done" before navigating
      setTimeout(() => {
        navigate(`/results/${result.scan_id}`, { state: { result, imagePreview: preview } });
      }, 500);
      
    } catch (err) {
      console.error(err);
      toast.error('ANALYSIS FAILED TO PROCESS');
      setProcessing(false);
      setProcessState(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-widest uppercase text-white mb-2">New Sonar Analysis</h1>
        <p className="text-gray-400 font-mono text-sm tracking-wide">
          Upload a side-scan sonar image for AI-powered object detection and risk assessment.
        </p>
      </div>

      {error && (
        <div className="glass-panel border-risk-high/50 bg-risk-high/10 p-4 flex flex-col items-center justify-center space-y-3">
          <div className="flex items-center gap-2 text-risk-high font-mono tracking-widest font-bold">
            <AlertTriangle className="w-5 h-5" />
            SYSTEM ERROR
          </div>
          <p className="text-sm text-gray-300">{error}</p>
          <button onClick={() => setError(null)} className="sonar-button text-xs px-4 py-2 mt-2">
            DISMISS
          </button>
        </div>
      )}

      {!processing ? (
        <div className="glass-panel p-8">
          
          {!file ? (
            <div 
              className={`
                border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
                flex flex-col items-center justify-center min-h-[300px]
                ${dragActive ? 'border-sonar-cyan bg-sonar-cyan/5' : 'border-sonar-border hover:border-gray-500 hover:bg-white/5'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 rounded-full bg-sonar-border/50 flex items-center justify-center mb-4 text-sonar-cyan">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2 tracking-wide">DROP SONAR IMAGE</h3>
              <p className="text-gray-400 font-mono text-xs mb-6">JPG / PNG SUPPORTED</p>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="sonar-button"
              >
                SELECT IMAGE
              </button>
              
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="image/jpeg, image/png, image/jpg"
                onChange={handleChange}
              />
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-sonar-cyan/10 text-sonar-cyan">
                    <FileImage className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium tracking-wide">{file.name}</h3>
                    <p className="text-gray-400 font-mono text-xs">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={removeFile}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative w-full h-[300px] rounded-lg overflow-hidden border border-sonar-border mb-8 bg-black">
                <img 
                  src={preview} 
                  alt="Sonar Preview" 
                  className="w-full h-full object-contain"
                />
                
                {/* Subtle scanning grid overlay over image preview */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,240,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={triggerAnalysis}
                  className="sonar-button-primary flex items-center gap-2"
                >
                  <Cpu className="w-5 h-5" />
                  ANALYZE WITH AI
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Processing State */
        <div className="glass-panel p-12 flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-2 border-sonar-border rounded-full"></div>
            <div className="absolute inset-0 border-2 border-sonar-cyan rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-2 border border-sonar-cyan/30 rounded-full radar-sweep"></div>
            <div className="absolute inset-0 flex items-center justify-center text-sonar-cyan">
              <Activity className="w-8 h-8 animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold tracking-widest text-white mb-6 uppercase">ANALYZING SONAR DATA</h2>
          
          <div className="w-full max-w-sm space-y-4 font-mono text-sm tracking-widest">
            <ProcessStep active={processState >= 1} done={processState > 1} text="Image uploaded" />
            <ProcessStep active={processState >= 2} done={processState > 2} text="YOLO11n Neural Detection" />
            <ProcessStep active={processState >= 3} done={processState > 3} text="Risk Assessment" />
            <ProcessStep active={processState >= 4} done={processState > 4} text="Persisting Analysis" />
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessStep({ active, done, text }) {
  if (!active) {
    return (
      <div className="flex items-center gap-3 text-gray-600">
        <div className="w-5 h-5 rounded-full border border-gray-600"></div>
        <span>{text}</span>
      </div>
    );
  }
  
  if (done) {
    return (
      <div className="flex items-center gap-3 text-sonar-cyan">
        <CheckCircle className="w-5 h-5" />
        <span>{text}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-3 text-white">
      <div className="w-5 h-5 rounded-full bg-sonar-cyan flex items-center justify-center animate-pulse">
        <div className="w-2 h-2 rounded-full bg-black"></div>
      </div>
      <span className="animate-pulse">{text}...</span>
    </div>
  );
}


