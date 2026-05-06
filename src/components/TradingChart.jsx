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
      height: 400,
    });

    const newSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981', 
        downColor: '#ef4444', 
        borderVisible: false, 
        wickUpColor: '#10b981', 
        wickDownColor: '#ef4444' 
    });

    let ws = null;

    fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=100')
      .then(res => res.json())
      .then(data => {
        const cdata = data.map(d => {
          return { time: d[0] / 1000, open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]) };
        });
        newSeries.setData(cdata);
        
        ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          const kline = message.k;
          
          newSeries.update({
            time: kline.t / 1000,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
          });
        };
      });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws) ws.close();
      chart.remove();
    };
  }, []);

  return (
    <div
      ref={chartContainerRef}
      style={{ width: '100%', height: '400px', borderRadius: '8px', overflow: 'hidden' }}
    />
  );
};
