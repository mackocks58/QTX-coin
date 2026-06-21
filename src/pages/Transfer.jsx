import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, Send, AlertTriangle, CheckCircle2, X, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const PendingProgressBlocker = ({ tx }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
       const created = tx.createdAt?.toDate ? tx.createdAt.toDate().getTime() : Date.now();
       const now = Date.now();
       const diff = now - created;
       const max = 5 * 60 * 1000;
       
       let p = (diff / max) * 100;
       if (p > 100) p = 100;
       if (p < 0) p = 0;
       setProgress(p);
    }, 1000);
    return () => clearInterval(interval);
  }, [tx.createdAt]);

  const step1Done = true;
  const step2Done = progress > 5;
  const step3Done = progress >= 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 99999, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: '20px',
        backdropFilter: 'blur(10px)'
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '28px',
          padding: '32px 24px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', flexDirection: 'column'
        }}
      >
        <h3 style={{ margin: '0 0 24px 0', textAlign: 'center', fontSize: '1.4rem', color: 'var(--text-primary)' }}>Transfer in Progress</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '0 10px', marginBottom: '32px' }}>
           <div style={{ position: 'absolute', top: '15px', left: '20px', right: '20px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', zIndex: 1 }} />
           <div style={{ position: 'absolute', top: '15px', left: '20px', width: `calc((100% - 40px) * (${progress} / 100))`, height: '4px', background: 'var(--primary)', borderRadius: '2px', zIndex: 2, transition: 'width 1s linear' }} />
           
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 3 }}>
             <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: step1Done ? 'var(--primary)' : 'var(--bg-panel)', border: step1Done ? 'none' : '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', boxShadow: step1Done ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none', transition: 'all 0.5s' }}>1</div>
             <span style={{ fontSize: '10px', color: step1Done ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>Sent</span>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 3 }}>
             <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: step2Done ? 'var(--primary)' : 'var(--bg-panel)', border: step2Done ? 'none' : '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', boxShadow: step2Done ? '0 0 15px rgba(59, 130, 246, 0.5)' : 'none', transition: 'all 0.5s' }}>2</div>
             <span style={{ fontSize: '10px', color: step2Done ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>Processing</span>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 3 }}>
             <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: step3Done ? 'var(--success)' : 'var(--bg-panel)', border: step3Done ? 'none' : '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', boxShadow: step3Done ? '0 0 15px rgba(16, 185, 129, 0.5)' : 'none', transition: 'all 0.5s' }}>3</div>
             <span style={{ fontSize: '10px', color: step3Done ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>Completed</span>
           </div>
        </div>
        
        {/* Details Box */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
             <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Status</span>
             <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '13px' }}>Pending Security Check...</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
             <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Transaction ID</span>
             <span style={{ color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 600, fontSize: '11px' }}>QTX-{tx.id?.substring(0,8).toUpperCase()}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
             <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Receiver</span>
             <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>{tx.receiverEmail}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
             <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Amount Sent</span>
             <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '14px' }}>${Number(tx.amount || 0).toFixed(2)}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
             <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Network Fee (5%)</span>
             <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '13px' }}>${Number(tx.fee || 0).toFixed(2)}</span>
           </div>
           <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
             <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Total Deducted</span>
             <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '16px' }}>${Number(tx.totalDeduction || 0).toFixed(2)}</span>
           </div>
        </div>
        
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '20px', lineHeight: '1.5' }}>
          Please wait while your transfer is being securely confirmed. This process usually takes between 5 and 15 minutes.
        </p>
        
        {/* Return Button */}
        <button 
          disabled={true}
          style={{ width: '100%', marginTop: '20px', padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px', fontWeight: 600, cursor: 'not-allowed' }}
        >
          Waiting for completion...
        </button>
      </motion.div>
    </motion.div>
  );
};

