import React, { useEffect, useState, useRef } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Pickaxe, History, Users, User, Globe, Bot, ShieldAlert, Check } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { Wallet } from './pages/Wallet';
import { Account } from './pages/Account';
import { Affiliate } from './pages/Affiliate';
import { BindAccount } from './pages/BindAccount';
import { Login } from './pages/Login';
import { Transactions } from './pages/Transactions';
import { Trading } from './pages/Trading';
import { Security } from './pages/Security';
import { Notifications } from './pages/Notifications';
import { VIP } from './pages/VIP';
import { MyBots } from './pages/MyBots';
import { About } from './pages/About';
import { Event } from './pages/Event';
import { Withdraw } from './pages/Withdraw';
import { Admin } from './pages/Admin';
import { FAQ } from './pages/FAQ';
import { Spin } from './pages/Spin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { App as CapApp } from '@capacitor/app';
import { setupPushNotifications } from './services/pushNotifications';
import { NetworkOverlay } from './components/NetworkOverlay';
import { FloatingSupport } from './components/FloatingSupport';
import './index.css'; 

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

const HardwareBackButton = () => {
  const location = useLocation();

  useEffect(() => {
    const handleBackButton = ({ canGoBack }) => {
      // If we are at the root or login page, let the app close natively
      if (location.pathname === '/' || location.pathname === '/login') {
        CapApp.exitApp();
      } else {
        // Otherwise, navigate back in the React Router history
        window.history.back();
      }
    };

    CapApp.addListener('backButton', handleBackButton);

    return () => {
      CapApp.removeAllListeners();
    };
  }, [location]);

  return null;
};

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const { t } = useLanguage();
  
  const navItemStyle = (path) => {
    const isActive = location.pathname === path;
    return {
      padding: '12px 24px', 
      color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
      borderRight: isActive ? '3px solid var(--primary)' : 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    };
  };

  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <aside className="sidebar">
      <div className="brand-header" style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="FINTEX Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          <h2 style={{ color: 'var(--primary)', letterSpacing: '1px', margin: 0, fontSize: '1.2rem' }}>FINTEX</h2>
        </div>
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', padding: '16px 0', flex: 1 }}>
        <Link to="/" className={isActive('/')} style={navItemStyle('/')}>
          <Home size={20} />
          <span>{t('home')}</span>
        </Link>
        <Link to="/trading" className={isActive('/trading')} style={navItemStyle('/trading')}>
          <Pickaxe size={20} />
          <span>{t('mining')}</span>
        </Link>
        <Link to="/transactions" className={isActive('/transactions')} style={navItemStyle('/transactions')}>
          <History size={20} />
          <span>{t('history')}</span>
        </Link>
        <Link to="/affiliate" className={isActive('/affiliate')} style={navItemStyle('/affiliate')}>
          <Users size={20} />
          <span>{t('team')}</span>
        </Link>
        <Link to="/account" className={isActive('/account')} style={navItemStyle('/account')}>
          <User size={20} />
          <span>{t('me')}</span>
        </Link>
      </nav>

    </aside>
  );
};

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
  { code: 'UN', name: 'Global/Other' }
];

const Topbar = () => {
  const { balance, isAdmin, userData } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  
  const userCountryObj = userData?.country ? COUNTRIES.find(c => c.name === userData.country) : null;
  const countryCode = userCountryObj ? userCountryObj.code : null;

  return (
    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {/* LEFT — Logo + Country flag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/logo.png" alt="FINTEX Logo" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
        {countryCode && countryCode !== 'UN' ? (
          <img
            src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
            alt="Country Flag"
            style={{ width: '28px', height: '20px', borderRadius: '4px', objectFit: 'cover', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
          />
        ) : (
          <Globe size={22} color="var(--primary)" />
        )}
      </div>

      {/* CENTER — Language Globe Switcher */}
      <div ref={langRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setLangOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            background: langOpen ? 'var(--primary-glow)' : 'var(--bg-dark)',
            border: `1px solid ${langOpen ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: '20px', padding: '5px 10px', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <Globe size={13} color="var(--primary)" />
          <span>{language === 'en' ? '🇬🇧' : '🇧🇷'}</span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', transform: langOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
        </button>

        <AnimatePresence>
          {langOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
                background: 'var(--bg-panel)', border: '1px solid var(--border)',
                borderRadius: '12px', minWidth: '150px', overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 1000,
              }}
            >
              {[{ code: 'en', flag: '🇬🇧', label: t('langEnglish') }, { code: 'pt', flag: '🇧🇷', label: t('langPortuguese') }].map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { changeLanguage(lang.code); setLangOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    background: language === lang.code ? 'rgba(16,185,129,0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: language === lang.code ? 'var(--primary)' : 'var(--text-secondary)',
                    fontSize: '13px', fontWeight: language === lang.code ? 700 : 400,
                    borderBottom: lang.code === 'en' ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{lang.label}</span>
                  {language === lang.code && <Check size={13} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT — Admin + Live Balance + Deposit */}
      <div className="flex items-center gap-4">
        {isAdmin && (
          <Link to="/admin" className="btn" style={{ background: 'var(--danger)', color: '#fff', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', border: 'none' }}>
            <ShieldAlert size={14} /> Admin
          </Link>
        )}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('liveBalance')}</div>
          <div style={{ fontWeight: 600, color: 'var(--success)' }}>${balance.toFixed(2)}</div>
        </div>
        <Link to="/wallet" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>{t('deposit')}</Link>
      </div>
    </header>
  );
};

function AppContent() {
  const location = useLocation();
  const { currentUser } = useAuth();
  
  if (!currentUser && location.pathname !== '/login') {
    return <Navigate to="/login" />;
  }

  useEffect(() => {
    if (currentUser) {
      setupPushNotifications(currentUser.uid);
    }
  }, [currentUser]);

  return (
    <div className="app-container">
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }} />
      
      {currentUser && <Sidebar />}
      
      <main className="main-content" style={{ width: currentUser ? 'auto' : '100%' }}>
        {currentUser && <Topbar />}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
            <Route path="/trading" element={<PrivateRoute><Trading /></PrivateRoute>} />
            <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path="/affiliate" element={<PrivateRoute><Affiliate /></PrivateRoute>} />
            <Route path="/bind-account" element={<PrivateRoute><BindAccount /></PrivateRoute>} />
            <Route path="/account" element={<PrivateRoute><Account /></PrivateRoute>} />
            <Route path="/security" element={<PrivateRoute><Security /></PrivateRoute>} />
            <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/vip" element={<PrivateRoute><VIP /></PrivateRoute>} />
            <Route path="/my-bots" element={<PrivateRoute><MyBots /></PrivateRoute>} />
            <Route path="/about" element={<PrivateRoute><About /></PrivateRoute>} />
            <Route path="/event" element={<PrivateRoute><Event /></PrivateRoute>} />
            <Route path="/withdraw" element={<PrivateRoute><Withdraw /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
            <Route path="/faq" element={<PrivateRoute><FAQ /></PrivateRoute>} />
            <Route path="/spin" element={<PrivateRoute><Spin /></PrivateRoute>} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <HardwareBackButton />
      <AuthProvider>
        <LanguageProvider>
          <NetworkOverlay />
          <FloatingSupport />
          <AppContent />
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
