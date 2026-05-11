import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Bot, Crown, Zap, Clock, TrendingUp, X, AlertTriangle,
  ShieldCheck, Activity, CheckCircle2, BadgeCheck, Info, ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VIP_BOTS } from '../data/bots';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';
import { scheduleBotNotifications } from '../services/botNotifications';
import { useCurrency } from '../hooks/useCurrency';

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
  const { t } = useLanguage();
  const { formatCurrency, convertAndFormatCurrency } = useCurrency();
  const activatedTime = new Date(bot.activatedAt).getTime();
  const now = Date.now();
  const msInDay = 1000 * 60 * 60 * 24;
  
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
      <div style={{ position: 'relative', height: '80px', overflow: 'hidden', borderRadius: '13px 13px 0 0', boxShadow: !isExpired ? '0 4px 20px rgba(16, 185, 129, 0.6)' : 'none' }}>
        {!isExpired && (
          <div style={{
            position: 'absolute',
            top: '-50%', left: '-50%', width: '200%', height: '200%',
            background: 'conic-gradient(from 0deg, transparent 0 160deg, rgba(16,185,129,0.4) 220deg, #10b981 310deg, #059669 360deg)',
            animation: 'spin 2s linear infinite',
            zIndex: 0
          }} />
        )}
        <div style={{ position: 'absolute', inset: isExpired ? '0' : '4px', background: 'var(--bg-panel)', borderRadius: isExpired ? '0' : '9px 9px 0 0', overflow: 'hidden', zIndex: 1 }}>
          <img src={bot.image} alt={bot.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isExpired ? 'grayscale(100%)' : 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-panel) 0%, transparent 70%)' }} />
        </div>
        <div style={{ position: 'absolute', top: '10px', left: '12px', zIndex: 2 }}><VipBadge level={bot.vipLevel} /></div>
        <div style={{ position: 'absolute', top: '10px', right: '12px', background: isExpired ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', border: `1px solid ${isExpired ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'}`, borderRadius: '20px', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 2 }}>
          {!isExpired && <Activity size={9} color="var(--success)" style={{ animation: 'pulse 2s infinite' }} />}
          <span style={{ fontSize: '9px', color: isExpired ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
            {isExpired ? 'EXPIRED' : t('running').toUpperCase()}
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
            { label: t('invested'), value: formatCurrency(bot.userAmount || 0), color: '#fff' },
            { label: t('dailyIncome'), value: `${bot.dailyPercent}%`, color: 'var(--success)' },
            { label: t('estDailyProfit'), value: formatCurrency((parseFloat(bot.userAmount || 0) * bot.dailyPercent) / 100), color: 'var(--success)' },
            { label: t('operationTime'), value: t('hours24'), color: 'var(--text-primary)' },
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
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('botLifecycle')}</span>
            </div>
            <span style={{ fontSize: '10px', color: isExpired ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>
              {daysLeft} {t('daysLeft')}
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
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{t('day')} {daysActive}</span>
            <span style={{ fontSize: '9px', color: 'var(--text-primary)', fontWeight: 600 }}>{progressPercent.toFixed(1)}%</span>
          </div>
        </div>

        <div style={{ background: isExpired ? 'rgba(239,68,68,0.08)' : 'rgba(212,175,55,0.08)', border: `1px dashed ${isExpired ? 'var(--danger)' : 'var(--primary)'}`, borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isExpired ? <AlertTriangle size={14} color="var(--danger)" /> : <CheckCircle2 size={14} color="var(--primary)" />}
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: isExpired ? 'var(--danger)' : 'var(--primary)', fontWeight: 600 }}>
              {isExpired ? t('botExpired') : t('tradingAutomatically')}
            </p>
            <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>
              {isExpired ? t('botExpiredDesc') : t('profitsCredited')}
            </p>
          </div>
        </div>

        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right' }}>
          {t('activated')} {new Date(bot.activatedAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

/* ─── Bot marketplace card ─── */
const BotCard = ({ bot, onSelect }) => {
  const { t } = useLanguage();
  const { formatCurrency, convertAndFormatCurrency } = useCurrency();
  const c = TIER_COLORS[bot.vipLevel] || { from: '#d4af37', to: '#f5d98b' };
  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'transform 0.2s, border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Image with gradient overlay */}
      <div style={{ position: 'relative', height: '150px' }}>
        <img src={bot.image} alt={bot.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-panel) 0%, transparent 60%)' }} />
        
        {/* VIP badge top‑left */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          <VipBadge level={bot.vipLevel} />
        </div>

        {/* Verified badge top‑right */}
        <div style={{ position: 'absolute', top: '10px', right: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '20px', padding: '2px 8px' }}>
          <ShieldCheck size={10} color="var(--success)" />
          <span style={{ fontSize: '9px', color: 'var(--success)', fontWeight: 700 }}>VERIFIED</span>
        </div>

        {/* Bot name */}
        <div style={{ position: 'absolute', bottom: '12px', left: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: `linear-gradient(135deg, ${c.from}33, ${c.to}33)`, backdropFilter: 'blur(6px)', padding: '6px', borderRadius: '8px', border: `1px solid ${c.from}66` }}>
            <Bot size={16} color={c.from} />
          </div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>{bot.name}</h3>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div style={{ background: 'var(--bg-dark)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <Zap size={11} color="var(--text-muted)" />
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('investmentRange')}</span>
            </div>
            <strong style={{ fontSize: '12px', color: '#fff' }}>
              {convertAndFormatCurrency(bot.minAmount)} – {convertAndFormatCurrency(bot.maxAmount)}
            </strong>
          </div>

          <div style={{ background: 'var(--bg-dark)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
              <TrendingUp size={11} color="var(--success)" />
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dailyIncome')}</span>
            </div>
            <strong style={{ fontSize: '14px', color: 'var(--success)' }}>{bot.dailyPercent}%</strong>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={11} color="var(--text-muted)" />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('contract')}: <strong style={{ color: 'var(--text-primary)' }}>{t('days365')}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Activity size={11} color="var(--text-muted)" />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{t('payouts')}: <strong style={{ color: 'var(--text-primary)' }}>{t('every24h')}</strong></span>
            </div>
          </div>
          <button
            onClick={() => onSelect(bot)}
            style={{
              background: 'linear-gradient(135deg, #d4af37, #f5d98b)',
              color: '#000',
              border: 'none',
              padding: '8px 22px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(212,175,55,0.4)',
            }}
          >
            {t('activate')}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Confirmation modal ─── */
const ConfirmModal = ({ bot, balance, onClose, onConfirm, loading }) => {
  const { t } = useLanguage();
  const { formatCurrency, convertAndFormatCurrency, symbol, rate } = useCurrency();
  const [amount, setAmount] = useState('');
  const parsed = parseFloat(amount) || 0;
  const dailyProfit = ((parsed * bot.dailyPercent) / 100).toFixed(2);
  const isValid = parsed >= bot.minAmount && parsed <= bot.maxAmount;

  const handleConfirm = () => {
    const localMinAmount = bot.minAmount * rate;
    const localMaxAmount = bot.maxAmount * rate;
    if (!isValid || parsed < localMinAmount || parsed > localMaxAmount) return toast.error(t('errInvalidAmount').replace('${min}', convertAndFormatCurrency(bot.minAmount)).replace('${max}', convertAndFormatCurrency(bot.maxAmount)));
    
    const userBalance = parseFloat(balance || 0);
    if (parsed > userBalance) return toast.error(t('errInsufficientBalance').replace('${bal}', formatCurrency(userBalance)));
    
    onConfirm(bot, parsed);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-panel)', borderRadius: '20px', maxWidth: '400px', width: '100%', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}
      >
        {/* Image header */}
        <div style={{ position: 'relative', height: '110px' }}>
          <img src={bot.image} alt={bot.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-panel) 0%, transparent 100%)' }} />
          <div style={{ position: 'absolute', top: '10px', left: '12px' }}><VipBadge level={bot.vipLevel} /></div>
          <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '12px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Bot size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '17px' }}>Activate {bot.name}</h3>
            <BadgeCheck size={16} color="var(--success)" />
          </div>

          {/* Amount input */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              {t('investmentAmount')}
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontWeight: 700, fontSize: '14px' }}>{symbol}</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`${bot.minAmount * rate} – ${bot.maxAmount * rate}`}
                style={{
                  width: '100%', padding: '12px 12px 12px 28px', borderRadius: '10px',
                  background: 'var(--bg-dark)', border: `1px solid ${isValid || !amount ? 'var(--border)' : '#ef4444'}`,
                  color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700, boxSizing: 'border-box'
                }}
              />
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '5px 0 0 0' }}>
              Range: {convertAndFormatCurrency(bot.minAmount)} – {convertAndFormatCurrency(bot.maxAmount)} • Your balance: <strong style={{ color: 'var(--primary)' }}>{formatCurrency(balance)}</strong>
            </p>
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--bg-dark)', borderRadius: '10px', padding: '14px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: t('botMarketplace').replace('🤖 ',''), value: bot.name },
              { label: t('dailyReturnRate'), value: `${bot.dailyPercent}%`, color: 'var(--success)' },
              { label: t('estDailyProfit'), value: parsed > 0 ? formatCurrency(dailyProfit) : '—', color: 'var(--success)' },
              { label: t('contractLifecycle'), value: t('days365') },
              { label: t('payoutCycle'), value: t('every24h') },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <strong style={{ color: row.color || '#fff' }}>{row.value}</strong>
              </div>
            ))}
            <div style={{ height: '1px', background: 'var(--border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{t('totalDeducted')}</span>
              <strong style={{ fontSize: '18px', color: '#fff' }}>{parsed > 0 ? formatCurrency(parsed) : '—'}</strong>
            </div>
          </div>

          {/* Warning */}
          <div style={{ display: 'flex', gap: '8px', padding: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', marginBottom: '18px' }}>
            <AlertTriangle size={15} color="var(--warning)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t('botExpiredDesc').replace('365-day','')}</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
              {t('cancelBtn')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !isValid || parsed > balance}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer',
                background: 'linear-gradient(135deg, #d4af37, #f5d98b)',
                color: '#000', border: 'none', fontSize: '13px',
                opacity: (loading || !isValid || parsed > balance) ? 0.55 : 1,
                boxShadow: '0 4px 15px rgba(212,175,55,0.4)',
              }}
            >
              {loading ? t('activating') : t('confirmAndPay')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* ─── Info modal ─── */
const InfoModal = ({ onClose }) => {
  const { t } = useLanguage();
  return (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 20 }}
      onClick={e => e.stopPropagation()}
      style={{ background: 'var(--bg-panel)', borderRadius: '20px', maxWidth: '450px', width: '100%', border: '1px solid var(--primary-glow)', overflow: 'hidden', boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}
    >
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(212,175,55,0.15)', padding: '8px', borderRadius: '12px' }}>
              <Info size={24} color="var(--primary)" />
            </div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>{t('howVipBotsWork')}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Crown size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>{t('botActivation')}</strong>
              {t('botActivationDesc')}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <Activity size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>{t('payouts24h')}</strong>
              {t('payouts24hDesc')}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <Clock size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>{t('lifecycle365')}</strong>
              {t('lifecycle365Desc')}
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #d4af37, #f5d98b)', color: '#000', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 15px rgba(212,175,55,0.4)' }}
        >
          {t('understood')}
        </button>
      </div>
      </motion.div>
    </div>
  );
};

/* ═══════════════ Main Page ═══════════════ */
export const VIP = () => {
  const { currentUser, balance, userData } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bots');   // 'bots' | 'mybots'
  const [selectedBot, setSelectedBot] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [activating, setActivating] = useState(false);
  const activatedBots = userData?.activatedBots || [];

  const handleConfirm = async (bot, userAmount) => {
    setActivating(true);
    const toastId = toast.loading(`Activating ${bot.name}…`);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) throw new Error('User document not found');

      const liveBalance = parseFloat(snap.data().balance || 0);
      if (liveBalance < userAmount) throw new Error('Insufficient balance (live check).');

      const currentBots = snap.data().activatedBots || [];
      const record = {
        ...bot,
        userAmount,
        activationId: Date.now().toString(),
        activatedAt: new Date().toISOString(),
        status: 'running',
      };

      const currentInvestment = snap.data().investmentBalance || 0;
      
      await updateDoc(userRef, {
        balance: liveBalance - userAmount,
        investmentBalance: currentInvestment + userAmount,
        activatedBots: [record, ...currentBots],
      });

      // Schedule local notifications for this specific bot's lifecycle
      scheduleBotNotifications(record, formatCurrency);

      toast.success(`${bot.name} ${t('botActivated')} 🤖`, { id: toastId });
      setSelectedBot(null);
      setActiveTab('mybots');
    } catch (err) {
      toast.error(err.message || t('activationFailed'), { id: toastId });
    } finally {
      setActivating(false);
    }
  };

  /* ── tab styles ── */
  const tabStyle = (tab) => ({
    flex: 1,
    padding: '11px',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.25s',
    background: activeTab === tab
      ? 'linear-gradient(135deg, #d4af37, #f5d98b)'
      : 'transparent',
    color: activeTab === tab ? '#000' : 'var(--text-muted)',
    boxShadow: activeTab === tab ? '0 4px 12px rgba(212,175,55,0.35)' : 'none',
  });

  return (
    <motion.div
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '16px' }}
    >
      {/* Page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Crown size={22} color="var(--warning)" />
          <h2 style={{ fontSize: '18px', margin: 0 }}>{t('vipTitle')}</h2>
        </div>
      </div>

      {/* ── Golden tab switcher ── */}
      <div style={{ display: 'flex', background: 'var(--bg-dark)', padding: '4px', borderRadius: '14px', marginBottom: '20px', border: '1px solid rgba(212,175,55,0.25)', gap: '4px' }}>
        <button style={tabStyle('bots')}   onClick={() => setActiveTab('bots')}>
          {t('botMarketplace')}
        </button>
        <button style={tabStyle('mybots')} onClick={() => setActiveTab('mybots')}>
          {t('myActiveBots')} {activatedBots.length > 0 && `(${activatedBots.length})`}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Marketplace tab ── */}
        {activeTab === 'bots' && (
          <motion.div key="bots" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, flex: 1 }}>
                {t('chooseBot')}
              </p>
              <button 
                onClick={() => setShowInfo(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--primary)', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, marginLeft: '12px' }}
              >
                <Info size={14} /> {t('howItWorksBtn')}
              </button>
            </div>
            {VIP_BOTS.map(bot => (
              <BotCard key={bot.id} bot={bot} onSelect={setSelectedBot} />
            ))}
          </motion.div>
        )}

        {/* ── My Bots tab ── */}
        {activeTab === 'mybots' && (
          <motion.div key="mybots" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            {activatedBots.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
                <Bot size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>{t('noBotsYet')}</p>
                <button onClick={() => setActiveTab('bots')} style={{ background: 'linear-gradient(135deg, #d4af37, #f5d98b)', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '20px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
                  {t('browseBots')}
                </button>
              </div>
            ) : (
              activatedBots.map((bot, i) => <ActiveBotCard key={bot.activationId || i} bot={bot} />)
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBot && (
          <ConfirmModal
            bot={selectedBot}
            balance={balance || 0}
            loading={activating}
            onClose={() => setSelectedBot(null)}
            onConfirm={handleConfirm}
          />
        )}
        
        {showInfo && (
          <InfoModal onClose={() => setShowInfo(false)} />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
};
