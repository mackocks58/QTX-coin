import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Play, Clock, CheckCircle2, ChevronLeft, Gift, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../hooks/useCurrency';
import { CRYPTO_PLANS } from './Wealth';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const ACTION_MOVIES = [
  { id: 'yjRHZEUamCc', title: 'John Wick: Chapter 4', duration: '2:29' },
  { id: 'eoOaKN4qCKw', title: 'Fast X - Official Trailer', duration: '3:41' },
  { id: 'avz06PDqDbM', title: 'Mission: Impossible', duration: '2:30' },
  { id: 'Y274jZs5s7s', title: 'Extraction 2 | Official Trailer', duration: '2:38' },
  { id: 'mqqft2x_Aa4', title: 'The Batman - Main Trailer', duration: '2:38' },
  { id: 'xa_yFaLhiRE', title: 'Top Gun: Maverick', duration: '2:12' },
];

const LIVE_RATES = { doge: 2.2, ada: 3, matic: 3.6, xrp: 4, link: 5, dot: 6, avax: 7, sol: 8, eth: 9, btc: 10 };
const REQUIRED_WATCH_TIME = 30;
const MS_24H = 24 * 60 * 60 * 1000;

function parseRawPrice(price) {
  return parseFloat(String(price || '0').replace(/[^0-9.-]/g, '')) || 0;
}

function getLivePercent(id) {
  if (LIVE_RATES[id] !== undefined) return LIVE_RATES[id];
  return CRYPTO_PLANS.find(p => p.id === id)?.dailyPercent || 0;
}

