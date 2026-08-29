import React, { useEffect, useState } from 'react';
import { getStats, getHistory } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, AlertTriangle, Activity, Database, Lock } from 'lucide-react';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, h] = await Promise.all([getStats(), getHistory()]);
        setStats(s);
        setHistory(h);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Derive scan activity over time based on history dates (mocking the Y-axis just as an activity count to use real dates)
  const activityMap = {};
  history.forEach(scan => {
    const d = new Date(scan.created_at).toLocaleDateString();
    activityMap[d] = (activityMap[d] || 0) + 1;
  });
  
  const trendData = Object.keys(activityMap).map(date => ({
    name: date,
    scans: activityMap[date]
  })).reverse();

  if (trendData.length === 0) {
    trendData.push({ name: 'N/A', scans: 0 });
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-10 flex flex-col h-full">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-sonar-border pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-white">SYSTEM ANALYTICS</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">
            INTELLIGENCE TELEMETRY
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-8 flex flex-col items-center justify-center border-t-2 border-t-sonar-cyan">
          <h3 className="text-[10px] font-mono tracking-widest text-gray-500 mb-2 uppercase">TOTAL SCANS PROCESSED</h3>
          <div className="text-5xl font-light text-white tracking-widest">{stats?.total_scans || 0}</div>
        </div>
        <div className="glass-panel p-8 flex flex-col items-center justify-center border-t-2 border-t-sonar-border">
          <h3 className="text-[10px] font-mono tracking-widest text-gray-500 mb-2 uppercase">DATABASE STATUS</h3>
          <div className="text-2xl font-bold text-risk-low tracking-widest flex items-center gap-2 mt-2">
             <Database className="w-6 h-6" /> ONLINE
          </div>
        </div>
        <div className="glass-panel p-8 flex flex-col items-center justify-center bg-black/40 border border-dashed border-sonar-border/50">
          <Lock className="w-6 h-6 text-gray-600 mb-2" />
          <h3 className="text-[10px] font-mono tracking-widest text-gray-500 uppercase text-center mt-2">
            ADVANCED TELEMETRY<br/>RESTRICTED
          </h3>
        </div>
      </div>

      <div className="glass-panel p-6 flex flex-col h-[400px]">
        <h3 className="text-xs font-mono tracking-widest text-sonar-cyan mb-6 uppercase flex items-center gap-2">
          <Activity className="w-4 h-4" /> SCAN ACTIVITY TREND
        </h3>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#1A2C42" tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }} />
              <YAxis stroke="#1A2C42" tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'monospace' }} allowDecimals={false} />
              <Tooltip 
                  contentStyle={{ backgroundColor: '#0B1422', borderColor: '#00F0FF', color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}
                  itemStyle={{ color: '#00F0FF' }}
              />
              <Area type="step" dataKey="scans" stroke="#00F0FF" strokeWidth={2} fillOpacity={1} fill="url(#scanGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );
}
