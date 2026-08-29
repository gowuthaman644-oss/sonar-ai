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
          setError("Failed to load analysis result.");
        } finally {
          setLoading(false);
        }
      }
      fetchResult();
    }
  }, [scanId, result]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
        <div className="font-mono tracking-[0.2em] text-[#00F0FF] animate-pulse text-xs">ACCESSING SECURE DATA...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-xl mx-auto mt-20">
        <GlassPanel className="p-12 text-center border-red-500/50 bg-red-500/5">
          <AlertTriangle className="w-16 h-16 mx-auto mb-6 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          <h2 className="text-xl font-bold text-white mb-2 tracking-[0.2em]">ACCESS DENIED / ERROR</h2>
          <p className="text-xs font-mono text-gray-400 mb-8 uppercase tracking-widest">{error || "Unable to process sonar image."}</p>
          <GlowButton onClick={() => navigate('/scan')} className="w-full">
            RETURN TO ACQUISITION
          </GlowButton>
        </GlassPanel>
      </div>
    );
  }

  const riskLevel = result.analysis?.risk_level || result.risk_level || 'LOW';
  const riskScore = result.analysis?.risk_score || result.risk_score || 0;
  
  const getRiskColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'text-red-500';
      case 'HIGH': return 'text-orange-500';
      case 'MEDIUM': return 'text-amber-500';
      case 'LOW': return 'text-emerald-500';
      default: return 'text-emerald-500';
    }
  };

  const detections = result.detections || [];
  const totalDetections = detections.length;

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-[1600px] mx-auto h-full flex flex-col"
    >
      
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1A2C42] pb-4 mb-6">
        <div>
          <button onClick={() => navigate('/scan')} className="text-[#00F0FF]/70 hover:text-[#00F0FF] flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] mb-4 transition-colors uppercase">
            <ArrowLeft className="w-3 h-3" /> INITIALIZE NEW SCAN
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-[0.2em] uppercase text-white shadow-black drop-shadow-md">
              {totalDetections === 0 ? "NO ANOMALIES DETECTED" : "INTELLIGENCE REPORT"}
            </h1>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col md:items-end font-mono text-[9px] tracking-[0.2em] uppercase">
          <div className="text-gray-500 mb-1">RECORD ID // <span className="text-white font-bold">{result.scan_id}</span></div>
          <div className="text-gray-500">DATABASE // <span className="text-emerald-400 font-bold">SYNCHRONIZED</span></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT SIDE: Image Viewer */}
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col min-h-[50vh]">
          <GlassPanel className="p-1 flex-1 relative flex overflow-hidden">
            <SonarDetectionViewer 
              imageUrl={imagePreview || (result?.scan_id ? `/api/history/${result.scan_id}/image` : null)} 
              detections={detections}
              activeIndex={activeDetectionIdx}
              onHover={setActiveDetectionIdx}
            />
          </GlassPanel>
        </motion.div>

        {/* RIGHT SIDE: Analysis Details */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 pb-6">
          
          <GlassPanel className="p-6 border-t-2" style={{ borderTopColor: getRiskColor(riskLevel).replace('text-', 'var(--') + ')' }}>
            <SectionHeader icon={Activity} title="THREAT ASSESSMENT" />
            
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-[#1A2C42]">
              <div>
                <div className="text-[9px] text-gray-500 font-mono tracking-[0.2em] uppercase mb-2">Classification</div>
                <div className={`text-2xl font-bold tracking-[0.2em] uppercase flex items-center gap-3 ${getRiskColor(riskLevel)}`}>
                  {riskLevel === 'HIGH' || riskLevel === 'CRITICAL' ? <AlertTriangle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                  {riskLevel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-gray-500 font-mono tracking-[0.2em] uppercase mb-2">Confidence Score</div>
                <div className={`text-2xl font-light font-mono ${getRiskColor(riskLevel)}`}>
                  {riskScore.toFixed(0)} <span className="text-xs text-gray-600">/ 100</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-mono tracking-[0.2em] text-gray-400 uppercase">
                  DETECTED ENTITIES
                </h4>
                <span className="text-[10px] font-mono font-bold text-[#00F0FF]">{totalDetections}</span>
              </div>
              
              {totalDetections === 0 ? (
                <div className="p-6 border border-dashed border-[#1A2C42] text-center bg-black/20">
                  <span className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em]">CLEAR SEABED CONSTRAINTS</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {detections.map((det, idx) => (
                    <motion.div 
                      key={idx} 
                      whileHover={{ scale: 1.02 }}
                      className={`p-3 border rounded transition-all duration-200 cursor-crosshair flex justify-between items-center group
                        ${activeDetectionIdx === idx ? 'border-[#00F0FF] bg-[#00F0FF]/10' : 'border-[#1A2C42] bg-black/40 hover:border-[#00F0FF]/50'}
                      `}
                      onMouseEnter={() => setActiveDetectionIdx(idx)}
                      onMouseLeave={() => setActiveDetectionIdx(null)}
                    >
                      <div className="flex items-center gap-3">
                        <Crosshair className={`w-4 h-4 transition-colors ${activeDetectionIdx === idx ? 'text-[#00F0FF]' : 'text-gray-500'}`} />
                        <div>
                          <div className={`text-xs font-bold tracking-[0.2em] uppercase transition-colors ${activeDetectionIdx === idx ? 'text-white' : 'text-gray-300'}`}>
                            {det.class_name}
                          </div>
                        </div>
                      </div>
                      <div className={`text-sm font-mono font-light transition-colors ${activeDetectionIdx === idx ? 'text-[#00F0FF]' : 'text-gray-500'}`}>
                        {(det.confidence * 100).toFixed(1)}%
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </GlassPanel>
          
          <GlassPanel className="p-6 bg-[#02050A]">
            <h3 className="text-[10px] font-mono tracking-[0.2em] text-gray-500 mb-4 uppercase">
              METADATA
            </h3>
            <div className="space-y-3 text-[10px] font-mono tracking-[0.1em] uppercase">
              <div className="flex justify-between border-b border-[#1A2C42] pb-2">
                <span className="text-gray-600">Timestamp</span>
                <span className="text-gray-300">{new Date(result.created_at || Date.now()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-[#1A2C42] pb-2">
                <span className="text-gray-600">Vision Core</span>
                <span className="text-[#00F0FF]">YOLO11n-C</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-gray-600">Resolution</span>
                <span className="text-gray-300">640x640 Native</span>
              </div>
            </div>
          </GlassPanel>

          <div className="flex gap-3 mt-auto">
            <GlowButton onClick={() => navigate('/history')} className="flex-1 py-3 text-[9px]">
              ARCHIVE
            </GlowButton>
            <GlowButton onClick={() => navigate('/reports')} className="flex-1 py-3 text-[9px]">
              <Download className="w-3 h-3 mr-2" /> EXPORT
            </GlowButton>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
