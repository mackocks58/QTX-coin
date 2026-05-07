import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus } from 'lucide-react';

// Floating coin particle
const CoinParticle = ({ delay, angle, distance }) => (
  <motion.div
    initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
    animate={{
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 60,
      opacity: [1, 1, 0],
      scale: [0, 1.2, 0.8],
      rotate: [0, 360],
    }}
    transition={{ duration: 1.4, delay, ease: 'easeOut' }}
    style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, #ffe066, #d4af37, #b8860b)',
      border: '2px solid #ffe066',
      boxShadow: '0 0 10px rgba(212,175,55,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: 900,
      color: '#7a5a00',
      zIndex: 10,
      pointerEvents: 'none',
    }}
  >
    $
  </motion.div>
);

// Flying $1000 label
const MoneyBurst = ({ delay, x, y }) => (
  <motion.div
    initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
    animate={{
      x,
      y,
      opacity: [0, 1, 1, 0],
      scale: [0.5, 1.3, 1, 0.8],
    }}
    transition={{ duration: 1.8, delay, ease: 'easeOut' }}
    style={{
      position: 'absolute',
      top: '30%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '22px',
      fontWeight: 900,
      color: '#ffe066',
      textShadow: '0 0 12px rgba(212,175,55,0.9), 0 2px 4px rgba(0,0,0,0.6)',
      zIndex: 20,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }}
  >
    +$1,000
  </motion.div>
);

const COIN_ANGLES = Array.from({ length: 12 }, (_, i) => (i * Math.PI * 2) / 12);
const MONEY_BURSTS = [
  { x: -90, y: -100 },
  { x: 80,  y: -120 },
  { x: -40, y: -140 },
  { x: 60,  y: -80  },
];

export const SpinPromoPopup = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [burst, setBurst] = useState(false);

  // Show popup on every mount (every page load to Dashboard)
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleIconClick = () => {
    setBoxOpen(true);
    setTimeout(() => setBurst(true), 400);
  };

  const handleClose = () => {
    setShow(false);
    setBoxOpen(false);
    setBurst(false);
  };

  const handleInvite = () => {
    handleClose();
    navigate('/affiliate');
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(5px)',
              zIndex: 200,
            }}
          />

          {/* Main popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 60 }}
            transition={{ type: 'spring', damping: 14, stiffness: 160 }}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              x: '-50%', y: '-50%',
              zIndex: 201,
              width: 'min(88vw, 360px)',
              background: 'linear-gradient(160deg, #0f1b14 0%, #0a1628 100%)',
              border: '1px solid rgba(212,175,55,0.5)',
              borderRadius: '24px',
              overflow: 'visible',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(212,175,55,0.15)',
              padding: '28px 24px 24px',
              textAlign: 'center',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                background: 'rgba(255,255,255,0.08)', border: 'none',
                borderRadius: '50%', width: '28px', height: '28px',
                color: '#aaa', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <X size={14} />
            </button>

            {/* ── CLOSED STATE: spin icon ── */}
            <AnimatePresence mode="wait">
              {!boxOpen ? (
                <motion.div
                  key="icon"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={handleIconClick}
                >
                  {/* Pulsing glow ring */}
                  <motion.div
                    animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.2, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute', inset: '-12px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(212,175,55,0.3) 0%, transparent 70%)',
                    }}
                  />

                  <motion.img
                    src="/images/spin_icon.png"
                    alt="Lucky Spin"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                    style={{
                      width: '110px', height: '110px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.7))',
                      display: 'block', margin: '0 auto',
                    }}
                  />

                  <motion.p
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '13px', marginTop: '10px' }}
                  >
                    Tap to open! 🎁
                  </motion.p>
                </motion.div>
              ) : (
                /* ── OPEN STATE: treasure box burst ── */
                <motion.div
                  key="box"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ position: 'relative', minHeight: '160px' }}
                >
                  {/* Box lid flying up */}
                  <motion.div
                    initial={{ y: 0, rotate: 0, opacity: 1 }}
                    animate={{ y: -90, rotate: -25, opacity: 0 }}
                    transition={{ duration: 0.6, ease: 'backOut' }}
                    style={{
                      width: '80px', height: '30px',
                      background: 'linear-gradient(135deg, #d4af37, #f0c040)',
                      borderRadius: '8px 8px 0 0',
                      margin: '0 auto',
                      boxShadow: '0 -4px 20px rgba(212,175,55,0.5)',
                      position: 'relative', zIndex: 5,
                    }}
                  />
                  {/* Box body */}
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring' }}
                    style={{
                      width: '80px', height: '60px',
                      background: 'linear-gradient(180deg, #c49a28, #8b6914)',
                      borderRadius: '0 0 10px 10px',
                      margin: '-4px auto 0',
                      boxShadow: '0 8px 30px rgba(212,175,55,0.4)',
                      position: 'relative', zIndex: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '28px',
                    }}
                  >
                    🎁
                  </motion.div>

                  {/* Gold shine burst */}
                  {burst && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 4, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      style={{
                        position: 'absolute', top: '20px', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: '60px', height: '60px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,224,102,0.8) 0%, transparent 70%)',
                        zIndex: 6,
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* Coin particles */}
                  {burst && COIN_ANGLES.map((angle, i) => (
                    <CoinParticle
                      key={i}
                      angle={angle}
                      distance={80 + Math.random() * 50}
                      delay={i * 0.05}
                    />
                  ))}

                  {/* $1000 money bursts */}
                  {burst && MONEY_BURSTS.map((pos, i) => (
                    <MoneyBurst key={i} x={pos.x} y={pos.y} delay={0.3 + i * 0.2} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ marginTop: boxOpen ? '16px' : '16px' }}
            >
              <h3 style={{
                margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800,
                background: 'linear-gradient(135deg, #ffe066, #d4af37)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                🎉 Get More Rewards!
              </h3>
              <p style={{
                color: 'var(--text-secondary)', fontSize: '13px',
                lineHeight: 1.6, margin: '0 0 20px 0',
              }}>
                Invite friends and unlock <strong style={{ color: '#ffe066' }}>exclusive bonuses</strong>!
                Earn <strong style={{ color: 'var(--success)' }}>10% commission</strong> every time
                a friend you invite makes a deposit.
              </p>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleInvite}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #d4af37, #f0c040)',
                  color: '#000', fontWeight: 800, fontSize: '15px',
                  border: 'none', borderRadius: '50px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px',
                }}
              >
                <UserPlus size={18} />
                Invite Friends Now
              </motion.button>

              <button
                onClick={handleClose}
                style={{
                  marginTop: '10px', background: 'transparent',
                  border: 'none', color: 'var(--text-muted)',
                  fontSize: '12px', cursor: 'pointer', width: '100%',
                }}
              >
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
