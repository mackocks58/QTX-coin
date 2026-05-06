import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Copy, Users, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const Affiliate = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [totalEarned, setTotalEarned] = useState(0);
  const [referralsCount, setReferralsCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  const referralLink = `${window.location.origin}/login?ref=${referralCode}`;

  useEffect(() => {
    if (!currentUser) return;
    
    // Fetch or generate referral code for this user
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
    
    // Listen to affiliate rewards in transactions
    const qRewards = query(collection(db, 'users', currentUser.uid, 'transactions'), where('type', '==', 'affiliate_reward'));
    const unsubRewards = onSnapshot(qRewards, (snapshot) => {
      let earned = 0;
      snapshot.forEach(doc => {
        earned += doc.data().amount || 0;
      });
      setTotalEarned(earned);
      setReferralsCount(snapshot.size); // Each reward = 1 successful referral
    });
    
    return unsubRewards;
  }, [currentUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
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
        <h2 className="mb-0">Affiliate Program</h2>
      </div>
      
      <div className="panel mb-4 text-center">
        <Users size={48} color="var(--primary)" style={{ margin: '0 auto 16px', display: 'block' }} />
        <h3 className="mb-2">Invite & Earn 30%</h3>
        <p className="text-muted mb-4">
          Share your unique link below. When a friend signs up and makes their first deposit, you will automatically receive 30% of their deposit amount directly to your balance!
        </p>
        
        <div style={{ background: 'var(--bg-dark)', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.85rem', wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--text-primary)', textAlign: 'left' }}>
            {referralCode ? referralLink : 'Generating link...'}
          </span>
          <button onClick={handleCopy} disabled={!referralCode} style={{ color: 'var(--primary)', padding: '8px', background: 'var(--primary-glow)', borderRadius: 'var(--radius-sm)', border: 'none', cursor: referralCode ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>Total Earned</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
            ${totalEarned.toFixed(2)}
          </div>
        </div>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>Active Referrals</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
            {referralsCount}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
