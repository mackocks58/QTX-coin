import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, Wallet, Copy, Camera, CalendarDays, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ShieldCheck, Bell, ChevronLeft, HelpCircle, LogOut, Gift, Fingerprint, Smartphone, X, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { PushNotifications } from '@capacitor/push-notifications';

const COUNTRIES = [
  { code: 'KE', name: 'Kenya' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UG', name: 'Uganda' },
  { code: 'BW', name: 'Botswana' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'BI', name: 'Burundi' },
  { code: 'GH', name: 'Ghana' },
  { code: 'UN', name: 'Global/Other' }
];

export const Account = () => {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const bioRes = await NativeBiometric.isCredentialsSaved({ server: 'fintex_auth' });
        setBiometricEnabled(bioRes.isSaved);
      } catch (e) {
        console.log('Biometric check failed', e);
      }
      
      try {
        const pushRes = await PushNotifications.checkPermissions();
        setPushEnabled(pushRes.receive === 'granted');
      } catch (e) {
        console.log('Push check failed', e);
      }
    };
    checkSettings();
  }, []);

  const handlePushToggle = async () => {
    try {
      if (pushEnabled) {
        toast('To disable notifications, please go to your device Settings.', { icon: 'ℹ️' });
        return;
      }
      
      const res = await PushNotifications.requestPermissions();
      if (res.receive === 'granted') {
        await PushNotifications.register();
        setPushEnabled(true);
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Permission denied');
      }
    } catch (e) {
      console.log('Push toggle error', e);
      toast.error('Could not change push settings');
    }
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      try {
        await NativeBiometric.deleteCredentials({ server: 'fintex_auth' });
        setBiometricEnabled(false);
        toast.success('Biometric login disabled');
      } catch (e) {
        toast.error('Failed to disable biometrics');
      }
    } else {
      setBiometricPassword('');
      setShowPassword(false);
      setShowBiometricModal(true);
    }
  };

  const confirmEnableBiometric = async () => {
    if (!biometricPassword) return toast.error('Please enter your password');
    
    const loadingToast = toast.loading('Verifying password...');
    try {
      await signInWithEmailAndPassword(auth, currentUser?.email, biometricPassword);
      toast.dismiss(loadingToast);
    } catch (err) {
      toast.dismiss(loadingToast);
      return toast.error('Incorrect password. Please try again.');
    }

    try {
      await NativeBiometric.setCredentials({
        username: currentUser?.email || 'user',
        password: biometricPassword,
        server: 'fintex_auth'
      });
      setBiometricEnabled(true);
      setShowBiometricModal(false);
      toast.success('Biometric login enabled!');
    } catch (e) {
      toast.error('Failed to enable biometrics');
    }
  };

  const handleCopyUid = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid);
      toast.success('UID copied to clipboard');
    }
  };

  const handleAvatarClick = () => {
    if (uploading) return;
    
    // Check 30-day cooldown
    if (userData?.lastPhotoUpdate) {
      const lastUpdate = new Date(userData.lastPhotoUpdate).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      if (now - lastUpdate < thirtyDaysMs) {
        const daysLeft = Math.ceil((thirtyDaysMs - (now - lastUpdate)) / (24 * 60 * 60 * 1000));
        return toast.error(`You can change your photo again in ${daysLeft} days.`);
      }
    }
    
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return toast.error('Please select an image file');
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return toast.error('Image size must be less than 5MB');
    }

    setUploading(true);
    const toastId = toast.loading('Processing profile picture...');

    try {
      // Compress image and convert to Base64 to bypass Firebase Storage restrictions
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 200;
          const MAX_HEIGHT = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Get highly compressed base64 string
          const base64DataUrl = canvas.toDataURL('image/jpeg', 0.7);

          try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
              photoURL: base64DataUrl,
              lastPhotoUpdate: new Date().toISOString()
            });
            toast.success('Profile picture updated successfully!', { id: toastId });
          } catch (err) {
            toast.error('Error saving image: ' + err.message, { id: toastId });
          } finally {
            setUploading(false);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Processing failed: ' + error.message, { id: toastId });
      setUploading(false);
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
        <h2 className="mb-0" style={{ fontSize: '18px', margin: 0 }}>My Account</h2>
      </div>
      
      <div className="panel mb-4" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          <div style={{ position: 'relative' }}>
            <div 
              onClick={handleAvatarClick}
              style={{ 
                width: '64px', height: '64px', borderRadius: '50%', 
                backgroundColor: 'var(--primary-glow)', border: '2px solid var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '1.5rem', color: 'var(--primary)', fontWeight: 'bold',
                cursor: uploading ? 'wait' : 'pointer', overflow: 'hidden',
                position: 'relative'
              }}
            >
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                currentUser?.email?.charAt(0).toUpperCase()
              )}
              
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', 
                height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center'
              }}>
                <Camera size={12} color="#fff" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.email || 'Loading...'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', width: 'fit-content' }}>
              <span className="text-muted" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                UID: {currentUser?.uid ? currentUser.uid.slice(0, 10) : '...'}...
              </span>
              <button onClick={handleCopyUid} style={{ display: 'flex', alignItems: 'center', color: 'var(--primary)', padding: '2px' }}>
                <Copy size={12} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Additional Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Region: 
              {userData?.country && (() => {
                const countryObj = COUNTRIES.find(c => c.name === userData.country);
                return countryObj ? (
                  <>
                    <img src={`https://flagcdn.com/w20/${countryObj.code.toLowerCase()}.png`} alt="flag" style={{ width: '16px', borderRadius: '2px' }} />
                    <strong style={{ color: 'var(--text-primary)' }}>{userData.country}</strong>
                  </>
                ) : <strong style={{ color: 'var(--text-primary)' }}>{userData.country}</strong>;
              })()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarDays size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Joined: <strong style={{ color: 'var(--text-primary)' }}>{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</strong></span>
          </div>
        </div>

        {/* Settings & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-dark)', padding: '8px', borderRadius: '8px' }}>
          <Link to="/security" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', textDecoration: 'none', color: 'var(--text-primary)', borderRadius: '6px', transition: 'var(--transition)' }} className="hover:bg-panel-hover">
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={14} color="var(--primary)" />
            </div>
            <span style={{ fontSize: '13px', flex: 1, fontWeight: 500 }}>Security Center</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>›</span>
          </Link>
          
          <Link to="/notifications" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', textDecoration: 'none', color: 'var(--text-primary)', borderRadius: '6px', transition: 'var(--transition)' }} className="hover:bg-panel-hover">
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Bell size={14} color="var(--primary)" />
              {userData?.notifications?.some(n => !n.read) && (
                <div style={{ position: 'absolute', top: '6px', right: '6px', width: '6px', height: '6px', background: 'red', borderRadius: '50%' }} />
              )}
            </div>
            <span style={{ fontSize: '13px', flex: 1, fontWeight: 500 }}>Notifications</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>›</span>
          </Link>

          <Link to="/event" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', textDecoration: 'none', color: 'var(--text-primary)', borderRadius: '6px', transition: 'var(--transition)' }} className="hover:bg-panel-hover">
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gift size={14} color="#f472b6" />
            </div>
            <span style={{ fontSize: '13px', flex: 1, fontWeight: 500 }}>Event Center</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>›</span>
          </Link>

          <Link to="/spin" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', textDecoration: 'none', color: 'var(--text-primary)', borderRadius: '6px', transition: 'var(--transition)' }} className="hover:bg-panel-hover">
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/images/spin_icon.png" alt="spin" style={{ width: '18px', height: '18px' }} />
            </div>
            <span style={{ fontSize: '13px', flex: 1, fontWeight: 500, color: 'var(--warning)' }}>Lucky Spin</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>›</span>
          </Link>
          
          <Link to="/faq" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', textDecoration: 'none', color: 'var(--text-primary)', borderRadius: '6px', transition: 'var(--transition)' }} className="hover:bg-panel-hover">
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HelpCircle size={14} color="var(--primary)" />
            </div>
            <span style={{ fontSize: '13px', flex: 1, fontWeight: 500 }}>FAQ & Support</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '16px' }}>›</span>
          </Link>
        </div>

        {/* Device Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Device Settings</h4>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Fingerprint size={14} color="var(--primary)" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Biometric Login</span>
            </div>
            <div 
              onClick={handleBiometricToggle}
              style={{ width: '40px', height: '22px', background: biometricEnabled ? 'var(--primary)' : 'var(--border)', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'var(--transition)' }}
            >
              <div style={{ position: 'absolute', top: '2px', left: biometricEnabled ? '20px' : '2px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s ease' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={14} color="var(--primary)" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Push Notifications</span>
            </div>
            <div 
              onClick={handlePushToggle}
              style={{ width: '40px', height: '22px', background: pushEnabled ? 'var(--primary)' : 'var(--border)', borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'var(--transition)' }}
            >
              <div style={{ position: 'absolute', top: '2px', left: pushEnabled ? '20px' : '2px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s ease' }} />
            </div>
          </div>
        </div>
        
        {/* Top Action Bar */}
        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <Link to="/bind-account" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', textDecoration: 'none', border: '1px solid var(--border)' }} className="hover:border-primary">
            <CreditCard size={16} color="var(--primary)" />
            <span style={{ fontWeight: 500, fontSize: '12px' }}>Bind Account</span>
          </Link>
          <Link to="/wallet" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--bg-dark)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', textDecoration: 'none', border: '1px solid var(--border)' }} className="hover:border-primary">
            <Wallet size={16} color="var(--primary)" />
            <span style={{ fontWeight: 500, fontSize: '12px' }}>Deposit</span>
          </Link>
        </div>

        {/* Logout Button */}
        <button 
          onClick={async () => {
            try {
              await logout();
              navigate('/login');
            } catch (err) {
              toast.error('Failed to log out');
            }
          }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: 'var(--danger)', cursor: 'pointer', marginTop: '8px', transition: 'var(--transition)' }}
        >
          <LogOut size={16} />
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Sign Out</span>
        </button>
      </div>

      {/* Biometric Password Modal */}
      {showBiometricModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ background: 'var(--bg-panel)', width: '100%', maxWidth: '340px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Enable Biometrics</h3>
              <button onClick={() => setShowBiometricModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                To enable Biometric Login, we need to securely store your password on this device. Please enter your password below.
              </p>
              
              <div className="input-group" style={{ marginBottom: '20px' }}>
                <label className="input-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input-field"
                    value={biometricPassword} 
                    onChange={e => setBiometricPassword(e.target.value)} 
                    placeholder="Enter your password"
                    style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <button 
                onClick={confirmEnableBiometric}
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Fingerprint size={18} /> Enable
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