function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export const Movies = () => {
  const { userData } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [progress, setProgress] = useState(0);
  const [nowTs, setNowTs] = useState(Date.now());
  const [claimStatus, setClaimStatus] = useState('idle'); // idle | claiming | done | error

  const intervalRef = useRef(null);
  const claimedRef = useRef(false);

  // ── Live clock for countdown timers ──────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Watch progress timer ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedMovie) return;
    claimedRef.current = false;
    setProgress(0);
    setClaimStatus('idle');
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= REQUIRED_WATCH_TIME) {
          clearInterval(intervalRef.current);
          return REQUIRED_WATCH_TIME;
        }
        return p + 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [selectedMovie]);

  // ── Auto-claim when progress hits 30s ───────────────────────────────
  useEffect(() => {
    if (progress < REQUIRED_WATCH_TIME) return;
    if (!selectedMovie) return;
    if (claimedRef.current) return;
    if (!canEarn) return;

    claimedRef.current = true;
    doClaim(selectedMovie.id);
  // eslint-disable-next-line
  }, [progress]);

  // ── Investment data ──────────────────────────────────────────────────
  const activeCrypto = (userData?.activatedCrypto || []).filter(c => c.status === 'running');
  const claimedVideos = userData?.claimedVideos || {};

  const totalDailyProfit = activeCrypto.reduce((sum, c) => {
    const price = parseRawPrice(c.price);
    const pct = getLivePercent(c.id);
    return sum + (price * pct / 100);
  }, 0);

  const canEarn = totalDailyProfit > 0;
  // Per video = daily profit ÷ 6 videos (watching all 6 earns full daily profit)
  const rewardPerVideo = canEarn ? totalDailyProfit / ACTION_MOVIES.length : 0;

  // ── Claim function ───────────────────────────────────────────────────
  async function doClaim(videoId) {
    setClaimStatus('claiming');
    const toastId = toast.loading('Claiming reward...');
    try {
      const fn = httpsCallable(functions, 'claimVideoReward');
      const res = await fn({ videoId });
      toast.success(`+${formatCurrency(res.data.rewardAmount)} credited!`, { id: toastId, duration: 5000 });
      setClaimStatus('done');
    } catch (err) {
      console.error('Claim failed:', err);
      const msg = err?.details?.message || err?.message || 'Claim failed. Try again.';
      toast.error(msg, { id: toastId });
      setClaimStatus('error');
    }
  }

  function openMovie(movie) {
    const raw = claimedVideos[movie.id];
    if (raw) {
      const ts = raw?.toDate ? raw.toDate().getTime() : new Date(raw).getTime();
      if (Date.now() - ts < MS_24H) {
        toast.error('Come back in 24 hours to watch this again!');
        return;
      }
    }
    setSelectedMovie(movie);
  }

  function closeMovie() {
    clearInterval(intervalRef.current);
    setSelectedMovie(null);
    setProgress(0);
    setClaimStatus('idle');
    claimedRef.current = false;
  }

  return (
    <motion.div
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ paddingBottom: '100px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex' }}>
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ margin: 0 }}>Watch &amp; Earn</h2>
      </div>

      {/* No investment warning */}
      {!canEarn && (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-start' }}>
          <AlertCircle size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Active Investment Required</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', lineHeight: 1.5 }}>
              Activate a Crypto Investment in the Wealth section to unlock video rewards.
            </div>
            <button onClick={() => navigate('/wealth')} style={{ background: '#f59e0b', color: '#000', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, marginTop: '10px', cursor: 'pointer' }}>
              Go to Wealth
            </button>
          </div>
        </div>
      )}

      {/* Active portfolio */}
      {canEarn && (
        <div className="panel" style={{ padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--success)', fontWeight: 700, fontSize: '14px' }}>
            <Gift size={18} /> Video Rewards Active — watch {REQUIRED_WATCH_TIME}s to earn
          </div>
          {activeCrypto.map(c => {
            const price = parseRawPrice(c.price);
            const pct = getLivePercent(c.id);
            const vReward = (price * pct / 100) / ACTION_MOVIES.length;
            return (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-dark)', borderRadius: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={c.logo} alt={c.name} style={{ width: '28px', height: '28px', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Invested: {formatCurrency(price)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '13px' }}>+{formatCurrency(vReward)}<span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400 }}>/video</span></div>
                  <div style={{ fontSize: '11px', color: 'var(--primary)' }}>{pct}% daily</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Movie Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {ACTION_MOVIES.map(movie => {
          const raw = claimedVideos[movie.id];
          const ts = raw ? (raw?.toDate ? raw.toDate().getTime() : new Date(raw).getTime()) : 0;
          const msLeft = ts > 0 ? MS_24H - (nowTs - ts) : 0;
          const onCooldown = msLeft > 0;
          const thumb = `https://img.youtube.com/vi/${movie.id}/hqdefault.jpg`;

          return (
            <div
              key={movie.id}
              onClick={() => openMovie(movie)}
              style={{ background: 'var(--bg-panel)', borderRadius: '12px', overflow: 'hidden', cursor: onCooldown ? 'not-allowed' : 'pointer', opacity: onCooldown ? 0.7 : 1, border: '1px solid var(--border)' }}
            >
              <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                <img
                  src={thumb}
                  alt={movie.title}
                  onError={e => { e.target.onerror = null; e.target.src = `https://img.youtube.com/vi/${movie.id}/mqdefault.jpg`; }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {onCooldown
                    ? <Clock size={28} color="#f59e0b" />
                    : <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Play size={20} color="#fff" style={{ marginLeft: '3px' }} /></div>
                  }
                </div>
                <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={9} /> {movie.duration}
                </div>
              </div>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.title}</div>
                {onCooldown
                  ? <div style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}><Clock size={9} />{fmtCountdown(msLeft)}</div>
                  : <div style={{ fontSize: '9px', color: 'var(--success)', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}><Gift size={9} />{canEarn ? `+${formatCurrency(rewardPerVideo)}` : 'Invest to Earn'}</div>
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedMovie && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <div style={{ width: '100%', maxWidth: '800px', background: 'var(--bg-dark)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
              <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{selectedMovie.title}</div>
                <button onClick={closeMovie} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
              </div>

              <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${selectedMovie.id}?autoplay=1&rel=0&modestbranding=1`}
                  title={selectedMovie.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                />
              </div>

              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {progress >= REQUIRED_WATCH_TIME ? '✓ Watch complete!' : `Watch ${REQUIRED_WATCH_TIME - progress}s more to earn`}
                  </div>
                  {canEarn && <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: '14px' }}>+{formatCurrency(rewardPerVideo)}</div>}
                </div>
                <div style={{ height: '8px', background: 'var(--bg-darker)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(progress / REQUIRED_WATCH_TIME) * 100}%`, background: progress >= REQUIRED_WATCH_TIME ? 'var(--success)' : 'var(--primary)', transition: 'width 1s linear, background 0.3s' }} />
                </div>
                {progress >= REQUIRED_WATCH_TIME && (
                  <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>
                    {claimStatus === 'done' || claimedVideos[selectedMovie.id]
                      ? <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><CheckCircle2 size={18} /> Reward claimed! Come back in 24h.</span>
                      : claimStatus === 'claiming'
                      ? <span style={{ color: 'var(--text-muted)' }}>⏳ Processing reward...</span>
                      : claimStatus === 'error'
                      ? <span style={{ color: 'var(--danger)' }}>Failed to claim. You may not have an active investment.</span>
                      : <span style={{ color: 'var(--primary)' }}>⏳ Processing reward...</span>
                    }
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
