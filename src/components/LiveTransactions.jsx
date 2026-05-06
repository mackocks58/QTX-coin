import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

const generateSingleMockTransaction = () => {
  const isDeposit = Math.random() > 0.4;
  const amount = (Math.random() * 1000 + 10).toFixed(2);
  const userId = Math.floor(Math.random() * 9000) + 1000;
  return {
    id: Date.now() + Math.random(),
    text: `User ***${userId} ${isDeposit ? 'deposited' : 'withdrawn'} $${amount}`,
    isDeposit
  };
};

export const LiveTransactions = () => {
  const [transactions, setTransactions] = useState(() => {
    return Array.from({ length: 4 }).map(() => generateSingleMockTransaction());
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions(prev => {
        const next = [...prev];
        next.shift(); // Remove oldest (top)
        next.push(generateSingleMockTransaction()); // Add newest (bottom)
        return next;
      });
    }, 2500); // Slide a new one every 2.5s

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: 'var(--bg-panel)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 4px var(--success)' }} />
        Live Platform Activity
      </div>

      <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
        {/* Top gradient mask for fading out */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '20px', background: 'linear-gradient(to bottom, var(--bg-panel), transparent)', zIndex: 1 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <AnimatePresence mode="popLayout">
            {transactions.map((tx) => (
              <motion.div
                key={tx.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ 
                  background: 'var(--bg-dark)', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '11px' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    background: tx.isDeposit ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    {tx.isDeposit ? <ArrowDownLeft size={14} color="var(--success)" /> : <ArrowUpRight size={14} color="var(--danger)" />}
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    User ***{tx.text.split('***')[1].substring(0, 4)}
                  </span>
                </div>
                <div style={{ 
                  color: tx.isDeposit ? 'var(--success)' : 'var(--text-primary)', 
                  fontWeight: 600 
                }}>
                  {tx.isDeposit ? '+' : '-'}${tx.text.split('$')[1]}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom gradient mask for fading in */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px', background: 'linear-gradient(to top, var(--bg-panel), transparent)', zIndex: 1 }} />
      </div>
    </div>
  );
};
