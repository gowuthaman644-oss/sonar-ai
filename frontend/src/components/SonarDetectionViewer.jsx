import React, { useState, useRef, useEffect } from 'react';
import { Target } from 'lucide-react';

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
    <div className="relative w-full h-full border border-sonar-border/50 bg-[#02050A] flex items-center justify-center overflow-hidden">
      {/* Background Radar Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      
      {/* Image Container */}
      <div className="relative max-w-full max-h-full inline-block">
        {imageUrl ? (
          <img 
            ref={imgRef}
            src={imageUrl} 
            alt="Sonar Analysis" 
            onLoad={handleImageLoad}
            className={`max-w-full max-h-[70vh] object-contain transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="w-full h-64 flex items-center justify-center text-gray-600 font-mono text-sm tracking-widest uppercase">
            Image Unvailable
          </div>
        )}

        {/* Bounding Boxes */}
        {imageLoaded && naturalSize.width > 0 && detections.map((det, idx) => {
          // Destructure exact fields returned by POST /api/analyze
          const { x, y, width, height } = det;
          
          // API returns x, y as top-left coords (from bbox["x1"] and bbox["y1"])
          // Calculate percentages based on natural dimensions
          const pctLeft = (x / naturalSize.width) * 100;
          const pctTop = (y / naturalSize.height) * 100;
          const pctWidth = (width / naturalSize.width) * 100;
          const pctHeight = (height / naturalSize.height) * 100;

          const isActive = activeIndex === idx;

          return (
            <div 
              key={idx}
              className={`absolute border-2 transition-all duration-300 cursor-crosshair group flex items-start
                ${isActive ? 'border-sonar-cyan bg-sonar-cyan/15 z-20 shadow-[0_0_20px_rgba(0,240,255,0.4)]' : 'border-sonar-cyan/50 hover:border-sonar-cyan hover:bg-sonar-cyan/10 z-10'}
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
              {/* Box Corner Accents */}
              <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-sonar-cyan"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-sonar-cyan"></div>
              <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-sonar-cyan"></div>
              <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-sonar-cyan"></div>
              
              {/* Label */}
              <div className={`
                absolute -top-7 left-0 px-2 py-1 flex items-center gap-2 text-xs font-bold tracking-widest uppercase whitespace-nowrap
                transition-all duration-200
                ${isActive ? 'bg-sonar-cyan text-black' : 'bg-black/80 text-sonar-cyan border border-sonar-cyan/50 backdrop-blur-sm group-hover:bg-sonar-cyan group-hover:text-black'}
              `}>
                <Target className="w-3 h-3" />
                {det.class_name} • {(det.confidence * 100).toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Decorative scanning line */}
      <div className="absolute left-0 right-0 h-[2px] bg-sonar-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.8)] animate-[scan_3s_ease-in-out_infinite] opacity-50 pointer-events-none"></div>

      {/* Decorative Labels */}
      <div className="absolute top-4 left-4 text-[10px] font-mono tracking-widest text-sonar-cyan/50 flex flex-col gap-1 pointer-events-none">
        <span>AI VISION ACTIVE</span>
        <span>YOLO11n ENGINE</span>
      </div>
    </div>
  );
}
