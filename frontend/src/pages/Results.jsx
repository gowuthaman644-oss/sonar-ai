import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getHistory } from '../services/api';
import { CheckCircle, AlertTriangle, Target, ArrowLeft, Download, PlusSquare, Activity } from 'lucide-react';
import SonarDetectionViewer from '../components/SonarDetectionViewer';

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
    // Note: if user refreshes on this page without location state, imagePreview will be null.
    // In a real app we'd fetch the saved image URL from backend, but the backend doesn't currently serve the file statics.
    // So if no image preview, it degrades gracefully to showing the bounding boxes on a black bg, but ideally they come from NewScan.
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
        <div className="w-12 h-12 border-2 border-sonar-cyan border-t-transparent rounded-full animate-spin"></div>
        <div className="font-mono tracking-widest text-sonar-cyan animate-pulse">LOADING ANALYSIS...</div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="glass-panel p-12 text-center text-gray-400 font-mono tracking-widest border-risk-high/30 bg-risk-high/5">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-risk-high" />
        <h2 className="text-xl font-bold text-white mb-2">ANALYSIS FAILED</h2>
        <p className="text-sm mb-6">{error || "Unable to process sonar image."}</p>
        <button onClick={() => navigate('/scan')} className="sonar-button text-xs px-6 py-2">
          TRY AGAIN
        </button>
      </div>
    );
  }

  const riskLevel = result.analysis?.risk_level || result.risk_level || 'LOW';
  const riskScore = result.analysis?.risk_score || result.risk_score || 0;
  
  let riskColor = 'text-risk-low';
  let riskBorder = 'border-risk-low';
  let riskBg = 'bg-risk-low';
  if (riskLevel === 'HIGH') {
    riskColor = 'text-risk-high';
    riskBorder = 'border-risk-high';
    riskBg = 'bg-risk-high';
  } else if (riskLevel === 'MEDIUM') {
    riskColor = 'text-risk-medium';
    riskBorder = 'border-risk-medium';
    riskBg = 'bg-risk-medium';
  }

  const detections = result.detections || [];
  const totalDetections = detections.length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-sonar-border pb-6 mb-6">
        <div>
          <button onClick={() => navigate('/scan')} className="text-gray-400 hover:text-white flex items-center gap-2 text-xs font-mono tracking-widest mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> NEW SCAN
          </button>
          <div className="text-xs font-mono tracking-widest text-sonar-cyan uppercase mb-1">
            SONAR-AI / ANALYSIS RESULT
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-white">
              {totalDetections === 0 ? "NO OBJECTS DETECTED" : "ANALYSIS COMPLETE"}
            </h1>
          </div>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col md:items-end font-mono text-xs text-gray-400 tracking-widest">
          <div className="mb-1">SCAN ID: <span className="text-white">{result.scan_id}</span></div>
          <div>STATUS: <span className="text-sonar-cyan">SAVED TO DATABASE</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SIDE: Image Viewer */}
        <div className="lg:col-span-8 space-y-6 flex flex-col h-full">
          
          {/* Main Visualizer */}
          <div className="glass-panel p-2 flex-1 flex flex-col min-h-[500px] relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <SonarDetectionViewer 
              imageUrl={imagePreview} 
              detections={detections}
              activeIndex={activeDetectionIdx}
              onHover={setActiveDetectionIdx}
            />
            
            {/* Small status overlay */}
            <div className="absolute bottom-6 right-6 px-3 py-1 bg-black/60 border border-sonar-border text-[10px] font-mono tracking-widest text-sonar-cyan backdrop-blur-md rounded flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sonar-cyan animate-pulse"></span>
              YOLO DETECTION OVERLAY
            </div>
          </div>
          
        </div>

        {/* RIGHT SIDE: Analysis Details */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          
          <div className="glass-panel p-6 border-t-4" style={{ borderTopColor: riskLevel === 'HIGH' ? '#EF4444' : riskLevel === 'MEDIUM' ? '#F59E0B' : '#10B981' }}>
            <h3 className="text-xs font-mono tracking-widest text-gray-500 mb-6 uppercase flex items-center gap-2">
              <Activity className="w-4 h-4" /> ANALYSIS SUMMARY
            </h3>
            
            <div className="flex justify-between items-start mb-6 border-b border-sonar-border/50 pb-6">
              <div>
                <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-1">Risk Assessment</div>
                <div className={`text-3xl font-bold tracking-widest uppercase flex items-center gap-2 ${riskColor}`}>
                  {riskLevel === 'HIGH' ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                  {riskLevel}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-1">Risk Score</div>
                <div className={`text-3xl font-light font-mono ${riskColor}`}>
                  {riskScore} <span className="text-sm text-gray-600">/ 100</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-mono tracking-widest text-gray-500 uppercase">
                Detected Objects ({totalDetections})
              </h4>
              
              {totalDetections === 0 ? (
                <div className="p-4 border border-dashed border-sonar-border text-center text-sm font-mono text-gray-500 rounded">
                  NO ABNORMALITIES FOUND
                </div>
              ) : (
                <div className="space-y-3">
                  {detections.map((det, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 border rounded transition-all duration-200 cursor-pointer flex justify-between items-center
                        ${activeDetectionIdx === idx ? 'border-sonar-cyan bg-sonar-cyan/10' : 'border-sonar-border hover:border-sonar-cyan/50 hover:bg-white/5'}
                      `}
                      onMouseEnter={() => setActiveDetectionIdx(idx)}
                      onMouseLeave={() => setActiveDetectionIdx(null)}
                    >
                      <div className="flex items-center gap-3">
                        <Target className={`w-4 h-4 ${activeDetectionIdx === idx ? 'text-sonar-cyan' : 'text-gray-400'}`} />
                        <div>
                          <div className={`text-sm font-bold tracking-widest uppercase ${activeDetectionIdx === idx ? 'text-white' : 'text-gray-300'}`}>
                            {det.class_name}
                          </div>
                          <div className="text-[10px] font-mono tracking-widest text-gray-500 uppercase mt-0.5">
                            Detection Confidence
                          </div>
                        </div>
                      </div>
                      <div className={`text-lg font-mono font-light ${activeDetectionIdx === idx ? 'text-sonar-cyan' : 'text-gray-400'}`}>
                        {(det.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Scan Information Meta Panel */}
          <div className="glass-panel p-6 bg-black/40">
            <h3 className="text-xs font-mono tracking-widest text-gray-500 mb-4 uppercase">
              SCAN INFORMATION
            </h3>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-sonar-border/50 pb-2">
                <span className="text-gray-500">Scan ID</span>
                <span className="text-gray-300">{result.scan_id}</span>
              </div>
              <div className="flex justify-between border-b border-sonar-border/50 pb-2">
                <span className="text-gray-500">Date/Time</span>
                <span className="text-gray-300">{new Date(result.created_at || Date.now()).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-gray-500">AI Model</span>
                <span className="text-sonar-cyan">YOLO11n (CUDA)</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-auto pt-4">
            <button onClick={() => navigate('/history')} className="flex-1 sonar-button text-[10px] py-4 border-gray-600 text-gray-400 hover:text-white">
              VIEW HISTORY
            </button>
            <button onClick={() => navigate('/reports')} className="flex-1 sonar-button text-[10px] py-4">
              <div className="flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> REPORT
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
