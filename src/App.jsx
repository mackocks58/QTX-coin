import React, { useEffect, useState, useRef } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Pickaxe, History, Users, User, Globe, Bot, ShieldAlert, Check, Menu, Crown, Film, LineChart } from 'lucide-react';
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
import { Assets } from './pages/Assets';
import { Market } from './pages/Market';
import { Movies } from './pages/Movies';
import { Wealth } from './pages/Wealth';
import { Support } from './pages/Support';
import { AdminSupport } from './pages/AdminSupport';
import { useCurrency } from './hooks/useCurrency';
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

const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();
  
  const isActive = (path) => location.pathname === path ? "active" : "";

  return (
    <nav className="bottom-nav">
      <Link to="/" className={isActive('/')}>
        <Home size={20} />
        <span>{t('home')}</span>
      </Link>
      <Link to="/market" className={isActive('/market')}>
        <Globe size={20} />
        <span>Market</span>
      </Link>
      <Link to="/trading" className={isActive('/trading')}>
        <Pickaxe size={20} />
        <span>Buy QTX</span>
      </Link>
      <Link to="/assets" className={isActive('/assets')}>
        <History size={20} />
        <span>Assets</span>
      </Link>
      <Link to="/account" className={isActive('/account')}>
        <User size={20} />
        <span>{t('me')}</span>
      </Link>
    </nav>
  );
};

const Sidebar = ({ isSidebarOpen, setSidebarOpen }) => {
  return (
    <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <div className="brand-header" style={{ padding: '24px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="QTX Coin Logo" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
          <h2 style={{ color: 'var(--primary)', letterSpacing: '1px', margin: 0, fontSize: '1.2rem' }}>QTX Coin</h2>
        </div>
      </div>
      <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Link 
          to="/transactions" 
          onClick={() => setSidebarOpen(false)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px 24px', 
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '1rem'
          }}
          className="hover:bg-panel-hover"
        >
          <History size={20} />
          <span>History</span>
        </Link>
        <Link 
          to="/vip" 
          onClick={() => setSidebarOpen(false)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px 24px', 
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '1rem'
          }}
          className="hover:bg-panel-hover"
        >
          <Crown size={20} />
          <span>VIP Bots</span>
        </Link>
        <Link 
          to="/wealth" 
          onClick={() => setSidebarOpen(false)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px 24px', 
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '1rem'
          }}
          className="hover:bg-panel-hover"
        >
          <LineChart size={20} />
          <span>Wealth</span>
        </Link>
        <Link 
          to="/my-bots" 
          onClick={() => setSidebarOpen(false)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px 24px', 
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '1rem'
          }}
          className="hover:bg-panel-hover"
        >
          <Bot size={20} />
          <span>My Bots</span>
        </Link>
        <Link 
          to="/movies" 
          onClick={() => setSidebarOpen(false)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '12px 24px', 
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '1rem'
          }}
          className="hover:bg-panel-hover"
        >
          <Film size={20} />
          <span>Watch & Earn</span>
        </Link>
      </div>
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

const Topbar = ({ setSidebarOpen }) => {
  const { balance, isAdmin, userData } = useAuth();
  const { t, language, changeLanguage } = useLanguage();
  const { formatCurrency } = useCurrency();
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="menu-btn" onClick={() => setSidebarOpen(true)} style={{ color: 'var(--text-primary)', padding: '4px', display: 'flex' }}>
          <Menu size={24} />
        </button>
        <img src="/logo.png" alt="QTX Coin Logo" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
        {countryCode && countryCode !== 'UN' ? (
          <img 
            src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`} 
            alt="Country Flag" 
            style={{ width: '28px', height: '20px', borderRadius: '4px', objectFit: 'cover', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} 
          />
        ) : (
          <Globe size={24} color="var(--primary)" />
        )}
      </div>
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isAdmin && (
          <Link to="/admin" className="btn" style={{ background: 'var(--danger)', color: '#fff', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', border: 'none' }}>
            <ShieldAlert size={14} /> Admin
          </Link>
        )}
        {/* Balance */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="topbar-balance-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('liveBalance')}</div>
          <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formatCurrency(balance)}</div>
        </div>
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
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
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

        <Link to="/wallet" className="btn btn-primary topbar-deposit-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', flexShrink: 0, gap: '4px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          <span className="topbar-deposit-text">{t('deposit')}</span>
        </Link>
      </div>
    </header>
  );
};

function AppContent() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setupPushNotifications(currentUser.uid);
    }
  }, [currentUser]);
  
  if (!currentUser && location.pathname !== '/login') {
    return <Navigate to="/login" />;
  }

  return (
    <div className="app-container">
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }
      }} />
      
      {currentUser && (
        <>
          <div 
            className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
            onClick={() => setSidebarOpen(false)} 
          />
          <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
        </>
      )}
      
      <main className="main-content" style={{ width: currentUser ? 'auto' : '100%' }}>
        {currentUser && <Topbar setSidebarOpen={setSidebarOpen} />}
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
            <Route path="/assets" element={<PrivateRoute><Assets /></PrivateRoute>} />
            <Route path="/market" element={<PrivateRoute><Market /></PrivateRoute>} />
            <Route path="/movies" element={<PrivateRoute><Movies /></PrivateRoute>} />
            <Route path="/wealth" element={<PrivateRoute><Wealth /></PrivateRoute>} />
            <Route path="/support" element={<PrivateRoute><Support /></PrivateRoute>} />
            <Route path="/admin/support" element={<PrivateRoute><AdminSupport /></PrivateRoute>} />
          </Routes>
        </AnimatePresence>
      </main>
      {currentUser && <BottomNav />}
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
