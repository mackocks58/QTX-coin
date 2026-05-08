import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Copy, Users, CheckCircle2, ChevronLeft, Trophy, TrendingUp, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const TIERS = [
  { level: 1, label: 'Direct Referral', pct: 10, color: 'var(--warning)', bg: 'rgba(212,175,55,0.1)', icon: Trophy },
  { level: 2, label: 'Level 2 Network', pct: 3,  color: 'var(--primary)', bg: 'rgba(16,185,129,0.1)', icon: TrendingUp },
  { level: 3, label: 'Level 3 Network', pct: 1,  color: '#a855f7',        bg: 'rgba(168,85,247,0.1)', icon: Gift },
];

export const Affiliate = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [totalEarned, setTotalEarned] = useState(0);
  const [referralsCount, setReferralsCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [earningsByTier, setEarningsByTier] = useState({ 1: 0, 2: 0, 3: 0 });
  const referralLink = `https://fintex-company.vercel.app/login?ref=${referralCode}`;
  useEffect(() => {
    if (!currentUser) return;

    const fetchReferralCode = async () => {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        let code = userDoc.data().referralCode;
        if (!code) {
          code = Math.random().toString(36).substring(2, 8).toUpperCase();
          await updateDoc(userDocRef, { referralCode: code });
        }
        setReferralCode(code);
      }
    };
    fetchReferralCode();

    // Listen to affiliate rewards
    const qRewards = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      where('type', '==', 'affiliate_reward')
    );
    const unsubRewards = onSnapshot(qRewards, (snapshot) => {
      let earned = 0;
      const byTier = { 1: 0, 2: 0, 3: 0 };
      snapshot.forEach(d => {
        const data = d.data();
        earned += data.amount || 0;
        if (data.title?.includes('Level 1')) byTier[1] += data.amount || 0;
        else if (data.title?.includes('Level 2')) byTier[2] += data.amount || 0;
        else if (data.title?.includes('Level 3')) byTier[3] += data.amount || 0;
      });
      setTotalEarned(earned);
      setEarningsByTier(byTier);
      setReferralsCount(snapshot.size);
    });

    return unsubRewards;
  }, [currentUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(t('successLinkCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '16px', paddingBottom: '80px' }}
    >
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{t('affiliateTitle')}</h2>
      </div>

      {/* HERO CARD */}
      <div style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(16,185,129,0.08))', borderRadius: '20px', padding: '24px 20px', border: '1px solid rgba(212,175,55,0.3)', marginBottom: '20px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
        <Users size={48} color="var(--warning)" style={{ margin: '0 auto 12px', display: 'block' }} />
        <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 800, color: 'var(--warning)' }}>{t('inviteEarn')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 20px 0', lineHeight: 1.6 }}>
          {t('affiliateDesc')}
        </p>

        {/* Referral Link */}
        <div style={{ background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', gap: '8px' }}>
          <span style={{ fontSize: '11px', wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--text-secondary)', textAlign: 'left', flex: 1 }}>
            {referralCode ? referralLink : t('generatingLink')}
          </span>
          <button
            onClick={handleCopy}
            disabled={!referralCode}
            style={{ color: copied ? 'var(--success)' : 'var(--warning)', padding: '8px', background: 'rgba(212,175,55,0.1)', borderRadius: '8px', border: '1px solid rgba(212,175,55,0.2)', cursor: referralCode ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>


      {/* STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--bg-panel)', borderRadius: '14px', padding: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: 'var(--text-muted)' }}>{t('totalEarned')}</p>
          <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>${totalEarned.toFixed(2)}</p>
        </div>
        <div style={{ background: 'var(--bg-panel)', borderRadius: '14px', padding: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: 'var(--text-muted)' }}>{t('commissions')}</p>
          <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>{referralsCount}</p>
        </div>
      </div>

      {/* 3-TIER BREAKDOWN */}
      <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{t('commissionStructure')}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          return (
            <motion.div
              key={tier.level}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: tier.level * 0.08 }}
              style={{ background: 'var(--bg-panel)', borderRadius: '14px', padding: '16px', border: `1px solid ${tier.color}30`, display: 'flex', alignItems: 'center', gap: '14px' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: tier.bg, border: `1px solid ${tier.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={tier.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Level {tier.level} – {tier.label}</span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: tier.color }}>{tier.pct}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t('perDepositApproved')}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>${earningsByTier[tier.level].toFixed(2)} {t('earned')}</span>
                </div>

                {/* progress bar */}
                <div style={{ marginTop: '8px', height: '3px', background: 'var(--bg-dark)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (earningsByTier[tier.level] / Math.max(totalEarned, 1)) * 100)}%`, background: tier.color, borderRadius: '2px', transition: 'width 1s ease' }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* HOW IT WORKS */}
      <div style={{ background: 'var(--bg-panel)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700 }}>{t('howItWorks')}</h4>
        {[
          { step: '1', text: t('affiliateStep1') },
          { step: '2', text: t('affiliateStep2') },
          { step: '3', text: t('affiliateStep3') },
          { step: '4', text: t('affiliateStep4') },
          { step: '5', text: t('affiliateStep5') },
        ].map((item) => (
          <div key={item.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, color: 'var(--warning)' }}>
              {item.step}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</p>
          </div>
        ))}
      </div>

      {/* REFERRAL CHAIN DIAGRAM */}
      <div style={{ marginTop: '20px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(212,175,55,0.3)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
        <img src="/images/referral_chain.png" alt="3-Tier Referral Commission Chain" style={{ width: '100%', display: 'block' }} />
      </div>
    </motion.div>
  );
};
