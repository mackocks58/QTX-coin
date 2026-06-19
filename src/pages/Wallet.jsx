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
import { Copy, CheckCircle2, Info, X, ChevronLeft, Phone, AlertTriangle } from 'lucide-react';

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
  const [errorMsg, setErrorMsg] = useState(null);
  const [successData, setSuccessData] = useState(null);

  // Palmpesa specific state
  const [mobilePhone, setMobilePhone] = useState(userData?.phoneNumber || '');
  const [pollingStatus, setPollingStatus] = useState(null);
  const [palmpesaOrderId, setPalmpesaOrderId] = useState(null);
  const [localTxId, setLocalTxId] = useState(null);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [popupCountdown, setPopupCountdown] = useState(4 * 60); // 4 minutes

  // Zimbabwe specific state
  const isZW = userData?.country === 'Zimbabwe' || userData?.country === 'ZW';
  const [zwRate, setZwRate] = useState(26.75);
  const [zwNetworks, setZwNetworks] = useState([
    { id: 'ecocash', name: 'EcoCash', logo: 'https://ui-avatars.com/api/?name=EcoCash&background=0ea5e9&color=fff&rounded=true&bold=true', accountName: 'Admin EcoCash', accountNo: '077XXXXXXX', disabled: false, disableReason: '' },
    { id: 'innbucks', name: 'InnBucks', logo: 'https://ui-avatars.com/api/?name=InnBucks&background=ef4444&color=fff&rounded=true&bold=true', accountName: 'Admin InnBucks', accountNo: '071XXXXXXX', disabled: false, disableReason: '' },
    { id: 'onemoney', name: 'OneMoney', logo: 'https://ui-avatars.com/api/?name=One+Money&background=f97316&color=fff&rounded=true&bold=true', accountName: 'Admin OneMoney', accountNo: '073XXXXXXX', disabled: false, disableReason: '' }
  ]);
  const [zwDepositMethod, setZwDepositMethod] = useState(''); // 'MobileMoney' or 'Binance'
  const [zwSelectedNetwork, setZwSelectedNetwork] = useState(null);
  const [zwCryptoNetwork, setZwCryptoNetwork] = useState('TRC20'); // local crypto network state
  const [zwShowPaymentDetails, setZwShowPaymentDetails] = useState(false);
  const [zwShowSenderDetails, setZwShowSenderDetails] = useState(false);
  const [zwSenderPhone, setZwSenderPhone] = useState(userData?.phoneNumber || '');
  const [zwSenderName, setZwSenderName] = useState(userData?.displayName || '');

  // Zambia specific state
  const isZM = userData?.country === 'Zambia' || userData?.country === 'ZM';
  const [zmRate, setZmRate] = useState(26.5);
  const [zmNetworks, setZmNetworks] = useState([
    { id: 'mtn', name: 'MTN Mobile Money', logo: 'https://ui-avatars.com/api/?name=MTN&background=fbbf24&color=000&rounded=true&bold=true', accountName: 'Admin MTN', accountNo: '096XXXXXXX', disabled: false, disableReason: '' },
    { id: 'airtel', name: 'Airtel Money', logo: 'https://ui-avatars.com/api/?name=Airtel&background=dc2626&color=fff&rounded=true&bold=true', accountName: 'Admin Airtel', accountNo: '097XXXXXXX', disabled: false, disableReason: '' },
    { id: 'zamtel', name: 'Zamtel', logo: 'https://ui-avatars.com/api/?name=Zamtel&background=16a34a&color=fff&rounded=true&bold=true', accountName: 'Admin Zamtel', accountNo: '095XXXXXXX', disabled: false, disableReason: '' }
  ]);
  const [zmDepositMethod, setZmDepositMethod] = useState(''); // 'MobileMoney' or 'Binance'
  const [zmSelectedNetwork, setZmSelectedNetwork] = useState(null);
  const [zmShowPaymentDetails, setZmShowPaymentDetails] = useState(false);
  const [zmShowSenderDetails, setZmShowSenderDetails] = useState(false);
  const [zmSenderPhone, setZmSenderPhone] = useState(userData?.phoneNumber || '');
  const [zmSenderName, setZmSenderName] = useState(userData?.displayName || '');

  // Use environment variables for the wallet addresses
  const trc20Address = import.meta.env.VITE_USDT_ADDRESS || 'TBteWdQZAdWJzXCaa61dogDFVNH8pSA88J';
  const bscAddress = import.meta.env.VITE_BSC_ADDRESS || '0x66922e6229f9501319aa4425f4cd53773fc66a91';
  const depositAddress = activeTab === 'TRC20' ? trc20Address : bscAddress;

  // Set initial tab only after we know the user's country
  useEffect(() => {
    if (activeTab === null && userData?.country) {
      if (isZW) {
        setActiveTab('ZWMobileBinance'); // Custom initial state for ZW
      } else if (isZM) {
        setActiveTab('ZMMobileBinance'); // Custom initial state for ZM
      } else {
        setActiveTab(isTZ ? 'MobileMoney' : 'TRC20');
      }
    }
  }, [isTZ, isZW, isZM, activeTab, userData]);

  // Synchronous derived tab - safe only when country is known
  const tab = !userData?.country ? null : (activeTab !== null ? activeTab : (isZW ? 'ZWMobileBinance' : (isZM ? 'ZMMobileBinance' : (isTZ ? 'MobileMoney' : 'TRC20'))));

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

  // Listen for dynamic ZW settings
  useEffect(() => {
    if (!isZW) return;
    const unsub = onSnapshot(doc(db, 'settings', 'zwPayment'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.rate) setZwRate(data.rate);
        if (data.networks) {
          setZwNetworks(data.networks);
          // Auto-deselect network if it got disabled while selected
          setZwSelectedNetwork(prev => {
            if (!prev) return null;
            const updatedNet = data.networks.find(n => n.id === prev.id);
            if (updatedNet?.disabled) return null;
            return updatedNet || null;
          });
        }
      }
    });
    return unsub;
  }, [isZW]);

  // Listen for dynamic ZM settings
  useEffect(() => {
    if (!isZM) return;
    const unsub = onSnapshot(doc(db, 'settings', 'zmPayment'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.rate) setZmRate(data.rate);
        if (data.networks) {
          setZmNetworks(data.networks);
          setZmSelectedNetwork(prev => {
            if (!prev) return null;
            const updatedNet = data.networks.find(n => n.id === prev.id);
            if (updatedNet?.disabled) return null;
            return updatedNet || null;
          });
        }
      }
    });
    return unsub;
  }, [isZM]);

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
      return setErrorMsg('You already have a pending transaction.');
    }
    if (!expectedAmount || isNaN(expectedAmount) || parseFloat(expectedAmount) <= 0) {
      return setErrorMsg('Please enter a valid transfer amount');
    }
    if (!txid || txid.length < 10) {
      return setErrorMsg('Please enter a valid Transaction ID (TXID)');
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

      toast.dismiss(loadingToast);
      setSuccessData({
        title: 'Verifying Deposit ⏳',
        message: 'Transaction submitted and is pending verification.',
        details: [
          { label: 'Network', value: activeTab },
          { label: 'Amount', value: parseFloat(expectedAmount).toLocaleString() + ' USDT', color: 'var(--primary)' },
          { label: 'TXID', value: txid.substring(0, 8) + '...' + txid.substring(txid.length - 8) },
          { label: 'Status', value: 'Pending', color: 'var(--warning)' }
        ]
      });
      setTxid('');
      setExpectedAmount('');
    } catch (error) {
      toast.dismiss(loadingToast);
      setErrorMsg(error.message || 'Failed to submit transaction');
    }
    
    setIsVerifying(false);
  };

  const handleMobileDeposit = async () => {
    if (hasPending) return setErrorMsg('You already have a pending transaction.');
    if (!expectedAmount || isNaN(expectedAmount) || parseFloat(expectedAmount) < 500) {
      return setErrorMsg('Minimum deposit is TZS 500');
    }
    if (!mobilePhone || mobilePhone.length < 9) {
      return setErrorMsg('Please enter a valid phone number (e.g. 0744...)');
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
      toast.dismiss(loadingToast);
      setErrorMsg(error.message || 'Payment initiation failed');
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
        setErrorMsg('Payment cancelled. 🚫');
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
           setSuccessData({
             title: 'Deposit Successful 🎉',
             message: 'Your balance has been updated instantly.',
             details: [
               { label: 'Network', value: 'Mobile Money' },
               { label: 'Amount', value: `TZS ${parseFloat(expectedAmount).toLocaleString()}`, color: 'var(--success)' },
               { label: 'Status', value: 'Completed', color: 'var(--success)' }
             ]
           });
           setExpectedAmount('');
           setTimeout(() => { setShowPaymentPopup(false); }, 3000);
        } else if (status === 'FAILED') {
           clearInterval(interval);
           setPollingStatus('FAILED');
           setShowPaymentPopup(false);
           setErrorMsg('Deposit Failed or Cancelled.');
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
           setErrorMsg('Payment timed out after 5 minutes. Please try again.');
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 5000);
  };

  const handleZWVerifySubmit = async () => {
    if (hasPending) return setErrorMsg('You already have a pending transaction.');
    if (!zwSenderPhone || zwSenderPhone.length < 5) return setErrorMsg('Please enter a valid sender phone.');
    if (!zwSenderName || zwSenderName.length < 2) return setErrorMsg('Please enter a valid sender name.');
    
    setIsVerifying(true);
    const loadingToast = toast.loading('Submitting transaction details...');

    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'deposit',
        txid: `ZW-${Date.now()}`,
        network: zwSelectedNetwork.name,
        currency: 'USD',
        status: 'pending',
        expectedAmount: parseFloat(expectedAmount),
        amount: 0,
        phone: zwSenderPhone,
        senderName: zwSenderName,
        createdAt: serverTimestamp()
      });

      toast.dismiss(loadingToast);
      setZwShowSenderDetails(false);
      setZwShowPaymentDetails(false);
      setZwDepositMethod('');
      setExpectedAmount('');
      
      setSuccessData({
        title: 'Verification Submitted ⏳',
        message: 'Your deposit details have been sent to admin for approval.',
        details: [
          { label: 'Network', value: zwSelectedNetwork.name },
          { label: 'Amount', value: `$${parseFloat(expectedAmount).toLocaleString()}`, color: 'var(--primary)' },
          { label: 'Sender Name', value: zwSenderName },
          { label: 'Status', value: 'Pending Approval', color: 'var(--warning)' }
        ]
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      setErrorMsg(error.message || 'Failed to submit details');
    }
    setIsVerifying(false);
  };

  const handleZMVerifySubmit = async () => {
    if (hasPending) return setErrorMsg('You already have a pending transaction.');
    if (!zmSenderPhone || zmSenderPhone.length < 5) return setErrorMsg('Please enter a valid sender phone.');
    if (!zmSenderName || zmSenderName.length < 2) return setErrorMsg('Please enter a valid sender name.');
    
    setIsVerifying(true);
    const loadingToast = toast.loading('Submitting transaction details...');

    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'deposit',
        txid: `ZM-${Date.now()}`,
        network: zmSelectedNetwork.name,
        currency: 'USD',
        status: 'pending',
        expectedAmount: parseFloat(expectedAmount),
        amount: 0,
        phone: zmSenderPhone,
        senderName: zmSenderName,
        createdAt: serverTimestamp()
      });

      toast.dismiss(loadingToast);
      setZmShowSenderDetails(false);
      setZmShowPaymentDetails(false);
      setZmDepositMethod('');
      setExpectedAmount('');
      
      setSuccessData({
        title: 'Verification Submitted ⏳',
        message: 'Your deposit details have been sent to admin for approval.',
        details: [
          { label: 'Network', value: zmSelectedNetwork.name },
          { label: 'Amount', value: `$${parseFloat(expectedAmount).toLocaleString()}`, color: 'var(--primary)' },
          { label: 'Sender Name', value: zmSenderName },
          { label: 'Status', value: 'Pending Approval', color: 'var(--warning)' }
        ]
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      setErrorMsg(error.message || 'Failed to submit details');
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
      {!isTZ && activeTab !== 'ZWMobileBinance' && activeTab !== 'ZMMobileBinance' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', background: 'var(--border)', padding: '4px', borderRadius: 'var(--radius-md)', flex: 1, maxWidth: '400px' }}>
            <button
              onClick={() => setActiveTab('TRC20')}
              style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'TRC20' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'TRC20' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'TRC20' ? 600 : 400 }}
            >USDT (TRC20)</button>
            <button
              onClick={() => setActiveTab('BSC')}
              style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'BSC' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'BSC' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'BSC' ? 600 : 400 }}
            >USDT (BNB Chain)</button>
          </div>
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

        {/* ZIMBABWE WALLET FLOW */}
        {tab === 'ZWMobileBinance' && isZW && (
           <motion.div 
             key="ZWMobileBinance"
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 10 }}
           >
             <div className="panel mx-auto" style={{ maxWidth: '500px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {!zwDepositMethod ? (
                 <>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>Select Deposit Method</h3>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                     <div 
                       onClick={() => setZwDepositMethod('MobileMoney')}
                       style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                     >
                       <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Phone size={24} color="var(--primary)" />
                       </div>
                       <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mobile Money</span>
                     </div>
                     <div 
                       onClick={() => {
                         setZwDepositMethod('');
                         setActiveTab('TRC20');
                       }}
                       style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                     >
                       <div style={{ background: 'rgba(243, 186, 47, 0.1)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png" alt="Binance" style={{ width: '24px', height: '24px' }} />
                       </div>
                       <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Binance (USDT)</span>
                     </div>
                   </div>
                 </>
               ) : (
                 <>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                     <button onClick={() => setZwDepositMethod('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                       <ChevronLeft size={20} />
                     </button>
                     <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Mobile Money</h3>
                   </div>
                   
                   <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>1. Select your network</p>
                   <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {zwNetworks.map((net) => {
                        const isSelected = zwSelectedNetwork?.id === net.id;
                        return (
                          <div 
                            key={net.id} 
                            onClick={() => {
                              if (!net.disabled) setZwSelectedNetwork(net);
                            }}
                            style={{ 
                              flex: '1 1 calc(33.3% - 6px)', 
                              background: net.disabled ? 'rgba(255,255,255,0.02)' : isSelected ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-dark)', 
                              border: `1px solid ${isSelected && !net.disabled ? 'var(--primary)' : 'var(--border)'}`, 
                              borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', 
                              cursor: net.disabled ? 'not-allowed' : 'pointer',
                              opacity: net.disabled ? 0.4 : 1,
                              position: 'relative'
                            }}
                          >
                            {net.disabled && (
                              <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--danger)', color: '#fff', fontSize: '9px', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                                Disabled
                              </div>
                            )}
                            <img src={net.logo} alt={net.name} style={{ width: '28px', height: '28px', objectFit: 'contain', filter: net.disabled ? 'grayscale(100%)' : 'none' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isSelected && !net.disabled ? 'var(--primary)' : 'var(--text-primary)' }}>{net.name}</span>
                            {net.disabled && net.disableReason && (
                              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.1', marginTop: '2px' }}>
                                {net.disableReason}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                   
                   {zwSelectedNetwork && (
                     <>
                       <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>2. Enter Deposit Amount (USD)</p>
                       <div className="input-group" style={{ marginBottom: '4px' }}>
                         <input 
                           type="number" 
                           className="input-field" 
                           style={{ padding: '10px', fontSize: '1rem', fontWeight: 600 }}
                           value={expectedAmount} 
                           onChange={(e) => setExpectedAmount(e.target.value)} 
                           placeholder="Enter Amount in USD"
                         />
                       </div>
                       <div style={{ marginBottom: '12px', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Amount to send (ZWG):</span>
                         <span style={{ color: '#10B981', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.5px' }}>
                           {(parseFloat(expectedAmount || 0) * zwRate).toLocaleString()}
                         </span>
                       </div>
                       
                       {hasPending && (
                         <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', color: 'var(--warning)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                           <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 2s infinite', flexShrink: 0 }}></div>
                           {t('pendingVerification')}
                         </div>
                       )}

                       <button 
                         className="btn btn-primary" 
                         style={{ width: '100%', padding: '10px', fontSize: '1rem', opacity: hasPending ? 0.5 : 1, cursor: hasPending ? 'not-allowed' : 'pointer' }} 
                         onClick={() => {
                           if (hasPending) return setErrorMsg('You already have a pending transaction.');
                           if (!expectedAmount || isNaN(expectedAmount) || parseFloat(expectedAmount) <= 0) {
                             return setErrorMsg('Please enter a valid amount');
                           }
                           setZwShowPaymentDetails(true);
                         }}
                         disabled={hasPending}
                       >
                         {hasPending ? 'Pending Transaction' : 'Next'}
                       </button>
                     </>
                   )}
                 </>
               )}
             </div>
           </motion.div>
        )}

        {/* ZAMBIA WALLET FLOW */}
        {tab === 'ZMMobileBinance' && isZM && (
           <motion.div 
             key="ZMMobileBinance"
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 10 }}
           >
             <div className="panel mx-auto" style={{ maxWidth: '500px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {!zmDepositMethod ? (
                 <>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>Select Deposit Method</h3>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                     <div 
                       onClick={() => setZmDepositMethod('MobileMoney')}
                       style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                     >
                       <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Phone size={24} color="var(--primary)" />
                       </div>
                       <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mobile Money</span>
                     </div>
                     <div 
                       onClick={() => {
                         setZmDepositMethod('');
                         setActiveTab('TRC20');
                       }}
                       style={{ background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                     >
                       <div style={{ background: 'rgba(243, 186, 47, 0.1)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png" alt="Binance" style={{ width: '24px', height: '24px' }} />
                       </div>
                       <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Binance (USDT)</span>
                     </div>
                   </div>
                 </>
               ) : (
                 <>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                     <button onClick={() => setZmDepositMethod('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                       <ChevronLeft size={20} />
                     </button>
                     <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Mobile Money</h3>
                   </div>
                   
                   <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>1. Select your network</p>
                   <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      {zmNetworks.map((net) => {
                        const isSelected = zmSelectedNetwork?.id === net.id;
                        return (
                          <div 
                            key={net.id} 
                            onClick={() => {
                              if (!net.disabled) setZmSelectedNetwork(net);
                            }}
                            style={{ 
                              flex: '1 1 calc(33.3% - 6px)', 
                              background: net.disabled ? 'rgba(255,255,255,0.02)' : isSelected ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-dark)', 
                              border: `1px solid ${isSelected && !net.disabled ? 'var(--primary)' : 'var(--border)'}`, 
                              borderRadius: '10px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', 
                              cursor: net.disabled ? 'not-allowed' : 'pointer',
                              opacity: net.disabled ? 0.4 : 1,
                              position: 'relative'
                            }}
                          >
                            {net.disabled && (
                              <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--danger)', color: '#fff', fontSize: '9px', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>
                                Disabled
                              </div>
                            )}
                            <img src={net.logo} alt={net.name} style={{ width: '28px', height: '28px', objectFit: 'contain', filter: net.disabled ? 'grayscale(100%)' : 'none' }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isSelected && !net.disabled ? 'var(--primary)' : 'var(--text-primary)' }}>{net.name}</span>
                            {net.disabled && net.disableReason && (
                              <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1.1', marginTop: '2px' }}>
                                {net.disableReason}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                   
                   {zmSelectedNetwork && (
                     <>
                       <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>2. Enter Deposit Amount (USD)</p>
                       <div className="input-group" style={{ marginBottom: '4px' }}>
                         <input 
                           type="number" 
                           className="input-field" 
                           style={{ padding: '10px', fontSize: '1rem', fontWeight: 600 }}
                           value={expectedAmount} 
                           onChange={(e) => setExpectedAmount(e.target.value)} 
                           placeholder="Enter Amount in USD"
                         />
                       </div>
                       <div style={{ marginBottom: '12px', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>Amount to send (ZMW):</span>
                         <span style={{ color: '#10B981', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.5px' }}>
                           {(parseFloat(expectedAmount || 0) * zmRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                       </div>
                       
                       {hasPending && (
                         <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', color: 'var(--warning)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                           <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 2s infinite', flexShrink: 0 }}></div>
                           {t('pendingVerification')}
                         </div>
                       )}

                       <button 
                         className="btn btn-primary" 
                         style={{ width: '100%', padding: '10px', fontSize: '1rem', opacity: hasPending ? 0.5 : 1, cursor: hasPending ? 'not-allowed' : 'pointer' }} 
                         onClick={() => {
                           if (hasPending) return setErrorMsg('You already have a pending transaction.');
                           if (!expectedAmount || isNaN(expectedAmount) || parseFloat(expectedAmount) <= 0) {
                             return setErrorMsg('Please enter a valid amount');
                           }
                           setZmShowPaymentDetails(true);
                         }}
                         disabled={hasPending}
                       >
                         {hasPending ? 'Pending Transaction' : 'Next'}
                       </button>


                     </>
                   )}
                 </>
               )}
             </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowInstructions(false)}
          >
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ background: 'var(--bg-panel)', padding: '24px 16px', borderRadius: '32px 32px 0 0', maxWidth: '500px', width: '100%', border: '1px solid var(--border)', position: 'relative', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 16px' }} />
              <button onClick={() => setShowInstructions(false)} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)', background: 'transparent' }}>
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{ background: 'linear-gradient(135deg, #0f1a12 0%, #111827 100%)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '32px 32px 0 0', padding: '24px 20px 32px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 -10px 40px rgba(0,0,0,0.6)' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 16px' }} />
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

      <AnimatePresence>
        {/* ZW Payment Details Bottom Sheet */}
        {zwShowPaymentDetails && zwSelectedNetwork && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ width: '100%', background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', borderRadius: '32px 32px 0 0', padding: '24px 24px 40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 12px' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <img src={zwSelectedNetwork.logo} alt={zwSelectedNetwork.name} style={{ width: '32px', height: '32px' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Send Payment</h3>
                </div>
              </div>

              <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Network</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{zwSelectedNetwork.name}</span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Account No.</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{zwSelectedNetwork.accountNo}</span>
                    <button onClick={() => { navigator.clipboard.writeText(zwSelectedNetwork.accountNo); toast.success('Account copied!'); }} style={{ background: 'rgba(16,185,129,0.1)', border: 'none', padding: '4px 6px', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={12} /></button>
                  </div>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Account Name</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{zwSelectedNetwork.accountName}</span>
                    <button onClick={() => { navigator.clipboard.writeText(zwSelectedNetwork.accountName); toast.success('Name copied!'); }} style={{ background: 'rgba(16,185,129,0.1)', border: 'none', padding: '4px 6px', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={12} /></button>
                  </div>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Amount</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 900, color: '#10B981', fontSize: '1.2rem' }}>{(parseFloat(expectedAmount || 0) * zwRate).toLocaleString()} ZWG</span>
                    <button onClick={() => { navigator.clipboard.writeText(String(parseFloat(expectedAmount || 0) * zwRate)); toast.success('Amount copied!'); }} style={{ background: 'transparent', border: 'none', padding: '4px', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={14} /></button>
                  </div>
                </div>
              </div>

              <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Info size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', color: '#E0F2FE', lineHeight: '1.3' }}>
                  Send exactly <strong>{(parseFloat(expectedAmount || 0) * zwRate).toLocaleString()} ZWG</strong> to the account above.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setZwShowPaymentDetails(false)} 
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setZwShowSenderDetails(true);
                  }} 
                  style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Verify Deposit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* ZW Sender Details Bottom Sheet */}
        {zwShowSenderDetails && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ width: '100%', background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', borderRadius: '32px 32px 0 0', padding: '24px 24px 40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 16px' }} />
              
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#fff' }}>Sender Info</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enter the phone number and name you used.</p>

              <div className="input-group" style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Sender Phone</span>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ padding: '10px' }}
                  value={zwSenderPhone} 
                  onChange={(e) => setZwSenderPhone(e.target.value)} 
                  placeholder={`e.g. 07XXXXXXXX`} 
                />
              </div>

              <div className="input-group" style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Sender Name</span>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ padding: '10px' }}
                  value={zwSenderName} 
                  onChange={(e) => setZwSenderName(e.target.value)} 
                  placeholder={`e.g. John Doe`} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setZwShowSenderDetails(false)} 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Back
                </button>
                <button 
                  onClick={handleZWVerifySubmit} 
                  disabled={isVerifying || hasPending}
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: (isVerifying || hasPending) ? 0.6 : 1, fontSize: '0.9rem' }}
                >
                  {isVerifying ? 'Submitting...' : 'Submit Details'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* ZM Payment Details Bottom Sheet */}
        {zmShowPaymentDetails && zmSelectedNetwork && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ width: '100%', background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', borderRadius: '32px 32px 0 0', padding: '24px 24px 40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 12px' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <img src={zmSelectedNetwork.logo} alt={zmSelectedNetwork.name} style={{ width: '32px', height: '32px' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Send Payment</h3>
                </div>
              </div>

              <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '12px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Network</span>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{zmSelectedNetwork.name}</span>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Account No.</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{zmSelectedNetwork.accountNo}</span>
                    <button onClick={() => { navigator.clipboard.writeText(zmSelectedNetwork.accountNo); toast.success('Account copied!'); }} style={{ background: 'rgba(16,185,129,0.1)', border: 'none', padding: '4px 6px', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={12} /></button>
                  </div>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Account Name</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{zmSelectedNetwork.accountName}</span>
                    <button onClick={() => { navigator.clipboard.writeText(zmSelectedNetwork.accountName); toast.success('Name copied!'); }} style={{ background: 'rgba(16,185,129,0.1)', border: 'none', padding: '4px 6px', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={12} /></button>
                  </div>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Amount</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 900, color: '#10B981', fontSize: '1.2rem' }}>{(parseFloat(expectedAmount || 0) * zmRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ZMW</span>
                    <button onClick={() => { navigator.clipboard.writeText(String(parseFloat(expectedAmount || 0) * zmRate)); toast.success('Amount copied!'); }} style={{ background: 'transparent', border: 'none', padding: '4px', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={14} /></button>
                  </div>
                </div>
              </div>

              <div style={{ padding: '8px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Info size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', color: '#E0F2FE', lineHeight: '1.3' }}>
                  Send exactly <strong>{(parseFloat(expectedAmount || 0) * zmRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ZMW</strong> to the account above.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setZmShowPaymentDetails(false)} 
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setZmShowSenderDetails(true);
                  }} 
                  style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Verify Deposit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* ZM Sender Details Bottom Sheet */}
        {zmShowSenderDetails && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3100, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{ width: '100%', background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', borderRadius: '32px 32px 0 0', padding: '24px 24px 40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 16px' }} />
              
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#fff' }}>Sender Info</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enter the phone number and name you used.</p>

              <div className="input-group" style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Sender Phone</span>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ padding: '10px' }}
                  value={zmSenderPhone} 
                  onChange={(e) => setZmSenderPhone(e.target.value)} 
                  placeholder={`e.g. 07XXXXXXXX`} 
                />
              </div>

              <div className="input-group" style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Sender Name</span>
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ padding: '10px' }}
                  value={zmSenderName} 
                  onChange={(e) => setZmSenderName(e.target.value)} 
                  placeholder={`e.g. John Doe`} 
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setZmShowSenderDetails(false)} 
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Back
                </button>
                <button 
                  onClick={handleZMVerifySubmit} 
                  disabled={isVerifying || hasPending}
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: (isVerifying || hasPending) ? 0.6 : 1, fontSize: '0.9rem' }}
                >
                  {isVerifying ? 'Submitting...' : 'Submit Details'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* --- Error Bottom Sheet --- */}
        {errorMsg && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }} onClick={() => setErrorMsg(null)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', borderRadius: '32px 32px 0 0', padding: '24px 24px 40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={24} color="var(--danger)" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>Action Failed</h3>
                  <div style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.5' }}>{errorMsg}</div>
                </div>
              </div>
              <button onClick={() => setErrorMsg(null)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--danger)', color: '#fff', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', marginTop: '24px', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}>Dismiss</button>
            </motion.div>
          </div>
        )}

        {/* --- Success Bottom Sheet --- */}
        {successData && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }} onClick={() => setSuccessData(null)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', borderRadius: '32px 32px 0 0', padding: '24px 24px 40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 24px' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <CheckCircle2 size={32} color="var(--success)" />
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{successData.title}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{successData.message}</p>
              </div>

              <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '16px', marginBottom: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 700 }}>Transaction Details</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {successData.details.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <strong style={{ color: item.color || '#fff' }}>{item.value}</strong>
                    </div>
                  ))}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Date</span>
                    <strong style={{ color: '#fff' }}>{new Date().toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <button onClick={() => setSuccessData(null)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>Continue</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </>)}

    </motion.div>
  );
};




