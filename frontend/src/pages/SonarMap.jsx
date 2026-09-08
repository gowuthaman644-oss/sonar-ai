import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getHistory, getTracks, getTrackDetail } from '../services/api';
import { ReactFlow, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Map as MapIcon, 
  Target, 
  Scan, 
  Activity, 
  Database, 
  Crosshair, 
  AlertTriangle,
  Info,
  Layers,
  ShieldAlert,
  FileText,
  X,
  Radio,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';
import { GlassPanel, GlowButton, RiskBadge } from '../components/ui';
import SonarDetectionViewer from '../components/SonarDetectionViewer';

// Custom React Flow Node for the architecture pipeline
const PipelineNode = ({ data }) => (
  <div className={`px-3.5 py-2 border rounded-xl shadow-md font-mono text-[9px] tracking-widest uppercase flex flex-col items-center justify-center transition-all
    ${data.active ? 'bg-[rgba(32,220,197,0.15)] border-[#20DCC5] text-[#F2F7F5] shadow-[0_0_15px_rgba(32,220,197,0.25)]' : 'bg-[rgba(4,25,27,0.85)] backdrop-blur-[6px] border-[rgba(32,220,197,0.18)] text-[#A8BDB9]'}
  `}>
    <div className="flex items-center gap-2">
      <span className="text-[#20DCC5]">{data.icon}</span>
      <span>{data.label}</span>
    </div>
  </div>
);

const nodeTypes = { pipeline: PipelineNode };

const initialNodes = [
  { id: '1', type: 'pipeline', position: { x: 0, y: 10 }, data: { label: 'SONAR FEED', icon: <Database className="w-3.5 h-3.5" />, active: true } },
  { id: '2', type: 'pipeline', position: { x: 150, y: 10 }, data: { label: 'PREPROCESS', icon: <Activity className="w-3.5 h-3.5" />, active: true } },
  { id: '3', type: 'pipeline', position: { x: 300, y: 10 }, data: { label: 'YOLO11N INFERENCE', icon: <Scan className="w-3.5 h-3.5" />, active: true } },
  { id: '4', type: 'pipeline', position: { x: 480, y: 10 }, data: { label: 'ACOUSTIC EVIDENCE', icon: <Target className="w-3.5 h-3.5" />, active: true } },
  { id: '5', type: 'pipeline', position: { x: 670, y: 10 }, data: { label: 'UNCERTAINTY & RISK', icon: <ShieldAlert className="w-3.5 h-3.5" />, active: true } },
  { id: '6', type: 'pipeline', position: { x: 870, y: 10 }, data: { label: 'EVIDENCE FUSION', icon: <AlertTriangle className="w-3.5 h-3.5" />, active: true } },
  { id: '7', type: 'pipeline', position: { x: 1040, y: 10 }, data: { label: 'SQLITE STORE', icon: <Database className="w-3.5 h-3.5" />, active: true } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1.5 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1.5 } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1.5 } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1.5 } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1.5 } },
  { id: 'e6-7', source: '6', target: '7', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1.5 } },
];

