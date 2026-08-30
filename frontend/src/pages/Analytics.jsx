import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory } from '../services/api';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { 
  Database, 
  Target, 
  AlertTriangle, 
  Activity, 
  Shield, 
  PieChart, 
  BarChart2, 
  Cpu, 
  Terminal,
  Crosshair,
  ArrowRight
} from 'lucide-react';
import { GlassPanel, RiskBadge } from '../components/ui';

export default function Analytics() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [activeRiskFilter, setActiveRiskFilter] = useState('ALL'); // ALL, CRITICAL, HIGH, MEDIUM, LOW
  
  const d3Container = useRef(null);

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

  // Compute Analytics
  const analytics = useMemo(() => {
    if (history.length === 0) return null;

    let filtered = history;
    if (activeRiskFilter !== 'ALL') {
      filtered = history.filter(s => s.analysis?.risk_level === activeRiskFilter);
    }

    const totalScans = filtered.length;
    let totalTargets = 0;
    let totalRiskScore = 0;
    let topThreats = [];

    const riskDist = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    const classDist = {};

    filtered.forEach(scan => {
      const riskLevel = scan.analysis?.risk_level || 'UNKNOWN';
      riskDist[riskLevel] = (riskDist[riskLevel] || 0) + 1;
      totalRiskScore += scan.analysis?.risk_score || 0;

      const dets = scan.detections || [];
      totalTargets += dets.length;

      dets.forEach(det => {
        const cls = det.class_name || 'UNKNOWN';
        classDist[cls] = (classDist[cls] || 0) + 1;
      });

      // Top threats array collection
      if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
        if (dets.length > 0) {
          // find highest confidence det
          const topDet = [...dets].sort((a,b) => b.confidence - a.confidence)[0];
          topThreats.push({
            scan_id: scan.scan_id,
            target: topDet.class_name,
            confidence: topDet.confidence,
            risk_level: riskLevel,
            risk_score: scan.analysis?.risk_score,
            created_at: scan.created_at
          });
        }
      }
    });

    topThreats.sort((a, b) => b.risk_score - a.risk_score);
    topThreats = topThreats.slice(0, 5); // top 5

    return {
      totalScans,
      totalTargets,
      avgTargets: totalScans > 0 ? (totalTargets / totalScans).toFixed(1) : 0,
      avgRiskScore: totalScans > 0 ? (totalRiskScore / totalScans).toFixed(1) : 0,
      riskDist,
      classDist,
      topThreats
    };
  }, [history, activeRiskFilter]);

  // D3 Chart Effect
  useEffect(() => {
    if (!analytics || !d3Container.current || history.length === 0) return;

    // Filter for trend (use full history, chronologically sorted)
    const sortedData = [...history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    // Group by minute (or scan index if time is too tight)
    // For simplicity, plotting index vs risk_score to show trend
    const plotData = sortedData.map((d, i) => ({
      index: i,
      risk_score: d.analysis?.risk_score || 0,
      target_count: (d.detections || []).length,
      scan_id: d.scan_id
    }));

    const width = d3Container.current.clientWidth;
    const height = 200;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    d3.select(d3Container.current).selectAll("*").remove();

    const svg = d3.select(d3Container.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const x = d3.scaleLinear()
      .domain([0, plotData.length - 1])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top]);

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-width + margin.left + margin.right).tickFormat(""))
      .style("stroke-opacity", 0.1)
      .style("stroke", "#20DCC5");

    // Line generator
    const line = d3.line()
      .x(d => x(d.index))
      .y(d => y(d.risk_score))
      .curve(d3.curveMonotoneX);

    // Area generator for glow
    const area = d3.area()
      .x(d => x(d.index))
      .y0(height - margin.bottom)
      .y1(d => y(d.risk_score))
      .curve(d3.curveMonotoneX);

    svg.append("path")
      .datum(plotData)
      .attr("fill", "url(#glow-gradient)")
      .attr("d", area);

    svg.append("path")
      .datum(plotData)
      .attr("fill", "none")
      .attr("stroke", "#20DCC5")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Points
    svg.selectAll(".dot")
      .data(plotData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.index))
      .attr("cy", d => y(d.risk_score))
      .attr("r", 4)
      .attr("fill", d => d.risk_score > 75 ? "#EF4444" : d.risk_score > 40 ? "#F59E0B" : "#20DCC5")
      .style("filter", "drop-shadow(0 0 5px rgba(0, 240, 255, 0.8))");

    // Gradient def
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "glow-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    gradient.append("stop").attr("offset", "0%").style("stop-color", "#20DCC5").style("stop-opacity", 0.3);
    gradient.append("stop").attr("offset", "100%").style("stop-color", "#20DCC5").style("stop-opacity", 0);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => `SCAN ${d}`))
      .attr("color", "#4B5563")
      .style("font-family", "monospace")
      .style("font-size", "9px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#4B5563")
      .style("font-family", "monospace")
      .style("font-size", "9px");

  }, [analytics, history]);

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
        <Shield className="w-16 h-16 text-red-500 animate-pulse" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#F2F7F5] uppercase">TELEMETRY CONNECTION FAILURE</h2>
        <GlowButton onClick={fetchHistory} className="px-8 py-3">RETRY CONNECTION</GlowButton>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <Activity className="w-12 h-12 text-[#20DCC5] animate-spin" />
        <h2 className="text-[10px] font-mono tracking-[0.3em] text-[#20DCC5] uppercase">SYNCHRONIZING RISK TELEMETRY...</h2>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <Database className="w-12 h-12 text-[#607874] mb-4 opacity-50" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#A8BDB9] uppercase">NO HISTORICAL TELEMETRY</h2>
        <p className="text-xs font-mono tracking-widest text-[#607874] uppercase">Complete a sonar scan to populate the intelligence matrix.</p>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 h-full flex flex-col font-sans">
      
      {/* HEADER */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[rgba(32,220,197,0.18)] pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div className="h-10 w-10 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded">
              <PieChart className="w-5 h-5 text-[#20DCC5]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-[#F2F7F5] shadow-black drop-shadow-md">INTELLIGENCE RISK MATRIX</h1>
          </div>
          <p className="text-[#A8BDB9] font-mono text-[10px] tracking-[0.3em] uppercase ml-14">
            THREAT DISTRIBUTION & SYSTEM TELEMETRY
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4 md:mt-0 font-mono text-[9px] tracking-widest uppercase">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setActiveRiskFilter(lvl)}
              className={`px-3 py-1.5 border rounded transition-colors ${
                activeRiskFilter === lvl 
                  ? 'bg-[#20DCC5]/20 border-[#20DCC5] text-[#F2F7F5] shadow-[0_0_10px_rgba(40,224,196,0.3)]' 
                  : 'bg-black border-[rgba(32,220,197,0.18)] text-[#607874] hover:text-[#20DCC5]'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6">
        
        {/* LEFT COLUMN: Matrices & Charts */}
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Top Level KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] p-4 rounded text-center">
              <div className="text-[9px] font-mono tracking-widest text-[#607874] uppercase mb-2">TOTAL SCANS</div>
              <div className="text-2xl font-mono text-[#F2F7F5] font-bold">{analytics.totalScans}</div>
            </div>
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] p-4 rounded text-center">
              <div className="text-[9px] font-mono tracking-widest text-[#607874] uppercase mb-2">TOTAL TARGETS</div>
              <div className="text-2xl font-mono text-[#F2F7F5] font-bold">{analytics.totalTargets}</div>
            </div>
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-red-500/30 p-4 rounded text-center shadow-[inset_0_0_15px_rgba(239,68,68,0.05)]">
              <div className="text-[9px] font-mono tracking-widest text-red-500/70 uppercase mb-2">CRITICAL SCANS</div>
              <div className="text-2xl font-mono text-red-500 font-bold">{analytics.riskDist['CRITICAL'] || 0}</div>
            </div>
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-orange-500/30 p-4 rounded text-center">
              <div className="text-[9px] font-mono tracking-widest text-orange-500/70 uppercase mb-2">HIGH RISK</div>
              <div className="text-2xl font-mono text-orange-500 font-bold">{analytics.riskDist['HIGH'] || 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* RISK MATRIX DISTRIBUTION */}
            <GlassPanel className="p-0 border border-[rgba(32,220,197,0.18)] flex flex-col" borderTop>
              <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40">
                <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                  <BarChart2 className="w-3 h-3 text-[#20DCC5]" /> RISK DISTRIBUTION
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
                {[
                  { level: 'CRITICAL', color: 'bg-red-500' },
                  { level: 'HIGH', color: 'bg-orange-500' },
                  { level: 'MEDIUM', color: 'bg-[#D6A84F]' },
                  { level: 'LOW', color: 'bg-[#20DCC5]' }
                ].map(({ level, color }) => {
                  const count = analytics.riskDist[level] || 0;
                  const total = analytics.totalScans || 1;
                  const pct = Math.round((count / total) * 100);
                  
                  return (
                    <div key={level} className="flex items-center gap-4">
                      <div className="w-20 text-[9px] font-mono tracking-widest text-[#A8BDB9] uppercase">{level}</div>
                      <div className="flex-1 h-3 bg-black border border-[rgba(32,220,197,0.18)] rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-10 text-right text-[10px] font-mono font-bold text-[#F2F7F5]">{count}</div>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>

            {/* CLASS DISTRIBUTION */}
            <GlassPanel className="p-0 border border-[rgba(32,220,197,0.18)] flex flex-col" borderTop>
              <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40">
                <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                  <Target className="w-3 h-3 text-[#20DCC5]" /> TARGET CLASSIFICATIONS
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
                {Object.keys(analytics.classDist).length === 0 ? (
                  <div className="text-[10px] font-mono text-[#607874] text-center uppercase tracking-widest">NO TARGETS ACQUIRED</div>
                ) : (
                  Object.entries(analytics.classDist).map(([cls, count]) => {
                    const pct = Math.round((count / analytics.totalTargets) * 100);
                    return (
                      <div key={cls} className="flex items-center gap-4">
                        <div className="w-24 text-[9px] font-mono tracking-widest text-[#A8BDB9] uppercase truncate" title={cls}>{cls}</div>
                        <div className="flex-1 h-3 bg-black border border-[rgba(32,220,197,0.18)] rounded-full overflow-hidden">
                          <div className="h-full bg-[#20DCC5]/80" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-10 text-right text-[10px] font-mono font-bold text-[#F2F7F5]">{count}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassPanel>

          </div>

          {/* HISTORICAL TREND D3 */}
          <GlassPanel className="p-0 border border-[rgba(32,220,197,0.18)] flex flex-col" borderTop>
            <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between">
              <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Activity className="w-3 h-3 text-[#20DCC5]" /> HISTORICAL RISK TREND
              </h3>
              <span className="text-[9px] font-mono text-[#607874] uppercase">RISK SCORE OVER TIME</span>
            </div>
            <div className="p-4 bg-[#02090B]">
               <div ref={d3Container} className="w-full h-[200px]" />
            </div>
          </GlassPanel>

        </motion.div>

        {/* RIGHT COLUMN: Threats & System Status */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
          
          {/* TOP THREATS */}
          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40">
              <h3 className="text-[10px] font-mono tracking-widest text-red-500 uppercase flex items-center gap-2">
                <Shield className="w-3 h-3" /> TOP THREAT IDENTIFICATIONS
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
              {analytics.topThreats.length === 0 ? (
                <div className="text-[9px] font-mono text-[#607874] text-center py-10 uppercase tracking-widest">
                  NO CRITICAL/HIGH THREATS IDENTIFIED
                </div>
              ) : (
                analytics.topThreats.map((threat, idx) => (
                  <div 
                    key={idx}
                    onClick={() => navigate(`/results/${threat.scan_id}`)}
                    className="p-3 bg-black/50 border border-[rgba(32,220,197,0.18)] hover:border-[#20DCC5]/40 rounded cursor-pointer group transition-colors flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-mono text-xs font-bold text-[#F2F7F5] tracking-widest uppercase flex items-center gap-2 group-hover:text-[#20DCC5] transition-colors">
                        <Crosshair className="w-3 h-3 text-red-500" />
                        {threat.target}
                      </div>
                      <RiskBadge level={threat.risk_level} />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono tracking-widest text-[#607874]">
                      <span>CONF: {(threat.confidence * 100).toFixed(1)}%</span>
                      <span>SCORE: {threat.risk_score.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] font-mono tracking-widest text-[#607874] border-t border-[rgba(32,220,197,0.18)]/50 pt-2 mt-1">
                      <span>ID: {threat.scan_id}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#20DCC5] transition-opacity" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SYSTEM STATUS */}
          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded p-5">
            <h3 className="text-[10px] font-mono tracking-widest text-[#A8BDB9] uppercase mb-4 border-b border-[rgba(32,220,197,0.18)] pb-2 flex items-center gap-2">
              <Cpu className="w-3 h-3" /> SYSTEM STATUS ARCHITECTURE
            </h3>
            <div className="space-y-4 font-mono text-[9px] tracking-widest uppercase">
              <div className="flex justify-between items-center">
                <span className="text-[#607874] flex items-center gap-2"><Terminal className="w-3 h-3" /> AI MODEL</span>
                <span className="text-[#20DCC5]">YOLO11n</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874] flex items-center gap-2"><Activity className="w-3 h-3" /> RISK ENGINE</span>
                <span className="text-[#20DCC5]">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874] flex items-center gap-2"><Database className="w-3 h-3" /> DATA STORE</span>
                <span className="text-[#20DCC5]">SQLite</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874] flex items-center gap-2"><Target className="w-3 h-3" /> TOTAL DETECTIONS</span>
                <span className="text-[#F2F7F5]">{analytics.totalTargets}</span>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
