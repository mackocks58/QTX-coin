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

// Malawi Mobile Money networks
const MW_NETWORKS = [
  {
    id: 'TNM',
    name: 'TNM Mpamba',
    number: '0984905097',
    accountName: 'Felisa Samisoni',
    color: '#E53935',
    gradient: 'linear-gradient(135deg, #E53935 0%, #b71c1c 100%)',
    logo: 'https://th.bing.com/th/id/OIP.CIfh8brk9nlWtISZ46YVBwHaHa?w=202&h=202&c=7&r=0&o=7&dpr=1.5&pid=1.7&rm=3',
    emoji: '🔴',
  },
  {
    id: 'AIRTEL',
    name: 'Airtel Money',
    number: '0896750115',
    accountName: 'Stela pilingu',
    color: '#E53935',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #E53935 100%)',
    logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAyVBMVEX/////AAj/AAD/0AD/0wD/8fH/srT/vb//Iij/7u7/VFj/kZP/OTz/5eb/qqz/+/v//vj/9/f/77H/Rkn/Chb/8rf/87//4uP/9cr//fP/fH//99T/4mb/76b/2Nn/99r/6Y//0NH/t7n/GyH/dnn/hon/lZj/WV3/goX/09T/++r/w8X/bnH/jI//oKP/Q0f/ZWj/LzX/nJ7/PED/3Dz/5XX/7Z7/3lf/2Cn/+uP/54L/X2L/Vln/TVH/2Tr/5Xr/20j/2zX/4VvqJK03AAALIklEQVR4nO2ba2PpTBDHYxNEiUgpFUrdVahbL1ptj/b7f6hnr5FEwqKnnD7ze9HjsmL+uzOzsxNHUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADgf4HRSCaymESyFj+1Ld9PyuksM3oMUWJ63k6kTm3Sd1JLLAtcG4U9nDR/y0om21NXmwf8Uq95atuOx6yl9TB5YimXtVNbeCSNjh4lj4ucOqe28QjMxrCwXR+RWMie2s6DqdmR7ul31ftTW3oY1mgqo4+uYuPUxh6A2cxI6iMSx6VT27s3qU5MWh+RODq1wXtiNnck0A2F6N9axFRnP317L2Jj1kkn/5b1EtTmewvEkWhIX9/qkgIwZp+srM3qe+sj6VR+3+/SCUTI/ositjHbK8WsJXZlvyDeYl9wothNDff3UGbv0pL8iqT4ArSlFrKMmpO123JHl7hx58yGci5hDQ/Th83NyB6kEq7CyFLIHE3ypNyfyoSqOVqOW3jwu8yXG5NDBeJAlE01DVdhZOjGW/T4iTIyClMtWluiC4mx1lJWoPcwLF6RjSozw+NQj1z1OEt2cgrFYAmF8bZkGYpQa9zr5f1VAbqTVKg4dIVQIbHT6G9WaNpSAhEa95PUI42ud19B8tV3Y9lCrYst28tfUpiQyKJ46jPZdcA5rfVH5NcQG1Vr1LYZ/3cUOgUJgbE3f7HluJ+JikMrlUrFTQlDMWY8Hre8Rs/DIjV4MVmF8YudAnH2DvbWTDc3oULIfN9lO8O39/dee7bRzDENx598U8muPekth51EyTVazyYSiaRno60l0n27n054LyersL+zWYH0+80pTYqVR/PAjm8a3TFvQJK0crEOU6uR7fcyLeTJNFZjortj34XRLGdnXOdoTAru5ZLuUkoqbOwKQoTaYU01Iy9sGfq8x2zYLe9+gh+mxRQkuZlrhY2JZ/PBpU7ck8LQlCu00p4x2Bwx3XIKd9UyeAGbocFkig8G6tK7jQ4IQh1XIXtBKDRn3n2HnFL8CtnMWm3/5uRKlFOY3F5uIzSKymppbm7Mn4KsC1Fee9rkiVCFqYl3aRCaKaEKN9YA9fdRuLVaw6EQ3dm+Rz47XLKI2tt6X/bECqG3VIjC1GQdc9OL3pg4pVBIFevUS5vsIp5iCqGavEJjWxSi1mjLsUEonARet6ZIn2RZCDlTbl0yRGFXCHzPun6yzqVNnktLc/ZKrN8oJXv8AkN5hdlogQjlt55tuYGbJ6GsfedGbpZfqxOiULj50BMHm/uhmMg0fZtVttxvpBRGF6So0N9+Kmrzud1afZS4SfktCr1TtFnTcC/oMWMS3s9IKYw6UyA039GcSLGMsqMjwfcUpB+qsOEfZHDBtnmkQpyRdx2JavS7djW9U1xh4VCFYhBPZ/E39v67JaswPJWiafT5RsD8BbXDNkuz5Mzs5dsFpnWcQnFwRSWDUlpyn0jJKgyLQ1w9SZyHhqxtFubLNXvuFmL8kocqNMZ8UJ7DZyxWklXobCpEBVviRGDQSoGnbR9WP7Zx4+pghXfeOtU7ZTVZhUo+KBG1wqu0ADSJo9bm0TDeDtliD1YYdbKjp245hY6/C4xQT+reNcsgbJPyYbpHFe+cH6zQLSpRAEda4foURAfrM7nmJ1vC/OZemHT9KNPudDq2flymES3WwjzjY7qHQiXJf45AZmYo2ZAwyEYemmZ6QuDQIHNlHLlb8DXEc2n4kd4t6FXTc3K+bOVHAQeNjsdhhI8qNe4Rovw/ViGPw/Cm7x7dxJKTyDYb/t6Cke3YdtcJVUldURwYfIiqSq99j8IGfz4+UuEmpTZrbaJMyNZYoz5aCKt6ZtxqMefHKuT7IWqFGZlqHa7QybhHselGaJoXVGBo2SMOHOJIdaxCUXShsPr+CIVZbzd04+bZiGaZWegnxVmn910KxQXDTuKHe2nTu2dv5BNymxNF3dt2eO6bGocptPjZQTShlBQ/4U+8u5gZ9w3Oy97eE7BTgxAYaMMoTaIBtSMumtL9Zu97tlB43K1vLE/4C56gKNkj32B9zxuu1thb5aBAkZqIkRXsR24kHW42q/0s0caQVshLIjQWfQJemeKwMOgVDWeIdzaW/2wR9SXJ3jrj3idQ94c4Lg/wlw2j3aIkFrEwTM9GE3FfOyar0BEpTrfTWfI15kjkvHE7ne4M5/T+YocP5lZm7PTu855rYsbro4HNgpR4OAa3+X0iJizylKWxtKxCy9uAo95nvftLUzZ/rFHTW7/VU2TpegXqfoEkx6LCjl8mzDY7wnpovzRUoScLiD5lafP8g6bMsPUtMLSUFZjyLCFq+QvPexKDW25vMsxZwdfUR2giqsEkL4C3KSRlDF8o0Ykt9XzJHWOL3NJ03URaoScKAy5q9UkAzCWO/7Xh+mYLyvfXJYP/vkWaPwu2I1PdOfNId8tQshfrC8bGXU/9XLP5d0l76burEMV8YsjJFqE3qdOjdTdbZloFfTyc+e6kGQkGs7zme+bFcO777XY/sY73VLKTb2GT9It04N6cWUt0Jr2JLfuz80ZhHQU+gY0x8dDOPll5rwwugxXfd2sPwXXSwOGvSXOMVH/jvHF7ECjmTSiWTQLjbY/79WeLFXpTsEHiPLZ1F/xnEAp9xew9/RnWL/BQAvdS5PmJjPNOOhz2r1hAAss0aCkWzBiRFs44vJnxT2LQwllEYSlN9M2zv2YBCfRnvPTnFVajQ/5X1zQt/yvnfwKL/ZB2krbzpBeVifyhwr+L1XU76NN24lf5p4tjTwux6UWnWfpGfYNy8AGjPMhFjYwacG68VJ+UelXTtOcKfvKIHzxci/cq+KmqPVwyTYPqqzJ4xQO0J3c6nj7xgNUVFjl4fvjiWq9XDzc/LWMLl+pHcaUSFvU6f1Bkb90sVBVLVLXqgI3UKs90gPbItNTxU22BNT7h58+qxqfmj6oVT6IlnEti422lWNXU1Uq7vb7GDxZ0jZ409eFyUL7+wu/k2MhP7bF4fYuFP5EBg5X6eVnOEQ+4VJQrTX2lV8zh8eXoL/xxLvESXOF/y3j9NOJcuaqqkhcGmvpRV/gL5I0rvKBUWZFLuOWrhj+6wOMf1I8X+jafgHMBK2Q+d6OqX3TqsYVkMW6ZLkxFU58HRKFaZWvzoC5w0JYX6h82AH+0QgWTmSFO+vLTKrZxSV1MoTpu6QO8eFVsP44r7mt4EbUKVcjX5pUGWhH/zZUxuWuNTEZloT7jN18+1K+fl7EFrJDOvFIXCnNUITZ0JcbcUkVX7qKy50+q9lz9wlSf2Ue/VG1AfJhP2bkQpRCvSFWMuWGpJKAQ/11DVpcF4B91dVZOGqmw7lH4FLqG+O/ltYDsJznspmUcna8/rWE7kV6KEyTfwXOPNGkGFd64G6AAv14pbrx6aqIUKo+uqYOFuhpsKqxowdXCnv30qD78jOHSRCrEgngZ9qrSd4IKlU+6aXjASXe1OK/NUNmiEKdGtVrP5V5ucW1D9o0NhXjnX9y8lMuDlyLPLdhF1cV55Rlai0UoxJGofj4+fmjqJ3XXDYWkrtNW1erzh8bXDeca9c+5nTWuFrzQri8WzM7cYvFIH5RvP0jd/flKC2+8ZAu+0T0tmGbl+mtBtorFSpwlqmeXZ7CMSoWVLrl6hSlR6hXhaC/Fm5tiPThSGbiPcpWry8uieEb3i58w+nTcnte56fu5wVX8qW34q2CBge3jd1EhHYGzSzPfCd5tHn53EJb/3J5T7wIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgP34D3pC3RWTNQtbAAAAAElFTkSuQmCC',
    emoji: '📡',
  },
];

