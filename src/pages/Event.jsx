import React from 'react';
import { motion } from 'framer-motion';
import { Gift, ChevronLeft, CalendarDays, Timer, ArrowRight, Sparkles, Zap, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EVENTS = [
  {
    id: 1,
    title: 'New User Welcome Bonus',
    description: 'Bind your first withdrawal account and make a minimum deposit of $50 to instantly receive a $10 trading bonus credited directly to your primary wallet.',
    type: 'Promotion',
    icon: <Gift size={24} color="#f472b6" />,
    color: '#f472b6',
    bg: 'rgba(244, 114, 182, 0.1)',
    endDate: '2026-12-31',
    status: 'Active'
  },
  {
    id: 2,
    title: 'VIP Upgrade Sprint',
    description: 'Upgrade your bot to VIP 5 or higher before the weekend ends and receive an automatic 5% cashback on your total bot activation cost.',
    type: 'Limited Time',
    icon: <Zap size={24} color="var(--warning)" />,
    color: 'var(--warning)',
    bg: 'rgba(245, 158, 11, 0.1)',
    endDate: '2026-05-15',
    status: 'Active'
  },
  {
    id: 3,
    title: 'Affiliate Leaderboard Tournament',
    description: 'The top 10 affiliates who invite the most active users this month will share a prize pool of $50,000 USDT. Top prize is $20,000 USDT!',
    type: 'Tournament',
    icon: <Trophy size={24} color="var(--success)" />,
    color: 'var(--success)',
    bg: 'rgba(16, 185, 129, 0.1)',
    endDate: '2026-05-31',
    status: 'Active'
  },
  {
    id: 4,
    title: 'Weekend Deposit Multiplier',
    description: 'All deposits made on Saturdays and Sundays receive a 2% extra credit boost. Max boost up to $500 per transaction.',
    type: 'Recurring',
    icon: <Sparkles size={24} color="var(--primary)" />,
    color: 'var(--primary)',
    bg: 'rgba(212, 175, 55, 0.1)',
    endDate: 'Ongoing',
    status: 'Active'
  }
];

export const Event = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '16px', paddingBottom: '80px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gift size={22} color="#f472b6" />
          <h2 style={{ fontSize: '20px', margin: 0 }}>Events & Promotions</h2>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {EVENTS.map((event) => (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            style={{ 
              background: 'var(--bg-panel)', 
              borderRadius: '16px', 
              border: `1px solid ${event.bg}`, 
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ padding: '20px', display: 'flex', gap: '16px' }}>
              <div style={{ 
                width: '56px', height: '56px', borderRadius: '14px', 
                background: event.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {event.icon}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff' }}>{event.title}</h3>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ 
                    background: event.bg, color: event.color, 
                    fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' 
                  }}>
                    {event.type}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <Timer size={12} /> Ends: {event.endDate}
                  </span>
                </div>
                
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {event.description}
                </p>

                <button 
                  onClick={() => navigate('/wallet')}
                  style={{ 
                    background: `linear-gradient(135deg, ${event.color}, ${event.color}aa)`,
                    color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  Participate Now <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
    </motion.div>
  );
};
