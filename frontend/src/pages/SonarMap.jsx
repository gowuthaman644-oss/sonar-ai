import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../services/api';
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
  ChevronRight,
  ShieldAlert,
  Radio,
  FileText,
  Info
} from 'lucide-react';
import { GlassPanel, GlowButton, RiskBadge } from '../components/ui';
import SonarDetectionViewer from '../components/SonarDetectionViewer';

// Custom React Flow Node for the architecture pipeline
const PipelineNode = ({ data }) => (
  <div className={`px-4 py-2 border rounded shadow-md font-mono text-[9px] tracking-widest uppercase flex flex-col items-center justify-center
    ${data.active ? 'bg-[#20DCC5]/20 border-[#20DCC5] text-[#F2F7F5] shadow-[0_0_15px_rgba(40,224,196,0.3)]' : 'bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border-[rgba(32,220,197,0.18)] text-[#A8BDB9]'}
  `}>
    <div className="flex items-center gap-2">
      {data.icon}
      {data.label}
    </div>
  </div>
);

const nodeTypes = { pipeline: PipelineNode };

const initialNodes = [
  { id: '1', type: 'pipeline', position: { x: 0, y: 0 }, data: { label: 'SONAR FEED', icon: <Database className="w-3 h-3" />, active: true } },
  { id: '2', type: 'pipeline', position: { x: 170, y: 0 }, data: { label: 'PREPROCESSING', icon: <Activity className="w-3 h-3" />, active: true } },
  { id: '3', type: 'pipeline', position: { x: 350, y: 0 }, data: { label: 'YOLO11N INFERENCE', icon: <Scan className="w-3 h-3" />, active: true } },
  { id: '4', type: 'pipeline', position: { x: 530, y: 0 }, data: { label: 'RISK ENGINE', icon: <AlertTriangle className="w-3 h-3" />, active: true } },
  { id: '5', type: 'pipeline', position: { x: 690, y: 0 }, data: { label: 'SQLITE STORE', icon: <Database className="w-3 h-3" />, active: true } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1 } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1 } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1 } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#20DCC5', strokeWidth: 1 } },
];

