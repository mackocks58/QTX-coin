import React from 'react';
import { motion } from 'framer-motion';

export const FloatingSupport = () => {
  return (
    <motion.a
      href="https://wa.me/447853173546"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      style={{
        position: 'fixed',
        top: 'calc(50% - 30px)', // Vertically centered (50% minus half of height)
        right: '24px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'pointer',
        overflow: 'hidden',
        border: '3px solid var(--primary)'
      }}
    >
      <img 
        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" 
        alt="Live Support" 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      />
      {/* Online indicator dot */}
      <span style={{
        position: 'absolute',
        top: '5px',
        right: '5px',
        width: '12px',
        height: '12px',
        backgroundColor: '#10b981', // green
        borderRadius: '50%',
        border: '2px solid #fff'
      }} />
    </motion.a>
  );
};
