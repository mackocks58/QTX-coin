import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { Bell, ArrowRight, ArrowDownToLine, Send, Crown, Gift, HelpCircle, UserPlus, Building, Smartphone, Globe, Bot, ShieldCheck, Check } from 'lucide-react';
import { LiveTransactions } from '../components/LiveTransactions';
import { DashboardCharts } from '../components/DashboardCharts';
import { SpinPromoPopup } from '../components/SpinPromoPopup';

export const Dashboard = () => {
  const { currentUser, userData, balance, miningBalance, investmentBalance, qtxBalance } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const { formatCurrency, rate } = useCurrency();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
  ];

  // Wallet values mapped directly from Firestore
  const profitWallet = balance || 0;
  const miningWallet = miningBalance || 0;
  const cryptoInvestments = userData?.activatedCrypto?.filter(c => c.status === 'running').reduce((sum, c) => sum + parseFloat(c.price || 0), 0) || 0;
  const investmentWallet = (investmentBalance || 0) + cryptoInvestments;
  const qtxWallet = qtxBalance || 0;
  const totalAssets = profitWallet + miningWallet + investmentWallet;
  
  const unreadNotificationsCount = userData?.notifications?.filter(n => !n.read).length || 0;
  const hasRunningBots = userData?.activatedBots?.some(bot => bot.status === 'running');

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '8px 12px' }}
    >
      {/* Home-page promo popup — fires on every load */}
      <SpinPromoPopup />
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => navigate('/account')} className="cursor-pointer">
          <div style={{ 
            position: 'relative', 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: hasRunningBots ? '0 0 15px rgba(16, 185, 129, 0.6)' : 'none'
          }}>
            {hasRunningBots && (
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, transparent 0 160deg, rgba(16,185,129,0.4) 220deg, #10b981 310deg, #059669 360deg)',
                animation: 'spin 2s linear infinite',
                zIndex: 0
              }} />
            )}
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              overflow: 'hidden', 
              border: hasRunningBots ? '2px solid var(--bg-dark)' : '2px solid var(--primary)',
              zIndex: 1,
              position: 'relative'
            }}>
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#000', fontWeight: 'bold', fontSize: '18px' }}>
                  {currentUser?.email?.charAt(0).toUpperCase() || 'M'}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '24px', width: 'auto', objectFit: 'contain' }} />
            <h3 style={{ margin: 0, letterSpacing: '1px', fontSize: '18px', color: 'var(--text-primary)' }}>QTX Coin</h3>
            {/* Bell notification — placed next to company name */}
            <div onClick={() => navigate('/notifications')} style={{ position: 'relative', cursor: 'pointer', padding: '4px', marginLeft: '4px' }}>
              <Bell size={18} color="var(--primary)" />
              {unreadNotificationsCount > 0 && (
                <span style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {unreadNotificationsCount}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* LANGUAGE SWITCHER only — Bell moved to left side next to logo */}

          {/* LANGUAGE SWITCHER */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setLangOpen(prev => !prev)}
              style={{
                background: langOpen ? 'var(--primary-glow)' : 'var(--bg-panel)',
                padding: '6px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                border: `1px solid ${langOpen ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                userSelect: 'none'
              }}
            >
              <Globe size={13} color="var(--primary)" />
              <span style={{ fontWeight: 500 }}>{currentLang.flag} {currentLang.label}</span>
              <span style={{
                fontSize: '8px',
                color: 'var(--text-muted)',
                display: 'inline-block',
                transition: 'transform 0.2s',
                transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>▼</span>
            </div>

            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    minWidth: '150px',
                    zIndex: 1000,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.45)'
                  }}
                >
                  <div style={{ padding: '8px 12px 4px', fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('selectLanguage')}
                  </div>
                  {LANGUAGES.map(lang => (
                    <div
                      key={lang.code}
                      onClick={() => { changeLanguage(lang.code); setLangOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: language === lang.code ? 600 : 400,
                        color: language === lang.code ? 'var(--primary)' : 'var(--text-primary)',
                        background: language === lang.code ? 'var(--primary-glow)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <span>{lang.flag} {lang.label}</span>
                      {language === lang.code && <Check size={12} color="var(--primary)" />}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ALERT */}
      <style>{`
        @keyframes dashSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ background: 'linear-gradient(90deg, #ff4d4d, #ff8c00)', padding: '8px 10px', borderRadius: '8px', marginBottom: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontWeight: 500, boxShadow: '0 2px 8px rgba(255, 140, 0, 0.2)' }}>
        <Bell size={14} style={{ flexShrink: 0 }} />
        <span style={{ lineHeight: 1.1 }}>{t('certified')}</span>
      </div>

      {/* CARD */}
      <div style={{ 
        background: 'linear-gradient(135deg, #d4af37, #f5d98b)', 
        borderRadius: '14px', 
        padding: '2px', 
        marginBottom: '14px', 
        boxShadow: '0 8px 25px rgba(212,175,55,0.35)' 
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #141414, #1f1f1f)', 
          borderRadius: '12px', 
          padding: '16px', 
          height: '100%' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '12px', color: '#ccc', margin: 0, fontWeight: 500 }}>{t('totalAssets')}</h2>
            <div style={{ color: '#f5d98b', fontSize: '20px', fontWeight: 'bold', textShadow: '0 2px 10px rgba(212,175,55,0.4)' }}>
              {formatCurrency(totalAssets)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('miningWallet')}</span>
            <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(miningWallet)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('investmentWallet')}</span>
            <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(investmentWallet)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0 0 0', paddingTop: '2px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t('profitWallet')}</span>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(profitWallet)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0 0 0', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>QTX Holdings</span>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{qtxWallet.toFixed(4)} QTX</span>
          </div>
        </div>
      </div>

      {/* GRID CARD */}
      <div style={{ background: 'var(--bg-panel)', borderRadius: '12px', padding: '16px 12px', border: '1px solid var(--border)', marginBottom: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 8px' }}>
          {[
            { icon: <ArrowDownToLine size={18} color="var(--primary)" />, label: t('recharge'), path: '/wallet' },
            { icon: <Send size={18} color="var(--primary)" />, label: t('withdraw'), path: '/withdraw' },
            { icon: <Crown size={18} color="var(--warning)" />, label: 'Assets', path: '/assets' },
            { icon: <img src="/images/spin_icon.png" alt="spin" style={{ width: '22px', height: '22px', animation: 'dashSpin 4s linear infinite' }} />, label: t('luckySpin'), path: '/spin' },
            { icon: <ShieldCheck size={18} color="var(--text-muted)" />, label: t('security'), path: '/security' },
            { icon: <UserPlus size={18} color="var(--success)" />, label: t('invite'), path: '/affiliate' },
            { icon: <Building size={18} color="var(--text-muted)" />, label: t('about'), path: '/about' },
            { icon: <Globe size={18} color="var(--primary)" />, label: 'Market', path: '/market' },
          ].map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => navigate(item.path)}
              style={{ textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <div 
                style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px', border: '1px solid rgba(255,255,255,0.05)', transition: 'var(--transition)' }}
                className="hover:border-primary hover:bg-panel-hover"
              >
                {item.icon}
              </div>
              <p style={{ fontSize: '9px', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div 
        onClick={() => navigate('/trading')}
        style={{ background: 'var(--bg-panel)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}
        className="hover:border-primary"
      >
        <div>
          <strong style={{ fontSize: '12px', display: 'block', marginBottom: '2px', color: 'var(--text-primary)' }}>Trade QTX Coin</strong>
          <small style={{ color: 'var(--success)', fontSize: '10px' }}>Buy \u0026 Sell QTX</small>
        </div>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowRight size={12} color="var(--primary)" />
        </div>
      </div>

      <div style={{ marginTop: '12px' }}>
        <LiveTransactions />
      </div>

      <DashboardCharts />

      <footer style={{ textAlign: 'center', fontSize: '9px', margin: '12px 0 0 0', color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} QTX Coin. All rights reserved.
      </footer>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
      
    </motion.div>
  );
};
