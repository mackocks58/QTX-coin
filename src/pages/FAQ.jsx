import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, ChevronLeft, Globe, Bot, Wallet, CreditCard, UserPlus, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FAQ_DATA } from '../data/faqContent';

// Map icon strings to actual Lucide components
const IconMap = {
  Globe, Bot, Wallet, CreditCard, UserPlus, HelpCircle
};

export const FAQ = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (categoryId, itemIndex) => {
    const key = `${categoryId}-${itemIndex}`;
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter logic
  const filteredData = FAQ_DATA.map(category => {
    const filteredItems = category.items.filter(item => 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return { ...category, items: filteredItems };
  }).filter(category => category.items.length > 0);

  // Images to interleave
  const images = [
    { src: '/logo.png', alt: 'FINTEX Logo', style: { height: '80px', objectFit: 'contain' } },
    { src: '/images/bot.png', alt: 'AI Trading Bot', style: { width: '100%', borderRadius: '12px', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', border: '1px solid var(--primary)' } },
    { src: '/images/wallet.png', alt: 'Secure Global Wallet', style: { width: '100%', borderRadius: '12px', boxShadow: '0 4px 15px rgba(212,175,55,0.3)', border: '1px solid var(--warning)' } }
  ];

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ padding: '16px', paddingBottom: '80px' }}
    >
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>Comprehensive FAQ</h2>
      </div>

      {/* SEARCH BAR */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <input 
          type="text" 
          placeholder="Search for answers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px 16px 12px 40px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
          }}
        />
        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
      </div>

      {/* CONTENT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {filteredData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <HelpCircle size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <p>No answers found for "{searchTerm}". Please try a different keyword.</p>
          </div>
        ) : (
          filteredData.map((category, catIdx) => {
            const IconComponent = IconMap[category.icon] || Globe;
            
            return (
              <React.Fragment key={catIdx}>
                {/* Interleave Image */}
                {catIdx > 0 && catIdx <= images.length && searchTerm === '' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{ margin: '8px 0', display: 'flex', justifyContent: 'center' }}
                  >
                    <img src={images[catIdx - 1].src} alt={images[catIdx - 1].alt} style={images[catIdx - 1].style} />
                  </motion.div>
                )}

                <div style={{ background: 'var(--bg-panel)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                  {/* Category Header */}
                  <div style={{ padding: '16px', background: 'var(--bg-dark)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconComponent size={18} color="var(--primary)" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{category.category}</h3>
                  </div>

                  {/* Accordion Items */}
                  <div>
                    {category.items.map((item, itemIdx) => {
                      const isOpen = openItems[`${catIdx}-${itemIdx}`];
                      return (
                        <div key={itemIdx} style={{ borderBottom: itemIdx !== category.items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                          <button 
                            onClick={() => toggleItem(catIdx, itemIdx)}
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: 'none',
                              padding: '16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                              textAlign: 'left'
                            }}
                          >
                            <span style={{ fontSize: '13px', fontWeight: 500, paddingRight: '16px', lineHeight: '1.4' }}>{item.question}</span>
                            <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                              <ChevronDown size={16} color="var(--text-muted)" />
                            </motion.div>
                          </button>
                          
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div style={{ 
                                  padding: '0 16px 16px 16px', 
                                  color: 'var(--text-secondary)', 
                                  fontSize: '12px', 
                                  lineHeight: '1.7',
                                  whiteSpace: 'pre-line' // Important for paragraphs
                                }}>
                                  {item.answer}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>
      
      {/* Final Image if there are more images than categories */}
      {searchTerm === '' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ margin: '32px 0 16px 0', display: 'flex', justifyContent: 'center' }}
        >
          <img src={images[2].src} alt={images[2].alt} style={images[2].style} />
        </motion.div>
      )}

    </motion.div>
  );
};
