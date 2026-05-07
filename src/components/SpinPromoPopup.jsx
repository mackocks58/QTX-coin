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

  // Show popup once per calendar day
  useEffect(() => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('spinPromoLastShown');
    if (lastShown === today) return; // already shown today
    const timer = setTimeout(() => {
      setShow(true);
      localStorage.setItem('spinPromoLastShown', today);
    }, 800);
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
            initial={{ opacity: 0, scale: 0.7, x: '-50%', y: '-30%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.7, x: '-50%', y: '-30%' }}
            transition={{ type: 'spring', damping: 14, stiffness: 160 }}
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
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
                      objectFit: 'cover',
                      borderRadius: '50%',
                      filter: 'drop-shadow(0 0 18px rgba(212,175,55,0.7))',
                      display: 'block', margin: '0 auto',
                    }}
                  />

                  <motion.p
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '13px', marginTop: '10px' }}
                  >
                    Get Reward 🎁
                  </motion.p>
                </motion.div>
              ) : (
                /* ── OPEN STATE: real box image split & burst ── */
                <motion.div
                  key="box"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    position: 'relative',
                    width: '130px',
                    height: '220px',
                    margin: '0 auto',
                  }}
                >
                  {/* ── BOTTOM HALF — anchored, stays put ── */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 220 }}
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: 0,
                      width: '130px',
                      height: '65px',
                      overflow: 'hidden',
                      borderRadius: '0 0 12px 12px',
                      zIndex: 4,
                      boxShadow: '0 10px 28px rgba(212,175,55,0.45)',
                    }}
                  >
                    <img
                      src="/images/spin_icon.png"
                      alt="box base"
                      style={{
                        width: '130px',
                        height: '130px',
                        objectFit: 'cover',
                        objectPosition: 'bottom',
                        display: 'block',
                        marginTop: '-65px',
                      }}
                    />
                  </motion.div>

                  {/* ── TOP HALF — lifts up, stays visible, hovers & floats ── */}
                  <motion.div
                    initial={{ y: 0 }}
                    animate={{ y: [0, -50, -44] }}        /* lift then settle into hover */
                    transition={{ duration: 0.7, ease: 'backOut', times: [0, 0.7, 1] }}
                    style={{
                      position: 'absolute',
                      bottom: '75px',               /* right above base initially */
                      left: 0,
                      width: '130px',
                      height: '65px',
                      overflow: 'hidden',
                      borderRadius: '12px 12px 0 0',
                      zIndex: 5,
                      boxShadow: '0 -6px 20px rgba(212,175,55,0.55)',
                    }}
                  >
                    <img
                      src="/images/spin_icon.png"
                      alt="box lid"
                      style={{
                        width: '130px',
                        height: '130px',
                        objectFit: 'cover',
                        objectPosition: 'top',
                        display: 'block',
                      }}
                    />
                  </motion.div>

                  {/* ── INNER GLOW filling the gap between halves ── */}
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{ opacity: [0, 1, 0.7], scaleX: 1 }}
                    transition={{ duration: 0.9, delay: 0.15 }}
                    style={{
                      position: 'absolute',
                      bottom: '72px',           /* sits right at the gap */
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '110px',
                      height: '46px',           /* fills the gap */
                      background: 'radial-gradient(ellipse at center, rgba(255,224,102,0.75) 0%, rgba(255,180,0,0.3) 50%, transparent 80%)',
                      zIndex: 3,
                      pointerEvents: 'none',
                      borderRadius: '50%',
                    }}
                  />

                  {/* ── LIGHT RAYS shooting upward from inside the gap ── */}
                  {[-55, -35, -15, 0, 15, 35, 55].map((angle, i) => (
                    <motion.div
                      key={`ray-${i}`}
                      initial={{ scaleY: 0, opacity: 0.95 }}
                      animate={{ scaleY: 1, opacity: 0 }}
                      transition={{ duration: 1.1, delay: 0.12 + i * 0.045, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        bottom: '95px',           /* center of the gap */
                        left: '50%',
                        width: angle === 0 ? '4px' : '3px',
                        height: '95px',
                        background: 'linear-gradient(to top, rgba(255,220,80,1) 0%, rgba(255,200,50,0.6) 50%, transparent 100%)',
                        transformOrigin: 'bottom center',
                        transform: `translateX(-50%) rotate(${angle}deg)`,
                        borderRadius: '2px',
                        zIndex: 3,
                        pointerEvents: 'none',
                      }}
                    />
                  ))}

                  {/* ── Gold radial flash at split ── */}
                  {burst && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 5, opacity: 0 }}
                      transition={{ duration: 0.65 }}
                      style={{
                        position: 'absolute',
                        bottom: '95px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '44px', height: '44px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,235,120,0.95) 0%, transparent 70%)',
                        zIndex: 6,
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* ── Coin particles from gap ── */}
                  {burst && COIN_ANGLES.map((angle, i) => (
                    <motion.div
                      key={`coin-${i}`}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                      animate={{
                        x: Math.cos(angle) * (75 + Math.random() * 50),
                        y: Math.sin(angle) * (75 + Math.random() * 50) - 50,
                        opacity: [1, 1, 0],
                        scale: [0, 1.2, 0.8],
                        rotate: [0, 360],
                      }}
                      transition={{ duration: 1.4, delay: i * 0.05, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        bottom: '95px',
                        left: '50%',
                        width: '24px', height: '24px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #ffe066, #d4af37, #b8860b)',
                        border: '2px solid #ffe066',
                        boxShadow: '0 0 8px rgba(212,175,55,0.8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 900, color: '#7a5a00',
                        zIndex: 10, pointerEvents: 'none',
                      }}
                    >
                      $
                    </motion.div>
                  ))}

                  {/* ── $1000 labels ── */}
                  {burst && MONEY_BURSTS.map((pos, i) => (
                    <motion.div
                      key={`money-${i}`}
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                      animate={{ x: pos.x, y: pos.y, opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1, 0.8] }}
                      transition={{ duration: 1.8, delay: 0.25 + i * 0.18, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        bottom: '95px',
                        left: '50%',
                        fontSize: '20px', fontWeight: 900, color: '#ffe066',
                        textShadow: '0 0 12px rgba(212,175,55,0.9)',
                        zIndex: 20, pointerEvents: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      +$1,000
                    </motion.div>
                  ))}

                  {/* ── Gift emojis bursting out ── */}
                  {burst && [
                    { emoji: '🎁', x: -72, y: -85, delay: 0.1 },
                    { emoji: '💰', x: 62,  y: -95, delay: 0.2 },
                    { emoji: '🎊', x: -48, y: -115, delay: 0.3 },
                    { emoji: '⭐', x: 78,  y: -62, delay: 0.15 },
                    { emoji: '🎉', x: -18, y: -130, delay: 0.35 },
                  ].map((item, i) => (
                    <motion.div
                      key={`gift-${i}`}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                      animate={{ x: item.x, y: item.y, opacity: [1, 1, 0], scale: [0, 1.5, 0.9] }}
                      transition={{ duration: 1.5, delay: item.delay, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        bottom: '95px', left: '50%',
                        fontSize: '22px',
                        zIndex: 15, pointerEvents: 'none',
                      }}
                    >
                      {item.emoji}
                    </motion.div>
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