export default function SonarMap() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Data selection
  const [selectedScanIdx, setSelectedScanIdx] = useState(0);
  const [activeDetectionIdx, setActiveDetectionIdx] = useState(null);

  // Persistent Contact Tracking States
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [selectedTrackDetail, setSelectedTrackDetail] = useState(null);
  const [trackDetailLoading, setTrackDetailLoading] = useState(false);
  const [activeObservationIdx, setActiveObservationIdx] = useState(0);

  const fetchHistory = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getHistory();
      setHistory(data || []);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracks = async () => {
    try {
      const data = await getTracks();
      setTracks(data || []);
    } catch (err) {
      console.error("Failed to load tracks for spatial viewer:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchTracks();
  }, []);

  useEffect(() => {
    if (selectedTrackId) {
      setTrackDetailLoading(true);
      getTrackDetail(selectedTrackId)
        .then(data => {
          setSelectedTrackDetail(data);
          setActiveObservationIdx(0);
        })
        .catch(err => {
          console.error("Failed to load track detail:", err);
          setSelectedTrackDetail(null);
        })
        .finally(() => setTrackDetailLoading(false));
    } else {
      setSelectedTrackDetail(null);
    }
  }, [selectedTrackId]);

  const currentScan = history.length > 0 ? history[selectedScanIdx] : null;
  const activeDetection = currentScan?.detections ? currentScan.detections[activeDetectionIdx] : null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 font-mono">
        <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#F2F7F5] uppercase">SURVEY DATA CONNECTION FAILURE</h2>
        <GlowButton onClick={fetchHistory} className="px-8 py-3">RETRY CONNECTION</GlowButton>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 font-mono">
        <div className="w-12 h-12 border-2 border-[#20DCC5] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(32,220,197,0.4)]" />
        <h2 className="text-xs tracking-[0.25em] text-[#20DCC5] uppercase animate-pulse">LOADING SPATIAL INTELLIGENCE...</h2>
        <p className="text-[9px] tracking-widest text-[#607874] uppercase">INITIALIZING IMAGE-PLANE TELEMETRY WORKSTATION</p>
      </div>
    );
  }

  if (!currentScan) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 font-mono">
        <MapIcon className="w-14 h-14 text-[#607874] mb-2 opacity-50" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#A8BDB9] uppercase">NO SURVEY DATA AVAILABLE</h2>
        <p className="text-xs tracking-widest text-[#607874] uppercase">Run a sonar scan analysis to populate spatial intelligence.</p>
        <GlowButton onClick={() => navigate('/scan')} className="px-6 py-2.5">NEW SCAN</GlowButton>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 h-full flex flex-col font-sans max-w-[1680px] mx-auto pb-6">
      
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[rgba(32,220,197,0.18)] pb-5 mb-1 gap-4">
        <div>
          <div className="flex items-center gap-3.5 mb-2">
            <div className="h-10 w-10 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(32,220,197,0.2)]">
              <MapIcon className="w-5 h-5 text-[#20DCC5]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-[0.15em] uppercase text-[#F2F7F5]">
              SPATIAL INTELLIGENCE
            </h1>
          </div>
          <p className="text-[#A8BDB9] font-mono text-[10px] tracking-[0.25em] uppercase ml-14">
            SURVEY VISUALIZATION // IMAGE-PLANE TELEMETRY WORKSTATION
          </p>
        </div>

        <div className="flex gap-2.5 font-mono text-[10px] tracking-widest uppercase">
          <button 
            onClick={() => navigate('/history')}
            className="px-4 py-2.5 border border-[rgba(32,220,197,0.22)] bg-[rgba(4,25,27,0.85)] text-[#A8BDB9] hover:text-[#F2F7F5] hover:border-[#20DCC5]/50 rounded-xl transition-all"
          >
            MISSION ARCHIVE
          </button>
          <GlowButton 
            primary
            onClick={() => navigate(`/results/${currentScan.scan_id}`)}
            className="px-5 py-2.5 flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" /> FULL DOSSIER
          </GlowButton>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
        
        {/* LEFT/CENTER: SPATIAL VIEWER & PIPELINE (8 Cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col gap-5 h-full min-h-[500px]">
          
          {/* Main Visualizer */}
          <GlassPanel className="p-0 flex flex-col border border-[rgba(32,220,197,0.22)] rounded-2xl overflow-hidden flex-1 shadow-[0_4px_30px_rgba(0,0,0,0.5)]" borderTop>
            <div className="p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50 flex justify-between items-center z-20">
              <h3 className="text-xs font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2 font-bold">
                <Target className="w-4 h-4 text-[#20DCC5]" />
                {selectedTrackDetail && selectedTrackDetail.observations?.length > 0
                  ? `PERSISTENT TRACK: ${selectedTrackDetail.track_id} (${selectedTrackDetail.class_name})`
                  : 'IMAGE-PLANE SURVEY WORKSTATION'}
              </h3>
              <div className="flex items-center gap-2">
                {selectedTrackDetail && selectedTrackDetail.observations?.length > 0 ? (
                  <>
                    <div className="text-[9px] font-mono tracking-widest text-[#20DCC5] border border-[#20DCC5]/30 bg-[#20DCC5]/10 px-2.5 py-1 rounded-lg">
                      OBSERVATION {activeObservationIdx + 1} OF {selectedTrackDetail.observations.length}
                    </div>
                    <button
                      onClick={() => setSelectedTrackId(null)}
                      className="text-[8px] font-mono text-[#A8BDB9] hover:text-[#F2F7F5] border border-[rgba(32,220,197,0.2)] px-2.5 py-1 rounded-lg bg-black/40 uppercase transition-colors"
                    >
                      EXIT TRACK
                    </button>
                  </>
                ) : (
                  <div className="text-[9px] font-mono tracking-widest text-[#20DCC5] border border-[#20DCC5]/30 bg-[#20DCC5]/10 px-2.5 py-1 rounded-lg font-bold">
                    SCAN: {currentScan.scan_id}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 relative bg-[rgba(1,12,15,0.72)] p-4 flex flex-col">
              <div className="flex-1 rounded-xl border border-[rgba(32,220,197,0.18)] overflow-hidden bg-[#02090B]">
                {/* Embedded Viewer: Active Persistent Track observation detection or survey scan detections */}
                {selectedTrackDetail && selectedTrackDetail.observations && selectedTrackDetail.observations[activeObservationIdx] ? (
                  <SonarDetectionViewer 
                    imageUrl={selectedTrackDetail.observations[activeObservationIdx].image_url || `/api/history/${selectedTrackDetail.observations[activeObservationIdx].scan_id}/image`}
                    detections={[{
                      x: selectedTrackDetail.observations[activeObservationIdx].x,
                      y: selectedTrackDetail.observations[activeObservationIdx].y,
                      width: selectedTrackDetail.observations[activeObservationIdx].width,
                      height: selectedTrackDetail.observations[activeObservationIdx].height,
                      class_name: selectedTrackDetail.observations[activeObservationIdx].class_name,
                      confidence: selectedTrackDetail.observations[activeObservationIdx].confidence
                    }]}
                    activeIndex={0}
                    onHover={() => {}}
                  />
                ) : (
                  <SonarDetectionViewer 
                    imageUrl={`/api/history/${currentScan.scan_id}/image`}
                    detections={currentScan.detections || []}
                    activeIndex={activeDetectionIdx}
                    onHover={setActiveDetectionIdx}
                  />
                )}
              </div>

              {/* IMAGE-PLANE OBSERVATION SEQUENCE STEPPER (when track selected) */}
              {selectedTrackDetail && selectedTrackDetail.observations && selectedTrackDetail.observations.length > 0 && (
                <div className="mt-3.5 p-3 rounded-xl bg-black/60 border border-[rgba(32,220,197,0.18)] flex flex-col gap-2 flex-shrink-0">
                  <div className="flex justify-between items-center text-[8px] font-mono uppercase tracking-widest">
                    <span className="text-[#607874] flex items-center gap-1.5 font-bold">
                      <Layers className="w-3.5 h-3.5 text-[#20DCC5]" /> IMAGE-PLANE TRAJECTORY SEQUENCE:
                    </span>
                    <span className="text-[#A8BDB9] italic text-[8px]">
                      Association across sonar images; not geographic movement.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                    {selectedTrackDetail.observations.map((obs, oIdx) => (
                      <React.Fragment key={obs.detection_id}>
                        <button
                          onClick={() => setActiveObservationIdx(oIdx)}
                          className={`px-3 py-1.5 rounded-lg border text-[8px] font-mono tracking-widest uppercase whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            activeObservationIdx === oIdx
                              ? 'border-[#20DCC5] bg-[#20DCC5]/20 text-[#20DCC5] font-bold shadow-[0_0_10px_rgba(32,220,197,0.2)]'
                              : 'border-[rgba(32,220,197,0.15)] bg-black/40 text-[#A8BDB9] hover:text-[#F2F7F5] hover:border-[#20DCC5]/40'
                          }`}
                        >
                          <span>OBS #{obs.observation_index}</span>
                          <span className="text-[7px] text-[#607874]">({obs.scan_id})</span>
                        </button>
                        {oIdx < selectedTrackDetail.observations.length - 1 && (
                          <span className="text-[#20DCC5] font-bold text-xs">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlassPanel>

          {/* AI Architecture Pipeline (React Flow) */}
          <GlassPanel className="p-0 flex flex-col h-[180px] border border-[rgba(32,220,197,0.22)] rounded-2xl overflow-hidden flex-shrink-0" borderTop>
            <div className="p-3 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50 flex justify-between items-center z-20">
              <h3 className="text-xs font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2 font-bold">
                <Activity className="w-3.5 h-3.5 text-[#20DCC5]" /> PROCESSING PIPELINE ARCHITECTURE
              </h3>
              <span className="text-[8px] font-mono text-[#607874] uppercase tracking-widest">REAL-TIME INFERENCE DAG</span>
            </div>
            <div className="flex-1 bg-[rgba(1,12,15,0.72)]">
              <ReactFlow 
                nodes={initialNodes} 
                edges={initialEdges} 
                nodeTypes={nodeTypes}
                proOptions={{ hideAttribution: true }}
                fitView
                fitViewOptions={{ padding: 0.4 }}
                nodesDraggable={false}
                nodesConnectable={false}
                zoomOnScroll={false}
                panOnDrag={false}
                preventScrolling={false}
                className="pointer-events-none bg-[linear-gradient(rgba(32,220,197,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(32,220,197,0.06)_1px,transparent_1px)] bg-[size:20px_20px]"
              >
                <Background gap={20} color="#20DCC5" opacity={0.04} />
              </ReactFlow>
            </div>
          </GlassPanel>

        </motion.div>

        {/* RIGHT: INTELLIGENCE PANELS (4 Cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-h-0 pr-1">
          
          {/* PERSISTENT CONTACT SELECTOR PANEL */}
          <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.22)] rounded-2xl flex flex-col overflow-hidden shadow-sm flex-shrink-0">
            <div className="p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50 flex justify-between items-center">
              <h3 className="text-xs font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2 font-bold">
                <Layers className="w-3.5 h-3.5 text-[#20DCC5]" /> PERSISTENT CONTACTS
              </h3>
              {selectedTrackId && (
                <button
                  onClick={() => setSelectedTrackId(null)}
                  className="text-[8px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 uppercase tracking-wider"
                >
                  <X className="w-3 h-3" /> CLEAR
                </button>
              )}
            </div>

            <div className="p-3.5 space-y-3 font-mono">
              {tracks.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-black/40 border border-[rgba(32,220,197,0.15)] text-[8px] text-[#607874] uppercase text-center leading-relaxed">
                  NO PERSISTENT CONTACTS
                  <div className="text-[7px] text-[#607874] mt-1">No cross-mission associations are currently available.</div>
                </div>
              ) : (
                <>
                  {/* Track Selector Dropdown / Pills */}
                  <div className="space-y-1">
                    <span className="text-[7px] text-[#607874] uppercase tracking-widest block">SELECT ACTIVE TRACK:</span>
                    <div className="grid grid-cols-2 gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar">
                      {tracks.map(trk => (
                        <button
                          key={trk.track_id}
                          onClick={() => setSelectedTrackId(selectedTrackId === trk.track_id ? null : trk.track_id)}
                          className={`p-2 rounded-lg border text-left text-[8px] uppercase tracking-wider transition-all flex flex-col ${
                            selectedTrackId === trk.track_id
                              ? 'border-[#20DCC5] bg-[#20DCC5]/20 text-[#20DCC5] font-bold'
                              : 'border-[rgba(32,220,197,0.15)] bg-black/40 text-[#A8BDB9] hover:border-[#20DCC5]/40'
                          }`}
                        >
                          <span className="font-bold text-[#20DCC5]">{trk.track_id}</span>
                          <span className="text-[7px] text-[#A8BDB9]">{trk.class_name} ({trk.observation_count} obs)</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Track Inspection Card */}
                  {selectedTrackDetail && (
                    <div className="p-3 rounded-xl bg-black/50 border border-[#20DCC5]/30 space-y-2 text-[8px]">
                      <div className="flex justify-between items-center border-b border-[rgba(32,220,197,0.15)] pb-1.5">
                        <span className="font-bold text-xs text-[#20DCC5] tracking-wider">{selectedTrackDetail.track_id}</span>
                        <span className={`px-2 py-0.5 rounded border text-[7px] font-bold uppercase ${
                          selectedTrackDetail.status === 'RECURRENT' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' :
                          selectedTrackDetail.status === 'ACTIVE' ? 'text-[#20DCC5] border-[#20DCC5]/40 bg-[#20DCC5]/10' :
                          'text-[#A8BDB9] border-gray-600 bg-gray-800/40'
                        }`}>
                          {selectedTrackDetail.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[#A8BDB9]">
                        <span className="text-[#607874]">CLASSIFICATION:</span>
                        <span className="font-bold text-[#F2F7F5] uppercase">{selectedTrackDetail.class_name}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#A8BDB9]">
                        <span className="text-[#607874]">TOTAL OBSERVATIONS:</span>
                        <span className="font-bold text-[#F2F7F5]">{selectedTrackDetail.observation_count} OBSERVATIONS</span>
                      </div>

                      {/* Active Observation Image-Plane Telemetry */}
                      {selectedTrackDetail.observations && selectedTrackDetail.observations[activeObservationIdx] && (
                        <div className="border-t border-[rgba(32,220,197,0.15)] pt-2 space-y-1.5">
                          <div className="flex justify-between text-[#607874] text-[7.5px]">
                            <span>ACTIVE OBSERVATION:</span>
                            <span className="text-[#20DCC5] font-bold">#{activeObservationIdx + 1} ({selectedTrackDetail.observations[activeObservationIdx].scan_id})</span>
                          </div>
                          
                          <div className="border border-[rgba(32,220,197,0.18)] rounded-lg overflow-hidden">
                            <div className="bg-[#0F6F70]/30 px-2 py-1 text-[7px] text-[#A8BDB9] tracking-widest uppercase">
                              NORMALIZED IMAGE-PLANE COORDS
                            </div>
                            <div className="grid grid-cols-2 gap-px bg-[#0F6F70]/60 text-[8px]">
                              <div className="bg-[rgba(4,25,27,0.85)] p-1.5 flex justify-between">
                                <span className="text-[#607874]">X_NORM:</span>
                                <span className="text-[#F2F7F5]">{selectedTrackDetail.observations[activeObservationIdx].x != null ? (selectedTrackDetail.observations[activeObservationIdx].x / 640).toFixed(3) : '—'}</span>
                              </div>
                              <div className="bg-[rgba(4,25,27,0.85)] p-1.5 flex justify-between">
                                <span className="text-[#607874]">Y_NORM:</span>
                                <span className="text-[#F2F7F5]">{selectedTrackDetail.observations[activeObservationIdx].y != null ? (selectedTrackDetail.observations[activeObservationIdx].y / 640).toFixed(3) : '—'}</span>
                              </div>
                              <div className="bg-[rgba(4,25,27,0.85)] p-1.5 flex justify-between">
                                <span className="text-[#607874]">W_NORM:</span>
                                <span className="text-[#F2F7F5]">{selectedTrackDetail.observations[activeObservationIdx].width != null ? (selectedTrackDetail.observations[activeObservationIdx].width / 640).toFixed(3) : '—'}</span>
                              </div>
                              <div className="bg-[rgba(4,25,27,0.85)] p-1.5 flex justify-between">
                                <span className="text-[#607874]">H_NORM:</span>
                                <span className="text-[#F2F7F5]">{selectedTrackDetail.observations[activeObservationIdx].height != null ? (selectedTrackDetail.observations[activeObservationIdx].height / 640).toFixed(3) : '—'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SPATIAL TELEMETRY (Scientific Integrity Disclaimer) */}
          <div className="bg-[#D6A84F]/10 border border-[#D6A84F]/30 rounded-2xl p-4 text-[9px] font-mono flex-shrink-0">
            <h3 className="text-[#D6A84F] uppercase tracking-widest flex items-center gap-2 font-bold mb-2 text-xs">
              <Info className="w-3.5 h-3.5" /> SPATIAL TELEMETRY
            </h3>
            <div className="flex justify-between uppercase tracking-widest border-b border-[#D6A84F]/20 pb-2 mb-2 text-[#A8BDB9] text-[8px]">
              <span>STATUS:</span>
              <span className="text-[#D6A84F] font-bold">IMAGE-PLANE ONLY (0.0 - 1.0)</span>
            </div>
            <p className="text-[#607874] leading-relaxed text-[8px] uppercase">
              Current dataset contains optical/acoustic image telemetry. Targets are positioned using normalized image coordinates. No global GPS mapping active.
            </p>
          </div>

          {/* Target Selection / Coordinates Panel */}
          <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.22)] rounded-2xl flex flex-col overflow-hidden transition-all duration-300 flex-shrink-0">
            <div className={`p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] flex justify-between items-center ${activeDetection ? 'bg-[#20DCC5]/10' : 'bg-black/50'}`}>
              <h3 className="text-xs font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2 font-bold">
                <Crosshair className={`w-3.5 h-3.5 ${activeDetection ? 'text-[#20DCC5]' : 'text-[#607874]'}`} /> TARGET SELECTION
              </h3>
            </div>
            <div className="p-4 bg-black/30">
              {activeDetection ? (
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] tracking-widest text-[#607874] uppercase">IDENTIFICATION</span>
                    <span className="text-base font-bold tracking-wider text-[#20DCC5] uppercase">{activeDetection.class_name}</span>
                  </div>
                  <div className="flex justify-between items-start border-t border-[rgba(32,220,197,0.15)] pt-2 text-[9px]">
                    <span className="text-[#607874] uppercase">YOLO CONF</span>
                    <span className="font-bold text-[#F2F7F5]">
                      {activeDetection.confidence != null ? `${(activeDetection.confidence * 100).toFixed(1)}%` : '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-[rgba(32,220,197,0.15)] pt-2 text-[9px]">
                    <div className="flex flex-col">
                      <span className="text-[#607874] uppercase text-[8px]">ACOUSTIC EV.</span>
                      <span className="text-[#20DCC5] font-bold">
                        {activeDetection.evidence?.evidence_score != null ? `${Number(activeDetection.evidence.evidence_score).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[#607874] uppercase text-[8px]">UNCERTAINTY</span>
                      <span className={`font-bold uppercase ${
                        activeDetection.uncertainty?.uncertainty_level === 'LOW' ? 'text-emerald-400' :
                        activeDetection.uncertainty?.uncertainty_level === 'HIGH' ? 'text-orange-400' :
                        activeDetection.uncertainty?.uncertainty_level === 'CRITICAL' ? 'text-red-400' : 'text-[#D6A84F]'
                      }`}>
                        {activeDetection.uncertainty?.uncertainty_level || 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border border-[rgba(32,220,197,0.18)] rounded-lg overflow-hidden mt-2">
                    <div className="bg-[#0F6F70]/30 px-3 py-1.5 text-[8px] text-[#A8BDB9] tracking-widest uppercase">IMAGE-PLANE COORD (PIXELS)</div>
                    <div className="grid grid-cols-2 gap-px bg-[#0F6F70]/60 text-[8px]">
                      <div className="bg-[rgba(4,25,27,0.85)] p-1.5 flex justify-between"><span className="text-[#607874]">X:</span> <span className="text-[#F2F7F5] font-bold">{activeDetection.x != null ? activeDetection.x.toFixed(1) : '—'}</span></div>
                      <div className="bg-[rgba(4,25,27,0.85)] p-1.5 flex justify-between"><span className="text-[#607874]">Y:</span> <span className="text-[#F2F7F5] font-bold">{activeDetection.y != null ? activeDetection.y.toFixed(1) : '—'}</span></div>
                      <div className="bg-[rgba(4,25,27,0.85)] p-1.5 flex justify-between"><span className="text-[#607874]">W:</span> <span className="text-[#F2F7F5] font-bold">{activeDetection.width != null ? activeDetection.width.toFixed(1) : '—'}</span></div>
                      <div className="bg-[rgba(4,25,27,0.85)] p-1.5 flex justify-between"><span className="text-[#607874]">H:</span> <span className="text-[#F2F7F5] font-bold">{activeDetection.height != null ? activeDetection.height.toFixed(1) : '—'}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center font-mono">
                  <Scan className="w-8 h-8 text-[#607874] mb-2 opacity-50" />
                  <span className="text-[9px] tracking-widest text-[#607874] uppercase">AWAITING SELECTION</span>
                  <span className="text-[8px] tracking-widest text-[#607874] mt-1 uppercase">Hover over a target on the viewer</span>
                </div>
              )}
            </div>
          </div>

          {/* Overall Risk Panel */}
          <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.22)] rounded-2xl p-4 flex-shrink-0 font-mono">
            <h3 className="text-xs tracking-widest text-[#F2F7F5] uppercase mb-3 border-b border-[rgba(32,220,197,0.18)] pb-2 flex justify-between items-center font-bold">
              <span>MISSION RISK</span>
              <RiskBadge level={currentScan.analysis?.risk_level || 'LOW'} />
            </h3>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] tracking-widest text-[#607874] uppercase">RISK SCORE</span>
              <span className="text-xl font-bold tracking-wider text-[#F2F7F5]">
                {currentScan.analysis?.risk_score != null ? currentScan.analysis.risk_score.toFixed(1) : '0.0'}
              </span>
            </div>
          </div>

          {/* Scan Switcher */}
          <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.22)] rounded-2xl flex flex-col mt-auto flex-shrink-0 overflow-hidden font-mono">
            <div className="p-3 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50">
              <h3 className="text-[9px] tracking-widest text-[#607874] uppercase font-bold">RECENT SURVEY SCANS</h3>
            </div>
            <div className="max-h-[140px] overflow-y-auto custom-scrollbar divide-y divide-[rgba(32,220,197,0.10)]">
              {history.slice(0, 5).map((scan, idx) => (
                <button
                  key={scan.scan_id}
                  onClick={() => setSelectedScanIdx(idx)}
                  className={`w-full text-left p-2.5 px-4 flex justify-between items-center transition-colors
                    ${idx === selectedScanIdx ? 'bg-[#20DCC5]/15 text-[#F2F7F5]' : 'hover:bg-white/5 text-[#A8BDB9]'}
                  `}
                >
                  <span className="text-[9px] tracking-widest uppercase truncate max-w-[130px] font-bold">{scan.scan_id}</span>
                  <span className="text-[8px] tracking-widest uppercase text-[#607874]">{new Date(scan.created_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
