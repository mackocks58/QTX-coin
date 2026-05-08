import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Bell, ShieldAlert, Info, Clock, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const Notifications = () => {
  const { currentUser, userData } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const notifications = userData?.notifications || [];

  useEffect(() => {
    // Mark unread notifications as read when viewing the page
    const markAsRead = async () => {
      if (!currentUser || notifications.length === 0) return;
      
      const hasUnread = notifications.some(n => !n.read);
      if (hasUnread) {
        const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            notifications: updatedNotifications
          });
        } catch (err) {
          console.error("Error marking notifications as read", err);
        }
      }
    };

    markAsRead();
  }, [currentUser, notifications]);

  const getIcon = (type) => {
    switch(type) {
      case 'security': return <ShieldAlert size={16} color="var(--warning)" />;
      case 'success': return <CheckCircle2 size={16} color="var(--success)" />;
      default: return <Info size={16} color="var(--primary)" />;
    }
  };

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
          <Bell size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', margin: 0 }}>{t('notificationsTitle')}</h2>
        </div>
      </div>

      <div className="panel" style={{ padding: '16px', minHeight: '60vh' }}>
        {notifications.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
            <Bell size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p>{t('noNotificationsYet')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                style={{ 
                  background: notif.read ? 'var(--bg-dark)' : 'rgba(212, 175, 55, 0.05)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: notif.read ? '1px solid var(--border)' : '1px solid var(--primary-glow)',
                  position: 'relative'
                }}
              >
                {!notif.read && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {getIcon(notif.type)}
                  <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{notif.title}</strong>
                </div>
                
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 8px 24px', lineHeight: 1.4 }}>
                  {notif.message}
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', marginLeft: '24px' }}>
                  <Clock size={10} />
                  <span style={{ fontSize: '10px' }}>{new Date(notif.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
