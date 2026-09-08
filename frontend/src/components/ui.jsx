
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export function GlassPanel({ children, className, hover = false, borderTop = false, glow = false }) {
  return (
    <div className={cn(
      'bg-[rgba(4,25,27,0.72)] backdrop-blur-[10px] border border-[rgba(32,220,197,0.18)] rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-[180ms] ease-out relative',
      hover && 'hover:border-[rgba(32,220,197,0.38)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:bg-[rgba(4,25,27,0.85)]',
      borderTop && 'border-t-2 border-t-[#20DCC5]',
      glow && 'shadow-[0_0_25px_rgba(32,220,197,0.10)] border-[rgba(32,220,197,0.30)]',
      className
    )}>
      {children}
    </div>
  );
}

export function SectionHeader({ icon: Icon, title, subtitle, badge }) {
  return (
    <div className='flex items-center justify-between gap-3 mb-5'>
      <div className='flex items-center gap-3'>
        {Icon && (
          <div className='w-8 h-8 rounded bg-[rgba(32,220,197,0.08)] border border-[rgba(32,220,197,0.25)] flex items-center justify-center flex-shrink-0'>
            <Icon className='w-4 h-4 text-[#20DCC5]' />
          </div>
        )}
        <div>
          <h2 className='text-xs font-mono font-bold tracking-[0.2em] text-[#F2F7F5] uppercase flex items-center gap-2'>
            {title}
          </h2>
          {subtitle && (
            <p className='text-[10px] font-mono text-[#607874] uppercase mt-0.5 tracking-widest'>{subtitle}</p>
          )}
        </div>
      </div>
      {badge && <div>{badge}</div>}
    </div>
  );
}

export function MetricCard({ title, value, unit, icon: Icon, glow = false, trend = null, description = null }) {
  return (
    <GlassPanel className={cn('p-5 relative overflow-hidden group', glow && 'border-[rgba(32,220,197,0.35)]')}>
      {glow && (
        <div className='absolute -top-12 -right-12 w-28 h-28 bg-[#20DCC5]/10 blur-2xl rounded-full pointer-events-none' />
      )}
      <div className='flex items-center justify-between mb-3'>
        <span className='text-[9px] font-mono font-semibold tracking-[0.2em] text-[#A8BDB9] uppercase'>{title}</span>
        {Icon && (
          <div className='w-7 h-7 rounded bg-[rgba(32,220,197,0.06)] border border-[rgba(32,220,197,0.15)] flex items-center justify-center text-[#20DCC5] group-hover:border-[#20DCC5]/40 transition-colors'>
            <Icon className='w-3.5 h-3.5' />
          </div>
        )}
      </div>
      <div className='flex items-baseline gap-2'>
        <span className={cn('text-3xl font-mono font-bold tracking-tight', glow ? 'text-[#F2F7F5]' : 'text-[#F2F7F5]')}>
          {value}
        </span>
        {unit && <span className='text-[10px] font-mono text-[#607874] font-normal'>{unit}</span>}
      </div>
      {(trend || description) && (
        <div className='mt-2 pt-2 border-t border-[rgba(32,220,197,0.08)] flex items-center justify-between text-[9px] font-mono text-[#607874]'>
          {description && <span>{description}</span>}
          {trend && <span className='text-[#20DCC5] font-semibold'>{trend}</span>}
        </div>
      )}
    </GlassPanel>
  );
}

export function StatusBadge({ status, pulse = false, text }) {
  const getColors = () => {
    switch((status || '').toLowerCase()) {
      case 'online': case 'completed': case 'active': 
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'processing': case 'analyzing': case 'review_required': 
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'failed': case 'error': case 'critical': 
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default: 
        return 'bg-slate-500/10 text-[#A8BDB9] border-slate-500/30';
    }
  };
  
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[9px] font-mono tracking-widest uppercase', getColors())}>
      {pulse && (
        <span className='relative flex h-1.5 w-1.5'>
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', (status || '').toLowerCase() === 'online' ? 'bg-emerald-400' : 'bg-current')} />
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', (status || '').toLowerCase() === 'online' ? 'bg-emerald-400' : 'bg-current')} />
        </span>
      )}
      {text || status}
    </div>
  );
}

