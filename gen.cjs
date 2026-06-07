const fs = require('fs');

const bots = [
  {level: 'VIP 1', name: 'QTX Coin Alpha', min: 10, max: 3000, pct: 5, img: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 2', name: 'QTX Coin Beta', min: 3000, max: 10000, pct: 7, img: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 3', name: 'QTX Coin Gamma', min: 10000, max: 30000, pct: 8, img: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 4', name: 'QTX Coin Delta', min: 30000, max: 60000, pct: 9, img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 5', name: 'QTX Coin Epsilon', min: 60000, max: 100000, pct: 10, img: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 6', name: 'QTX Coin Zeta', min: 100000, max: 200000, pct: 11, img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 7', name: 'QTX Coin Eta', min: 200000, max: 350000, pct: 11.5, img: 'https://images.unsplash.com/photo-1535378620166-273708d44e4c?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 8', name: 'QTX Coin Theta', min: 350000, max: 500000, pct: 12, img: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 9', name: 'QTX Coin Iota', min: 500000, max: 700000, pct: 12.5, img: 'https://images.unsplash.com/photo-1514575110897-1253ff7b2ccb?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 10', name: 'QTX Coin Kappa', min: 700000, max: 1000000, pct: 13, img: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 11', name: 'QTX Coin Lambda', min: 1000000, max: 2000000, pct: 14, img: 'https://images.unsplash.com/photo-1446776858070-70c3d5ed6758?auto=format&fit=crop&w=600&q=80'},
  {level: 'VIP 12', name: 'QTX Coin Omni', min: 2000000, max: 5000000, pct: 15, img: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=600&q=80'}
];

const rate = 64;

let out = '\n  <div class="plans-grid">\n';
for (const b of bots) {
  const minMt = b.min * rate;
  const maxMt = b.max * rate;
  
  const minFmt = b.min.toLocaleString('en-US');
  const maxFmt = b.max.toLocaleString('en-US');
  const minMtFmt = minMt.toLocaleString('en-US');
  const maxMtFmt = maxMt.toLocaleString('en-US');
  
  out += `    <!-- ${b.level} -->
    <div class="plan-card" style="padding: 10px;">
      <img src="${b.img}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);" />
      <div class="plan-name" style="font-size: 15px;">${b.name} <span style="font-size: 11px; background: linear-gradient(135deg, #d4af37, #f5d98b); color: #000; padding: 2px 6px; border-radius: 12px; margin-left: 5px; box-shadow: 0 2px 4px rgba(212,175,55,0.4);">${b.level}</span></div>
      <div class="plan-price" style="font-size: 13px; color: #475569; font-weight: normal; margin-top: 8px; line-height: 1.4;">
        <strong>Range:</strong> $${minFmt} - $${maxFmt} <br/>
        <span style="font-size: 11px; color: #94a3b8;">(${minMtFmt} MT - ${maxMtFmt} MT)</span>
      </div>
      <div class="plan-percent" style="color: #10b981; font-weight: 800; font-size: 15px; margin-top: 10px; background: rgba(16,185,129,0.1); padding: 5px; border-radius: 6px;">${b.pct}% Daily</div>
    </div>\n`;
}
out += '  </div>\n';

let content = fs.readFileSync('public/documentation.html', 'utf-8');
const target = 'for all active VIP Bots.</p>';
content = content.replace(target, target + out);
fs.writeFileSync('public/documentation.html', content);
