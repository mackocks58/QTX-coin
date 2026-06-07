import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { Wallet, Activity, CheckCircle2, AlertCircle, ChevronLeft, TrendingUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export const CRYPTO_PLANS = [
  { id: 'doge', name: 'Dogecoin', symbol: 'DOGE', price: 15, dailyPercent: 6.0, color: '#F3BA2F', logo: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png' },
  { id: 'ada', name: 'Cardano', symbol: 'ADA', price: 30, dailyPercent: 6.8, color: '#0033AD', logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
  { id: 'matic', name: 'Polygon', symbol: 'MATIC', price: 60, dailyPercent: 7.4, color: '#8247E5', logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png' },
  { id: 'xrp', name: 'XRP', symbol: 'XRP', price: 150, dailyPercent: 8.0, color: '#23292F', logo: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
  { id: 'link', name: 'Chainlink', symbol: 'LINK', price: 300, dailyPercent: 8.8, color: '#2A5ADA', logo: 'https://cryptologos.cc/logos/chainlink-link-logo.png' },
  { id: 'dot', name: 'Polkadot', symbol: 'DOT', price: 600, dailyPercent: 9.6, color: '#E6007A', logo: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png' },
  { id: 'avax', name: 'Avalanche', symbol: 'AVAX', price: 1200, dailyPercent: 10.4, color: '#E84142', logo: 'https://cryptologos.cc/logos/avalanche-avax-logo.png' },
  { id: 'sol', name: 'Solana', symbol: 'SOL', price: 2500, dailyPercent: 11.0, color: '#14F195', logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', price: 5000, dailyPercent: 12.0, color: '#627EEA', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', price: 10000, dailyPercent: 14.0, color: '#F7931A', logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' }
];

export const Wealth = () => {
  const { currentUser, userData, balance } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency, convertAndFormatCurrency, rate } = useCurrency();
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [successPlan, setSuccessPlan] = useState(null);

  const activeCrypto = userData?.activatedCrypto?.find(c => c.status === 'running');
  const activePlanDef = activeCrypto ? CRYPTO_PLANS.find(p => p.id === activeCrypto.id) : null;
  const activePriceUSD = activePlanDef ? activePlanDef.price : 0;

  const confirmInvest = async (plan) => {
    setSelectedPlan(null);
    if (!currentUser) {
      toast.error(t('loginRequired'));
      return;
    }

    const isUpgrade = activePriceUSD > 0 && plan.price > activePriceUSD;
    const differenceUSD = isUpgrade ? (plan.price - activePriceUSD) : plan.price;
    const localCost = differenceUSD * rate;

    const userBalance = parseFloat(balance || 0);
    if (userBalance < localCost) {
      toast.error(t('insufficientFunds') || 'Insufficient funds');
      navigate('/wallet');
      return;
    }

    // Check if user already activated this exact crypto plan or higher
    if (activePriceUSD > 0 && plan.price <= activePriceUSD) {
      toast.error(plan.id === activeCrypto?.id ? `You already have an active ${plan.name} investment.` : `You cannot downgrade your investment.`);
      return;
    }

    try {
      setProcessingId(plan.id);
      const loadingToast = toast.loading(`Investing in ${plan.name}...`);
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) throw new Error("User not found");

      const freshData = userSnap.data();
      const currentBalance = parseFloat(freshData.balance || 0);
      const localCost = differenceUSD * rate;

      if (currentBalance < localCost) {
        toast.dismiss(loadingToast);
        throw new Error(t('insufficientFunds') || 'Insufficient funds');
      }

      const newCrypto = {
        ...plan,
        price: plan.price * rate, // Store the full local price of the new coin for daily returns
        status: 'running',
        activatedAt: new Date().toISOString(),
        lastPayoutAt: new Date().toISOString()
      };

      // Remove the old investment completely
      const filteredCrypto = (freshData.activatedCrypto || []).filter(c => c.status !== 'running');

      await updateDoc(userRef, {
        balance: currentBalance - localCost,
        activatedCrypto: [...filteredCrypto, newCrypto]
      });

      toast.dismiss(loadingToast);
      setSuccessPlan(plan);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to invest.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ paddingBottom: '100px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Wealth</h2>
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.02) 100%)', border: '1px solid rgba(16,185,129,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ background: 'rgba(16,185,129,0.2)', padding: '12px', borderRadius: '50%', color: 'var(--success)' }}>
          <TrendingUp size={28} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Crypto Investments</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
            Invest in top-performing cryptocurrencies to earn daily income. Your active investments also multiply your Watch-to-Earn movie rewards! Contracts last for 365 days.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {CRYPTO_PLANS.map((plan) => {
          const isActive = activeCrypto?.id === plan.id;
          const isLowerTier = activePriceUSD > 0 && plan.price < activePriceUSD;
          const isUpgrade = activePriceUSD > 0 && plan.price > activePriceUSD;
          const upgradeDifference = (plan.price - activePriceUSD) * rate;
          
          return (
            <div key={plan.id} style={{
              background: 'var(--bg-panel)',
              borderRadius: '16px',
              border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: isActive ? '0 4px 20px rgba(16,185,129,0.15)' : 'none',
              opacity: isLowerTier ? 0.6 : 1,
              transition: 'all 0.3s'
            }} className="hover:shadow-md">
              
              {isActive && (
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={12} style={{ animation: 'pulse 2s infinite' }} /> Active
                </div>
              )}

              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#fff', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${plan.color}33` }}>
                  <img src={plan.logo} alt={plan.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{plan.name}</h3>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, background: 'var(--bg-dark)', padding: '2px 8px', borderRadius: '12px' }}>{plan.symbol}</span>
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Investment Amount</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 700 }}>{convertAndFormatCurrency(plan.price)}</div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Daily Income</div>
                  <div style={{ color: 'var(--success)', fontSize: '1.1rem', fontWeight: 700 }}>
                    {plan.dailyPercent}% <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>({convertAndFormatCurrency(plan.price * plan.dailyPercent / 100)})</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Contract Period</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>365 Days</div>
                </div>

                <button
                  onClick={() => !isLowerTier && !isActive && setSelectedPlan(plan)}
                  disabled={isActive || isLowerTier || processingId === plan.id}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: isActive
                      ? 'rgba(16,185,129,0.1)'
                      : isLowerTier
                      ? 'rgba(255,255,255,0.05)'
                      : 'var(--primary)',
                    color: isActive
                      ? 'var(--success)'
                      : isLowerTier
                      ? 'var(--text-muted)'
                      : '#fff',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: (isActive || isLowerTier) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'var(--transition)'
                  }}
                >
                  {processingId === plan.id
                    ? 'Processing...'
                    : isActive
                    ? <><CheckCircle2 size={18} /> Currently Active</>
                    : isLowerTier
                    ? 'Not Eligible'
                    : isUpgrade
                    ? `⬆ Upgrade — Pay ${formatCurrency(upgradeDifference)}`
                    : 'Invest Now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedPlan && (
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
            onClick={() => setSelectedPlan(null)}
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
                  {activePriceUSD > 0 ? '⬆ Upgrade Investment' : 'Confirm Investment'}
                </h3>
                <button onClick={() => setSelectedPlan(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ padding: '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-dark)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                    <img src={selectedPlan.logo} alt={selectedPlan.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedPlan.name}</h4>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedPlan.symbol} Mining Contract</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {activePriceUSD > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Current Plan</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600, textDecoration: 'line-through' }}>{activePlanDef?.name} ({convertAndFormatCurrency(activePriceUSD)})</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{activePriceUSD > 0 ? 'Upgrade Cost' : 'Price'}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      {formatCurrency((selectedPlan.price - (activePriceUSD > 0 ? activePriceUSD : 0)) * rate)}
                      {activePriceUSD > 0 && <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>(difference only)</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Daily Profit</span>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>{selectedPlan.dailyPercent}% ({convertAndFormatCurrency(selectedPlan.price * selectedPlan.dailyPercent / 100)})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Contract Duration</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>365 Days</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setSelectedPlan(null)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                    Cancel
                  </button>
                  <button onClick={() => confirmInvest(selectedPlan)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {successPlan && (
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
            onClick={() => setSuccessPlan(null)}
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
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                  <CheckCircle2 size={40} color="var(--success)" />
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Investment Successful!
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.5' }}>
                  You have successfully invested in <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{successPlan.name}</span>. Start tracking your daily profits now!
                </p>
              </div>

              <button onClick={() => setSuccessPlan(null)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '1.05rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
