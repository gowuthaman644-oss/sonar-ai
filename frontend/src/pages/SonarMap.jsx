import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Map as MapIcon, Lock, AlertCircle, Target, Scan, Activity, Database, Crosshair, ChevronRight, Info } from 'lucide-react';
import { GlassPanel, SectionHeader, RiskBadge } from '../components/ui';
import { getHistory } from '../services/api';
import * as d3 from 'd3';
import { ReactFlow, Background, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom React Flow Node for the pipeline
const PipelineNode = ({ data }) => (
  <div className={`px-4 py-2 border rounded shadow-md font-mono text-[9px] tracking-widest uppercase flex flex-col items-center justify-center
    ${data.active ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-white shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-[#050B14] border-[#1A2C42] text-gray-400'}
  `}>
    <div className="flex items-center gap-2">
      {data.icon}
      {data.label}
    </div>
  </div>
);

const nodeTypes = { pipeline: PipelineNode };

const initialNodes = [
  { id: '1', type: 'pipeline', position: { x: 0, y: 0 }, data: { label: 'SONAR IMAGE', icon: <Database className="w-3 h-3" />, active: true } },
  { id: '2', type: 'pipeline', position: { x: 0, y: 80 }, data: { label: 'PREPROCESSING', icon: <Activity className="w-3 h-3" />, active: true } },
  { id: '3', type: 'pipeline', position: { x: 0, y: 160 }, data: { label: 'YOLO11n CORE', icon: <Scan className="w-3 h-3" />, active: true } },
  { id: '4', type: 'pipeline', position: { x: 0, y: 240 }, data: { label: 'DETECTIONS', icon: <Target className="w-3 h-3" />, active: true } },
  { id: '5', type: 'pipeline', position: { x: 0, y: 320 }, data: { label: 'RISK ENGINE', icon: <AlertCircle className="w-3 h-3" />, active: true } },
  { id: '6', type: 'pipeline', position: { x: 0, y: 400 }, data: { label: 'INTELLIGENCE', icon: <MapIcon className="w-3 h-3" />, active: true } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
];

export default function SonarMap() {
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDetection, setActiveDetection] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const history = await getHistory();
        if (history && history.length > 0) {
          setScan(history[0]);
        }
      } catch (e) {
        console.error("Failed to load history for map", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // D3 Radar Effect
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.max(cx, cy);

    // Rings
    const rings = [0.2, 0.4, 0.6, 0.8, 1.0];
    rings.forEach(r => {
      svg.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", maxRadius * r)
        .style("fill", "none")
        .style("stroke", "#00F0FF")
        .style("stroke-width", 0.5)
        .style("stroke-opacity", 0.2)
        .style("stroke-dasharray", "4,4");
    });

    // Crosshairs
    svg.append("line").attr("x1", cx).attr("y1", 0).attr("x2", cx).attr("y2", height).style("stroke", "#00F0FF").style("stroke-width", 0.5).style("stroke-opacity", 0.2);
    svg.append("line").attr("x1", 0).attr("y1", cy).attr("x2", width).attr("y2", cy).style("stroke", "#00F0FF").style("stroke-width", 0.5).style("stroke-opacity", 0.2);
  }, [scan]);

  const handleImageLoad = (e) => {
    setNaturalSize({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
    setImageLoaded(true);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5, staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!scan) {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1400px] mx-auto pt-10">
        <GlassPanel className="p-12 text-center border-[#1A2C42]">
          <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-mono tracking-widest text-white uppercase mb-2">NO SCANS AVAILABLE</h2>
          <p className="text-xs font-mono text-gray-500 uppercase">AWAITING DATA UPLOAD TO INITIALIZE MAPPING PROTOCOL</p>
        </GlassPanel>
      </motion.div>
    );
  }

  const detections = scan.detections || [];
  const imageUrl = `/api/history/${scan.scan_id}/image`;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1600px] mx-auto h-full flex flex-col pb-4">
      
      {/* HEADER */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1A2C42] pb-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.2em] uppercase text-white drop-shadow-md">SURVEY VISUALIZATION</h1>
          <p className="text-[#00F0FF] font-mono text-[9px] tracking-[0.3em] uppercase mt-1">
            IMAGE-PLANE INTELLIGENCE PROTOCOLS
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col md:items-end font-mono text-[9px] tracking-[0.2em] uppercase">
          <div className="text-gray-500 mb-1">SCAN ID // <span className="text-white font-bold">{scan.scan_id}</span></div>
          <div className="text-gray-500">MAPPING // <span className="text-[#00F0FF] font-bold">LOCAL SPACE</span></div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        
        {/* LEFT / CENTER: MAIN VISUALIZATION */}
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col min-h-[50vh]">
          <GlassPanel className="p-1 flex-1 relative flex overflow-hidden border-t-2 border-t-[#00F0FF]/30">
            
            {/* D3 Background Overlay */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <svg ref={svgRef} className="w-full h-full" />
            </div>

            {/* Radar Scan Line */}
            <motion.div 
              animate={{ left: ['-10%', '110%', '-10%'] }}
              transition={{ duration: 8, ease: "linear", repeat: Infinity }}
              className="absolute top-0 bottom-0 w-[2px] bg-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,1)] opacity-20 pointer-events-none z-20"
            />

            <div className="relative w-full h-full bg-transparent flex items-center justify-center p-4 z-10 overflow-hidden">
              <div className="relative max-w-full max-h-full inline-block shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#1A2C42] bg-black/40">
                
                <img 
                  src={imageUrl} 
                  alt="Sonar Analysis" 
                  onLoad={handleImageLoad}
                  onError={(e) => console.error("MAP IMAGE LOAD FAILED", e.currentTarget.src)}
                  className={`max-w-full max-h-[65vh] object-contain transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Bounding Boxes */}
                <AnimatePresence>
                  {imageLoaded && naturalSize.width > 0 && detections.map((det, idx) => {
                    const pctLeft = (det.x / naturalSize.width) * 100;
                    const pctTop = (det.y / naturalSize.height) * 100;
                    const pctWidth = (det.width / naturalSize.width) * 100;
                    const pctHeight = (det.height / naturalSize.height) * 100;
                    const isActive = activeDetection === idx;

                    return (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`absolute border transition-all duration-300 cursor-crosshair group flex items-start
                          ${isActive ? 'border-[#00F0FF] bg-[#00F0FF]/30 z-30 shadow-[0_0_15px_rgba(0,240,255,0.5)]' : 'border-[#00F0FF]/40 hover:border-[#00F0FF] hover:bg-[#00F0FF]/20 z-20'}
                        `}
                        style={{
                          left: `${pctLeft}%`,
                          top: `${pctTop}%`,
                          width: `${pctWidth}%`,
                          height: `${pctHeight}%`
                        }}
                        onClick={() => setActiveDetection(isActive ? null : idx)}
                      >
                        <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-[#00F0FF]" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-[#00F0FF]" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-[#00F0FF]" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-[#00F0FF]" />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

              </div>
            </div>

            {/* Top Overlay Meta */}
            <div className="absolute top-4 left-4 flex flex-col gap-1 pointer-events-none z-30">
              <span className="text-[8px] font-mono tracking-[0.3em] text-[#00F0FF]/70 uppercase">IMAGE-PLANE INTELLIGENCE</span>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-white uppercase flex items-center gap-2">
                <Target className="w-3 h-3 text-[#00F0FF]" /> ACTIVE VIEW
              </span>
            </div>

          </GlassPanel>
        </motion.div>

        {/* RIGHT SIDE: TELEMETRY & PIPELINE */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-6">
          
          {/* Geospatial Status */}
          <GlassPanel className="p-4 border-[#1A2C42]">
            <SectionHeader icon={Compass} title="GEOSPATIAL TELEMETRY" />
            
            <div className="space-y-3 mt-4">
              <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-[#1A2C42]">
                <span className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase">STATUS</span>
                <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-amber-500 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" /> UNAVAILABLE
                </span>
              </div>
              <div className="flex justify-between items-center bg-black/40 p-2 rounded border border-[#1A2C42]">
                <span className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase">GPS FEED</span>
                <span className="text-[9px] font-mono tracking-[0.2em] text-gray-400">NOT PROVIDED</span>
              </div>
              <div className="flex justify-between items-center bg-[#00F0FF]/5 p-2 rounded border border-[#00F0FF]/20">
                <span className="text-[9px] font-mono tracking-[0.2em] text-[#00F0FF] uppercase">IMAGE-PLANE</span>
                <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#00F0FF] flex items-center gap-2">
                  <Scan className="w-3 h-3" /> ACTIVE
                </span>
              </div>
            </div>
            
            <p className="text-[9px] font-mono text-gray-500 tracking-widest leading-relaxed mt-4 border-t border-[#1A2C42] pt-4 text-justify">
              The current dataset does not contain geographic telemetry. YOLO11n detections are available in the image plane. Geographic mapping requires GPS/AUV/USV telemetry.
            </p>
          </GlassPanel>

          {/* Interactive Detection Detail */}
          <GlassPanel className={`p-4 transition-all duration-300 ${activeDetection !== null ? 'border-[#00F0FF]/50 bg-[#00F0FF]/5' : 'border-[#1A2C42]'}`}>
            <SectionHeader icon={Crosshair} title="TARGET DETAILS" />
            
            {activeDetection !== null && detections[activeDetection] ? (
              <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                <div className="flex justify-between items-center border-b border-[#1A2C42] pb-2">
                  <span className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase">CLASS</span>
                  <span className="text-xs font-mono font-bold tracking-[0.2em] text-white uppercase">{detections[activeDetection].class_name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1A2C42] pb-2">
                  <span className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase">CONFIDENCE</span>
                  <span className="text-xs font-mono font-bold tracking-[0.2em] text-[#00F0FF]">{(detections[activeDetection].confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-black/40 p-2 rounded border border-[#1A2C42]">
                    <div className="text-[8px] font-mono text-gray-500 tracking-widest mb-1">X POS</div>
                    <div className="text-[10px] font-mono text-gray-300">{detections[activeDetection].x.toFixed(1)}</div>
                  </div>
                  <div className="bg-black/40 p-2 rounded border border-[#1A2C42]">
                    <div className="text-[8px] font-mono text-gray-500 tracking-widest mb-1">Y POS</div>
                    <div className="text-[10px] font-mono text-gray-300">{detections[activeDetection].y.toFixed(1)}</div>
                  </div>
                  <div className="bg-black/40 p-2 rounded border border-[#1A2C42]">
                    <div className="text-[8px] font-mono text-gray-500 tracking-widest mb-1">WIDTH</div>
                    <div className="text-[10px] font-mono text-gray-300">{detections[activeDetection].width.toFixed(1)}</div>
                  </div>
                  <div className="bg-black/40 p-2 rounded border border-[#1A2C42]">
                    <div className="text-[8px] font-mono text-gray-500 tracking-widest mb-1">HEIGHT</div>
                    <div className="text-[10px] font-mono text-gray-300">{detections[activeDetection].height.toFixed(1)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-6 border border-dashed border-[#1A2C42] rounded text-center flex flex-col items-center justify-center opacity-50">
                <Target className="w-6 h-6 text-gray-500 mb-2" />
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">SELECT TARGET IN VIEWER</span>
              </div>
            )}
          </GlassPanel>

          {/* Detections Summary */}
          <GlassPanel className="p-4 border-[#1A2C42]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-mono tracking-[0.2em] text-gray-400 uppercase flex items-center gap-2">
                <Target className="w-3 h-3" /> DETECTIONS
              </h3>
              <span className="text-[10px] font-mono font-bold text-[#00F0FF]">{detections.length}</span>
            </div>
            
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
              {detections.length === 0 ? (
                <div className="text-[9px] font-mono text-gray-500 text-center py-4 tracking-widest">NO TARGETS FOUND</div>
              ) : (
                detections.map((det, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setActiveDetection(idx)}
                    className={`flex justify-between items-center p-2 rounded border cursor-pointer transition-all duration-200
                      ${activeDetection === idx ? 'border-[#00F0FF] bg-[#00F0FF]/10' : 'border-[#1A2C42] bg-black/40 hover:border-[#00F0FF]/30'}
                    `}
                  >
                    <span className={`text-[9px] font-mono font-bold tracking-widest uppercase ${activeDetection === idx ? 'text-white' : 'text-gray-400'}`}>
                      {det.class_name}
                    </span>
                    <span className={`text-[9px] font-mono tracking-widest ${activeDetection === idx ? 'text-[#00F0FF]' : 'text-gray-500'}`}>
                      {(det.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </GlassPanel>

          {/* React Flow Pipeline */}
          <GlassPanel className="p-4 border-[#1A2C42] flex flex-col">
            <SectionHeader icon={Activity} title="AI ANALYSIS PIPELINE" />
            <div className="h-[200px] w-full mt-2 rounded border border-[#1A2C42] overflow-hidden bg-black/40 relative pointer-events-none">
               <ReactFlow 
                 nodes={initialNodes} 
                 edges={initialEdges} 
                 nodeTypes={nodeTypes}
                 fitView
                 proOptions={{ hideAttribution: true }}
                 zoomOnScroll={false}
                 panOnDrag={false}
                 nodesDraggable={false}
                 nodesConnectable={false}
                 elementsSelectable={false}
               >
                 <Background color="#1A2C42" gap={10} size={1} />
               </ReactFlow>
            </div>
          </GlassPanel>

        </motion.div>
      </div>
    </motion.div>
  );
}
