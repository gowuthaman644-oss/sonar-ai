import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory } from '../services/api';
import { Search, Filter, Clock, ArrowRight, Activity, Database } from 'lucide-react';

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

  return (
    <div className="space-y-6 animate-in fade-in duration-700 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-sonar-border pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-white">SCAN HISTORY</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">
            INTELLIGENCE DATABASE ARCHIVE
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-sonar-cyan transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH ID OR FILE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-black/40 border border-sonar-border text-white text-xs font-mono tracking-widest px-10 py-3 rounded focus:outline-none focus:border-sonar-cyan focus:ring-1 focus:ring-sonar-cyan w-64 transition-all"
            />
          </div>
          <button className="sonar-button text-xs py-3 px-4 flex items-center gap-2">
            <Filter className="w-4 h-4" /> STATUS: ALL
          </button>
        </div>
      </div>

      <div className="glass-panel flex-1 overflow-hidden flex flex-col border-t-2 border-t-sonar-border">
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-sonar-border bg-black/60 text-[10px] font-mono tracking-widest text-gray-500 uppercase">
          <div className="col-span-3">SCAN ID</div>
          <div className="col-span-4">SOURCE FILE</div>
          <div className="col-span-2">STATUS</div>
          <div className="col-span-2">TIMESTAMP</div>
          <div className="col-span-1 text-right">ACTION</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-sonar-cyan font-mono text-sm tracking-widest gap-4">
               <Database className="w-8 h-8 animate-pulse opacity-50" />
               LOADING ARCHIVE...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 font-mono text-sm tracking-widest space-y-4">
              <Activity className="w-8 h-8 opacity-20" />
              <p>NO INTELLIGENCE RECORDS FOUND</p>
            </div>
          ) : (
            <div className="divide-y divide-sonar-border/30">
              {filteredHistory.map((scan) => {
                let statusColor = 'text-gray-400';
                if (scan.status === 'completed') statusColor = 'text-risk-low';
                if (scan.status === 'failed') statusColor = 'text-risk-high';
                if (scan.status === 'analyzing') statusColor = 'text-risk-medium';

                return (
                  <div 
                    key={scan.scan_id}
                    onClick={() => navigate(`/results/${scan.scan_id}`)}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-sonar-cyan/5 hover:border-l-2 hover:border-l-sonar-cyan border-l-2 border-l-transparent cursor-pointer transition-all group"
                  >
                    <div className="col-span-3 font-mono text-sm font-bold text-white tracking-widest group-hover:text-sonar-cyan transition-colors">
                      {scan.scan_id}
                    </div>
                    <div className="col-span-4 font-mono text-xs text-gray-400 truncate pr-4">
                      {scan.filename}
                    </div>
                    <div className={`col-span-2 font-mono text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-current ${scan.status === 'analyzing' ? 'animate-ping' : ''}`}></span>
                      {scan.status}
                    </div>
                    <div className="col-span-2 font-mono text-[10px] text-gray-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {new Date(scan.created_at).toLocaleString()}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-sonar-cyan group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
