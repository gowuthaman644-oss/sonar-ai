import React, { useState, useRef } from 'react';
import { Target, Scan } from 'lucide-react';
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
    <div className="relative w-full h-full bg-transparent flex items-center justify-center overflow-hidden">
      {/* Background Radar Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
      
      {/* Image Container - CRITICAL: DO NOT BREAK INLINE-BLOCK SIZING */}
      <div className="relative max-w-full max-h-full inline-block shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[#1A2C42]">
        {imageUrl ? (
          <img 
            ref={imgRef}
            src={imageUrl} 
            alt="Sonar Analysis" 
            onLoad={handleImageLoad}
            className={`max-w-full max-h-[75vh] object-contain transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-gray-600 font-mono text-sm tracking-[0.2em] uppercase">
            Image Data Unavailable
          </div>
        )}

        {/* Bounding Boxes */}
        <AnimatePresence>
          {imageLoaded && naturalSize.width > 0 && detections.map((det, idx) => {
            const { x, y, width, height } = det;
            const pctLeft = (x / naturalSize.width) * 100;
            const pctTop = (y / naturalSize.height) * 100;
            const pctWidth = (width / naturalSize.width) * 100;
            const pctHeight = (height / naturalSize.height) * 100;

            const isActive = activeIndex === idx;

            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`absolute border transition-all duration-300 cursor-crosshair group flex items-start
                  ${isActive ? 'border-[#00F0FF] bg-[#00F0FF]/20 z-20 shadow-[inset_0_0_20px_rgba(0,240,255,0.4)]' : 'border-[#00F0FF]/40 hover:border-[#00F0FF] hover:bg-[#00F0FF]/15 z-10'}
                `}
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
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#00F0FF]" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-[#00F0FF]" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-[#00F0FF]" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#00F0FF]" />
                
                {/* Label */}
                <div className={`
                  absolute -top-7 left-0 px-2 py-1 flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap
                  transition-all duration-200 backdrop-blur-sm
                  ${isActive ? 'bg-[#00F0FF] text-black shadow-[0_0_10px_rgba(0,240,255,0.8)]' : 'bg-[#050B14]/80 text-[#00F0FF] border border-[#00F0FF]/50 group-hover:bg-[#00F0FF] group-hover:text-black'}
                `}>
                  <Target className="w-3 h-3" />
                  {det.class_name} • {(det.confidence * 100).toFixed(1)}%
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
        className="absolute left-0 right-0 h-[1px] bg-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,1)] opacity-30 pointer-events-none"
      />

      {/* Technical Meta Overlays */}
      <div className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none">
        <span className="text-[9px] font-mono tracking-[0.2em] text-[#00F0FF]/50 uppercase">TARGETING SYSTEM</span>
        <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-white uppercase flex items-center gap-2">
          <Scan className="w-3 h-3 text-[#00F0FF]" /> YOLO VISION
        </span>
      </div>
    </div>
  );
}
