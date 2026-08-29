import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Map as MapIcon, Lock, AlertCircle } from 'lucide-react';
import { GlassPanel } from '../components/ui';

export default function SonarMap() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 h-full flex flex-col pb-10 max-w-[1400px] mx-auto"
    >
      
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#1A2C42] pb-6 mb-2">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-bold tracking-[0.25em] uppercase text-white drop-shadow-md">SURVEY VISUALIZATION</h1>
          </div>
          <p className="text-[#00F0FF] font-mono text-xs tracking-[0.3em] uppercase">
            GEOSPATIAL MAPPING PROTOCOLS
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex-1 flex flex-col items-center justify-center relative overflow-hidden h-[60vh] mt-4">
        
        {/* Background Radar Effect */}
        <div className="absolute inset-0 bg-[#02050A] rounded-xl border border-[#1A2C42]" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
           <div className="w-[800px] h-[800px] rounded-full border border-gray-500 flex items-center justify-center border-dashed">
             <div className="w-[600px] h-[600px] rounded-full border border-gray-500 flex items-center justify-center border-dashed">
               <div className="w-[400px] h-[400px] rounded-full border border-gray-500 border-dashed" />
             </div>
           </div>
        </div>

        {/* Content */}
        <GlassPanel className="relative z-10 flex flex-col items-center max-w-lg text-center p-12 bg-black/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-t-[#00F0FF]/50 border-t-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Compass className="w-16 h-16 text-gray-600 mb-8" />
          </motion.div>
          
          <h2 className="text-xl font-bold tracking-[0.2em] text-white mb-6 uppercase flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            SPATIAL DATA UNAVAILABLE
          </h2>
          
          <p className="text-[10px] text-gray-400 font-mono leading-loose mb-10 tracking-[0.1em] uppercase text-justify px-4">
            The current Kaggle Sonar dataset lacks EXIF geolocation or metadata telemetry. The YOLOv11n core detects objects perfectly within the image plane, but cannot map them to geographic coordinates without an active GPS feed.
          </p>
          
          <div className="px-6 py-4 border border-[#1A2C42] rounded-lg text-[10px] font-mono tracking-[0.2em] text-gray-500 bg-black/50 flex items-center gap-3 uppercase shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
            <Lock className="w-4 h-4" />
            GEOSPATIAL PROTOCOL DISABLED
          </div>
        </GlassPanel>
        
      </motion.div>
    </motion.div>
  );
}
