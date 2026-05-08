import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Gift, Coins, Sparkles, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, collection, addDoc, increment } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';

export const Spin = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  
  // To avoid rapid clicks
  const spinTimeoutRef = useRef(null);

  const chances = userData?.spinChances || 0;

  const handleSpin = async () => {
    if (chances <= 0) {
      setShowInsufficientModal(true);
      return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setShowReward(false);

    try {
      // 1. Deduct chance immediately in DB so they can't double-click exploit
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { spinChances: increment(-1) });

      // 2. Calculate actual reward (Between $10 and $100, which is 1%-10% of 1000)
      const actualReward = Math.floor(Math.random() * (100 - 10 + 1)) + 10;
      setRewardAmount(actualReward);

      // 3. Visual Spin Logic (5 full rotations + random angle to land on a segment)
      // Since it's a generic wheel image, we just stop at a random angle.
      const randomExtraAngle = Math.floor(Math.random() * 360);
      const newRotation = rotation + 360 * 5 + randomExtraAngle;
      setRotation(newRotation);

      // 4. Wait for animation to finish (5 seconds)
      spinTimeoutRef.current = setTimeout(async () => {
        // Credit the user
        await updateDoc(userRef, { balance: increment(actualReward) });
        
        // Add transaction record
        await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
          type: 'bonus',
          title: 'Lucky Spin Reward',
          amount: actualReward,
          status: 'SUCCESS',
          createdAt: new Date().toISOString()
        });

        setIsSpinning(false);
        setShowReward(true);
        toast.success(t('successSpinWon').replace('${amount}', actualReward));
      }, 5000); // 5s matches CSS transition

    } catch (error) {
      console.error(error);
      toast.error(t('errSpinFailed'));
      setIsSpinning(false);
    }
  };

  // Cleanup timeout
  React.useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: '0', background: 'var(--bg-dark)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* HEADER */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} /> Lucky Spin
        </h2>
      </div>

      <div style={{ padding: '24px 16px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* INFO CARD */}
        <div style={{ background: 'var(--bg-panel)', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('availableSpins')}</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={24} /> {chances}
            </h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--text-muted)' }}>Deposit $1000+</p>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--success)' }}>To earn chances</p>
          </div>
        </div>

        {/* WHEEL CONTAINER */}
        <div style={{ position: 'relative', width: '300px', height: '300px', margin: '0 auto', filter: 'drop-shadow(0 0 30px rgba(212,175,55,0.2))' }}>
          
          {/* POINTER */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            width: '40px',
            height: '50px',
            background: 'linear-gradient(to bottom, #ff3b30, #990000)',
            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
          }}></div>

          {/* THE WHEEL */}
          <div 
            style={{ 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%',
              overflow: 'hidden',
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)',
              background: 'var(--bg-panel)',
              border: '4px solid var(--warning)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
            }}
          >
            {/* The actual generated 3D wheel image */}
            <img src="/images/wheel_base.png" alt="Lucky Wheel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            
            {/* Overlay fake text labels if needed, or just let the raw image shine */}
            <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: '20px', zIndex: 5 }}>$5000</div>
            <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%) rotate(180deg)', color: '#fff', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: '20px', zIndex: 5 }}>$1000</div>
            <div style={{ position: 'absolute', top: '50%', left: '15%', transform: 'translateY(-50%) rotate(-90deg)', color: '#fff', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: '20px', zIndex: 5 }}>$10000</div>
            <div style={{ position: 'absolute', top: '50%', right: '15%', transform: 'translateY(-50%) rotate(90deg)', color: '#fff', fontWeight: 900, textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: '20px', zIndex: 5 }}>iPhone</div>
          </div>
        </div>

        {/* SPIN BUTTON */}
        <button
          onClick={handleSpin}
          disabled={isSpinning}
          className={`btn ${isSpinning ? '' : 'hover:scale-105'}`}
          style={{
            marginTop: '40px',
            width: '100%',
            maxWidth: '300px',
            padding: '16px',
            fontSize: '18px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            background: isSpinning ? 'var(--bg-panel)' : 'linear-gradient(90deg, #d4af37, #f5d98b, #d4af37)',
            color: isSpinning ? 'var(--text-muted)' : '#000',
            border: 'none',
            borderRadius: '50px',
            boxShadow: isSpinning ? 'none' : '0 10px 25px rgba(212,175,55,0.4)',
            cursor: isSpinning ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          {isSpinning ? t('spinning') : t('spinNow')}
        </button>

        {/* REWARD POPUP */}
        <AnimatePresence>
          {showReward && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-30%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.5, x: '-50%', y: '-30%' }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                background: 'linear-gradient(135deg, rgba(20,20,20,0.95), rgba(40,40,40,0.95))',
                border: '1px solid var(--warning)',
                padding: '32px',
                borderRadius: '24px',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(212,175,55,0.3)',
                zIndex: 100,
                width: '85%',
                maxWidth: '350px',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{ width: '80px', height: '80px', background: 'rgba(212,175,55,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid var(--warning)' }}>
                <Coins size={40} color="var(--warning)" />
              </div>
              <h2 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '28px' }}>{t('youWon')}</h2>
              <p style={{ fontSize: '42px', fontWeight: 900, color: 'var(--success)', margin: '0 0 24px 0', textShadow: '0 2px 10px rgba(16,185,129,0.3)' }}>
                ${rewardAmount}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
                {t('bonusCredited')}
              </p>
              <button 
                onClick={() => setShowReward(false)}
                style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: '50px', fontSize: '16px', fontWeight: 600, width: '100%', cursor: 'pointer' }}
              >
                {t('awesome')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* INSUFFICIENT CHANCES POPUP */}
        <AnimatePresence>
          {showInsufficientModal && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, x: '-50%', y: '-30%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.5, x: '-50%', y: '-30%' }}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border)',
                padding: '32px',
                borderRadius: '24px',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                zIndex: 100,
                width: '85%',
                maxWidth: '350px'
              }}
            >
              <div style={{ width: '60px', height: '60px', background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertCircle size={30} color="var(--danger)" />
              </div>
              <h2 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '22px' }}>{t('noSpinsLeft')}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                {t('noSpinsDesc')}
              </p>
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <button 
                  onClick={() => navigate('/wallet')}
                  style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, width: '100%', cursor: 'pointer' }}
                >
                  {t('depositNow')}
                </button>
                <button 
                  onClick={() => navigate('/affiliate')}
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, width: '100%', cursor: 'pointer' }}
                >
                  {t('inviteFriends')}
                </button>
                <button 
                  onClick={() => setShowInsufficientModal(false)}
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '8px', fontSize: '13px', width: '100%', cursor: 'pointer', marginTop: '4px' }}
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OVERLAY FOR POPUPS */}
        <AnimatePresence>
          {(showReward || showInsufficientModal) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99 }}
              onClick={() => { setShowReward(false); setShowInsufficientModal(false); }}
            />
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};
