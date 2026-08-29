
import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function GlassPanel({ children, className, hover = false, borderTop = false }) {
  return (
    <div className={cn(
      'bg-[#0B1422]/80 backdrop-blur-md border border-[#1A2C42] rounded-xl shadow-lg transition-all duration-300',
      hover && 'hover:border-[#00F0FF]/50 hover:shadow-[0_0_20px_rgba(0,240,255,0.15)] hover:bg-[#0B1422]/90',
      borderTop && 'border-t-2 border-t-[#00F0FF]',
      className
    )}>
      {children}
    </div>
  );
}

export function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className='flex items-center gap-3 mb-6'>
      {Icon && <Icon className='w-5 h-5 text-[#00F0FF]' />}
      <div>
        <h2 className='text-sm font-mono tracking-widest text-[#00F0FF] uppercase'>{title}</h2>
        {subtitle && <p className='text-xs font-mono text-gray-500 uppercase mt-1 tracking-widest'>{subtitle}</p>}
      </div>
    </div>
  );
}

export function MetricCard({ title, value, unit, icon: Icon, glow = false }) {
  return (
    <GlassPanel className={cn('p-6 relative overflow-hidden', glow && 'border-[#00F0FF]/30')}>
      {glow && (
        <div className='absolute -top-10 -right-10 w-32 h-32 bg-[#00F0FF]/10 blur-3xl rounded-full pointer-events-none' />
      )}
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-[10px] font-mono tracking-widest text-gray-400 uppercase'>{title}</h3>
        {Icon && <Icon className='w-4 h-4 text-[#00F0FF]/70' />}
      </div>
      <div className='flex items-baseline gap-2'>
        <span className={cn('text-4xl font-light tracking-wider', glow ? 'text-white' : 'text-gray-200')}>
          {value}
        </span>
        {unit && <span className='text-xs font-mono text-gray-500'>{unit}</span>}
      </div>
    </GlassPanel>
  );
}

export function StatusBadge({ status, pulse = false, text }) {
  const getColors = () => {
    switch(status.toLowerCase()) {
      case 'online': case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'processing': case 'analyzing': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'failed': case 'error': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };
  
  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono tracking-widest uppercase', getColors())}>
      {pulse && (
        <span className='relative flex h-2 w-2'>
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', status === 'online' ? 'bg-emerald-400' : 'bg-current')} />
          <span className={cn('relative inline-flex rounded-full h-2 w-2', status === 'online' ? 'bg-emerald-500' : 'bg-current')} />
        </span>
      )}
      {text || status}
    </div>
  );
}

export function RiskBadge({ level }) {
  const getStyle = () => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
      case 'HIGH': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'MEDIUM': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'LOW': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };
  
  return (
    <span className={cn('px-2 py-1 rounded text-[10px] font-mono font-bold tracking-widest uppercase border', getStyle())}>
      {level || 'UNKNOWN'} RISK
    </span>
  );
}

export function GlowButton({ children, onClick, disabled, primary = false, className, type = 'button' }) {
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        'relative overflow-hidden px-6 py-3 font-mono text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300 rounded border flex items-center justify-center gap-2',
        disabled ? 'opacity-50 cursor-not-allowed border-gray-700 text-gray-500' : 
        primary ? 'bg-[#00F0FF] border-[#00F0FF] text-[#050B14] hover:bg-[#00F0FF]/90 hover:shadow-[0_0_20px_rgba(0,240,255,0.6)]' :
        'bg-transparent border-[#00F0FF]/50 text-[#00F0FF] hover:border-[#00F0FF] hover:bg-[#00F0FF]/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TechnicalDivider() {
  return (
    <div className='flex items-center gap-2 w-full opacity-50 py-4'>
      <div className='w-1 h-1 rounded-full bg-[#00F0FF]' />
      <div className='h-[1px] flex-1 bg-gradient-to-r from-[#00F0FF]/50 to-transparent' />
    </div>
  );
}
