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
  ArrowRight,
  TrendingUp,
  Radio
} from 'lucide-react';
import { GlassPanel, GlowButton, RiskBadge } from '../components/ui';

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
      setHistory(data || []);
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
          const topDet = [...dets].sort((a,b) => (b.confidence || 0) - (a.confidence || 0))[0];
          topThreats.push({
            scan_id: scan.scan_id,
            target: topDet.class_name,
            confidence: topDet.confidence,
            risk_level: riskLevel,
            risk_score: scan.analysis?.risk_score || 0,
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
      avgTargets: totalScans > 0 ? (totalTargets / totalScans).toFixed(1) : '0.0',
      avgRiskScore: totalScans > 0 ? (totalRiskScore / totalScans).toFixed(1) : '0.0',
      riskDist,
      classDist,
      topThreats
    };
  }, [history, activeRiskFilter]);

  // D3 Chart Effect
  useEffect(() => {
    if (!analytics || !d3Container.current || history.length === 0) return;

    const sortedData = [...history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    const plotData = sortedData.map((d, i) => ({
      index: i,
      risk_score: d.analysis?.risk_score || 0,
      target_count: (d.detections || []).length,
      scan_id: d.scan_id
    }));

    const width = d3Container.current.clientWidth || 600;
    const height = 220;
    const margin = { top: 20, right: 20, bottom: 35, left: 45 };

    d3.select(d3Container.current).selectAll("*").remove();

    const svg = d3.select(d3Container.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("style", "max-width: 100%; height: auto;");

    const x = d3.scaleLinear()
      .domain([0, Math.max(1, plotData.length - 1)])
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, 100])
      .range([height - margin.bottom, margin.top]);

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickSize(-width + margin.left + margin.right).tickFormat(""))
      .style("stroke-opacity", 0.08)
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

    // Gradient def
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "glow-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    gradient.append("stop").attr("offset", "0%").style("stop-color", "#20DCC5").style("stop-opacity", 0.35);
    gradient.append("stop").attr("offset", "100%").style("stop-color", "#20DCC5").style("stop-opacity", 0);

    svg.append("path")
      .datum(plotData)
      .attr("fill", "url(#glow-gradient)")
      .attr("d", area);

    svg.append("path")
      .datum(plotData)
      .attr("fill", "none")
      .attr("stroke", "#20DCC5")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    // Points
    svg.selectAll(".dot")
      .data(plotData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.index))
      .attr("cy", d => y(d.risk_score))
      .attr("r", 3.5)
      .attr("fill", d => d.risk_score >= 70 ? "#EF4444" : d.risk_score >= 40 ? "#F59E0B" : "#20DCC5")
      .style("filter", "drop-shadow(0 0 6px rgba(32, 220, 197, 0.8))");

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(Math.min(6, plotData.length)).tickFormat(d => `SCAN ${d}`))
      .attr("color", "#607874")
      .style("font-family", "JetBrains Mono, monospace")
      .style("font-size", "9px");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .attr("color", "#607874")
      .style("font-family", "JetBrains Mono, monospace")
      .style("font-size", "9px");

  }, [analytics, history]);

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
        <Shield className="w-16 h-16 text-red-500 animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#F2F7F5] uppercase">TELEMETRY CONNECTION FAILURE</h2>
        <GlowButton onClick={fetchHistory} className="px-8 py-3">RETRY CONNECTION</GlowButton>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 font-mono">
        <div className="w-12 h-12 border-2 border-[#20DCC5] border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(32,220,197,0.4)]" />
        <h2 className="text-xs tracking-[0.25em] text-[#20DCC5] uppercase animate-pulse">SYNCHRONIZING FLEET ANALYTICS...</h2>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 font-mono">
        <Database className="w-14 h-14 text-[#607874] mb-2 opacity-50" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#A8BDB9] uppercase">NO HISTORICAL TELEMETRY</h2>
        <p className="text-xs tracking-widest text-[#607874] uppercase">Complete a sonar scan to populate the analytics matrix.</p>
        <GlowButton onClick={() => navigate('/scan')} className="px-6 py-2.5">NEW SCAN</GlowButton>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 h-full flex flex-col font-sans max-w-[1680px] mx-auto pb-6">
      
      {/* HEADER */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-[rgba(32,220,197,0.18)] pb-5 mb-1 gap-4">
        <div>
          <div className="flex items-center gap-3.5 mb-2">
            <div className="h-10 w-10 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(32,220,197,0.2)]">
              <PieChart className="w-5 h-5 text-[#20DCC5]" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-[0.15em] uppercase text-[#F2F7F5]">
              INTELLIGENCE ANALYTICS
            </h1>
          </div>
          <p className="text-[#A8BDB9] font-mono text-[10px] tracking-[0.25em] uppercase ml-14">
            FLEET SURVEY TELEMETRY // THREAT DISTRIBUTION & HISTORICAL TRENDS
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 font-mono text-[9px] tracking-widest uppercase flex-wrap">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setActiveRiskFilter(lvl)}
              className={`px-3.5 py-1.5 border rounded-xl transition-all ${
                activeRiskFilter === lvl 
                  ? 'bg-[#20DCC5]/20 border-[#20DCC5] text-[#20DCC5] font-bold shadow-[0_0_12px_rgba(32,220,197,0.25)]' 
                  : 'bg-[rgba(4,25,27,0.85)] border-[rgba(32,220,197,0.18)] text-[#607874] hover:text-[#20DCC5] hover:border-[#20DCC5]/40'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6">
        
        {/* LEFT COLUMN: Matrices & Charts (8 Cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Top Level KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.22)] p-4 rounded-2xl text-center shadow-sm">
              <div className="text-[8px] tracking-widest text-[#607874] uppercase mb-1">TOTAL SCANS</div>
              <div className="text-2xl text-[#F2F7F5] font-bold">{analytics.totalScans}</div>
            </div>
            <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.22)] p-4 rounded-2xl text-center shadow-sm">
              <div className="text-[8px] tracking-widest text-[#607874] uppercase mb-1">TOTAL CONTACTS</div>
              <div className="text-2xl text-[#20DCC5] font-bold">{analytics.totalTargets}</div>
            </div>
            <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-red-500/30 p-4 rounded-2xl text-center shadow-sm">
              <div className="text-[8px] tracking-widest text-red-400 uppercase mb-1">CRITICAL SCANS</div>
              <div className="text-2xl text-red-400 font-bold">{analytics.riskDist['CRITICAL'] || 0}</div>
            </div>
            <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-amber-500/30 p-4 rounded-2xl text-center shadow-sm">
              <div className="text-[8px] tracking-widest text-amber-400 uppercase mb-1">AVG RISK SCORE</div>
              <div className="text-2xl text-amber-400 font-bold">{analytics.avgRiskScore}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* RISK MATRIX DISTRIBUTION */}
            <GlassPanel className="p-0 border border-[rgba(32,220,197,0.22)] rounded-2xl flex flex-col overflow-hidden shadow-sm" borderTop>
              <div className="p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50">
                <h3 className="text-xs font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2 font-bold">
                  <BarChart2 className="w-3.5 h-3.5 text-[#20DCC5]" /> RISK LEVEL BREAKDOWN
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center space-y-3.5 font-mono">
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
                    <div key={level} className="flex items-center gap-3">
                      <div className="w-20 text-[9px] tracking-widest text-[#A8BDB9] uppercase">{level}</div>
                      <div className="flex-1 h-2 bg-black/60 border border-[rgba(32,220,197,0.15)] rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-10 text-right text-[10px] font-bold text-[#F2F7F5]">{count}</div>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>

            {/* CLASS DISTRIBUTION */}
            <GlassPanel className="p-0 border border-[rgba(32,220,197,0.22)] rounded-2xl flex flex-col overflow-hidden shadow-sm" borderTop>
              <div className="p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50">
                <h3 className="text-xs font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2 font-bold">
                  <Target className="w-3.5 h-3.5 text-[#20DCC5]" /> TARGET CLASSIFICATIONS
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center space-y-3.5 font-mono">
                {Object.keys(analytics.classDist).length === 0 ? (
                  <div className="text-[10px] text-[#607874] text-center uppercase tracking-widest">NO TARGETS ACQUIRED</div>
                ) : (
                  Object.entries(analytics.classDist).map(([cls, count]) => {
                    const pct = Math.round((count / (analytics.totalTargets || 1)) * 100);
                    return (
                      <div key={cls} className="flex items-center gap-3">
                        <div className="w-24 text-[9px] tracking-widest text-[#A8BDB9] uppercase truncate" title={cls}>{cls}</div>
                        <div className="flex-1 h-2 bg-black/60 border border-[rgba(32,220,197,0.15)] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#0F6F70] to-[#20DCC5]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-10 text-right text-[10px] font-bold text-[#F2F7F5]">{count}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassPanel>

          </div>

          {/* HISTORICAL TREND D3 */}
          <GlassPanel className="p-0 border border-[rgba(32,220,197,0.22)] rounded-2xl flex flex-col overflow-hidden shadow-sm" borderTop>
            <div className="p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50 flex justify-between items-center font-mono">
              <h3 className="text-xs tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2 font-bold">
                <TrendingUp className="w-3.5 h-3.5 text-[#20DCC5]" /> HISTORICAL RISK TREND TELEMETRY
              </h3>
              <span className="text-[8px] text-[#607874] uppercase tracking-widest">CHRONOLOGICAL PROFILE</span>
            </div>
            <div className="p-4 bg-[#02090B]">
               <div ref={d3Container} className="w-full h-[220px]" />
            </div>
          </GlassPanel>

        </motion.div>

        {/* RIGHT COLUMN: Threats & System Status (4 Cols) */}
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-5">
          
          {/* TOP THREATS */}
          <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.22)] rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50">
              <h3 className="text-xs font-mono tracking-widest text-red-400 uppercase flex items-center gap-2 font-bold">
                <Shield className="w-3.5 h-3.5 text-red-400" /> PRIORITY THREAT CONTACTS
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 font-mono">
              {analytics.topThreats.length === 0 ? (
                <div className="text-[9px] text-[#607874] text-center py-10 uppercase tracking-widest">
                  NO CRITICAL/HIGH THREATS IDENTIFIED
                </div>
              ) : (
                analytics.topThreats.map((threat, idx) => (
                  <div 
                    key={idx}
                    onClick={() => navigate(`/results/${threat.scan_id}`)}
                    className="p-3 bg-black/50 border border-[rgba(32,220,197,0.18)] hover:border-[#20DCC5]/40 rounded-xl cursor-pointer group transition-all flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-xs font-bold text-[#F2F7F5] tracking-wider uppercase flex items-center gap-1.5 group-hover:text-[#20DCC5] transition-colors">
                        <Crosshair className="w-3.5 h-3.5 text-red-400" />
                        {threat.target}
                      </div>
                      <RiskBadge level={threat.risk_level} />
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-[#607874]">
                      <span>CONF: {threat.confidence != null ? `${(threat.confidence * 100).toFixed(1)}%` : '—'}</span>
                      <span>SCORE: {threat.risk_score != null ? Number(threat.risk_score).toFixed(1) : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[8px] text-[#607874] border-t border-[rgba(32,220,197,0.10)] pt-1.5 mt-0.5">
                      <span>SCAN: {threat.scan_id}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#20DCC5] transition-opacity" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SYSTEM STATUS */}
          <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.22)] rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-mono tracking-widest text-[#F2F7F5] uppercase mb-4 border-b border-[rgba(32,220,197,0.18)] pb-2 flex items-center gap-2 font-bold">
              <Cpu className="w-3.5 h-3.5 text-[#20DCC5]" /> SYSTEM ENGINE STATUS
            </h3>
            <div className="space-y-3 font-mono text-[9px] tracking-widest uppercase">
              <div className="flex justify-between items-center">
                <span className="text-[#607874] flex items-center gap-2"><Terminal className="w-3.5 h-3.5" /> AI INFERENCE ENGINE</span>
                <span className="text-[#20DCC5] font-bold">YOLO11n (4-CLASS)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874] flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> RISK ENGINE</span>
                <span className="text-emerald-400 font-bold">OPERATIONAL</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874] flex items-center gap-2"><Database className="w-3.5 h-3.5" /> TELEMETRY STORE</span>
                <span className="text-[#20DCC5] font-bold">SQLITE 3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874] flex items-center gap-2"><Target className="w-3.5 h-3.5" /> TOTAL CONTACTS LOGGED</span>
                <span className="text-[#F2F7F5] font-bold">{analytics.totalTargets}</span>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
