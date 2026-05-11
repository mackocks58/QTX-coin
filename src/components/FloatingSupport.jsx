import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const FloatingSupport = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Only show for logged-in users
  if (!currentUser) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={{ top: -300, bottom: 300, left: -200, right: 0 }}
      onClick={() => navigate('/support')}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      style={{
        position: 'fixed',
        top: 'calc(50% - 30px)',
        right: '16px',
        width: '58px',
        height: '58px',
        borderRadius: '50%',
        boxShadow: '0 8px 32px rgba(16,185,129,0.35), 0 4px 12px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9990,
        cursor: 'pointer',
        overflow: 'hidden',
        border: '2.5px solid #10b981',
      }}
    >
      <img
        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
        alt="Live Support"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {/* Online dot */}
      <span style={{
        position: 'absolute',
        top: '3px',
        right: '3px',
        width: '13px',
        height: '13px',
        background: '#10b981',
        borderRadius: '50%',
        border: '2px solid #0a0e1a',
        animation: 'pulse 2s infinite',
      }} />
    </motion.div>
  );
};
