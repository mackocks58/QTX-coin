import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Bot, Eye, EyeOff } from 'lucide-react';

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
  { code: 'UN', name: 'Global/Other' } // Using UN flag for global
];

const CustomCountrySelect = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = COUNTRIES.find(c => c.name === value);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div 
        className="input-field"
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', color: selected ? 'inherit' : 'var(--text-muted)' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected ? (
          <>
            <img src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`} alt="flag" style={{ width: '20px', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-primary)' }}>{selected.name}</span>
          </>
        ) : (
          <span>Select your country</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>▼</span>
      </div>
      
      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, 
          backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)', 
          borderRadius: 'var(--radius-md)', marginTop: '4px', maxHeight: '200px', 
          overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          {COUNTRIES.map(c => (
            <div 
              key={c.code}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
              onClick={() => { onChange(c.name); setIsOpen(false); }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-dark)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <img src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} alt="flag" style={{ width: '20px', borderRadius: '2px' }} />
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refId = searchParams.get('ref');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill in all fields');
    if (!isLogin && !country) return toast.error('Please select your country');
    
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Logged in successfully');
      } else {
        await signup(email, password, country, refId);
        toast.success('Account created successfully');
      }
      navigate('/');
    } catch (error) {
      let friendlyMessage = 'Authentication failed. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'An account with this email already exists.';
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        friendlyMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = 'Your password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = 'Network error. Please check your internet connection.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      }

      toast.error(friendlyMessage);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', width: '100%' }}>
      <motion.div 
        className="panel" 
        style={{ width: '100%', maxWidth: '400px', margin: '20px' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
          <img src="/logo.png" alt="Fintex Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain' }} />
          <h2 style={{ color: 'var(--text-primary)', letterSpacing: '2px', margin: 0, fontSize: '28px' }}>FINTEX</h2>
        </div>
        <h3 className="mb-4 text-center" style={{ color: 'var(--text-secondary)' }}>{isLogin ? 'Sign In' : 'Create Account'}</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                className="input-field" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
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
          
          {!isLogin && (
            <div className="input-group">
              <label className="input-label">Country</label>
              <CustomCountrySelect value={country} onChange={setCountry} />
            </div>
          )}
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
        </form>
        
        <div className="text-center mt-4">
          <button onClick={() => setIsLogin(!isLogin)} className="text-muted" style={{ fontSize: '0.85rem' }}>
            {isLogin ? (
              <>Don't have an account? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign up</span></>
            ) : (
              <>Already have an account? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</span></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
