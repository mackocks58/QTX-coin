import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collectionGroup, query, where, orderBy, getDocs, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, CheckCircle2, XCircle, Trash2, Copy, Send, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const Admin = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAIL = 'mackocks588@gmail.com';

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      // Query all transactions where type == withdrawal
      const q = query(
        collectionGroup(db, 'transactions'),
        where('type', '==', 'withdrawal'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        // collectionGroup returns doc.ref.parent.parent as the user doc
        const userRef = doc.ref.parent.parent;
        const userId = userRef ? userRef.id : 'unknown';
        return {
          id: doc.id,
          userId: userId,
          ref: doc.ref,
          ...doc.data()
        };
      });
      setWithdrawals(data);
    } catch (error) {
      console.error("Failed to fetch withdrawals:", error);
      if (error.code === 'permission-denied') {
        toast.error('Admin rules error. Have you updated your Firestore Rules for collectionGroup?', { duration: 5000 });
      } else if (error.code === 'failed-precondition') {
        toast.error('Index building required. Check the console error for the index link.', { duration: 5000 });
      } else {
        toast.error('Error loading withdrawals');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser && currentUser.email === ADMIN_EMAIL) {
      fetchWithdrawals();
    }
  }, [currentUser]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleApprove = async (withdrawal) => {
    try {
      await updateDoc(withdrawal.ref, {
        status: 'SUCCESS'
      });
      toast.success('Withdrawal Approved');
      setWithdrawals(prev => prev.map(w => w.id === withdrawal.id ? { ...w, status: 'SUCCESS' } : w));
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (withdrawal) => {
    const confirmReject = window.confirm('Are you sure you want to reject this and refund the user?');
    if (!confirmReject) return;

    try {
      // Update transaction status
      await updateDoc(withdrawal.ref, {
        status: 'failed',
        failureReason: 'Rejected by Admin'
      });

      // Refund the user balance
      const userRef = doc(db, 'users', withdrawal.userId);
      await updateDoc(userRef, {
        balance: increment(withdrawal.amount)
      });

      toast.success('Rejected and refunded successfully');
      setWithdrawals(prev => prev.map(w => w.id === withdrawal.id ? { ...w, status: 'failed' } : w));
    } catch (error) {
      toast.error('Failed to reject');
    }
  };

  const handleDelete = async (withdrawal) => {
    const confirmDelete = window.confirm('WARNING: This completely deletes the record. Proceed?');
    if (!confirmDelete) return;

    try {
      await deleteDoc(withdrawal.ref);
      toast.success('Record deleted');
      setWithdrawals(prev => prev.filter(w => w.id !== withdrawal.id));
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (!currentUser) return <div className="p-4 text-center">Please login</div>;
  
  if (currentUser.email !== ADMIN_EMAIL) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', textAlign: 'center' }}>
        <ShieldAlert size={64} color="var(--danger)" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>You do not have administrative privileges to view this page.</p>
        <button 
          onClick={() => navigate('/')} 
          className="btn btn-primary" 
          style={{ marginTop: '20px' }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      className="page-content"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '16px', paddingBottom: '80px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={24} color="var(--danger)" />
          <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--danger)' }}>Admin Panel</h2>
        </div>
        <button 
          onClick={fetchWithdrawals}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
        >
          <Activity size={14} /> Refresh
        </button>
      </div>

      <div style={{ background: 'var(--bg-panel)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Withdrawal Requests</h3>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : withdrawals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No withdrawals found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {withdrawals.map(w => (
              <div key={w.id} style={{ background: 'var(--bg-dark)', borderRadius: '8px', border: `1px solid ${w.status === 'pending' ? 'var(--warning)' : 'var(--border)'}`, overflow: 'hidden' }}>
                
                {/* Header */}
                <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>User ID:</span>
                    <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {w.userId.substring(0,8)}... <Copy size={12} style={{cursor: 'pointer'}} onClick={() => handleCopy(w.userId)} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>${w.amount?.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: w.status === 'pending' ? 'var(--warning)' : w.status === 'SUCCESS' ? 'var(--success)' : 'var(--danger)' }}>
                      {w.status}
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div style={{ padding: '12px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  {w.accountDetails ? (
                    <>
                      {w.accountDetails.type === 'binance_id' && (
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Binance Pay ID:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            {w.accountDetails.binanceId}
                            <button onClick={() => handleCopy(w.accountDetails.binanceId)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={14} /></button>
                          </div>
                        </div>
                      )}
                      {w.accountDetails.type === 'crypto_address' && (
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{w.accountDetails.network} Address:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, wordBreak: 'break-all' }}>
                            {w.accountDetails.address}
                            <button onClick={() => handleCopy(w.accountDetails.address)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={14} /></button>
                          </div>
                        </div>
                      )}
                      {w.accountDetails.type === 'mobile' && (
                        <div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{w.accountDetails.network} Mobile:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            {w.accountDetails.accountNumber} ({w.accountDetails.accountName})
                            <button onClick={() => handleCopy(w.accountDetails.accountNumber)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Copy size={14} /></button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted">No specific account details attached.</div>
                  )}
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Date: {w.createdAt?.toDate ? new Date(w.createdAt.toDate()).toLocaleString() : 'N/A'}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                  {w.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleApprove(w)}
                        style={{ flex: 1, background: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)', border: '1px solid rgba(46, 204, 113, 0.2)', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                      >
                        <CheckCircle2 size={16} /> Approve
                      </button>
                      <button 
                        onClick={() => handleReject(w)}
                        style={{ flex: 1, background: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)', border: '1px solid rgba(231, 76, 60, 0.2)', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                      >
                        <XCircle size={16} /> Reject (Refund)
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => handleDelete(w)}
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    title="Delete permanently"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
