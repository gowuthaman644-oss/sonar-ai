import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, getHistory } from '../services/api';
import { Target, Activity, Database, CheckCircle, PlusSquare, Network, Cpu } from 'lucide-react';

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
        setHistory(historyData.slice(0, 5)); // Just take top 5 for recent
      } catch (err) {
        console.error("Error loading dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 h-full flex flex-col">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-sonar-border pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-white">COMMAND CENTER</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">
            LIVE SONAR INTELLIGENCE PLATFORM
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-6 text-xs font-mono tracking-widest">
          <div className="flex flex-col items-end">
            <span className="text-gray-500 mb-1">SYSTEM STATUS</span>
            <span className="text-sonar-cyan flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sonar-cyan animate-pulse"></span> ONLINE
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-gray-500 mb-1">AI ENGINE</span>
            <span className="text-sonar-cyan flex items-center gap-2">
              <CheckCircle className="w-3 h-3" /> READY
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Left Column: Visual Radar & Action */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Sonar Monitor Visualizer */}
          <div className="glass-panel p-2 flex-1 min-h-[400px] relative flex flex-col overflow-hidden shadow-[0_0_30px_rgba(0,240,255,0.05)] border-t-2 border-t-sonar-cyan/50">
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1">
              <span className="text-xs font-mono tracking-widest text-sonar-cyan bg-black/60 px-2 py-1 border border-sonar-cyan/30 backdrop-blur inline-block w-fit">
                LIVE SONAR MONITOR
              </span>
              <span className="text-[10px] font-mono tracking-widest text-gray-500">
                DECORATIVE UI VISUALIZATION
              </span>
            </div>

            {/* Radar Animation Area */}
            <div className="absolute inset-0 bg-[#02050A] overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
              
              <div className="relative w-[300px] h-[300px] md:w-[450px] md:h-[450px]">
                {/* Concentric Rings */}
                <div className="absolute inset-0 rounded-full border border-sonar-cyan/20"></div>
                <div className="absolute inset-[15%] rounded-full border border-sonar-cyan/30"></div>
                <div className="absolute inset-[30%] rounded-full border border-sonar-cyan/40"></div>
                <div className="absolute inset-[45%] rounded-full border border-sonar-cyan/50"></div>
                
                {/* Crosshairs */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-sonar-cyan/20 -translate-x-1/2"></div>
                <div className="absolute left-0 right-0 top-1/2 h-px bg-sonar-cyan/20 -translate-y-1/2"></div>
                
                {/* Radar Sweep */}
                <div className="absolute inset-0 rounded-full radar-sweep"></div>

                {/* Decorative Targets (UI only) */}
                <div className="absolute top-[30%] left-[60%] w-2 h-2 bg-sonar-cyan rounded-full shadow-[0_0_10px_rgba(0,240,255,1)] animate-ping"></div>
                <div className="absolute top-[70%] left-[40%] w-1.5 h-1.5 bg-gray-400 rounded-full opacity-50"></div>
                <div className="absolute top-[45%] left-[25%] w-1 h-1 bg-sonar-cyan rounded-full shadow-[0_0_5px_rgba(0,240,255,0.8)] animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Main Action Button */}
          <button 
            onClick={() => navigate('/scan')}
            className="w-full sonar-button-primary py-6 text-lg tracking-[0.3em] flex items-center justify-center gap-4 group"
          >
            <PlusSquare className="w-6 h-6 group-hover:scale-110 transition-transform" /> 
            NEW SONAR SCAN
          </button>
        </div>

        {/* Right Column: Stats & History */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-center group hover:border-sonar-cyan/50 transition-colors">
              <Database className="w-6 h-6 text-sonar-cyan mb-4 group-hover:scale-110 transition-transform opacity-50" />
              <span className="text-[10px] font-mono tracking-widest text-gray-500 mb-2 uppercase">TOTAL SCANS</span>
              <span className="text-4xl font-light text-white tracking-widest">
                {loading ? '--' : String(stats?.total_scans || 0).padStart(2, '0')}
              </span>
            </div>
            
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-center group hover:border-sonar-cyan/50 transition-colors">
              <Network className="w-6 h-6 text-sonar-cyan mb-4 group-hover:scale-110 transition-transform opacity-50" />
              <span className="text-[10px] font-mono tracking-widest text-gray-500 mb-2 uppercase">DATABASE</span>
              <span className="text-lg font-bold text-white tracking-widest mt-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-risk-low" /> CONNECTED
              </span>
            </div>
          </div>
          
          <div className="glass-panel p-6 flex flex-col items-center justify-center text-center group hover:border-sonar-cyan/50 transition-colors">
             <Cpu className="w-6 h-6 text-sonar-cyan mb-4 opacity-50" />
             <span className="text-[10px] font-mono tracking-widest text-gray-500 mb-2 uppercase">AI MODEL</span>
             <span className="text-xl font-mono tracking-widest text-white mt-1">YOLO11n</span>
             <span className="text-[10px] font-mono tracking-widest text-sonar-cyan uppercase mt-2">NVIDIA CUDA ENGINE</span>
          </div>

          {/* Recent Scans */}
          <div className="glass-panel flex-1 flex flex-col overflow-hidden border-t-2 border-t-sonar-border">
            <div className="p-4 border-b border-sonar-border flex justify-between items-center bg-black/40">
              <h3 className="text-xs font-mono tracking-widest text-gray-400 uppercase flex items-center gap-2">
                <Activity className="w-4 h-4" /> RECENT ANALYSES
              </h3>
              <button 
                onClick={() => navigate('/history')}
                className="text-[10px] font-mono tracking-widest text-sonar-cyan hover:text-white transition-colors"
              >
                VIEW ALL →
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-sm tracking-widest">
                  LOADING...
                </div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-500 font-mono text-sm tracking-widest">
                  NO SCANS DETECTED
                </div>
              ) : (
                <div className="divide-y divide-sonar-border/50">
                  {history.map((scan) => (
                    <div 
                      key={scan.scan_id}
                      onClick={() => navigate(`/results/${scan.scan_id}`)}
                      className="p-4 hover:bg-white/5 cursor-pointer transition-colors group flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono text-xs text-white tracking-widest group-hover:text-sonar-cyan transition-colors">
                          {scan.scan_id}
                        </div>
                        <div className="font-mono text-[10px] text-gray-500 tracking-widest mt-1 truncate max-w-[200px]">
                          {scan.filename}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-[10px] tracking-widest uppercase font-bold
                          ${scan.status === 'completed' ? 'text-risk-low' : scan.status === 'failed' ? 'text-risk-high' : 'text-risk-medium'}
                        `}>
                          {scan.status}
                        </div>
                        <div className="font-mono text-[10px] text-gray-600 tracking-widest mt-1">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
