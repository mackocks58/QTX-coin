import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, Clock, XCircle, ArrowDownLeft, ArrowUpRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

export const Transactions = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const { formatCurrency, isTZ, symbol } = useCurrency();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [now, setNow] = useState(Date.now());
  const receiptRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: '#1e293b' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`QTX Coin_Receipt_${selectedTx.txid || selectedTx.id}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
    setDownloading(false);
  };

  // Real-time clock for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch transactions
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'users', currentUser.uid, 'transactions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [currentUser]);

  // Expiration logic for pending transactions
  useEffect(() => {
    if (!currentUser || transactions.length === 0) return;
    
    transactions.forEach(async (tx) => {
      if (tx.status === 'pending' && tx.createdAt && tx.type === 'deposit') {
        const createdAtMs = tx.createdAt.toDate ? tx.createdAt.toDate().getTime() : Date.now();
        const expiryTime = createdAtMs + 15 * 60 * 1000; // 15 mins
        
        if (now >= expiryTime) {
          try {
            await updateDoc(doc(db, 'users', currentUser.uid, 'transactions', tx.id), {
              status: 'failed',
              failedAt: serverTimestamp(),
              failureReason: 'Verification timed out'
            });
          } catch (e) {
            console.error("Failed to update expired transaction", e);
          }
        }
      }
    });
  }, [now, transactions, currentUser]);

  const getRemainingTime = (tx) => {
    if (tx.status !== 'pending' || !tx.createdAt || tx.type !== 'deposit') return null;
    const createdAtMs = tx.createdAt.toDate ? tx.createdAt.toDate().getTime() : Date.now();
    const expiryTime = createdAtMs + 15 * 60 * 1000;
    const diff = expiryTime - now;
    return diff > 0 ? diff : 0;
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence mode="wait">
      {selectedTx ? (
        <motion.div 
          key="detailView"
          className="page-content"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', borderRadius: 'var(--radius-lg)', minHeight: '80vh', padding: '20px' }}
        >
          <button 
            onClick={() => setSelectedTx(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
          >
            {t('back')}
          </button>

          <div ref={receiptRef} style={{ background: 'var(--bg-panel)', padding: '20px', borderRadius: '16px' }}>
            <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              background: selectedTx.status === 'verified' || selectedTx.status === 'SUCCESS' ? '#2ecc71' : selectedTx.status === 'pending' ? '#f39c12' : '#e74c3c'
            }}>
              {selectedTx.status === 'verified' || selectedTx.status === 'SUCCESS' ? <CheckCircle2 size={28} color="white" /> : selectedTx.status === 'pending' ? <Clock size={28} color="white" /> : <XCircle size={28} color="white" />}
            </div>
            <p style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              {selectedTx.type === 'deposit' 
                ? (selectedTx.status === 'verified' || selectedTx.status === 'SUCCESS' ? t('receivedSuccessfully') : selectedTx.status === 'pending' ? t('depositPending') : t('depositFailed'))
                : (selectedTx.status === 'verified' || selectedTx.status === 'SUCCESS' ? t('receivedSuccessfully') : selectedTx.status === 'pending' ? t('withdrawalPending') : t('withdrawalFailed'))
              }
            </p>
            <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '4px 0', color: selectedTx.type === 'deposit' ? 'var(--success)' : 'var(--danger)' }}>
              {selectedTx.type === 'deposit' ? '+' : '-'}{formatCurrency(selectedTx.amount || selectedTx.expectedAmount || 0)}
            </div>
          </div>

          {/* First Card */}
          <div style={{ background: 'var(--bg-panel-hover)', padding: '10px 12px', borderRadius: '10px', marginTop: '12px', fontSize: '13px' }}>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>{t('from')}</div>
              <div style={{ wordBreak: 'break-all', color: 'var(--text-primary)', fontWeight: 500 }}>
                {selectedTx.type === 'withdrawal' ? 'QTX Coin System Wallet' : (selectedTx.from || 'Wallet Address (External)')}
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>{t('to')}</div>
              <div style={{ wordBreak: 'break-all', color: 'var(--text-primary)', fontWeight: 500 }}>
                {selectedTx.type === 'withdrawal' 
                  ? (selectedTx.accountDetails?.type === 'binance_id' 
                      ? `Binance Pay: ${selectedTx.accountDetails.binanceId}` 
                      : selectedTx.accountDetails?.type === 'crypto_address'
                        ? `${selectedTx.accountDetails.network}: ${selectedTx.accountDetails.address}`
                        : selectedTx.accountDetails?.type === 'mobile'
                          ? `${selectedTx.accountDetails.network}: ${selectedTx.accountDetails.accountNumber}`
                          : selectedTx.to || currentUser?.email)
                  : (selectedTx.to || currentUser?.email)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>{t('networkFee')}</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {selectedTx.type === 'withdrawal' ? '0.00 USDT (Covered by platform)' : (selectedTx.fee || '0.00000000 BNB')}
              </div>
            </div>
          </div>

          {/* Second Card with QR */}
          <div style={{ background: 'var(--bg-panel-hover)', padding: '10px 12px', borderRadius: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>
                  {selectedTx.type === 'withdrawal' ? t('trackingId') : t('txHash')}
                </div>
                <div style={{ wordBreak: 'break-all', color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'monospace', fontSize: '11px' }}>
                  {selectedTx.txid || selectedTx.id}
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>{t('status')}</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>
                  {selectedTx.status === 'verified' || selectedTx.status === 'SUCCESS' ? t('confirmed') : selectedTx.status}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>{t('time')}</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {selectedTx.createdAt?.toDate ? new Date(selectedTx.createdAt.toDate()).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'Just now'}
                </div>
              </div>
            </div>
            
            {(selectedTx.note && selectedTx.status === 'cancelled') && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '8px', color: 'var(--danger)', fontSize: '12px', fontWeight: 600 }}>
                {t('cancelReason') || 'Cancellation Reason'}: {selectedTx.note}
              </div>
            )}
            
            {(selectedTx.txid || selectedTx.type === 'withdrawal') && (
              <div style={{ width: '70px', height: '70px', flexShrink: 0, background: '#fff', padding: '3px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <QRCodeSVG 
                  value={selectedTx.txid ? `https://tronscan.org/#/transaction/${selectedTx.txid}` : `QTX Coin-WD-${selectedTx.id}`} 
                  size={62} 
                />
              </div>
            )}
          </div>
          </div>

          <button 
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '20px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {downloading ? t('generatingPdf') : t('downloadPdf')}
          </button>

          <div style={{ textAlign: 'center', fontSize: '11px', padding: '16px 0 0 0', color: '#888' }}>
            © {new Date().getFullYear()} QTX Coin. All rights reserved.
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="listView"
          className="page-content"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button 
              onClick={() => navigate(-1)}
              style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="mb-0">{t('transactionsTitle')}</h2>
          </div>
          
          <div className="panel" style={{ marginBottom: '80px' }}>
            {transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                {t('noTransactionsFound')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {transactions.map(tx => {
                  const remainingMs = getRemainingTime(tx);
                  
                  return (
                    <div 
                      key={tx.id} 
                      onClick={() => setSelectedTx(tx)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--transition)' }}
                      className="hover:shadow-sm"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {tx.type === 'deposit' ? <ArrowDownLeft color={tx.status === 'failed' ? 'var(--danger)' : 'var(--success)'} /> : <ArrowUpRight color="var(--danger)" />}
                        <div>
                          <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                            {tx.type} {tx.currency || 'USDT'}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                            {tx.createdAt?.toDate ? new Date(tx.createdAt.toDate()).toLocaleString() : 'Just now'}
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: tx.status === 'failed' ? 'var(--text-muted)' : tx.type === 'deposit' ? 'var(--success)' : 'var(--text-primary)' }}>
                          {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount || tx.expectedAmount || 0)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                            {tx.status === 'verified' || tx.status === 'SUCCESS' ? (
                              <><CheckCircle2 size={14} color="var(--success)" /><span className="text-success">{t('verified')}</span></>
                            ) : tx.status === 'pending' ? (
                              <><Clock size={14} color="var(--warning)" /><span style={{ color: 'var(--warning)' }}>{t('pending')}</span></>
                            ) : (
                              <><XCircle size={14} color="var(--danger)" /><span className="text-danger">{t('failed')}</span></>
                            )}
                          </div>
                          {tx.status === 'pending' && remainingMs !== null && remainingMs > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
                              {t('expiresLabel')} {formatTime(remainingMs)}
                            </div>
                          )}
                          {(tx.status === 'cancelled' || tx.status === 'failed') && tx.note && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600, marginTop: '2px', maxWidth: '140px', textAlign: 'right' }}>
                              {tx.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
