import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collectionGroup, collection, query, where, orderBy, getDocs, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, CheckCircle2, XCircle, Trash2, Copy, Send, Activity, Users, ArrowDownToLine, ArrowUpFromLine, LayoutDashboard, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const Admin = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [stats, setStats] = useState({ totalUsers: 0, totalDeposits: 0, totalWithdrawals: 0 });
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'dashboard') fetchStats();
      if (activeTab === 'withdrawals') fetchWithdrawals();
      if (activeTab === 'deposits') fetchDeposits();
      if (activeTab === 'users') fetchUsersList();
    }
  }, [isAdmin, activeTab]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const depsSnap = await getDocs(query(collectionGroup(db, 'transactions'), where('type', '==', 'deposit')));
      const withsSnap = await getDocs(query(collectionGroup(db, 'transactions'), where('type', '==', 'withdrawal')));

      let tDeps = 0;
      depsSnap.forEach(d => { 
        if(d.data().status === 'SUCCESS' || d.data().status === 'success') {
          tDeps += (d.data().amount || d.data().expectedAmount || 0);
        }
      });
      
      let tWiths = 0;
      withsSnap.forEach(d => { 
        if(d.data().status === 'SUCCESS' || d.data().status === 'success') {
          tWiths += (d.data().amount || 0);
        }
      });

      setStats({ totalUsers: usersSnap.size, totalDeposits: tDeps, totalWithdrawals: tWiths });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load stats');
    }
    setLoading(false);
  };

  const fetchUsersList = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const data = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(data);
    } catch (error) {
      toast.error('Failed to load users');
    }
    setLoading(false);
  };

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const q = query(
        collectionGroup(db, 'transactions'),
        where('type', '==', 'deposit'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const userRef = doc.ref.parent.parent;
        return {
          id: doc.id,
          userId: userRef ? userRef.id : 'unknown',
          ref: doc.ref,
          ...doc.data()
        };
      });
      setDeposits(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load deposits');
    }
    setLoading(false);
  };

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const q = query(
        collectionGroup(db, 'transactions'),
        where('type', '==', 'withdrawal'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const userRef = doc.ref.parent.parent;
        return {
          id: doc.id,
          userId: userRef ? userRef.id : 'unknown',
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

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // Withdrawal Handlers
  const handleApproveWithdrawal = async (withdrawal) => {
    try {
      await updateDoc(withdrawal.ref, { status: 'SUCCESS' });
      toast.success('Withdrawal Approved');
      setWithdrawals(prev => prev.map(w => w.id === withdrawal.id ? { ...w, status: 'SUCCESS' } : w));
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleRejectWithdrawal = async (withdrawal) => {
    const confirmReject = window.confirm('Are you sure you want to reject this and refund the user?');
    if (!confirmReject) return;
    try {
      await updateDoc(withdrawal.ref, { status: 'failed', failureReason: 'Rejected by Admin' });
      const userRef = doc(db, 'users', withdrawal.userId);
      await updateDoc(userRef, { balance: increment(withdrawal.amount) });
      toast.success('Rejected and refunded successfully');
      setWithdrawals(prev => prev.map(w => w.id === withdrawal.id ? { ...w, status: 'failed' } : w));
    } catch (error) {
      toast.error('Failed to reject');
    }
  };

  const handleDeleteWithdrawal = async (withdrawal) => {
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

  // Deposit Handlers
  const handleApproveDeposit = async (deposit) => {
    try {
      const amount = deposit.expectedAmount || deposit.amount || 0;
      await updateDoc(deposit.ref, { status: 'SUCCESS', amount: amount });
      const userRef = doc(db, 'users', deposit.userId);
      await updateDoc(userRef, { balance: increment(amount) });
      toast.success('Deposit Approved and Credited');
      setDeposits(prev => prev.map(d => d.id === deposit.id ? { ...d, status: 'SUCCESS', amount: amount } : d));
    } catch (error) {
      toast.error('Failed to approve deposit');
    }
  };

  const handleRejectDeposit = async (deposit) => {
    const confirmReject = window.confirm('Are you sure you want to reject this deposit?');
    if (!confirmReject) return;
    try {
      await updateDoc(deposit.ref, { status: 'failed', failureReason: 'Rejected by Admin' });
      toast.success('Deposit Rejected');
      setDeposits(prev => prev.map(d => d.id === deposit.id ? { ...d, status: 'failed' } : d));
    } catch (error) {
      toast.error('Failed to reject deposit');
    }
  };


  if (!currentUser) return <div className="p-4 text-center">Please login</div>;
  
  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', textAlign: 'center' }}>
        <ShieldAlert size={64} color="var(--danger)" style={{ marginBottom: '16px' }} />
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>You do not have administrative privileges to view this page.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '20px' }}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
        background: activeTab === id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        border: 'none',
        borderLeft: activeTab === id ? '3px solid var(--primary)' : '3px solid transparent',
        color: activeTab === id ? 'var(--primary)' : 'var(--text-secondary)',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: '14px',
        fontWeight: activeTab === id ? 600 : 400,
        transition: 'all 0.2s'
      }}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', background: 'var(--bg-dark)' }}>
      {/* Admin Sidebar */}
      <div style={{ width: '250px', background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ padding: '0 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} color="var(--danger)" />
          <h2 style={{ fontSize: '16px', margin: 0, color: 'var(--danger)', fontWeight: 600 }}>Admin Portal</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <TabButton id="dashboard" icon={LayoutDashboard} label="Overview" />
          <TabButton id="users" icon={Users} label="Users Management" />
          <TabButton id="deposits" icon={ArrowDownToLine} label="Deposits" />
          <TabButton id="withdrawals" icon={ArrowUpFromLine} label="Withdrawals" />
        </div>
      </div>

      {/* Admin Content Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div>
                <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LayoutDashboard size={20} color="var(--primary)" /> Dashboard Overview
                </h2>
                {loading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading stats...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div className="panel" style={{ padding: '20px', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <Users size={24} color="var(--primary)" />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.totalUsers}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Users</div>
                    </div>
                    <div className="panel" style={{ padding: '20px', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <ArrowDownToLine size={24} color="var(--success)" />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>${stats.totalDeposits.toFixed(2)}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Verified Deposits</div>
                    </div>
                    <div className="panel" style={{ padding: '20px', textAlign: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <ArrowUpFromLine size={24} color="var(--danger)" />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>${stats.totalWithdrawals.toFixed(2)}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Verified Withdrawals</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="var(--primary)" /> User Management
                  </h2>
                  <button onClick={fetchUsersList} className="btn" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} /> Refresh
                  </button>
                </div>
                {loading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</div>
                ) : (
                  <div className="panel" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>User ID</th>
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500 }}>Main Bal.</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500 }}>Mining Bal.</th>
                            <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>Country</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                                {u.id.substring(0, 8)}... <Copy size={12} style={{cursor: 'pointer', color: 'var(--primary)'}} onClick={() => handleCopy(u.id)} />
                              </td>
                              <td style={{ padding: '12px' }}>{u.email}</td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>${(u.balance || 0).toFixed(2)}</td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#d4af37' }}>${(u.miningBalance || 0).toFixed(2)}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>{u.country || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DEPOSITS TAB */}
            {activeTab === 'deposits' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowDownToLine size={20} color="var(--success)" /> Deposits
                  </h2>
                  <button onClick={fetchDeposits} className="btn" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} /> Refresh
                  </button>
                </div>
                {loading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading deposits...</div>
                ) : deposits.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No deposits found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {deposits.map(d => (
                      <div key={d.id} className="panel" style={{ border: `1px solid ${d.status === 'pending' ? 'var(--warning)' : 'var(--border)'}`, padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>User ID</div>
                            <div style={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                              {d.userId} <Copy size={12} style={{cursor: 'pointer'}} onClick={() => handleCopy(d.userId)} />
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>${(d.expectedAmount || d.amount || 0).toFixed(2)}</div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: d.status === 'pending' ? 'var(--warning)' : d.status === 'SUCCESS' ? 'var(--success)' : 'var(--danger)' }}>
                              {d.status}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>TXID: </span>
                            <span style={{ fontFamily: 'monospace' }}>{d.txid}</span>
                          </div>
                          <Copy size={14} style={{cursor: 'pointer', color: 'var(--primary)'}} onClick={() => handleCopy(d.txid)} />
                        </div>
                        {d.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleApproveDeposit(d)} style={{ flex: 1, padding: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                              <CheckCircle2 size={16} /> Approve & Credit
                            </button>
                            <button onClick={() => handleRejectDeposit(d)} style={{ flex: 1, padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                              <XCircle size={16} /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WITHDRAWALS TAB */}
            {activeTab === 'withdrawals' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowUpFromLine size={20} color="var(--danger)" /> Withdrawals
                  </h2>
                  <button onClick={fetchWithdrawals} className="btn" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} /> Refresh
                  </button>
                </div>
                {loading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading withdrawals...</div>
                ) : withdrawals.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No withdrawals found.</div>
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
                            <div style={{ color: 'var(--text-muted)' }}>No specific account details attached.</div>
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
                                onClick={() => handleApproveWithdrawal(w)}
                                style={{ flex: 1, background: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)', border: '1px solid rgba(46, 204, 113, 0.2)', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                              >
                                <CheckCircle2 size={16} /> Approve
                              </button>
                              <button 
                                onClick={() => handleRejectWithdrawal(w)}
                                style={{ flex: 1, background: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)', border: '1px solid rgba(231, 76, 60, 0.2)', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                              >
                                <XCircle size={16} /> Reject (Refund)
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleDeleteWithdrawal(w)}
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
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
