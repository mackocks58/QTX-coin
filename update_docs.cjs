const fs = require('fs');
let html = fs.readFileSync('public/documentation.html', 'utf8');

// ── Crypto Plans: update percentages + remove USD, keep MT only ──

// Dogecoin
html = html.replace('$15.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(960 MT)</span>', '960 MT');
html = html.replace('2.2% Diário / $0.33 (21 MT)', '6.25% Diário / 60 MT');

// Cardano
html = html.replace('$30.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(1,920 MT)</span>', '1,920 MT');
html = html.replace('3.0% Diário / $0.90 (58 MT)', '6.5% Diário / 125 MT');

// Polygon
html = html.replace('$60.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(3,840 MT)</span>', '3,840 MT');
html = html.replace('3.6% Diário / $2.16 (138 MT)', '7.0% Diário / 269 MT');

// XRP
html = html.replace('$150.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(9,600 MT)</span>', '9,600 MT');
html = html.replace('4.0% Diário / $6.00 (384 MT)', '7.5% Diário / 720 MT');

// Chainlink
html = html.replace('$300.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(19,200 MT)</span>', '19,200 MT');
html = html.replace('5.0% Diário / $15.00 (960 MT)', '8.0% Diário / 1,536 MT');

// Polkadot
html = html.replace('$600.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(38,400 MT)</span>', '38,400 MT');
html = html.replace('6.0% Diário / $36.00 (2,304 MT)', '8.5% Diário / 3,264 MT');

// Avalanche
html = html.replace('$1,200.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(76,800 MT)</span>', '76,800 MT');
html = html.replace('7.0% Diário / $84.00 (5,376 MT)', '9.0% Diário / 6,912 MT');

// Solana
html = html.replace('$2,500.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(160,000 MT)</span>', '160,000 MT');
html = html.replace('8.0% Diário / $200.00 (12,800 MT)', '10.0% Diário / 16,000 MT');

// Ethereum
html = html.replace('$5,000.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(320,000 MT)</span>', '320,000 MT');
html = html.replace('9.0% Diário / $450.00 (28,800 MT)', '11.0% Diário / 35,200 MT');

// Bitcoin
html = html.replace('$10,000.00 <span style="color: #64748b; font-size: 13px; font-weight: normal;">(640,000 MT)</span>', '640,000 MT');
html = html.replace('10.0% Diário / $1,000.00 (64,000 MT)', '12.0% Diário / 76,800 MT');


// ── VIP Bots: remove USD ranges, keep MT only ──

// VIP 1
html = html.replace('<strong>Intervalo:</strong> $10 - $3,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(640 MT - 192,000 MT)</span>', '<strong>Intervalo:</strong> 640 MT - 192,000 MT');

// VIP 2
html = html.replace('<strong>Intervalo:</strong> $3,000 - $10,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(192,000 MT - 640,000 MT)</span>', '<strong>Intervalo:</strong> 192,000 MT - 640,000 MT');

// VIP 3
html = html.replace('<strong>Intervalo:</strong> $10,000 - $30,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(640,000 MT - 1,920,000 MT)</span>', '<strong>Intervalo:</strong> 640,000 MT - 1,920,000 MT');

// VIP 4
html = html.replace('<strong>Intervalo:</strong> $30,000 - $60,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(1,920,000 MT - 3,840,000 MT)</span>', '<strong>Intervalo:</strong> 1,920,000 MT - 3,840,000 MT');

// VIP 5
html = html.replace('<strong>Intervalo:</strong> $60,000 - $100,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(3,840,000 MT - 6,400,000 MT)</span>', '<strong>Intervalo:</strong> 3,840,000 MT - 6,400,000 MT');

// VIP 6
html = html.replace('<strong>Intervalo:</strong> $100,000 - $200,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(6,400,000 MT - 12,800,000 MT)</span>', '<strong>Intervalo:</strong> 6,400,000 MT - 12,800,000 MT');

// VIP 7
html = html.replace('<strong>Intervalo:</strong> $200,000 - $350,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(12,800,000 MT - 22,400,000 MT)</span>', '<strong>Intervalo:</strong> 12,800,000 MT - 22,400,000 MT');

// VIP 8
html = html.replace('<strong>Intervalo:</strong> $350,000 - $500,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(22,400,000 MT - 32,000,000 MT)</span>', '<strong>Intervalo:</strong> 22,400,000 MT - 32,000,000 MT');

// VIP 9
html = html.replace('<strong>Intervalo:</strong> $500,000 - $700,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(32,000,000 MT - 44,800,000 MT)</span>', '<strong>Intervalo:</strong> 32,000,000 MT - 44,800,000 MT');

// VIP 10
html = html.replace('<strong>Intervalo:</strong> $700,000 - $1,000,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(44,800,000 MT - 64,000,000 MT)</span>', '<strong>Intervalo:</strong> 44,800,000 MT - 64,000,000 MT');

// VIP 11
html = html.replace('<strong>Intervalo:</strong> $1,000,000 - $2,000,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(64,000,000 MT - 128,000,000 MT)</span>', '<strong>Intervalo:</strong> 64,000,000 MT - 128,000,000 MT');

// VIP 12
html = html.replace('<strong>Intervalo:</strong> $2,000,000 - $5,000,000 <br/>\n        <span style="font-size: 11px; color: #94a3b8;">(128,000,000 MT - 320,000,000 MT)</span>', '<strong>Intervalo:</strong> 128,000,000 MT - 320,000,000 MT');

// ── Spin Wheel section: replace USD amounts with MT ──
html = html.replace('1.000$', '64,000 MT');
html = html.replace('10$ a 100$', '640 MT a 6,400 MT');

fs.writeFileSync('public/documentation.html', html);
console.log('Done! Documentation updated.');
