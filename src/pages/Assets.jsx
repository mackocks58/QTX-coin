import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Wallet, Database, Briefcase, Gem, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';

export const Assets = () => {
  const navigate = useNavigate();
  const { balance, miningBalance, investmentBalance, qtxBalance } = useAuth();
  const { formatCurrency, convertAndFormatSmallCurrency, rate } = useCurrency();
  
  const [qtxPrice, setQtxPrice] = useState(0);
  const [loadingPrice, setLoadingPrice] = useState(true);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=quantumx&vs_currencies=usd');
        const data = await res.json();
        if (data.quantumx && data.quantumx.usd) {
          setQtxPrice(data.quantumx.usd);
        }
      } catch (err) {
        console.log('Error fetching price', err);
      } finally {
        setLoadingPrice(false);
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // 1 min update
    return () => clearInterval(interval);
  }, []);

  const totalUSDWallets = (balance || 0) + (miningBalance || 0) + (investmentBalance || 0);
  const localQtxValue = (qtxBalance || 0) * qtxPrice * rate;
  const totalEstimatedValue = totalUSDWallets + localQtxValue;

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ paddingBottom: '90px' }}
    >
      <div className="flex justify-between items-center mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="mb-0" style={{ margin: 0, fontSize: '18px' }}>My Assets</h2>
        </div>
      </div>

      <div style={{ 
        background: 'var(--gold-gradient)', 
        borderRadius: '16px', 
        padding: '24px', 
        marginBottom: '20px', 
        boxShadow: '0 8px 30px rgba(212,175,55,0.25)',
        color: '#000',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Estimated Value</h3>
          <div style={{ fontSize: '32px', fontWeight: 800, margin: '8px 0', letterSpacing: '-0.5px' }}>
            {loadingPrice ? '...' : formatCurrency(totalEstimatedValue)}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 500, opacity: 0.9 }}>
            Live QTX Rate: {loadingPrice ? '...' : convertAndFormatSmallCurrency(qtxPrice, 6)}
          </div>
        </div>
        <Wallet size={120} color="rgba(0,0,0,0.05)" style={{ position: 'absolute', right: '-20px', bottom: '-20px', transform: 'rotate(-15deg)' }} />
      </div>

      <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Database size={16} color="var(--primary)" /> Wallet Breakdown
      </h3>

      <div style={{ display: 'grid', gap: '12px' }}>
        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} color="var(--success)" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Profit Wallet</h4>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Available Funds</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(balance || 0)}</div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo.png" alt="QTX" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>QTX Holdings</h4>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Company Coin</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{(qtxBalance || 0).toFixed(4)} QTX</div>
            <div style={{ fontSize: '11px', color: 'var(--success)' }}>≈ {formatCurrency(localQtxValue)}</div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={18} color="var(--secondary)" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Investment Wallet</h4>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Staked/Active</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(investmentBalance || 0)}</div>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gem size={18} color="var(--warning)" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)' }}>Mining Wallet</h4>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>AI Output</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(miningBalance || 0)}</div>
          </div>
        </div>
      </div>

    </motion.div>
  );
};
