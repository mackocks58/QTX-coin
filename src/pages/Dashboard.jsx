import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bell, ArrowRight, ArrowDownToLine, Send, Crown, Gift, HelpCircle, UserPlus, Building, Smartphone, Globe, Bot, ShieldCheck } from 'lucide-react';
import { LiveTransactions } from '../components/LiveTransactions';
import { DashboardCharts } from '../components/DashboardCharts';

export const Dashboard = () => {
  const { currentUser, userData, balance, miningBalance, investmentBalance } = useAuth();
  const navigate = useNavigate();

  // Wallet values mapped directly from Firestore
  const profitWallet = balance || 0;
  const miningWallet = miningBalance || 0;
  const investmentWallet = investmentBalance || 0;
  const totalAssets = profitWallet + miningWallet + investmentWallet;
  
  const unreadNotificationsCount = userData?.notifications?.filter(n => !n.read).length || 0;
  const hasRunningBots = userData?.activatedBots?.some(bot => bot.status === 'running');

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '8px 12px' }}
    >
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
            <h3 style={{ margin: 0, letterSpacing: '1px', fontSize: '18px', color: 'var(--text-primary)' }}>FINTEX</h3>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div onClick={() => navigate('/notifications')} style={{ position: 'relative', cursor: 'pointer', padding: '4px' }}>
            <Bell size={20} color="var(--primary)" />
            {unreadNotificationsCount > 0 && (
              <span style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', borderRadius: '50%', width: '14px', height: '14px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {unreadNotificationsCount}
              </span>
            )}
          </div>
          <div style={{ background: 'var(--bg-panel)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}>
            <Globe size={14} color="var(--primary)" />
            <span>English</span>
          </div>
        </div>
      </div>

      {/* ALERT */}
      <div style={{ background: 'linear-gradient(90deg, #ff4d4d, #ff8c00)', padding: '8px 10px', borderRadius: '8px', marginBottom: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontWeight: 500, boxShadow: '0 2px 8px rgba(255, 140, 0, 0.2)' }}>
        <Bell size={14} style={{ flexShrink: 0 }} />
        <span style={{ lineHeight: 1.1 }}>FINTEX helps you earn long-term AI mining rewards. Certified</span>
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
            <h2 style={{ fontSize: '12px', color: '#ccc', margin: 0, fontWeight: 500 }}>FINTEX AI Total Assets</h2>
            <div style={{ color: '#f5d98b', fontSize: '20px', fontWeight: 'bold', textShadow: '0 2px 10px rgba(212,175,55,0.4)' }}>
              ${totalAssets.toFixed(2)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>AI Mining Wallet</span>
            <span style={{ fontWeight: 600, color: '#fff' }}>${miningWallet.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Investment Wallet</span>
            <span style={{ fontWeight: 600, color: '#fff' }}>${investmentWallet.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '6px 0 0 0', paddingTop: '2px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Profit Wallet</span>
            <span style={{ fontWeight: 700, color: 'var(--success)' }}>${profitWallet.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* GRID CARD */}
      <div style={{ background: 'var(--bg-panel)', borderRadius: '12px', padding: '16px 12px', border: '1px solid var(--border)', marginBottom: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 8px' }}>
          {[
            { icon: <ArrowDownToLine size={18} color="var(--primary)" />, label: 'Recharge', path: '/wallet' },
            { icon: <Send size={18} color="var(--primary)" />, label: 'Withdraw', path: '/withdraw' },
            { icon: <Crown size={18} color="var(--warning)" />, label: 'VIP Bots', path: '/vip' },
            { icon: <Gift size={18} color="#f472b6" />, label: 'Event', path: '/event' },
            { icon: <ShieldCheck size={18} color="var(--text-muted)" />, label: 'Security', path: '/security' },
            { icon: <UserPlus size={18} color="var(--success)" />, label: 'Invite', path: '/affiliate' },
            { icon: <Building size={18} color="var(--text-muted)" />, label: 'About', path: '/about' },
            { icon: <Bot size={18} color="var(--primary)" />, label: 'My Bots', path: '/my-bots' },
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

      {/* INVESTMENT */}
      <div 
        onClick={() => navigate('/trading')}
        style={{ background: 'var(--bg-panel)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}
        className="hover:border-primary"
      >
        <div>
          <strong style={{ fontSize: '12px', display: 'block', marginBottom: '2px', color: 'var(--text-primary)' }}>Investment Products</strong>
          <small style={{ color: 'var(--success)', fontSize: '10px' }}>Earn income immediately</small>
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
        © {new Date().getFullYear()} FINTEX. All rights reserved.
      </footer>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
      
    </motion.div>
  );
};