export default function SonarMap() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Data selection
  const [selectedScanIdx, setSelectedScanIdx] = useState(0);
  const [activeDetectionIdx, setActiveDetectionIdx] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const currentScan = history.length > 0 ? history[selectedScanIdx] : null;
  const activeDetection = currentScan?.detections ? currentScan.detections[activeDetectionIdx] : null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#F2F7F5] uppercase">SURVEY DATA CONNECTION FAILURE</h2>
        <GlowButton onClick={fetchHistory} className="px-8 py-3">RETRY</GlowButton>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <Activity className="w-12 h-12 text-[#20DCC5] animate-spin" />
        <h2 className="text-[10px] font-mono tracking-[0.3em] text-[#20DCC5] uppercase">LOADING SURVEY DATA...</h2>
        <p className="text-[9px] font-mono tracking-widest text-[#607874] uppercase">INITIALIZING IMAGE-PLANE ANALYSIS...</p>
      </div>
    );
  }

  if (!currentScan) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <MapIcon className="w-12 h-12 text-[#607874] mb-4 opacity-50" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#A8BDB9] uppercase">NO SURVEY DATA AVAILABLE</h2>
        <p className="text-xs font-mono tracking-widest text-[#607874] uppercase">Complete a sonar analysis to populate the spatial intelligence view.</p>
        <GlowButton onClick={() => navigate('/scan')} className="px-6 py-2">NEW SCAN</GlowButton>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 h-full flex flex-col font-sans relative">
      
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[rgba(32,220,197,0.18)] pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-10 w-10 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded">
              <MapIcon className="w-5 h-5 text-[#20DCC5]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-[#F2F7F5] shadow-black drop-shadow-md">SPATIAL INTELLIGENCE</h1>
          </div>
          <p className="text-[#A8BDB9] font-mono text-[10px] tracking-[0.3em] uppercase ml-14">
            SURVEY VISUALIZATION / IMAGE-PLANE TELEMETRY
          </p>
        </div>

        <div className="flex gap-3 mt-4 md:mt-0 font-mono text-[9px] tracking-widest uppercase">
          <button 
            onClick={() => navigate('/history')}
            className="px-4 py-2 border border-[rgba(32,220,197,0.18)] text-[#A8BDB9] hover:text-[#F2F7F5] hover:border-[#20DCC5]/50 rounded transition-colors"
          >
            RETURN TO ARCHIVE
          </button>
          <GlowButton 
            primary
            onClick={() => navigate(`/results/${currentScan.scan_id}`)}
            className="px-4 py-2 flex items-center gap-2"
          >
            <FileText className="w-3 h-3" /> VIEW FULL REPORT
          </GlowButton>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-10">
        
        {/* LEFT/CENTER: SPATIAL VIEWER & PIPELINE */}
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col gap-6 h-full min-h-[500px]">
          
          {/* Main Visualizer */}
          <GlassPanel className="p-0 flex flex-col border border-[rgba(32,220,197,0.18)] overflow-hidden flex-1" borderTop>
            <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center z-20">
              <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Target className="w-3 h-3 text-[#20DCC5]" /> IMAGE-PLANE SURVEY VIEW
              </h3>
              <div className="text-[9px] font-mono tracking-widest text-[#20DCC5] border border-[#20DCC5]/30 bg-[#20DCC5]/10 px-2 py-1 rounded">
                SCAN ID: {currentScan.scan_id}
              </div>
            </div>

            <div className="flex-1 relative bg-[rgba(1,12,15,0.72)] p-4 flex flex-col">
              <div className="flex-1 rounded border border-[rgba(32,220,197,0.18)] overflow-hidden bg-[#02090B]">
                {/* Embedded Viewer. Handled via hover active states */}
                <SonarDetectionViewer 
                  imageUrl={`/api/history/${currentScan.scan_id}/image`}
                  detections={currentScan.detections || []}
                  activeIndex={activeDetectionIdx}
                  onHover={setActiveDetectionIdx}
                />
              </div>
            </div>
          </GlassPanel>

          {/* AI Architecture Pipeline (React Flow) */}
          <GlassPanel className="p-0 flex flex-col h-[180px] border border-[rgba(32,220,197,0.18)] overflow-hidden flex-shrink-0">
             <div className="p-3 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center z-20">
              <h3 className="text-[10px] font-mono tracking-widest text-[#A8BDB9] uppercase flex items-center gap-2">
                <Activity className="w-3 h-3 text-[#20DCC5]" /> PROCESSING PIPELINE ARCHITECTURE
              </h3>
            </div>
            <div className="flex-1 bg-[rgba(1,12,15,0.72)]">
              <ReactFlow 
                nodes={initialNodes} 
                edges={initialEdges} 
                nodeTypes={nodeTypes}
                proOptions={{ hideAttribution: true }}
                fitView
                fitViewOptions={{ padding: 0.5 }}
                nodesDraggable={false}
                nodesConnectable={false}
                zoomOnScroll={false}
                panOnDrag={false}
                preventScrolling={false}
                className="pointer-events-none bg-[linear-gradient(rgba(32,220,197,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(32,220,197,0.07)_1px,transparent_1px)] bg-[size:20px_20px]"
              >
                <Background gap={20} color="#20DCC5" opacity={0.05} />
              </ReactFlow>
            </div>
          </GlassPanel>

        </motion.div>

        {/* RIGHT: INTELLIGENCE PANELS */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar min-h-0 pr-1">
          
          {/* Target Class Legend */}
          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded p-4 flex gap-4 text-[9px] font-mono tracking-widest uppercase flex-shrink-0">
             <div className="flex items-center gap-2 text-[#A8BDB9]"><Target className="w-3 h-3 text-[#607874]" /> WRECK</div>
             <div className="flex items-center gap-2 text-[#A8BDB9]"><Target className="w-3 h-3 text-[#607874]" /> MINE</div>
             <div className="flex items-center gap-2 text-[#A8BDB9]"><Target className="w-3 h-3 text-[#607874]" /> VICTIM</div>
             <div className="flex items-center gap-2 text-[#A8BDB9]"><Target className="w-3 h-3 text-[#607874]" /> PLANE</div>
          </div>

          {/* SPATIAL TELEMETRY (Honest Disclaimer) */}
          <div className="bg-[#D6A84F]/10 border border-[#D6A84F]/30 rounded p-4 text-[10px] font-mono flex-shrink-0">
            <h3 className="text-[#D6A84F] uppercase tracking-widest flex items-center gap-2 font-bold mb-2">
              <Info className="w-3 h-3" /> SPATIAL TELEMETRY
            </h3>
            <div className="flex justify-between uppercase tracking-widest border-b border-[#D6A84F]/20 pb-2 mb-2 text-[#A8BDB9]">
              <span>STATUS:</span>
              <span className="text-[#D6A84F] font-bold">IMAGE-PLANE ONLY</span>
            </div>
            <p className="text-[#607874] leading-relaxed text-[9px] tracking-wider uppercase">
              Current dataset does not contain geospatial telemetry. Targets are represented using native image-plane coordinates. No global GPS mapping active.
            </p>
          </div>

          {/* Target Selection / Coordinates Panel */}
          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded flex flex-col overflow-hidden transition-colors duration-300 flex-shrink-0">
            <div className={`p-3 border-b border-[rgba(32,220,197,0.18)] flex justify-between items-center transition-colors ${activeDetection ? 'bg-[#20DCC5]/10' : 'bg-black/40'}`}>
              <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Crosshair className={`w-3 h-3 ${activeDetection ? 'text-[#20DCC5]' : 'text-[#607874]'}`} /> TARGET SELECTION
              </h3>
            </div>
            <div className="p-4 bg-black/20">
              {activeDetection ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono tracking-widest text-[#607874] uppercase">IDENTIFICATION</span>
                    <span className="text-lg font-bold font-mono tracking-widest text-[#20DCC5] uppercase">{activeDetection.class_name}</span>
                  </div>
                  <div className="flex justify-between items-start border-t border-[rgba(32,220,197,0.18)]/50 pt-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#607874] uppercase">CONFIDENCE</span>
                    <span className="text-sm font-bold font-mono tracking-widest text-[#F2F7F5] uppercase">{(activeDetection.confidence * 100).toFixed(1)}%</span>
                  </div>
                  
                  <div className="border border-[rgba(32,220,197,0.18)] rounded overflow-hidden">
                    <div className="bg-[#0F6F70]/30 px-3 py-1.5 text-[8px] font-mono text-[#A8BDB9] tracking-[0.2em] uppercase">IMAGE-PLANE COORDINATES</div>
                    <div className="grid grid-cols-2 gap-px bg-[#0F6F70]">
                      <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] p-2 flex justify-between"><span className="text-[9px] font-mono text-[#607874]">X:</span> <span className="text-[10px] font-mono text-[#F2F7F5]">{activeDetection.x.toFixed(1)}</span></div>
                      <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] p-2 flex justify-between"><span className="text-[9px] font-mono text-[#607874]">Y:</span> <span className="text-[10px] font-mono text-[#F2F7F5]">{activeDetection.y.toFixed(1)}</span></div>
                      <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] p-2 flex justify-between"><span className="text-[9px] font-mono text-[#607874]">W:</span> <span className="text-[10px] font-mono text-[#F2F7F5]">{activeDetection.width.toFixed(1)}</span></div>
                      <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] p-2 flex justify-between"><span className="text-[9px] font-mono text-[#607874]">H:</span> <span className="text-[10px] font-mono text-[#F2F7F5]">{activeDetection.height.toFixed(1)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Scan className="w-8 h-8 text-[#607874] mb-2 opacity-50" />
                  <span className="text-[9px] font-mono tracking-widest text-[#607874] uppercase">AWAITING SELECTION</span>
                  <span className="text-[8px] font-mono tracking-widest text-[#607874] mt-1 uppercase">Hover over a target bounding box</span>
                </div>
              )}
            </div>
          </div>

          {/* Overall Risk Panel */}
          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded p-4 flex-shrink-0">
            <h3 className="text-[10px] font-mono tracking-widest text-[#A8BDB9] uppercase mb-4 border-b border-[rgba(32,220,197,0.18)] pb-2 flex justify-between">
              MISSION RISK <RiskBadge level={currentScan.analysis?.risk_level || 'LOW'} />
            </h3>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-mono tracking-widest text-[#607874] uppercase">RISK SCORE</span>
              <span className="text-xl font-bold font-mono tracking-wider text-[#F2F7F5]">
                {currentScan.analysis?.risk_score?.toFixed(1) || '0.0'}
              </span>
            </div>
            <div className="text-[9px] font-mono tracking-widest text-[#607874] uppercase border-t border-[rgba(32,220,197,0.18)] pt-3">
              {currentScan.analysis?.explanation || 'Threat assessed natively via Risk Engine.'}
            </div>
          </div>

          {/* Scan Switcher */}
          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded flex flex-col mt-auto flex-shrink-0">
            <div className="p-3 border-b border-[rgba(32,220,197,0.18)] bg-black/40">
              <h3 className="text-[9px] font-mono tracking-widest text-[#607874] uppercase">PREVIOUS SCANS</h3>
            </div>
            <div className="max-h-[120px] overflow-y-auto custom-scrollbar divide-y divide-[#0F6F70]/50">
              {history.slice(0, 5).map((scan, idx) => (
                <button
                  key={scan.scan_id}
                  onClick={() => setSelectedScanIdx(idx)}
                  className={`w-full text-left p-3 flex justify-between items-center transition-colors
                    ${idx === selectedScanIdx ? 'bg-[#20DCC5]/10 text-[#F2F7F5]' : 'hover:bg-white/5 text-[#A8BDB9]'}
                  `}
                >
                  <span className="text-[9px] font-mono tracking-widest uppercase truncate max-w-[120px]">{scan.scan_id}</span>
                  <span className="text-[8px] font-mono tracking-widest uppercase text-[#607874]">{new Date(scan.created_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
