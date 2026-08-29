import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory } from '../services/api';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { ReactFlow, Background, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Database, Target, AlertTriangle, Activity, Lock, Scan, Map as MapIcon, ChevronRight, BarChart2 } from 'lucide-react';
import { GlassPanel, SectionHeader, RiskBadge } from '../components/ui';

// React Flow Pipeline Nodes
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
  { id: '2', type: 'pipeline', position: { x: 180, y: 0 }, data: { label: 'YOLO11n', icon: <Scan className="w-3 h-3" />, active: true } },
  { id: '3', type: 'pipeline', position: { x: 330, y: 0 }, data: { label: 'DETECTIONS', icon: <Target className="w-3 h-3" />, active: true } },
  { id: '4', type: 'pipeline', position: { x: 500, y: 0 }, data: { label: 'RISK ENGINE', icon: <AlertTriangle className="w-3 h-3" />, active: true } },
  { id: '5', type: 'pipeline', position: { x: 680, y: 0 }, data: { label: 'DATABASE', icon: <Database className="w-3 h-3" />, active: true } },
  { id: '6', type: 'pipeline', position: { x: 850, y: 0 }, data: { label: 'INTELLIGENCE', icon: <BarChart2 className="w-3 h-3" />, active: true } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#00F0FF' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#00F0FF' } },
];

// D3 Line Chart Component
const D3TrendChart = ({ data }) => {
  const svgRef = useRef();
  
  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const parent = svg.node().parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    
    svg.attr("width", width).attr("height", height);

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
      .domain(d3.extent(data, d => new Date(d.timestamp)))
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 10])
      .range([innerHeight, 0]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-innerHeight).tickFormat(''))
      .selectAll("line").style("stroke", "#1A2C42").style("stroke-dasharray", "2,2");

    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(''))
      .selectAll("line").style("stroke", "#1A2C42").style("stroke-dasharray", "2,2");

    // Axes
    const xAxisFormat = d3.timeFormat("%H:%M");
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(xAxisFormat))
      .selectAll("text").style("fill", "#6B7280").style("font-family", "monospace").style("font-size", "9px");
      
    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text").style("fill", "#6B7280").style("font-family", "monospace").style("font-size", "9px");
      
    g.selectAll(".domain").style("stroke", "#1A2C42");

    // Line (only draw if > 1 point)
    if (data.length > 1) {
      const line = d3.line()
        .x(d => x(new Date(d.timestamp)))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);

      const path = g.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#00F0FF")
        .attr("stroke-width", 2)
        .attr("d", line);

      const totalLength = path.node().getTotalLength();

      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(1000)
        .attr("stroke-dashoffset", 0);

      // Area
      const area = d3.area()
        .x(d => x(new Date(d.timestamp)))
        .y0(innerHeight)
        .y1(d => y(d.count))
        .curve(d3.curveMonotoneX);

      g.append("path")
        .datum(data)
        .attr("fill", "url(#area-gradient)")
        .attr("d", area)
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 1);
    }

    // Gradient
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "area-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#00F0FF").attr("stop-opacity", 0.2);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#00F0FF").attr("stop-opacity", 0);

    // Points
    const tooltip = d3.select("body").append("div")
      .attr("class", "absolute hidden bg-[#050B14] border border-[#00F0FF]/50 p-3 text-xs font-mono text-white pointer-events-none z-50 shadow-[0_0_15px_rgba(0,240,255,0.3)]")
      .style("border-radius", "4px")
      .style("min-width", "180px");

    g.selectAll(".dot")
      .data(data)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(new Date(d.timestamp)))
      .attr("cy", d => y(d.count))
      .attr("r", 4)
      .attr("fill", "#050B14")
      .attr("stroke", "#00F0FF")
      .attr("stroke-width", 2)
      .style("cursor", "crosshair")
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget).attr("r", 6).attr("fill", "#00F0FF");
        
        const timeStr = new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const confStr = d.topConfidence ? `${(d.topConfidence * 100).toFixed(1)}%` : 'N/A';
        const riskColor = d.riskLevel === 'CRITICAL' ? '#EF4444' : 
                          d.riskLevel === 'HIGH' ? '#F97316' : 
                          d.riskLevel === 'MEDIUM' ? '#F59E0B' : '#22C55E';
                          
        tooltip.classed("hidden", false)
          .html(`
            <div class="font-bold text-[#00F0FF] border-b border-[#1A2C42] pb-1 mb-2">${d.scan_id}</div>
            <div class="flex justify-between mb-1"><span class="text-gray-500">TIME:</span> <span>${timeStr}</span></div>
            <div class="flex justify-between mb-1"><span class="text-gray-500">DETECTS:</span> <span>${d.count}</span></div>
            <div class="flex justify-between mb-1"><span class="text-gray-500">TARGET:</span> <span>${d.topClass}</span></div>
            <div class="flex justify-between mb-1"><span class="text-gray-500">CONF:</span> <span>${confStr}</span></div>
            <div class="flex justify-between"><span class="text-gray-500">RISK:</span> <span style="color: ${riskColor}">${d.riskLevel}</span></div>
          `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 40) + "px");
      })
      .on("mouseout", (event) => {
        d3.select(event.currentTarget).attr("r", 4).attr("fill", "#050B14");
        tooltip.classed("hidden", true);
      });
      
    // Cleanup tooltip on unmount
    return () => tooltip.remove();

  }, [data]);

  return <svg ref={svgRef} className="w-full h-full" />;
};

