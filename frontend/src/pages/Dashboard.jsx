import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getStats, getHistory } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Target, 
  AlertTriangle, 
  Clock, 
  PlusSquare,
  ShieldAlert,
  Radio,
  Wifi,
  Database,
  Terminal
} from 'lucide-react';
import { GlassPanel, GlowButton, RiskBadge } from '../components/ui';

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
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6 h-full flex flex-col font-sans"
    >
      
      {/* Top Header / Command Bar */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between border-b border-[rgba(32,220,197,0.18)] pb-4 mb-2">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="h-12 w-12 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded">
            <Radio className="w-6 h-6 text-[#20DCC5] animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-[0.2em] uppercase text-[#F2F7F5] shadow-black drop-shadow-md">COMMAND DASHBOARD</h1>
            <div className="flex items-center gap-3 text-[#20DCC5] font-mono text-[10px] tracking-widest uppercase mt-1">
              <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> SYSTEM ONLINE</span>
              <span className="text-[#607874]">|</span>
              <span className="flex items-center gap-1"><Database className="w-3 h-3" /> DB CONNECTED</span>
            </div>
          </div>
        </div>
        
        <GlowButton 
          primary
          onClick={() => navigate('/scan')}
          className="py-3 px-6 text-xs tracking-widest flex items-center gap-2"
        >
          <PlusSquare className="w-4 h-4" /> 
          INITIALIZE NEW SCAN
        </GlowButton>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* Main Operational Overview */}
        <motion.div variants={item} className="lg:col-span-8 flex flex-col gap-6 min-h-0">
          
          {/* Top Level Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Metric 1 */}
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] p-5 rounded relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#20DCC5]/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-[10px] font-mono text-[#607874] tracking-widest uppercase">TOTAL SCANS</span>
                <Activity className="w-4 h-4 text-[#20DCC5]/70" />
              </div>
              <div className="text-3xl font-mono text-[#F2F7F5] tracking-wider relative z-10">
                {loading ? '--' : String(dashboardStats.total_scans).padStart(3, '0')}
              </div>
              <div className="mt-2 text-[9px] text-[#20DCC5]/50 font-mono uppercase tracking-widest">
                AGGREGATED TELEMETRY
              </div>
            </div>

            {/* Metric 2 */}
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] p-5 rounded relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#20DCC5]/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-[10px] font-mono text-[#607874] tracking-widest uppercase">DETECTED TARGETS</span>
                <Target className="w-4 h-4 text-[#20DCC5]/70" />
              </div>
              <div className="text-3xl font-mono text-[#F2F7F5] tracking-wider relative z-10">
                {loading ? '--' : String(dashboardStats.total_targets).padStart(3, '0')}
              </div>
              <div className="mt-2 text-[9px] text-[#20DCC5]/50 font-mono uppercase tracking-widest">
                VERIFIED SIGNATURES
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-red-500/30 p-5 rounded relative overflow-hidden group shadow-[inset_0_0_20px_rgba(239,68,68,0.02)]">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <span className="text-[10px] font-mono text-red-500/70 tracking-widest uppercase">CRITICAL THREATS</span>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-3xl font-mono text-red-500 tracking-wider relative z-10">
                {loading ? '--' : String(dashboardStats.critical_threats).padStart(2, '0')}
              </div>
              <div className="mt-2 text-[9px] text-red-500/50 font-mono uppercase tracking-widest">
                HIGH RISK CLASSIFICATIONS
              </div>
            </div>
          </div>

          {/* Tactical Visualizer */}
          <GlassPanel className="p-0 flex-1 relative flex flex-col overflow-hidden border border-[rgba(32,220,197,0.18)]" borderTop>
            <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center z-20">
              <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Terminal className="w-3 h-3 text-[#20DCC5]" /> TACTICAL VISUALIZER
              </h3>
              <div className="flex gap-2">
                <button onClick={() => navigate('/map')} className="text-[9px] font-mono tracking-widest text-[#607874] hover:text-[#20DCC5] uppercase transition-colors">
                  OPEN SURVEY VISUALIZATION
                </button>
              </div>
            </div>

            <div className="flex-1 relative bg-[rgba(1,12,15,0.78)] flex items-center justify-center overflow-hidden">
              {/* Radar Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(32,220,197,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(32,220,197,0.07)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
              
              <div className="relative w-[250px] h-[250px] md:w-[350px] md:h-[350px]">
                <div className="absolute inset-0 rounded-full border border-[rgba(32,220,197,0.18)]" />
                <div className="absolute inset-[25%] rounded-full border border-[rgba(32,220,197,0.30)] border-dashed" />
                <div className="absolute inset-[50%] rounded-full border border-[rgba(32,220,197,0.40)]" />
                
                {/* Axis lines */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[rgba(32,220,197,0.20)] -translate-x-1/2" />
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-[rgba(32,220,197,0.20)] -translate-y-1/2" />
                
                {/* Sweeper */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 5, ease: "linear", repeat: Infinity }}
                  className="absolute inset-0 rounded-full origin-center"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 75%, rgba(32, 220, 197, 0.12) 100%)'
                  }}
                />

                {/* Status Dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#20DCC5] rounded-full shadow-[0_0_15px_rgba(40,224,196,0.8)]" />
                
                {/* Abstract Data Nodes based on history */}
                {history.map((scan, i) => {
                  if (i > 3) return null;
                  const isHighRisk = scan.analysis?.risk_level === 'HIGH' || scan.analysis?.risk_level === 'CRITICAL';
                  const posClass = [
                    "top-[20%] left-[30%]", 
                    "top-[60%] left-[70%]", 
                    "top-[40%] left-[80%]", 
                    "top-[70%] left-[25%]"
                  ][i];
                  return (
                    <div key={i} className={`absolute ${posClass} w-2 h-2 rounded-full ${isHighRisk ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-[#20DCC5] shadow-[0_0_10px_rgba(40,224,196,0.5)]'} animate-pulse`} />
                  );
                })}
              </div>
            </div>
          </GlassPanel>

        </motion.div>

        {/* Right Column: Mission Control & Archive */}
        <motion.div variants={item} className="lg:col-span-4 flex flex-col gap-6 min-h-0">
          
          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/40 flex justify-between items-center">
              <h3 className="text-[10px] font-mono tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                <Clock className="w-3 h-3 text-[#20DCC5]" /> RECENT INTELLIGENCE
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-full text-[#607874] font-mono text-[10px] tracking-widest uppercase py-10">
                  <Activity className="w-4 h-4 animate-spin mr-2" /> ACCESSING DATABASE...
                </div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[#607874] font-mono text-[10px] tracking-widest uppercase py-10">
                  NO SCANS DETECTED
                </div>
              ) : (
                <div className="divide-y divide-[#0F6F70]/50">
                  {history.map((scan) => (
                    <div 
                      key={scan.scan_id}
                      onClick={() => navigate(`/results/${scan.scan_id}`)}
                      className="p-4 hover:bg-[#20DCC5]/10 cursor-pointer transition-colors group flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono text-xs text-[#F2F7F5] font-bold tracking-widest group-hover:text-[#20DCC5] transition-colors">
                            {scan.scan_id}
                          </div>
                          <div className="font-mono text-[9px] text-[#607874] tracking-widest mt-1 truncate max-w-[150px] uppercase">
                            {scan.filename}
                          </div>
                        </div>
                        {scan.analysis?.risk_level && (
                          <RiskBadge level={scan.analysis.risk_level} />
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="font-mono text-[9px] text-[#20DCC5]/50 tracking-widest flex items-center gap-1">
                          <Target className="w-3 h-3" /> {(scan.detections || []).length} TARGETS
                        </span>
                        <span className="font-mono text-[9px] text-[#607874] tracking-widest">
                          {new Date(scan.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-[rgba(32,220,197,0.18)] bg-black/40">
              <button 
                onClick={() => navigate('/history')}
                className="w-full py-2 text-[10px] font-mono tracking-widest text-[#A8BDB9] hover:text-[#20DCC5] transition-colors uppercase border border-transparent hover:border-[#20DCC5]/30 rounded bg-[#20DCC5]/5"
              >
                VIEW MISSION LOG
              </button>
            </div>
          </div>

          <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded p-4">
            <h3 className="text-[10px] font-mono tracking-widest text-[#A8BDB9] uppercase mb-4 border-b border-[rgba(32,220,197,0.18)] pb-2">
              SYSTEM DIAGNOSTICS
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                <span className="text-[#607874]">AI ENGINE</span>
                <span className="text-[#20DCC5]">YOLO11N-SONAR</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                <span className="text-[#607874]">ACCELERATION</span>
                <span className="text-[#20DCC5]">CUDA ACTIVE</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                <span className="text-[#607874]">RISK ENGINE</span>
                <span className="text-[#D6A84F]">HEURISTIC v2</span>
              </div>
              <button 
                onClick={() => navigate('/analytics')}
                className="w-full mt-4 py-2 text-[9px] font-mono tracking-widest text-[#607874] hover:text-[#F2F7F5] transition-colors uppercase border border-[rgba(32,220,197,0.18)] hover:border-gray-500 rounded"
              >
                FULL TELEMETRY
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
}
