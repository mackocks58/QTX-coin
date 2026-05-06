import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Copy, CheckCircle2, Info, X, ChevronLeft } from 'lucide-react';

export const Wallet = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('TRC20');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [txid, setTxid] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [copied, setCopied] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Use environment variables for the wallet addresses
  const trc20Address = import.meta.env.VITE_USDT_ADDRESS || 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const bscAddress = import.meta.env.VITE_BSC_ADDRESS || '0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const depositAddress = activeTab === 'TRC20' ? trc20Address : bscAddress;

  useEffect(() => {
    if (activeTab === 'TRC20' || activeTab === 'BSC') {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeTab]);

  // Check for existing pending transactions
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'users', currentUser.uid, 'transactions'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasPending(!snapshot.empty);
    });
    return unsubscribe;
  }, [currentUser]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    toast.success('Address copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (hasPending) {
      toast.error('You already have a pending transaction.');
      return;
    }
    if (!expectedAmount || isNaN(expectedAmount) || parseFloat(expectedAmount) <= 0) {
      toast.error('Please enter a valid transfer amount');
      return;
    }
    if (!txid || txid.length < 10) {
      toast.error('Please enter a valid Transaction ID (TXID)');
      return;
    }

    setIsVerifying(true);
    const loadingToast = toast.loading('Submitting transaction for verification...');

    try {
      if (!currentUser) throw new Error('Not authenticated');
      
      // Check if TXID is already submitted
      const txQuery = query(collection(db, 'users', currentUser.uid, 'transactions'), where('txid', '==', txid.trim()));
      const txSnapshot = await getDocs(txQuery);
      if (!txSnapshot.empty) {
        throw new Error('This Transaction ID has already been submitted.');
      }

      // Add to Firestore as pending
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'deposit',
        txid: txid.trim(),
        network: activeTab, // 'TRC20' or 'BSC'
        currency: 'USDT',
        status: 'pending',
        expectedAmount: parseFloat(expectedAmount),
        amount: 0, // amount will be filled by backend upon verification
        createdAt: serverTimestamp()
      });

      toast.success('Transaction submitted! It will be verified automatically within 5 minutes.', { id: loadingToast, duration: 6000 });
      setTxid('');
      setExpectedAmount('');
    } catch (error) {
      toast.error(error.message || 'Failed to submit transaction', { id: loadingToast });
    }
    
    setIsVerifying(false);
  };

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="mb-0">Wallet</h2>
      </div>
      
      {/* Network Switcher */}
      <div style={{ display: 'flex', background: 'var(--border)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '24px', maxWidth: '400px' }}>
        <button 
          onClick={() => setActiveTab('TRC20')}
          style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'TRC20' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'TRC20' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'TRC20' ? 600 : 400, boxShadow: activeTab === 'TRC20' ? 'var(--shadow-sm)' : 'none' }}
        >
          USDT (TRC20)
        </button>
        <button 
          onClick={() => setActiveTab('BSC')}
          style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'BSC' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'BSC' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'BSC' ? 600 : 400, boxShadow: activeTab === 'BSC' ? 'var(--shadow-sm)' : 'none' }}
        >
          USDT (BNB Chain)
        </button>
      </div>

      <AnimatePresence mode="wait">
        {(activeTab === 'TRC20' || activeTab === 'BSC') && (
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            {/* Unified Deposit & Verify Card */}
            <div className="panel mx-auto" style={{ maxWidth: '500px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Top Section: QR & Address */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'nowrap' }}>
                <div style={{ padding: '6px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexShrink: 0 }}>
                  <QRCodeSVG value={depositAddress} size={90} />
                </div>

                <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h3 className="mb-0" style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Deposit USDT ({activeTab})
                    <button onClick={() => setShowInstructions(true)} style={{ color: 'var(--primary)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '50%' }}>
                      <Info size={16} />
                    </button>
                  </h3>
                  <motion.p 
                    style={{ fontSize: '0.75rem', margin: 0, lineHeight: 1.3, color: 'var(--warning)', fontWeight: 600 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    Send only USDT ({activeTab === 'TRC20' ? 'TRC20' : 'BEP20'}) to this address.
                  </motion.p>

                  <div style={{ width: '100%', background: 'var(--bg-dark)', padding: '6px 8px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                      <CheckCircle2 size={12} color="var(--success)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.7rem', wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{depositAddress}</span>
                    </div>
                    <button onClick={handleCopy} style={{ color: 'var(--primary)', padding: '4px', flexShrink: 0, marginLeft: '8px' }}>
                      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border)', width: '100%' }}></div>

              {/* Bottom Section: Verification */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 className="mb-0" style={{ fontSize: '1rem' }}>Verify Deposit</h4>
                  <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Expires in:</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeLeft)}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <input 
                      type="number" 
                      className="input-field" 
                      style={{ padding: '10px', fontSize: '0.85rem' }}
                      value={expectedAmount} 
                      onChange={(e) => setExpectedAmount(e.target.value)} 
                      placeholder="Amount (USDT)"
                      disabled={isVerifying || hasPending}
                    />
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      style={{ padding: '10px', fontSize: '0.85rem' }}
                      value={txid} 
                      onChange={(e) => setTxid(e.target.value)} 
                      placeholder="Transaction Hash (TXID)"
                      disabled={isVerifying || hasPending}
                    />
                  </div>
                </div>
                
                {hasPending && (
                  <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', color: 'var(--warning)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 2s infinite', flexShrink: 0 }}></div>
                    Pending verification...
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '10px', fontSize: '0.9rem', opacity: (isVerifying || hasPending) ? 0.5 : 1, cursor: (isVerifying || hasPending) ? 'not-allowed' : 'pointer' }} 
                  onClick={handleVerify}
                  disabled={isVerifying || hasPending}
                >
                  {isVerifying ? 'Submitting...' : hasPending ? 'Verification in Progress' : 'Submit TXID'}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowInstructions(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: 'var(--radius-md)', maxWidth: '450px', width: '100%', border: '1px solid var(--border)', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowInstructions(false)}
                style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--text-muted)', background: 'transparent' }}
                className="hover:text-primary"
              >
                <X size={20} />
              </button>
              
              <h3 className="mb-3 text-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <Info size={20} />
                How to Deposit
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', margin: '10px 0 16px 0' }}>
                {[
                  "Open your crypto app (e.g., Binance, Trust Wallet).",
                  <span>Go to <strong>Withdraw</strong> and select <strong>USDT</strong>.</span>,
                  <span>Select Network: <strong>{activeTab === 'TRC20' ? 'Tron (TRC20)' : 'BNB Smart Chain (BEP20)'}</strong>. <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Wrong network = lost funds!</span></span>,
                  "Copy our deposit address and paste it into your withdrawal address field.",
                  "Enter the amount and confirm the transfer.",
                  <span>Once "Completed", locate the <strong>Transaction Hash (TXID)</strong> in the details.</span>,
                  <span>Paste Amount and TXID into <em>Verify Deposit</em> and Submit.</span>
                ].map((step, idx, arr) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: idx === arr.length - 1 ? '0' : '16px' }}>
                    {/* Vertical connecting line */}
                    {idx !== arr.length - 1 && (
                      <div style={{ position: 'absolute', left: '8px', top: '20px', bottom: 0, width: '2px', background: '#10B981', opacity: 0.4 }}></div>
                    )}
                    
                    {/* Verified Badge Icon */}
                    <div style={{ flexShrink: 0, zIndex: 1, background: 'var(--bg-panel)', display: 'flex', alignItems: 'flex-start', paddingTop: '2px' }}>
                      <CheckCircle2 size={18} color="#10B981" />
                    </div>
                    
                    {/* Step Text */}
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.4, paddingTop: '3px' }}>
                      {step}
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="btn btn-primary mt-3 w-100" onClick={() => setShowInstructions(false)} style={{ padding: '8px', fontSize: '0.85rem' }}>
                I Understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
