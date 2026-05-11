import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';

export const Market = () => {
  const { convertAndFormatSmallCurrency } = useCurrency();
  const navigate = useNavigate();
  const [coins, setCoins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false');
      const data = await res.json();
      setCoins(data);
    } catch (err) {
      console.log('Error fetching markets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 60000); // 1 min update
    return () => clearInterval(interval);
  }, []);

  const filteredCoins = coins.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ paddingBottom: '90px' }}
    >
      <div className="flex justify-between items-center mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(-1)}
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="mb-0" style={{ margin: 0, fontSize: '18px' }}>Markets</h2>
        </div>
        <button 
          onClick={fetchMarkets}
          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '4px' }}
        >
          <RefreshCw size={18} className={loading ? 'animate-shake' : ''} />
        </button>
      </div>

      <div className="input-group" style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search coin (e.g., BTC, Binance Coin)" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '44px', borderRadius: '24px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 12px 10px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
        <span>Name</span>
        <span>Last Price / 24h Change</span>
      </div>

      {loading && coins.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading market data...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredCoins.map((coin) => (
            <div key={coin.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={coin.image} alt={coin.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{coin.name}</h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                    {coin.symbol}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{convertAndFormatSmallCurrency(coin.current_price, 6)}</div>
                <div style={{ 
                  fontSize: '12px', 
                  color: coin.price_change_percentage_24h >= 0 ? 'var(--success)' : 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '4px',
                  fontWeight: 500
                }}>
                  {coin.price_change_percentage_24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
          {filteredCoins.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No coins found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
