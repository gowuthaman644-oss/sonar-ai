import React from 'react';
import { Compass, Map as MapIcon, Lock } from 'lucide-react';

export default function SonarMap() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700 h-full flex flex-col pb-10">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-sonar-border pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.2em] uppercase text-white">SURVEY VISUALIZATION</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm tracking-widest uppercase">
            SPATIAL DATA MAPPING
          </p>
        </div>
      </div>

      <div className="glass-panel flex-1 flex flex-col items-center justify-center relative overflow-hidden border-t-2 border-t-gray-600">
        
        {/* Background Radar Effect */}
        <div className="absolute inset-0 bg-[#02050A]"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
           <div className="w-[800px] h-[800px] rounded-full border border-gray-600 flex items-center justify-center">
             <div className="w-[600px] h-[600px] rounded-full border border-gray-600 flex items-center justify-center">
               <div className="w-[400px] h-[400px] rounded-full border border-gray-600"></div>
             </div>
           </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center max-w-lg text-center p-12 glass-panel bg-black/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-sonar-border/50">
          <Compass className="w-16 h-16 text-gray-500 mb-6" />
          <h2 className="text-xl font-bold tracking-[0.2em] text-white mb-4 uppercase">SPATIAL DATA UNAVAILABLE</h2>
          <p className="text-xs text-gray-400 font-mono leading-loose mb-8">
            The current Kaggle Sonar dataset does not provide EXIF geolocation or metadata telemetry. The AI model detects objects perfectly within the image plane, but cannot map them to geographic coordinates without a linked GPS feed.
          </p>
          <div className="px-6 py-3 border border-sonar-cyan/30 rounded text-[10px] font-mono tracking-widest text-sonar-cyan bg-sonar-cyan/5 flex items-center gap-2">
            <Lock className="w-3 h-3" />
            SIMULATED MAP DATA RESTRICTED
          </div>
        </div>
        
      </div>
    </div>
  );
}
