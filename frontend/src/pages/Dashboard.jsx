import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getStats, getHistory } from '../services/api';
import { 
  Target, 
  Activity, 
  Database, 
  CheckCircle, 
  PlusSquare, 
  Network, 
  Cpu,
  ShieldAlert,
  AlertTriangle,
  History,
  Radar
} from 'lucide-react';
import { GlassPanel, MetricCard, StatusBadge, RiskBadge, GlowButton } from '../components/ui';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, historyData] = await Promise.all([
          getStats(),
          getHistory()
        ]);
        setStats(statsData);
        setHistory(historyData.slice(0, 5));
      } catch (err) {
        console.error("Error loading dashboard data", err);
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
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="space-y-6 h-full flex flex-col"
    >
      
      {/* Top Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1A2C42] pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.25em] uppercase text-white shadow-black drop-shadow-md">COMMAND CENTER</h1>
          </div>
          <p className="text-[#00F0FF] font-mono text-xs tracking-[0.3em] uppercase">
            LIVE SONAR INTELLIGENCE PLATFORM
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Column: Visual Radar & Action */}
        <motion.div variants={item} className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Sonar Monitor Visualizer */}
          <GlassPanel className="p-2 flex-1 min-h-[400px] relative flex flex-col overflow-hidden" borderTop>
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
              <span className="text-[10px] font-mono tracking-widest text-[#00F0FF] bg-[#050B14]/80 px-2 py-1 border border-[#00F0FF]/30 backdrop-blur inline-block w-fit uppercase">
                Acoustic Field Simulator
              </span>
              <span className="text-[9px] font-mono tracking-widest text-gray-500 uppercase">
                Decorative Telemetry
              </span>
            </div>

            {/* Radar Animation Area */}
            <div className="absolute inset-0 bg-[#02050A] overflow-hidden flex items-center justify-center">
              <div className="relative w-[300px] h-[300px] md:w-[450px] md:h-[450px]">
                {/* Concentric Rings */}
                <div className="absolute inset-0 rounded-full border border-[#00F0FF]/20 shadow-[inset_0_0_50px_rgba(0,240,255,0.05)]" />
                <div className="absolute inset-[15%] rounded-full border border-[#00F0FF]/30" />
                <div className="absolute inset-[30%] rounded-full border border-[#00F0FF]/40" />
                <div className="absolute inset-[45%] rounded-full border border-[#00F0FF]/50" />
                
                {/* Crosshairs */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-gradient-to-b from-transparent via-[#00F0FF]/40 to-transparent -translate-x-1/2" />
                <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#00F0FF]/40 to-transparent -translate-y-1/2" />
                
                {/* Radar Sweep */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, ease: "linear", repeat: Infinity }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'conic-gradient(from 0deg, transparent 70%, rgba(0, 240, 255, 0.3) 100%)',
                    transformOrigin: 'center'
                  }}
                />

                {/* Decorative Targets (UI only) */}
                <div className="absolute top-[30%] left-[60%] w-2 h-2 bg-[#00F0FF] rounded-full shadow-[0_0_15px_rgba(0,240,255,1)] animate-ping" />
                <div className="absolute top-[70%] left-[40%] w-1.5 h-1.5 bg-emerald-400 rounded-full opacity-50 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <div className="absolute top-[45%] left-[25%] w-1 h-1 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse" />
              </div>
            </div>
          </GlassPanel>
          
          {/* Main Action Button */}
          <GlowButton 
            primary
            onClick={() => navigate('/scan')}
            className="w-full py-6 text-sm tracking-[0.4em]"
          >
            <PlusSquare className="w-5 h-5" /> 
            INITIALIZE NEW SCAN
          </GlowButton>
        </motion.div>

        {/* Right Column: Stats & History */}
        <motion.div variants={item} className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
              title="TOTAL SCANS"
              value={loading ? '--' : String(stats?.total_scans || 0).padStart(3, '0')}
              icon={Activity}
              glow
            />
            <MetricCard 
              title="DETECTIONS"
              value={loading ? '--' : String(stats?.total_detections || 0).padStart(3, '0')}
              icon={Target}
            />
          </div>
          
          <MetricCard 
              title="CRITICAL THREATS"
              value={loading ? '--' : String(stats?.high_risk_scans || 0).padStart(2, '0')}
              icon={AlertTriangle}
              className="border-red-500/30"
          />

          {/* Recent Scans */}
          <GlassPanel className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#1A2C42] flex justify-between items-center bg-black/20">
              <h3 className="text-[10px] font-mono tracking-widest text-gray-400 uppercase flex items-center gap-2">
                <History className="w-3 h-3" /> RECENT ARCHIVE
              </h3>
              <button 
                onClick={() => navigate('/history')}
                className="text-[10px] font-mono tracking-widest text-[#00F0FF] hover:text-white transition-colors uppercase"
              >
                VIEW FULL ARCHIVE →
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-[10px] tracking-[0.2em] uppercase">
                  ACCESSING DATABASE...
                </div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-[10px] tracking-[0.2em] uppercase">
                  NO SCANS DETECTED
                </div>
              ) : (
                <div className="divide-y divide-[#1A2C42]/50">
                  {history.map((scan) => (
                    <div 
                      key={scan.scan_id}
                      onClick={() => navigate(`/results/${scan.scan_id}`)}
                      className="p-4 hover:bg-[#00F0FF]/5 cursor-pointer transition-colors group flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono text-xs text-gray-200 tracking-widest group-hover:text-[#00F0FF] transition-colors">
                          {scan.scan_id}
                        </div>
                        <div className="font-mono text-[9px] text-gray-500 tracking-widest mt-1 truncate max-w-[180px] uppercase">
                          {scan.filename}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {scan.analysis?.risk_level && (
                          <RiskBadge level={scan.analysis.risk_level} />
                        )}
                        <div className="font-mono text-[9px] text-gray-600 tracking-widest">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassPanel>
          
        </motion.div>
      </div>
    </motion.div>
  );
}
