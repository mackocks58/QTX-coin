import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { Home, Pickaxe, History, Users, User, Globe, Bot, ShieldAlert } from 'lucide-react';
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
import { useCountry } from './components/CountryDetector';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NetworkOverlay } from './components/NetworkOverlay';
import { FloatingSupport } from './components/FloatingSupport';
import './index.css'; 

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();
  
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
          <span>Home</span>
        </Link>
        <Link to="/trading" className={isActive('/trading')} style={navItemStyle('/trading')}>
          <Pickaxe size={20} />
          <span>Mining</span>
        </Link>
        <Link to="/transactions" className={isActive('/transactions')} style={navItemStyle('/transactions')}>
          <History size={20} />
          <span>History</span>
        </Link>
        <Link to="/affiliate" className={isActive('/affiliate')} style={navItemStyle('/affiliate')}>
          <Users size={20} />
          <span>Team</span>
        </Link>
        <Link to="/account" className={isActive('/account')} style={navItemStyle('/account')}>
          <User size={20} />
          <span>Me</span>
        </Link>
      </nav>

    </aside>
  );
};

const Topbar = () => {
  const { countryCode, error } = useCountry();
  const { balance, isAdmin } = useAuth();

  return (
    <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/logo.png" alt="FINTEX Logo" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
        {countryCode && countryCode !== 'GL' && !error ? (
          <img 
            src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`} 
            alt="Country Flag" 
            style={{ width: '28px', height: '20px', borderRadius: '4px', objectFit: 'cover', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} 
          />
        ) : (
          <Globe size={24} color="var(--primary)" />
        )}
      </div>
      <div className="flex items-center gap-4">
        {isAdmin && (
          <Link to="/admin" className="btn" style={{ background: 'var(--danger)', color: '#fff', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', border: 'none' }}>
            <ShieldAlert size={14} /> Admin
          </Link>
        )}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Live Balance</div>
          <div style={{ fontWeight: 600, color: 'var(--success)' }}>${balance.toFixed(2)}</div>
        </div>
        <Link to="/wallet" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Deposit</Link>
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
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NetworkOverlay />
        <FloatingSupport />
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
