import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';

export const TradingChart = () => {
  const chartContainerRef = useRef();

  useEffect(() => {
    const handleResize = () => {
      if (chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 250,
    });

    const newSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981', 
        downColor: '#ef4444', 
        borderVisible: false, 
        wickUpColor: '#10b981', 
        wickDownColor: '#ef4444' 
    });

    let ws = null;
    let basePrice = 0.000033; // Fallback
    
    // Fetch real price to anchor the mock chart
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=quantumx&vs_currencies=usd')
      .then(r => r.json())
      .then(d => {
        if(d.quantumx && d.quantumx.usd) {
          basePrice = d.quantumx.usd;
        }
        generateMockData();
      })
      .catch(() => generateMockData());

    const generateMockData = () => {
      let currentTime = Math.floor(Date.now() / 1000) - 3600; // Start 1 hour ago
      const cdata = [];
      let currentPrice = basePrice * 0.98; // Start slightly lower

      // Generate 60 historical candles
      for(let i = 0; i < 60; i++) {
        const volatility = currentPrice * 0.02;
        const change = (Math.random() - 0.45) * volatility;
        const open = currentPrice;
        const close = currentPrice + change;
        const high = Math.max(open, close) + (Math.random() * volatility * 0.5);
        const low = Math.min(open, close) - (Math.random() * volatility * 0.5);
        
        cdata.push({ time: currentTime, open, high, low, close });
        currentTime += 60;
        currentPrice = close;
      }
      newSeries.setData(cdata);

      // Simulate live updates
      ws = setInterval(() => {
        const volatility = currentPrice * 0.005;
        const change = (Math.random() - 0.48) * volatility;
        const close = currentPrice + change;
        newSeries.update({
          time: Math.floor(Date.now() / 1000),
          open: currentPrice,
          high: Math.max(currentPrice, close) * 1.001,
          low: Math.min(currentPrice, close) * 0.999,
          close: close
        });
        currentPrice = close;
      }, 2000);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws) clearInterval(ws);
      chart.remove();
    };
  }, []);

  return (
    <div
      ref={chartContainerRef}
      style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }}
    />
  );
};
