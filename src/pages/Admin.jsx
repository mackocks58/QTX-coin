import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collectionGroup, collection, query, where, orderBy, getDocs, doc, updateDoc, increment, deleteDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, CheckCircle2, XCircle, Trash2, Copy, Send, Activity, Users, ArrowDownToLine, ArrowUpFromLine, LayoutDashboard, ChevronRight, Edit2, Save, X, Search, MessageSquare, Eye, Bell } from 'lucide-react';
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

  // Search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [depositSearchQuery, setDepositSearchQuery] = useState('');

  // Edit user state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ balance: 0, miningBalance: 0 });

  // Follow-up state
  const [followUpModal, setFollowUpModal] = useState({ isOpen: false, transaction: null, history: [], note: '', notificationMsg: '', loading: false });

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
      // First ensure we have users for cross-referencing emails
      let currentUsers = usersList;
      if (currentUsers.length === 0) {
        const usersSnap = await getDocs(collection(db, 'users'));
        currentUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsersList(currentUsers);
      }

      const q = query(
        collectionGroup(db, 'transactions'),
        where('type', '==', 'deposit'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const userRef = doc.ref.parent.parent;
        const uid = userRef ? userRef.id : 'unknown';
        const userObj = currentUsers.find(u => u.id === uid);
        return {
          id: doc.id,
          userId: uid,
          email: userObj ? userObj.email : 'Unknown',
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

  // User Handlers
  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({ balance: user.balance || 0, miningBalance: user.miningBalance || 0 });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        balance: parseFloat(editForm.balance) || 0,
        miningBalance: parseFloat(editForm.miningBalance) || 0
      });
      setUsersList(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, balance: parseFloat(editForm.balance) || 0, miningBalance: parseFloat(editForm.miningBalance) || 0 }
          : u
      ));
      toast.success('User updated successfully');
      setEditingUser(null);
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  // Follow Up Handlers
  const openFollowUp = async (transaction) => {
    setFollowUpModal({ isOpen: true, transaction, history: [], note: transaction.adminNote || '', notificationMsg: '', loading: true });
    try {
      const q = query(collection(db, 'users', transaction.userId, 'transactions'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const hist = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFollowUpModal(prev => ({ ...prev, history: hist, loading: false }));
    } catch (e) {
      console.error(e);
      setFollowUpModal(prev => ({ ...prev, loading: false }));
    }
  };

  const saveAdminNote = async () => {
    try {
      await updateDoc(followUpModal.transaction.ref, { adminNote: followUpModal.note });
      toast.success('Note saved securely');
      setDeposits(prev => prev.map(d => d.id === followUpModal.transaction.id ? { ...d, adminNote: followUpModal.note } : d));
    } catch (e) {
      toast.error('Failed to save note');
    }
  };

  const sendNotification = async () => {
    if (!followUpModal.notificationMsg) return;
    if (!followUpModal.transaction?.userId || followUpModal.transaction.userId === 'unknown') {
      toast.error('Cannot send notification: User ID is unknown');
      return;
    }
    
    try {
      const userRef = doc(db, 'users', followUpModal.transaction.userId);
      const uSnap = await getDoc(userRef);
      if(uSnap.exists()) {
        let notifs = uSnap.data().notifications;
        if (!Array.isArray(notifs)) {
          notifs = [];
        }
        
        const newNotif = {
          id: Date.now().toString(),
          type: 'system',
          title: 'Update regarding your transaction',
          message: followUpModal.notificationMsg,
          timestamp: new Date().toISOString(),
          read: false
        };
        await updateDoc(userRef, { notifications: [newNotif, ...notifs].slice(0, 30) });
        toast.success('Notification sent to user');
        setFollowUpModal(prev => ({ ...prev, notificationMsg: '' }));
      } else {
        toast.error('User document not found in database');
      }
    } catch (e) {
      console.error("Notification sending error:", e);
      toast.error(`Error: ${e.message}`);
    }
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

      // ── 3-Tier Affiliate Commission ──────────────────────────────────────
      const TIERS = [
        { pct: 0.10, label: 'Level 1 (Direct) Commission' },
        { pct: 0.03, label: 'Level 2 Commission' },
        { pct: 0.01, label: 'Level 3 Commission' },
      ];
      let currentUid = deposit.userId;
      for (let tier = 0; tier < TIERS.length; tier++) {
        const currentDoc = await getDoc(doc(db, 'users', currentUid));
        if (!currentDoc.exists()) break;
        const referredByCode = currentDoc.data().referredByCode;
        if (!referredByCode) break;

        const refSnap = await getDocs(query(collection(db, 'users'), where('referralCode', '==', referredByCode)));
        if (refSnap.empty) break;

        const referrerDoc = refSnap.docs[0];
        const referrerId = referrerDoc.id;
        const commission = parseFloat((amount * TIERS[tier].pct).toFixed(2));

        // Credit referrer balance
        await updateDoc(doc(db, 'users', referrerId), { balance: increment(commission) });

        // Write transaction record
        const { addDoc } = await import('firebase/firestore');
        await addDoc(collection(db, 'users', referrerId, 'transactions'), {
          type: 'affiliate_reward',
          title: TIERS[tier].label,
          amount: commission,
          fromUid: currentUid,
          status: 'SUCCESS',
          createdAt: new Date().toISOString(),
        });

        // Walk up the chain
        currentUid = referrerId;
      }
      // ─────────────────────────────────────────────────────────────────────

      // Lucky Spin: grant 1 chance if deposit >= 1000
      if (amount >= 1000) {
        await updateDoc(userRef, { spinChances: increment(1) });

        // Also grant the direct (L1) referrer a spin chance
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().referredByCode) {
          const refSnap = await getDocs(query(collection(db, 'users'), where('referralCode', '==', userDoc.data().referredByCode)));
          if (!refSnap.empty) {
            await updateDoc(doc(db, 'users', refSnap.docs[0].id), { spinChances: increment(1) });
          }
        }
      }

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

  // Filters
  const filteredUsers = usersList.filter(u => {
    if (!userSearchQuery) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.id?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.referralCode?.toLowerCase().includes(q)
    );
  });

  const filteredDeposits = deposits.filter(d => {
    if (!depositSearchQuery) return true;
    const q = depositSearchQuery.toLowerCase();
    const dateStr = d.createdAt?.toDate ? new Date(d.createdAt.toDate()).toLocaleDateString() : '';
    const amtStr = (d.expectedAmount || d.amount || 0).toString();
    return (
      d.txid?.toLowerCase().includes(q) ||
      d.userId?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      amtStr.includes(q) ||
      dateStr.includes(q)
    );
  });

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
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', position: 'relative' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="var(--primary)" /> User Management
                  </h2>
                  <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '400px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="text" 
                        placeholder="Search by Email, UID, or Ref Code..." 
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <button onClick={fetchUsersList} className="btn" style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={14} /> Refresh
                    </button>
                  </div>
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
                            <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Ref Code</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500 }}>Main Bal.</th>
                            <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500 }}>Mining Bal.</th>
                            <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>Country</th>
                            <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found matching "{userSearchQuery}"</td></tr>
                          ) : filteredUsers.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: editingUser?.id === u.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                              <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                                {u.id.substring(0, 8)}... <Copy size={12} style={{cursor: 'pointer', color: 'var(--primary)'}} onClick={() => handleCopy(u.id)} />
                              </td>
                              <td style={{ padding: '12px' }}>{u.email}</td>
                              <td style={{ padding: '12px', color: 'var(--primary)', fontFamily: 'monospace' }}>{u.referralCode}</td>
                              
                              {editingUser?.id === u.id ? (
                                <>
                                  <td style={{ padding: '12px', textAlign: 'right' }}>
                                    <input 
                                      type="number" 
                                      value={editForm.balance} 
                                      onChange={(e) => setEditForm({...editForm, balance: e.target.value})}
                                      style={{ width: '80px', padding: '4px 8px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: '#fff', borderRadius: '4px', textAlign: 'right' }}
                                    />
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'right' }}>
                                    <input 
                                      type="number" 
                                      value={editForm.miningBalance} 
                                      onChange={(e) => setEditForm({...editForm, miningBalance: e.target.value})}
                                      style={{ width: '80px', padding: '4px 8px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: '#fff', borderRadius: '4px', textAlign: 'right' }}
                                    />
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>{u.country || 'N/A'}</td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                      <button onClick={handleSaveUser} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Save size={14} /> Save
                                      </button>
                                      <button onClick={() => setEditingUser(null)} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <X size={14} /> Cancel
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>${(u.balance || 0).toFixed(2)}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#d4af37' }}>${(u.miningBalance || 0).toFixed(2)}</td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>{u.country || 'N/A'}</td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <button onClick={() => handleEditClick(u)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}>
                                      <Edit2 size={14} /> Edit
                                    </button>
                                  </td>
                                </>
                              )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowDownToLine size={20} color="var(--success)" /> Deposits
                  </h2>
                  <div style={{ display: 'flex', gap: '12px', flex: 1, maxWidth: '450px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        type="text" 
                        placeholder="Search TXID, Email, Amount, Date..." 
                        value={depositSearchQuery}
                        onChange={(e) => setDepositSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <button onClick={fetchDeposits} className="btn" style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={14} /> Refresh
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading deposits...</div>
                ) : filteredDeposits.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {depositSearchQuery ? `No deposits matching "${depositSearchQuery}"` : "No deposits found."}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredDeposits.map(d => (
                      <div key={d.id} className="panel" style={{ border: `1px solid ${d.status === 'pending' ? 'var(--warning)' : 'var(--border)'}`, padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>User ({d.email})</div>
                            <div style={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                              {d.userId} <Copy size={12} style={{cursor: 'pointer'}} onClick={() => handleCopy(d.userId)} />
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Date: {d.createdAt?.toDate ? new Date(d.createdAt.toDate()).toLocaleString() : 'N/A'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>${(d.expectedAmount || d.amount || 0).toFixed(2)}</div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: d.status === 'pending' ? 'var(--warning)' : d.status === 'SUCCESS' ? 'var(--success)' : 'var(--danger)' }}>
                              {d.status}
                            </div>
                            <button 
                              onClick={() => openFollowUp(d)}
                              style={{ marginTop: '8px', background: 'var(--primary)', border: 'none', padding: '4px 8px', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', float: 'right' }}
                            >
                              <MessageSquare size={12} /> Follow Up
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>TXID: </span>
                            <span style={{ fontFamily: 'monospace' }}>{d.txid}</span>
                          </div>
                          <Copy size={14} style={{cursor: 'pointer', color: 'var(--primary)'}} onClick={() => handleCopy(d.txid)} />
                        </div>
                        {d.adminNote && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '8px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--primary)', marginBottom: '12px' }}>
                            <strong>Note:</strong> {d.adminNote}
                          </div>
                        )}
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

        {/* FOLLOW UP MODAL */}
        <AnimatePresence>
          {followUpModal.isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                style={{ background: 'var(--bg-panel)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '600px', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} color="var(--primary)" /> Transaction Follow-Up
                  </h3>
                  <button onClick={() => setFollowUpModal({ isOpen: false, transaction: null, history: [], note: '', notificationMsg: '', loading: false })} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  {/* Note Section */}
                  <div>
                    <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Admin Internal Note</h4>
                    <textarea 
                      value={followUpModal.note}
                      onChange={e => setFollowUpModal(prev => ({...prev, note: e.target.value}))}
                      placeholder="Add a note (only visible to admins)..."
                      style={{ width: '100%', height: '80px', padding: '10px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '13px', resize: 'none' }}
                    />
                    <button onClick={saveAdminNote} className="btn btn-primary" style={{ marginTop: '8px', width: '100%', padding: '6px', fontSize: '12px' }}>Save Note</button>
                  </div>
                  
                  {/* Notification Section */}
                  <div>
                    <h4 style={{ fontSize: '13px', margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Send Notification to User</h4>
                    <textarea 
                      value={followUpModal.notificationMsg}
                      onChange={e => setFollowUpModal(prev => ({...prev, notificationMsg: e.target.value}))}
                      placeholder="Message to send to user's inbox..."
                      style={{ width: '100%', height: '80px', padding: '10px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '13px', resize: 'none' }}
                    />
                    <button onClick={sendNotification} style={{ marginTop: '8px', width: '100%', padding: '6px', fontSize: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <Bell size={14} /> Send Notification
                    </button>
                  </div>
                </div>

                {/* User History */}
                <div>
                  <h4 style={{ fontSize: '14px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><Eye size={16} /> User's Recent History</h4>
                  {followUpModal.loading ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading history...</div>
                  ) : followUpModal.history.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No previous transactions found.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                      {followUpModal.history.map(h => (
                        <div key={h.id} style={{ background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{h.type}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{h.createdAt?.toDate ? new Date(h.createdAt.toDate()).toLocaleDateString() : 'N/A'}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: h.status === 'SUCCESS' || h.status === 'success' ? 'var(--success)' : h.status === 'pending' ? 'var(--warning)' : 'var(--text-primary)' }}>
                              ${(h.amount || h.expectedAmount || 0).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
