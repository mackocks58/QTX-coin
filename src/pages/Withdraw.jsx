import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ChevronLeft, Send, AlertTriangle, CheckCircle2, X } from 'lucide-react';
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
  const { currentUser, balance } = useAuth();
  const navigate = useNavigate();
  
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handlePreWithdraw = () => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      return toast.error('Minimum withdrawal amount is $10 USD');
    }
    if (numAmount > balance) {
      return toast.error('Insufficient balance');
    }
    if (!selectedAccount) {
      return toast.error('Please select a withdrawal account');
    }
    setShowConfirm(true);
  };

  const executeWithdraw = async () => {
    const numAmount = Number(amount);
    setWithdrawing(true);
    try {
      // Create transaction
      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'withdrawal',
        amount: numAmount,
        status: 'pending',
        accountDetails: selectedAccount,
        createdAt: serverTimestamp(),
      });

      // Deduct balance
      await updateDoc(doc(db, 'users', currentUser.uid), {
        balance: increment(-numAmount)
      });

      setAmount('');
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (error) {
      toast.error('Failed to process withdrawal. Please try again later.');
    }
    setWithdrawing(false);
  };

  if (loading) return <div className="page-content text-center py-5">Loading...</div>;

  return (
    <>
      <motion.div 
        className="page-content"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
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
            <h2 style={{ fontSize: '20px', margin: 0 }}>Withdraw Funds</h2>
          </div>
        </div>

        <div className="panel mb-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="text-muted">Available Balance</span>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success)' }}>${balance.toFixed(2)}</span>
          </div>

          {accounts.length === 0 ? (
            <div style={{ padding: '20px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.2)', textAlign: 'center' }}>
              <AlertTriangle size={32} color="var(--danger)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>No Withdrawal Account</h3>
              <p className="text-muted" style={{ fontSize: '14px', marginBottom: '16px' }}>You need to bind a withdrawal method before you can request a withdrawal.</p>
              <button className="btn btn-primary w-100" onClick={() => navigate('/bind-account')}>
                Bind Account Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label className="input-label">Select Withdrawal Method</label>
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
                <label className="input-label">Amount (USD)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="10.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
                  />
                  <button 
                    onClick={() => setAmount(balance.toString())}
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    MAX
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
                  <span className="text-muted">Minimum: $10.00</span>
                  <span className="text-muted">Fee: 0%</span>
                </div>
              </div>

              <button 
                className="btn btn-primary w-100" 
                style={{ padding: '14px', fontSize: '16px', fontWeight: 600, marginTop: '8px' }}
                onClick={handlePreWithdraw}
                disabled={withdrawing}
              >
                {withdrawing ? 'Processing...' : 'Submit Withdrawal'}
              </button>
            </div>
          )}
        </div>

        {/* Supported Networks Strip */}
        <div style={{ marginBottom: '16px', padding: '0 4px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Supported Networks</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {[
              { logo: 'https://cryptologos.cc/logos/tron-trx-logo.png',        label: 'TRC20',   color: '#ef0027' },
              { logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',          label: 'BEP20',   color: '#f0b90b' },
              { logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',     label: 'ERC20',   color: '#627eea' },
              { logo: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png', label: 'Binance', color: '#f0b90b' },
            ].map((chain) => (
              <div key={chain.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', padding: '3px', border: `2px solid ${chain.color}50`, boxShadow: `0 3px 10px ${chain.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={chain.logo}
                    alt={chain.label}
                    style={{ width: '30px', height: '30px', objectFit: 'contain', borderRadius: '50%' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>{chain.label}</span>
              </div>
            ))}
          </div>
        </div>

      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && selectedAccount && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => !withdrawing && setShowConfirm(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 101, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
            >
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Confirm Withdrawal</h3>
                <button onClick={() => !withdrawing && setShowConfirm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} disabled={withdrawing}>
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ padding: '20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>Withdrawal Amount</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)' }}>${Number(amount).toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>No fees applied (0%)</div>
                </div>

                <div style={{ background: 'var(--bg-dark)', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Transfer Details</div>
                  
                  {selectedAccount.type === 'binance_id' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <NetworkBadge network="BINANCE" size={32} />
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>Binance Pay</span>
                        </div>
                        <span style={{ fontSize: '11px', background: 'rgba(240,185,11,0.15)', color: '#f0b90b', padding: '3px 8px', borderRadius: '20px', fontWeight: 600 }}>BNB Chain</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Method</span>
                        <span style={{ fontWeight: 500, fontSize: '14px' }}>Binance Pay</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Pay ID</span>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{selectedAccount.binanceId}</span>
                      </div>
                    </>
                  )}

                  {selectedAccount.type === 'crypto_address' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <NetworkBadge network={selectedAccount.network} size={32} />
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>{selectedAccount.network}</span>
                        </div>
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.07)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '20px', fontWeight: 600 }}>Crypto</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Network</span>
                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{selectedAccount.network}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Destination Address</span>
                        <span style={{ fontWeight: 600, fontSize: '13px', wordBreak: 'break-all', background: 'rgba(255,255,255,0.05)', padding: '6px 8px', borderRadius: '4px' }}>
                          {selectedAccount.address}
                        </span>
                      </div>
                    </>
                  )}

                  {selectedAccount.type === 'mobile' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Provider</span>
                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{selectedAccount.network}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Account Name</span>
                        <span style={{ fontWeight: 500, fontSize: '14px' }}>{selectedAccount.accountName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Mobile Number</span>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{selectedAccount.accountNumber}</span>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ flex: 1, padding: '12px' }}
                    onClick={() => setShowConfirm(false)}
                    disabled={withdrawing}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, padding: '12px' }}
                    onClick={executeWithdraw}
                    disabled={withdrawing}
                  >
                    {withdrawing ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showSuccess && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', width: '100%', maxWidth: '400px', minHeight: '440px', position: 'relative', zIndex: 101, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}
            >
              <div style={{ position: 'relative', marginBottom: '32px' }}>
                {/* Bomb Effect Particles */}
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{ 
                      x: Math.cos((i * 360) / 16 * (Math.PI / 180)) * 100, 
                      y: Math.sin((i * 360) / 16 * (Math.PI / 180)) * 100,
                      scale: [0, Math.random() * 1.5 + 0.5, 0],
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
                      boxShadow: '0 0 10px var(--success)',
                      zIndex: 1
                    }}
                  />
                ))}
                
                {/* Main Verified Badge */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 150, delay: 0.2 }}
                  style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--success)', position: 'relative', zIndex: 2, boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)' }}
                >
                  <CheckCircle2 size={50} color="var(--success)" />
                </motion.div>
              </div>

              <motion.h3 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{ fontSize: '26px', margin: '0 0 12px 0', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 700 }}
              >
                Successfully Submitted!
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '15px', marginBottom: '32px', lineHeight: 1.5 }}
              >
                Your withdrawal has been queued for processing. You can track the status in your transactions history.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '16px' }}
                onClick={() => {
                  setShowSuccess(false);
                  navigate('/transactions');
                }}
              >
                View Transactions
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
