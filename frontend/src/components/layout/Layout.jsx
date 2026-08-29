import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Target, 
  Clock, 
  BarChart2, 
  Map as MapIcon, 
  FileText,
  Menu,
  X,
  Radar
} from 'lucide-react';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', icon: Activity, label: 'COMMAND CENTER' },
    { path: '/scan', icon: Target, label: 'NEW SCAN' },
    { path: '/history', icon: Clock, label: 'SCAN HISTORY' },
    { path: '/analytics', icon: BarChart2, label: 'ANALYTICS' },
    { path: '/map', icon: MapIcon, label: 'SONAR MAP' },
    { path: '/reports', icon: FileText, label: 'REPORTS' },
  ];

  return (
    <div className="min-h-screen bg-[#02050A] text-gray-200 flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-sonar-border bg-[#050B14] z-20 relative">
        <div className="flex items-center gap-2">
          <Radar className="w-6 h-6 text-sonar-cyan" />
          <span className="font-bold tracking-widest text-white">SONAR-AI</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-400 hover:text-white"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-30 w-64 bg-[#050B14] border-r border-sonar-border transform transition-transform duration-300 ease-in-out flex flex-col
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-sonar-border flex items-center gap-3">
          <Radar className="w-8 h-8 text-sonar-cyan" />
          <div className="flex flex-col">
            <span className="font-bold tracking-[0.2em] text-white text-lg">SONAR-AI</span>
            <span className="text-[9px] font-mono tracking-widest text-sonar-cyan uppercase">System Online</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3 rounded text-xs font-mono tracking-widest uppercase transition-all duration-200 group
                  ${isActive 
                    ? 'bg-sonar-cyan/10 text-sonar-cyan border-l-2 border-sonar-cyan shadow-[inset_20px_0_20px_-20px_rgba(0,240,255,0.3)]' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border-l-2 border-transparent'
                  }
                `}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-sonar-cyan' : 'text-gray-500 group-hover:text-gray-400'}`} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sonar-border/50 text-[9px] font-mono text-gray-600 tracking-widest text-center">
          SONAR INTELLIGENCE ENGINE V1.0<br/>
          AUTHORIZED PERSONNEL ONLY
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-65px)] md:h-screen overflow-hidden relative">
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 scroll-smooth">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </div>
  );
}
