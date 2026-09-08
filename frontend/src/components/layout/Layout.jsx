import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Target, 
  Clock, 
  BarChart2, 
  Map as MapIcon, 
  Menu,
  X,
  Radar,
  Database,
  Cpu,
  Wifi,
  Crosshair,
  Settings,
  FileText
} from 'lucide-react';
import { StatusBadge } from '../ui';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const location = useLocation();

  // Load UI preferences from localStorage
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('sonar_ui_preferences');
      return saved ? JSON.parse(saved) : {
        oceanBackground: true,
        reducedMotion: false,
        radarAnimation: true,
        boundingBoxes: true,
        confidenceLabels: true
      };
    } catch {
      return {
        oceanBackground: true,
        reducedMotion: false,
        radarAnimation: true,
        boundingBoxes: true,
        confidenceLabels: true
      };
    }
  });

  const updatePreference = (key, value) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    try {
      localStorage.setItem('sonar_ui_preferences', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { path: '/dashboard', icon: Activity, label: 'COMMAND DASHBOARD', sub: 'Overview' },
    { path: '/scan', icon: Crosshair, label: 'NEW SCAN', sub: 'Start New Analysis' },
    { path: '/results', icon: Target, label: 'LATEST RESULTS', sub: 'Recent Detections' },
    { path: '/history', icon: Clock, label: 'MISSION ARCHIVE', sub: 'Scan History' },
    { path: '/analytics', icon: BarChart2, label: 'ANALYTICS', sub: 'Trends & Insights' },
    { path: '/map', icon: MapIcon, label: 'SURVEY MAP', sub: 'Spatial Visualization' },
    { path: '/reports', icon: FileText, label: 'REPORTS', sub: 'Export & Documents' },
    { path: '#settings', icon: Settings, label: 'SYSTEM SETTINGS', sub: 'Configuration' }
  ];

  return (
    <div className="min-h-screen bg-transparent text-[#F2F7F5] flex flex-col md:flex-row overflow-hidden font-sans relative">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[rgba(32,220,197,0.12)] bg-[rgba(2,12,15,0.58)] backdrop-blur-[10px] z-50 relative">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-[#20DCC5] animate-[spin_4s_linear_infinite]" />
          <span className="font-bold tracking-[0.2em] text-[#F2F7F5] text-sm">SONAR-AI</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-[#20DCC5] p-2"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 w-68 bg-[rgba(2,15,17,0.85)] backdrop-blur-[12px] border-r border-[rgba(32,220,197,0.18)] transform transition-transform duration-300 ease-in-out flex flex-col shadow-[10px_0_35px_rgba(0,0,0,0.6)]
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="px-5 py-6 flex items-center gap-3.5 relative overflow-hidden border-b border-[rgba(32,220,197,0.12)]">
          <div className="relative w-10 h-10 flex items-center justify-center border border-[rgba(32,220,197,0.30)] rounded bg-[rgba(4,25,27,0.90)] shadow-[0_0_15px_rgba(32,220,197,0.15)] flex-shrink-0">
            <div className="absolute inset-1 border border-[#D6A84F]/20 rounded-sm animate-[spin_12s_linear_infinite]" />
            <Radar className="w-5 h-5 text-[#20DCC5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-[0.22em] text-[#F2F7F5] text-base leading-tight font-mono">SONAR-AI</span>
            <span className="text-[7.5px] font-mono tracking-[0.25em] text-[#20DCC5] uppercase mt-0.5">UNDERWATER INTELLIGENCE</span>
          </div>
        </div>

        {/* Section Label: Navigation */}
        <div className="px-5 pt-4 pb-1">
          <span className="text-[8px] font-mono tracking-[0.25em] text-[#607874] uppercase">MISSION CONTROLS</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = item.path === '/results' 
                ? location.pathname.startsWith('/results') 
                : location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
                
            return (
              <NavLink
                key={item.label}
                to={item.path.startsWith('#') ? '#' : item.path}
                onClick={(e) => {
                  if (item.path === '#settings') {
                    e.preventDefault();
                    setSettingsModalOpen(true);
                  } else if (item.path.startsWith('#')) {
                    e.preventDefault();
                  }
                  setMobileMenuOpen(false);
                }}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-[160ms] ease-out group relative select-none
                  ${isActive 
                    ? 'bg-gradient-to-r from-[rgba(32,220,197,0.16)] to-[rgba(32,220,197,0.03)] border border-[rgba(32,220,197,0.35)] shadow-[0_0_15px_rgba(32,220,197,0.08)]' 
                    : 'border border-transparent hover:bg-[rgba(32,220,197,0.06)] hover:border-[rgba(32,220,197,0.20)] text-[#A8BDB9]'
                  }
                `}
              >
                {isActive && (
                  <motion.div layoutId="nav-indicator" className="absolute left-0 top-2 bottom-2 w-1 bg-[#20DCC5] rounded-r shadow-[0_0_8px_rgba(32,220,197,0.8)]" />
                )}
                
                <item.icon className={`w-4 h-4 transition-colors flex-shrink-0 ${isActive ? 'text-[#20DCC5]' : 'text-[#607874] group-hover:text-[#20DCC5]'}`} />
                
                <div className="flex flex-col min-w-0">
                  <span className={`text-[11px] font-bold tracking-[0.14em] uppercase font-mono truncate ${isActive ? 'text-[#F2F7F5]' : 'text-[#A8BDB9] group-hover:text-[#F2F7F5]'}`}>
                    {item.label}
                  </span>
                  <span className={`text-[8.5px] font-mono tracking-wider truncate ${isActive ? 'text-[#20DCC5]' : 'text-[#607874]'}`}>
                    {item.sub}
                  </span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* System Status Banner */}
        <div className="px-4 py-3 border-t border-[rgba(32,220,197,0.12)] bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-mono tracking-widest text-[#A8BDB9] uppercase font-bold">SYSTEM ONLINE</span>
            </div>
            <span className="text-[8px] font-mono text-[#20DCC5] border border-[#20DCC5]/30 px-1.5 py-0.5 rounded bg-[#20DCC5]/10">YOLO11n</span>
          </div>
        </div>

        {/* Footer / Operator Profile Button */}
        <div 
          onClick={() => setOperatorModalOpen(true)}
          className="p-3.5 border-t border-[rgba(32,220,197,0.12)] flex items-center justify-between cursor-pointer hover:bg-[rgba(32,220,197,0.06)] transition-colors group select-none"
        >
           <div className="flex items-center gap-2.5">
             <div className="w-7 h-7 bg-[#D6A84F]/10 rounded flex items-center justify-center border border-[#D6A84F]/30 group-hover:border-[#D6A84F] transition-colors">
               <div className="w-1.5 h-1.5 bg-[#D6A84F] rounded-full shadow-[0_0_5px_#D6A84F]" />
             </div>
             <div className="flex flex-col">
               <span className="text-[9.5px] font-mono font-bold tracking-widest text-[#F2F7F5] uppercase group-hover:text-[#20DCC5] transition-colors">OPERATOR ACTIVE</span>
               <span className="text-[8px] text-[#607874] font-mono">MISSION CONSOLE</span>
             </div>
           </div>
           <span className="text-[8px] font-mono text-[#607874] group-hover:text-[#20DCC5] uppercase tracking-widest">&rarr;</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-65px)] md:h-screen overflow-hidden relative z-10">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SYSTEM SETTINGS MODAL */}
      <AnimatePresence>
        {settingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[rgba(4,25,27,0.92)] border border-[rgba(32,220,197,0.30)] rounded-xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-[rgba(32,220,197,0.18)] pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#20DCC5]/10 border border-[#20DCC5]/30 rounded">
                    <Settings className="w-5 h-5 text-[#20DCC5]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-[0.2em] text-[#F2F7F5] uppercase">SYSTEM SETTINGS</h2>
                    <p className="text-[9px] font-mono text-[#607874] uppercase tracking-widest">UI & TELEMETRY PREFERENCES</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSettingsModalOpen(false)}
                  className="text-[#607874] hover:text-[#F2F7F5] p-1 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 font-mono text-xs">
                {/* Toggle: Ambient Ocean Animation */}
                <div className="flex items-center justify-between p-3 bg-black/30 border border-[rgba(32,220,197,0.15)] rounded">
                  <div>
                    <div className="text-[#F2F7F5] font-bold tracking-wider uppercase text-[11px]">OCEAN AMBIENCE</div>
                    <div className="text-[9px] text-[#607874] uppercase tracking-widest">Ambient underwater background motion</div>
                  </div>
                  <button 
                    onClick={() => updatePreference('oceanBackground', !preferences.oceanBackground)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${preferences.oceanBackground ? 'bg-[#20DCC5]' : 'bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[#02090B] transition-transform ${preferences.oceanBackground ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Toggle: Reduced Motion */}
                <div className="flex items-center justify-between p-3 bg-black/30 border border-[rgba(32,220,197,0.15)] rounded">
                  <div>
                    <div className="text-[#F2F7F5] font-bold tracking-wider uppercase text-[11px]">REDUCED MOTION</div>
                    <div className="text-[9px] text-[#607874] uppercase tracking-widest">Disable UI pulse and transitions</div>
                  </div>
                  <button 
                    onClick={() => updatePreference('reducedMotion', !preferences.reducedMotion)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${preferences.reducedMotion ? 'bg-[#20DCC5]' : 'bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[#02090B] transition-transform ${preferences.reducedMotion ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Toggle: Radar Sweeper */}
                <div className="flex items-center justify-between p-3 bg-black/30 border border-[rgba(32,220,197,0.15)] rounded">
                  <div>
                    <div className="text-[#F2F7F5] font-bold tracking-wider uppercase text-[11px]">RADAR SWEEPER</div>
                    <div className="text-[9px] text-[#607874] uppercase tracking-widest">Tactical visualizer continuous sweep</div>
                  </div>
                  <button 
                    onClick={() => updatePreference('radarAnimation', !preferences.radarAnimation)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${preferences.radarAnimation ? 'bg-[#20DCC5]' : 'bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[#02090B] transition-transform ${preferences.radarAnimation ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Toggle: Bounding Box Labels */}
                <div className="flex items-center justify-between p-3 bg-black/30 border border-[rgba(32,220,197,0.15)] rounded">
                  <div>
                    <div className="text-[#F2F7F5] font-bold tracking-wider uppercase text-[11px]">CONFIDENCE LABELS</div>
                    <div className="text-[9px] text-[#607874] uppercase tracking-widest">Display confidence % on target tags</div>
                  </div>
                  <button 
                    onClick={() => updatePreference('confidenceLabels', !preferences.confidenceLabels)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${preferences.confidenceLabels ? 'bg-[#20DCC5]' : 'bg-gray-700'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-[#02090B] transition-transform ${preferences.confidenceLabels ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[rgba(32,220,197,0.18)] flex justify-between items-center text-[9px] font-mono text-[#607874] uppercase">
                <span>PREFERENCES SAVED LOCALLY</span>
                <button 
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-4 py-2 bg-[#20DCC5] text-[#02090B] font-bold rounded hover:bg-[#20DCC5]/90 transition-colors uppercase tracking-widest"
                >
                  APPLY
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OPERATOR PROFILE MODAL */}
      <AnimatePresence>
        {operatorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[rgba(4,25,27,0.92)] border border-[rgba(32,220,197,0.30)] rounded-xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden backdrop-blur-md"
            >
              <div className="flex items-center justify-between border-b border-[rgba(32,220,197,0.18)] pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#D6A84F]/10 border border-[#D6A84F]/30 rounded-full flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-[#D6A84F] rounded-full shadow-[0_0_8px_#D6A84F]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold tracking-[0.2em] text-[#F2F7F5] uppercase">OPERATOR PROFILE</h2>
                    <p className="text-[9px] font-mono text-[#20DCC5] uppercase tracking-widest">SYSTEM SESSION: ACTIVE</p>
                  </div>
                </div>
                <button 
                  onClick={() => setOperatorModalOpen(false)}
                  className="text-[#607874] hover:text-[#F2F7F5] p-1 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-2 p-3 bg-black/30 border border-[rgba(32,220,197,0.15)] rounded">
                  <div className="text-[#607874] uppercase text-[9px] tracking-widest">USER ROLE</div>
                  <div className="text-[#F2F7F5] text-right font-bold tracking-wider uppercase">OPERATOR</div>

                  <div className="text-[#607874] uppercase text-[9px] tracking-widest">SYSTEM STATUS</div>
                  <div className="text-emerald-400 text-right font-bold uppercase flex items-center justify-end gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> OPERATIONAL
                  </div>

                  <div className="text-[#607874] uppercase text-[9px] tracking-widest">AI ENGINE</div>
                  <div className="text-[#20DCC5] text-right font-bold">YOLO11n</div>

                  <div className="text-[#607874] uppercase text-[9px] tracking-widest">RISK ENGINE</div>
                  <div className="text-[#D6A84F] text-right font-bold">HEURISTIC V2</div>

                  <div className="text-[#607874] uppercase text-[9px] tracking-widest">STORAGE</div>
                  <div className="text-[#F2F7F5] text-right">SQLite Local DB</div>

                  <div className="text-[#607874] uppercase text-[9px] tracking-widest">UI THEME</div>
                  <div className="text-[#20DCC5] text-right font-bold">Ocean Intelligence</div>
                </div>

                <div className="p-3 bg-[rgba(32,220,197,0.05)] border border-[rgba(32,220,197,0.18)] rounded text-[9px] text-[#A8BDB9] leading-relaxed tracking-wider uppercase">
                  Connected to local SONAR-AI FastAPI backend and inference pipeline.
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[rgba(32,220,197,0.18)] flex justify-end">
                <button 
                  onClick={() => setOperatorModalOpen(false)}
                  className="px-5 py-2 bg-[#20DCC5] text-[#02090B] font-bold rounded hover:bg-[#20DCC5]/90 transition-colors uppercase tracking-widest text-xs font-mono"
                >
                  DISMISS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
