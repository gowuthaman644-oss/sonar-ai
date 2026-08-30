import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory } from '../services/api';
import { CheckCircle, AlertTriangle, Target, ArrowLeft, Download, PlusSquare, Activity, Shield, Crosshair, ChevronRight, FileText, Share2, Printer } from 'lucide-react';
import SonarDetectionViewer from '../components/SonarDetectionViewer';
import { GlassPanel, GlowButton, SectionHeader, RiskBadge } from '../components/ui';

export default function Results() {
  const { scanId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [result, setResult] = useState(location.state?.result || null);
  const [imagePreview, setImagePreview] = useState(location.state?.imagePreview || null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState(null);
  
  const [activeDetectionIdx, setActiveDetectionIdx] = useState(null);

  // Export State
  const [exportState, setExportState] = useState('NORMAL'); // NORMAL, EXPORTING, EXPORTED, FAILED
  const [exportErrorMsg, setExportErrorMsg] = useState('');

  useEffect(() => {
    if (!result && scanId) {
      async function fetchResult() {
        try {
          const history = await getHistory();
          const found = history.find(s => s.scan_id === scanId);
          if (found) {
            setResult(found);
          } else {
            setError("Analysis record not found in archive.");
          }
        } catch (err) {
          setError("Failed to load mission history.");
        } finally {
          setLoading(false);
        }
      }
      fetchResult();
    } else if (result) {
      setLoading(false);
    }
  }, [scanId, result]);

  // Prefer persistent image over volatile blob
  let displayImage = imagePreview;
  if (result && result.scan_id) {
    displayImage = `/api/history/${result.scan_id}/image`;
  }

  const handleExport = async () => {
    if (exportState === 'EXPORTING') return;
    setExportState('EXPORTING');
    setExportErrorMsg('');

    try {
      if (!result) throw new Error("No scan data available");

      // Verify image loads before printing
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = () => reject(new Error("Image failed to load via API"));
        img.src = `/api/history/${result.scan_id}/image`;
      });

      // Temporarily change document title for PDF filename
      const originalTitle = document.title;
      document.title = `SONAR-AI_Detection_Report_${result.scan_id}`;

      // Trigger browser print
      window.print();

      // Restore title
      document.title = originalTitle;
      
      setExportState('EXPORTED');
      setTimeout(() => setExportState('NORMAL'), 3000);
    } catch (err) {
      console.error("Export failed:", err);
      setExportState('FAILED');
      setExportErrorMsg(err.message || "Export pipeline failed");
      setTimeout(() => {
        setExportState('NORMAL');
        setExportErrorMsg('');
      }, 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] print:hidden">
        <div className="w-10 h-10 border-2 border-[#20DCC5] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(40,224,196,0.5)]" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="text-center py-20 text-red-500 font-mono tracking-widest print:hidden">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.3)] rounded-full" />
        <h2 className="text-xl uppercase">{error || "INTELLIGENCE RECORD NOT FOUND"}</h2>
        <button onClick={() => navigate('/history')} className="mt-6 text-[10px] text-[#A8BDB9] hover:text-[#F2F7F5] border border-[rgba(32,220,197,0.18)] px-6 py-2 rounded">
          RETURN TO ARCHIVE
        </button>
      </div>
    );
  }

  const detections = result.detections || [];
  const risk = result.analysis || {};

  return (
    <div className="max-w-[1600px] mx-auto h-full flex flex-col pb-4 font-sans">
      
      {/* --- PRINT ONLY VIEW (Export PDF Engine - PRESERVED) --- */}
      <div className="hidden print:block w-full text-black font-sans bg-white p-8">
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-bold tracking-widest uppercase">SONAR-AI</h1>
          <h2 className="text-xl tracking-widest text-[#607874]">DETECTION REPORT</h2>
        </div>
        
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2">SCAN INFORMATION</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-[#607874]">Scan ID:</span> <strong>{result.scan_id}</strong></div>
            <div><span className="text-[#607874]">Timestamp:</span> <strong>{new Date(result.created_at).toLocaleString()}</strong></div>
            <div><span className="text-[#607874]">Model:</span> <strong>YOLO11n</strong></div>
            <div><span className="text-[#607874]">Source:</span> <strong>{result.filename}</strong></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2">THREAT ASSESSMENT</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-[#607874]">Risk Level:</span> <strong className="uppercase">{risk.risk_level || 'UNKNOWN'}</strong></div>
            <div><span className="text-[#607874]">Risk Score:</span> <strong>{risk.risk_score?.toFixed(1) || '0.0'}</strong></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-4">DETECTED ENTITIES</h3>
          <div className="mb-4 text-sm"><span className="text-[#607874]">Total verified targets:</span> <strong>{detections.length}</strong></div>
          
          {detections.length === 0 ? (
            <div className="text-[#607874] italic">No targets detected in this scan.</div>
          ) : (
            detections.map((det, idx) => (
              <div key={idx} className="mb-4 text-sm border-l-4 border-gray-300 pl-4">
                <div className="font-bold uppercase text-lg">{det.class_name} — {(det.confidence * 100).toFixed(1)}%</div>
                <div className="text-[#607874] mt-1">Bounding Box Coordinates:</div>
                <div className="font-mono text-xs mt-1 grid grid-cols-2 gap-x-4 max-w-xs">
                  <span>x: {det.x.toFixed(1)}</span>
                  <span>y: {det.y.toFixed(1)}</span>
                  <span>width: {det.width.toFixed(1)}</span>
                  <span>height: {det.height.toFixed(1)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
          <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-4">SONAR IMAGE VISUALIZATION</h3>
          <div className="relative inline-block border-2 border-black bg-black p-1 max-w-full">
            <div className="w-[600px] h-[400px]">
              <SonarDetectionViewer 
                imageUrl={displayImage} 
                detections={detections}
              />
            </div>
          </div>
        </div>
      </div>
      {/* --- END PRINT ONLY VIEW --- */}


      {/* --- STANDARD APP UI (FIGMA DETECTION-REPORT) --- */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col md:flex-row md:items-center justify-between border-b border-[rgba(32,220,197,0.18)] pb-4 mb-6 print:hidden"
      >
        <div className="flex flex-col">
          <button 
            onClick={() => navigate('/history')}
            className="flex items-center text-[9px] font-mono text-[#607874] hover:text-[#20DCC5] transition-colors mb-3 tracking-widest uppercase w-fit"
          >
            <ArrowLeft className="w-3 h-3 mr-2" /> RETURN TO ARCHIVE
          </button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded">
              <FileText className="w-5 h-5 text-[#20DCC5]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-[0.2em] uppercase text-[#F2F7F5] shadow-black drop-shadow-md">DETECTION REPORT</h1>
              <p className="text-[#20DCC5] font-mono text-[9px] tracking-[0.3em] uppercase mt-1 flex items-center gap-2">
                <Shield className="w-3 h-3" /> VERIFIED INTELLIGENCE RECORD
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-3">
          <button 
            onClick={() => navigate('/scan')}
            className="px-4 py-2 bg-transparent border border-[rgba(32,220,197,0.18)] text-[#A8BDB9] hover:text-[#F2F7F5] hover:border-gray-500 transition-colors text-[9px] font-mono tracking-widest uppercase rounded flex items-center gap-2"
          >
            <PlusSquare className="w-3 h-3" /> NEW SCAN
          </button>
          
          <button 
            onClick={handleExport}
            disabled={exportState === 'EXPORTING'}
            className={`px-4 py-2 border text-[9px] font-mono tracking-widest uppercase rounded flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,0,0,0.3)]
              ${exportState === 'EXPORTING' ? 'bg-[#20DCC5]/5 text-[#20DCC5]/50 border-[#20DCC5]/20 cursor-not-allowed' :
                exportState === 'EXPORTED' ? 'bg-[#20DCC5]/10 text-emerald-400 border-[#20DCC5]/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                exportState === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/50' :
                'bg-[#20DCC5]/10 text-[#20DCC5] border-[#20DCC5]/50 hover:bg-[#20DCC5]/20 hover:shadow-[0_0_20px_rgba(40,224,196,0.3)]'
              }
            `}
          >
            {exportState === 'EXPORTING' ? (
              <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> GENERATING...</>
            ) : exportState === 'EXPORTED' ? (
              <><CheckCircle className="w-3 h-3" /> EXPORT SUCCESS</>
            ) : exportState === 'FAILED' ? (
              <><AlertTriangle className="w-3 h-3" /> EXPORT FAILED</>
            ) : (
              <><Printer className="w-3 h-3" /> EXPORT REPORT</>
            )}
          </button>
        </div>
      </motion.div>

      {exportErrorMsg && (
        <div className="mb-4 p-3 border border-red-500/50 bg-red-500/10 text-red-500 text-[10px] font-mono tracking-widest text-center uppercase rounded flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {exportErrorMsg}
        </div>
      )}

      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 print:hidden"
      >
        {/* LEFT COLUMN: IMAGE VIEWER (CRITICAL Yolo Rendering) */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px]">
          <GlassPanel className="p-0 flex-1 relative flex flex-col overflow-hidden border border-[rgba(32,220,197,0.18)]" borderTop>
            
            {/* Image Viewer Header */}
            <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center z-20">
              <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Target className="w-3 h-3 text-[#20DCC5]" /> TACTICAL ACQUISITION FEED
              </h3>
              <div className="flex gap-2">
                <RiskBadge level={risk.risk_level || 'LOW'} />
              </div>
            </div>

            <div className="flex-1 relative bg-[#02090B] p-2 overflow-hidden flex flex-col">
              <div className="absolute top-4 left-4 z-10 bg-black/80 border border-[rgba(32,220,197,0.18)] px-3 py-1.5 rounded flex items-center text-[9px] font-mono tracking-widest uppercase shadow-md pointer-events-none">
                <span className="text-[#A8BDB9] mr-2">VERIFIED TARGETS:</span>
                <span className="text-[#20DCC5] font-bold text-xs">{detections.length}</span>
              </div>

              {/* The existing, protected SonarDetectionViewer */}
              <div className="flex-1 w-full relative border border-transparent hover:border-[rgba(32,220,197,0.18)] transition-colors rounded overflow-hidden group">
                <SonarDetectionViewer 
                  imageUrl={displayImage} 
                  detections={detections} 
                  activeIndex={activeDetectionIdx}
                  onHover={setActiveDetectionIdx}
                />
                <div className="absolute bottom-4 right-4 bg-black/80 px-3 py-1 font-mono text-[9px] text-[#607874] tracking-widest border border-[rgba(32,220,197,0.18)] backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                  YOLO11N INFERENCE LAYER
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* RIGHT COLUMN: REPORT DATA & METADATA */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar min-h-0 pb-10">
          
          {/* Metadata Panel */}
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded overflow-hidden">
              <div className="p-3 border-b border-[rgba(32,220,197,0.18)] bg-black/40">
                <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                  <Activity className="w-3 h-3 text-[#20DCC5]" /> SCAN METADATA
                </h3>
              </div>
              <div className="p-4 space-y-3 bg-black/20">
                <div className="flex justify-between items-center text-[9px] font-mono tracking-widest uppercase">
                  <span className="text-[#607874]">SCAN IDENTIFIER</span>
                  <span className="text-[#F2F7F5] font-bold bg-[#0F6F70]/50 px-2 py-0.5 rounded">{result.scan_id}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono tracking-widest uppercase">
                  <span className="text-[#607874]">TIMESTAMP</span>
                  <span className="text-[#20DCC5]">{new Date(result.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-mono tracking-widest uppercase">
                  <span className="text-[#607874]">SOURCE FILE</span>
                  <span className="text-[#F2F7F5] truncate max-w-[120px]" title={result.filename}>{result.filename}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Threat Assessment Panel */}
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110 pointer-events-none" />
              
              <div className="p-3 border-b border-[rgba(32,220,197,0.18)] bg-black/40 relative z-10">
                <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                  <Shield className="w-3 h-3 text-red-500" /> THREAT ASSESSMENT
                </h3>
              </div>
              
              <div className="p-5 flex flex-col gap-4 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-[#607874] uppercase">CLASSIFICATION</span>
                  <span className={`text-sm font-bold tracking-widest uppercase px-3 py-1 rounded border
                    ${risk.risk_level === 'CRITICAL' ? 'text-red-500 border-red-500/30 bg-red-500/10' : 
                      risk.risk_level === 'HIGH' ? 'text-orange-500 border-orange-500/30 bg-orange-500/10' : 
                      risk.risk_level === 'MEDIUM' ? 'text-[#D6A84F] border-[#D6A84F]/30 bg-[#D6A84F]/10' : 'text-[#20DCC5] border-[#20DCC5]/30 bg-[#20DCC5]/10'}
                  `}>
                    {risk.risk_level || 'LOW'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[rgba(32,220,197,0.18)] pt-4">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-[#607874] uppercase">RISK SCORE</span>
                  <span className="text-3xl font-mono text-[#F2F7F5] tracking-wider flex items-end gap-1">
                    {risk.risk_score?.toFixed(1) || '0.0'}
                    <span className="text-[10px] text-[#607874] mb-1">/ 100</span>
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Detection Inventory List */}
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex-1 flex flex-col min-h-[300px]">
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center">
                <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                  <Crosshair className="w-3 h-3 text-[#20DCC5]" /> DETECTION INVENTORY
                </h3>
                <span className="text-[9px] font-mono text-[#607874] uppercase">{detections.length} ITEMS</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-black/20">
                {detections.length === 0 ? (
                  <div className="text-[10px] font-mono text-[#607874] text-center py-10 tracking-widest uppercase border border-dashed border-[rgba(32,220,197,0.18)] rounded h-full flex items-center justify-center">
                    NO TARGETS FOUND IN CURRENT SCAN
                  </div>
                ) : (
                  detections.map((det, idx) => (
                    <div 
                      key={idx}
                      onMouseEnter={() => setActiveDetectionIdx(idx)}
                      onMouseLeave={() => setActiveDetectionIdx(null)}
                      className={`p-4 rounded border transition-all duration-200 cursor-default relative overflow-hidden group
                        ${activeDetectionIdx === idx ? 'border-[#20DCC5] bg-[#20DCC5]/10 shadow-[0_0_15px_rgba(40,224,196,0.15)]' : 'border-[rgba(32,220,197,0.18)] bg-black/60 hover:border-[#20DCC5]/40'}
                      `}
                    >
                      {activeDetectionIdx === idx && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#20DCC5] shadow-[0_0_10px_#20DCC5]" />
                      )}
                      
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-xs font-bold tracking-[0.1em] uppercase flex items-center gap-2 ${activeDetectionIdx === idx ? 'text-[#F2F7F5]' : 'text-[#F2F7F5]'}`}>
                          <div className={`w-2 h-2 rounded-full ${activeDetectionIdx === idx ? 'bg-[#20DCC5] shadow-[0_0_5px_#20DCC5] animate-pulse' : 'bg-gray-600'}`} />
                          {det.class_name}
                        </span>
                        <div className="flex items-center gap-2 bg-black/50 px-2 py-1 rounded border border-[rgba(32,220,197,0.18)]">
                          <span className="text-[8px] font-mono text-[#607874] tracking-widest">CONFIDENCE</span>
                          <span className={`text-[10px] font-mono font-bold ${activeDetectionIdx === idx ? 'text-[#20DCC5]' : 'text-[#A8BDB9]'}`}>
                            {(det.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[rgba(32,220,197,0.18)]/50 text-[8px] font-mono text-[#607874] tracking-widest uppercase">
                        <div className="flex flex-col"><span className="text-[#607874] mb-0.5">X</span> <span className="text-[#A8BDB9]">{det.x.toFixed(1)}</span></div>
                        <div className="flex flex-col"><span className="text-[#607874] mb-0.5">Y</span> <span className="text-[#A8BDB9]">{det.y.toFixed(1)}</span></div>
                        <div className="flex flex-col"><span className="text-[#607874] mb-0.5">WIDTH</span> <span className="text-[#A8BDB9]">{det.width.toFixed(1)}</span></div>
                        <div className="flex flex-col"><span className="text-[#607874] mb-0.5">HEIGHT</span> <span className="text-[#A8BDB9]">{det.height.toFixed(1)}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
