import React from 'react';
import { motion } from 'framer-motion';
import { Building, Shield, Globe, Cpu, Users, Target, BookOpen, Award, Zap, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const About = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '16px', paddingBottom: '80px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={22} color="var(--primary)" />
          <h2 style={{ fontSize: '20px', margin: 0 }}>About FINTEX AI</h2>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', height: '200px' }}>
        <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80" alt="Corporate Building" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-panel) 0%, transparent 100%)' }} />
        <div style={{ position: 'absolute', bottom: '16px', left: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#fff', fontWeight: 800 }}>Pioneering the Future of Automated Trading</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--primary)', fontWeight: 600 }}>Empowering Investors Worldwide</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Section 1: Introduction */}
        <section style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Target size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Our Mission & Vision</h3>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            <p>
              Welcome to FINTEX AI, the world's most advanced and comprehensive automated algorithmic trading platform. Founded on the principle that institutional-grade financial technology should be accessible to everyone, our platform democratizes access to high-frequency trading (HFT) environments, quantitative analysis, and artificial intelligence-driven asset management.
            </p>
            <p>
              Our vision is to entirely bridge the gap between retail investors and Wall Street. For decades, the most lucrative investment opportunities and sophisticated trading algorithms have been locked behind the closed doors of massive hedge funds, requiring millions of dollars in capital just to gain entry. FINTEX AI changes this paradigm. By pooling resources and utilizing ultra-scalable cloud computing infrastructure, we allow users to activate powerful, distinct trading bots—ranging from our introductory VIP 1 tier to the monumental VIP 12 Omni bot—tailored exactly to their risk appetite and financial goals.
            </p>
            <p>
              We believe in absolute transparency, unwavering security, and consistent results. When you activate a FINTEX, you are not simply guessing on market movements; you are deploying a relentlessly optimized piece of software that analyzes thousands of market variables per second. It works 24 hours a day, 7 days a week, 365 days a year, ensuring that your capital is continuously working for you while you sleep.
            </p>
          </div>
        </section>

        {/* Section 2: The Technology */}
        <section style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Cpu size={18} color="var(--warning)" />
            <h3 style={{ margin: 0, fontSize: '16px' }}>The Technology Behind FINTEX</h3>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            <p>
              At the core of our platform lies the FINTEX Quantum Engine, a proprietary AI architecture developed by a global team of data scientists, financial analysts, and ex-institutional traders. This engine is designed to ingest massive amounts of unstructured financial data—including real-time price feeds across global exchanges, macroeconomic indicators, geopolitical news sentiment, and on-chain metrics for digital assets.
            </p>
            <p>
              <strong>Machine Learning & Neural Networks:</strong> The engine utilizes deep reinforcement learning. It does not follow simple "if-this-then-that" rules. Instead, it continuously learns from market conditions. Every trade it executes, whether successful or not, feeds back into the neural network, refining its predictive capabilities. This means that FINTEX gets smarter with every passing millisecond.
            </p>
            <p>
              <strong>High-Frequency Execution:</strong> Speed is the ultimate currency in modern financial markets. Our servers are co-located in prime data centers in New York, London, Tokyo, and Frankfurt, directly adjacent to major stock and digital asset exchanges. This proximity reduces latency to micro-seconds, allowing our bots to execute arbitrage opportunities and micro-trades before the broader market even registers a price change.
            </p>
            <p>
              <strong>Risk Management Protocol:</strong> Generating high returns is only half the equation; preserving capital is the other. Every VIP bot operates under a strict, unalterable risk management protocol. Stop-losses are dynamically adjusted in real-time, and portfolio exposure is automatically hedged against extreme market volatility. This is how we are able to confidently guarantee the daily return ranges across our VIP tiers.
            </p>
          </div>
        </section>

        {/* Section 3: Global Reach */}
        <section style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Globe size={18} color="var(--success)" />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Global Presence & Compliance</h3>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            <p>
              FINTEX AI operates on a truly global scale. We proudly serve over 2.5 million active users across more than 150 countries. Our platform is fully localized, supporting multiple languages and region-specific payment gateways to ensure a frictionless experience regardless of where our users reside.
            </p>
            <p>
              <strong>Regulatory Compliance:</strong> Operating in the global financial sector requires rigorous adherence to international laws. FINTEX AI maintains strict compliance with Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations. We work closely with financial regulatory bodies in key jurisdictions to ensure that our operations are entirely transparent and legally sound. Our commitment to compliance protects not only our platform but, more importantly, the capital of our investors.
            </p>
            <p>
              <strong>Global Server Infrastructure:</strong> To support a user base that spans the globe, we employ a decentralized server architecture utilizing cutting-edge edge computing. This ensures that the user interface remains lightning-fast and highly responsive, whether you are logging in from a metropolis in Asia or a remote town in South America. Total uptime for our platform over the past 24 months has been an industry-leading 99.99%.
            </p>
          </div>
        </section>

        {/* Section 4: Security */}
        <section style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Shield size={18} color="#f43f5e" />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Uncompromising Security</h3>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            <p>
              When dealing with personal wealth, security is not a feature; it is the absolute foundation. We have implemented a multi-layered security architecture that rivals that of top-tier international banks. 
            </p>
            <p>
              <strong>Military-Grade Encryption:</strong> All user data, both at rest and in transit, is encrypted using AES-256 bit encryption protocols. Communication between your device and our servers occurs exclusively over secure, TLS 1.3 encrypted channels, making interception by malicious actors virtually impossible.
            </p>
            <p>
              <strong>Cold Storage & Asset Segregation:</strong> The vast majority of user funds are held in multi-signature, geographically distributed cold storage wallets. These wallets are completely disconnected from the internet, rendering them immune to online hacking attempts. Only a small fraction of capital necessary for daily high-frequency trading and user withdrawals is kept in hot wallets.
            </p>
            <p>
              <strong>Automated Security Monitoring:</strong> Our Security Operations Center (SOC) utilizes AI-driven anomaly detection to monitor all platform activity 24/7. Any unusual login attempts, suspicious withdrawal patterns, or potential DDoS attacks are instantly identified and mitigated before they can impact our users. This is also why every login to your account triggers an immediate security notification detailing the IP address and device used.
            </p>
          </div>
        </section>

        {/* Section 5: The VIP Bot Ecosystem */}
        <section style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Award size={18} color="#a855f7" />
            <h3 style={{ margin: 0, fontSize: '16px' }}>The VIP Bot Ecosystem</h3>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            <p>
              The cornerstone of our platform is the VIP Bot Marketplace. We understand that investors have different starting points and different long-term objectives. Therefore, we developed a tiered system consisting of 12 distinct AI bots, ranging from VIP 1 to VIP 12.
            </p>
            <p>
              <strong>Structured Progression:</strong> Our system is designed to allow users to start small, perhaps testing the waters with the FINTEX Alpha (VIP 1), and then reinvesting their daily profits to progressively upgrade to higher-yielding bots. The higher the VIP tier, the more sophisticated the underlying trading algorithms become, and the larger the capital pools they can access. This translates directly to higher guaranteed daily return percentages.
            </p>
            <p>
              <strong>365-Day Lifecycle & Daily Payouts:</strong> Every bot operates on a strict 365-day smart contract. The moment you activate a bot, the countdown begins. For an entire year, the bot will relentlessly execute trades and generate profits. These profits are not locked away; they are credited to your profit wallet every 24 hours. This daily payout cycle ensures that you have constant liquidity and complete control over your earnings, whether you choose to withdraw them immediately or compound them into new bot activations.
            </p>
          </div>
        </section>

        {/* Section 6: Gamified Rewards & Bonuses */}
        <section style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={18} color="var(--warning)" />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Gamified Rewards: The Lucky Spin</h3>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            <p>
              Beyond the predictable, steady income generated by our VIP bots and the lucrative 30% direct referral commissions, FINTEX AI strongly believes in sporadically rewarding our most active users through high-impact gamification. The crown jewel of this reward structure is the <strong>Lucky Spin Wheel</strong>.
            </p>
            <p>
              <strong>Instant Cash Injections:</strong> The Lucky Spin is not a typical lottery. It is a guaranteed reward mechanism. Users earn a chance to spin the wheel whenever they make a qualifying deposit of $1,000 or more, or whenever a direct referral of theirs makes a qualifying deposit. Every single spin guarantees an instant cash prize ranging from $10 to $100, credited directly to your withdrawable balance in real-time.
            </p>
            <p>
              This gamified layer ensures that while the AI algorithms are steadily compounding your wealth in the background, you also experience the immediate thrill of instant, substantial cash bonuses for your active participation in growing the FINTEX ecosystem.
            </p>
          </div>
        </section>

        {/* Section 7: Corporate Responsibility & Future */}
        <section style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Users size={18} color="#0ea5e9" />
            <h3 style={{ margin: 0, fontSize: '16px' }}>Our Community & The Road Ahead</h3>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.8 }}>
            <p>
              Beyond the code and the capital, FINTEX AI is fundamentally about people. We are incredibly proud of the global community of investors we have cultivated. Our lucrative Affiliate Program is a testament to our belief in collective growth; we reward our users generously for introducing new members to the platform, creating a network effect that benefits everyone involved.
            </p>
            <p>
              <strong>24/7 Support:</strong> We recognize that automated trading can seem complex. That is why we maintain a dedicated, multi-lingual customer support team available around the clock. Whether you have a question about a withdrawal, need assistance navigating the VIP tiers, or simply want to learn more about our security protocols, our team is always ready to assist.
            </p>
            <p>
              <strong>The Roadmap to 2030:</strong> The financial landscape is evolving at breakneck speed, and FINTEX AI is positioned at the very vanguard of this revolution. Our roadmap over the next several years includes the integration of quantum computing principles into our core AI engine, the expansion into decentralized finance (DeFi) liquidity provisioning, and the launch of our own proprietary blockchain network to further reduce transaction costs and increase transparency.
            </p>
            <p>
              We are not just adapting to the future of finance; we are actively building it. We invite you to activate a bot, join our community, and take absolute control of your financial destiny with FINTEX AI.
            </p>
          </div>
        </section>
        
        {/* Footer info */}
        <div style={{ textAlign: 'center', padding: '20px 0', borderTop: '1px solid var(--border)', marginTop: '10px' }}>
          <Building size={24} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
          <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>FINTEX AI Global Headquarters</h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Established 2020 • All Rights Reserved</p>
        </div>

      </div>
    </motion.div>
  );
};
