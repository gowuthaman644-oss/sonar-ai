import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHistory } from '../services/api';
import { 
  FileText, 
  Download, 
  AlertTriangle, 
  Target, 
  Activity, 
  Shield, 
  Printer, 
  ArrowLeft,
  ChevronDown,
  Layers,
  UserCheck
} from 'lucide-react';
import { RiskBadge, PriorityBadge } from '../components/ui';

export default function Reports() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getHistory();
        setHistory(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const [selectedScanId, setSelectedScanId] = useState(scanId || '');

  useEffect(() => {
    if (history.length > 0 && !selectedScanId) {
      setSelectedScanId(scanId || history[0].scan_id);
    }
  }, [history, scanId]);

  const targetScan = selectedScanId
    ? history.find(s => s.scan_id === selectedScanId)
    : (history.length > 0 ? history[0] : null);

  const handleExportPDF = () => {
    const originalTitle = document.title;
    if (targetScan) {
      document.title = `SONAR-AI_Intelligence_Report_${targetScan.scan_id}`;
    }
    window.print();
    document.title = originalTitle;
  };

  const handleExportCSV = () => {
    if (!targetScan) return;
    const rows = [
      ['ScanId', 'Filename', 'CreatedAt', 'ClassName', 'Confidence', 'X', 'Y', 'Width', 'Height', 'EvidenceScore', 'UncertaintyLevel', 'ContactType', 'TrackId', 'PriorityScore', 'PriorityTier', 'TriageRank', 'OperatorDecision', 'OperatorReason', 'RiskLevel', 'RiskScore', 'AnomalyScore']
    ];
    if (targetScan.detections && targetScan.detections.length > 0) {
      targetScan.detections.forEach((d, idx) => {
        rows.push([
          targetScan.scan_id,
          targetScan.filename,
          targetScan.created_at,
          d.class_name,
          d.confidence != null ? d.confidence : 0,
          d.x != null ? d.x : 0,
          d.y != null ? d.y : 0,
          d.width != null ? d.width : 0,
          d.height != null ? d.height : 0,
          d.evidence?.evidence_score ?? 'N/A',
          d.uncertainty?.uncertainty_level ?? 'N/A',
          d.contact_type ?? 'KNOWN_TARGET',
          d.track_id || (d.tracking?.track_id) || 'NONE',
          d.priority_score ?? 'N/A',
          d.priority_tier ?? 'N/A',
          d.triage_rank ?? idx + 1,
          d.operator_feedback?.decision || 'PENDING',
          d.operator_feedback?.reason || 'NONE',
          targetScan.analysis?.risk_level || 'LOW',
          targetScan.analysis?.risk_score || 0,
          targetScan.analysis?.anomaly_score || 0
        ]);
      });
    } else {
      rows.push([
        targetScan.scan_id,
        targetScan.filename,
        targetScan.created_at,
        'NO_DETECTIONS',
        0, 0, 0, 0, 0, 'N/A', 'N/A', 'NONE', 'NONE', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
        targetScan.analysis?.risk_level || 'LOW',
        targetScan.analysis?.risk_score || 0,
        targetScan.analysis?.anomaly_score || 0
      ]);
    }
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `report_${targetScan.scan_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col pb-10 max-w-[1680px] mx-auto font-sans">
      
      {/* HEADER - HIDE ON PRINT */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[rgba(32,220,197,0.18)] pb-5 mb-1 print:hidden gap-4">
        <div>
          <div className="flex items-center gap-3.5 mb-2">
            <div className="h-10 w-10 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(32,220,197,0.2)]">
              <FileText className="w-5 h-5 text-[#20DCC5]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-[0.15em] uppercase text-[#F2F7F5]">
              INTELLIGENCE REPORTS
            </h1>
          </div>
          <p className="text-[#A8BDB9] font-mono text-[10px] tracking-[0.25em] uppercase ml-14">
            MISSION DOSSIER COMPILATION & TELEMETRY EXPORT
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono">
          {history.length > 0 && (
            <select
              value={targetScan?.scan_id || ''}
              onChange={(e) => setSelectedScanId(e.target.value)}
              className="bg-[rgba(4,25,27,0.85)] border border-[rgba(32,220,197,0.30)] text-[#20DCC5] font-mono text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-[#20DCC5] transition-all"
            >
              {history.map(s => (
                <option key={s.scan_id} value={s.scan_id} className="bg-[#02090B] text-[#F2F7F5]">
                  {s.scan_id} - {s.filename} ({s.analysis?.risk_level || 'LOW'})
                </option>
              ))}
            </select>
          )}

          <button 
            onClick={handleExportCSV}
            disabled={!targetScan} 
            className="bg-[rgba(4,25,27,0.85)] text-[#20DCC5] border border-[rgba(32,220,197,0.30)] hover:bg-[#20DCC5]/20 text-xs py-2.5 px-4 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-widest uppercase rounded-xl"
          >
            <Download className="w-3.5 h-3.5" /> CSV EXPORT
          </button>

          <button 
            onClick={handleExportPDF}
            disabled={!targetScan} 
            className="bg-[#20DCC5] text-black font-bold text-xs py-2.5 px-5 flex items-center gap-2 hover:bg-[#20DCC5]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-widest uppercase rounded-xl shadow-[0_0_15px_rgba(32,220,197,0.3)]"
          >
            <Printer className="w-3.5 h-3.5" /> PRINT / PDF DOSSIER
          </button>
        </div>
      </div>

      {/* DOCUMENT PREVIEW CONTAINER */}
      <div className="bg-white text-black border border-gray-300 shadow-2xl max-w-4xl mx-auto w-full p-8 md:p-12 font-sans relative overflow-hidden flex-1 flex flex-col rounded-xl print:border-none print:w-full print:max-w-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        
        {/* Document Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-widest uppercase text-black">SONAR-AI</h1>
              <h2 className="text-lg tracking-widest text-[#607874] font-mono uppercase">MISSION INTELLIGENCE REPORT</h2>
            </div>
            <div className="text-right font-mono text-xs text-[#607874]">
              <div>CONFIDENTIAL // LEVEL-3</div>
              <div>CLASSIFIED ACOUSTIC AUDIT</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center font-mono text-[#607874] tracking-widest animate-pulse print:hidden py-16">
            GENERATING MISSION DOSSIER...
          </div>
        ) : !targetScan ? (
          <div className="flex-1 flex items-center justify-center font-mono text-[#607874] tracking-widest print:hidden py-16">
            NO SCANS AVAILABLE FOR REPORT.
          </div>
        ) : (
          <div className="flex-1 flex flex-col font-sans">
            
            {/* SCAN INFORMATION */}
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-black font-mono">1. SCAN METADATA</h3>
              <div className="grid grid-cols-2 gap-4 text-xs text-black font-mono">
                <div><span className="text-[#607874]">Scan ID:</span> <strong>{targetScan.scan_id}</strong></div>
                <div><span className="text-[#607874]">Timestamp:</span> <strong>{new Date(targetScan.created_at).toLocaleString()}</strong></div>
                <div><span className="text-[#607874]">Inference Engine:</span> <strong>YOLO11n (4-Class Acoustic)</strong></div>
                <div><span className="text-[#607874]">Source Telemetry:</span> <strong>{targetScan.filename}</strong></div>
              </div>
            </div>

            {/* THREAT ASSESSMENT */}
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-2 text-black font-mono">2. THREAT & RISK ASSESSMENT</h3>
              <div className="grid grid-cols-2 gap-4 text-xs text-black font-mono">
                <div><span className="text-[#607874]">Risk Level:</span> <strong className="uppercase">{targetScan.analysis?.risk_level || 'UNKNOWN'}</strong></div>
                <div><span className="text-[#607874]">Risk Score:</span> <strong>{targetScan.analysis?.risk_score != null ? Number(targetScan.analysis.risk_score).toFixed(1) : '—'} / 100</strong></div>
                <div><span className="text-[#607874]">Seabed Anomaly Score:</span> <strong>{targetScan.analysis?.anomaly_score != null ? Number(targetScan.analysis.anomaly_score).toFixed(1) : '0.0'} / 100</strong></div>
                <div><span className="text-[#607874]">Anomaly Status:</span> <strong className="uppercase">{targetScan.analysis?.anomaly_details?.anomaly_status || 'NOMINAL'}</strong></div>
              </div>
            </div>

            {/* DETECTED ENTITIES */}
            <div className="mb-6">
              <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3 text-black font-mono">3. DETECTED CONTACTS & EVIDENCE</h3>
              <div className="mb-3 text-xs text-black font-mono"><span className="text-[#607874]">Total Verified Contacts:</span> <strong>{(targetScan.detections || []).length}</strong></div>
              
              {(!targetScan.detections || targetScan.detections.length === 0) ? (
                <div className="text-[#607874] italic text-xs font-mono">No target contacts detected in current scan. Seabed acoustic returns are nominal.</div>
              ) : (
                targetScan.detections.map((det, idx) => (
                  <div key={idx} className="mb-4 text-xs border-l-4 border-gray-800 pl-3.5 text-black font-mono" style={{ pageBreakInside: 'avoid' }}>
                    <div className="font-bold uppercase text-sm text-black flex items-center justify-between">
                      <span>{det.class_name || 'TARGET'} — {det.confidence != null ? `${(det.confidence * 100).toFixed(1)}%` : '—'} CONF</span>
                      {det.priority_tier && (
                        <span className="text-[10px] px-2 py-0.5 bg-gray-200 text-black rounded font-bold uppercase">
                          {det.priority_tier.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1 text-[11px] grid grid-cols-2 gap-x-4 max-w-sm text-gray-700">
                      <span>Bounding Box: [{det.x != null ? det.x.toFixed(1) : '0'}, {det.y != null ? det.y.toFixed(1) : '0'}, {det.width != null ? det.width.toFixed(1) : '0'}, {det.height != null ? det.height.toFixed(1) : '0'}]</span>
                      {det.triage_rank && <span>Triage Priority: #{det.triage_rank}</span>}
                    </div>

                    {/* Acoustic Intelligence Details */}
                    <div className="mt-2 text-[11px] text-[#222] space-y-0.5 border-t border-gray-200 pt-1.5 max-w-lg">
                      {det.evidence && (
                        <>
                          <div><span className="text-[#607874]">Acoustic Evidence Score:</span> <strong>{det.evidence?.evidence_score != null ? `${Number(det.evidence.evidence_score).toFixed(1)}%` : '—'}</strong></div>
                          <div><span className="text-[#607874]">Evidence Status:</span> <strong className="uppercase">{det.evidence.evidence_status?.replace('_', ' ')}</strong></div>
                          <div><span className="text-[#607874]">Uncertainty Level:</span> <strong className="uppercase">{det.uncertainty?.uncertainty_level || 'N/A'}</strong></div>
                          <div><span className="text-[#607874]">Assessment:</span> <strong className="uppercase">{det.uncertainty?.operator_assessment || (det.contact_type === 'KNOWN_TARGET' ? 'CONFIRMED TARGET' : 'PROVISIONAL TARGET')}</strong></div>
                        </>
                      )}
                      {(det.track_id || det.tracking?.track_id) && (
                        <div><span className="text-[#607874]">Persistent Track ID:</span> <strong>{det.track_id || det.tracking?.track_id}</strong></div>
                      )}
                      <div>
                        <span className="text-[#607874]">Operator Verification:</span>{' '}
                        <strong className={`uppercase ${
                          det.operator_feedback?.decision === 'CONFIRM' ? 'text-emerald-700' :
                          det.operator_feedback?.decision === 'REJECT' ? 'text-red-700' :
                          det.operator_feedback?.decision === 'UNCERTAIN' ? 'text-amber-700' : 'text-gray-500'
                        }`}>
                          {det.operator_feedback?.decision ? (
                            `${det.operator_feedback.decision}${det.operator_feedback.reason ? ` (${det.operator_feedback.reason})` : ''}`
                          ) : 'PENDING AUDIT'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* SONAR IMAGE VISUALIZATION */}
            <div className="mb-4" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="text-sm font-bold uppercase border-b border-gray-300 pb-1 mb-3 text-black font-mono">4. ACOUSTIC SCAN VISUALIZATION</h3>
              <div className="relative inline-block border-2 border-black bg-black p-1 max-w-full rounded">
                <img 
                  src={`/api/history/${targetScan.scan_id}/image`} 
                  alt="Sonar Scan" 
                  className="max-w-full h-auto object-contain max-h-[380px]"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="hidden absolute inset-0 items-center justify-center text-[10px] text-red-500 tracking-widest bg-black/80 font-mono">
                  IMAGE UNAVAILABLE
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
