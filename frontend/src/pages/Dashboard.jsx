import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getHistory } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Target, 
  Clock, 
  PlusSquare,
  ShieldAlert,
  Radio,
  Wifi,
  Database,
  Terminal,
  Layers,
  ArrowRight,
  Crosshair
} from 'lucide-react';
import { GlassPanel, GlowButton, RiskBadge, MetricCard } from '../components/ui';

export default function Dashboard() {
  const [dashboardStats, setDashboardStats] = useState({ total_scans: 0, total_targets: 0, critical_threats: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const historyData = await getHistory();
        
        // Calculate metrics dynamically from real history data to guarantee accuracy
        const totalScans = historyData.length;
        let totalTargets = 0;
        let criticalThreats = 0;

        historyData.forEach(scan => {
          if (scan.detections) {
            totalTargets += scan.detections.length;
          }
          if (scan.analysis?.risk_level === 'CRITICAL' || scan.analysis?.risk_level === 'HIGH') {
            criticalThreats += 1;
          }
        });

        setDashboardStats({
          total_scans: totalScans,
          total_targets: totalTargets,
          critical_threats: criticalThreats
        });

        setHistory(historyData.slice(0, 5)); // Show only 5 most recent
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6 h-full flex flex-col font-sans"
    >
      
      {/* Top Header / Command Bar */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between border-b border-[rgba(32,220,197,0.18)] pb-4">
        <div className="flex items-center gap-3.5 mb-3 md:mb-0">
          <div className="h-11 w-11 bg-[rgba(4,25,27,0.85)] border border-[rgba(32,220,197,0.30)] flex items-center justify-center rounded shadow-[0_0_15px_rgba(32,220,197,0.12)]">
            <Radio className="w-5 h-5 text-[#20DCC5] animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-[0.2em] uppercase text-[#F2F7F5] font-mono">MISSION CONTROL</h1>
            <div className="flex items-center gap-2.5 text-[#20DCC5] font-mono text-[9px] tracking-widest uppercase mt-0.5">
              <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> PIPELINE ONLINE</span>
              <span className="text-[#607874]">|</span>
              <span className="flex items-center gap-1 text-[#A8BDB9]"><Database className="w-3 h-3" /> REPOSITORY READY</span>
              <span className="text-[#607874]">|</span>
              <span className="text-[#D6A84F]">PHASE 8 FROZEN</span>
            </div>
          </div>
        </div>
        
        <GlowButton 
          primary
          onClick={() => navigate('/scan')}
          className="py-2.5 px-5 text-xs font-mono tracking-widest flex items-center gap-2"
        >
          <PlusSquare className="w-4 h-4" /> 
          INITIALIZE SCAN
        </GlowButton>
      </motion.div>

      {/* KPI Row (4 Metric Cards) */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="TOTAL ARCHIVE SCANS" 
          value={loading ? '--' : String(dashboardStats.total_scans).padStart(3, '0')} 
          unit="MISSIONS"
          icon={Activity}
          glow
          description="Acoustic Sonar Scans"
        />
        <MetricCard 
          title="VERIFIED DETECTIONS" 
          value={loading ? '--' : String(dashboardStats.total_targets).padStart(3, '0')} 
          unit="TARGETS"
          icon={Target}
          description="YOLO11n Neural Contacts"
        />
        <MetricCard 
          title="CRITICAL / HIGH THREATS" 
          value={loading ? '--' : String(dashboardStats.critical_threats).padStart(2, '0')} 
          unit="ALERTS"
          icon={ShieldAlert}
          description="HEURISTIC V2 Evaluated"
        />
        <MetricCard 
          title="FUSION ENGINE STATUS" 
          value="ACTIVE" 
          unit="TRIAGE"
          icon={Layers}
          description="Multi-Signal Prioritization"
        />
      </motion.div>

      {/* Main Grid: Tactical Visualizer & Recent Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Main Operational Overview */}
        <motion.div variants={item} className="lg:col-span-8 flex flex-col gap-6 min-h-0">
          
          {/* Tactical Visualizer */}
          <GlassPanel className="p-0 flex-1 relative flex flex-col overflow-hidden border border-[rgba(32,220,197,0.18)]" borderTop>
            <div className="p-3.5 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center z-20">
              <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#20DCC5]" /> ACOUSTIC TACTICAL VISUALIZER
              </h3>
              <button 
                onClick={() => navigate('/map')} 
                className="text-[9px] font-mono tracking-widest text-[#20DCC5] hover:text-white uppercase transition-colors flex items-center gap-1 bg-[#20DCC5]/10 px-2 py-1 rounded border border-[#20DCC5]/30 hover:bg-[#20DCC5]/20"
              >
                <span>OPEN WORKSTATION</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 relative bg-[rgba(2,12,15,0.70)] flex items-center justify-center overflow-hidden min-h-[260px]">
              {/* Radar Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(32,220,197,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(32,220,197,0.05)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none" />
              
              <div className="relative w-[240px] h-[240px] md:w-[320px] md:h-[320px]">
                <div className="absolute inset-0 rounded-full border border-[rgba(32,220,197,0.20)] shadow-[0_0_20px_rgba(32,220,197,0.05)]" />
                <div className="absolute inset-[25%] rounded-full border border-[rgba(32,220,197,0.30)] border-dashed" />
                <div className="absolute inset-[50%] rounded-full border border-[rgba(32,220,197,0.40)]" />
                <div className="absolute inset-[75%] rounded-full border border-[rgba(32,220,197,0.20)]" />
                
                {/* Axis lines */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[rgba(32,220,197,0.25)] -translate-x-1/2" />
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[rgba(32,220,197,0.25)] -translate-y-1/2" />
                
                {/* Sweeper */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, ease: "linear", repeat: Infinity }}
                  className="absolute inset-0 rounded-full origin-center pointer-events-none"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 75%, rgba(32, 220, 197, 0.15) 100%)'
                  }}
                />

                {/* Center Status Node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#20DCC5] rounded-full shadow-[0_0_12px_rgba(32,220,197,0.8)]" />
                
                {/* Abstract Visual Contact Markers from Real History */}
                {history.map((scan, i) => {
                  if (i > 3) return null;
                  const isHighRisk = scan.analysis?.risk_level === 'HIGH' || scan.analysis?.risk_level === 'CRITICAL';
                  const posClass = [
                    "top-[22%] left-[32%]", 
                    "top-[58%] left-[68%]", 
                    "top-[38%] left-[78%]", 
                    "top-[68%] left-[26%]"
                  ][i];
                  return (
                    <div 
                      key={i} 
                      className={`absolute ${posClass} w-2.5 h-2.5 rounded-full ${isHighRisk ? 'bg-red-400 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-[#20DCC5] shadow-[0_0_10px_rgba(32,220,197,0.6)]'} animate-pulse cursor-pointer`}
                      title={`${scan.scan_id} - ${scan.analysis?.risk_level || 'LOW'} RISK`}
                      onClick={() => navigate(`/results/${scan.scan_id}`)}
                    />
                  );
                })}
              </div>

              <div className="absolute bottom-3 left-3 text-[8.5px] font-mono text-[#607874] uppercase tracking-widest pointer-events-none bg-black/40 px-2 py-1 rounded">
                SIMULATED ACOUSTIC SWEEP • REAL SCAN ANCHORS
              </div>
            </div>
          </GlassPanel>

        </motion.div>

        {/* Right Column: Mission Control & Archive */}
        <motion.div variants={item} className="lg:col-span-4 flex flex-col gap-6 min-h-0">
          
          <GlassPanel className="flex-1 flex flex-col overflow-hidden p-0">
            <div className="p-3.5 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center">
              <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#20DCC5]" /> RECENT INTELLIGENCE LOGS
              </h3>
              <span className="text-[8px] font-mono text-[#607874] uppercase">{history.length} RECENTS</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[rgba(32,220,197,0.10)]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-[#607874] font-mono text-[10px] tracking-widest uppercase py-10">
                  <Activity className="w-4 h-4 animate-spin mr-2 text-[#20DCC5]" /> ACCESSING ARCHIVE...
                </div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[#607874] font-mono text-[10px] tracking-widest uppercase py-10">
                  NO SCANS DETECTED
                </div>
              ) : (
                history.map((scan) => (
                  <div 
                    key={scan.scan_id}
                    onClick={() => navigate(`/results/${scan.scan_id}`)}
                    className="p-3.5 hover:bg-[rgba(32,220,197,0.08)] cursor-pointer transition-colors group flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-[#F2F7F5] font-bold tracking-wider group-hover:text-[#20DCC5] transition-colors truncate">
                          {scan.scan_id}
                        </div>
                        <div className="font-mono text-[8.5px] text-[#607874] tracking-wider truncate uppercase">
                          {scan.filename}
                        </div>
                      </div>
                      {scan.analysis?.risk_level && (
                        <RiskBadge level={scan.analysis.risk_level} />
                      )}
                    </div>
                    <div className="flex justify-between items-center text-[8.5px] font-mono text-[#607874] pt-0.5">
                      <span className="text-[#20DCC5] flex items-center gap-1 font-semibold">
                        <Crosshair className="w-2.5 h-2.5" /> {(scan.detections || []).length} CONTACTS
                      </span>
                      <span>
                        {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-3 border-t border-[rgba(32,220,197,0.18)] bg-black/40">
              <button 
                onClick={() => navigate('/history')}
                className="w-full py-2 text-[9.5px] font-mono font-bold tracking-widest text-[#A8BDB9] hover:text-[#20DCC5] transition-colors uppercase border border-[rgba(32,220,197,0.20)] hover:border-[#20DCC5]/40 rounded bg-[rgba(32,220,197,0.04)]"
              >
                VIEW COMPLETE ARCHIVE &rarr;
              </button>
            </div>
          </GlassPanel>

          {/* System Diagnostics Card */}
          <GlassPanel className="p-4">
            <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#A8BDB9] uppercase mb-3 border-b border-[rgba(32,220,197,0.15)] pb-2">
              SYSTEM SPECIFICATIONS
            </h3>
            <div className="space-y-2.5 font-mono text-[9px] uppercase tracking-wider">
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">DETECTOR</span>
                <span className="text-[#20DCC5] font-bold">YOLO11n Fine-Tuned</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">EVIDENCE ENGINE</span>
                <span className="text-[#20DCC5] font-bold">Acoustic Physics V1</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">RISK ENGINE</span>
                <span className="text-[#D6A84F] font-bold">HEURISTIC V2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#607874]">TRIAGE FUSION</span>
                <span className="text-[#20DCC5] font-bold">Phase 8 Operational</span>
              </div>
            </div>
          </GlassPanel>

        </motion.div>
      </div>
    </motion.div>
  );
}
