import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Loader } from 'lucide-react';

export const NetworkOverlay = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setReconnecting(true);
      setTimeout(() => {
        setIsOnline(true);
        setReconnecting(false);
        window.location.reload(); 
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            padding: '20px'
          }}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            style={{
              background: 'var(--bg-panel)',
              padding: '40px',
              borderRadius: '24px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              textAlign: 'center',
              maxWidth: '320px',
              width: '100%'
            }}
          >
            {reconnecting ? (
              <>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Loader size={32} color="var(--success)" />
                  </motion.div>
                </div>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', color: 'var(--success)' }}>Back Online!</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Reconnecting and reloading data...</p>
              </>
            ) : (
              <>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px'
                }}>
                  <WifiOff size={32} color="var(--danger)" />
                </div>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', color: 'var(--danger)' }}>Connection Lost</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                  It seems you are offline. Please check your internet connection. We'll automatically reconnect when the network is available.
                </p>
                <div style={{ marginTop: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 600 }}>Waiting for network...</span>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
