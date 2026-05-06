import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Key, History, MapPin, MonitorSmartphone, Clock, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';

export const Security = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);

  useEffect(() => {
    if (userData?.loginHistory) {
      setLoginHistory(userData.loginHistory);
    }
  }, [userData]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      return toast.error("Please enter your current password");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("New passwords do not match");
    }
    if (newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters");
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      await updatePassword(auth.currentUser, newPassword);
      toast.success("Password updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        toast.error("Incorrect current password.");
      } else {
        toast.error("Failed to update password: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <MonitorSmartphone size={14} />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return <MonitorSmartphone size={14} />;
    }
    return <MonitorSmartphone size={14} />;
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
          <Shield size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', margin: 0 }}>Security Settings</h2>
        </div>
      </div>
      
      {/* PASSWORD CHANGE */}
      <div className="panel mb-4" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <Key size={16} color="var(--text-secondary)" />
          <h3 style={{ fontSize: '14px', margin: 0 }}>Change Password</h3>
        </div>
        
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="input-group">
            <label className="input-label" style={{ fontSize: '12px' }}>Current Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)} 
              placeholder="Enter current password"
            />
          </div>
          <div className="input-group">
            <label className="input-label" style={{ fontSize: '12px' }}>New Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Enter new password"
            />
          </div>
          <div className="input-group">
            <label className="input-label" style={{ fontSize: '12px' }}>Confirm New Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="Confirm new password"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '12px', padding: '10px', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* LOGIN HISTORY */}
      <div className="panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <History size={16} color="var(--text-secondary)" />
          <h3 style={{ fontSize: '14px', margin: 0 }}>Recent Login Activity</h3>
        </div>
        
        {loginHistory.length === 0 ? (
          <p className="text-center text-muted" style={{ fontSize: '12px' }}>No recent login activity found.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loginHistory.map((log) => (
              <div key={log.id} style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    <MapPin size={12} color="var(--primary)" />
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{log.country || 'Unknown Location'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                    <Clock size={10} />
                    <span style={{ fontSize: '10px' }}>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <strong>IP:</strong> {log.ip || 'Unknown'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <div style={{ marginTop: '2px', color: 'var(--text-muted)' }}>
                      {getDeviceIcon(log.device)}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {log.device || 'Unknown Device'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
