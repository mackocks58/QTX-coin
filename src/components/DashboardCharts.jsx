import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, LineController, BarController } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useCurrency } from '../hooks/useCurrency';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, LineController, BarController);

export const DashboardCharts = () => {
  const { currentUser } = useAuth();
  const { symbol, formatCurrency } = useCurrency();
  const [weeklyData, setWeeklyData] = useState({ earnings: [0,0,0,0,0,0,0], counts: [0,0,0,0,0,0,0] });
  const [yearlyData, setYearlyData] = useState({ earnings: [0,0,0,0,0], rates: [0,0,0,0,0] });

  // Generate labels for last 7 days
  const last7DaysLabels = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const yearLabels = ["2022", "2023", "2024", "2025", new Date().getFullYear().toString()];

  useEffect(() => {
    if (!currentUser) return;

    const fetchAnalytics = async () => {
      try {
        const q = query(collection(db, 'users', currentUser.uid, 'transactions'));
        const querySnapshot = await getDocs(q);
        const txs = querySnapshot.docs.map(doc => doc.data());

        // Process Weekly Data
        const wEarnings = [0,0,0,0,0,0,0];
        const wCounts = [0,0,0,0,0,0,0];

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Process Yearly Data
        const currentYear = new Date().getFullYear();
        const yEarningsMap = {
          "2022": 0, "2023": 0, "2024": 0, "2025": 0, [currentYear.toString()]: 0
        };

        txs.forEach(tx => {
          // We consider affiliate_reward, bot_profit, deposit, etc as "earnings" for the chart, 
          // or basically any transaction that adds to the user's balance.
          // For now, let's include affiliate_reward and bot_profit, and deposit if it's verified.
          const isEarning = tx.type === 'affiliate_reward' || tx.type === 'bot_profit' || tx.type === 'mining_reward' || tx.type === 'vip_profit';
          const amount = tx.amount || tx.expectedAmount || 0;
          
          if (!tx.createdAt) return;
          const txDate = tx.createdAt.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);

          // Weekly aggregation
          if (txDate >= sevenDaysAgo && txDate <= today) {
            // Find which day index (0-6)
            const diffTime = txDate.getTime() - sevenDaysAgo.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= 6) {
              if (isEarning) wEarnings[diffDays] += amount;
              wCounts[diffDays] += 1;
            }
          }

          // Yearly aggregation
          const y = txDate.getFullYear().toString();
          if (yEarningsMap[y] !== undefined && isEarning) {
            yEarningsMap[y] += amount;
          }
        });

        const yEarnings = [
          yEarningsMap["2022"],
          yEarningsMap["2023"],
          yEarningsMap["2024"],
          yEarningsMap["2025"],
          yEarningsMap[currentYear.toString()]
        ];

        // Calculate simple growth rate (mocking past years slightly if empty just to show the lines)
        const yRates = [0, 0, 0, 0, 0];
        for (let i = 1; i < yEarnings.length; i++) {
          if (yEarnings[i-1] > 0) {
            yRates[i] = ((yEarnings[i] - yEarnings[i-1]) / yEarnings[i-1]) * 100;
          }
        }

        setWeeklyData({ earnings: wEarnings, counts: wCounts });
        setYearlyData({ earnings: yEarnings, rates: yRates });
        
      } catch (error) {
        console.error("Failed to fetch analytics", error);
      }
    };

    fetchAnalytics();
  }, [currentUser]);

  const weeklyChartData = {
    labels: last7DaysLabels,
    datasets: [
      {
        type: "line",
        label: `Daily Earnings (${symbol})`,
        data: weeklyData.earnings,
        borderColor: "#d4af37", // Primary gold
        backgroundColor: "rgba(212, 175, 55, 0.2)",
        tension: 0.4,
        yAxisID: "y",
        pointBackgroundColor: "#d4af37",
        pointRadius: 4,
        borderWidth: 2
      },
      {
        type: "bar",
        label: "Transaction Count",
        data: weeklyData.counts,
        backgroundColor: "rgba(59, 130, 246, 0.6)", // Secondary blue
        yAxisID: "y1",
        borderRadius: 4
      }
    ]
  };

  const weeklyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-secondary)', callback: val => formatCurrency(val) }
      },
      y1: {
        beginAtZero: true,
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { color: 'var(--text-secondary)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-secondary)' }
      }
    },
    plugins: {
      legend: { labels: { color: 'var(--text-primary)', font: { size: 11 } } }
    }
  };

  const yearlyChartData = {
    labels: yearLabels,
    datasets: [
      {
        type: "bar",
        label: `Annual Earnings (${symbol})`,
        data: yearlyData.earnings,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 1,
        borderRadius: 4,
        yAxisID: "y"
      },
      {
        type: "line",
        label: "Growth Rate (%)",
        data: yearlyData.rates,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.2)",
        yAxisID: "y1",
        tension: 0.4,
        pointBackgroundColor: "#f59e0b",
        borderWidth: 2
      }
    ]
  };

  const yearlyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'var(--text-secondary)', callback: val => formatCurrency(val) }
      },
      y1: {
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { color: 'var(--text-secondary)', callback: val => val + "%" }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'var(--text-secondary)' }
      }
    },
    plugins: {
      legend: { labels: { color: 'var(--text-primary)', font: { size: 11 } } }
    }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div className="panel" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', margin: '0 0 4px 0' }}>Weekly Earnings Overview (Last 7 Days)</h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>📅 Daily performance breakdown</p>
        <div style={{ height: '220px' }}>
          <Bar data={weeklyChartData} options={weeklyChartOptions} />
        </div>
      </div>

      <div className="panel" style={{ padding: '16px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', margin: '0 0 4px 0' }}>Year-over-Year Growth</h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>📊 Annual performance comparison</p>
        <div style={{ height: '220px' }}>
          <Bar data={yearlyChartData} options={yearlyChartOptions} />
        </div>
      </div>
    </div>
  );
};
