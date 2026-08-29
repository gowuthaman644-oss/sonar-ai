import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getHistory } from '../services/api';
import { Search, Filter, Clock, ArrowRight, Activity, Database, Archive } from 'lucide-react';
import { GlassPanel, GlowButton, StatusBadge, RiskBadge } from '../components/ui';

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await getHistory();
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(scan => 
    scan.scan_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scan.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scan.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="space-y-6 h-full flex flex-col max-w-[1400px] mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1A2C42] pb-6 mb-2"
      >
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.25em] uppercase text-white drop-shadow-md">INTELLIGENCE ARCHIVE</h1>
          </div>
          <p className="text-[#00F0FF] font-mono text-xs tracking-[0.3em] uppercase">
            HISTORICAL SECURE DATABASE
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#00F0FF] transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH PAYLOAD ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-[#1A2C42] text-white text-[10px] uppercase font-mono tracking-widest px-10 py-3 rounded-lg focus:outline-none focus:border-[#00F0FF]/50 focus:ring-1 focus:ring-[#00F0FF]/30 w-64 transition-all"
            />
          </div>
          <button className="relative overflow-hidden px-4 py-3 bg-transparent border border-[#1A2C42] text-gray-400 hover:text-[#00F0FF] hover:border-[#00F0FF]/50 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all flex items-center gap-2">
            <Filter className="w-3 h-3" /> FILTER PROTOCOL
          </button>
        </div>
      </motion.div>

      <GlassPanel className="flex-1 overflow-hidden flex flex-col" borderTop>
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#1A2C42] bg-black/40 text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase backdrop-blur-md">
          <div className="col-span-3">IDENTIFIER</div>
          <div className="col-span-4">PAYLOAD SOURCE</div>
          <div className="col-span-2">THREAT LEVEL</div>
          <div className="col-span-2">TIMESTAMP</div>
          <div className="col-span-1 text-right">ACTION</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#00F0FF] font-mono text-[10px] tracking-[0.2em] gap-4">
               <Database className="w-8 h-8 animate-pulse opacity-50" />
               DECRYPTING ARCHIVE...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 font-mono text-[10px] tracking-[0.2em] space-y-4">
              <Archive className="w-8 h-8 opacity-20" />
              <p>NO INTELLIGENCE RECORDS FOUND</p>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-[#1A2C42]/50"
            >
              {filteredHistory.map((scan) => (
                <motion.div 
                  variants={itemVariants}
                  key={scan.scan_id}
                  onClick={() => navigate(`/results/${scan.scan_id}`)}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[#00F0FF]/5 hover:border-l-2 hover:border-l-[#00F0FF] border-l-2 border-l-transparent cursor-pointer transition-all group bg-black/20"
                >
                  <div className="col-span-3 font-mono text-[11px] font-bold text-gray-300 tracking-[0.2em] group-hover:text-[#00F0FF] transition-colors">
                    {scan.scan_id}
                  </div>
                  <div className="col-span-4 font-mono text-[10px] text-gray-500 tracking-widest truncate pr-4 uppercase">
                    {scan.filename}
                  </div>
                  <div className="col-span-2 flex items-center">
                    {scan.status === 'completed' && scan.analysis?.risk_level ? (
                      <RiskBadge level={scan.analysis.risk_level} />
                    ) : (
                      <StatusBadge status={scan.status} pulse={scan.status === 'analyzing'} />
                    )}
                  </div>
                  <div className="col-span-2 font-mono text-[9px] tracking-widest text-gray-500 flex items-center gap-2 uppercase">
                    <Clock className="w-3 h-3 opacity-50" />
                    {new Date(scan.created_at).toLocaleString()}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#00F0FF] group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