export function RiskBadge({ level }) {
  const getStyle = () => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': 
        return 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]';
      case 'HIGH': 
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'MEDIUM': 
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'LOW': 
        return 'bg-[#20DCC5]/20 text-[#20DCC5] border-[#20DCC5]/50';
      default: 
        return 'bg-[#607874]/20 text-[#A8BDB9] border-[#607874]/50';
    }
  };
  
  return (
    <span className={cn('px-2.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest uppercase border inline-flex items-center gap-1', getStyle())}>
      <span className='w-1.5 h-1.5 rounded-full bg-current' />
      {level || 'UNKNOWN'} RISK
    </span>
  );
}

export function PriorityBadge({ tier }) {
  const getStyle = () => {
    switch (tier?.toUpperCase()) {
      case 'IMMEDIATE_ACTION': case 'IMMEDIATE ACTION':
        return 'bg-red-500/20 text-red-400 border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
      case 'REVIEW_REQUIRED': case 'REVIEW REQUIRED':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/60';
      case 'DEFERRED_INSPECTION': case 'DEFERRED INSPECTION':
        return 'bg-[#20DCC5]/15 text-[#20DCC5] border-[#20DCC5]/40';
      default:
        return 'bg-slate-500/20 text-[#A8BDB9] border-slate-500/40';
    }
  };

  const getLabel = () => {
    switch (tier?.toUpperCase()) {
      case 'IMMEDIATE_ACTION': case 'IMMEDIATE ACTION': return 'IMMEDIATE ACTION';
      case 'REVIEW_REQUIRED': case 'REVIEW REQUIRED': return 'REVIEW REQUIRED';
      case 'DEFERRED_INSPECTION': case 'DEFERRED INSPECTION': return 'DEFERRED INSPECTION';
      default: return tier || 'STANDARD';
    }
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest uppercase border inline-flex items-center gap-1.5', getStyle())}>
      <span className='w-1.5 h-1.5 rounded-full bg-current animate-pulse' />
      {getLabel()}
    </span>
  );
}

export function GlowButton({ children, onClick, disabled, primary = false, danger = false, warning = false, className, type = 'button' }) {
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={cn(
        'relative overflow-hidden px-5 py-2.5 font-mono text-xs font-bold tracking-[0.18em] uppercase rounded border flex items-center justify-center gap-2 select-none',
        'transition-all duration-[160ms] ease-out active:translate-y-[1px]',
        disabled ? 'opacity-40 cursor-not-allowed border-gray-700 text-[#607874] bg-black/40' : 
        primary ? 'bg-[#20DCC5] border-[#20DCC5] text-[#02090B] hover:shadow-[0_0_20px_rgba(32,220,197,0.30)] hover:brightness-110' :
        danger ? 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500 hover:text-black hover:shadow-[0_0_15px_rgba(239,68,68,0.35)]' :
        warning ? 'bg-amber-500/20 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-black hover:shadow-[0_0_15px_rgba(245,158,11,0.35)]' :
        'bg-transparent border-[rgba(32,220,197,0.35)] text-[#20DCC5] hover:border-[#20DCC5] hover:bg-[#20DCC5]/10 hover:shadow-[0_0_15px_rgba(32,220,197,0.15)]',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TechnicalDivider({ label = null }) {
  return (
    <div className='flex items-center gap-3 w-full opacity-60 my-4'>
      <div className='w-1.5 h-1.5 rounded-full bg-[#20DCC5]' />
      <div className='h-[1px] flex-1 bg-gradient-to-r from-[#20DCC5]/40 via-[rgba(32,220,197,0.10)] to-transparent' />
      {label && <span className='text-[8px] font-mono tracking-widest text-[#607874] uppercase px-1'>{label}</span>}
      {label && <div className='h-[1px] flex-1 bg-gradient-to-l from-[#20DCC5]/40 via-[rgba(32,220,197,0.10)] to-transparent' />}
    </div>
  );
}
