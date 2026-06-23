import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { ChevronLeft, Send, AlertTriangle, CheckCircle2, X, ShieldCheck, ScanFace } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Map network names to official logo URLs
const NETWORK_LOGOS = {
  'TRC20':   'https://cryptologos.cc/logos/tron-trx-logo.png',
  'TRX':     'https://cryptologos.cc/logos/tron-trx-logo.png',
  'BNB':     'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'BEP20':   'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'ERC20':   'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  'ETH':     'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  'BTC':     'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
  'BINANCE': 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
};

const getNetworkLogo = (network) => {
  if (!network) return null;
  const key = Object.keys(NETWORK_LOGOS).find(k => network.toUpperCase().includes(k));
  return key ? NETWORK_LOGOS[key] : null;
};

const NetworkBadge = ({ network, size = 20 }) => {
  const logo = getNetworkLogo(network);
  if (!logo) return null;
  return (
    <img
      src={logo}
      alt={network}
      style={{ width: size, height: size, objectFit: 'contain', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: '#fff', padding: '1px' }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
};

export const Withdraw = () => {
  const { currentUser, balance, lockedBalance, welcomeBonus, userData } = useAuth();
  const { formatCurrency, convertAndFormatCurrency, symbol } = useCurrency();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isZW = userData?.country === 'Zimbabwe' || userData?.country === 'ZW';
  const isZM = userData?.country === 'Zambia';
  const [zwRate, setZwRate] = useState(26.75);
  const [zmRate, setZmRate] = useState(27.5);
  
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [withdrawSource, setWithdrawSource] = useState('main'); // 'main' or 'bonus'
  const [bonusEligibility, setBonusEligibility] = useState(null); // null = not checked, { approved: bool, referrals: number }

  const controls = useAnimation();

  const triggerShake = () => {
    controls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    });
  };

  // Sync ZW rate from admin settings
  useEffect(() => {
    if (!isZW) return;
    const unsub = onSnapshot(doc(db, 'settings', 'zwPayment'), (snap) => {
      if (snap.exists() && snap.data().rate) setZwRate(snap.data().rate);
    });
    return unsub;
  }, [isZW]);

  // Sync ZM rate from admin settings
  useEffect(() => {
    if (!isZM) return;
    const unsub = onSnapshot(doc(db, 'settings', 'zmPayment'), (snap) => {
      if (snap.exists() && snap.data().rate) setZmRate(snap.data().rate);
    });
    return unsub;
  }, [isZM]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchAccounts = async () => {
      const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.withdrawalAccounts) {
          const accList = Object.values(data.withdrawalAccounts);
          setAccounts(accList);
          if (accList.length > 0) {
             setSelectedAccount(accList[0]);
          }
        } else if (data.withdrawalAccount) {
          // Fallback to older format
          setAccounts([data.withdrawalAccount]);
          setSelectedAccount(data.withdrawalAccount);
        }
      }
      setLoading(false);
    };
    fetchAccounts();
  }, [currentUser]);

  const checkBonusEligibility = async () => {
    if (!currentUser) return { approved: false, referrals: 0 };
    
    // Check for at least 1 approved deposit (admin sets status to 'SUCCESS')
    const depositsQ = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      where('type', '==', 'deposit'),
      where('status', '==', 'SUCCESS')
    );
    const depositsSnap = await getDocs(depositsQ);
    const hasApprovedDeposit = !depositsSnap.empty;

    // Count users referred by this user
    const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
    const myReferralCode = userSnap.data()?.referralCode;
    let referralCount = 0;
    if (myReferralCode) {
      const referralsQ = query(
        collection(db, 'users'),
        where('referredByCode', '==', myReferralCode)
      );
      const referralsSnap = await getDocs(referralsQ);
      referralCount = referralsSnap.size;
    }

    const result = { approved: hasApprovedDeposit, referrals: referralCount };
    setBonusEligibility(result);
    return result;
  };

  const handlePreWithdraw = async () => {
    const numAmount = Number(amount);
    const activeBalance = withdrawSource === 'main' ? (balance - lockedBalance) : welcomeBonus;
    
    if (!amount || isNaN(numAmount) || numAmount < 10 || numAmount > activeBalance || !selectedAccount) {
      triggerShake();
      if (!amount) return setErrorMsg('Please enter an amount');
      if (isNaN(numAmount) || numAmount < 10) return setErrorMsg(`Minimum withdrawal amount is ${convertAndFormatCurrency(10)}`);
      if (numAmount > activeBalance) return setErrorMsg(
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>INSUFFICIENT BALANCE</div>
          <div>Your {withdrawSource === 'main' ? 'Main Balance' : 'Welcome Bonus'} is <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatCurrency(activeBalance)}</span>. You cannot withdraw more than that.</div>
        </div>
      );
      if (!selectedAccount) return setErrorMsg('Please select a withdrawal account');
    }

    // Extra validation for welcome bonus
    if (withdrawSource === 'bonus') {
      const eligibility = await checkBonusEligibility();

      if (!eligibility.approved) {
        triggerShake();
        return setErrorMsg(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>NO APPROVED DEPOSIT</div>
            <div>You need to have at least <span style={{ color: 'var(--primary)', fontWeight: 600 }}>1 approved deposit</span> to withdraw your Welcome Bonus. Please make a deposit first.</div>
          </div>
        );
      }

      if (eligibility.referrals < 20) {
        triggerShake();
        return setErrorMsg(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>INSUFFICIENT REFERRALS</div>
            <div>You need <span style={{ color: 'var(--primary)', fontWeight: 600 }}>20 active referrals</span> to withdraw your Welcome Bonus. You currently have <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{eligibility.referrals} / 20</span> referrals.</div>
          </div>
        );
      }
    }

    setShowConfirm(true);
  };

  const executeWithdrawWithAI = () => {
    setAiScanning(true);
    setTimeout(() => {
      setAiScanning(false);
      executeWithdraw();
    }, 2500);
  };

  const executeWithdraw = async () => {
    const numAmount = Number(amount);
    setWithdrawing(true);
    try {
      // Generate unique QTX transaction hash
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const txHash = 'QTX' + Array.from({ length: 15 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

      // Create transaction
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'withdrawal',
        source: withdrawSource,
        amount: numAmount,
        status: 'pending',
        accountDetails: selectedAccount,
        txid: txHash,
        createdAt: serverTimestamp(),
      });

      // Deduct balance
      const updateData = withdrawSource === 'main' 
        ? { balance: increment(-numAmount) }
        : { welcomeBonus: increment(-numAmount) };
        
      await updateDoc(doc(db, 'users', currentUser.uid), updateData);

      setAmount('');
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (error) {
      setErrorMsg('Failed to process withdrawal. Please try again later.');
    }
    setWithdrawing(false);
  };

  if (loading) return <div className="page-content text-center py-5">{t('loading')}</div>;

  return (
    <>
      <motion.div 
        className="page-content"
        initial={{ opacity: 0, y: 10 }}
        animate={controls}
        onViewportEnter={() => controls.start({ opacity: 1, y: 0 })}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        style={{ padding: '16px', position: 'relative', zIndex: 1 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Send size={22} color="var(--primary)" />
            <h2 style={{ fontSize: '20px', margin: 0 }}>{t('withdrawTitle')}</h2>
          </div>
        </div>

        <div className="panel mb-4">
          <div style={{ display: 'flex', background: 'var(--bg-dark)', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
            <button 
              onClick={() => setWithdrawSource('main')}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', background: withdrawSource === 'main' ? 'var(--primary)' : 'transparent', color: withdrawSource === 'main' ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}
            >
              Main Balance
            </button>
            <button 
              onClick={() => setWithdrawSource('bonus')}
              style={{ flex: 1, padding: '10px', borderRadius: '10px', background: withdrawSource === 'bonus' ? 'var(--primary)' : 'transparent', color: withdrawSource === 'bonus' ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}
            >
              Welcome Bonus
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="text-muted">{withdrawSource === 'main' ? t('availableBalance') : 'Available Bonus'}</span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(withdrawSource === 'main' ? (balance - lockedBalance) : welcomeBonus)}</span>
          </div>

          {lockedBalance > 0 && withdrawSource === 'main' && (
             <div style={{ padding: '10px 12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', color: 'var(--warning)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} />
                <span>{formatCurrency(lockedBalance)} is currently locked in pending P2P transfers.</span>
             </div>
          )}

          {accounts.length === 0 ? (
            <div style={{ padding: '20px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.2)', textAlign: 'center' }}>
              <AlertTriangle size={32} color="var(--danger)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>{t('noWithdrawAccount')}</h3>
              <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px' }}>{t('noWithdrawAccountDesc')}</p>
              <button className="btn btn-primary w-100" onClick={() => navigate('/bind-account')}>
                {t('bindAccountNow')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label className="input-label">{t('selectWithdrawMethod')}</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {accounts.map((acc, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedAccount(acc)}
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '12px', 
                        border: `1px solid ${selectedAccount === acc ? 'var(--primary)' : 'var(--border)'}`,
                        background: selectedAccount === acc ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-dark)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'var(--transition)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Network Logo */}
                        {acc.type === 'binance_id' && <NetworkBadge network="BINANCE" size={28} />}
                        {acc.type === 'crypto_address' && <NetworkBadge network={acc.network} size={28} />}
                        {acc.type === 'mobile' && (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>📱</div>
                        )}

                        <div>
                          {acc.type === 'binance_id' && <div><div className="text-muted" style={{fontSize: '12px'}}>Binance Pay ID</div><div style={{fontWeight: 600}}>{acc.binanceId}</div></div>}
                          {acc.type === 'crypto_address' && <div><div className="text-muted" style={{fontSize: '12px'}}>{acc.network} Address</div><div style={{fontWeight: 600, fontSize: '13px'}}>{acc.address.substring(0, 8)}...{acc.address.substring(acc.address.length - 8)}</div></div>}
                          {acc.type === 'mobile' && <div><div className="text-muted" style={{fontSize: '12px'}}>{acc.network}</div><div style={{fontWeight: 600}}>{acc.accountName} - {acc.accountNumber}</div></div>}
                        </div>
                      </div>
                      {selectedAccount === acc && <CheckCircle2 size={20} color="var(--primary)" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{t('amountUsd')}</label>
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
                    onClick={() => setAmount(withdrawSource === 'main' ? (balance - lockedBalance > 0 ? (balance - lockedBalance).toString() : '0') : welcomeBonus.toString())}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    MAX
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
                  <span className="text-muted">{t('minimumAmount')}</span>
                  <span className="text-muted">{t('fee')}</span>
                </div>
                {isZW && selectedAccount?.type === 'mobile' && parseFloat(amount) > 0 && (
                  <div style={{ marginTop: '8px', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>You will receive (ZiG):</span>
                    <span style={{ color: '#10B981', fontWeight: 900, fontSize: '1.1rem' }}>
                      ZWG {(parseFloat(amount) * zwRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {isZM && selectedAccount?.type === 'mobile' && parseFloat(amount) > 0 && (
                  <div style={{ marginTop: '8px', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>You will receive (ZMW):</span>
                    <span style={{ color: '#10B981', fontWeight: 900, fontSize: '1.1rem' }}>
                      ZMW {(parseFloat(amount) * zmRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-primary w-100" 
                style={{ padding: '14px', fontSize: '16px', fontWeight: 600, marginTop: '8px' }}
                onClick={handlePreWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? t('processing') : t('submitWithdrawal')}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals Container */}
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
                  Withdrawal Error
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
        {showConfirm && selectedAccount && (
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
            onClick={() => !withdrawing && setShowConfirm(false)}
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
                  {t('confirmWithdrawal')}
                </h3>
                <button type="button" onClick={() => !withdrawing && setShowConfirm(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'background 0.2s' }} disabled={withdrawing}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '0' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('withdrawalAmount')}</div>
                  <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-1px' }}>{formatCurrency(Number(amount))}</div>
                  <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>{t('noFeesApplied')}</div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{t('transferDetails')}</div>
                  
                  {selectedAccount.type === 'binance_id' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <NetworkBadge network="BINANCE" size={36} />
                          <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Binance Pay</span>
                        </div>
                        <span style={{ fontSize: '12px', background: 'rgba(240,185,11,0.15)', color: '#f0b90b', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>BNB Chain</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Method</span>
                        <span style={{ fontWeight: 500, fontSize: '15px', color: 'var(--text-primary)' }}>Binance Pay</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Pay ID</span>
                        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{selectedAccount.binanceId}</span>
                      </div>
                    </>
                  )}

                  {selectedAccount.type === 'crypto_address' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <NetworkBadge network={selectedAccount.network} size={36} />
                          <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{selectedAccount.network}</span>
                        </div>
                        <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>Crypto</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Network</span>
                        <span style={{ fontWeight: 500, fontSize: '15px', color: 'var(--text-primary)' }}>{selectedAccount.network}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Destination Address</span>
                        <span style={{ fontWeight: 600, fontSize: '14px', wordBreak: 'break-all', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', color: 'var(--primary)', border: '1px solid rgba(16,185,129,0.1)' }}>
                          {selectedAccount.address}
                        </span>
                      </div>
                    </>
                  )}

                  {selectedAccount.type === 'mobile' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>📱</div>
                          <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Mobile Money</span>
                        </div>
                        <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>{selectedAccount.network}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Account Name</span>
                        <span style={{ fontWeight: 500, fontSize: '15px', color: 'var(--text-primary)' }}>{selectedAccount.accountName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Mobile Number</span>
                        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{selectedAccount.accountNumber}</span>
                      </div>
                      {isZW && (
                        <div style={{ marginTop: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Amount in ZiG (ZWG)</span>
                          <span style={{ color: '#10B981', fontWeight: 900, fontSize: '1.3rem' }}>
                            ZWG {(parseFloat(amount || 0) * zwRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {isZM && (
                        <div style={{ marginTop: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Amount in Kwacha (ZMW)</span>
                          <span style={{ color: '#10B981', fontWeight: 900, fontSize: '1.3rem' }}>
                            ZMW {(parseFloat(amount || 0) * zmRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                    onClick={() => setShowConfirm(false)}
                    disabled={withdrawing}
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                    onClick={executeWithdrawWithAI}
                    disabled={withdrawing || aiScanning}
                  >
                    {withdrawing ? t('processing') : t('confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* AI Scanning Modal */}
        {aiScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', 
              zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              backdropFilter: 'blur(8px)'
            }}
          >
            <motion.div 
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}
            >
              <ScanFace size={40} color="var(--success)" />
            </motion.div>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: 600, letterSpacing: '1px', textAlign: 'center' }}>AI Security Scan</h3>
              <p style={{ margin: '8px 0 0 0', color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center' }}>Verifying limits and patterns...</p>
            </motion.div>
          </motion.div>
        )}

        {/* Success Bottom Sheet */}
        {showSuccess && (
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
                {/* Bomb Effect Particles */}
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
                
                {/* Expanding pulse rings */}
                <motion.div
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: [0, 1.5], opacity: [0.8, 0] }}
                  transition={{ duration: 1, ease: "easeOut", repeat: 1, delay: 0.2 }}
                  style={{ position: 'absolute', width: '100px', height: '100px', borderRadius: '50%', border: '4px solid var(--success)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}
                />

                {/* Main Verified Badge */}
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
                {t('successfullySubmitted')}
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '1.05rem', marginBottom: '36px', lineHeight: 1.5 }}
              >
                {t('withdrawalQueued') || 'Your withdrawal request has been queued.'}
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', zIndex: 10 }}
                onClick={() => {
                  setShowSuccess(false);
                  navigate('/transactions');
                }}
              >
                {t('viewTransactions')}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
