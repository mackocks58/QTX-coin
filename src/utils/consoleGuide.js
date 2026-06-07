import { FAQ_DATA } from '../data/faqContent';

export const initConsoleGuide = () => {
  // Wait a tiny bit for the console to be fully ready
  setTimeout(() => {
    // Top Header
    console.log(
      '%c🚀 QTX Coin AI - Platform Documentation & Guide 🚀', 
      'color: #10b981; font-size: 20px; font-weight: bold; background: #0f172a; padding: 10px 20px; border-radius: 8px;'
    );

    console.log('%c=============================================================', 'color: #a855f7; font-weight: bold;');

    // Section 1
    console.log(
      `%c[ABOUT] 1. Welcome to QTX Coin AI\n%cWelcome to QTX Coin AI, the world's most advanced automated algorithmic trading platform. Founded on the principle that institutional-grade financial technology should be accessible to everyone.`,
      'color: #0ea5e9; font-size: 16px; font-weight: bold; margin-top: 8px;',
      'color: #a3a3a3; font-size: 14px; margin-bottom: 20px;'
    );

    // Section 2
    console.log(
      `%c[ABOUT] 2. The Technology\n%cAt the core of our platform lies the QTX Coin Quantum Engine, a proprietary AI architecture. It utilizes deep reinforcement learning. Every trade it executes feeds back into the neural network, refining its predictive capabilities.`,
      'color: #10b981; font-size: 16px; font-weight: bold; margin-top: 8px;',
      'color: #a3a3a3; font-size: 14px; margin-bottom: 20px;'
    );

    // Section 3
    console.log(
      `%c[ABOUT] 3. Global Reach & Security\n%cQTX Coin AI operates on a truly global scale. We have implemented a multi-layered security architecture: Military-Grade AES-256 bit encryption, Cold Storage & Asset Segregation offline, and Automated Security Monitoring 24/7/365.`,
      'color: #f43f5e; font-size: 16px; font-weight: bold; margin-top: 8px;',
      'color: #a3a3a3; font-size: 14px; margin-bottom: 20px;'
    );

    // Section 4
    console.log(
      `%c[ABOUT] 4. 3-Tier Affiliate Commission\n%cEarn from the people you invite AND the people they invite up to 3 levels deep:\n- Level 1: 10%\n- Level 2: 3%\n- Level 3: 1%`,
      'color: #d4af37; font-size: 16px; font-weight: bold; margin-top: 8px;',
      'color: #a3a3a3; font-size: 14px; margin-bottom: 20px;'
    );

    // Section 5
    console.log(
      `%c[ABOUT] 5. Gamified Rewards (Lucky Spin)\n%cEarn a chance to spin the wheel whenever you make a qualifying deposit of $1,000 or more. Every spin guarantees an instant cash prize ranging from $10 to $100.`,
      'color: #a855f7; font-size: 16px; font-weight: bold; margin-top: 8px;',
      'color: #a3a3a3; font-size: 14px; margin-bottom: 20px;'
    );

    console.log('%c=============================================================', 'color: #a855f7; font-weight: bold;');
    console.log('%c[FAQ] Frequently Asked Questions', 'color: #f59e0b; font-size: 18px; font-weight: bold;');

    // Group FAQs
    FAQ_DATA.forEach((category) => {
      console.groupCollapsed(`%c📂 ${category.category}`, 'color: #d4af37; font-weight: bold; font-size: 14px; padding: 4px 0;');
      category.items.forEach((item) => {
        console.log(`%cQ: ${item.question}`, 'color: #f43f5e; font-weight: bold; font-size: 12px;');
        console.log(`%cA: ${item.answer}`, 'color: #a3a3a3; font-size: 12px; line-height: 1.5;');
        console.log('');
      });
      console.groupEnd();
    });

    console.log('%c=============================================================', 'color: #a855f7; font-weight: bold;');
  }, 500);
};
