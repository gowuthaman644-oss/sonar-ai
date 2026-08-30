
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export function GlassPanel({ children, className, hover = false, borderTop = false }) {
  return (
    <div className={cn(
      'bg-[rgba(4,25,27,0.68)] backdrop-blur-[6px] border border-[rgba(32,220,197,0.18)] rounded-xl shadow-lg transition-all duration-300',
      hover && 'hover:border-[#20DCC5]/50 hover:shadow-[0_0_20px_rgba(32,220,197,0.15)] hover:bg-[rgba(4,25,27,0.80)]',
      borderTop && 'border-t-2 border-t-[#20DCC5]',
      className
    )}>
      {children}
    </div>
  );
}

export function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className='flex items-center gap-3 mb-6'>
      {Icon && <Icon className='w-5 h-5 text-[#20DCC5]' />}
      <div>
        <h2 className='text-sm font-mono tracking-widest text-[#20DCC5] uppercase'>{title}</h2>
        {subtitle && <p className='text-xs font-mono text-[#607874] uppercase mt-1 tracking-widest'>{subtitle}</p>}
      </div>
    </div>
  );
}

export function MetricCard({ title, value, unit, icon: Icon, glow = false }) {
  return (
    <GlassPanel className={cn('p-6 relative overflow-hidden', glow && 'border-[#20DCC5]/30')}>
      {glow && (
        <div className='absolute -top-10 -right-10 w-32 h-32 bg-[#20DCC5]/10 blur-3xl rounded-full pointer-events-none' />
      )}
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-[10px] font-mono tracking-widest text-[#A8BDB9] uppercase'>{title}</h3>
        {Icon && <Icon className='w-4 h-4 text-[#20DCC5]/70' />}
      </div>
      <div className='flex items-baseline gap-2'>
        <span className={cn('text-4xl font-light tracking-wider', glow ? 'text-[#F2F7F5]' : 'text-gray-200')}>
          {value}
        </span>
        {unit && <span className='text-xs font-mono text-[#607874]'>{unit}</span>}
      </div>
    </GlassPanel>
  );
}

export function StatusBadge({ status, pulse = false, text }) {
  const getColors = () => {
    switch(status.toLowerCase()) {
      case 'online': case 'completed': return 'bg-[#20DCC5]/10 text-emerald-400 border-[#20DCC5]/30';
      case 'processing': case 'analyzing': return 'bg-[#D6A84F]/10 text-amber-400 border-[#D6A84F]/30';
      case 'failed': case 'error': return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/10 text-[#A8BDB9] border-gray-500/30';
    }
  };
  
  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono tracking-widest uppercase', getColors())}>
      {pulse && (
        <span className='relative flex h-2 w-2'>
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', status === 'online' ? 'bg-emerald-400' : 'bg-current')} />
          <span className={cn('relative inline-flex rounded-full h-2 w-2', status === 'online' ? 'bg-[#20DCC5]' : 'bg-current')} />
        </span>
      )}
      {text || status}
    </div>
  );
}

export function RiskBadge({ level }) {
  const getStyle = () => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'bg-[#E5483F]/20 text-[#E5483F] border-[#E5483F]/50 shadow-[0_0_10px_rgba(229,72,63,0.3)]';
      case 'HIGH': return 'bg-[#F28C28]/20 text-[#F28C28] border-[#F28C28]/50';
      case 'MEDIUM': return 'bg-[#D6A84F]/20 text-[#D6A84F] border-[#D6A84F]/50';
      case 'LOW': return 'bg-[#20DCC5]/20 text-[#20DCC5] border-[#20DCC5]/50';
      default: return 'bg-[#607874]/20 text-[#A8BDB9] border-[#607874]/50';
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
        'relative overflow-hidden px-6 py-3 font-mono text-xs font-bold tracking-[0.2em] uppercase rounded border flex items-center justify-center gap-2',
        'transition-all duration-[160ms] ease-out active:translate-y-0',
        disabled ? 'opacity-50 cursor-not-allowed border-gray-700 text-[#607874]' : 
        primary ? 'bg-[#20DCC5] border-[#20DCC5] text-[#02090B] hover:-translate-y-[1px] hover:shadow-[0_0_20px_rgba(32,220,197,0.20)]' :
        'bg-transparent border-[rgba(32,220,197,0.50)] text-[#20DCC5] hover:border-[#20DCC5] hover:bg-[#20DCC5]/10 hover:-translate-y-[1px] hover:shadow-[0_0_15px_rgba(32,220,197,0.20)]',
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
      <div className='w-1 h-1 rounded-full bg-[#20DCC5]' />
      <div className='h-[1px] flex-1 bg-gradient-to-r from-[#20DCC5]/50 to-transparent' />
    </div>
  );
}