export const Transfer = () => {
  const { currentUser, balance } = useAuth();
  const { formatCurrency, convertAndFormatCurrency, symbol } = useCurrency();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [receiverInput, setReceiverInput] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1); // 1 = Input, 2 = Confirm, 3 = Success
  const [loading, setLoading] = useState(false);
  const [receiverData, setReceiverData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pendingTransfer, setPendingTransfer] = useState(null);

  const controls = useAnimation();

  useEffect(() => {
    controls.start({ opacity: 1, y: 0 });
  }, [controls]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      where('type', '==', 'transfer_out'),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setPendingTransfer({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setPendingTransfer(null);
      }
    });
    return () => unsub();
  }, [currentUser]);

  const triggerShake = () => {
    controls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    });
  };

  const handleLookup = async () => {
    const numAmount = Number(amount);
    const fee = numAmount * 0.05;
    const totalDeduction = numAmount + fee;

    if (!receiverInput) return setErrorMsg('Please enter a Receiver ID or Email.');
    if (receiverInput === currentUser.email || receiverInput === currentUser.uid) {
        return setErrorMsg('You cannot send funds to yourself.');
    }
    if (!amount || isNaN(numAmount) || numAmount <= 0) return setErrorMsg('Please enter a valid amount.');
    if (totalDeduction > balance) {
        triggerShake();
        return setErrorMsg(
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>INSUFFICIENT BALANCE</div>
              <div>Your Main Balance is <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatCurrency(balance)}</span>.</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount + 5% Fee ({formatCurrency(fee)}) = {formatCurrency(totalDeduction)}</div>
            </div>
        );
    }

    setLoading(true);
    let foundUser = null;

    try {
      // Check if email
      if (receiverInput.includes('@')) {
        const q = query(collection(db, 'users'), where('email', '==', receiverInput));
        const snap = await getDocs(q);
        if (!snap.empty) {
            foundUser = { uid: snap.docs[0].id, ...snap.docs[0].data() };
        }
      } else {
        // Assume UID
        const docRef = doc(db, 'users', receiverInput);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            foundUser = { uid: docSnap.id, ...docSnap.data() };
        }
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(false);

    if (!foundUser) {
        return setErrorMsg('Recipient not found. Please check the ID or email.');
    }

    setReceiverData({
        uid: foundUser.uid,
        email: foundUser.email || 'No email associated',
        name: foundUser.name || 'User'
    });
    setStep(2);
  };

  const executeTransfer = async () => {
    const numAmount = Number(amount);
    setLoading(true);
    try {
      // Just write to Sender's transactions. Cloud Function will pick it up and process it.
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'transfer_out',
        amount: numAmount,
        fee: numAmount * 0.05,
        totalDeduction: numAmount * 1.05,
        status: 'pending',
        receiverUid: receiverData.uid,
        receiverEmail: receiverData.email,
        currency: 'USD',
        createdAt: serverTimestamp(),
      });

      setStep(3);
    } catch (error) {
      setErrorMsg('Failed to process transfer. Please try again later.');
    }
    setLoading(false);
  };

  return (
    <>
      <AnimatePresence>
        {pendingTransfer && <PendingProgressBlocker tx={pendingTransfer} />}
      </AnimatePresence>
      <motion.div 
        className="page-content"
        initial={{ opacity: 0, y: 10 }}
        animate={controls}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        style={{ padding: '16px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button 
            onClick={() => step > 1 ? setStep(1) : navigate(-1)}
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '20px', margin: 0 }}>P2P Transfer</h2>
          </div>
        </div>

        {step === 1 && (
            <div className="panel mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="text-muted">Available Balance</span>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(balance)}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="input-group">
                  <label className="input-label">Recipient ID or Email</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Search size={18} /></span>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Enter UID or Email..." 
                      value={receiverInput}
                      onChange={(e) => setReceiverInput(e.target.value)}
                      style={{ paddingLeft: '40px', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Amount</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>{symbol}</span>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="10.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={{ paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <button 
                      onClick={() => setAmount((balance / 1.05).toFixed(2).toString())}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <button 
                  className="btn btn-primary w-100" 
                  style={{ padding: '14px', fontSize: '16px', fontWeight: 600, marginTop: '8px' }}
                  onClick={handleLookup}
                  disabled={loading}
                >
                  {loading ? 'Finding Recipient...' : 'Proceed'}
                </button>
              </div>
            </div>
        )}
      </motion.div>

      <AnimatePresence>
        {/* Error Bottom Sheet */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ 
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', 
              zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setErrorMsg(null)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px',
                padding: '12px 24px 32px 24px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -15px 40px rgba(0,0,0,0.4)',
                position: 'relative'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--text-muted)', opacity: 0.3, borderRadius: '10px', alignSelf: 'center', marginBottom: '24px' }} />
              
              <div style={{ textAlign: 'center', padding: '10px 0 20px 0' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                  <AlertTriangle size={36} color="var(--danger)" />
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Transfer Error
                </h3>
                <div style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.5' }}>
                  {errorMsg}
                </div>
              </div>

              <button onClick={() => setErrorMsg(null)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>
                Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Confirmation Bottom Sheet */}
        {step === 2 && receiverData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ 
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', 
              zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => !loading && setStep(1)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px',
                padding: '12px 24px 32px 24px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -15px 40px rgba(0,0,0,0.4)',
                position: 'relative'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--text-muted)', opacity: 0.3, borderRadius: '10px', alignSelf: 'center', marginBottom: '16px' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                  Confirm Transfer
                </h3>
                <button type="button" onClick={() => !loading && setStep(1)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'background 0.2s' }} disabled={loading}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '0' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Amount to Send</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-1px' }}>{formatCurrency(Number(amount))}</div>
                  <div style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '4px', fontWeight: 600 }}>+ 5% Transfer Fee ({formatCurrency(Number(amount) * 0.05)})</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '8px', fontWeight: 600 }}>Total Deduction: {formatCurrency(Number(amount) * 1.05)}</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Recipient Details</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ShieldCheck size={30} color="var(--success)" />
                      <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Verified User</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Email</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', wordBreak: 'break-all', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', color: 'var(--text-primary)' }}>
                      {receiverData.email}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>User ID</span>
                    <span style={{ fontWeight: 600, fontSize: '14px', wordBreak: 'break-all', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', color: 'var(--primary)' }}>
                      {receiverData.uid}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                    onClick={executeTransfer}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Success Bottom Sheet */}
        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ 
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', 
              zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              backdropFilter: 'blur(4px)'
            }}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
              style={{
                backgroundColor: 'var(--bg-panel)',
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px',
                padding: '12px 24px 32px 24px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -15px 40px rgba(0,0,0,0.4)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--text-muted)', opacity: 0.3, borderRadius: '10px', alignSelf: 'center', marginBottom: '32px', zIndex: 10 }} />
              
              <div style={{ position: 'relative', marginBottom: '40px', display: 'flex', justifyContent: 'center' }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{ 
                      x: Math.cos((i * 360) / 16 * (Math.PI / 180)) * 120, 
                      y: Math.sin((i * 360) / 16 * (Math.PI / 180)) * 120,
                      scale: [0, Math.random() * 1.5 + 0.8, 0],
                      opacity: [1, 1, 0]
                    }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '6px',
                      height: '6px',
                      marginTop: '-3px',
                      marginLeft: '-3px',
                      borderRadius: '50%',
                      background: i % 3 === 0 ? '#fff' : 'var(--success)',
                      boxShadow: '0 0 12px var(--success)',
                      zIndex: 1
                    }}
                  />
                ))}
                
                <motion.div
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: [0, 1.5], opacity: [0.8, 0] }}
                  transition={{ duration: 1, ease: "easeOut", repeat: 1, delay: 0.2 }}
                  style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', border: '4px solid var(--success)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}
                />

                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 150, delay: 0.2 }}
                  style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--success)', position: 'relative', zIndex: 2, boxShadow: '0 0 35px rgba(16, 185, 129, 0.4)' }}
                >
                  <CheckCircle2 size={56} color="var(--success)" />
                </motion.div>
              </div>

              <motion.h3 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{ fontSize: '1.6rem', margin: '0 0 12px 0', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 800, letterSpacing: '-0.5px' }}
              >
                Transfer Request Queued
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '1.05rem', marginBottom: '36px', lineHeight: 1.5 }}
              >
                Your transfer of {formatCurrency(Number(amount))} has been submitted and is pending processing. This usually takes 5 to 15 minutes to complete.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', zIndex: 10 }}
                onClick={() => {
                  setStep(1);
                  navigate('/transactions');
                }}
              >
                View History
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