export const Wallet = () => {
  const { currentUser, userData } = useAuth();
  const { formatCurrency, isTZ, isMZ } = useCurrency();
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

  // Malawi Mobile Payment state
  const [showPaymentSheet, setShowPaymentSheet] = useState(false); // step 1: show payment details
  const [showSenderSheet, setShowSenderSheet] = useState(false);  // step 2: collect sender info
  const [mzSenderPhone, setMzSenderPhone] = useState('');
  const [mzSenderName, setMzSenderName] = useState('');
  const [mzSubmitting, setMzSubmitting] = useState(false);
  const [mzSuccess, setMzSuccess] = useState(false);

  // Set initial tab only after we know the user's country
  useEffect(() => {
    if (activeTab === null && userData?.country) {
      setActiveTab(isTZ ? 'MobileMoney' : isMZ ? 'TNM' : 'TRC20');
    }
  }, [isTZ, isMZ, activeTab, userData]);

  // Synchronous derived tab - safe only when country is known
  const tab = !userData?.country ? null : (activeTab !== null ? activeTab : (isTZ ? 'MobileMoney' : isMZ ? 'TNM' : 'TRC20'));

  // Derive current network for Malawi based on the active tab
  const currentNetwork = isMZ ? (MW_NETWORKS.find(n => n.id === tab) || MW_NETWORKS[0]) : null;

  // keep these for backward compat references below
  const MZ_PAYMENT_NUMBER = currentNetwork?.number || '';
  const MZ_PAYMENT_NAME = currentNetwork?.accountName || '';
  const showMzPopup = showSenderSheet;

  // Use environment variables for the wallet addresses
  const trc20Address = import.meta.env.VITE_USDT_ADDRESS || 'TBteWdQZAdWJzXCaa61dogDFVNH8pSA88J';
  const bscAddress = import.meta.env.VITE_BSC_ADDRESS || '0x66922e6229f9501319aa4425f4cd53773fc66a91';
  const depositAddress = activeTab === 'TRC20' ? trc20Address : bscAddress;

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
    const unsubscribe = onSnapshot(collection(db, 'users', currentUser.uid, 'transactions'), (snapshot) => {
      const hasPendingTx = snapshot.docs.some(d => d.data().status === 'pending');
      setHasPending(hasPendingTx);
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

  // ── Malawi Mobile Payment handlers ─────────────────────────────────────────
  const handleMobileRechargeClick = () => {
    if (!expectedAmount || isNaN(expectedAmount) || parseFloat(expectedAmount) < 25500) {
      return toast.error('Minimum deposit is 25,500 MWK');
    }
    setMzSuccess(false);
    setMzSenderPhone('');
    setMzSenderName('');
    setShowPaymentSheet(true);
  };

  const handleAlreadyPaid = () => {
    setShowPaymentSheet(false);
    setTimeout(() => setShowSenderSheet(true), 200);
  };

  const handleMozambiqueSubmit = async () => {
    if (!mzSenderPhone || mzSenderPhone.length < 9) {
      return toast.error('Please enter a valid sender phone number');
    }
    if (!mzSenderName || mzSenderName.trim().length < 2) {
      return toast.error('Please enter the sender name');
    }
    if (hasPending) {
      return toast.error('You already have a pending transaction.');
    }
    setMzSubmitting(true);
    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'deposit',
        txid: `MW-${currentNetwork?.id}-${Date.now()}`,
        network: 'MozambiqueMobile',
        mobileNetwork: currentNetwork?.id,
        currency: 'MWK',
        status: 'pending',
        expectedAmount: parseFloat(expectedAmount),
        amount: 0,
        senderPhone: mzSenderPhone.trim(),
        senderName: mzSenderName.trim(),
        paymentTo: currentNetwork?.number,
        paymentToName: currentNetwork?.accountName,
        createdAt: serverTimestamp()
      });
      setMzSuccess(true);
      setExpectedAmount('');
      setTimeout(() => {
        setShowSenderSheet(false);
        setShowPaymentSheet(false);
        setMzSuccess(false);
      }, 3500);
    } catch (err) {
      toast.error('Failed to submit. Please try again.');
    }
    setMzSubmitting(false);
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

        {/* Network Switcher for Malawi users */}
        {isMZ && (
          <div style={{ display: 'flex', background: 'var(--border)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '24px', maxWidth: '400px', gap: '4px' }}>
            {MW_NETWORKS.map(network => (
              <button
                key={network.id}
                onClick={() => setActiveTab(network.id)}
                style={{ flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-sm)', border: 'none', background: tab === network.id ? 'var(--bg-panel)' : 'transparent', color: tab === network.id ? 'var(--primary)' : 'var(--text-muted)', fontWeight: tab === network.id ? 700 : 500, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
              >
                <img src={network.logo} alt={network.name} style={{ height: '22px', width: '22px', objectFit: 'contain', borderRadius: '4px', opacity: tab === network.id ? 1 : 0.75, transition: 'all 0.2s' }} onError={e => { e.target.style.display = 'none'; }} />
                <span style={{ fontSize: '0.7rem' }}>{network.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Network Switcher — only for non-TZ, non-MZ users */}
        {!isTZ && !isMZ && (
          <div style={{ display: 'flex', background: 'var(--border)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '24px', maxWidth: '400px', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('TRC20')}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-sm)', border: 'none', background: activeTab === 'TRC20' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'TRC20' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'TRC20' ? 700 : 500, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
            >
              <img src="https://cryptologos.cc/logos/tron-trx-logo.png" alt="TRC20" style={{ height: '22px', width: '22px', objectFit: 'contain', borderRadius: '50%', opacity: activeTab === 'TRC20' ? 1 : 0.75, transition: 'all 0.2s' }} onError={e => { e.target.style.display = 'none'; }} />
              <span style={{ fontSize: '0.7rem' }}>USDT TRC20</span>
            </button>
            <button
              onClick={() => setActiveTab('BSC')}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-sm)', border: 'none', background: activeTab === 'BSC' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'BSC' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'BSC' ? 700 : 500, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
            >
              <img src="https://cryptologos.cc/logos/bnb-bnb-logo.png" alt="BNB" style={{ height: '22px', width: '22px', objectFit: 'contain', borderRadius: '50%', opacity: activeTab === 'BSC' ? 1 : 0.75, transition: 'all 0.2s' }} onError={e => { e.target.style.display = 'none'; }} />
              <span style={{ fontSize: '0.7rem' }}>USDT BNB</span>
            </button>
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

          {/* ── Malawi Mobile Payment Tab ── */}
          {(tab === 'TNM' || tab === 'AIRTEL') && isMZ && currentNetwork && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="panel mx-auto" style={{ maxWidth: '500px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Header */}
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 800 }}>Mobile Money Deposit</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Enter amount and click recharge with {currentNetwork.name}.</p>
                </div>

                {/* Amount input */}
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Deposit Amount (MWK)</span>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontWeight: 800, fontSize: '1rem' }}>K</span>
                    <input
                      type="number"
                      className="input-field"
                      style={{ padding: '14px 14px 14px 30px', fontSize: '1.1rem', fontWeight: 700, borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(5,150,105,0.05)' }}
                      value={expectedAmount}
                      onChange={(e) => setExpectedAmount(e.target.value)}
                      placeholder="Ex: 25500"
                      disabled={hasPending}
                    />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Minimum: K 25,500</span>
                </div>

                {hasPending && (
                  <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', color: 'var(--warning)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--warning)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                    You already have a deposit pending review.
                  </div>
                )}

                {/* Deposit Action */}
                {!hasPending && (
                  <button
                    className="btn btn-primary"
                    onClick={handleMobileRechargeClick}
                    style={{ width: '100%', padding: '16px', fontSize: '1.05rem', fontWeight: 700, borderRadius: '14px', background: currentNetwork.gradient, border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: `0 8px 24px ${currentNetwork.color}40`, transition: 'all 0.2s' }}
                  >
                    <img src={currentNetwork.logo} alt="logo" style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'white', objectFit: 'contain' }} />
                    Recharge with {currentNetwork.name}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEP 1: Minified Payment Details Bottom Sheet ── */}
        <AnimatePresence>
          {showPaymentSheet && currentNetwork && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowPaymentSheet(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, backdropFilter: 'blur(4px)' }}
              />
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001,
                  background: 'linear-gradient(160deg, #0a140f 0%, #0d1520 100%)',
                  borderRadius: '24px 24px 0 0',
                  border: '1px solid rgba(16,185,129,0.25)',
                  borderBottom: 'none',
                  padding: '8px 20px 24px',
                  boxShadow: '0 -16px 60px rgba(0,0,0,0.6)',
                }}
              >
                <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '8px auto 16px' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={currentNetwork.logo} alt="logo" style={{ width: '28px', height: '28px', borderRadius: '4px' }} onError={e => e.target.style.display = 'none'} />
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{currentNetwork.name} Payment</div>
                  </div>
                  <button onClick={() => setShowPaymentSheet(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                {/* Minified Info Grid */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', marginBottom: '16px', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>AMOUNT TO SEND</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>K {parseFloat(expectedAmount || 0).toLocaleString()}</span>
                        <Copy size={12} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(expectedAmount); toast.success('Amount copied!'); }} />
                      </div>
                    </div>
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>NETWORK</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{currentNetwork.name}</div>
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>ACCOUNT NUMBER</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px' }}>{currentNetwork.number}</div>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(currentNetwork.number); toast.success('Number copied!'); }} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>COPY</button>
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>ACCOUNT NAME</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{currentNetwork.accountName}</div>
                  </div>
                </div>

                {/* Minified Instructions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: 'rgba(16,185,129,0.05)', borderRadius: '10px', marginBottom: '16px' }}>
                  <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Send exactly <strong>K {parseFloat(expectedAmount || 0).toLocaleString()}</strong> to the {currentNetwork.name} account shown above. Once sent, tap the 'I've Already Paid' button.
                  </div>
                </div>

                {/* Action buttons horizontally to save vertical space */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowPaymentSheet(false)}
                    style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleAlreadyPaid}
                    style={{ flex: 2, padding: '14px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                  >
                    ✅ I've Already Paid
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── STEP 2: Sender Details Bottom Sheet ── */}
        <AnimatePresence>
          {showSenderSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { if (!mzSubmitting) { setShowSenderSheet(false); } }}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, backdropFilter: 'blur(4px)' }}
              />
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2001,
                  background: 'linear-gradient(160deg, #0d1f14 0%, #111827 100%)',
                  borderRadius: '24px 24px 0 0',
                  border: '1px solid rgba(16,185,129,0.25)',
                  borderBottom: 'none',
                  padding: '8px 20px 24px',
                  boxShadow: '0 -16px 60px rgba(0,0,0,0.6)',
                }}
              >
                <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '8px auto 16px' }} />

                {!mzSuccess ? (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 800 }}>Confirm Your Payment</h3>
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enter the details of the account you sent money from.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>📱 Sender Phone Number</label>
                        <input
                          type="tel"
                          className="input-field"
                          style={{ padding: '12px', fontSize: '0.95rem', borderRadius: '10px', width: '100%', boxSizing: 'border-box' }}
                          value={mzSenderPhone}
                          onChange={(e) => setMzSenderPhone(e.target.value)}
                          placeholder="e.g. 0884905097"
                          disabled={mzSubmitting}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>👤 Sender Name</label>
                        <input
                          type="text"
                          className="input-field"
                          style={{ padding: '12px', fontSize: '0.95rem', borderRadius: '10px', width: '100%', boxSizing: 'border-box' }}
                          value={mzSenderName}
                          onChange={(e) => setMzSenderName(e.target.value)}
                          placeholder="Your full name"
                          disabled={mzSubmitting}
                        />
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleMozambiqueSubmit}
                      disabled={mzSubmitting}
                      style={{ width: '100%', padding: '14px', background: mzSubmitting ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '0.95rem', fontWeight: 800, cursor: mzSubmitting ? 'not-allowed' : 'pointer', boxShadow: mzSubmitting ? 'none' : '0 4px 12px rgba(16,185,129,0.3)' }}
                    >
                      {mzSubmitting ? '⏳ Submitting...' : '✅ Submit Payment'}
                    </motion.button>
                  </>
                ) : (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    style={{ textAlign: 'center', padding: '20px 0' }}
                  >
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                      style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '3px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}
                    >
                      <CheckCircle2 size={40} color="#10B981" />
                    </motion.div>
                    <h3 style={{ color: '#10B981', fontWeight: 700, fontSize: '1.2rem', margin: '0 0 8px' }}>Deposit Submitted! 🎉</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>Your deposit is under review. Your balance will be credited once verified by an admin.</p>
                  </motion.div>
                )}
              </motion.div>
            </>
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




