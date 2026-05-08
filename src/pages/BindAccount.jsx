import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const NETWORK_MAP = {
  'Kenya': ['M-Pesa', 'Airtel Money'],
  'Mozambique': ['M-Pesa', 'e-Mola'],
  'Tanzania': ['M-Pesa', 'Tigo Pesa', 'Airtel Money'],
  'Uganda': ['MTN Mobile Money', 'Airtel Money'],
  'Botswana': ['Orange Money', 'Mascom MyZaka', 'Smega'],
  'Congo (DRC)': ['M-Pesa', 'Airtel Money', 'Orange Money'],
  'Zambia': ['MTN Mobile Money', 'Airtel Money', 'Zamtel'],
  'Burundi': ['EcoCash', 'Lumicash'],
  'Ghana': ['MTN Mobile Money', 'Vodafone Cash', 'AirtelTigo'],
  'Global/Other': ['Bank Transfer', 'Crypto Wallet']
};

export const BindAccount = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  // UI State
  const [activeTab, setActiveTab] = useState('binance');
  const [userCountry, setUserCountry] = useState('Global/Other');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Multiple Accounts State
  const [savedAccounts, setSavedAccounts] = useState({});
  const [isEditing, setIsEditing] = useState(true);
  const [authPassword, setAuthPassword] = useState('');
  
  // Form State
  const [binanceMethod, setBinanceMethod] = useState('id'); // 'id' or 'address'
  const [binanceId, setBinanceId] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('TRC20'); // 'TRC20' or 'BSC'
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [network, setNetwork] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const controls = useAnimation();

  const triggerShake = () => {
    controls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    });
  };

  useEffect(() => {
    if (activeTab === 'binance' && binanceMethod === 'id' && savedAccounts['binance_id']) {
      setBinanceId(savedAccounts['binance_id'].binanceId);
    }
    if (activeTab === 'binance' && binanceMethod === 'address' && savedAccounts['crypto_address']) {
      setCryptoNetwork(savedAccounts['crypto_address'].network);
      setCryptoAddress(savedAccounts['crypto_address'].address);
    }
    if (activeTab === 'mobile' && savedAccounts['mobile']) {
      setNetwork(savedAccounts['mobile'].network);
      setAccountName(savedAccounts['mobile'].accountName);
      setAccountNumber(savedAccounts['mobile'].accountNumber);
    }
  }, [activeTab, binanceMethod, savedAccounts]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchProfile = async () => {
      const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const country = data.country || 'Global/Other';
        setUserCountry(country);
        
        const networks = NETWORK_MAP[country] || NETWORK_MAP['Global/Other'];
        if (networks && networks.length > 0) {
           setNetwork(networks[0]);
        }

        let loadedAccounts = data.withdrawalAccounts || {};
        if (data.withdrawalAccount && Object.keys(loadedAccounts).length === 0) {
           loadedAccounts[data.withdrawalAccount.type] = data.withdrawalAccount;
        }

        setSavedAccounts(loadedAccounts);
        if (Object.keys(loadedAccounts).length > 0) {
           setIsEditing(false); 
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [currentUser]);

  const handleSave = async () => {
    let isValid = true;
    if (activeTab === 'binance') {
      if (binanceMethod === 'id' && (!binanceId || String(binanceId).length < 5)) {
        toast.error('Please enter a valid Binance ID');
        isValid = false;
      }
      if (binanceMethod === 'address' && (!cryptoAddress || String(cryptoAddress).length < 10)) {
        toast.error('Please enter a valid wallet address');
        isValid = false;
      }
    }
    
    if (activeTab === 'mobile' && (!network || !accountName || !accountNumber)) {
      toast.error('Please fill in all mobile account details');
      isValid = false;
    }

    if (!authPassword) {
      toast.error('Please enter your login password to securely save changes.');
      isValid = false;
    }

    if (!isValid) {
      triggerShake();
      return;
    }

    setSaving(true);
    
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, authPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
    } catch (error) {
      setSaving(false);
      triggerShake();
      return toast.error('Incorrect password. Please try again.');
    }

    try {
      let accountData;
      if (activeTab === 'binance') {
        if (binanceMethod === 'id') {
          accountData = { type: 'binance_id', binanceId: String(binanceId).trim() };
        } else {
          accountData = { type: 'crypto_address', network: cryptoNetwork, address: String(cryptoAddress).trim() };
        }
      } else {
        accountData = { type: 'mobile', network, accountName: accountName.trim(), accountNumber: String(accountNumber).trim() };
      }

      await setDoc(doc(db, 'users', currentUser.uid), {
        withdrawalAccounts: {
          [accountData.type]: accountData
        }
      }, { merge: true });
      
      const updatedAccounts = { ...savedAccounts, [accountData.type]: accountData };
      setSavedAccounts(updatedAccounts);
      setIsEditing(false); 
      setAuthPassword(''); 
      toast.success('Withdrawal method saved successfully!');
    } catch (error) {
      toast.error('Failed to save account details.');
    }
    
    setSaving(false);
  };

  if (loading) return <div className="page-content text-center py-5">Loading...</div>;

  const availableNetworks = NETWORK_MAP[userCountry] || NETWORK_MAP['Global/Other'];
  const hasAccounts = Object.keys(savedAccounts).length > 0;

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={controls}
      onViewportEnter={() => controls.start({ opacity: 1, y: 0 })}
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
        <h2 className="mb-0">Withdrawal Methods</h2>
      </div>

      <div className="panel" style={{ maxWidth: '400px' }}>
        
        {hasAccounts && !isEditing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="mb-4 text-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={22} color="var(--success)" />
              Verified Accounts
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {Object.values(savedAccounts).map((acc, index) => (
                <div key={index} style={{ padding: '16px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Verified
                  </div>
                  
                  {acc.type === 'binance_id' && (
                     <>
                       <div className="text-muted" style={{ fontSize: '0.85rem' }}>Binance Pay ID</div>
                       <div style={{ fontSize: '1.1rem', fontWeight: 500, fontFamily: 'monospace' }}>{acc.binanceId}</div>
                     </>
                  )}
                  {acc.type === 'crypto_address' && (
                     <>
                       <div className="text-muted" style={{ fontSize: '0.85rem' }}>{acc.network} Address</div>
                       <div style={{ fontSize: '0.9rem', fontWeight: 500, fontFamily: 'monospace', wordBreak: 'break-all' }}>{acc.address}</div>
                     </>
                  )}
                  {acc.type === 'mobile' && (
                     <>
                       <div className="text-muted" style={{ fontSize: '0.85rem' }}>{acc.network} Account</div>
                       <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{acc.accountName}</div>
                       <div style={{ fontFamily: 'monospace', marginTop: '4px', fontSize: '1.05rem' }}>{acc.accountNumber}</div>
                     </>
                  )}
                </div>
              ))}
            </div>
            
            <button 
              className="btn w-100 hover:bg-dark" 
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', transition: 'var(--transition)' }}
              onClick={() => setIsEditing(true)}
            >
              Add or Edit Accounts
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            
            <div style={{ display: 'flex', background: 'var(--border)', padding: '4px', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
              <button 
                onClick={() => setActiveTab('binance')}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'binance' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'binance' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'binance' ? 600 : 400, boxShadow: activeTab === 'binance' ? 'var(--shadow-sm)' : 'none' }}
              >
                Binance
              </button>
              <button 
                onClick={() => setActiveTab('mobile')}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', background: activeTab === 'mobile' ? 'var(--bg-panel)' : 'transparent', color: activeTab === 'mobile' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'mobile' ? 600 : 400, boxShadow: activeTab === 'mobile' ? 'var(--shadow-sm)' : 'none' }}
              >
                Mobile
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'binance' && (
                <motion.div key="binance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                      <input type="radio" name="binanceMethod" checked={binanceMethod === 'id'} onChange={() => setBinanceMethod('id')} style={{ accentColor: 'var(--primary)' }} />
                      Binance Pay ID
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-primary)', marginLeft: '10px' }}>
                      <input type="radio" name="binanceMethod" checked={binanceMethod === 'address'} onChange={() => setBinanceMethod('address')} style={{ accentColor: 'var(--primary)' }} />
                      Chain Address
                    </label>
                  </div>

                  {binanceMethod === 'id' ? (
                    <>
                      <div className="input-group">
                        <label className="input-label">Binance Pay ID</label>
                        <input type="number" className="input-field" placeholder="e.g. 123456789" value={binanceId} onChange={(e) => setBinanceId(e.target.value)} />
                      </div>
                      <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>Your numeric Binance Pay ID.</p>
                    </>
                  ) : (
                    <>
                      <div className="input-group">
                        <label className="input-label">Network</label>
                        <select className="input-field" value={cryptoNetwork} onChange={(e) => setCryptoNetwork(e.target.value)}>
                          <option value="TRC20">USDT (TRC20)</option>
                          <option value="BSC">USDT (BNB Chain / BEP20)</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Wallet Address</label>
                        <input type="text" className="input-field" placeholder="Paste wallet address here..." value={cryptoAddress} onChange={(e) => setCryptoAddress(e.target.value)} />
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'mobile' && (
                <motion.div key="mobile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="input-group">
                    <label className="input-label">Network ({userCountry})</label>
                    <select className="input-field" value={network} onChange={(e) => setNetwork(e.target.value)}>
                      {availableNetworks.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Account Holder Name</label>
                    <input type="text" className="input-field" placeholder="e.g. John Doe" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Mobile Number</label>
                    <input type="tel" className="input-field" placeholder="e.g. 0970000000" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '10px' }}>
              <div className="input-group">
                <label className="input-label" style={{ color: 'var(--danger)' }}>Security Verification</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Enter your account login password" 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                />
              </div>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '8px' }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Verifying & Saving...' : 'Save Method securely'}
              </button>
              
              {hasAccounts && (
                <button 
                  className="btn mt-2 w-100" 
                  style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.9rem' }}
                  onClick={() => {
                    setIsEditing(false);
                    setAuthPassword(''); 
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}
            </div>

          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
