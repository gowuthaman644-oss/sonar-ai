import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory } from '../services/api';
import { 
  Search, 
  Filter, 
  Clock, 
  Activity, 
  Database, 
  Archive, 
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  Target,
  Image as ImageIcon
} from 'lucide-react';
import { GlassPanel, GlowButton, RiskBadge } from '../components/ui';

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Search, Filter, Sort States
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, CRITICAL, HIGH, MEDIUM, LOW
  const [activeSort, setActiveSort] = useState('LATEST'); // LATEST, OLDEST, HIGHEST RISK, MOST TARGETS

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

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

  // Compute stats
  const stats = useMemo(() => {
    const totalScans = history.length;
    const activeThreats = history.filter(s => s.analysis?.risk_level === 'CRITICAL' || s.analysis?.risk_level === 'HIGH').length;
    const latestScan = history.length > 0 ? new Date(history[0].created_at).toLocaleDateString() : 'N/A';
    return { totalScans, activeThreats, latestScan };
  }, [history]);

  // Client-side processing
  const processedHistory = useMemo(() => {
    let result = [...history];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(scan => {
        const idMatch = scan.scan_id?.toLowerCase().includes(term);
        const fileMatch = scan.filename?.toLowerCase().includes(term);
        const riskMatch = scan.analysis?.risk_level?.toLowerCase().includes(term);
        const classMatch = scan.detections?.some(d => d.class_name?.toLowerCase().includes(term));
        return idMatch || fileMatch || riskMatch || classMatch;
      });
    }

    // Filter
    if (activeFilter !== 'ALL') {
      result = result.filter(scan => scan.analysis?.risk_level === activeFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (activeSort === 'LATEST') return new Date(b.created_at) - new Date(a.created_at);
      if (activeSort === 'OLDEST') return new Date(a.created_at) - new Date(b.created_at);
      if (activeSort === 'HIGHEST RISK') {
        const scoreA = a.analysis?.risk_score || 0;
        const scoreB = b.analysis?.risk_score || 0;
        return scoreB - scoreA;
      }
      if (activeSort === 'MOST TARGETS') {
        const countA = a.detections?.length || 0;
        const countB = b.detections?.length || 0;
        return countB - countA;
      }
      return 0;
    });

    return result;
  }, [history, searchTerm, activeFilter, activeSort]);

  // Derived properties for UI
  const getPrimaryDetection = (scan) => {
    if (!scan.detections || scan.detections.length === 0) return { name: 'NONE', conf: 0 };
    // Sort detections by confidence descending
    const sorted = [...scan.detections].sort((a, b) => b.confidence - a.confidence);
    return { 
      name: sorted[0].class_name, 
      conf: (sorted[0].confidence * 100).toFixed(1) 
    };
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#F2F7F5] uppercase">ARCHIVE CONNECTION FAILURE</h2>
        <GlowButton onClick={fetchHistory} className="px-8 py-3">RETRY CONNECTION</GlowButton>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 h-full flex flex-col font-sans">
      
      {/* --- HEADER --- */}
      <motion.div variants={item} className="flex flex-col border-b border-[rgba(32,220,197,0.18)] pb-6 mb-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="h-10 w-10 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded">
                <Database className="w-5 h-5 text-[#20DCC5]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] uppercase text-[#F2F7F5] shadow-black drop-shadow-md">INTELLIGENCE ARCHIVE</h1>
            </div>
            <p className="text-[#A8BDB9] font-mono text-[10px] tracking-[0.3em] uppercase ml-14">
              MISSION SCAN HISTORY / SONAR TARGET ACQUISITION LOG
            </p>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] px-4 py-2 rounded flex flex-col items-center min-w-[100px]">
              <span className="text-[9px] font-mono tracking-widest text-[#607874] uppercase">TOTAL SCANS</span>
              <span className="text-lg font-mono text-[#F2F7F5] font-bold">{stats.totalScans}</span>
            </div>
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-red-500/30 px-4 py-2 rounded flex flex-col items-center min-w-[100px]">
              <span className="text-[9px] font-mono tracking-widest text-red-500/70 uppercase">ACTIVE THREATS</span>
              <span className="text-lg font-mono text-red-500 font-bold">{stats.activeThreats}</span>
            </div>
            <div className="bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] px-4 py-2 rounded flex flex-col items-center min-w-[100px] hidden sm:flex">
              <span className="text-[9px] font-mono tracking-widest text-[#607874] uppercase">LATEST SCAN</span>
              <span className="text-sm font-mono text-[#20DCC5] mt-1">{stats.latestScan}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* --- CONTROL BAR (Search, Filter, Sort) --- */}
      <motion.div variants={item} className="flex flex-col md:flex-row gap-4 z-20">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#607874]" />
          </div>
          <input
            type="text"
            className="w-full bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded py-3 pl-10 pr-4 text-xs font-mono text-[#F2F7F5] placeholder-gray-600 focus:outline-none focus:border-[#20DCC5]/50 transition-colors uppercase tracking-widest"
            placeholder="SEARCH ARCHIVE (ID, FILE, CLASS, RISK)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative min-w-[160px]">
          <button 
            onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setIsSortMenuOpen(false); }}
            className="w-full bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] hover:border-[#20DCC5]/40 rounded py-3 px-4 flex justify-between items-center text-xs font-mono text-[#F2F7F5] transition-colors uppercase tracking-widest"
          >
            <span className="flex items-center gap-2"><Filter className="w-4 h-4 text-[#607874]" /> {activeFilter === 'ALL' ? 'ALL RISKS' : activeFilter}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isFilterMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded overflow-hidden shadow-2xl z-30"
              >
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => { setActiveFilter(lvl); setIsFilterMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-[10px] font-mono tracking-widest uppercase transition-colors hover:bg-white/5
                      ${activeFilter === lvl ? 'text-[#20DCC5] bg-[#20DCC5]/10' : 'text-[#A8BDB9]'}
                    `}
                  >
                    {lvl === 'ALL' ? 'ALL RISK LEVELS' : lvl}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sort Dropdown */}
        <div className="relative min-w-[180px]">
          <button 
            onClick={() => { setIsSortMenuOpen(!isSortMenuOpen); setIsFilterMenuOpen(false); }}
            className="w-full bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] hover:border-[#20DCC5]/40 rounded py-3 px-4 flex justify-between items-center text-xs font-mono text-[#F2F7F5] transition-colors uppercase tracking-widest"
          >
            <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-[#607874]" /> {activeSort}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isSortMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded overflow-hidden shadow-2xl z-30"
              >
                {['LATEST', 'OLDEST', 'HIGHEST RISK', 'MOST TARGETS'].map(sort => (
                  <button
                    key={sort}
                    onClick={() => { setActiveSort(sort); setIsSortMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-[10px] font-mono tracking-widest uppercase transition-colors hover:bg-white/5
                      ${activeSort === sort ? 'text-[#20DCC5] bg-[#20DCC5]/10' : 'text-[#A8BDB9]'}
                    `}
                  >
                    {sort}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* --- ARCHIVE LIST --- */}
      <GlassPanel className="flex-1 flex flex-col p-0 overflow-hidden relative z-10" borderTop>
        
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-[rgba(32,220,197,0.18)] bg-black/60 text-[9px] font-mono tracking-widest text-[#607874] uppercase">
          <div className="col-span-1 text-center">FEED</div>
          <div className="col-span-2">SCAN ID</div>
          <div className="col-span-2">DATE / TIME</div>
          <div className="col-span-2 text-center">TARGET COUNT</div>
          <div className="col-span-2">PRIMARY TARGET</div>
          <div className="col-span-2">THREAT LEVEL</div>
          <div className="col-span-1 text-right">SCORE</div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw className="w-8 h-8 text-[#20DCC5] animate-spin mb-4" />
            <h3 className="text-sm font-mono tracking-[0.2em] text-[#20DCC5] uppercase mb-2">SYNCHRONIZING INTELLIGENCE ARCHIVE...</h3>
            <p className="text-[10px] font-mono tracking-widest text-[#607874] uppercase">Retrieving secure historical records from database</p>
          </div>
        ) : processedHistory.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Archive className="w-12 h-12 text-[#607874] mb-4 opacity-50" />
            <h3 className="text-sm font-mono tracking-[0.2em] text-[#A8BDB9] uppercase mb-2">NO HISTORICAL TELEMETRY</h3>
            <p className="text-[10px] font-mono tracking-widest text-[#607874] uppercase max-w-md mx-auto">
              {searchTerm || activeFilter !== 'ALL' 
                ? 'No scans match the current active search/filter criteria. Clear filters to view the full archive.' 
                : 'The intelligence archive is currently empty. Analyzed sonar scans will automatically populate this database.'}
            </p>
          </div>
        ) : (
          /* Data List */
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#02090B]">
            <div className="divide-y divide-[#0F6F70]/40">
              {processedHistory.map((scan) => {
                const primaryTarget = getPrimaryDetection(scan);
                const targetCount = scan.detections?.length || 0;
                
                return (
                  <motion.div 
                    variants={item}
                    key={scan.scan_id}
                    onClick={() => navigate(`/results/${scan.scan_id}`)}
                    className="group cursor-pointer hover:bg-[#20DCC5]/5 transition-all duration-300 relative border-l-2 border-transparent hover:border-[#20DCC5]"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-3 items-center">
                      
                      {/* Thumbnail Feed */}
                      <div className="hidden md:flex col-span-1 justify-center">
                        <div className="w-10 h-10 rounded border border-[rgba(32,220,197,0.18)] group-hover:border-[#20DCC5]/40 overflow-hidden relative bg-black flex items-center justify-center">
                          <img 
                            src={`/api/history/${scan.scan_id}/image`} 
                            alt="Scan Thumbnail"
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden absolute inset-0 items-center justify-center flex-col p-1 text-center bg-[#0F6F70]/30">
                            <ImageIcon className="w-3 h-3 text-[#607874] mb-0.5" />
                            <span className="text-[5px] font-mono uppercase text-[#607874]">UNAVAILABLE</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile Thumbnail & Title Row */}
                      <div className="col-span-1 md:col-span-2 flex items-center gap-3 md:block">
                        <div className="md:hidden w-12 h-12 rounded border border-[rgba(32,220,197,0.18)] overflow-hidden bg-black flex-shrink-0 relative flex items-center justify-center">
                           <img 
                            src={`/api/history/${scan.scan_id}/image`} 
                            className="w-full h-full object-cover opacity-70"
                            alt="Scan Thumbnail"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden absolute inset-0 items-center justify-center flex-col p-1 text-center bg-[#0F6F70]/30">
                            <ImageIcon className="w-4 h-4 text-[#607874]" />
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-[11px] text-gray-200 tracking-[0.1em] font-bold group-hover:text-[#20DCC5] transition-colors">
                            {scan.scan_id}
                          </div>
                          <div className="font-mono text-[9px] text-[#607874] tracking-widest mt-1 truncate max-w-[150px] uppercase" title={scan.filename}>
                            {scan.filename}
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2 md:block flex justify-between items-center text-[10px] font-mono tracking-widest uppercase">
                        <span className="md:hidden text-[#607874]">DATE: </span>
                        <div>
                          <div className="text-[#F2F7F5]">{new Date(scan.created_at).toLocaleDateString()}</div>
                          <div className="text-[#607874] mt-0.5">{new Date(scan.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2 md:text-center flex justify-between items-center text-[10px] font-mono tracking-widest uppercase">
                        <span className="md:hidden text-[#607874]">TARGETS: </span>
                        <div className="flex items-center gap-1 md:justify-center">
                          <Target className={`w-3 h-3 ${targetCount > 0 ? 'text-[#20DCC5]' : 'text-[#607874]'}`} />
                          <span className={targetCount > 0 ? 'text-[#20DCC5] font-bold' : 'text-[#607874]'}>
                            {targetCount} {targetCount === 1 ? 'TARGET' : 'TARGETS'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2 flex justify-between items-center text-[10px] font-mono tracking-widest uppercase">
                        <span className="md:hidden text-[#607874]">PRIMARY: </span>
                        <div>
                          <div className={`font-bold ${primaryTarget.name !== 'NONE' ? 'text-[#F2F7F5]' : 'text-[#607874]'}`}>{primaryTarget.name}</div>
                          {primaryTarget.name !== 'NONE' && (
                            <div className="text-[#607874] mt-0.5 text-[8px]">CONF: <span className="text-[#F2F7F5]">{primaryTarget.conf}%</span></div>
                          )}
                        </div>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2 flex justify-between items-center">
                        <span className="md:hidden text-[10px] font-mono tracking-widest uppercase text-[#607874]">RISK: </span>
                        <RiskBadge level={scan.analysis?.risk_level || 'LOW'} />
                      </div>
                      
                      <div className="col-span-1 md:col-span-1 md:text-right flex justify-between items-center">
                        <span className="md:hidden text-[10px] font-mono tracking-widest uppercase text-[#607874]">SCORE: </span>
                        <span className="font-mono text-sm tracking-wider font-bold text-[#F2F7F5] group-hover:text-[#20DCC5] transition-colors">
                          {scan.analysis?.risk_score?.toFixed(1) || '0.0'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </GlassPanel>
    </motion.div>
  );
}
