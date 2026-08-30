import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory } from '../services/api';
import { CheckCircle, AlertTriangle, Target, ArrowLeft, Download, PlusSquare, Activity, Shield, Crosshair } from 'lucide-react';
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
            setError("Analysis record not found.");
          }
        } catch (err) {
          setError("Failed to load history.");
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
        img.onerror = () => reject(new Error("Image failed to load"));
        img.src = `/api/history/${result.scan_id}/image`;
      });

      // Temporarily change document title for PDF filename
      const originalTitle = document.title;
      document.title = `SONAR-AI_Intelligence_Report_${result.scan_id}`;

      // Trigger browser print
      window.print();

      // Restore title
      document.title = originalTitle;
      
      setExportState('EXPORTED');
      setTimeout(() => setExportState('NORMAL'), 3000);
    } catch (err) {
      console.error("Export failed:", err);
      setExportState('FAILED');
      setExportErrorMsg(err.message || "Export failed");
      setTimeout(() => {
        setExportState('NORMAL');
        setExportErrorMsg('');
      }, 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] print:hidden">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="text-center py-20 text-red-500 font-mono tracking-widest print:hidden">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
        {error || "RECORD NOT FOUND"}
      </div>
    );
  }

  const detections = result.detections || [];
  const risk = result.analysis || {};

  return (
    <div className="max-w-[1600px] mx-auto h-full flex flex-col pb-4">
      
      {/* --- PRINT ONLY VIEW --- */}
      <div className="hidden print:block w-full text-black font-sans bg-white p-8">
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-bold tracking-widest uppercase">SONAR-AI</h1>
          <h2 className="text-xl tracking-widest text-gray-600">INTELLIGENCE REPORT</h2>
        </div>
        
        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2">SCAN INFORMATION</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Scan ID:</span> <strong>{result.scan_id}</strong></div>
            <div><span className="text-gray-500">Timestamp:</span> <strong>{new Date(result.created_at).toLocaleString()}</strong></div>
            <div><span className="text-gray-500">Model:</span> <strong>YOLO11n</strong></div>
            <div><span className="text-gray-500">Image Resolution:</span> <strong>Native Extraction</strong></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-2">THREAT ASSESSMENT</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Risk Level:</span> <strong className="uppercase">{risk.risk_level || 'UNKNOWN'}</strong></div>
            <div><span className="text-gray-500">Risk Score:</span> <strong>{risk.risk_score || 0}</strong></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-4">DETECTED ENTITIES</h3>
          <div className="mb-4 text-sm"><span className="text-gray-500">Total detections:</span> <strong>{detections.length}</strong></div>
          
          {detections.length === 0 ? (
            <div className="text-gray-500 italic">No targets detected in this scan.</div>
          ) : (
            detections.map((det, idx) => (
              <div key={idx} className="mb-4 text-sm border-l-4 border-gray-300 pl-4">
                <div className="font-bold uppercase text-lg">{det.class_name} — {(det.confidence * 100).toFixed(1)}%</div>
                <div className="text-gray-600 mt-1">Bounding Box:</div>
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
          <div className="relative inline-block border-2 border-black bg-black p-1">
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


      {/* --- STANDARD APP UI --- */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1A2C42] pb-4 mb-4 print:hidden"
      >
        <div>
          <button 
            onClick={() => navigate('/history')}
            className="flex items-center text-[10px] font-mono text-gray-500 hover:text-[#00F0FF] transition-colors mb-4 tracking-widest uppercase"
          >
            <ArrowLeft className="w-3 h-3 mr-2" /> Back to History
          </button>
          <h1 className="text-2xl font-bold tracking-[0.2em] uppercase text-white drop-shadow-md">INTELLIGENCE REPORT</h1>
          <p className="text-[#00F0FF] font-mono text-[9px] tracking-[0.3em] uppercase mt-1">
            POST-INFERENCE TELEMETRY
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col md:items-end font-mono text-[9px] tracking-[0.2em] uppercase">
          <div className="text-gray-500 mb-1">SCAN ID // <span className="text-white font-bold">{result.scan_id}</span></div>
          <div className="text-gray-500">TIMESTAMP // <span className="text-[#00F0FF] font-bold">{new Date(result.created_at).toLocaleString()}</span></div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 print:hidden"
      >
        {/* LEFT COLUMN: IMAGE VIEWER */}
        <div className="lg:col-span-8 flex flex-col min-h-[50vh]">
          <GlassPanel className="p-1 flex-1 relative flex flex-col">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <RiskBadge level={risk.risk_level || 'LOW'} />
              <div className="bg-black/80 border border-[#1A2C42] px-3 py-1 rounded flex items-center text-[9px] font-mono tracking-widest uppercase shadow-md">
                <Target className="w-3 h-3 text-[#00F0FF] mr-2" />
                <span className="text-gray-400 mr-1">DETECTS:</span>
                <span className="text-[#00F0FF] font-bold">{detections.length}</span>
              </div>
            </div>
            
            <SonarDetectionViewer 
              imageUrl={displayImage} 
              detections={detections} 
              activeIndex={activeDetectionIdx}
              onHover={setActiveDetectionIdx}
            />
          </GlassPanel>
        </div>

        {/* RIGHT COLUMN: METADATA & ACTIONS */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          
          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <GlassPanel className="p-4 border-[#1A2C42]">
              <SectionHeader icon={Shield} title="THREAT ASSESSMENT" />
              <div className="flex items-center justify-between mt-4 mb-2">
                <span className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase">CLASSIFICATION</span>
                <span className={`text-xs font-bold tracking-widest uppercase
                  ${risk.risk_level === 'CRITICAL' ? 'text-red-500' : 
                    risk.risk_level === 'HIGH' ? 'text-orange-500' : 
                    risk.risk_level === 'MEDIUM' ? 'text-amber-500' : 'text-green-500'}
                `}>
                  {risk.risk_level || 'LOW'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-[0.2em] text-gray-500 uppercase">RISK SCORE</span>
                <span className="text-xl font-mono text-white tracking-widest">{risk.risk_score?.toFixed(1) || '0.0'}</span>
              </div>
            </GlassPanel>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex-1 flex flex-col">
            <GlassPanel className="p-4 border-[#1A2C42] flex-1 flex flex-col">
              <SectionHeader icon={Crosshair} title="DETECTED ENTITIES" />
              
              <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-2">
                {detections.length === 0 ? (
                  <div className="text-[10px] font-mono text-gray-500 text-center py-8 tracking-widest uppercase">
                    NO TARGETS FOUND IN CURRENT SCAN
                  </div>
                ) : (
                  detections.map((det, idx) => (
                    <div 
                      key={idx}
                      onMouseEnter={() => setActiveDetectionIdx(idx)}
                      onMouseLeave={() => setActiveDetectionIdx(null)}
                      className={`p-3 rounded border transition-all duration-200 cursor-default
                        ${activeDetectionIdx === idx ? 'border-[#00F0FF] bg-[#00F0FF]/10 shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'border-[#1A2C42] bg-black/40 hover:border-[#00F0FF]/40'}
                      `}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-[10px] font-bold tracking-widest uppercase ${activeDetectionIdx === idx ? 'text-white' : 'text-gray-300'}`}>
                          {det.class_name}
                        </span>
                        <span className="text-[10px] font-mono text-[#00F0FF]">
                          {(det.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-gray-500 tracking-widest uppercase">
                        <div className="flex justify-between"><span>X:</span> <span>{det.x.toFixed(1)}</span></div>
                        <div className="flex justify-between"><span>W:</span> <span>{det.width.toFixed(1)}</span></div>
                        <div className="flex justify-between"><span>Y:</span> <span>{det.y.toFixed(1)}</span></div>
                        <div className="flex justify-between"><span>H:</span> <span>{det.height.toFixed(1)}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassPanel>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <GlassPanel className="p-4 border-[#1A2C42] mb-4">
              <SectionHeader icon={Activity} title="METADATA" />
              <div className="mt-4 space-y-2 text-[9px] font-mono tracking-widest uppercase">
                <div className="flex justify-between">
                  <span className="text-gray-500">MODEL</span>
                  <span className="text-[#00F0FF]">YOLO11N</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">HARDWARE</span>
                  <span className="text-amber-500">RTX 4050</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">RESOLUTION</span>
                  <span className="text-gray-300">640x640 Native</span>
                </div>
              </div>
            </GlassPanel>

            {exportErrorMsg && (
              <div className="mb-2 p-2 border border-red-500/50 bg-red-500/10 text-red-500 text-[9px] font-mono tracking-widest text-center uppercase rounded animate-pulse">
                {exportErrorMsg}
              </div>
            )}

            <div className="flex gap-3 mt-auto">
              <GlowButton onClick={() => navigate('/history')} className="flex-1 py-3 text-[9px]">
                ARCHIVE
              </GlowButton>
              <GlowButton 
                onClick={handleExport} 
                disabled={exportState === 'EXPORTING'}
                className={`flex-1 py-3 text-[9px] ${
                  exportState === 'EXPORTING' ? 'opacity-50 cursor-not-allowed' : 
                  exportState === 'FAILED' ? 'border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:border-red-500 hover:bg-red-500/10' :
                  exportState === 'EXPORTED' ? 'border-green-500 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] hover:border-green-500 hover:bg-green-500/10' : ''
                }`}
              >
                {exportState === 'EXPORTING' ? (
                  <span className="flex items-center justify-center"><div className="w-3 h-3 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" /> EXPORTING...</span>
                ) : exportState === 'EXPORTED' ? (
                  <span className="flex items-center justify-center"><CheckCircle className="w-3 h-3 mr-2" /> EXPORTED</span>
                ) : exportState === 'FAILED' ? (
                  <span className="flex items-center justify-center"><AlertTriangle className="w-3 h-3 mr-2" /> EXPORT FAILED</span>
                ) : (
                  <span className="flex items-center justify-center"><Download className="w-3 h-3 mr-2" /> EXPORT</span>
                )}
              </GlowButton>
            </div>

          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
