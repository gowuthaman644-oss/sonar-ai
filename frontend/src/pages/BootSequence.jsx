import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal } from 'lucide-react';

export default function BootSequence() {
  const navigate = useNavigate();
  const [lines, setLines] = useState([]);
  
  const bootLogs = [
    "INITIALIZING SYSTEM KERNEL...",
    "LOADING SONAR-AI MODULES...",
    "CONNECTING TO DATABASE...",
    "CUDA 13.0 DETECTED: NVIDIA GEFORCE RTX 4050",
    "LOADING YOLO11n WEIGHTS...",
    "ESTABLISHING FASTAPI UPLINK...",
    "CALIBRATING NEURAL NETWORKS...",
    "SYSTEM READY."
  ];

  useEffect(() => {
    let currentLine = 0;
    
    const interval = setInterval(() => {
      if (currentLine < bootLogs.length) {
        setLines(prev => [...prev, bootLogs[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-[#02050A] flex items-center justify-center z-50">
      
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>

      <div className="max-w-2xl w-full p-8 font-mono relative">
        
        <div className="absolute -top-4 -left-4 w-4 h-4 border-t-2 border-l-2 border-sonar-cyan"></div>
        <div className="absolute -bottom-4 -right-4 w-4 h-4 border-b-2 border-r-2 border-sonar-cyan"></div>
        
        <div className="flex items-center gap-4 mb-8 border-b border-sonar-border pb-4">
          <Terminal className="w-8 h-8 text-sonar-cyan" />
          <h1 className="text-2xl font-bold tracking-[0.3em] text-white uppercase">SONAR-AI KERNEL</h1>
        </div>

        <div className="space-y-3 min-h-[300px]">
          {lines.map((line, idx) => (
            <div key={idx} className="flex gap-4 items-center text-sm tracking-widest animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="text-gray-600">[{String(idx + 1).padStart(2, '0')}]</span>
              <span className={idx === bootLogs.length - 1 ? 'text-sonar-cyan font-bold shadow-[0_0_10px_rgba(0,240,255,0.5)]' : 'text-gray-400'}>
                {line}
              </span>
            </div>
          ))}
          <div className="flex gap-4 items-center text-sm tracking-widest mt-2">
            <span className="text-gray-600">[{String(lines.length + 1).padStart(2, '0')}]</span>
            <span className="w-3 h-4 bg-sonar-cyan animate-pulse inline-block"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
