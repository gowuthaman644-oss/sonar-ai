import React, { useState, useRef } from 'react';
import { Target, Scan, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SonarDetectionViewer({ imageUrl, detections = [], activeIndex = null, onHover = () => {} }) {
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);

  const handleImageLoad = (e) => {
    setNaturalSize({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
    setImageLoaded(true);
  };

  return (
    <div className="relative w-full h-full bg-[#02090B]/60 flex items-center justify-center overflow-hidden rounded-lg border border-[rgba(32,220,197,0.18)]">
      {/* Background Radar Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(32,220,197,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(32,220,197,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Image Container */}
      <div className="relative max-w-full max-h-full inline-block shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-[rgba(32,220,197,0.25)] rounded overflow-hidden">
        {imageUrl ? (
          <img 
            ref={imgRef}
            src={imageUrl} 
            alt="Sonar Acoustic Analysis" 
            onLoad={handleImageLoad}
            onError={(e) => console.error("IMAGE LOAD FAILED", e.currentTarget.src)}
            className={`max-w-full max-h-[72vh] object-contain transition-opacity duration-500 select-none ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="w-full h-64 flex flex-col items-center justify-center text-[#607874] font-mono text-xs tracking-[0.2em] uppercase gap-2">
            <Scan className="w-8 h-8 text-[#607874]/50 animate-pulse" />
            <span>Image Data Unavailable</span>
          </div>
        )}

        {/* Bounding Boxes */}
        <AnimatePresence>
          {imageLoaded && naturalSize.width > 0 && detections.map((det, idx) => {
            const x = det.x != null ? det.x : 0;
            const y = det.y != null ? det.y : 0;
            const width = det.width != null ? det.width : 0;
            const height = det.height != null ? det.height : 0;
            const pctLeft = (x / naturalSize.width) * 100;
            const pctTop = (y / naturalSize.height) * 100;
            const pctWidth = (width / naturalSize.width) * 100;
            const pctHeight = (height / naturalSize.height) * 100;

            const isActive = activeIndex === idx;
            const priorityTier = det.priority_tier;
            const triageRank = det.triage_rank;

            // Border color by priority tier
            let borderColor = 'border-[#20DCC5]/50 hover:border-[#20DCC5] hover:bg-[#20DCC5]/10';
            let cornerColor = 'border-[#20DCC5]';
            let labelStyle = 'bg-[#04191B]/90 text-[#20DCC5] border border-[#20DCC5]/50 group-hover:bg-[#20DCC5] group-hover:text-black';

            if (priorityTier === 'IMMEDIATE_ACTION') {
              borderColor = 'border-red-500/60 hover:border-red-400 hover:bg-red-500/15';
              cornerColor = 'border-red-400';
              labelStyle = 'bg-[#1a0606]/95 text-red-400 border border-red-500/60 group-hover:bg-red-500 group-hover:text-black';
            } else if (priorityTier === 'REVIEW_REQUIRED' || det.contact_type === 'LOW_EVIDENCE_CONTACT') {
              borderColor = 'border-amber-500/60 hover:border-amber-400 hover:bg-amber-500/15';
              cornerColor = 'border-amber-400';
              labelStyle = 'bg-[#191506]/95 text-amber-400 border border-amber-500/60 group-hover:bg-amber-400 group-hover:text-black';
            }

            if (isActive) {
              if (priorityTier === 'IMMEDIATE_ACTION') {
                borderColor = 'border-red-400 bg-red-500/25 z-20 shadow-[inset_0_0_20px_rgba(239,68,68,0.4)]';
                labelStyle = 'bg-red-500 text-black shadow-[0_0_12px_rgba(239,68,68,0.8)]';
              } else if (priorityTier === 'REVIEW_REQUIRED') {
                borderColor = 'border-amber-400 bg-amber-500/25 z-20 shadow-[inset_0_0_20px_rgba(245,158,11,0.4)]';
                labelStyle = 'bg-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.8)]';
              } else {
                borderColor = 'border-[#20DCC5] bg-[#20DCC5]/20 z-20 shadow-[inset_0_0_20px_rgba(32,220,197,0.3)]';
                labelStyle = 'bg-[#20DCC5] text-black shadow-[0_0_10px_rgba(32,220,197,0.7)]';
              }
            }

            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className={`absolute border transition-all duration-[160ms] cursor-crosshair group flex items-start ${borderColor} z-10`}
                style={{
                  left: `${pctLeft}%`,
                  top: `${pctTop}%`,
                  width: `${pctWidth}%`,
                  height: `${pctHeight}%`
                }}
                onMouseEnter={() => onHover(idx)}
                onMouseLeave={() => onHover(null)}
              >
                {/* Advanced Corner Accents */}
                <div className={`absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 ${cornerColor}`} />
                <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 ${cornerColor}`} />
                <div className={`absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 ${cornerColor}`} />
                <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 ${cornerColor}`} />
                
                {/* Label */}
                <div className={`
                  absolute -top-6 left-0 px-2 py-0.5 flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider uppercase whitespace-nowrap
                  transition-all duration-[160ms] backdrop-blur-md rounded-sm ${labelStyle}
                `}>
                  <Target className="w-2.5 h-2.5" />
                  {triageRank && (
                    <span className="px-1 py-0.2 bg-black/40 rounded text-[8px] font-mono font-black">
                      #{triageRank}
                    </span>
                  )}
                  <span>{det.class_name || 'TARGET'} • {det.confidence != null ? `${(det.confidence * 100).toFixed(1)}%` : '—'}</span>
                  {det.priority_score != null && (
                    <span className="text-[8px] opacity-90">[{Number(det.priority_score).toFixed(0)} PTS]</span>
                  )}
                  {det.contact_type === 'LOW_EVIDENCE_CONTACT' && (
                    <span className="text-[8px] opacity-80">[CLUTTER?]</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Scanning Laser Line */}
      <motion.div 
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 6, ease: "linear", repeat: Infinity }}
        className="absolute left-0 right-0 h-[1px] bg-[#20DCC5] shadow-[0_0_15px_rgba(32,220,197,0.8)] opacity-25 pointer-events-none"
      />

      {/* Technical HUD Overlays */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none bg-black/50 px-2.5 py-1 rounded border border-[rgba(32,220,197,0.15)] backdrop-blur-sm">
        <Crosshair className="w-3 h-3 text-[#20DCC5]" />
        <span className="text-[9px] font-mono tracking-widest text-[#A8BDB9] uppercase font-bold">ACOUSTIC IMAGE-PLANE HUD</span>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none bg-black/50 px-2.5 py-1 rounded border border-[rgba(32,220,197,0.15)] backdrop-blur-sm">
        <span className="text-[8.5px] font-mono tracking-widest text-[#20DCC5] uppercase">{detections.length} CONTACTS DETECTED</span>
      </div>
    </div>
  );
}
