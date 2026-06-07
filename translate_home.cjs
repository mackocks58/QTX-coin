const fs = require('fs');

const contextPath = 'src/contexts/LanguageContext.jsx';
let contextStr = fs.readFileSync(contextPath, 'utf8');

const enInsert = `
    invest: 'Invest',
    watchEarn: 'Watch & Earn',
    tradeQtxCoin: 'Trade QTX Coin',
    buySellQtx: 'Buy & Sell QTX',
    withdrawableBalance: 'Withdrawable Balance',
    qtxHoldings: 'QTX Holdings',
    livePlatformActivity: 'Live Platform Activity',
    userDesc: 'User',
    weeklyEarningsOverview: 'Weekly Earnings Overview (Last 7 Days)',
    dailyPerformanceBreakdown: '📅 Daily performance breakdown',
    yearOverYearGrowth: 'Year-over-Year Growth',
    annualPerformanceComparison: '📊 Annual performance comparison',
    dailyEarnings: 'Daily Earnings',
    transactionCount: 'Transaction Count',
    annualEarnings: 'Annual Earnings',
    growthRate: 'Growth Rate (%)',
  },

  pt: {`;

const ptInsert = `
    invest: 'Investir',
    watchEarn: 'Assistir e Ganhar',
    tradeQtxCoin: 'Negociar QTX Coin',
    buySellQtx: 'Comprar & Vender QTX',
    withdrawableBalance: 'Saldo de Levantamento',
    qtxHoldings: 'Ativos QTX',
    livePlatformActivity: 'Atividade da Plataforma',
    userDesc: 'Usuário',
    weeklyEarningsOverview: 'Visão Geral de Lucros (Últimos 7 Dias)',
    dailyPerformanceBreakdown: '📅 Resumo de desempenho diário',
    yearOverYearGrowth: 'Crescimento Ano-a-Ano',
    annualPerformanceComparison: '📊 Comparação de desempenho anual',
    dailyEarnings: 'Ganhos Diários',
    transactionCount: 'Nº Transações',
    annualEarnings: 'Ganhos Anuais',
    growthRate: 'Taxa de Cresc. (%)',
  },
};`;

contextStr = contextStr.replace(/  },[\s\n]*pt: {/, enInsert);
contextStr = contextStr.replace(/  \},[\s\n]*\};[\s\n]*const LanguageContext/, ptInsert + '\n\nconst LanguageContext');
fs.writeFileSync(contextPath, contextStr);

// Dashboard.jsx
const dashPath = 'src/pages/Dashboard.jsx';
let dashStr = fs.readFileSync(dashPath, 'utf8');
dashStr = dashStr.replace('<Wallet size={14} color="#f5d98b" /> Withdrawable Balance', "<Wallet size={14} color=\"#f5d98b\" /> {t('withdrawableBalance')}");
dashStr = dashStr.replace('<span style={{ color: \'var(--text-secondary)\' }}>QTX Holdings</span>', "<span style={{ color: 'var(--text-secondary)' }}>{t('qtxHoldings')}</span>");
dashStr = dashStr.replace("{ icon: <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}><Coins size={14} color=\"var(--primary)\" /><Gem size={14} color=\"#a855f7\" /></div>, label: 'Invest', path: '/wealth' }", "{ icon: <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}><Coins size={14} color=\"var(--primary)\" /><Gem size={14} color=\"#a855f7\" /></div>, label: t('invest'), path: '/wealth' }");
dashStr = dashStr.replace("{ icon: <Crown size={18} color=\"var(--warning)\" />, label: 'VIP Bots', path: '/vip' }", "{ icon: <Crown size={18} color=\"var(--warning)\" />, label: t('vipBots'), path: '/vip' }");
dashStr = dashStr.replace("{ icon: <Film size={18} color=\"#ef4444\" />, label: 'Watch & Earn', path: '/movies' }", "{ icon: <Film size={18} color=\"#ef4444\" />, label: t('watchEarn'), path: '/movies' }");
dashStr = dashStr.replace("<strong style={{ fontSize: '12px', display: 'block', marginBottom: '2px', color: 'var(--text-primary)' }}>Trade QTX Coin</strong>", "<strong style={{ fontSize: '12px', display: 'block', marginBottom: '2px', color: 'var(--text-primary)' }}>{t('tradeQtxCoin')}</strong>");
dashStr = dashStr.replace("<small style={{ color: 'var(--success)', fontSize: '10px' }}>Buy \\u0026 Sell QTX</small>", "<small style={{ color: 'var(--success)', fontSize: '10px' }}>{t('buySellQtx')}</small>");
fs.writeFileSync(dashPath, dashStr);

// LiveTransactions.jsx
const livePath = 'src/components/LiveTransactions.jsx';
let liveStr = fs.readFileSync(livePath, 'utf8');
// inject useLanguage
if (!liveStr.includes('useLanguage')) {
  liveStr = liveStr.replace("import { useCurrency } from '../hooks/useCurrency';", "import { useCurrency } from '../hooks/useCurrency';\nimport { useLanguage } from '../contexts/LanguageContext';");
  liveStr = liveStr.replace("const { formatCurrency } = useCurrency();", "const { formatCurrency } = useCurrency();\n  const { t } = useLanguage();");
}
liveStr = liveStr.replace("Live Platform Activity", "{t('livePlatformActivity')}");
liveStr = liveStr.replace("User ***{tx.userId}", "{t('userDesc')} ***{tx.userId}");
fs.writeFileSync(livePath, liveStr);

// DashboardCharts.jsx
const chartsPath = 'src/components/DashboardCharts.jsx';
let chartsStr = fs.readFileSync(chartsPath, 'utf8');
if (!chartsStr.includes('useLanguage')) {
  chartsStr = chartsStr.replace("import { useCurrency } from '../hooks/useCurrency';", "import { useCurrency } from '../hooks/useCurrency';\nimport { useLanguage } from '../contexts/LanguageContext';");
  chartsStr = chartsStr.replace("const { symbol, formatCurrency, convertAndFormatCurrency } = useCurrency();", "const { symbol, formatCurrency, convertAndFormatCurrency } = useCurrency();\n  const { t } = useLanguage();");
}
chartsStr = chartsStr.replace("Weekly Earnings Overview (Last 7 Days)", "{t('weeklyEarningsOverview')}");
chartsStr = chartsStr.replace("📅 Daily performance breakdown", "{t('dailyPerformanceBreakdown')}");
chartsStr = chartsStr.replace("Year-over-Year Growth", "{t('yearOverYearGrowth')}");
chartsStr = chartsStr.replace("📊 Annual performance comparison", "{t('annualPerformanceComparison')}");
chartsStr = chartsStr.replace("label: `Daily Earnings (${symbol})`,", "label: `${t('dailyEarnings')} (${symbol})`,");
chartsStr = chartsStr.replace('label: "Transaction Count",', "label: t('transactionCount'),");
chartsStr = chartsStr.replace("label: `Annual Earnings (${symbol})`,", "label: `${t('annualEarnings')} (${symbol})`,");
chartsStr = chartsStr.replace('label: "Growth Rate (%)",', "label: t('growthRate'),");
fs.writeFileSync(chartsPath, chartsStr);
