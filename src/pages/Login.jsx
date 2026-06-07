import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Fingerprint, Globe, Check, Search, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

const COUNTRIES = [
  { code: 'KE', name: 'Kenya' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UG', name: 'Uganda' },
  { code: 'BW', name: 'Botswana' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'BI', name: 'Burundi' },
  { code: 'GH', name: 'Ghana' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'UN', name: 'Global/Other' }
];

const CustomCountrySelect = ({ value, onChange, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selected = COUNTRIES.find(c => c.name === value);

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div 
        className="input-field"
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', color: selected ? 'inherit' : 'var(--text-muted)' }}
        onClick={() => setIsOpen(true)}
      >
        {selected ? (
          <>
            <img src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`} alt="flag" style={{ width: '20px', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-primary)' }}>{selected.name}</span>
          </>
        ) : (
          <span>{t('selectCountry')}</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>▼</span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ 
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', 
              zIndex: 2000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setIsOpen(false)}
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
              {/* Drag Pill */}
              <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--text-muted)', opacity: 0.3, borderRadius: '10px', alignSelf: 'center', marginBottom: '16px' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{t('selectCountry')}</h3>
                <button type="button" onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'background 0.2s' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder={t('search') || 'Search countries...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '16px 16px 16px 48px',
                    borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)',
                    fontSize: '1.05rem', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.target.style.boxShadow = 'none';
                  }}
                  autoFocus
                />
              </div>

              <div style={{ overflowY: 'auto', flex: 1, margin: '0 -16px', padding: '0 16px', scrollbarWidth: 'none' }}>
                <style>{`.country-list::-webkit-scrollbar { display: none; }`}</style>
                <div className="country-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredCountries.length > 0 ? (
                  filteredCountries.map(c => (
                    <div 
                      key={c.code}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', 
                        cursor: 'pointer', borderRadius: '16px',
                        backgroundColor: value === c.name ? 'rgba(16,185,129,0.08)' : 'transparent',
                        border: value === c.name ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={e => { if(value !== c.name) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if(value !== c.name) e.currentTarget.style.backgroundColor = 'transparent' }}
                      onClick={() => { onChange(c.name); setIsOpen(false); }}
                    >
                      <div style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'var(--bg-dark)', border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} alt="flag" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontSize: '1.1rem', color: value === c.name ? 'var(--primary)' : 'var(--text-primary)', fontWeight: value === c.name ? 600 : 500 }}>{c.name}</span>
                      {value === c.name && <Check size={20} color="var(--primary)" style={{ marginLeft: 'auto' }} />}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Search size={32} opacity={0.2} />
                    <span>No countries found</span>
                  </div>
                )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const Login = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') === 'login');
  const { t, language, changeLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const available = await NativeBiometric.isAvailable();
        if (available.isAvailable) {
          const res = await NativeBiometric.isCredentialsSaved({ server: 'qtx coin_auth' });
          if (res.isSaved) setHasBiometric(true);
        }
      } catch (e) {
        console.log('Biometric check failed', e);
      }
    };
    checkBiometric();
  }, []);

  const { login, signup, currentUser } = useAuth();
  const navigate = useNavigate();
  const refId = searchParams.get('ref');

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const playErrorSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.error('Audio error:', e);
    }
  };

  const triggerShake = async () => {
    setIsShaking(true);
    
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Error });
      await Haptics.vibrate();
    } catch (e) {
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    }
    
    // Remove class after animation ends (400ms)
    setTimeout(() => setIsShaking(false), 400);
  };

  const isPhone = false; // Phone auth disabled

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || (!isLogin && !country)) {
      playErrorSound();
      triggerShake();
      return toast.error(t('errFillAllFields'));
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        
        try {
          const available = await NativeBiometric.isAvailable();
          if (available.isAvailable) {
            const saved = await NativeBiometric.isCredentialsSaved({ server: 'qtx coin_auth' });
            if (!saved.isSaved) {
              await NativeBiometric.setCredentials({
                username: email,
                password: password,
                server: 'qtx coin_auth',
              });
              toast.success(t('successBiometricEnabled'));
            }
          }
        } catch (e) {
          console.log('Biometric save error', e);
        }

        toast.success(t('successLoggedIn'));
      } else {
        await signup(email, password, country, refId);
        toast.success(t('successAccountCreated'));
      }
      navigate('/');
    } catch (error) {
      playErrorSound();
      triggerShake();
      let friendlyMessage = t('errAuthFailed');
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = t('errEmailInUse');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        friendlyMessage = t('errInvalidCredential');
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = t('errWeakPassword');
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = t('errNetworkFailed');
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = t('errTooManyRequests');
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = t('errInvalidEmail');
      }

      toast.error(friendlyMessage);
    }
    setLoading(false);
  };

  const handleBiometricLogin = async () => {
    try {
      await NativeBiometric.verifyIdentity({
        reason: "Authenticate to log in",
        title: "Biometric Login",
        subtitle: "Verify your identity or use screen lock",
        useFallback: true
      });

      const credentials = await NativeBiometric.getCredentials({
        server: 'qtx coin_auth',
      });
      setLoading(true);
      await login(credentials.username, credentials.password);
      toast.success(t('successBiometricLogin'));
      navigate('/');
    } catch (error) {
      console.log('Biometric login error', error);
      // Avoid showing error if user just canceled the prompt
      if (error && error.code !== '16' && error.code !== '15') {
        toast.error(t('errBiometricFailed'));
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', width: '100%' }}>
      <motion.div 
        style={{ width: '100%', maxWidth: '400px', margin: '20px' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className={`panel ${isShaking ? 'animate-shake' : ''}`} style={{ position: 'relative' }}>

          {/* ── Language switcher ── */}
          <div ref={langRef} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
            <button
              onClick={() => setLangOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--bg-dark)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '5px 10px', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600,
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <Globe size={14} color="var(--primary)" />
              <span>{language === 'en' ? '🇬🇧' : '🇧🇷'}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>▾</span>
            </button>

            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: 'var(--bg-panel)', border: '1px solid var(--border)',
                    borderRadius: '12px', minWidth: '150px', overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 100,
                  }}
                >
                  {[{ code: 'en', flag: '🇬🇧', label: t('langEnglish') }, { code: 'pt', flag: '🇧🇷', label: t('langPortuguese') }].map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { changeLanguage(lang.code); setLangOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', background: language === lang.code ? 'rgba(16,185,129,0.08)' : 'transparent',
                        border: 'none', cursor: 'pointer', color: language === lang.code ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: '13px', fontWeight: language === lang.code ? 700 : 400,
                        borderBottom: lang.code === 'en' ? '1px solid var(--border)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (language !== lang.code) e.currentTarget.style.background = 'var(--bg-dark)'; }}
                      onMouseLeave={e => { if (language !== lang.code) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                      <span style={{ flex: 1, textAlign: 'left' }}>{lang.label}</span>
                      {language === lang.code && <Check size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Logo & Title ── */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '32px', paddingTop: '16px' }}>
          <img src="/logo.png" alt="QTX Coin Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain' }} />
          <h2 style={{ color: 'var(--text-primary)', letterSpacing: '2px', margin: 0, fontSize: '28px' }}>QTX Coin</h2>
        </div>
        <h3 className="mb-4 text-center" style={{ color: 'var(--text-secondary)' }}>{isLogin ? t('signInBtn') : t('registerLabel')}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">{t('email')}</label>
            <input
              type="email"
              className={`input-field ${isShaking && !email ? 'input-error' : ''}`}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          {!isPhone && (
            <div className="input-group">
              <label className="input-label">{t('password')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className={`input-field ${isShaking && !password ? 'input-error' : ''}`}
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {!isLogin && (
            <div className="input-group">
              <label className="input-label">{t('country')}</label>
              <CustomCountrySelect value={country} onChange={setCountry} t={t} />
            </div>
          )}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? t('processing') : (isLogin ? t('signInBtn') : t('registerLabel'))}
          </button>
          
          {isLogin && hasBiometric && (
            <button 
              type="button" 
              onClick={handleBiometricLogin}
              className="btn btn-outline" 
              style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px', border: '1px solid var(--primary)', background: 'var(--primary-glow)', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              <Fingerprint size={20} /> {t('loginWithBiometrics')}
            </button>
          )}
        </form>
        
        <div className="text-center mt-4">
          <button onClick={() => setIsLogin(!isLogin)} style={{ fontSize: '0.85rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
            {isLogin ? (
              <>{t('dontHaveAccount')} <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('signUpLink')}</span></>
            ) : (
              <>{t('alreadyHaveAccountLink')} <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('signInLink')}</span></>
            )}
          </button>
        </div>
        </div>
      </motion.div>
    </div>
  );
};
