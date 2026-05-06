import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Crown, Clock, TrendingUp, AlertTriangle, Activity, CheckCircle2, BadgeCheck, ChevronLeft, Zap, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

/* ─── Tier colour palette ─── */
const TIER_COLORS = {
  'VIP 1':  { from: '#667eea', to: '#764ba2' },
  'VIP 2':  { from: '#f093fb', to: '#f5576c' },
  'VIP 3':  { from: '#4facfe', to: '#00f2fe' },
  'VIP 4':  { from: '#43e97b', to: '#38f9d7' },
  'VIP 5':  { from: '#fa709a', to: '#fee140' },
  'VIP 6':  { from: '#a18cd1', to: '#fbc2eb' },
  'VIP 7':  { from: '#ffecd2', to: '#fcb69f' },
  'VIP 8':  { from: '#ff9a9e', to: '#fad0c4' },
  'VIP 9':  { from: '#a1c4fd', to: '#c2e9fb' },
  'VIP 10': { from: '#d4fc79', to: '#96e6a1' },
  'VIP 11': { from: '#d4af37', to: '#f5d98b' },
  'VIP 12': { from: '#d4af37', to: '#fff8e7' },
};

/* ─── VIP Badge chip ─── */
const VipBadge = ({ level }) => {
  const c = TIER_COLORS[level] || { from: '#d4af37', to: '#fff8e7' };
  return (
    <span style={{
      background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
      color: '#000',
      fontSize: '9px',
      fontWeight: 800,
      padding: '2px 8px',
      borderRadius: '20px',
      letterSpacing: '0.5px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      boxShadow: `0 2px 8px ${c.from}66`,
    }}>
      <Crown size={8} /> {level}
    </span>
  );
};

