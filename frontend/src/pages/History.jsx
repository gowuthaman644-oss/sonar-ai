import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistory, getTracks, getTrackDetail } from '../services/api';
import { 
  Search, 
  Filter, 
  Activity, 
  Database, 
  Archive, 
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  Target,
  Image as ImageIcon,
  Layers,
  Info,
  ExternalLink,
  ChevronRight,
  Radio
} from 'lucide-react';
import { GlassPanel, GlowButton, RiskBadge } from '../components/ui';

export default function History() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Tab State: 'SCANS' | 'TRACKS'
  const [activeTab, setActiveTab] = useState('SCANS');

  // Persistent Tracks State
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [trackSearchTerm, setTrackSearchTerm] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [selectedTrackDetail, setSelectedTrackDetail] = useState(null);
  const [trackDetailLoading, setTrackDetailLoading] = useState(false);
  
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
      setHistory(data || []);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracks = async () => {
    setTracksLoading(true);
    try {
      const data = await getTracks();
      setTracks(data || []);
      if (data && data.length > 0 && !selectedTrackId) {
        setSelectedTrackId(data[0].track_id);
      }
    } catch (err) {
      console.error("Failed to load tracks:", err);
    } finally {
      setTracksLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchTracks();
  }, []);

  useEffect(() => {
    if (selectedTrackId) {
      setTrackDetailLoading(true);
      getTrackDetail(selectedTrackId)
        .then(res => setSelectedTrackDetail(res))
        .catch(err => {
          console.error("Failed to load track detail:", err);
          setSelectedTrackDetail(null);
        })
        .finally(() => setTrackDetailLoading(false));
    } else {
      setSelectedTrackDetail(null);
    }
  }, [selectedTrackId]);

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

  const filteredTracks = useMemo(() => {
    if (!trackSearchTerm) return tracks;
    const term = trackSearchTerm.toLowerCase();
    return tracks.filter(t => 
      t.track_id?.toLowerCase().includes(term) ||
      t.class_name?.toLowerCase().includes(term) ||
      t.status?.toLowerCase().includes(term)
    );
  }, [tracks, trackSearchTerm]);

  // Derived properties for UI
  const getPrimaryDetection = (scan) => {
    if (!scan.detections || scan.detections.length === 0) return { name: 'SEABED NOMINAL', conf: 0 };
    const sorted = [...scan.detections].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    return { 
      name: sorted[0].class_name || 'UNKNOWN', 
      conf: sorted[0].confidence != null ? (sorted[0].confidence * 100).toFixed(1) : '—'
    };
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 font-mono">
        <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
        <h2 className="text-xl font-bold tracking-[0.2em] text-[#F2F7F5] uppercase">ARCHIVE CONNECTION FAILURE</h2>
        <p className="text-xs text-[#607874] uppercase tracking-widest">Failed to communicate with SQLite intelligence store.</p>
        <GlowButton onClick={fetchHistory} className="px-8 py-3">RETRY CONNECTION</GlowButton>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 h-full flex flex-col font-sans max-w-[1680px] mx-auto pb-6">
      
      {/* --- HEADER WITH KPI CARDS --- */}
      <motion.div variants={item} className="flex flex-col border-b border-[rgba(32,220,197,0.18)] pb-5 mb-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-0">
          <div>
            <div className="flex items-center gap-3.5 mb-2">
              <div className="h-10 w-10 bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(32,220,197,0.2)]">
                <Database className="w-5 h-5 text-[#20DCC5]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-[0.15em] uppercase text-[#F2F7F5]">
                INTELLIGENCE ARCHIVE
              </h1>
            </div>
            <p className="text-[#A8BDB9] font-mono text-[10px] tracking-[0.25em] uppercase ml-14">
              HISTORICAL TELEMETRY / MISSION SCAN & PERSISTENT TRACK LOGS
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.22)] px-4 py-2.5 rounded-xl flex flex-col items-center min-w-[110px] shadow-sm">
              <span className="text-[8px] font-mono tracking-widest text-[#607874] uppercase">TOTAL SCANS</span>
              <span className="text-lg font-mono text-[#F2F7F5] font-bold mt-0.5">{stats.totalScans}</span>
            </div>
            <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-red-500/30 px-4 py-2.5 rounded-xl flex flex-col items-center min-w-[110px] shadow-sm">
              <span className="text-[8px] font-mono tracking-widest text-red-400 uppercase">ACTIVE THREATS</span>
              <span className="text-lg font-mono text-red-400 font-bold mt-0.5">{stats.activeThreats}</span>
            </div>
            <div className="bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.22)] px-4 py-2.5 rounded-xl flex flex-col items-center min-w-[110px] hidden sm:flex shadow-sm">
              <span className="text-[8px] font-mono tracking-widest text-[#607874] uppercase">LATEST SCAN</span>
              <span className="text-xs font-mono text-[#20DCC5] font-bold mt-1">{stats.latestScan}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* --- TAB SELECTOR (MISSION SCANS vs PERSISTENT TRACKS) --- */}
      <motion.div variants={item} className="flex gap-3 border-b border-[rgba(32,220,197,0.18)] pb-3">
        <button
          onClick={() => setActiveTab('SCANS')}
          className={`px-5 py-2.5 text-xs font-mono tracking-widest uppercase rounded-xl border transition-all flex items-center gap-2.5 ${
            activeTab === 'SCANS'
              ? 'bg-[#20DCC5]/15 border-[#20DCC5] text-[#20DCC5] shadow-[0_0_15px_rgba(32,220,197,0.2)] font-bold'
              : 'border-[rgba(32,220,197,0.12)] bg-black/40 text-[#A8BDB9] hover:text-[#F2F7F5] hover:border-[#20DCC5]/40'
          }`}
        >
          <Database className="w-4 h-4" />
          MISSION SCANS ({history.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('TRACKS');
            if (tracks.length === 0 && !tracksLoading) fetchTracks();
          }}
          className={`px-5 py-2.5 text-xs font-mono tracking-widest uppercase rounded-xl border transition-all flex items-center gap-2.5 ${
            activeTab === 'TRACKS'
              ? 'bg-[#20DCC5]/15 border-[#20DCC5] text-[#20DCC5] shadow-[0_0_15px_rgba(32,220,197,0.2)] font-bold'
              : 'border-[rgba(32,220,197,0.12)] bg-black/40 text-[#A8BDB9] hover:text-[#F2F7F5] hover:border-[#20DCC5]/40'
          }`}
        >
          <Layers className="w-4 h-4" />
          PERSISTENT TRACKS ({tracks.length})
        </button>
      </motion.div>

      {/* --- MISSION SCANS VIEW --- */}
      {activeTab === 'SCANS' && (
        <>
          {/* --- CONTROL BAR (Search, Filter, Sort) --- */}
          <motion.div variants={item} className="flex flex-col md:flex-row gap-3.5 z-20">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#607874]" />
              </div>
              <input
                type="text"
                className="w-full bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.22)] rounded-xl py-3 pl-10 pr-4 text-xs font-mono text-[#F2F7F5] placeholder:text-[#607874] focus:outline-none focus:border-[#20DCC5] transition-all uppercase tracking-widest"
                placeholder="SEARCH ARCHIVE (SCAN ID, FILENAME, CLASS, RISK)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative min-w-[170px]">
              <button 
                onClick={() => { setIsFilterMenuOpen(!isFilterMenuOpen); setIsSortMenuOpen(false); }}
                className="w-full bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.22)] hover:border-[#20DCC5]/50 rounded-xl py-3 px-4 flex justify-between items-center text-xs font-mono text-[#F2F7F5] transition-all uppercase tracking-widest"
              >
                <span className="flex items-center gap-2"><Filter className="w-3.5 h-3.5 text-[#20DCC5]" /> {activeFilter === 'ALL' ? 'ALL RISKS' : activeFilter}</span>
                <ChevronDown className={`w-4 h-4 text-[#607874] transition-transform ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isFilterMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#02090B] border border-[rgba(32,220,197,0.30)] rounded-xl overflow-hidden shadow-2xl z-30 font-mono"
                  >
                    {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => { setActiveFilter(lvl); setIsFilterMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[10px] tracking-widest uppercase transition-colors hover:bg-[#20DCC5]/10 flex items-center justify-between
                          ${activeFilter === lvl ? 'text-[#20DCC5] bg-[#20DCC5]/15 font-bold' : 'text-[#A8BDB9]'}
                        `}
                      >
                        <span>{lvl === 'ALL' ? 'ALL RISK LEVELS' : lvl}</span>
                        {activeFilter === lvl && <span className="w-1.5 h-1.5 rounded-full bg-[#20DCC5]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sort Dropdown */}
            <div className="relative min-w-[190px]">
              <button 
                onClick={() => { setIsSortMenuOpen(!isSortMenuOpen); setIsFilterMenuOpen(false); }}
                className="w-full bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.22)] hover:border-[#20DCC5]/50 rounded-xl py-3 px-4 flex justify-between items-center text-xs font-mono text-[#F2F7F5] transition-all uppercase tracking-widest"
              >
                <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-[#20DCC5]" /> {activeSort}</span>
                <ChevronDown className={`w-4 h-4 text-[#607874] transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isSortMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-[#02090B] border border-[rgba(32,220,197,0.30)] rounded-xl overflow-hidden shadow-2xl z-30 font-mono"
                  >
                    {['LATEST', 'OLDEST', 'HIGHEST RISK', 'MOST TARGETS'].map(sort => (
                      <button
                        key={sort}
                        onClick={() => { setActiveSort(sort); setIsSortMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-[10px] tracking-widest uppercase transition-colors hover:bg-[#20DCC5]/10 flex items-center justify-between
                          ${activeSort === sort ? 'text-[#20DCC5] bg-[#20DCC5]/15 font-bold' : 'text-[#A8BDB9]'}
                        `}
                      >
                        <span>{sort}</span>
                        {activeSort === sort && <span className="w-1.5 h-1.5 rounded-full bg-[#20DCC5]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* --- ARCHIVE LIST TABLE --- */}
          <GlassPanel className="flex-1 flex flex-col p-0 overflow-hidden relative z-10 rounded-2xl border border-[rgba(32,220,197,0.22)] shadow-[0_4px_30px_rgba(0,0,0,0.5)]" borderTop>
            
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 p-3.5 px-5 border-b border-[rgba(32,220,197,0.18)] bg-black/60 text-[9px] font-mono tracking-widest text-[#607874] uppercase">
              <div className="col-span-1 text-center">FEED</div>
              <div className="col-span-2">SCAN IDENTIFIER</div>
              <div className="col-span-2">TIMESTAMP</div>
              <div className="col-span-2 text-center">TARGETS</div>
              <div className="col-span-2">PRIMARY CONTACT</div>
              <div className="col-span-2">RISK LEVEL</div>
              <div className="col-span-1 text-right">SCORE</div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-14 text-center font-mono">
                <RefreshCw className="w-8 h-8 text-[#20DCC5] animate-spin mb-4" />
                <h3 className="text-xs tracking-[0.2em] text-[#20DCC5] uppercase mb-1.5">SYNCHRONIZING INTELLIGENCE ARCHIVE...</h3>
                <p className="text-[9px] tracking-widest text-[#607874] uppercase">Retrieving verified scan records from database</p>
              </div>
            ) : processedHistory.length === 0 ? (
              /* Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-14 text-center font-mono">
                <Archive className="w-12 h-12 text-[#607874] mb-4 opacity-50" />
                <h3 className="text-sm tracking-[0.2em] text-[#A8BDB9] uppercase mb-1.5">NO HISTORICAL TELEMETRY FOUND</h3>
                <p className="text-[10px] tracking-widest text-[#607874] uppercase max-w-md mx-auto leading-relaxed">
                  {searchTerm || activeFilter !== 'ALL' 
                    ? 'No scans match the current active search/filter criteria. Clear filters to view the full archive.' 
                    : 'The intelligence archive is currently empty. Analyzed sonar scans will automatically populate this database.'}
                </p>
              </div>
            ) : (
              /* Data List */
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#02090B]">
                <div className="divide-y divide-[rgba(32,220,197,0.10)]">
                  {processedHistory.map((scan) => {
                    const primaryTarget = getPrimaryDetection(scan);
                    const targetCount = scan.detections?.length || 0;
                    
                    return (
                      <motion.div 
                        variants={item}
                        key={scan.scan_id}
                        onClick={() => navigate(`/results/${scan.scan_id}`)}
                        className="group cursor-pointer hover:bg-[#20DCC5]/10 transition-all duration-200 relative border-l-2 border-transparent hover:border-[#20DCC5]"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-3.5 px-5 items-center">
                          
                          {/* Thumbnail Feed */}
                          <div className="hidden md:flex col-span-1 justify-center">
                            <div className="w-10 h-10 rounded-lg border border-[rgba(32,220,197,0.2)] group-hover:border-[#20DCC5] overflow-hidden relative bg-black flex items-center justify-center shadow-sm">
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
                                <ImageIcon className="w-3.5 h-3.5 text-[#607874] mb-0.5" />
                                <span className="text-[5px] font-mono uppercase text-[#607874]">OFFLINE</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Mobile Thumbnail & Title Row */}
                          <div className="col-span-1 md:col-span-2 flex items-center gap-3 md:block">
                            <div className="md:hidden w-12 h-12 rounded-lg border border-[rgba(32,220,197,0.2)] overflow-hidden bg-black flex-shrink-0 relative flex items-center justify-center">
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
                              <div className="font-mono text-xs text-[#F2F7F5] tracking-[0.05em] font-bold group-hover:text-[#20DCC5] transition-colors">
                                {scan.scan_id}
                              </div>
                              <div className="font-mono text-[9px] text-[#607874] tracking-widest mt-0.5 truncate max-w-[160px] uppercase" title={scan.filename}>
                                {scan.filename}
                              </div>
                            </div>
                          </div>
                          
                          {/* Timestamp */}
                          <div className="col-span-1 md:col-span-2 md:block flex justify-between items-center text-[9px] font-mono tracking-widest uppercase">
                            <span className="md:hidden text-[#607874]">DATE: </span>
                            <div>
                              <div className="text-[#F2F7F5]">{new Date(scan.created_at).toLocaleDateString()}</div>
                              <div className="text-[#607874] mt-0.5">{new Date(scan.created_at).toLocaleTimeString()}</div>
                            </div>
                          </div>
                          
                          {/* Target Count */}
                          <div className="col-span-1 md:col-span-2 md:text-center flex justify-between items-center text-[10px] font-mono tracking-widest uppercase">
                            <span className="md:hidden text-[#607874]">TARGETS: </span>
                            <div className="flex items-center gap-1.5 md:justify-center">
                              <Target className={`w-3.5 h-3.5 ${targetCount > 0 ? 'text-[#20DCC5]' : 'text-[#607874]'}`} />
                              <span className={targetCount > 0 ? 'text-[#20DCC5] font-bold' : 'text-[#607874]'}>
                                {targetCount} {targetCount === 1 ? 'TARGET' : 'TARGETS'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Primary Contact */}
                          <div className="col-span-1 md:col-span-2 flex justify-between items-center text-[10px] font-mono tracking-widest uppercase">
                            <span className="md:hidden text-[#607874]">PRIMARY: </span>
                            <div>
                              <div className={`font-bold ${primaryTarget.name !== 'SEABED NOMINAL' ? 'text-[#F2F7F5]' : 'text-[#607874]'}`}>{primaryTarget.name}</div>
                              {primaryTarget.name !== 'SEABED NOMINAL' && (
                                <div className="text-[#607874] mt-0.5 text-[8px]">
                                  CONF: <span className="text-[#20DCC5] font-bold">{primaryTarget.conf}%</span>
                                  {scan.detections?.some(d => d.operator_feedback) && (
                                    <span className={`ml-1.5 px-1.5 py-0.2 rounded text-[7px] font-bold border uppercase ${
                                      scan.detections.find(d => d.operator_feedback)?.operator_feedback?.decision === 'CONFIRM' ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' :
                                      scan.detections.find(d => d.operator_feedback)?.operator_feedback?.decision === 'REJECT' ? 'text-red-400 border-red-500/40 bg-red-500/10' :
                                      'text-[#D6A84F] border-[#D6A84F]/40 bg-[#D6A84F]/10'
                                    }`}>
                                      {scan.detections.find(d => d.operator_feedback)?.operator_feedback?.decision}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Risk Level */}
                          <div className="col-span-1 md:col-span-2 flex justify-between items-center">
                            <span className="md:hidden text-[10px] font-mono tracking-widest uppercase text-[#607874]">RISK: </span>
                            <RiskBadge level={scan.analysis?.risk_level || 'LOW'} />
                          </div>
                          
                          {/* Risk Score */}
                          <div className="col-span-1 md:col-span-1 md:text-right flex justify-between items-center">
                            <span className="md:hidden text-[10px] font-mono tracking-widest uppercase text-[#607874]">SCORE: </span>
                            <span className="font-mono text-sm tracking-wider font-bold text-[#F2F7F5] group-hover:text-[#20DCC5] transition-colors">
                              {scan.analysis?.risk_score != null ? Number(scan.analysis.risk_score).toFixed(1) : '—'}
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
        </>
      )}

      {/* --- PERSISTENT TRACKS VIEW --- */}
      {activeTab === 'TRACKS' && (
        <div className="flex-1 flex flex-col gap-5 min-h-0">
          {/* Control Bar for Tracks */}
          <div className="flex flex-col md:flex-row gap-3.5 z-20">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#607874]" />
              </div>
              <input
                type="text"
                className="w-full bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.22)] rounded-xl py-3 pl-10 pr-4 text-xs font-mono text-[#F2F7F5] placeholder:text-[#607874] focus:outline-none focus:border-[#20DCC5] transition-all uppercase tracking-widest"
                placeholder="SEARCH PERSISTENT TRACKS (TRK-XXXX, CLASS, STATUS)..."
                value={trackSearchTerm}
                onChange={(e) => setTrackSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={fetchTracks}
              disabled={tracksLoading}
              className="px-5 py-3 bg-[rgba(4,25,27,0.85)] backdrop-blur-[8px] border border-[rgba(32,220,197,0.22)] hover:border-[#20DCC5] rounded-xl text-xs font-mono text-[#20DCC5] flex items-center gap-2 uppercase tracking-widest transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${tracksLoading ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
          </div>

          {/* Content: Empty State vs Split Grid */}
          {tracksLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-14 text-center font-mono">
              <RefreshCw className="w-8 h-8 text-[#20DCC5] animate-spin mb-4" />
              <h3 className="text-xs tracking-[0.2em] text-[#20DCC5] uppercase mb-1.5">
                SCANNING PERSISTENT TRACKS...
              </h3>
              <p className="text-[9px] tracking-widest text-[#607874] uppercase">
                Querying multi-scan contact associations
              </p>
            </div>
          ) : filteredTracks.length === 0 ? (
            <GlassPanel className="flex-1 flex flex-col items-center justify-center p-14 text-center rounded-2xl border border-[rgba(32,220,197,0.22)] font-mono" borderTop>
              <div className="w-16 h-16 rounded-2xl bg-[#20DCC5]/10 border border-[#20DCC5]/30 flex items-center justify-center mb-4">
                <Layers className="w-8 h-8 text-[#607874]" />
              </div>
              <h3 className="text-sm font-bold tracking-[0.2em] text-[#A8BDB9] uppercase mb-1.5">
                NO PERSISTENT CONTACTS FOUND
              </h3>
              <p className="text-[10px] tracking-widest text-[#607874] uppercase max-w-md mx-auto leading-relaxed">
                {trackSearchTerm 
                  ? 'No persistent contacts match your search query.' 
                  : 'No multi-scan cross-mission tracks have been established yet in the archive.'}
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
              {/* Left Column: Track Inventory List */}
              <div className="lg:col-span-5 flex flex-col overflow-hidden bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.22)] rounded-2xl shadow-md">
                <div className="p-3.5 px-4 border-b border-[rgba(32,220,197,0.18)] bg-black/50 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold tracking-widest text-[#F2F7F5] uppercase flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#20DCC5]" /> PERSISTENT CONTACTS ({filteredTracks.length})
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                  {filteredTracks.map(trk => (
                    <div
                      key={trk.track_id}
                      onClick={() => setSelectedTrackId(trk.track_id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden font-mono ${
                        selectedTrackId === trk.track_id
                          ? 'border-[#20DCC5] bg-[#20DCC5]/15 shadow-[0_0_15px_rgba(32,220,197,0.2)]'
                          : 'border-[rgba(32,220,197,0.15)] bg-black/40 hover:border-[#20DCC5]/40'
                      }`}
                    >
                      {selectedTrackId === trk.track_id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#20DCC5] shadow-[0_0_8px_#20DCC5]" />
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#20DCC5] tracking-wider">
                            {trk.track_id}
                          </span>
                          <span className="text-xs font-bold text-[#F2F7F5] uppercase tracking-wide">
                            {trk.class_name}
                          </span>
                        </div>
                        <span className={`text-[8px] px-2 py-0.5 rounded border uppercase tracking-widest font-semibold ${
                          trk.status === 'RECURRENT'
                            ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_8px_rgba(52,211,153,0.2)]'
                            : trk.status === 'ACTIVE'
                              ? 'text-[#20DCC5] border-[#20DCC5]/40 bg-[#20DCC5]/10'
                              : 'text-[#A8BDB9] border-gray-600 bg-gray-800/40'
                        }`}>
                          {trk.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-[rgba(32,220,197,0.10)] text-[8px] uppercase tracking-wider my-1">
                        <div>
                          <span className="text-[#607874] block">OBSERVED</span>
                          <span className="text-[#F2F7F5] font-bold">
                            {trk.observation_count > 1 ? `${trk.observation_count} SCANS` : 'SINGLE PASS'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#607874] block">CONFIDENCE</span>
                          <span className="text-[#20DCC5] font-bold">
                            {trk.latest_confidence ? `${(trk.latest_confidence * (trk.latest_confidence <= 1 ? 100 : 1)).toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#607874] block">RISK</span>
                          <span className={`font-bold ${
                            trk.latest_risk === 'CRITICAL' ? 'text-red-400' :
                            trk.latest_risk === 'HIGH' ? 'text-orange-400' :
                            trk.latest_risk === 'MEDIUM' ? 'text-[#D6A84F]' : 'text-emerald-400'
                          }`}>
                            {trk.latest_risk || 'LOW'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[8px] text-[#607874] pt-1">
                        <span>LAST: {trk.last_observed ? new Date(trk.last_observed).toLocaleDateString() : 'UNKNOWN'}</span>
                        <span className="text-[#20DCC5] flex items-center gap-0.5 font-bold">
                          VIEW LOG <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Track Detail & Observation Log */}
              <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[rgba(4,25,27,0.85)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.22)] rounded-2xl shadow-md">
                {trackDetailLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-14 text-center font-mono">
                    <RefreshCw className="w-8 h-8 text-[#20DCC5] animate-spin mb-4" />
                    <span className="text-xs tracking-widest text-[#20DCC5] uppercase">
                      RETRIEVING OBSERVATION LOG FOR {selectedTrackId}...
                    </span>
                  </div>
                ) : selectedTrackDetail ? (
                  <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {/* Header Dossier */}
                    <div className="flex justify-between items-start border-b border-[rgba(32,220,197,0.18)] pb-4 font-mono">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-[#20DCC5] tracking-widest">
                            {selectedTrackDetail.track_id}
                          </h2>
                          <span className="text-base font-bold uppercase text-[#F2F7F5] tracking-wider">
                            {selectedTrackDetail.class_name}
                          </span>
                        </div>
                        <p className="text-[9px] tracking-widest text-[#607874] uppercase mt-1">
                          CROSS-MISSION PERSISTENT CONTACT PROFILE
                        </p>
                      </div>
                      <span className={`text-[9px] px-3 py-1 rounded-full border uppercase tracking-widest font-semibold ${
                        selectedTrackDetail.status === 'RECURRENT'
                          ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_8px_rgba(52,211,153,0.2)]'
                          : selectedTrackDetail.status === 'ACTIVE'
                            ? 'text-[#20DCC5] border-[#20DCC5]/40 bg-[#20DCC5]/10'
                            : 'text-[#A8BDB9] border-gray-600 bg-gray-800/40'
                      }`}>
                        {selectedTrackDetail.status}
                      </span>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div className="p-3 bg-black/50 rounded-xl border border-[rgba(32,220,197,0.12)]">
                        <span className="text-[7px] uppercase tracking-widest text-[#607874] block mb-1">TOTAL SCANS</span>
                        <span className="text-sm font-bold text-[#F2F7F5]">
                          {selectedTrackDetail.observation_count > 1 ? `${selectedTrackDetail.observation_count} SCANS` : 'SINGLE PASS'}
                        </span>
                      </div>
                      <div className="p-3 bg-black/50 rounded-xl border border-[rgba(32,220,197,0.12)]">
                        <span className="text-[7px] uppercase tracking-widest text-[#607874] block mb-1">FIRST OBSERVED</span>
                        <span className="text-xs font-bold text-[#A8BDB9]">
                          {selectedTrackDetail.first_observed ? new Date(selectedTrackDetail.first_observed).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="p-3 bg-black/50 rounded-xl border border-[rgba(32,220,197,0.12)]">
                        <span className="text-[7px] uppercase tracking-widest text-[#607874] block mb-1">LAST OBSERVED</span>
                        <span className="text-xs font-bold text-[#A8BDB9]">
                          {selectedTrackDetail.last_observed ? new Date(selectedTrackDetail.last_observed).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="p-3 bg-black/50 rounded-xl border border-[rgba(32,220,197,0.12)]">
                        <span className="text-[7px] uppercase tracking-widest text-[#607874] block mb-1">AUTHORITATIVE RISK</span>
                        <span className={`text-xs font-bold uppercase ${
                          selectedTrackDetail.latest_risk === 'CRITICAL' ? 'text-red-400' :
                          selectedTrackDetail.latest_risk === 'HIGH' ? 'text-orange-400' :
                          selectedTrackDetail.latest_risk === 'MEDIUM' ? 'text-[#D6A84F]' : 'text-emerald-400'
                        }`}>
                          {selectedTrackDetail.latest_risk || 'LOW'}
                        </span>
                      </div>
                    </div>

                    {/* Trajectories: Confidence, Evidence, Risk */}
                    <div className="p-4 rounded-xl bg-black/50 border border-[rgba(32,220,197,0.15)] space-y-3 font-mono">
                      {/* Confidence Trajectory */}
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-[#607874] block mb-1.5 font-bold">
                          CONFIDENCE TRAJECTORY:
                        </span>
                        {selectedTrackDetail.confidence_trend && selectedTrackDetail.confidence_trend.length >= 2 ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {selectedTrackDetail.confidence_trend.map((val, cIdx) => (
                              <React.Fragment key={cIdx}>
                                <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-[rgba(32,220,197,0.25)] text-[#F2F7F5] font-bold text-[10px]">
                                  {(val * (val <= 1 ? 100 : 1)).toFixed(1)}%
                                </span>
                                {cIdx < selectedTrackDetail.confidence_trend.length - 1 && (
                                  <span className="text-[#20DCC5] font-bold">→</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#607874] italic text-[8px]">
                            Single observation — multi-scan trend unavailable
                          </span>
                        )}
                      </div>

                      {/* Evidence Trajectory */}
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-[#607874] block mb-1.5 font-bold">
                          EVIDENCE TRAJECTORY:
                        </span>
                        {selectedTrackDetail.evidence_trend && selectedTrackDetail.evidence_trend.length >= 2 ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {selectedTrackDetail.evidence_trend.map((val, eIdx) => (
                              <React.Fragment key={eIdx}>
                                <span className="px-2.5 py-1 rounded-lg bg-black/70 border border-[#20DCC5]/30 text-[#20DCC5] font-bold text-[10px]">
                                  {Number(val).toFixed(1)}%
                                </span>
                                {eIdx < selectedTrackDetail.evidence_trend.length - 1 && (
                                  <span className="text-[#20DCC5] font-bold">→</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#607874] italic text-[8px]">
                            Single observation — multi-scan trend unavailable
                          </span>
                        )}
                      </div>

                      {/* Risk Trajectory */}
                      {selectedTrackDetail.risk_trend && selectedTrackDetail.risk_trend.length >= 2 && (
                        <div>
                          <span className="text-[8px] uppercase tracking-widest text-[#607874] block mb-1.5 font-bold">
                            RISK TRAJECTORY:
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {selectedTrackDetail.risk_trend.map((rVal, rIdx) => (
                              <React.Fragment key={rIdx}>
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border uppercase ${
                                  rVal === 'CRITICAL' ? 'text-red-400 border-red-500/40 bg-red-500/10' :
                                  rVal === 'HIGH' ? 'text-orange-400 border-orange-500/40 bg-orange-500/10' :
                                  rVal === 'MEDIUM' ? 'text-[#D6A84F] border-[#D6A84F]/40 bg-[#D6A84F]/10' :
                                  'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
                                }`}>
                                  {rVal}
                                </span>
                                {rIdx < selectedTrackDetail.risk_trend.length - 1 && (
                                  <span className="text-[#607874] font-bold">→</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chronological Observation Log */}
                    <div className="font-mono">
                      <h3 className="text-xs font-bold tracking-widest text-[#F2F7F5] uppercase mb-3 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-[#20DCC5]" />
                        CHRONOLOGICAL OBSERVATION LOG ({selectedTrackDetail.observations?.length || 0})
                      </h3>

                      <div className="space-y-2.5">
                        {selectedTrackDetail.observations?.map((obs) => (
                          <div
                            key={obs.detection_id}
                            className="p-3.5 rounded-xl bg-black/50 border border-[rgba(32,220,197,0.15)] hover:border-[#20DCC5]/40 transition-colors text-[9px]"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-[#20DCC5] tracking-wider uppercase flex items-center gap-1.5">
                                <Radio className="w-3 h-3 text-[#20DCC5]" /> OBSERVATION #{obs.observation_index}
                              </span>
                              <button
                                onClick={() => navigate(`/results/${obs.scan_id}`)}
                                className="text-[8px] text-[#20DCC5] hover:underline flex items-center gap-1 uppercase tracking-widest font-bold"
                              >
                                OPEN SCAN {obs.scan_id} <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8px] text-[#A8BDB9] uppercase">
                              <div>
                                <span className="text-[#607874] block">DATE / TIME</span>
                                <span className="text-[#F2F7F5]">{obs.scan_timestamp ? new Date(obs.scan_timestamp).toLocaleString() : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-[#607874] block">CLASS & CONF</span>
                                <span className="text-[#F2F7F5] font-bold">{obs.class_name} — {obs.confidence != null ? `${(obs.confidence * 100).toFixed(1)}%` : '—'}</span>
                              </div>
                              <div>
                                <span className="text-[#607874] block">OPERATOR VERIF</span>
                                <span className={`font-bold ${
                                  obs.operator_feedback?.decision === 'CONFIRM' ? 'text-emerald-400' :
                                  obs.operator_feedback?.decision === 'REJECT' ? 'text-red-400' :
                                  obs.operator_feedback?.decision === 'UNCERTAIN' ? 'text-[#D6A84F]' :
                                  'text-[#607874]'
                                }`}>
                                  {obs.operator_feedback?.decision || 'PENDING'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#607874] block">IMAGE-PLANE COORD</span>
                                <span className="text-[#20DCC5]">
                                  x:{obs.x != null ? obs.x.toFixed(1) : '—'} y:{obs.y != null ? obs.y.toFixed(1) : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technical Disclaimer Footnote */}
                    <div className="p-3.5 bg-[#D6A84F]/10 border border-[#D6A84F]/30 rounded-xl text-[8px] font-mono text-[#A8BDB9] space-y-1">
                      <div className="text-[#D6A84F] font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" /> IMAGE-PLANE SPATIAL SIMILARITY NOTE
                      </div>
                      <p className="leading-relaxed">
                        Track association uses normalized image-plane spatial similarity across historical scans.
                        Trajectory represents image-plane association across sonar scans; it does not represent geographic movement.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-14 text-center text-[#607874] font-mono">
                    <Target className="w-10 h-10 mb-3 opacity-40 text-[#20DCC5]" />
                    <span className="text-xs tracking-widest uppercase">SELECT A TRACK TO INSPECT ITS OBSERVATION LOG</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
