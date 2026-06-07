import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import { ChevronLeft, MessageCircle, Clock, DollarSign, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

/* ─── Mock Data for UK Profiles ─── */
const UK_PROFILES = [
  {
    id: 'uk_1',
    name: 'Emily Thompson',
    avatar: 'https://i.pravatar.cc/150?img=47',
    age: 24,
    location: 'London, UK',
    chatTime: '5 mins',
    rewardAmount: 2.50,
    online: true,
  },
  {
    id: 'uk_2',
    name: 'James Wright',
    avatar: 'https://i.pravatar.cc/150?img=11',
    age: 28,
    location: 'Manchester, UK',
    chatTime: '10 mins',
    rewardAmount: 5.00,
    online: true,
  },
  {
    id: 'uk_3',
    name: 'Charlotte Davis',
    avatar: 'https://i.pravatar.cc/150?img=5',
    age: 22,
    location: 'Birmingham, UK',
    chatTime: '15 mins',
    rewardAmount: 8.50,
    online: false,
  },
  {
    id: 'uk_4',
    name: 'Oliver Hughes',
    avatar: 'https://i.pravatar.cc/150?img=12',
    age: 31,
    location: 'Leeds, UK',
    chatTime: '5 mins',
    rewardAmount: 2.50,
    online: true,
  },
];

export const ChatEarn = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleStartChatProcess = (profile) => {
    setSelectedProfile(profile);
  };

  const confirmChatStart = () => {
    setLoading(true);
    // Simulate API network request / Chat initiation
    setTimeout(() => {
      setLoading(false);
      setSelectedProfile(null);
      // For now, simulating that connecting failed or simulating success immediately.
      // E.g., showing a success payment receipt
      setSuccessData({
        title: 'Chat Initiated! 💬',
        message: 'You have been connected. Complete the duration to receive your reward.',
        details: [
          { label: 'Chatting With', value: selectedProfile.name },
          { label: 'Required Duration', value: selectedProfile.chatTime, color: 'var(--warning)' },
          { label: 'Potential Reward', value: formatCurrency(selectedProfile.rewardAmount), color: 'var(--success)' },
          { label: 'Connection Status', value: 'Active', color: 'var(--success)' }
        ]
      });
    }, 1500);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageCircle size={22} color="#a855f7" />
          <h2 style={{ fontSize: '18px', margin: 0 }}>Chat & Earn</h2>
        </div>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
        Chat with UK profiles for the required time duration to earn instant rewards!
      </p>

      {/* Profiles Grid */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {UK_PROFILES.map((profile) => (
          <div key={profile.id} style={{ background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', padding: '16px', gap: '16px', alignItems: 'center' }}>
              
              <div style={{ position: 'relative' }}>
                <img src={profile.avatar} alt={profile.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
                <div style={{ 
                  position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', 
                  background: profile.online ? 'var(--success)' : 'var(--text-muted)', border: '2px solid var(--bg-panel)' 
                }} />
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#fff' }}>{profile.name}</h3>
                  <ShieldCheck size={14} color="var(--primary)" />
                </div>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {profile.age} • {profile.location}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-dark)', padding: '4px 8px', borderRadius: '6px' }}>
                    <Clock size={12} color="var(--text-muted)" />
                    <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>{profile.chatTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                    <DollarSign size={12} color="var(--success)" />
                    <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(profile.rewardAmount)}</span>
                  </div>
                </div>
              </div>

            </div>

            <button 
              onClick={() => handleStartChatProcess(profile)}
              style={{ 
                width: '100%', border: 'none', borderTop: '1px solid var(--border)', 
                background: 'linear-gradient(135deg, #a855f7, #6366f1)', 
                color: '#fff', padding: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              Start Chat
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedProfile && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => !loading && setSelectedProfile(null)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-panel)', borderRadius: '32px 32px 0 0', maxWidth: '500px', width: '100%', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', paddingBottom: '20px' }}
            >
              <div style={{ padding: '12px 0', cursor: 'grab' }}>
                <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto' }} />
              </div>

              <div style={{ padding: '0 24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px' }}>
                  <img src={selectedProfile.avatar} alt={selectedProfile.name} style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', marginBottom: '12px' }} />
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>Chat with {selectedProfile.name}</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                    Connect and chat for {selectedProfile.chatTime} to unlock your {formatCurrency(selectedProfile.rewardAmount)} reward.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}><Clock size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Chat Requirement</span>
                    <strong style={{ color: '#fff' }}>{selectedProfile.chatTime}</strong>
                  </div>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginTop: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}><DollarSign size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} /> Earning Reward</span>
                    <strong style={{ color: 'var(--success)', fontSize: '1.2rem', fontWeight: 800 }}>{formatCurrency(selectedProfile.rewardAmount)}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setSelectedProfile(null)} disabled={loading} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '1rem', opacity: loading ? 0.5 : 1 }}>
                    Cancel
                  </button>
                  <button 
                    onClick={confirmChatStart}
                    disabled={loading}
                    style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(168,85,247,0.3)', opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? 'Connecting...' : 'Initiate Chat'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* --- Success Bottom Sheet --- */}
        {successData && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(4px)' }} onClick={() => setSuccessData(null)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', background: 'var(--bg-panel)', borderTop: '1px solid var(--border)', borderRadius: '32px 32px 0 0', padding: '24px 24px 40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 24px' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <CheckCircle2 size={32} color="var(--success)" />
                </div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{successData.title}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{successData.message}</p>
              </div>

              <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '16px', marginBottom: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 700 }}>Session Details</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {successData.details.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <strong style={{ color: item.color || '#fff' }}>{item.value}</strong>
                    </div>
                  ))}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                    <strong style={{ color: 'var(--warning)' }}>In Progress</strong>
                  </div>
                </div>
              </div>

              <button onClick={() => setSuccessData(null)} style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>Go to Active Chats</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
