import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ChevronLeft, Search, User, CreditCard, Calendar, Users, Target, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchComprehensiveData();
  }, []);

  const fetchComprehensiveData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 2. Fetch all txns to avoid N+1 queries if possible, but Firestore limits this. 
      // Actually, since this is for Admin, we can fetch all users, then Promise.all their txns
      // Or we can query collectionGroup('transactions') to get all successful deposits globally
      const allTxnsSnap = await getDocs(query(collection(db, 'transactions') /* Wait, does 'transactions' collectionGroup work here without index issues? Let's assume it does since we are admin, but let's be careful. Let's do it sequentially per user for reliability or collectionGroup if they have it */));
      // Actually let's fetch deposits using a simple map approach for reliability
      
      const enrichedUsers = await Promise.all(allUsers.map(async (u) => {
        // Fetch deposits for user
        const depQ = query(collection(db, 'users', u.id, 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'SUCCESS'));
        const depSnap = await getDocs(depQ);
        let totalDeposited = 0;
        depSnap.forEach(d => {
          totalDeposited += (d.data().amount || d.data().expectedAmount || 0);
        });

        // Calculate referrals (who used this user's referralCode)
        let totalRefs = 0;
        let activeRefs = 0;
        let inactiveRefs = 0;

        if (u.referralCode) {
          const refs = allUsers.filter(x => x.referredByCode === u.referralCode);
          totalRefs = refs.length;
          
          // Check active status for each ref
          const actChecks = await Promise.all(refs.map(async (r) => {
             const rDepQ = query(collection(db, 'users', r.id, 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'SUCCESS'));
             const rDepSnap = await getDocs(rDepQ);
             return !rDepSnap.empty;
          }));
          activeRefs = actChecks.filter(Boolean).length;
          inactiveRefs = totalRefs - activeRefs;
        }

        return {
          ...u,
          hasDeposited: !depSnap.empty,
          totalDeposited,
          totalRefs,
          activeRefs,
          inactiveRefs
        };
      }));

      // Sort by creation date by default (newest first)
      enrichedUsers.sort((a, b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const db = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return db - da; // Desc
      });

      setUsers(enrichedUsers);
      setFilteredUsers(enrichedUsers);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch detailed users data');
    }
    setLoading(false);
  };

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredUsers(
      users.filter(u => 
        u.email?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        u.referralCode?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, users]);

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-dark)', padding: '20px', paddingBottom: '80px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#fff' }}>Detailed Users Data</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{filteredUsers.length} total users found</p>
        </div>
      </div>

      {/* SEARCH / FILTERS */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, email, UID, or ref code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: '#fff', fontSize: '14px', outline: 'none' }}
          />
        </div>
      </div>

      {/* DATA CARDS */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading complex user data (this may take a moment)...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-panel)', borderRadius: '20px', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No users match your search.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredUsers.map((u, idx) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (idx % 10) * 0.05 }}
              style={{ background: 'var(--bg-panel)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Top Row: Info */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                  {(u.fullName || u.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.fullName || 'No Name'}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {u.email}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{u.id.substring(0,8)}...</span>
                    {u.referralCode && (
                      <span style={{ fontSize: '10px', background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', padding: '2px 6px', borderRadius: '4px', color: 'var(--warning)', fontWeight: 600 }}>Ref: {u.referralCode}</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

              {/* Middle Row: Balances */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CreditCard size={12} /> Main Balance
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>${(u.balance || 0).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mining Balance</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>${(u.miningBalance || 0).toFixed(2)}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                   <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Deposited</div>
                   <div style={{ fontSize: '14px', fontWeight: 600, color: u.totalDeposited > 0 ? 'var(--success)' : '#fff' }}>${u.totalDeposited.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

              {/* Bottom Row: Referrals & Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Referrals */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                     <Users size={16} color="var(--primary)" />
                     <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Referrals Overview</span>
                   </div>
                   <div style={{ display: 'flex', gap: '8px' }}>
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '36px' }}>
                       <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total</span>
                       <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{u.totalRefs}</span>
                     </div>
                     <div style={{ width: '1px', background: 'var(--border)' }} />
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '36px' }}>
                       <span style={{ fontSize: '10px', color: 'var(--success)' }}>Active</span>
                       <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--success)' }}>{u.activeRefs}</span>
                     </div>
                     <div style={{ width: '1px', background: 'var(--border)' }} />
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '36px' }}>
                       <span style={{ fontSize: '10px', color: 'var(--danger)' }}>Dead</span>
                       <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--danger)' }}>{u.inactiveRefs}</span>
                     </div>
                   </div>
                </div>

                {/* Registration */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <Calendar size={12} /> Registered: {u.createdAt?.toDate ? new Date(u.createdAt.toDate()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date'}
                </div>
                 
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