/* ─── Active bot card ─── */
const ActiveBotCard = ({ bot }) => {
  const [timeLeft, setTimeLeft] = useState('00:00:00');
  
  const activatedTime = new Date(bot.activatedAt).getTime();
  const msInDay = 1000 * 60 * 60 * 24;
  
  const lastPayout = bot.lastPayoutAt ? new Date(bot.lastPayoutAt).getTime() : activatedTime;
  const nextPayout = lastPayout + msInDay;

  useEffect(() => {
    const interval = setInterval(() => {
      const nowTs = Date.now();
      const diff = nextPayout - nowTs;
      
      if (diff <= 0) {
        setTimeLeft('00:00:00');
      } else {
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(
          `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextPayout]);

  const now = Date.now();
  
  // Calculate days active
  let daysActive = Math.floor((now - activatedTime) / msInDay);
  if (daysActive < 0) daysActive = 0;
  
  const totalDays = 365;
  let daysLeft = totalDays - daysActive;
  if (daysLeft < 0) daysLeft = 0;
  
  const progressPercent = Math.min((daysActive / totalDays) * 100, 100);
  const isExpired = daysLeft === 0;

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: `1px solid ${isExpired ? 'var(--danger)' : 'var(--primary-glow)'}`,
      borderRadius: '14px',
      overflow: 'hidden',
      marginBottom: '14px',
      opacity: isExpired ? 0.8 : 1
    }}>
      <div style={{ position: 'relative', height: '80px' }}>
        <img src={bot.image} alt={bot.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isExpired ? 'grayscale(100%)' : 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-panel) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '10px', left: '12px' }}><VipBadge level={bot.vipLevel || 'VIP 1'} /></div>
        <div style={{ position: 'absolute', top: '10px', right: '12px', background: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${isExpired ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'}`, borderRadius: '20px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {!isExpired && <Activity size={9} color="var(--success)" className="animate-pulse" />}
          <span style={{ fontSize: '9px', color: isExpired ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
            {isExpired ? 'EXPIRED' : 'RUNNING'}
          </span>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Bot size={14} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '14px' }}>{bot.name}</span>
          <BadgeCheck size={14} color="var(--primary)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {[
            { label: 'Invested', value: `$${parseFloat(bot.userAmount || bot.price || 0).toLocaleString()}`, color: '#fff' },
            { label: 'Daily Income', value: `${bot.dailyPercent || bot.returnRange || 0}%`, color: 'var(--success)' },
            { label: 'Est. Daily Profit', value: `$${((parseFloat(bot.userAmount || bot.price || 0) * parseFloat(bot.dailyPercent || parseInt(bot.returnRange) || 0)) / 100).toFixed(2)}`, color: 'var(--success)' },
            { label: 'Operation Time', value: '24 Hours', color: 'var(--text-primary)' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--bg-dark)', padding: '8px 10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '2px' }}>{item.label}</div>
              <strong style={{ fontSize: '12px', color: item.color }}>{item.value}</strong>
            </div>
          ))}
        </div>

        {/* 365 Days Lifecycle Progress Bar */}
        <div style={{ marginBottom: '12px', background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={10} color="var(--primary)" />
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>Bot Lifecycle (365 Days)</span>
            </div>
            <span style={{ fontSize: '10px', color: isExpired ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
              {daysLeft} Days Left
            </span>
          </div>
          
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-panel)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ 
              width: `${progressPercent}%`, 
              height: '100%', 
              background: isExpired ? 'var(--danger)' : 'linear-gradient(90deg, var(--primary), #f5d98b)',
              borderRadius: '4px',
              transition: 'width 0.5s ease-out'
            }} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Day {daysActive}</span>
            <span style={{ fontSize: '9px', color: 'var(--text-primary)', fontWeight: 600 }}>{progressPercent.toFixed(1)}%</span>
          </div>
        </div>

        <div style={{ background: isExpired ? 'rgba(239,68,68,0.08)' : 'rgba(212,175,55,0.08)', border: `1px dashed ${isExpired ? 'var(--danger)' : 'var(--primary)'}`, borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isExpired ? <AlertTriangle size={14} color="var(--danger)" /> : <CheckCircle2 size={14} color="var(--primary)" />}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '11px', color: isExpired ? 'var(--danger)' : 'var(--primary)', fontWeight: 600 }}>
              {isExpired ? 'Bot Contract Expired' : 'Trading Automatically…'}
            </p>
            <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>
              {isExpired ? 'This bot has completed its 365-day cycle.' : 'Profits credited to your wallet'}
            </p>
          </div>
          {!isExpired && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block' }}>Next Payout</span>
              <strong style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'monospace' }}>{timeLeft}</strong>
            </div>
          )}
        </div>

        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
          Activated: {new Date(bot.activatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export const MyBots = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const activatedBots = userData?.activatedBots || [];
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'users', currentUser.uid, 'transactions'),
          where('type', '==', 'bot_profit')
        );
        const snap = await getDocs(q);
        const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        records.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        setHistory(records);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [currentUser]);

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '16px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={22} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', margin: 0 }}>My Activated Bots</h2>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {activatedBots.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
            <Bot size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p>You haven't activated any bots yet.</p>
          </div>
        ) : (
          activatedBots.map((bot, index) => <ActiveBotCard key={bot.activationId || index} bot={bot} />)
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <History size={16} color="var(--primary)" />
          AI Mining History
        </h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading history...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>No mining payouts yet.</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--text-secondary)' }}>Profits are credited exactly 24 hours after activation.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map(record => (
              <div key={record.id} style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={16} color="var(--success)" />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '13px' }}>Mining Profit</h4>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {record.createdAt?.toDate ? record.createdAt.toDate().toLocaleString() : new Date().toLocaleString()}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block', fontSize: '14px', color: 'var(--success)' }}>
                    +${parseFloat(record.amount || 0).toFixed(2)}
                  </strong>
                  <span style={{ fontSize: '9px', color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '10px' }}>Success</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .animate-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
    </motion.div>
  );
};