export default function Analytics() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const h = await getHistory();
        setHistory(h || []);
      } catch (err) {
        console.error("Failed to load telemetry", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute Metrics
  const totalScans = history.length;
  let totalTargets = 0;
  let highRiskScans = 0;
  
  const classDistribution = {
    'airplane': 0,
    'mine': 0,
    'drowning victim': 0,
    'wreck': 0
  };

  const riskDistribution = {
    'LOW': 0,
    'MEDIUM': 0,
    'HIGH': 0,
    'CRITICAL': 0
  };

  let totalRiskScore = 0;
  let scoredScans = 0;
  
  // Trend Data: Map each scan directly to a point
  const trendData = [];

  history.forEach(scan => {
    const dets = scan.detections || [];
    totalTargets += dets.length;
    
    // Risk
    const rLvl = scan.analysis?.risk_level || 'LOW';
    if (rLvl === 'HIGH' || rLvl === 'CRITICAL') {
      highRiskScans++;
    }
    if (riskDistribution[rLvl] !== undefined) riskDistribution[rLvl]++;
    
    if (scan.analysis?.risk_score !== undefined) {
      totalRiskScore += scan.analysis.risk_score;
      scoredScans++;
    }

    // Classes
    dets.forEach(d => {
      const c = d.class_name?.toLowerCase();
      if (classDistribution[c] !== undefined) classDistribution[c]++;
    });

    // Trend mapping
    if (scan.created_at) {
      const topDet = dets.length > 0 ? [...dets].sort((a,b)=>b.confidence - a.confidence)[0] : null;
      trendData.push({
        scan_id: scan.scan_id,
        timestamp: scan.created_at,
        count: dets.length,
        riskLevel: rLvl,
        topClass: topDet ? topDet.class_name.toUpperCase() : 'NONE',
        topConfidence: topDet ? topDet.confidence : null
      });
    }
  });

  // Sort chronological
  trendData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const avgTargets = totalScans > 0 ? (totalTargets / totalScans).toFixed(1) : '0.0';
  const avgRisk = scoredScans > 0 ? (totalRiskScore / scoredScans).toFixed(1) : '0.0';
  const highRiskPct = totalScans > 0 ? Math.round((highRiskScans / totalScans) * 100) : 0;

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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-mono tracking-[0.3em] text-[#00F0FF] uppercase animate-pulse">TELEMETRY SYNCHRONIZING</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <span className="text-xs font-mono tracking-[0.3em] text-red-500 uppercase">TELEMETRY CONNECTION LOST</span>
      </div>
    );
  }

  if (totalScans === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Database className="w-12 h-12 text-gray-600" />
        <span className="text-xs font-mono tracking-[0.3em] text-gray-500 uppercase">NO HISTORICAL TELEMETRY</span>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1600px] mx-auto pb-10">
      
      {/* HEADER */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1A2C42] pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.2em] uppercase text-white drop-shadow-md">SYSTEM TELEMETRY</h1>
          <p className="text-[#00F0FF] font-mono text-[9px] tracking-[0.3em] uppercase mt-1">
            INTELLIGENCE OPERATIONS CENTER
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-4 font-mono text-[9px] tracking-[0.2em] uppercase">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-500">AI CORE</span>
            <span className="text-green-500 font-bold ml-1">ONLINE</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-gray-500">DATABASE</span>
            <span className="text-green-500 font-bold ml-1">ONLINE</span>
          </div>
          <div className="flex items-center gap-1">
            <Scan className="w-3 h-3 text-[#00F0FF]" />
            <span className="text-gray-500">MODEL</span>
            <span className="text-[#00F0FF] font-bold ml-1">YOLO11N</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-amber-500" />
            <span className="text-gray-500">GPU</span>
            <span className="text-amber-500 font-bold ml-1">RTX 4050</span>
          </div>
        </div>
      </motion.div>

      {/* METRIC CARDS */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GlassPanel className="p-4 border-[#1A2C42] hover:border-[#00F0FF]/50 transition-colors group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono tracking-widest text-gray-400">TOTAL SCANS</span>
            <Database className="w-4 h-4 text-[#00F0FF] opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-bold text-white tracking-wider my-2">{totalScans.toString().padStart(3, '0')}</div>
          <div className="text-[9px] font-mono text-gray-500 uppercase">FROM STORED HISTORY</div>
        </GlassPanel>

        <GlassPanel className="p-4 border-[#1A2C42] hover:border-[#00F0FF]/50 transition-colors group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono tracking-widest text-gray-400">DETECTED TARGETS</span>
            <Target className="w-4 h-4 text-[#00F0FF] opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-bold text-white tracking-wider my-2">{totalTargets.toString().padStart(3, '0')}</div>
          <div className="text-[9px] font-mono text-gray-500 uppercase">YOLO11N DETECTIONS</div>
        </GlassPanel>

        <GlassPanel className="p-4 border-[#1A2C42] hover:border-red-500/50 transition-colors group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono tracking-widest text-gray-400">HIGH-RISK SCANS</span>
            <AlertTriangle className="w-4 h-4 text-red-500 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-bold text-red-500 tracking-wider my-2">{highRiskScans.toString().padStart(3, '0')}</div>
          <div className="text-[9px] font-mono text-gray-500 uppercase">RISK ENGINE OUTPUT</div>
        </GlassPanel>

        <GlassPanel className="p-4 border-[#1A2C42] hover:border-[#00F0FF]/50 transition-colors group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono tracking-widest text-gray-400">AVG TARGETS / SCAN</span>
            <Activity className="w-4 h-4 text-[#00F0FF] opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-3xl font-bold text-white tracking-wider my-2">{avgTargets}</div>
          <div className="text-[9px] font-mono text-gray-500 uppercase">BASED ON HISTORY</div>
        </GlassPanel>
      </motion.div>

      {/* MIDDLE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* DETECTION ACTIVITY */}
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col min-h-[300px]">
          <GlassPanel className="p-4 border-[#1A2C42] h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <SectionHeader icon={Activity} title="DETECTION ACTIVITY" />
                <div className="text-[9px] font-mono text-gray-500 tracking-widest uppercase mt-1">REAL YOLO11N DETECTIONS OVER TIME</div>
              </div>
            </div>
            <div className="flex-1 w-full relative min-h-[200px]">
              {trendData.length > 0 ? (
                <D3TrendChart data={trendData} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center border border-dashed border-[#1A2C42] rounded m-2 bg-[#050B14]">
                  <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">NO HISTORICAL TELEMETRY</span>
                </div>
              )}
            </div>
          </GlassPanel>
        </motion.div>

        {/* DISTRIBUTIONS */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
          
          {/* TARGET CLASSIFICATION */}
          <GlassPanel className="p-4 border-[#1A2C42]">
            <SectionHeader icon={Target} title="TARGET CLASSIFICATION" />
            <div className="mt-4 space-y-4">
              {Object.entries(classDistribution).map(([cls, count]) => (
                <div key={cls} className="group cursor-default">
                  <div className="flex justify-between text-[10px] font-mono tracking-widest text-gray-400 uppercase mb-1">
                    <span>{cls}</span>
                    <span className="text-[#00F0FF] font-bold">{count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden border border-[#1A2C42]">
                    <div 
                      className="h-full bg-[#00F0FF] transition-all duration-1000 group-hover:bg-white" 
                      style={{ width: `${totalTargets > 0 ? (count / totalTargets) * 100 : 0}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* RISK DISTRIBUTION */}
          <GlassPanel className="p-4 border-[#1A2C42]">
            <SectionHeader icon={AlertTriangle} title="THREAT DISTRIBUTION" />
            
            <div className="flex gap-4 mt-4 mb-4">
              <div className="flex-1 bg-black/40 p-2 rounded border border-[#1A2C42] text-center">
                <div className="text-[8px] font-mono text-gray-500 tracking-widest mb-1">HIGH-RISK %</div>
                <div className="text-[12px] font-mono text-red-500 font-bold">{highRiskPct}%</div>
              </div>
              <div className="flex-1 bg-black/40 p-2 rounded border border-[#1A2C42] text-center">
                <div className="text-[8px] font-mono text-gray-500 tracking-widest mb-1">AVG SCORE</div>
                <div className="text-[12px] font-mono text-amber-500 font-bold">{avgRisk}</div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { level: 'CRITICAL', count: riskDistribution.CRITICAL, color: 'bg-red-600', text: 'text-red-500' },
                { level: 'HIGH', count: riskDistribution.HIGH, color: 'bg-orange-500', text: 'text-orange-500' },
                { level: 'MEDIUM', count: riskDistribution.MEDIUM, color: 'bg-amber-500', text: 'text-amber-500' },
                { level: 'LOW', count: riskDistribution.LOW, color: 'bg-green-500', text: 'text-green-500' },
              ].map(r => (
                <div key={r.level} className="flex items-center gap-3 text-[10px] font-mono tracking-widest uppercase">
                  <div className={`w-16 ${r.text}`}>{r.level}</div>
                  <div className="flex-1 h-1.5 bg-black/50 border border-[#1A2C42] overflow-hidden flex">
                    <div 
                      className={`h-full ${r.color} transition-all duration-1000`} 
                      style={{ width: `${totalScans > 0 ? (r.count / totalScans) * 100 : 0}%` }} 
                    />
                  </div>
                  <div className="w-6 text-right text-gray-400">{r.count}</div>
                </div>
              ))}
            </div>
          </GlassPanel>

        </motion.div>
      </div>

      {/* RECENT SCANS & PIPELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RECENT SCANS */}
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <GlassPanel className="p-4 border-[#1A2C42] h-full flex flex-col">
            <SectionHeader icon={Database} title="RECENT SCANS" />
            
            <div className="mt-4 flex-1 flex flex-col gap-2">
              {history.slice(0, 5).map(scan => {
                const dets = scan.detections || [];
                const topDet = dets.length > 0 ? [...dets].sort((a,b)=>b.confidence - a.confidence)[0] : null;
                const rLvl = scan.analysis?.risk_level || 'LOW';
                
                return (
                  <div 
                    key={scan.scan_id}
                    onClick={() => navigate(`/results/${scan.scan_id}`)}
                    className="flex flex-col bg-black/30 border border-[#1A2C42] rounded p-2 cursor-pointer hover:border-[#00F0FF]/50 hover:bg-[#00F0FF]/5 transition-all group"
                  >
                    <div className="flex justify-between items-center mb-2 border-b border-[#1A2C42]/50 pb-1">
                      <span className="text-[10px] font-mono font-bold text-white tracking-widest">{scan.scan_id}</span>
                      <RiskBadge level={rLvl} />
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-1 text-[9px] font-mono tracking-widest text-gray-500 uppercase">
                        <span>{new Date(scan.created_at).toLocaleString()}</span>
                        {topDet ? (
                          <span className="text-[#00F0FF]">TOP: {topDet.class_name} ({(topDet.confidence * 100).toFixed(0)}%)</span>
                        ) : (
                          <span>NO DETECTIONS</span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono tracking-widest text-gray-400 flex items-center gap-1 group-hover:text-[#00F0FF] transition-colors">
                        <Target className="w-3 h-3" /> {dets.length}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </motion.div>

        {/* INFERENCE PIPELINE */}
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <GlassPanel className="p-4 border-[#1A2C42] h-full flex flex-col">
            <SectionHeader icon={Activity} title="INFERENCE PIPELINE" />
            <div className="mt-4 flex-1 rounded border border-[#1A2C42] bg-black/40 relative pointer-events-none overflow-hidden min-h-[250px]">
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
