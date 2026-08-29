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
  Wifi
} from 'lucide-react';
import { StatusBadge } from '../ui';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: Activity, label: 'COMMAND CENTER' },
    { path: '/scan', icon: Target, label: 'NEW SCAN' },
    { path: '/results', icon: Radar, label: 'LATEST RESULT' },
    { path: '/history', icon: Clock, label: 'INTELLIGENCE ARCHIVE' },
    { path: '/analytics', icon: BarChart2, label: 'SYSTEM TELEMETRY' },
    { path: '/map', icon: MapIcon, label: 'SURVEY VISUALIZATION' },
  ];

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 flex flex-col md:flex-row overflow-hidden font-sans relative">
      
      {/* Background Grid Pattern is applied in body CSS */}

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[#1A2C42] bg-[#050B14]/90 backdrop-blur z-50 relative">
        <div className="flex items-center gap-2">
          <Radar className="w-5 h-5 text-[#00F0FF] animate-[spin_4s_linear_infinite]" />
          <span className="font-bold tracking-[0.2em] text-white text-sm">SONAR-AI</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-[#00F0FF] p-2"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 w-72 bg-[#0B1422]/90 backdrop-blur-xl border-r border-[#1A2C42] transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#1A2C42] flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent opacity-50" />
          <div className="relative w-10 h-10 flex items-center justify-center bg-[#00F0FF]/10 rounded-lg border border-[#00F0FF]/30">
            <Radar className="w-6 h-6 text-[#00F0FF] animate-[spin_4s_linear_infinite]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-[0.25em] text-white text-lg leading-tight">SONAR-AI</span>
            <span className="text-[9px] font-mono tracking-[0.2em] text-[#00F0FF] uppercase mt-1">Intelligence Core v2.4</span>
          </div>
        </div>

        {/* System Telemetry */}
        <div className="p-6 border-b border-[#1A2C42] flex gap-4 overflow-hidden bg-black/20">
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                  <Cpu className="w-3 h-3 text-[#00F0FF]" /> AI ENGINE
                </div>
                <StatusBadge status="ONLINE" pulse />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                  <Database className="w-3 h-3 text-emerald-400" /> DATABASE
                </div>
                <StatusBadge status="ONLINE" pulse />
              </div>
            </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="text-[10px] font-mono tracking-widest text-gray-500 mb-4 px-2">MAIN PROTOCOLS</div>
          {navItems.map((item) => {
            // Simplify active matching
            const isActive = item.path === '/results' 
                ? location.pathname.startsWith('/results') 
                : location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
                
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3 rounded-lg text-xs font-mono tracking-widest uppercase transition-all duration-300 group relative
                  ${isActive 
                    ? 'bg-[#00F0FF]/10 text-white' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }
                `}
              >
                {isActive && (
                  <motion.div layoutId="nav-indicator" className="absolute left-0 top-0 bottom-0 w-1 bg-[#00F0FF] rounded-r shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
                )}
                <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#00F0FF]' : 'text-gray-500 group-hover:text-[#00F0FF]/70'}`} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A2C42] bg-[#02050A]">
          <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-gray-500">
            <span>SECURE CONNECTION</span>
            <Wifi className="w-3 h-3 text-emerald-500" />
          </div>
          <div className="mt-2 text-[8px] font-mono tracking-[0.2em] text-gray-600 text-center uppercase">
            RESTRICTED ACCESS • CONFIDENTIAL
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-65px)] md:h-screen overflow-hidden relative z-10">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
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
    </div>
  );
}
