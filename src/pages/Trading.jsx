import React from 'react';
import { motion } from 'framer-motion';
import { TradingChart } from '../components/TradingChart';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export const Trading = () => {
  const navigate = useNavigate();
  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-center mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="mb-0" style={{ margin: 0 }}>Trading Dashboard</h2>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" style={{ padding: '6px 12px' }}>BTC/USDT (Live)</button>
        </div>
      </div>
      
      <div className="panel" style={{ height: '70vh' }}>
        <TradingChart />
      </div>
    </motion.div>
  );
};
