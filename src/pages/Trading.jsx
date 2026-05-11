import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TradingChart } from '../components/TradingChart';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import toast from 'react-hot-toast';

export const Trading = () => {
  const navigate = useNavigate();
  const { balance, qtxBalance, buyQTX, sellQTX } = useAuth();
  const { formatCurrency, convertAndFormatSmallCurrency, symbol, rate } = useCurrency();
  
  const [qtxPrice, setQtxPrice] = useState(0.05); // Default fallback
  const localQtxPrice = qtxPrice * rate;
  const [loadingPrice, setLoadingPrice] = useState(true);
  
  const [buyAmount, setBuyAmount] = useState('');
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=quantumx&vs_currencies=usd');
        const data = await res.json();
        if (data.quantumx && data.quantumx.usd) {
          setQtxPrice(data.quantumx.usd);
        }
      } catch (err) {
        console.log('Error fetching price, using fallback', err);
      } finally {
        setLoadingPrice(false);
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // update every 30s
    return () => clearInterval(interval);
  }, []);

  const handleBuy = async () => {
    const amt = parseFloat(buyAmount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (amt > balance) return toast.error('Insufficient balance');
    setLoadingTx(true);
    const success = await buyQTX(amt, localQtxPrice);
    setLoadingTx(false);
    if (success) {
      toast.success('Successfully bought QTX');
      setBuyAmount('');
    } else {
      toast.error('Transaction failed');
    }
  };

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ paddingBottom: '80px' }}
    >
      <div className="flex justify-between items-center mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="mb-0" style={{ margin: 0, fontSize: '18px' }}>Trade QTX</h2>
        </div>
        <div className="flex gap-2">
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} />
            {convertAndFormatSmallCurrency(qtxPrice, 6)}
          </div>
        </div>
      </div>
      
      <div className="panel" style={{ height: '280px', marginBottom: '16px', padding: '10px' }}>
        <TradingChart />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        {/* BUY BOX */}
        <div className="panel" style={{ padding: '16px', background: 'var(--bg-panel)' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Buy QTX
          </h3>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            Avail: {formatCurrency(balance)}
          </div>
          <div className="input-group" style={{ marginBottom: '12px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="number" 
                className="input-field" 
                placeholder="Amount" 
                value={buyAmount}
                onChange={e => setBuyAmount(e.target.value)}
                style={{ width: '100%', paddingRight: '40px', fontSize: '13px' }}
              />
              <span style={{ position: 'absolute', right: '12px', top: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>{symbol}</span>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', textAlign: 'center' }}>
            ≈ {buyAmount ? (parseFloat(buyAmount) / localQtxPrice).toFixed(4) : '0.0000'} QTX
          </div>
          <button 
            className="btn btn-success" 
            style={{ width: '100%', padding: '10px', fontSize: '13px' }}
            onClick={handleBuy}
            disabled={loadingTx}
          >
            {loadingTx ? 'Processing...' : 'Buy'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
