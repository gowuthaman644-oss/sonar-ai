import React, { useState, useEffect } from 'react';
import { getHistory } from '../services/api';
import { FileText, Download, AlertTriangle, Lock } from 'lucide-react';

export default function Reports() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getHistory();
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const topScan = history.length > 0 ? history[0] : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 h-full flex flex-col pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-sonar-border pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-white">INTELLIGENCE REPORTS</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">
            DOCUMENT EXPORT
          </p>
        </div>
        <button disabled={!topScan} className="sonar-button-primary text-xs py-3 px-6 mt-4 md:mt-0 flex items-center gap-2 opacity-50 cursor-not-allowed">
          <Download className="w-4 h-4" /> EXPORT PDF
        </button>
      </div>

      <div className="glass-panel max-w-4xl mx-auto w-full p-0 relative overflow-hidden flex-1 flex flex-col border-t-4 border-t-gray-600">
        
        {/* Subtle background branding */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <FileText className="w-96 h-96" />
        </div>

        <div className="relative z-10 p-12 flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center border-b border-sonar-border/50 pb-8 mb-8">
            <h2 className="text-3xl font-bold tracking-[0.4em] text-white uppercase mb-2">SONAR-AI</h2>
            <h3 className="text-xs font-mono tracking-widest text-sonar-cyan uppercase">Automated Intelligence Brief</h3>
          </div>

          {loading ? (
             <div className="flex-1 flex items-center justify-center font-mono text-gray-500 tracking-widest animate-pulse">GENERATING DOCUMENT...</div>
          ) : !topScan ? (
             <div className="flex-1 flex items-center justify-center font-mono text-gray-500 tracking-widest">NO SCANS AVAILABLE FOR REPORT.</div>
          ) : (
            <div className="flex-1 flex flex-col">
              
              <div className="grid grid-cols-2 gap-12 flex-1">
                <div className="space-y-8">
                  {/* Scan Info */}
                  <div className="space-y-4 font-mono">
                    <h4 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase border-b border-sonar-border/30 pb-2 mb-4">Identification</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs">
                      <div className="text-gray-500">SCAN ID</div>
                      <div className="text-white text-right">{topScan.scan_id}</div>
                      
                      <div className="text-gray-500">SOURCE FILE</div>
                      <div className="text-white text-right truncate pl-4">{topScan.filename}</div>

                      <div className="text-gray-500">DATE</div>
                      <div className="text-white text-right">{new Date(topScan.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Tech Specs */}
                  <div className="space-y-4 font-mono">
                    <h4 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase border-b border-sonar-border/30 pb-2 mb-4">System Parameters</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs">
                      <div className="text-gray-500">ENGINE</div>
                      <div className="text-white text-right">YOLO11n</div>
                      
                      <div className="text-gray-500">ACCELERATION</div>
                      <div className="text-white text-right">CUDA</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 flex flex-col">
                  {/* Assessment */}
                  <div className="space-y-4 font-mono flex-1">
                    <h4 className="text-[10px] text-gray-500 font-bold tracking-widest uppercase border-b border-sonar-border/30 pb-2 mb-4">Assessment Payload</h4>
                    
                    <div className="p-6 border border-dashed border-sonar-border bg-black/40 flex flex-col items-center justify-center h-48 text-center text-gray-500">
                       <Lock className="w-8 h-8 mb-4 opacity-50" />
                       <span className="text-xs tracking-widest">FULL DETECTION PAYLOAD<br/>UNAVAILABLE IN ARCHIVE VIEW</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-sonar-border/30 text-center">
                <div className="inline-block px-4 py-2 border border-risk-high/30 bg-risk-high/5 text-risk-high text-[10px] font-mono tracking-widest uppercase rounded">
                   RESTRICTED DEMONSTRATION RECORD
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
