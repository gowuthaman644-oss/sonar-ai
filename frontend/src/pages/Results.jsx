import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory, submitOperatorFeedback } from '../services/api';
import { 
  CheckCircle, 
  AlertTriangle, 
  Target, 
  ArrowLeft, 
  PlusSquare, 
  Activity, 
  Shield, 
  Crosshair, 
  FileText, 
  Printer, 
  Compass, 
  X, 
  Check, 
  HelpCircle, 
  UserCheck, 
  ListOrdered, 
  Zap
} from 'lucide-react';
import SonarDetectionViewer from '../components/SonarDetectionViewer';
import { GlassPanel, RiskBadge, PriorityBadge } from '../components/ui';

export default function Results() {
  const { scanId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [result, setResult] = useState(location.state?.result || null);
  const [imagePreview, setImagePreview] = useState(location.state?.imagePreview || null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState(null);
  
  const [activeDetectionIdx, setActiveDetectionIdx] = useState(null);
  const [showProvenance, setShowProvenance] = useState(false);

  // Human Verification Feedback States
  const [feedbackState, setFeedbackState] = useState({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

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

  const getSuggestedReasons = (decision) => {
    if (decision === 'CONFIRM') {
      return [
        'Strong object-shadow consistency',
        'High structural edge density',
        'Consistent acoustic contrast',
        'Verified target morphology',
        'OTHER'
      ];
    }
    if (decision === 'REJECT') {
      return [
        'Acoustic clutter',
        'Seabed reverberation noise',
        'Weak target evidence',
        'Incorrect classification',
        'Duplicate detection',
        'OTHER'
      ];
    }
    if (decision === 'UNCERTAIN') {
      return [
        'Ambiguous acoustic return',
        'Diffuse shadow signature',
        'Insufficient evidence',
        'Requires secondary frequency pass',
        'Image quality limitation',
        'OTHER'
      ];
    }
    return ['OTHER'];
  };

  const handleSaveFeedback = async (detId) => {
    if (!detId || !selectedDecision) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const reasonVal = selectedReason === 'OTHER' ? (notes.trim() || 'Other reason') : selectedReason;
      const res = await submitOperatorFeedback({
        detectionId: detId,
        decision: selectedDecision,
        reason: reasonVal || null,
        notes: notes.trim() || null,
      });
      setFeedbackState(prev => ({
        ...prev,
        [detId]: res
      }));
      setIsVerifying(false);
      setSelectedDecision(null);
      setSelectedReason('');
      setNotes('');
    } catch (err) {
      console.error('Feedback submission failed:', err);
      if (err.response?.status === 409) {
        setFeedbackError('Verification feedback is already recorded for this detection.');
      } else {
        setFeedbackError(err.response?.data?.detail || 'Failed to submit operator verification.');
      }
    } finally {
      setSubmittingFeedback(false);
    }
  };

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
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 print:hidden">
        <div className="w-12 h-12 border-2 border-[#20DCC5] border-t-transparent rounded-full animate-spin flex items-center justify-center shadow-[0_0_20px_rgba(32,220,197,0.4)]">
          <Activity className="w-4 h-4 text-[#20DCC5] animate-pulse" />
        </div>
        <div className="font-mono tracking-[0.25em] text-[#20DCC5] text-xs uppercase animate-pulse">
          RECONSTRUCTING MISSION INTELLIGENCE...
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="text-center py-20 font-mono tracking-widest print:hidden">
        <AlertTriangle className="w-14 h-14 mx-auto mb-4 text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
        <h2 className="text-xl text-[#F2F7F5] uppercase font-bold">{error || "INTELLIGENCE RECORD NOT FOUND"}</h2>
        <p className="text-xs text-[#607874] mt-2 mb-6 uppercase">The requested survey record does not exist in the archive database.</p>
        <button 
          onClick={() => navigate('/history')} 
          className="inline-flex items-center gap-2 text-xs text-[#20DCC5] hover:text-[#F2F7F5] border border-[rgba(32,220,197,0.3)] bg-[rgba(32,220,197,0.1)] px-6 py-2.5 rounded-lg transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> RETURN TO ARCHIVE
        </button>
      </div>
    );
  }

  const detections = result.detections || [];
  const risk = result.analysis || {};
  const primaryDet = detections.length > 0 ? (activeDetectionIdx !== null ? detections[activeDetectionIdx] : detections[0]) : null;

  return (
    <div className="max-w-[1680px] mx-auto h-full flex flex-col pb-6 font-sans">
      
      {/* --- PRINT ONLY VIEW (Export PDF Engine - 100% PRESERVED) --- */}
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
            <div><span className="text-[#607874]">Risk Score:</span> <strong>{risk.risk_score != null ? Number(risk.risk_score).toFixed(1) : '—'}</strong></div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold uppercase border-b border-gray-300 mb-4">DETECTED ENTITIES</h3>
          <div className="mb-4 text-sm"><span className="text-[#607874]">Total verified targets:</span> <strong>{detections.length}</strong></div>
          
          {detections.length === 0 ? (
            <div className="text-[#607874] italic">No targets detected in this scan.</div>
          ) : (
            detections.map((det, idx) => (
              <div key={idx} className="mb-4 text-sm border-l-4 border-gray-300 pl-4" style={{ pageBreakInside: 'avoid' }}>
                <div className="font-bold uppercase text-lg">{det.class_name || 'TARGET'} — {det.confidence != null ? `${(det.confidence * 100).toFixed(1)}%` : '—'}</div>
                <div className="text-[#607874] mt-1">Bounding Box Coordinates:</div>
                <div className="font-mono text-xs mt-1 grid grid-cols-2 gap-x-4 max-w-xs">
                  <span>x: {det.x != null ? det.x.toFixed(1) : '—'}</span>
                  <span>y: {det.y != null ? det.y.toFixed(1) : '—'}</span>
                  <span>width: {det.width != null ? det.width.toFixed(1) : '—'}</span>
                  <span>height: {det.height != null ? det.height.toFixed(1) : '—'}</span>
                </div>
                {det.evidence && (
                  <div className="mt-2 text-xs font-mono text-[#222] space-y-0.5 border-t border-gray-200 pt-1.5 max-w-sm">
                    {det.priority_score != null && (
                      <div><span className="text-[#607874]">Triage Rank / Score:</span> <strong>#{det.triage_rank || idx + 1} • {Number(det.priority_score).toFixed(1)} PTS ({det.priority_tier?.replace('_', ' ')})</strong></div>
                    )}
                    <div><span className="text-[#607874]">Acoustic Evidence:</span> <strong>{det.evidence?.evidence_score != null ? `${Number(det.evidence.evidence_score).toFixed(1)}%` : '—'}</strong></div>
                    <div><span className="text-[#607874]">Evidence Status:</span> <strong className="uppercase">{det.evidence.evidence_status?.replace('_', ' ')}</strong></div>
                    <div><span className="text-[#607874]">Uncertainty:</span> <strong className="uppercase">{det.uncertainty?.uncertainty_level || 'N/A'}</strong></div>
                    <div><span className="text-[#607874]">Assessment:</span> <strong className="uppercase">{det.uncertainty?.operator_assessment || (det.contact_type === 'KNOWN_TARGET' ? 'CONFIRMED TARGET' : 'PROVISIONAL TARGET')}</strong></div>
                    {det.tracking && (
                      <div><span className="text-[#607874]">Persistent Track:</span> <strong>{det.tracking.track_id} ({det.tracking.status} • {det.tracking.observation_count} {det.tracking.observation_count > 1 ? 'scans' : 'scan'})</strong></div>
                    )}
                  </div>
                )}
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


      {/* --- TOP MISSION CONTROL ACTION BAR --- */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between border-b border-[rgba(32,220,197,0.18)] pb-4 mb-6 print:hidden gap-4"
      >
        <div className="flex flex-col">
          <button 
            onClick={() => navigate('/history')}
            className="flex items-center text-[10px] font-mono text-[#607874] hover:text-[#20DCC5] transition-colors mb-2 tracking-widest uppercase w-fit group"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-1 transition-transform" /> RETURN TO MISSION ARCHIVE
          </button>
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(32,220,197,0.2)]">
              <FileText className="w-5 h-5 text-[#20DCC5]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-bold tracking-[0.15em] uppercase text-[#F2F7F5]">
                  DETECTION REPORT
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-[#20DCC5]/40 text-[#20DCC5] bg-[#20DCC5]/10 uppercase font-semibold">
                  {result.scan_id}
                </span>
              </div>
              <p className="text-[#A8BDB9] font-mono text-[9px] tracking-[0.25em] uppercase mt-0.5 flex items-center gap-2">
                <Shield className="w-3 h-3 text-[#20DCC5]" /> VERIFIED MULTI-STAGE INTELLIGENCE RECORD
                <span className="text-[#607874]">•</span>
                <span className="text-[#607874]">{new Date(result.created_at).toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => setShowProvenance(true)}
            className="px-3.5 py-2 bg-[rgba(4,25,27,0.85)] border border-[rgba(32,220,197,0.25)] text-[#20DCC5] hover:border-[#20DCC5] hover:bg-[#20DCC5]/10 transition-all text-[10px] font-mono tracking-widest uppercase rounded-lg flex items-center gap-2 shadow-sm"
          >
            <Compass className="w-3.5 h-3.5" /> PROVENANCE AUDIT
          </button>

          <button 
            onClick={() => navigate('/scan')}
            className="px-3.5 py-2 bg-transparent border border-[rgba(32,220,197,0.2)] text-[#A8BDB9] hover:text-[#F2F7F5] hover:border-[#20DCC5]/40 transition-colors text-[10px] font-mono tracking-widest uppercase rounded-lg flex items-center gap-2"
          >
            <PlusSquare className="w-3.5 h-3.5" /> NEW SCAN
          </button>
          
          <button 
            onClick={handleExport}
            disabled={exportState === 'EXPORTING'}
            className={`px-4 py-2 border text-[10px] font-mono tracking-widest uppercase rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,0,0,0.3)]
              ${exportState === 'EXPORTING' ? 'bg-[#20DCC5]/5 text-[#20DCC5]/50 border-[#20DCC5]/20 cursor-not-allowed' :
                exportState === 'EXPORTED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                exportState === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/50' :
                'bg-[#20DCC5] text-black font-bold border-[#20DCC5] hover:bg-[#20DCC5]/90 hover:shadow-[0_0_20px_rgba(32,220,197,0.4)]'
              }
            `}
          >
            {exportState === 'EXPORTING' ? (
              <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> EXPORTING...</>
            ) : exportState === 'EXPORTED' ? (
              <><CheckCircle className="w-3.5 h-3.5" /> EXPORT SUCCESS</>
            ) : exportState === 'FAILED' ? (
              <><AlertTriangle className="w-3.5 h-3.5" /> EXPORT FAILED</>
            ) : (
              <><Printer className="w-3.5 h-3.5" /> EXPORT DOSSIER</>
            )}
          </button>
        </div>
      </motion.div>

      {exportErrorMsg && (
        <div className="mb-4 p-3 border border-red-500/50 bg-red-500/10 text-red-400 text-xs font-mono tracking-widest text-center uppercase rounded-lg flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {exportErrorMsg}
        </div>
      )}

      {/* --- 2-COLUMN MAIN INTELLIGENCE LAYOUT --- */}
      <motion.div 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 print:hidden"
      >
        
        {/* LEFT COLUMN: HERO TACTICAL SONAR VIEWER + OPERATOR VERIFICATION CONSOLE (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Main Sonar Viewer Container */}
          <GlassPanel className="p-0 flex-1 relative flex flex-col overflow-hidden border border-[rgba(32,220,197,0.22)] rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]" borderTop>
            
            {/* Viewer Header Bar */}
            <div className="p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50 flex justify-between items-center z-20">
              <div className="flex items-center gap-2.5">
                <Target className="w-4 h-4 text-[#20DCC5]" />
                <h3 className="text-xs font-mono tracking-widest text-[#F2F7F5] uppercase font-bold">
                  TACTICAL ACOUSTIC ACQUISITION FEED
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-[#607874] uppercase mr-1">OVERALL THREAT:</span>
                <RiskBadge level={risk.risk_level || 'LOW'} />
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 relative bg-[#02090B] p-2 overflow-hidden flex flex-col min-h-[460px]">
              {/* Target Counter Overlay */}
              <div className="absolute top-4 left-4 z-10 bg-black/85 backdrop-blur-md border border-[rgba(32,220,197,0.25)] px-3 py-1.5 rounded-lg flex items-center text-[9px] font-mono tracking-widest uppercase shadow-lg pointer-events-none">
                <span className="text-[#607874] mr-2">VERIFIED TARGETS:</span>
                <span className="text-[#20DCC5] font-bold text-xs">{detections.length}</span>
              </div>

              {/* Source Tag */}
              <div className="absolute top-4 right-4 z-10 bg-black/85 backdrop-blur-md border border-[rgba(32,220,197,0.25)] px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-widest uppercase text-[#A8BDB9] shadow-lg pointer-events-none truncate max-w-[220px]">
                <span className="text-[#607874] mr-1">SRC:</span> {result.filename}
              </div>

              {/* Sonar Detection Viewer Component */}
              <div className="flex-1 w-full relative border border-transparent rounded-xl overflow-hidden group">
                <SonarDetectionViewer 
                  imageUrl={displayImage} 
                  detections={detections} 
                  activeIndex={activeDetectionIdx}
                  onHover={setActiveDetectionIdx}
                />
                <div className="absolute bottom-3 right-3 bg-black/85 px-2.5 py-1 font-mono text-[8px] text-[#607874] tracking-widest border border-[rgba(32,220,197,0.2)] rounded backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                  YOLO11N INFERENCE LAYER // CONF: 0.25+
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* OPERATOR VERIFICATION CONSOLE (Human-in-the-Loop Audit) */}
          {primaryDet && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.22)] rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(32,220,197,0.08)]">
                
                {/* Console Header */}
                <div className="p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-[#20DCC5]" />
                    <h3 className="text-xs font-mono font-bold tracking-widest text-[#F2F7F5] uppercase">
                      OPERATOR VERIFICATION CONSOLE
                    </h3>
                  </div>
                  
                  {(() => {
                    const fb = feedbackState[primaryDet.id] || primaryDet.operator_feedback;
                    if (fb) {
                      return (
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold border uppercase flex items-center gap-1.5 ${
                          fb.decision === 'CONFIRM' ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/15' :
                          fb.decision === 'REJECT' ? 'text-red-400 border-red-500/50 bg-red-500/15' :
                          'text-[#D6A84F] border-[#D6A84F]/50 bg-[#D6A84F]/15'
                        }`}>
                          {fb.decision === 'CONFIRM' && <Check className="w-3 h-3" />}
                          {fb.decision === 'REJECT' && <X className="w-3 h-3" />}
                          {fb.decision === 'UNCERTAIN' && <HelpCircle className="w-3 h-3" />}
                          {fb.decision === 'CONFIRM' ? 'OPERATOR CONFIRMED' : fb.decision === 'REJECT' ? 'OPERATOR REJECTED' : 'UNCERTAIN / REVIEW'}
                        </span>
                      );
                    }
                    return (
                      <span className="px-2.5 py-1 rounded-full text-[8px] font-mono text-[#607874] border border-[rgba(32,220,197,0.18)] bg-black/40 uppercase">
                        PENDING OPERATOR AUDIT
                      </span>
                    );
                  })()}
                </div>

                <div className="p-4 space-y-3 font-mono">
                  
                  {/* Immutable AI Reference Strip */}
                  <div className="p-2.5 px-3 rounded-lg bg-black/50 border border-[rgba(32,220,197,0.12)] text-[9px] flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2 text-[#607874] text-[8px] uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#20DCC5]" />
                      ACTIVE CONTACT: <strong className="text-[#F2F7F5] uppercase text-[9px]">{primaryDet.class_name || 'UNKNOWN'}</strong>
                    </div>
                    <div className="flex items-center gap-4 text-[#A8BDB9] text-[8px]">
                      <span>YOLO CONF: <strong className="text-[#F2F7F5]">{primaryDet.confidence != null ? `${(primaryDet.confidence * 100).toFixed(1)}%` : '—'}</strong></span>
                      <span>ACOUSTIC EV: <strong className="text-[#20DCC5]">{primaryDet.evidence?.evidence_score != null ? `${Number(primaryDet.evidence.evidence_score).toFixed(1)}%` : 'N/A'}</strong></span>
                      <span>TIER: <strong className="text-amber-400">{primaryDet.priority_tier?.replace('_', ' ') || 'DEFERRED'}</strong></span>
                    </div>
                  </div>

                  {/* Feedback Form vs Summary View */}
                  {(() => {
                    const fb = feedbackState[primaryDet.id] || primaryDet.operator_feedback;
                    
                    if (fb && !isVerifying) {
                      return (
                        <div className="p-3.5 rounded-xl bg-black/40 border border-[rgba(32,220,197,0.15)] space-y-2 text-[9px]">
                          <div className="flex justify-between items-center text-[#607874] text-[8px] uppercase">
                            <span>VERIFICATION RECORD STORED:</span>
                            <span className="text-[#A8BDB9]">{new Date(fb.created_at).toLocaleString()}</span>
                          </div>
                          <div className="text-xs font-bold text-[#F2F7F5] flex items-center gap-2">
                            <span>DECISION:</span>
                            <span className={`uppercase font-mono ${
                              fb.decision === 'CONFIRM' ? 'text-emerald-400' :
                              fb.decision === 'REJECT' ? 'text-red-400' : 'text-[#D6A84F]'
                            }`}>
                              {fb.decision === 'CONFIRM' ? 'CONFIRMED TARGET' :
                               fb.decision === 'REJECT' ? 'REJECTED TARGET (FALSE POSITIVE)' : 'UNCERTAIN / DEFERRED REVIEW'}
                            </span>
                          </div>
                          {fb.reason && (
                            <div className="text-[#A8BDB9]">
                              <span className="text-[#607874]">REASON: </span>
                              <span className="text-[#F2F7F5]">{fb.reason}</span>
                            </div>
                          )}
                          {fb.notes && (
                            <div className="text-[#A8BDB9]">
                              <span className="text-[#607874]">OPERATIONAL NOTES: </span>
                              <span className="italic text-[#20DCC5]">"{fb.notes}"</span>
                            </div>
                          )}
                          <div className="pt-2 flex justify-between items-center border-t border-white/5 text-[8px] text-[#607874]">
                            <span>Original AI prediction and acoustic evidence remain strictly immutable.</span>
                          </div>
                        </div>
                      );
                    }

                    if (isVerifying) {
                      return (
                        /* Interactive Verification Drawer */
                        <div className="space-y-3 bg-black/60 p-4 rounded-xl border border-[#20DCC5]/40 shadow-inner">
                          <div className="flex justify-between items-center border-b border-[rgba(32,220,197,0.15)] pb-2 text-[9px]">
                            <span className="text-[#20DCC5] font-bold uppercase flex items-center gap-1.5">
                              RECORDING OPERATOR DECISION: <span className="text-[#F2F7F5] px-2 py-0.5 rounded bg-[#20DCC5]/20 border border-[#20DCC5]/40">{selectedDecision}</span>
                            </span>
                            <button 
                              onClick={() => { setIsVerifying(false); setSelectedDecision(null); setFeedbackError(null); }}
                              className="text-[#607874] hover:text-[#F2F7F5] p-1 rounded transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Reason Pills */}
                          <div className="space-y-1.5">
                            <span className="text-[8px] text-[#607874] uppercase tracking-wider">SELECT RATIONALE:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {getSuggestedReasons(selectedDecision).map((rsn) => (
                                <button
                                  key={rsn}
                                  type="button"
                                  onClick={() => setSelectedReason(rsn === selectedReason ? '' : rsn)}
                                  className={`px-2.5 py-1 rounded-md text-[8px] border transition-all ${
                                    selectedReason === rsn
                                      ? 'border-[#20DCC5] bg-[#20DCC5]/25 text-[#20DCC5] font-bold shadow-[0_0_10px_rgba(32,220,197,0.2)]'
                                      : 'border-[rgba(32,220,197,0.15)] bg-black/40 text-[#A8BDB9] hover:border-[#20DCC5]/40'
                                  }`}
                                >
                                  {rsn}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Custom Notes */}
                          <div className="space-y-1">
                            <span className="text-[8px] text-[#607874] uppercase tracking-wider">OPERATOR NOTES (OPTIONAL):</span>
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Enter acoustic observations, sensor details, or verification rationale..."
                              className="w-full bg-black/70 border border-[rgba(32,220,197,0.25)] rounded-lg p-2.5 text-[9px] text-[#F2F7F5] font-mono focus:outline-none focus:border-[#20DCC5] resize-none h-16 placeholder:text-[#607874]"
                            />
                          </div>

                          {feedbackError && (
                            <div className="text-[8px] text-red-400 font-mono bg-red-500/10 border border-red-500/30 p-2 rounded">
                              {feedbackError}
                            </div>
                          )}

                          {/* Buttons */}
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => { setIsVerifying(false); setSelectedDecision(null); setFeedbackError(null); }}
                              className="px-3.5 py-1.5 rounded-lg border border-[rgba(32,220,197,0.2)] text-[9px] text-[#A8BDB9] hover:text-[#F2F7F5] uppercase transition-colors"
                            >
                              CANCEL
                            </button>
                            <button
                              type="button"
                              disabled={submittingFeedback}
                              onClick={() => handleSaveFeedback(primaryDet.id)}
                              className="px-4 py-1.5 rounded-lg border border-[#20DCC5] bg-[#20DCC5] text-black font-bold text-[9px] uppercase tracking-wider hover:bg-[#20DCC5]/90 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(32,220,197,0.3)]"
                            >
                              {submittingFeedback ? 'LOGGING...' : 'COMMIT DECISION'}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      /* 3 Decision Trigger Buttons */
                      <div className="space-y-2">
                        <div className="text-[8px] text-[#607874] uppercase tracking-wider">
                          SELECT OPERATIONAL ACTION:
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          <button
                            type="button"
                            onClick={() => { setSelectedDecision('CONFIRM'); setSelectedReason(''); setNotes(''); setIsVerifying(true); }}
                            className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm"
                          >
                            <Check className="w-4 h-4" />
                            <span className="text-[9px] font-bold tracking-wider uppercase">CONFIRM TARGET</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedDecision('REJECT'); setSelectedReason(''); setNotes(''); setIsVerifying(true); }}
                            className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm"
                          >
                            <X className="w-4 h-4" />
                            <span className="text-[9px] font-bold tracking-wider uppercase">REJECT (CLUTTER)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSelectedDecision('UNCERTAIN'); setSelectedReason(''); setNotes(''); setIsVerifying(true); }}
                            className="p-3 rounded-xl border border-[#D6A84F]/40 bg-[#D6A84F]/10 hover:bg-[#D6A84F]/20 text-[#D6A84F] flex flex-col items-center gap-1.5 transition-all hover:scale-[1.02] shadow-sm"
                          >
                            <HelpCircle className="w-4 h-4" />
                            <span className="text-[9px] font-bold tracking-wider uppercase">UNCERTAIN</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* RIGHT COLUMN: INTELLIGENCE STACK (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-5 overflow-y-auto pr-1 custom-scrollbar min-h-0 pb-6">
          
          {/* 1. OPERATOR DECISION MATRIX (Primary Contact Synthesis) */}
          {(() => {
            const contactName = primaryDet ? primaryDet.class_name : 'SEABED CLEAR';
            const yoloConf = primaryDet?.confidence != null ? `${(primaryDet.confidence * 100).toFixed(1)}%` : 'N/A';
            const evScore = primaryDet?.evidence?.evidence_score != null ? `${Number(primaryDet.evidence.evidence_score).toFixed(1)}%` : (detections.length === 0 ? 'NOMINAL' : 'N/A');
            const uncLevel = primaryDet?.uncertainty?.uncertainty_level || (detections.length === 0 ? 'LOW' : 'MODERATE');
            const priorityTier = primaryDet?.priority_tier || 'DEFERRED_INSPECTION';

            return (
              <motion.div initial={{ x: 15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[#20DCC5]/40 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(32,220,197,0.12)]">
                  <div className="p-3.5 px-4 border-b border-[#20DCC5]/30 bg-gradient-to-r from-[#20DCC5]/15 to-transparent flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#20DCC5] shadow-[0_0_8px_#20DCC5] animate-pulse" />
                      <h3 className="text-xs font-mono font-bold tracking-widest text-[#F2F7F5] uppercase">
                        OPERATOR DECISION MATRIX
                      </h3>
                    </div>
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded border border-[#20DCC5]/40 text-[#20DCC5] bg-[#20DCC5]/10 uppercase tracking-widest">
                      SYNTHESIZED
                    </span>
                  </div>

                  <div className="p-4 space-y-3.5 font-mono text-[9px]">
                    {/* Primary Contact Header */}
                    <div className="flex justify-between items-center bg-black/50 p-3 rounded-xl border border-[rgba(32,220,197,0.15)]">
                      <div className="flex flex-col">
                        <span className="text-[#607874] uppercase text-[7px] tracking-widest">SELECTED CONTACT</span>
                        <span className="text-sm font-bold text-[#F2F7F5] uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                          <Target className="w-3.5 h-3.5 text-[#20DCC5]" />
                          {contactName}
                        </span>
                      </div>
                      <PriorityBadge tier={priorityTier} />
                    </div>

                    {/* 4-Box Telemetry Grid */}
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="p-2 rounded-lg bg-black/40 border border-[rgba(32,220,197,0.12)]">
                        <span className="text-[#607874] text-[7px] block">YOLO CONF</span>
                        <span className="text-[#F2F7F5] font-bold text-[10px] mt-0.5 block">{yoloConf}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/40 border border-[rgba(32,220,197,0.12)]">
                        <span className="text-[#607874] text-[7px] block">ACOUSTIC EV</span>
                        <span className="text-[#20DCC5] font-bold text-[10px] mt-0.5 block">{evScore}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/40 border border-[rgba(32,220,197,0.12)]">
                        <span className="text-[#607874] text-[7px] block">UNCERTAINTY</span>
                        <span className={`font-bold text-[10px] mt-0.5 block ${
                          uncLevel === 'LOW' ? 'text-emerald-400' :
                          uncLevel === 'HIGH' ? 'text-orange-400' :
                          uncLevel === 'CRITICAL' ? 'text-red-400' : 'text-[#D6A84F]'
                        }`}>
                          {uncLevel}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-black/40 border border-[rgba(32,220,197,0.12)]">
                        <span className="text-[#607874] text-[7px] block">HAZARD WT</span>
                        <span className="text-[#D6A84F] font-bold text-[10px] mt-0.5 block">
                          {primaryDet?.fusion?.class_hazard_weight ? `${primaryDet.fusion.class_hazard_weight}x` : '1.0x'}
                        </span>
                      </div>
                    </div>

                    {/* Persistent Track Data if available */}
                    {primaryDet?.tracking && (
                      <div className="p-2.5 rounded-xl bg-black/40 border border-[rgba(32,220,197,0.15)] space-y-1.5">
                        <div className="flex justify-between items-center text-[8px]">
                          <span className="text-[#607874] uppercase">PERSISTENT TRACK:</span>
                          <span className="text-[#20DCC5] font-bold">{primaryDet.tracking.track_id} ({primaryDet.tracking.status})</span>
                        </div>
                        <div className="flex justify-between items-center text-[8px] text-[#A8BDB9]">
                          <span>OBSERVATIONS: {primaryDet.tracking.observation_count} SCANS</span>
                          <span>FIRST OBSERVED: {primaryDet.tracking.first_observed ? new Date(primaryDet.tracking.first_observed).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })()}

          {/* 2. THREAT ASSESSMENT (Risk Engine) */}
          <motion.div initial={{ x: 15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="bg-[rgba(4,25,27,0.72)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.18)] rounded-2xl overflow-hidden p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-[rgba(32,220,197,0.12)] pb-2.5">
                <h3 className="text-xs font-mono font-bold tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-red-400" /> THREAT ASSESSMENT
                </h3>
                <RiskBadge level={risk.risk_level || 'LOW'} />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col">
                  <span className="text-[#607874] font-mono text-[8px] uppercase tracking-widest">MISSION RISK SCORE</span>
                  <span className="text-2xl font-mono font-bold text-[#F2F7F5] mt-0.5">
                    {risk.risk_score != null ? Number(risk.risk_score).toFixed(1) : '0.0'}
                    <span className="text-xs text-[#607874] ml-1">/ 100</span>
                  </span>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="w-36 h-2 bg-black/60 rounded-full overflow-hidden border border-[rgba(32,220,197,0.15)]">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      risk.risk_level === 'CRITICAL' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                      risk.risk_level === 'HIGH' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                      risk.risk_level === 'MEDIUM' ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                      'bg-gradient-to-r from-[#0F6F70] to-[#20DCC5]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, risk.risk_score || 0))}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* 3. SEABED ACOUSTIC ANOMALY (Step 3 Baseline) */}
          <motion.div initial={{ x: 15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
            <div className="bg-[rgba(4,25,27,0.72)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.18)] rounded-2xl overflow-hidden p-4 space-y-2.5 font-mono text-[9px]">
              <div className="flex justify-between items-center border-b border-[rgba(32,220,197,0.12)] pb-2.5">
                <h3 className="text-xs font-bold tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D6A84F]" /> SEABED ANOMALY BASELINE
                </h3>
                <span className={`text-[8px] px-2 py-0.5 rounded border uppercase font-bold ${
                  (result.analysis?.anomaly_score || 0) >= 70 ? 'text-red-400 border-red-500/40 bg-red-500/10' :
                  (result.analysis?.anomaly_score || 0) >= 40 ? 'text-[#D6A84F] border-[#D6A84F]/40 bg-[#D6A84F]/10' :
                  'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                }`}>
                  {result.analysis?.anomaly_details?.anomaly_status || (result.analysis?.anomaly_score > 0 ? 'ANOMALY OBSERVABLE' : 'NORMAL SEABED')}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#A8BDB9]">
                <span className="text-[#607874]">ANOMALY INTENSITY SCORE:</span>
                <span className="text-[#F2F7F5] font-bold">{(result.analysis?.anomaly_score || 0).toFixed(1)} / 100</span>
              </div>
              <p className="text-[#607874] text-[8px] leading-relaxed italic border-t border-[rgba(32,220,197,0.08)] pt-2">
                {result.analysis?.anomaly_details?.explanation || 'Nominal seabed acoustic returns. No unexplained acoustic structures outside target regions.'}
              </p>
            </div>
          </motion.div>

          {/* 4. PRIORITIZED ACTION QUEUE (Phase 8 Evidence Fusion) */}
          <motion.div initial={{ x: 15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border-2 border-[#20DCC5]/40 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(32,220,197,0.12)]">
              <div className="p-3.5 px-4 border-b border-[#20DCC5]/30 bg-gradient-to-r from-[#20DCC5]/15 to-transparent flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-[#20DCC5]" />
                  <h3 className="text-xs font-mono font-bold tracking-widest text-[#F2F7F5] uppercase">
                    PRIORITIZED ACTION QUEUE
                  </h3>
                </div>
                <span className="text-[8px] font-mono px-2 py-0.5 rounded border border-[#20DCC5]/40 text-[#20DCC5] bg-[#20DCC5]/10 uppercase tracking-widest font-semibold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> FUSED RANKING
                </span>
              </div>

              <div className="p-3 space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar bg-black/30">
                {detections.length === 0 ? (
                  <div className="text-[9px] font-mono text-[#607874] text-center py-8 uppercase tracking-widest">
                    No active targets in inspection queue
                  </div>
                ) : (
                  [...detections]
                    .map((det, originalIdx) => ({ det, originalIdx }))
                    .sort((a, b) => (a.det.triage_rank || 999) - (b.det.triage_rank || 999))
                    .map(({ det, originalIdx }, qIdx) => {
                      const rank = det.triage_rank || qIdx + 1;
                      const priorityTier = det.priority_tier || 'DEFERRED_INSPECTION';
                      const pScore = det.priority_score != null ? det.priority_score : (det.confidence != null ? (det.confidence * 100) : 0);
                      const isActive = activeDetectionIdx === originalIdx;
                      const fb = feedbackState[det.id] || det.operator_feedback;

                      return (
                        <div
                          key={originalIdx}
                          onClick={() => setActiveDetectionIdx(isActive ? null : originalIdx)}
                          className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer relative font-mono
                            ${isActive 
                              ? 'border-[#20DCC5] bg-[#20DCC5]/15 shadow-[0_0_15px_rgba(32,220,197,0.25)]' 
                              : priorityTier === 'IMMEDIATE_ACTION'
                                ? 'border-red-500/50 bg-red-500/5 hover:border-red-400 hover:bg-red-500/10'
                                : priorityTier === 'REVIEW_REQUIRED'
                                  ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-400 hover:bg-amber-500/10'
                                  : 'border-[rgba(32,220,197,0.15)] bg-black/40 hover:border-[#20DCC5]/40'}
                          `}
                        >
                          {/* Card Header */}
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold
                                ${priorityTier === 'IMMEDIATE_ACTION' ? 'bg-red-500 text-black shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                                  priorityTier === 'REVIEW_REQUIRED' ? 'bg-amber-400 text-black shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
                                  'bg-[#0F6F70] text-[#F2F7F5]'}
                              `}>
                                #{rank}
                              </span>
                              <span className="text-xs font-bold uppercase tracking-wider text-[#F2F7F5]">
                                {det.class_name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {fb && (
                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold border uppercase flex items-center gap-0.5
                                  ${fb.decision === 'CONFIRM' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' :
                                    fb.decision === 'REJECT' ? 'text-red-400 border-red-500/40 bg-red-500/10' :
                                    'text-[#D6A84F] border-[#D6A84F]/40 bg-[#D6A84F]/10'}
                                `}>
                                  {fb.decision === 'CONFIRM' ? 'CONFIRMED' : fb.decision === 'REJECT' ? 'REJECTED' : 'UNCERTAIN'}
                                </span>
                              )}
                              <PriorityBadge tier={priorityTier} />
                            </div>
                          </div>

                          {/* Progress Score Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[8px]">
                              <span className="text-[#607874] uppercase">PRIORITY SCORE</span>
                              <span className="font-bold text-[#20DCC5]">{pScore.toFixed(1)} / 100</span>
                            </div>
                            <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden border border-[rgba(32,220,197,0.1)]">
                              <div
                                className={`h-full transition-all duration-500 rounded-full ${
                                  priorityTier === 'IMMEDIATE_ACTION' ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                  priorityTier === 'REVIEW_REQUIRED' ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                                  'bg-gradient-to-r from-[#0F6F70] to-[#20DCC5]'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, pScore))}%` }}
                              />
                            </div>
                          </div>

                          {/* Multi-Signal Breakdown Chips */}
                          <div className="grid grid-cols-4 gap-1 text-[7px] uppercase pt-2 text-center">
                            <div className="p-1 rounded bg-black/50 border border-[rgba(32,220,197,0.08)]">
                              <span className="text-[#607874] block">YOLO</span>
                              <span className="text-[#F2F7F5] font-bold">{det.confidence != null ? `${(det.confidence * 100).toFixed(1)}%` : '—'}</span>
                            </div>
                            <div className="p-1 rounded bg-black/50 border border-[rgba(32,220,197,0.08)]">
                              <span className="text-[#607874] block">EVID</span>
                              <span className="text-[#20DCC5] font-bold">
                                {det.evidence?.evidence_score != null ? `${Number(det.evidence.evidence_score).toFixed(1)}%` : 'N/A'}
                              </span>
                            </div>
                            <div className="p-1 rounded bg-black/50 border border-[rgba(32,220,197,0.08)]">
                              <span className="text-[#607874] block">HAZARD</span>
                              <span className="text-[#D6A84F] font-bold">
                                {det.fusion?.class_hazard_weight ? `${det.fusion.class_hazard_weight}x` : '1.0x'}
                              </span>
                            </div>
                            <div className="p-1 rounded bg-black/50 border border-[rgba(32,220,197,0.08)]">
                              <span className="text-[#607874] block">TRACK</span>
                              <span className="text-emerald-400 font-bold">
                                +{det.fusion?.tracking_bonus || 0}
                              </span>
                            </div>
                          </div>

                          {/* Rationale */}
                          <p className="text-[7.5px] text-[#A8BDB9] italic pt-1.5 leading-snug">
                            {det.triage_rationale || det.fusion?.rationale || 'Prioritized based on neural confidence and acoustic corroboration.'}
                          </p>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </motion.div>

          {/* 5. TARGET INVENTORY (Full Contact Registry) */}
          <motion.div initial={{ x: 15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
            <div className="bg-[rgba(4,25,27,0.72)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.18)] rounded-2xl overflow-hidden p-4 space-y-3 font-mono">
              <div className="flex justify-between items-center border-b border-[rgba(32,220,197,0.12)] pb-2.5">
                <h3 className="text-xs font-bold tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5 text-[#20DCC5]" /> TARGET REGISTRY
                </h3>
                <span className="text-[8px] text-[#607874] uppercase">{detections.length} CONTACTS</span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                {detections.length === 0 ? (
                  <div className="text-[8px] text-[#607874] text-center py-6 uppercase tracking-widest">
                    No detections registered in current survey
                  </div>
                ) : (
                  detections.map((det, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setActiveDetectionIdx(activeDetectionIdx === idx ? null : idx)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer text-[8px] ${
                        activeDetectionIdx === idx 
                          ? 'border-[#20DCC5] bg-[#20DCC5]/15' 
                          : 'border-[rgba(32,220,197,0.12)] bg-black/40 hover:border-[#20DCC5]/30'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-[#F2F7F5] uppercase text-[9px] flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${activeDetectionIdx === idx ? 'bg-[#20DCC5] shadow-[0_0_5px_#20DCC5]' : 'bg-[#607874]'}`} />
                          {det.class_name}
                        </span>
                        <span className="text-[#20DCC5] font-bold">
                          {det.confidence != null ? `${(det.confidence * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#607874] text-[7.5px]">
                        <span>EV: {det.evidence?.evidence_score != null ? `${Number(det.evidence.evidence_score).toFixed(1)}%` : 'N/A'}</span>
                        <span>UNC: {det.uncertainty?.uncertainty_level || 'MODERATE'}</span>
                        <span>POS: [{det.x != null ? det.x.toFixed(0) : '0'}, {det.y != null ? det.y.toFixed(0) : '0'}]</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* --- DECISION PROVENANCE & AUDIT TRAIL MODAL --- */}
      <AnimatePresence>
        {showProvenance && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 print:hidden"
            onClick={() => setShowProvenance(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#02090B] border-2 border-[#20DCC5]/50 rounded-2xl max-w-2xl w-full p-6 shadow-[0_0_50px_rgba(32,220,197,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-4 border-b border-[rgba(32,220,197,0.25)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center">
                    <Compass className="w-5 h-5 text-[#20DCC5]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-mono font-bold tracking-[0.15em] text-[#F2F7F5] uppercase">
                      DECISION PROVENANCE & AUDIT TRAIL
                    </h2>
                    <p className="text-[8px] font-mono text-[#607874] tracking-widest uppercase">
                      5-STAGE MULTI-LAYER INTELLIGENCE PEDIGREE
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProvenance(false)}
                  className="p-1.5 rounded-lg border border-[rgba(32,220,197,0.2)] text-[#A8BDB9] hover:text-[#F2F7F5] hover:border-[#20DCC5] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Provenance Body */}
              {(() => {
                const target = primaryDet;
                if (!target) {
                  return (
                    <div className="py-12 text-center text-xs font-mono text-[#607874] tracking-widest uppercase">
                      NO ACTIVE CONTACT DETECTED — SEABED NOMINAL
                    </div>
                  );
                }

                return (
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 py-4 space-y-3.5 font-mono text-[9px] tracking-wider">
                    {/* Stage 1: Neural Object Detection */}
                    <div className="p-3.5 rounded-xl border border-[rgba(32,220,197,0.2)] bg-black/50 space-y-2">
                      <div className="flex justify-between items-center text-[#20DCC5] font-bold uppercase text-[10px]">
                        <span>STAGE 1: NEURAL VISION (YOLO11n)</span>
                        <span className="text-[#F2F7F5]">{target.confidence != null ? `${(target.confidence * 100).toFixed(1)}% CONF` : '—'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[#A8BDB9] text-[8px]">
                        <div>CLASSIFICATION: <span className="text-[#F2F7F5] uppercase font-bold">{target.class_name}</span></div>
                        <div>BOUNDING BOX: <span className="text-[#F2F7F5]">[{target.x != null ? target.x.toFixed(0) : '0'}, {target.y != null ? target.y.toFixed(0) : '0'}, {target.width != null ? target.width.toFixed(0) : '0'}, {target.height != null ? target.height.toFixed(0) : '0'}]</span></div>
                      </div>
                    </div>

                    {/* Stage 2: Acoustic Evidence Analysis */}
                    <div className="p-3.5 rounded-xl border border-[rgba(32,220,197,0.2)] bg-black/50 space-y-2">
                      <div className="flex justify-between items-center text-[#20DCC5] font-bold uppercase text-[10px]">
                        <span>STAGE 2: PHYSICAL EVIDENCE ENGINE</span>
                        <span className="text-[#F2F7F5]">{target.evidence?.evidence_score != null ? `${Number(target.evidence.evidence_score).toFixed(1)}%` : 'N/A'} SCORE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[#A8BDB9] text-[8px]">
                        <div>CONTRAST RATIO (TBCR): <span className="text-[#F2F7F5]">{target.evidence?.contrast_features?.tbcr != null ? Number(target.evidence.contrast_features.tbcr).toFixed(2) : 'N/A'}</span></div>
                        <div>INTENSITY DELTA: <span className="text-[#F2F7F5]">{target.evidence?.contrast_features?.intensity_delta != null ? Number(target.evidence.contrast_features.intensity_delta).toFixed(1) : 'N/A'}</span></div>
                        <div>SOBEL GRADIENT ENERGY: <span className="text-[#F2F7F5]">{target.evidence?.structural_features?.gradient_energy != null ? Number(target.evidence.structural_features.gradient_energy).toFixed(1) : 'N/A'}</span></div>
                        <div>EDGE DENSITY: <span className="text-[#F2F7F5]">{target.evidence?.structural_features?.edge_density != null ? Number(target.evidence.structural_features.edge_density).toFixed(2) : 'N/A'}</span></div>
                        <div>DOWN-RANGE SHADOW: <span className="text-[#F2F7F5] uppercase">{target.evidence?.shadow_features?.shadow_status || 'NOT_OBSERVED'}</span></div>
                        <div>EVIDENCE STATUS: <span className="text-[#20DCC5] uppercase">{target.evidence?.evidence_status || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Stage 3: Unknown Seabed Anomaly */}
                    <div className="p-3.5 rounded-xl border border-[rgba(32,220,197,0.2)] bg-black/50 space-y-2">
                      <div className="flex justify-between items-center text-[#20DCC5] font-bold uppercase text-[10px]">
                        <span>STAGE 3: SEABED ANOMALY BASELINE</span>
                        <span className="text-[#F2F7F5]">{(result.analysis?.anomaly_score || 0).toFixed(1)} / 100</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[#A8BDB9] text-[8px]">
                        <div>TARGET MASKING: <span className="text-[#F2F7F5]">ACTIVE (15px BUFFER)</span></div>
                        <div>ANOMALY STATUS: <span className="text-[#F2F7F5] uppercase">{result.analysis?.anomaly_details?.anomaly_status || 'NO_ANOMALY'}</span></div>
                        <div className="col-span-2 text-[8px] text-[#607874]">{result.analysis?.anomaly_details?.explanation || 'Nominal seabed acoustic returns outside masked target.'}</div>
                      </div>
                    </div>

                    {/* Stage 4: Uncertainty Decomposition */}
                    <div className="p-3.5 rounded-xl border border-[rgba(32,220,197,0.2)] bg-black/50 space-y-2">
                      <div className="flex justify-between items-center text-[#20DCC5] font-bold uppercase text-[10px]">
                        <span>STAGE 4: UNCERTAINTY LAYER</span>
                        <span className="text-[#F2F7F5]">{target.uncertainty?.uncertainty_level || 'N/A'} LEVEL</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[#A8BDB9] text-[8px]">
                        <div>INTER-LAYER DISCREPANCY (Δ): <span className="text-[#F2F7F5]">{target.uncertainty?.metrics_summary?.inter_layer_delta ?? 'N/A'}%</span></div>
                        <div>UNCERTAINTY SCORE: <span className="text-[#F2F7F5]">{target.uncertainty?.uncertainty_score ?? 'N/A'} / 100</span></div>
                        <div className="col-span-2 space-y-1 pt-1 border-t border-white/5">
                          <span className="text-[#607874] text-[7px] uppercase">EVALUATED PHYSICAL FACTORS:</span>
                          {(target.uncertainty?.factors || []).map((f, i) => (
                            <div key={i} className="text-[#F2F7F5] text-[8px] flex items-start gap-1.5">
                              <span className="text-[#20DCC5]">›</span> {f}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Stage 5: Decision Policy & Boundary Audit */}
                    <div className="p-3.5 rounded-xl border border-[#D6A84F]/40 bg-[#D6A84F]/10 space-y-2">
                      <div className="flex justify-between items-center text-[#D6A84F] font-bold uppercase text-[10px]">
                        <span>STAGE 5: DECISION POLICY & BOUNDARY AUDIT</span>
                        <span className="text-[#F2F7F5] uppercase">{target.uncertainty?.boundary_audit?.margin_status || 'STABLE'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[#A8BDB9] text-[8px]">
                        <div>DISTANCE TO THRESHOLD: <span className="text-[#F2F7F5]">{target.uncertainty?.boundary_audit?.min_distance_to_boundary != null ? `${Number(target.uncertainty.boundary_audit.min_distance_to_boundary).toFixed(1)}%` : 'N/A'}</span></div>
                        <div>OPERATIONAL ASSESSMENT: <span className="text-[#20DCC5] font-bold uppercase">{target.uncertainty?.operator_assessment || 'N/A'}</span></div>
                        <div className="col-span-2 pt-1 border-t border-[#D6A84F]/20">
                          <div className="text-[7px] text-[#D6A84F] uppercase font-bold">TACTICAL ACTION DIRECTIVE:</div>
                          <div className="text-[9px] text-[#F2F7F5] font-bold uppercase">{target.uncertainty?.operator_recommendation || 'REVIEW / PROCEED PER PROTOCOL'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-[rgba(32,220,197,0.25)] flex justify-end">
                <button
                  onClick={() => setShowProvenance(false)}
                  className="px-5 py-2.5 bg-[#20DCC5] text-black font-mono font-bold text-xs rounded-xl uppercase tracking-widest hover:bg-[#20DCC5]/90 transition-all shadow-[0_0_15px_rgba(32,220,197,0.3)]"
                >
                  DISMISS PROVENANCE AUDIT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
