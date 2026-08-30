import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';
import { Activity } from 'lucide-react';

const BootSequence = React.lazy(() => import('./pages/BootSequence'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const NewScan = React.lazy(() => import('./pages/NewScan'));
const Results = React.lazy(() => import('./pages/Results'));
const History = React.lazy(() => import('./pages/History'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const SonarMap = React.lazy(() => import('./pages/SonarMap'));
const Reports = React.lazy(() => import('./pages/Reports'));

const PageFallback = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
    <div className="w-12 h-12 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin flex items-center justify-center">
      <Activity className="w-4 h-4 text-[#00F0FF] animate-pulse" />
    </div>
    <div className="font-mono tracking-[0.2em] text-[#00F0FF] animate-pulse text-[10px]">
      INITIALIZING MODULE...
    </div>
  </div>
);

function App() {
  return (
    <>
      <Router>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<BootSequence />} />
            <Route path="/" element={<Layout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="scan" element={<NewScan />} />
              <Route path="results/:scanId" element={<Results />} />
              <Route path="history" element={<History />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="map" element={<SonarMap />} />
              <Route path="reports/:scanId" element={<Reports />} />
              <Route path="reports" element={<Reports />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
      
      <Toaster 
        theme="dark"
        position="bottom-right"
        toastOptions={{
          className: 'bg-[#0B1422] border border-[#1A2C42] text-white font-mono tracking-widest uppercase rounded-xl backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]',
          style: {
            background: 'rgba(11, 20, 34, 0.9)',
          }
        }}
      />
    </>
  );
}

export default App;
