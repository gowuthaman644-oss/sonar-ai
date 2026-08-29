import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import NewScan from './pages/NewScan';
import Results from './pages/Results';
import History from './pages/History';
import Analytics from './pages/Analytics';
import SonarMap from './pages/SonarMap';
import Reports from './pages/Reports';

import BootSequence from './pages/BootSequence';

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<BootSequence />} />
          <Route path="/" element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="scan" element={<NewScan />} />
            <Route path="results/:scanId" element={<Results />} />
            <Route path="history" element={<History />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="map" element={<SonarMap />} />
            <Route path="reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
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
