import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getStats, getHistory } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, AlertTriangle, Activity, Database, Lock, TrendingUp } from 'lucide-react';
import { GlassPanel, MetricCard, SectionHeader, StatusBadge } from '../components/ui';

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

  const activityMap = {};
  history.forEach(scan => {
    const d = new Date(scan.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    activityMap[d] = (activityMap[d] || 0) + 1;
  });
  
  const trendData = Object.keys(activityMap).map(date => ({
    name: date,
    payloads: activityMap[date]
  })).reverse();

  if (trendData.length === 0) {
    trendData.push({ name: 'N/A', payloads: 0 });
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-6 h-full flex flex-col pb-10"
    >
      
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1A2C42] pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.25em] uppercase text-white shadow-black drop-shadow-md">SYSTEM TELEMETRY</h1>
          </div>
          <p className="text-[#00F0FF] font-mono text-xs tracking-[0.3em] uppercase">
            INTELLIGENCE OPERATIONS ANALYTICS
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          title="TOTAL PAYLOADS"
          value={loading ? '--' : String(stats?.total_scans || 0).padStart(3, '0')}
          icon={Activity}
          glow
        />
        <MetricCard 
          title="DETECTED ENTITIES"
          value={loading ? '--' : String(stats?.total_detections || 0).padStart(3, '0')}
          icon={Target}
        />
        <MetricCard 
          title="CRITICAL RISKS"
          value={loading ? '--' : String(stats?.high_risk_scans || 0).padStart(2, '0')}
          icon={AlertTriangle}
          className="border-red-500/30"
        />
        <GlassPanel className="p-6 flex flex-col items-center justify-center bg-black/40 border-dashed border-[#1A2C42] border-2">
          <Lock className="w-5 h-5 text-gray-600 mb-2" />
          <h3 className="text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase text-center mt-2">
            ADVANCED METRICS<br/>RESTRICTED
          </h3>
        </GlassPanel>
      </motion.div>

      <motion.div variants={itemVariants} className="flex-1 min-h-[400px]">
        <GlassPanel className="p-6 h-full flex flex-col" borderTop>
          <div className="flex items-center justify-between mb-8">
            <SectionHeader icon={TrendingUp} title="ACTIVITY TRENDS" subtitle="Historical Payload Volume" />
            <StatusBadge status="LIVE" pulse />
          </div>
          
          <div className="flex-1 w-full bg-black/20 rounded-lg p-4 border border-[#1A2C42]/50">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  stroke="#1A2C42" 
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }} 
                  axisLine={{ stroke: '#1A2C42' }}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#1A2C42" 
                  tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'monospace' }} 
                  allowDecimals={false}
                  axisLine={{ stroke: '#1A2C42' }}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(11, 20, 34, 0.9)', 
                      borderColor: '#00F0FF', 
                      borderWidth: '1px',
                      color: '#fff', 
                      fontFamily: 'monospace', 
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      borderRadius: '4px',
                      boxShadow: '0 0 20px rgba(0, 240, 255, 0.2)'
                    }}
                    itemStyle={{ color: '#00F0FF' }}
                    cursor={{ stroke: '#00F0FF', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="payloads" 
                  stroke="#00F0FF" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#scanGrad)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </motion.div>
      
    </motion.div>
  );
}
