import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getHistory } from '../services/api';
import { FileText, Download, AlertTriangle, Target, Activity, Shield } from 'lucide-react';
import { RiskBadge } from '../components/ui';

export default function Reports() {
  const { scanId } = useParams();
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
      ['ScanId', 'Filename', 'CreatedAt', 'ClassName', 'Confidence', 'X', 'Y', 'Width', 'Height', 'RiskLevel', 'RiskScore']
    ];
    if (targetScan.detections && targetScan.detections.length > 0) {
      targetScan.detections.forEach(d => {
        rows.push([
          targetScan.scan_id,
          targetScan.filename,
          targetScan.created_at,
          d.class_name,
          d.confidence,
          d.x,
          d.y,
          d.width,
          d.height,
          targetScan.analysis?.risk_level || 'LOW',
          targetScan.analysis?.risk_score || 0
        ]);
      });
    } else {
      rows.push([
        targetScan.scan_id,
        targetScan.filename,
        targetScan.created_at,
        'NO_DETECTIONS',
        0, 0, 0, 0, 0,
        targetScan.analysis?.risk_level || 'LOW',
        targetScan.analysis?.risk_score || 0
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
    <div className="space-y-6 animate-in fade-in duration-700 h-full flex flex-col pb-10">
      
      {/* HEADER - HIDE ON PRINT */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[rgba(32,220,197,0.18)] pb-6 mb-2 print:hidden gap-4">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-[#F2F7F5]">INTELLIGENCE REPORTS</h1>
          </div>
          <p className="text-[#A8BDB9] font-mono text-sm tracking-widest uppercase">
            DOCUMENT & TELEMETRY EXPORT
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {history.length > 0 && (
            <select
              value={targetScan?.scan_id || ''}
              onChange={(e) => setSelectedScanId(e.target.value)}
              className="bg-[rgba(4,25,27,0.85)] border border-[rgba(32,220,197,0.30)] text-[#20DCC5] font-mono text-xs px-3 py-2.5 rounded focus:outline-none focus:border-[#20DCC5]"
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
            className="bg-[#20DCC5]/10 text-[#20DCC5] border border-[rgba(32,220,197,0.30)] hover:bg-[#20DCC5]/20 text-xs py-2.5 px-4 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-widest uppercase rounded"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>

          <button 
            onClick={handleExportPDF}
            disabled={!targetScan} 
            className="bg-[#20DCC5] text-[#02090B] font-bold text-xs py-2.5 px-4 flex items-center gap-2 hover:bg-[#20DCC5]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-widest uppercase rounded shadow-[0_0_15px_rgba(32,220,197,0.25)]"
          >
            <Download className="w-3.5 h-3.5" /> EXPORT PDF
          </button>
        </div>
      </div>

      <div className="bg-black/40 border border-[rgba(32,220,197,0.18)] max-w-4xl mx-auto w-full p-0 relative overflow-hidden flex-1 flex flex-col print:border-none print:w-full print:max-w-none print:bg-white print:text-black">
        
        {/* Subtle background branding - HIDE ON PRINT */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none print:hidden">
          <FileText className="w-96 h-96" />
        </div>

        <div className="relative z-10 p-8 md:p-12 flex-1 flex flex-col">
          {/* Document Header */}
          <div className="text-center border-b border-[rgba(32,220,197,0.18)] print:border-black pb-8 mb-8">
            <h2 className="text-3xl font-bold tracking-[0.4em] text-[#F2F7F5] print:text-black uppercase mb-2">SONAR-AI</h2>
            <h3 className="text-xs font-mono tracking-widest text-[#20DCC5] print:text-[#607874] uppercase">Automated Intelligence Brief</h3>
          </div>

          {loading ? (
             <div className="flex-1 flex items-center justify-center font-mono text-[#607874] tracking-widest animate-pulse print:hidden">GENERATING DOCUMENT...</div>
          ) : !targetScan ? (
             <div className="flex-1 flex items-center justify-center font-mono text-[#607874] tracking-widest print:hidden">NO SCANS AVAILABLE FOR REPORT.</div>
          ) : (
            <div className="flex-1 flex flex-col print:block">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 flex-1 print:block">
                
                <div className="space-y-8 print:mb-8">
                  {/* Scan Info */}
                  <div className="space-y-4 font-mono">
                    <h4 className="text-[10px] text-[#607874] print:text-gray-800 font-bold tracking-widest uppercase border-b border-[rgba(32,220,197,0.18)] print:border-black pb-2 mb-4">Identification</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs">
                      <div className="text-[#607874] print:text-gray-800">SCAN ID</div>
                      <div className="text-[#F2F7F5] print:text-black text-right font-bold">{targetScan.scan_id}</div>
                      
                      <div className="text-[#607874] print:text-gray-800">SOURCE FILE</div>
                      <div className="text-[#F2F7F5] print:text-black text-right truncate pl-4">{targetScan.filename}</div>

                      <div className="text-[#607874] print:text-gray-800">DATE</div>
                      <div className="text-[#F2F7F5] print:text-black text-right">{new Date(targetScan.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Tech Specs */}
                  <div className="space-y-4 font-mono">
                    <h4 className="text-[10px] text-[#607874] print:text-gray-800 font-bold tracking-widest uppercase border-b border-[rgba(32,220,197,0.18)] print:border-black pb-2 mb-4">System Parameters</h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs">
                      <div className="text-[#607874] print:text-gray-800">ENGINE</div>
                      <div className="text-[#20DCC5] print:text-black text-right font-bold">YOLO11n</div>
                      
                      <div className="text-[#607874] print:text-gray-800">ACCELERATION</div>
                      <div className="text-[#D6A84F] print:text-black text-right font-bold">CUDA</div>
                    </div>
                  </div>

                  {/* Risk Assessment */}
                  <div className="space-y-4 font-mono">
                    <h4 className="text-[10px] text-[#607874] print:text-gray-800 font-bold tracking-widest uppercase border-b border-[rgba(32,220,197,0.18)] print:border-black pb-2 mb-4 flex items-center gap-2">
                      <Shield className="w-3 h-3" /> THREAT ASSESSMENT
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4 text-xs bg-black/50 print:bg-transparent print:border print:border-black p-4 rounded border border-[rgba(32,220,197,0.18)]">
                      <div className="text-[#607874] print:text-gray-800">RISK LEVEL</div>
                      <div className="text-right">
                        <RiskBadge level={targetScan.analysis?.risk_level || 'LOW'} />
                      </div>
                      
                      <div className="text-[#607874] print:text-gray-800">RISK SCORE</div>
                      <div className="text-[#F2F7F5] print:text-black text-right font-bold text-sm">{targetScan.analysis?.risk_score?.toFixed(1) || '0.0'} / 100</div>

                      <div className="text-[#607874] print:text-gray-800">DETECTED ENTITIES</div>
                      <div className="text-[#20DCC5] print:text-black text-right font-bold text-sm">{(targetScan.detections || []).length}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 flex flex-col print:mb-8">
                  {/* Detection Inventory */}
                  <div className="space-y-4 font-mono flex-1">
                    <h4 className="text-[10px] text-[#607874] print:text-gray-800 font-bold tracking-widest uppercase border-b border-[rgba(32,220,197,0.18)] print:border-black pb-2 mb-4 flex items-center gap-2">
                      <Target className="w-3 h-3" /> DETECTION INVENTORY
                    </h4>
                    
                    <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar print:max-h-none print:overflow-visible">
                      {(!targetScan.detections || targetScan.detections.length === 0) ? (
                         <div className="p-4 border border-dashed border-[rgba(32,220,197,0.18)] print:border-gray-400 bg-black/40 print:bg-transparent text-center text-[#607874] text-xs tracking-widest">
                           NO TARGETS DETECTED
                         </div>
                      ) : (
                        targetScan.detections.map((det, idx) => (
                          <div key={idx} className="p-3 bg-black/40 print:bg-transparent print:border print:border-gray-400 border border-[rgba(32,220,197,0.18)] rounded border-l-2 border-l-[#20DCC5]">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-[#F2F7F5] print:text-black tracking-widest uppercase flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#20DCC5] print:bg-black" />
                                {det.class_name}
                              </span>
                              <span className="text-xs text-[#20DCC5] print:text-black font-bold">{(det.confidence * 100).toFixed(1)}%</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[9px] text-[#607874] print:text-gray-800">
                              <div>X1: {det.x.toFixed(1)}</div>
                              <div>Y1: {det.y.toFixed(1)}</div>
                              <div>X2: {(det.x + det.width).toFixed(1)}</div>
                              <div>Y2: {(det.y + det.height).toFixed(1)}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sonar Image */}
              <div className="mt-8 space-y-4 font-mono print:mt-8" style={{ pageBreakInside: 'avoid' }}>
                <h4 className="text-[10px] text-[#607874] print:text-gray-800 font-bold tracking-widest uppercase border-b border-[rgba(32,220,197,0.18)] print:border-black pb-2 mb-4 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> SOURCE IMAGERY
                </h4>
                <div className="border border-[rgba(32,220,197,0.18)] print:border-black bg-black p-1 inline-block relative max-w-full">
                  <img 
                    src={`/api/history/${targetScan.scan_id}/image`} 
                    alt="Sonar Scan" 
                    className="max-w-full h-auto object-contain max-h-[300px] print:max-h-[500px]"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden absolute inset-0 items-center justify-center text-[10px] text-red-500 tracking-widest bg-black/80">
                    IMAGE UNAVAILABLE
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-[rgba(32,220,197,0.18)] print:border-black text-center print:mt-12">
                <div className="inline-block px-4 py-2 border border-[#20DCC5]/30 print:border-gray-400 bg-[#20DCC5]/5 print:bg-transparent text-[#20DCC5] print:text-[#607874] text-[10px] font-mono tracking-widest uppercase rounded">
                   OFFICIAL INTELLIGENCE RECORD
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
