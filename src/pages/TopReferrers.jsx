import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Trophy, Medal, Star, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../firebase';

export const TopReferrers = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [topReferrers, setTopReferrers] = useState([]);
    const REWARDS = [100, 50, 25];

    useEffect(() => {
        calculateWeeklyReferrers();
    }, []);

    const calculateWeeklyReferrers = async () => {
        setLoading(true);
        try {
            // 1. Determine current week window (Monday 00:00 → Sunday 23:59)
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0=Sun
            const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            // 2. Fetch ALL users
            const usersSnap = await getDocs(collection(db, 'users'));
            const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // 3. Find users who signed up THIS WEEK and have a referredByCode
            const thisWeekUsers = allUsers.filter(user => {
                if (!user.referredByCode) return false;
                let createdMs = 0;
                if (!user.createdAt) return false;
                if (typeof user.createdAt.toMillis === 'function') createdMs = user.createdAt.toMillis();
                else if (user.createdAt.seconds) createdMs = user.createdAt.seconds * 1000;
                else createdMs = new Date(user.createdAt).getTime();
                return createdMs >= startOfWeek.getTime() && createdMs <= endOfWeek.getTime();
            });

            // 4. totalCounts = all users who joined this week via a referral code
            const totalCounts = {};
            for (const user of thisWeekUsers) {
                totalCounts[user.referredByCode] = (totalCounts[user.referredByCode] || 0) + 1;
            }

            // 5. activeCounts = referral is "active" if they have ANY SUCCESS deposit
            //    (mirrors exact logic from Withdraw.jsx checkBonusEligibility)
            const activeCounts = {};
            for (const user of thisWeekUsers) {
                const depositsQ = query(
                    collection(db, 'users', user.id, 'transactions'),
                    where('type', '==', 'deposit'),
                    where('status', '==', 'SUCCESS')
                );
                const depositsSnap = await getDocs(depositsQ);
                if (!depositsSnap.empty) {
                    activeCounts[user.referredByCode] = (activeCounts[user.referredByCode] || 0) + 1;
                }
            }

            // 6. Build Top 10: ranked by active desc, then total desc
            const allCodes = new Set([...Object.keys(totalCounts), ...Object.keys(activeCounts)]);
            const ranked = Array.from(allCodes)
                .map(code => ({ code, active: activeCounts[code] || 0, total: totalCounts[code] || 0 }))
                .filter(item => item.total > 0)
                .sort((a, b) => b.active !== a.active ? b.active - a.active : b.total - a.total)
                .slice(0, 10)
                .map((item, index) => {
                    const referrer = allUsers.find(u => u.referralCode === item.code);
                    return {
                        id: referrer?.id || item.code,
                        rank: index + 1,
                        name: referrer?.fullName || referrer?.email?.split('@')[0] || 'Unknown',
                        activeCount: item.active,
                        totalCount: item.total
                    };
                });

            setTopReferrers(ranked);
        } catch (error) {
            console.error('Error calculating top referrers:', error);
        }
        setLoading(false);
    };

    const getPodiumColor = (rank) => {
        if (rank === 1) return 'linear-gradient(135deg, #FFD700, #FDB931)';
        if (rank === 2) return 'linear-gradient(135deg, #C0C0C0, #9E9E9E)';
        if (rank === 3) return 'linear-gradient(135deg, #CD7F32, #A0522D)';
        return 'var(--bg-panel)';
    };

    const getPodiumIcon = (rank) => {
        if (rank === 1) return <Trophy size={28} color="#fff" />;
        if (rank === 2) return <Medal size={24} color="#fff" />;
        if (rank === 3) return <Medal size={24} color="#fff" />;
        return null;
    };

    const PodiumCard = ({ user, rank, height, rewardIdx }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * rank }}
            style={{ flex: rank === 1 ? '0 0 36%' : 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: rank === 1 ? 2 : 1 }}
        >
            <div style={{
                fontSize: rank === 1 ? '14px' : '11px',
                color: rank === 1 ? '#FFD700' : 'var(--text-secondary)',
                fontWeight: 700, marginBottom: '6px',
                textAlign: 'center', width: '100%',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textShadow: rank === 1 ? '0 2px 4px rgba(0,0,0,0.5)' : 'none'
            }}>
                {user.name}
            </div>
            <div style={{
                width: '100%', background: getPodiumColor(rank),
                borderRadius: '14px 14px 0 0', height: `${height}px`,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 6px', border: '1px solid rgba(255,255,255,0.15)',
                borderBottom: 'none',
                boxShadow: rank === 1 ? '0 -10px 20px rgba(255,215,0,0.3)' : '0 -4px 12px rgba(0,0,0,0.2)'
            }}>
                {getPodiumIcon(rank)}
                <span style={{ color: '#fff', fontWeight: 900, fontSize: rank === 1 ? '26px' : '18px', marginTop: '2px' }}>#{rank}</span>
                <div style={{
                    background: rank === 1 ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.3)',
                    padding: '4px 8px', borderRadius: '12px',
                    color: rank === 1 ? '#FFD700' : '#fff',
                    fontSize: '10px', fontWeight: 800, marginTop: 'auto',
                    border: rank === 1 ? '1px solid rgba(255,215,0,0.3)' : 'none'
                }}>
                    ${REWARDS[rewardIdx]} Reward
                </div>
                <span style={{ color: '#fff', fontSize: '10px', opacity: 0.9, marginTop: '4px', fontWeight: 600, textAlign: 'center' }}>
                    {user.activeCount} Active · {user.totalCount} Total
                </span>
            </div>
        </motion.div>
    );

    return (
        <motion.div
            className="page-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ padding: '16px', paddingBottom: '90px', minHeight: '100vh' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ChevronLeft size={20} />
                </button>
                <Star size={20} color="#FFD700" />
                <h2 style={{ fontSize: '18px', margin: 0, color: '#fff', fontWeight: 700 }}>Weekly Top Referrers</h2>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column', gap: '16px' }}>
                    <div className="spinner" style={{ borderTopColor: 'var(--primary)', width: '32px', height: '32px', borderWidth: '3px' }}></div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Calculating Leaderboard...</span>
                </div>
            ) : topReferrers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <Users size={40} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
                    <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>No Referrals This Week</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>Be the first to invite friends and activate their accounts!</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Podium — ordered as 2, 1, 3 */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', marginTop: '16px', height: '210px' }}>
                        {topReferrers[1] && <PodiumCard user={topReferrers[1]} rank={2} height={110} rewardIdx={1} />}
                        {topReferrers[0] && <PodiumCard user={topReferrers[0]} rank={1} height={155} rewardIdx={0} />}
                        {topReferrers[2] && <PodiumCard user={topReferrers[2]} rank={3} height={90} rewardIdx={2} />}
                    </div>

                    {/* Ranks 4-10 */}
                    {topReferrers.length > 3 && (
                        <div style={{ background: 'var(--bg-panel)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
                            <h4 style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px', fontWeight: 600 }}>Runner Ups</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {topReferrers.slice(3).map((user, idx) => (
                                    <motion.div
                                        key={user.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * idx }}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ color: 'var(--text-muted)', fontWeight: 700, minWidth: '22px', fontSize: '13px' }}>#{user.rank}</span>
                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Users size={14} color="var(--text-secondary)" />
                                            </div>
                                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px' }}>{user.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                            <div style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                                                {user.activeCount} Active
                                            </div>
                                            <div style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 600 }}>
                                                {user.totalCount} Total
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};
