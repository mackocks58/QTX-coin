import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collectionGroup, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { X, CheckCircle } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

// Country codes for flags matching Login.jsx
const FLAGS = ['zw', 'mz', 'tz', 'ug', 'bw', 'cd', 'zm', 'bi', 'gh', 'ng', 'ke'];

// Helper to anonymize email or create a random name
const generateName = (uid) => {
  if (!uid || uid.length < 6) {
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    return `UId ${randomHex.slice(0,3)}...***...${randomHex.slice(-3)}`;
  }
  return `UId ${uid.slice(0, 3).toUpperCase()}...***...${uid.slice(-3).toUpperCase()}`;
};

const generateFlag = (uid) => {
  if (!uid) return 'ng';
  const seed = uid.charCodeAt(uid.length - 2) || 0;
  return FLAGS[seed % FLAGS.length];
};

export const GlobalNotification = () => {
  const [transactions, setTransactions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const { formatCurrency, symbol } = useCurrency();

  useEffect(() => {
    // Fetch last 50 transactions across all users
    const q = query(
      collectionGroup(db, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => {
        const data = doc.data();
        // The parent of 'transactions' is the user document (users/{uid}/transactions/{txId})
        const userRef = doc.ref.parent.parent;
        const uid = userRef ? userRef.id : null;
        return {
          id: doc.id,
          uid,
          ...data
        };
      }).filter(tx => tx.status === 'verified' || tx.status === 'SUCCESS' || tx.status === 'pending'); // Filter out failed ones to keep it positive

      // If we don't have enough real transactions, we'll fall back to default behavior later
      setTransactions(txs);
    }, (error) => {
      console.log("Error fetching global transactions for notifications:", error);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (closed || transactions.length === 0) return;

    let timeoutHide;
    let timeoutNext;

    const runCycle = () => {
      setIsVisible(true);
      
      // Hide after 6 seconds
      timeoutHide = setTimeout(() => {
        setIsVisible(false);
        
        // Update index after exit animation finishes
        timeoutNext = setTimeout(() => {
          setCurrentIndex(prev => (prev + 1) % transactions.length);
        }, 500);
      }, 6000);
    };

    // Wait a brief moment before starting the first cycle
    const initialShow = setTimeout(runCycle, 2000);

    // Call runCycle every 17 seconds (6s visible + 11s gap)
    const cycleInterval = setInterval(runCycle, 17000);

    return () => {
      clearInterval(cycleInterval);
      clearTimeout(initialShow);
      clearTimeout(timeoutHide);
      clearTimeout(timeoutNext);
    };
  }, [transactions, closed]);

  if (closed || transactions.length === 0) return null;

  const currentTx = transactions[currentIndex];
  if (!currentTx) return null;

  const name = currentTx.senderName || currentTx.receiverName || generateName(currentTx.uid);
  const flag = generateFlag(currentTx.uid);
  const network = currentTx.network || currentTx.accountDetails?.network || 'Mobile Money';
  const amount = currentTx.amount || currentTx.expectedAmount || 0;
  
  // Format the message
  let actionMessage = '';
  if (currentTx.type === 'withdrawal') {
    actionMessage = `withdrew ${symbol}${formatCurrency(amount)} via ${network}`;
  } else if (currentTx.type === 'deposit') {
    actionMessage = `deposited ${symbol}${formatCurrency(amount)} via ${network}`;
  } else if (currentTx.type === 'transfer_out') {
    actionMessage = `sent P2P ${symbol}${formatCurrency(amount)}`;
  } else if (currentTx.type === 'transfer_in') {
    actionMessage = `received P2P ${symbol}${formatCurrency(amount)}`;
  } else if (currentTx.type === 'bot_profit' || currentTx.type === 'profit') {
    actionMessage = `earned ${symbol}${formatCurrency(amount)} bot profit`;
  } else {
    actionMessage = `completed a transaction of ${symbol}${formatCurrency(amount)}`;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 'env(safe-area-inset-top, 20px)',
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: 9999,
      pointerEvents: 'none', // Allow clicking through the container
      padding: '0 16px'
    }}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 10, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{
              background: 'rgba(30, 41, 59, 0.98)', // Dark color
              backdropFilter: 'blur(10px)',
              padding: '12px 24px', // Increased padding for more length
              borderRadius: '12px', // Reduced from 999px
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              pointerEvents: 'auto', // Allow interacting with the toast
              maxWidth: '500px', // Increased length limit
              width: 'max-content',
              minWidth: '320px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <img src={`https://flagcdn.com/w40/${flag}.png`} alt="Country Flag" style={{ width: '22px', borderRadius: '3px', objectFit: 'contain' }} />
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              fontSize: '13px', 
              color: '#f8fafc',
              fontWeight: 500,
              gap: '6px',
              flex: 1
            }}>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>{name}</span>
              <CheckCircle size={14} color="#10b981" style={{ flexShrink: 0 }}/>
              <span style={{ color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                {actionMessage}
              </span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
                setClosed(true); // Close permanently for this session
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px',
                marginLeft: '8px',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
              className="hover:bg-slate-700 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
