import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, doc, updateDoc, collectionGroup } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { Copy, CheckCircle2, Info, X, ChevronLeft, Phone } from 'lucide-react';

export const Wallet = () => {
  const { currentUser, userData } = useAuth();
  const { formatCurrency, isTZ } = useCurrency();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null); // set after isTZ resolves
  const [expectedAmount, setExpectedAmount] = useState('');
  const [txid, setTxid] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [copied, setCopied] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Palmpesa specific state
  const [mobilePhone, setMobilePhone] = useState(userData?.phoneNumber || '');
  const [pollingStatus, setPollingStatus] = useState(null);
  const [palmpesaOrderId, setPalmpesaOrderId] = useState(null);
  const [localTxId, setLocalTxId] = useState(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [popupCountdown, setPopupCountdown] = useState(4 * 60); // 4 minutes

  // Use environment variables for the wallet addresses
  const trc20Address = import.meta.env.VITE_USDT_ADDRESS || 'TBteWdQZAdWJzXCaa61dogDFVNH8pSA88J';
  const bscAddress = import.meta.env.VITE_BSC_ADDRESS || '0x66922e6229f9501319aa4425f4cd53773fc66a91';
  const depositAddress = activeTab === 'TRC20' ? trc20Address : bscAddress;

  // Set initial tab only after we know the user's country
  useEffect(() => {
    if (activeTab === null && userData?.country) {
      setActiveTab(isTZ ? 'MobileMoney' : 'TRC20');
    }
  }, [isTZ, activeTab, userData]);

  // Synchronous derived tab - safe only when country is known
  const tab = !userData?.country ? null : (activeTab !== null ? activeTab : (isTZ ? 'MobileMoney' : 'TRC20'));

  useEffect(() => {
    if (activeTab === 'TRC20' || activeTab === 'BSC') {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeTab]);

  // Popup countdown when PENDING
  useEffect(() => {
    if (showPaymentPopup && pollingStatus === 'PENDING') {
      setPopupCountdown(4 * 60);
      const t = setInterval(() => {
        setPopupCountdown(prev => {
          if (prev <= 1) { clearInterval(t); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [showPaymentPopup, pollingStatus]);

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
    toast.success(t('successAddressCopied'));
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
      
      // Normalize TXID to prevent spoofing duplicates (e.g., "Off-chain 123" vs "123")
      let normalized = txid.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      normalized = normalized.replace(/offchaintransfer/g, '').replace(/offchain/g, '').replace(/transfer/g, '').replace(/internal/g, '').replace(/successful/g, '').replace(/txid/g, '').replace(/hash/g, '');

      // Check globally if this normalized TXID is already submitted by ANY user
      const txQuery = query(collectionGroup(db, 'transactions'), where('txidNormalized', '==', normalized));
      const txSnapshot = await getDocs(txQuery);
      if (!txSnapshot.empty) {
        throw new Error('This Transaction ID has already been used on the platform. Please contact support if you believe this is an error.');
      }

      // Add to Firestore as pending
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'deposit',
        txid: txid.trim(),
        txidNormalized: normalized,
        network: activeTab, // 'TRC20' or 'BSC'
        currency: 'USDT',
        status: 'pending',
        expectedAmount: parseFloat(expectedAmount),
        amount: 0, // amount will be filled by backend upon verification
        createdAt: serverTimestamp()
      });

      toast.success(t('successTxSubmitted'), { id: loadingToast, duration: 6000 });
      setTxid('');
      setExpectedAmount('');
    } catch (error) {
      toast.error(error.message || 'Failed to submit transaction', { id: loadingToast });
    }
    
    setIsVerifying(false);
  };

  const handleMobileDeposit = async () => {
    if (hasPending) return toast.error('You already have a pending transaction.');
    if (!expectedAmount || isNaN(expectedAmount) || parseFloat(expectedAmount) < 500) {
      return toast.error('Minimum deposit is TZS 500');
    }
    if (!mobilePhone || mobilePhone.length < 9) {
      return toast.error('Please enter a valid phone number (e.g. 0744...)');
    }

    setIsVerifying(true);
    setPollingStatus('INITIATING');
    const loadingToast = toast.loading('Initiating push payment to your phone...');

    try {
      // Clean phone number: Palmpesa expects 07... format without +255 usually, or exactly what user inputs.
      // We send it as is, or strip spaces.
      let cleanPhone = mobilePhone.replace(/\s+/g, '');

      // Create transaction first
      const txRef = await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'deposit',
        txid: `MOBILE-${Date.now()}`,
        network: 'MobileMoney',
        currency: 'TZS',
        status: 'pending',
        expectedAmount: parseFloat(expectedAmount),
        amount: 0,
        createdAt: serverTimestamp(),
        phone: cleanPhone
      });

      setLocalTxId(txRef.id);

      // Call Cloud Function
      const initiateFn = httpsCallable(functions, 'palmpesaInitiate');
      const result = await initiateFn({
        name: userData?.displayName || "FINTEX User",
        email: userData?.email || "user@fintex.com",
        phone: cleanPhone,
        amount: parseFloat(expectedAmount),
        transaction_id: txRef.id
      });

      if (result.data && result.data.order_id) {
        setPalmpesaOrderId(result.data.order_id);
        await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', txRef.id), {
          palmpesaOrderId: result.data.order_id
        });
        toast.dismiss(loadingToast);
        setPollingStatus('PENDING');
        setShowPaymentPopup(true);
        pollPaymentStatus(result.data.order_id, txRef.id);
      } else {
        throw new Error('No order ID received from provider');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Payment initiation failed', { id: loadingToast });
      setPollingStatus('FAILED');
    }
    
    setIsVerifying(false);
  };

  const cancelPayment = async () => {
    setShowPaymentPopup(false);
    setPollingStatus('CANCELLED');
    if (localTxId) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', localTxId), {
          status: 'cancelled',
          cancelledAt: serverTimestamp()
        });
        toast('Payment cancelled.', { icon: '🚫' });
      } catch (e) { console.error('Cancel update failed:', e); }
    }
  };

  const pollPaymentStatus = async (orderId, txId) => {
    const checkFn = httpsCallable(functions, 'palmpesaCheckStatus');
    let attempts = 0;
    const maxAttempts = 60; // 60 × 5s = 5 mins
    
    const interval = setInterval(async () => {
      attempts++;
      try {
        const result = await checkFn({ order_id: orderId, local_tx_id: txId });
        const status = result.data.status;
        
        if (status === 'COMPLETED' || status === 'SUCCESS') {
           clearInterval(interval);
           setPollingStatus('COMPLETED');
           toast.success('🎉 Deposit Successful! Balance updated.');
           setExpectedAmount('');
           setTimeout(() => { setShowPaymentPopup(false); }, 3000);
        } else if (status === 'FAILED') {
           clearInterval(interval);
           setPollingStatus('FAILED');
           setShowPaymentPopup(false);
           toast.error('Deposit Failed or Cancelled.');
        } else if (attempts >= maxAttempts) {
           clearInterval(interval);
           setPollingStatus('TIMEOUT');
           setShowPaymentPopup(false);
           // Mark as cancelled in DB after 5-min timeout
           try {
             await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', txId), {
               status: 'cancelled',
               cancelledAt: serverTimestamp(),
               cancelReason: 'timeout'
             });
           } catch(e) { console.error(e); }
           toast.error('Payment timed out after 5 minutes. Please try again.');
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 5000);
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
        <h2 className="mb-0">{t('walletTitle')}</h2>
      </div>

      {/* Show spinner until we know the user's country */}
      {!userData?.country ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid transparent', borderTopColor: 'var(--primary)', borderRightColor: 'rgba(16,185,129,0.3)' }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading wallet...</span>
        </div>
      ) : (<>
      
      {/* Network Switcher — hide crypto for TZ users */}
      {!isTZ && (
        <div style={{ display: 'flex', background: 'var(--border)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '24px', maxWidth: '400px' }}>
          <button
            onClick={() => setActiveTab('TRC20')}
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'TRC20' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'TRC20' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'TRC20' ? 600 : 400 }}
          >USDT (TRC20)</button>
          <button
            onClick={() => setActiveTab('BSC')}
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'BSC' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'BSC' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'BSC' ? 600 : 400 }}
          >USDT (BNB Chain)</button>
        </div>
      )}
      {isTZ && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--primary)', borderRadius: '20px', padding: '6px 14px' }}>
            <Phone size={16} color="var(--primary)" />
            <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>Mobile Money Deposit (TZS)</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {(tab === 'TRC20' || tab === 'BSC') && !isTZ && (
          <motion.div 
            key={tab}
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
                    {t('depositUsdt')} ({activeTab})
                    <button onClick={() => setShowInstructions(true)} style={{ color: 'var(--primary)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '50%' }}>
                      <Info size={16} />
                    </button>
                  </h3>
                  <motion.p 
                    style={{ fontSize: '0.75rem', margin: 0, lineHeight: 1.3, color: 'var(--warning)', fontWeight: 600 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    {t('sendOnlyUsdt').replace('{network}', activeTab === 'TRC20' ? 'TRC20' : 'BEP20')}
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
                  <h4 className="mb-0" style={{ fontSize: '1rem' }}>{t('verifyDeposit')}</h4>
                  <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>{t('expiresIn')}</span>
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
                      placeholder={t('amountPlaceholder')}
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
                      placeholder={t('txidPlaceholder')}
                      disabled={isVerifying || hasPending}
                    />
                  </div>
                </div>
                
                {hasPending && (
                  <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', color: 'var(--warning)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 2s infinite', flexShrink: 0 }}></div>
                    {t('pendingVerification')}
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '10px', fontSize: '0.9rem', opacity: (isVerifying || hasPending) ? 0.5 : 1, cursor: (isVerifying || hasPending) ? 'not-allowed' : 'pointer' }} 
                  onClick={handleVerify}
                  disabled={isVerifying || hasPending}
                >
                  {isVerifying ? t('submitting') : hasPending ? t('verificationInProgress') : t('submitTxid')}
                </button>
              </div>

            </div>
          </motion.div>
        )}

        {tab === 'MobileMoney' && isTZ && (
          <motion.div 
            key="MobileMoney"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            <div className="panel mx-auto" style={{ maxWidth: '500px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={24} color="var(--success)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Automatic Mobile Money</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enter your amount and phone number. A PIN prompt will appear on your phone instantly.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Deposit Amount (TZS)</span>
                  <input 
                    type="number" 
                    className="input-field" 
                    style={{ padding: '12px', fontSize: '1rem', fontWeight: 600 }}
                    value={expectedAmount} 
                    onChange={(e) => setExpectedAmount(e.target.value)} 
                    placeholder="e.g. 5000"
                    disabled={isVerifying || pollingStatus === 'PENDING'}
                  />
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Mobile Number (e.g. 0744...)</span>
                  <input 
                    type="text" 
                    className="input-field" 
                    style={{ padding: '12px', fontSize: '1rem' }}
                    value={mobilePhone} 
                    onChange={(e) => setMobilePhone(e.target.value)} 
                    placeholder="07XXXXXXXX"
                    disabled={isVerifying || pollingStatus === 'PENDING'}
                  />
                </div>
              </div>

              {pollingStatus === 'PENDING' && (
                <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', color: 'var(--warning)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 1.5s infinite', flexShrink: 0 }}></div>
                  Check your phone and enter your PIN. Waiting for confirmation...
                </div>
              )}
              {pollingStatus === 'COMPLETED' && (
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} /> Deposit successful! Balance updated.
                </div>
              )}

              <button 
                className="btn btn-success" 
                style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600, opacity: (isVerifying || pollingStatus === 'PENDING') ? 0.6 : 1 }} 
                onClick={handleMobileDeposit}
                disabled={isVerifying || pollingStatus === 'PENDING'}
              >
                {isVerifying || pollingStatus === 'PENDING' ? 'Processing...' : 'Deposit via Mobile Money'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowInstructions(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: 'var(--radius-md)', maxWidth: '450px', width: '100%', border: '1px solid var(--border)', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setShowInstructions(false)} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--text-muted)', background: 'transparent' }}>
                <X size={20} />
              </button>
              <h3 className="mb-3 text-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <Info size={20} />{isTZ ? 'How to Deposit via Mobile Money' : t('howToDeposit')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', margin: '10px 0 16px 0' }}>
                {(isTZ ? [
                  <span>Enter your <strong>TZS amount</strong> (minimum TZS 500).</span>,
                  <span>Enter your <strong>M-Pesa / Tigo Pesa / Airtel Money</strong> phone number (e.g. 0744...).</span>,
                  <span>Tap <strong>"Deposit via Mobile Money"</strong> to send a push request.</span>,
                  <span>A <strong>USSD prompt</strong> will appear on your phone — enter your PIN to confirm.</span>,
                  <span>Your balance will be <strong>credited instantly</strong> once payment is confirmed.</span>,
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>Commissions are distributed automatically to your referrers.</span>,
                ] : [
                  "Open your crypto app (e.g., Binance, Trust Wallet).",
                  <span>Go to <strong>Withdraw</strong> and select <strong>USDT</strong>.</span>,
                  <span>Select Network: <strong>{activeTab === 'TRC20' ? 'Tron (TRC20)' : 'BNB Smart Chain (BEP20)'}</strong>. <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Wrong network = lost funds!</span></span>,
                  "Copy our deposit address and paste it into your withdrawal address field.",
                  "Enter the amount and confirm the transfer.",
                  <span>Once "Completed", locate the <strong>Transaction Hash (TXID)</strong> in the details.</span>,
                  <span>Paste Amount and TXID into <em>Verify Deposit</em> and Submit.</span>
                ]).map((step, idx, arr) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: idx === arr.length - 1 ? '0' : '16px' }}>
                    {idx !== arr.length - 1 && <div style={{ position: 'absolute', left: '8px', top: '20px', bottom: 0, width: '2px', background: '#10B981', opacity: 0.4 }}></div>}
                    <div style={{ flexShrink: 0, zIndex: 1, background: 'var(--bg-panel)', display: 'flex', alignItems: 'flex-start', paddingTop: '2px' }}>
                      <CheckCircle2 size={18} color="#10B981" />
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.4, paddingTop: '3px' }}>{step}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary mt-3 w-100" onClick={() => setShowInstructions(false)} style={{ padding: '8px', fontSize: '0.85rem' }}>{t('iUnderstand')}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Confirmation Popup */}
      <AnimatePresence>
        {showPaymentPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ background: 'linear-gradient(135deg, #0f1a12 0%, #111827 100%)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '20px 20px 16px', maxWidth: '340px', width: '100%', textAlign: 'center', boxShadow: '0 0 40px rgba(16,185,129,0.12), 0 20px 40px rgba(0,0,0,0.6)' }}
            >
              {/* Spinner + Badge — compact 80px */}
              <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 12px' }}>
                {pollingStatus === 'COMPLETED' ? (
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '3px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <CheckCircle2 size={38} color="#10B981" />
                  </motion.div>
                ) : (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#10B981', borderRightColor: 'rgba(16,185,129,0.3)' }}
                    />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      style={{ position: 'absolute', inset: '7px', borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'rgba(16,185,129,0.5)', borderLeftColor: 'rgba(16,185,129,0.2)' }}
                    />
                    <div style={{ position: 'absolute', inset: '14px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                        <CheckCircle2 size={24} color="#10B981" />
                      </motion.div>
                    </div>
                  </>
                )}
              </div>

              {pollingStatus === 'COMPLETED' ? (
                <div>
                  <h3 style={{ color: '#10B981', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px' }}>Payment Confirmed! 🎉</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>Your balance has been updated successfully.</p>
                </div>
              ) : (
                <div>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700, margin: '0 0 2px' }}>Waiting for PIN</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0 0 10px' }}>USSD prompt sent to your phone</p>

                  {/* Compact countdown */}
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '8px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time Remaining</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: popupCountdown < 60 ? '#ef4444' : '#10B981', fontVariantNumeric: 'tabular-nums' }}>
                      {String(Math.floor(popupCountdown / 60)).padStart(2, '0')}:{String(popupCountdown % 60).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Compact step instructions */}
                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {[
                      { icon: '📱', text: 'Check your phone for a USSD prompt' },
                      { icon: '🔢', text: 'Enter your mobile money PIN' },
                      { icon: '✅', text: 'Balance updates instantly' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '7px 10px' }}>
                        <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={cancelPayment}
                    style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '7px 16px', color: '#ef4444', fontSize: '0.78rem', cursor: 'pointer', width: '100%' }}
                  >
                    Cancel Payment
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </>)}

    </motion.div>
  );
};




