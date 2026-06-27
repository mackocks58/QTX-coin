import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, functions } from '../firebase';
import { collectionGroup, collection, query, where, orderBy, getDocs, doc, updateDoc, increment, deleteDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, CheckCircle2, XCircle, Trash2, Copy, Send, Activity, Users, ArrowDownToLine, ArrowUpFromLine, LayoutDashboard, ChevronRight, Edit2, Save, X, Search, MessageSquare, Eye, Bell, Settings, ScanFace, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const Admin = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [referralStats, setReferralStats] = useState([]);
  const [referralStatsLoading, setReferralStatsLoading] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  
  const [stats, setStats] = useState({ totalUsers: 0, totalDeposits: 0, totalWithdrawals: 0 });
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [depositSearchQuery, setDepositSearchQuery] = useState('');
  const [referralSearchQuery, setReferralSearchQuery] = useState('');

  // Edit user state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ balance: 0, miningBalance: 0, welcomeBonus: 0 });

  // Follow-up state
  const [followUpModal, setFollowUpModal] = useState({ isOpen: false, transaction: null, history: [], note: '', notificationMsg: '', loading: false });

  // Push Notification state
  const [pushForm, setPushForm] = useState({ userId: 'all', title: '', body: '', loading: false });
  const [pushImageFile, setPushImageFile] = useState(null);

  // Binance Explore state
  const [binanceLoading, setBinanceLoading] = useState(false);
  const [allTxns, setAllTxns] = useState([]);
  const [allTxnsLoaded, setAllTxnsLoaded] = useState(false);
  const [txnSearchQuery, setTxnSearchQuery] = useState('');
  const [networkFilter, setNetworkFilter] = useState('all');

  // Payment Settings state
  const [paymentSettings, setPaymentSettings] = useState({ rate: 26.75, networks: [] });
  const [zmPaymentSettings, setZmPaymentSettings] = useState({ rate: 26.5, networks: [] });
  const [transferSettings, setTransferSettings] = useState({ autoApprove: false });
  const [p2pConfirmModal, setP2pConfirmModal] = useState({ isOpen: false, transfer: null, action: null, loading: false });
  const [paymentLoading, setPaymentLoading] = useState(false);

  // System Settings state (Page blocking)
  const [systemSettings, setSystemSettings] = useState({ vipBotBlocked: false, vipBotMessage: 'This page is currently unaccessible', myBotsBlocked: false, myBotsMessage: 'This page is currently unaccessible' });
  const [systemLoading, setSystemLoading] = useState(false);

  const TRC20_ADDRESS = import.meta.env.VITE_USDT_ADDRESS || 'TBteWdQZAdWJzXCaa61dogDFVNH8pSA88J';
  const BSC_ADDRESS = import.meta.env.VITE_BSC_ADDRESS || '0x66922e6229f9501319aa4425f4cd53773fc66a91';

  const handleBinanceExplore = async () => {
    if (!binanceTxidSearch.trim()) return;
    setBinanceLoading(true);
    setBinanceResults([]);
    try {
      const q = query(collectionGroup(db, 'transactions'), where('txid', '==', binanceTxidSearch.trim()));
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => {
        const userRef = doc.ref.parent.parent;
        return {
          id: doc.id,
          userId: userRef ? userRef.id : 'unknown',
          ref: doc.ref,
          ...doc.data()
        };
      });
      setBinanceResults(results);
    } catch (e) {
      console.error(e);
      toast.error('Failed to search TXID');
    }
    setBinanceLoading(false);
  };

  const handleAdminPush = async () => {
    if (!pushForm.title || !pushForm.body) {
      toast.error('Title and body are required');
      return;
    }
    setPushForm(prev => ({ ...prev, loading: true }));
    try {
      let imageUrl = null;
      if (pushImageFile) {
        const toastId = toast.loading('Uploading image...');
        const imageRef = ref(storage, `push_images/${Date.now()}_${pushImageFile.name}`);
        const snapshot = await uploadBytes(imageRef, pushImageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
        toast.dismiss(toastId);
      }

      const sendPush = httpsCallable(functions, 'adminSendPushNotification');
      const result = await sendPush({ 
        userId: pushForm.userId, 
        title: pushForm.title, 
        body: pushForm.body,
        imageUrl: imageUrl 
      });
      
      if (result.data.success) {
        toast.success(`Push sent to ${result.data.sentCount} device(s)`);
        setPushForm({ userId: 'all', title: '', body: '', loading: false });
        setPushImageFile(null);
        // Reset file input element if needed
        const fileInput = document.getElementById('pushImageInput');
        if (fileInput) fileInput.value = '';
      } else {
        toast.error('Push dispatch returned false');
        setPushForm(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to send push notification');
      setPushForm(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'dashboard') fetchStats();
      if (activeTab === 'withdrawals') { fetchWithdrawals(); fetchPaymentSettings(); }
      if (activeTab === 'deposits') fetchDeposits();
      if (activeTab === 'users') fetchUsersList();
      if (activeTab === 'p2p_transfers') { fetchTransfers(); fetchTransferSettings(); }
      if (activeTab === 'referrals') fetchReferralStats();
      if (activeTab === 'payment_settings') fetchPaymentSettings();
      if (activeTab === 'system_settings') fetchSystemSettings();
      if (activeTab === 'binance_explore' && !allTxnsLoaded) fetchAllTxns();
    }
  }, [isAdmin, activeTab]);

  const fetchReferralStats = async () => {
    setReferralStatsLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const referrers = allUsers.filter(u => u.referralCode);
      const result = await Promise.all(referrers.map(async (referrer) => {
        const referred = allUsers.filter(u => u.referredByCode === referrer.referralCode);
        const activeChecks = await Promise.all(referred.map(async (ref) => {
          const depQ = query(collection(db, 'users', ref.id, 'transactions'), where('type', '==', 'deposit'), where('status', '==', 'SUCCESS'));
          const depSnap = await getDocs(depQ);
          return !depSnap.empty;
        }));
        const active = activeChecks.filter(Boolean).length;
        return { id: referrer.id, name: referrer.fullName || referrer.email?.split('@')[0] || 'Unknown', email: referrer.email || '', referralCode: referrer.referralCode, total: referred.length, active, inactive: referred.length - active };
      }));
      setReferralStats(result.filter(u => u.total > 0).sort((a, b) => b.total - a.total));
    } catch (e) { console.error(e); toast.error('Failed to load referral stats'); }
    setReferralStatsLoading(false);
  };

    const fetchPaymentSettings = async () => {
    setPaymentLoading(true);
    try {
      const docRef = doc(db, 'settings', 'zwPayment');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPaymentSettings(docSnap.data());
      } else {
        const { setDoc } = await import('firebase/firestore');
        const defaultSettings = {
          rate: 26.75,
          networks: [
            { id: 'ecocash', name: 'EcoCash', logo: 'https://ui-avatars.com/api/?name=EcoCash&background=0ea5e9&color=fff&rounded=true&bold=true', accountName: 'Admin EcoCash', accountNo: '077XXXXXXX', disabled: false, disableReason: '' },
            { id: 'innbucks', name: 'InnBucks', logo: 'https://ui-avatars.com/api/?name=InnBucks&background=ef4444&color=fff&rounded=true&bold=true', accountName: 'Admin InnBucks', accountNo: '071XXXXXXX', disabled: false, disableReason: '' },
            { id: 'onemoney', name: 'OneMoney', logo: 'https://ui-avatars.com/api/?name=One+Money&background=f97316&color=fff&rounded=true&bold=true', accountName: 'Admin OneMoney', accountNo: '073XXXXXXX', disabled: false, disableReason: '' }
          ]
        };
        await setDoc(docRef, defaultSettings);
        setPaymentSettings(defaultSettings);
      }

      const zmDocRef = doc(db, 'settings', 'zmPayment');
      const zmDocSnap = await getDoc(zmDocRef);
      if (zmDocSnap.exists()) {
        setZmPaymentSettings(zmDocSnap.data());
      } else {
        const { setDoc } = await import('firebase/firestore');
        const defaultZmSettings = {
          rate: 26.5,
          networks: [
            { id: 'mtn', name: 'MTN Mobile Money', logo: 'https://ui-avatars.com/api/?name=MTN&background=fbbf24&color=000&rounded=true&bold=true', accountName: 'Admin MTN', accountNo: '096XXXXXXX', disabled: false, disableReason: '' },
            { id: 'airtel', name: 'Airtel Money', logo: 'https://ui-avatars.com/api/?name=Airtel&background=dc2626&color=fff&rounded=true&bold=true', accountName: 'Admin Airtel', accountNo: '097XXXXXXX', disabled: false, disableReason: '' },
            { id: 'zamtel', name: 'Zamtel', logo: 'https://ui-avatars.com/api/?name=Zamtel&background=16a34a&color=fff&rounded=true&bold=true', accountName: 'Admin Zamtel', accountNo: '095XXXXXXX', disabled: false, disableReason: '' }
          ]
        };
        await setDoc(zmDocRef, defaultZmSettings);
        setZmPaymentSettings(defaultZmSettings);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load payment settings');
    }
    setPaymentLoading(false);
  };

  const fetchSystemSettings = async () => {
    setSystemLoading(true);
    try {
      const docRef = doc(db, 'settings', 'system');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setSystemSettings(snap.data());
      } else {
        const defaultSettings = { vipBotBlocked: false, vipBotMessage: 'This page is currently unaccessible', myBotsBlocked: false, myBotsMessage: 'This page is currently unaccessible' };
        const { setDoc } = await import('firebase/firestore');
        await setDoc(docRef, defaultSettings);
        setSystemSettings(defaultSettings);
      }
    } catch(e) { toast.error("Failed to load system settings. " + e.message); }
    setSystemLoading(false);
  };

  const saveSystemSettings = async () => {
    setSystemLoading(true);
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'system'), systemSettings);
      toast.success('System settings saved');
    } catch(e) { toast.error('Failed to save system settings'); }
    setSystemLoading(false);
  };

  const savePaymentSettings = async () => {
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'zwPayment'), paymentSettings);
      await setDoc(doc(db, 'settings', 'zmPayment'), zmPaymentSettings);
      toast.success('Payment settings saved successfully');
    } catch (e) {
      toast.error('Failed to save payment settings');
    }
  };

  const fetchAllTxns = async () => {
    setBinanceLoading(true);
    setAllTxns([]);
    try {
      const getBinanceFn = httpsCallable(functions, 'getBinanceDeposits', { timeout: 30000 });
      const result = await getBinanceFn();
      setAllTxns(result.data.deposits || []);
      setAllTxnsLoaded(true);
      toast.success(`Loaded ${result.data.deposits.length} Binance deposits`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch Binance deposits: ' + (e.message || 'Unknown error'));
    }
    setBinanceLoading(false);
  };

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

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const q = query(
        collectionGroup(db, 'transactions'),
        where('type', '==', 'transfer_out'),
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
      setTransfers(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load transfers');
    }
    setLoading(false);
  };

  const fetchTransferSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'transfers');
      const snap = await getDoc(docRef);
      if (snap.exists()) setTransferSettings(snap.data());
      else {
        const { setDoc } = await import('firebase/firestore');
        await setDoc(docRef, { autoApprove: false });
        setTransferSettings({ autoApprove: false });
      }
    } catch(e) {}
  };

  const saveTransferSettings = async () => {
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'transfers'), transferSettings);
      toast.success('P2P Settings saved');
    } catch(e) { toast.error('Failed to save settings'); }
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
    setEditForm({ balance: user.balance || 0, miningBalance: user.miningBalance || 0, welcomeBonus: user.welcomeBonus || 0 });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        balance: parseFloat(editForm.balance) || 0,
        miningBalance: parseFloat(editForm.miningBalance) || 0,
        welcomeBonus: parseFloat(editForm.welcomeBonus) || 0
      });
      setUsersList(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, balance: parseFloat(editForm.balance) || 0, miningBalance: parseFloat(editForm.miningBalance) || 0, welcomeBonus: parseFloat(editForm.welcomeBonus) || 0 }
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
      const updateData = withdrawal.source === 'bonus' 
        ? { welcomeBonus: increment(withdrawal.amount) }
        : { balance: increment(withdrawal.amount) };
      await updateDoc(userRef, updateData);
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


  const handleApproveP2P = (transfer) => {
    setP2pConfirmModal({ isOpen: true, transfer, action: 'approve', loading: false });
  };

  const handleRejectP2P = (transfer) => {
    setP2pConfirmModal({ isOpen: true, transfer, action: 'reject', loading: false });
  };

  const executeP2PAction = async () => {
    const { transfer, action } = p2pConfirmModal;
    setP2pConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      const approveFn = httpsCallable(functions, 'adminApproveTransfer');
      const res = await approveFn({ transferId: transfer.id, senderUid: transfer.userId, action });
      if (res.data.success) {
        toast.success(action === 'approve' ? 'Transfer Approved' : 'Transfer Rejected');
        setTransfers(prev => prev.map(t => t.id === transfer.id ? { ...t, status: action === 'approve' ? 'SUCCESS' : 'rejected' } : t));
        setP2pConfirmModal({ isOpen: false, transfer: null, action: null, loading: false });
      } else {
        toast.error(res.data.message || 'Error');
        setP2pConfirmModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      toast.error('Failed to process transfer');
      setP2pConfirmModal(prev => ({ ...prev, loading: false }));
    }
  };

  if (!currentUser) return <div className="p-4 text-center">Please login</div>;
  
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
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', minHeight: 'calc(100vh - 60px)', background: 'var(--bg-dark)' }}>

      {/* P2P Confirmation Modal */}
      <AnimatePresence>
        {p2pConfirmModal.isOpen && p2pConfirmModal.transfer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}
            onClick={() => !p2pConfirmModal.loading && setP2pConfirmModal({ isOpen: false, transfer: null, action: null, loading: false })}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
              onClick={e => e.stopPropagation()}
              style={{ backgroundColor: 'var(--bg-panel)', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', padding: '12px 24px 36px', boxShadow: '0 -15px 40px rgba(0,0,0,0.5)' }}
            >
              <div style={{ width: '40px', height: '5px', backgroundColor: 'var(--text-muted)', opacity: 0.3, borderRadius: '10px', margin: '0 auto 20px' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                {p2pConfirmModal.action === 'approve'
                  ? <CheckCircle2 size={22} color="var(--success)" />
                  : <XCircle size={22} color="var(--danger)" />}
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                  {p2pConfirmModal.action === 'approve' ? 'Approve Transfer' : 'Reject Transfer'}
                </h3>
              </div>

              {/* Transfer Details */}
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '14px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Transaction ID</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '11px', color: 'var(--primary)' }}>{p2pConfirmModal.transfer.id?.substring(0,16)}...</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sender UID</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '11px' }}>{p2pConfirmModal.transfer.userId?.substring(0,12)}...</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Receiver Email</span>
                  <span style={{ fontWeight: 600 }}>{p2pConfirmModal.transfer.receiverEmail || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Receiver UID</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '11px' }}>{p2pConfirmModal.transfer.receiverUid?.substring(0,12)}...</span>
                </div>
                <div style={{ height: '1px', background: 'var(--border)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount to Receive</span>
                  <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--success)' }}>${(p2pConfirmModal.transfer.amount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>5% Transfer Fee</span>
                  <span style={{ fontWeight: 600, color: 'var(--warning)' }}>${(p2pConfirmModal.transfer.fee || (p2pConfirmModal.transfer.amount * 0.05) || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total from Sender</span>
                  <span style={{ fontWeight: 700, color: 'var(--danger)' }}>${(p2pConfirmModal.transfer.totalDeduction || (p2pConfirmModal.transfer.amount * 1.05) || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Date</span>
                  <span style={{ fontWeight: 500, fontSize: '11px' }}>{p2pConfirmModal.transfer.createdAt?.toDate ? new Date(p2pConfirmModal.transfer.createdAt.toDate()).toLocaleString() : 'N/A'}</span>
                </div>
              </div>

              <div style={{ background: p2pConfirmModal.action === 'approve' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${p2pConfirmModal.action === 'approve' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '10px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: p2pConfirmModal.action === 'approve' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {p2pConfirmModal.action === 'approve'
                  ? '✅ This will move funds from sender to receiver. This cannot be undone.'
                  : '⚠️ This will reject the transfer. No funds will be moved. Sender will be notified.'}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setP2pConfirmModal({ isOpen: false, transfer: null, action: null, loading: false })}
                  disabled={p2pConfirmModal.loading}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={executeP2PAction}
                  disabled={p2pConfirmModal.loading}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: p2pConfirmModal.action === 'approve' ? '#10B981' : '#EF4444', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: p2pConfirmModal.loading ? 0.7 : 1 }}
                >
                  {p2pConfirmModal.loading ? 'Processing...' : p2pConfirmModal.action === 'approve' ? 'Approve Transfer' : 'Reject Transfer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Nav */}
      {isMobile ? (
        <div style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', overflowX: 'auto', display: 'flex', padding: '6px 8px', gap: '4px', flexShrink: 0, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'referrals', icon: UserCheck, label: 'Referrals' },
            { id: 'deposits', icon: ArrowDownToLine, label: 'Deposits' },
            { id: 'withdrawals', icon: ArrowUpFromLine, label: 'Withdrawals' },
            { id: 'p2p_transfers', icon: Send, label: 'P2P' },
            { id: 'push', icon: Bell, label: 'Push' },
            { id: 'payment_settings', icon: Settings, label: 'Payments' },
            { id: 'system_settings', icon: ShieldAlert, label: 'Access' },
            { id: 'ai_scanner', icon: ScanFace, label: 'AI Scan' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent', color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '9px', fontWeight: activeTab === tab.id ? 700 : 500, whiteSpace: 'nowrap', borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent', flexShrink: 0 }}>
              <tab.icon size={16} />{tab.label}
            </button>
          ))}
          <button onClick={() => navigate('/admin/users-details')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--primary)', fontSize: '9px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Activity size={16} />All Data
          </button>
          <button onClick={() => navigate('/admin/support')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent', color: '#10b981', fontSize: '9px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <MessageSquare size={16} />Support
          </button>
        </div>
      ) : (
      <div style={{ width: '220px', background: 'var(--bg-panel)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 0', flexShrink: 0, overflowY: 'auto' }}>
        <div style={{ padding: '0 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} color="var(--danger)" />
          <h2 style={{ fontSize: '16px', margin: 0, color: 'var(--danger)', fontWeight: 600 }}>Admin Portal</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <TabButton id="dashboard" icon={LayoutDashboard} label="Overview" />
          <TabButton id="users" icon={Users} label="Users Management" />
          <TabButton id="referrals" icon={UserCheck} label="Referrals" />
          <TabButton id="deposits" icon={ArrowDownToLine} label="Deposits" />
          <TabButton id="withdrawals" icon={ArrowUpFromLine} label="Withdrawals" />
          <TabButton id="p2p_transfers" icon={Send} label="P2P Transfers" />
          <TabButton id="binance_explore" icon={Search} label="Binance Explore" />
          <TabButton id="push" icon={Bell} label="Push Notifications" />
          <TabButton id="payment_settings" icon={Settings} label="Payment Methods" />
          <TabButton id="system_settings" icon={ShieldAlert} label="Page Access Controls" />
          <TabButton id="ai_scanner" icon={ScanFace} label="AI Fraud Scanner" />
          <button onClick={() => navigate('/admin/users-details')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.1))', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', fontWeight: 600, fontSize: '14px', margin: '8px 12px 0', width: 'calc(100% - 24px)', textAlign: 'left' }}>
            <Activity size={16} />Detailed Users
          </button>
          <button onClick={() => navigate('/admin/support')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 600, fontSize: '14px', margin: '8px 12px 0', width: 'calc(100% - 24px)', textAlign: 'left' }}>
            <MessageSquare size={16} />Support Inbox
          </button>
        </div>
      </div>
      )}

      {/* Admin Content Area */}
      <div style={{ flex: 1, padding: isMobile ? '12px' : '24px', overflowY: 'auto', position: 'relative', minWidth: 0 }}>
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
                            <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500 }}>Welcome Bonus</th>
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
                                  <td style={{ padding: '12px', textAlign: 'right' }}>
                                    <input 
                                      type="number" 
                                      value={editForm.welcomeBonus} 
                                      onChange={(e) => setEditForm({...editForm, welcomeBonus: e.target.value})}
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
                                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>{u.country === 'Tanzania' ? 'TZS' : '$'} {(u.balance || 0).toLocaleString(undefined, { minimumFractionDigits: u.country === 'Tanzania' ? 0 : 2, maximumFractionDigits: u.country === 'Tanzania' ? 0 : 2 })}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#d4af37' }}>{u.country === 'Tanzania' ? 'TZS' : '$'} {(u.miningBalance || 0).toLocaleString(undefined, { minimumFractionDigits: u.country === 'Tanzania' ? 0 : 2, maximumFractionDigits: u.country === 'Tanzania' ? 0 : 2 })}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{u.country === 'Tanzania' ? 'TZS' : '$'} {(u.welcomeBonus || 0).toLocaleString(undefined, { minimumFractionDigits: u.country === 'Tanzania' ? 0 : 2, maximumFractionDigits: u.country === 'Tanzania' ? 0 : 2 })}</td>
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
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>{d.currency === 'TZS' ? 'TZS' : '$'} {(d.expectedAmount || d.amount || 0).toLocaleString(undefined, { minimumFractionDigits: d.currency === 'TZS' ? 0 : 2, maximumFractionDigits: d.currency === 'TZS' ? 0 : 2 })}</div>
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
                        <div style={{ fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)' }}>TXID: </span>
                              <span style={{ fontFamily: 'monospace' }}>{d.txid}</span>
                            </div>
                            <Copy size={14} style={{cursor: 'pointer', color: 'var(--primary)'}} onClick={() => handleCopy(d.txid)} />
                          </div>
                          {(d.phone || d.senderName) && (
                            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                              {d.phone && (
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Phone: </span>
                                  <span style={{ fontWeight: 600 }}>{d.phone}</span>
                                </div>
                              )}
                              {d.senderName && (
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Name: </span>
                                  <span style={{ fontWeight: 600 }}>{d.senderName}</span>
                                </div>
                              )}
                            </div>
                          )}
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
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{w.currency === 'TZS' ? 'TZS' : '$'} {w.amount?.toLocaleString(undefined, { minimumFractionDigits: w.currency === 'TZS' ? 0 : 2, maximumFractionDigits: w.currency === 'TZS' ? 0 : 2 })}</div>
                            {w.accountDetails && ['EcoCash', 'InnBucks', 'OneMoney', 'Eco Cash', 'One Money'].includes(w.accountDetails.network) && (
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', marginTop: '-2px', marginBottom: '2px' }}>
                                ZWG {((w.amount || 0) * (paymentSettings?.rate || 26.75)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                            {w.accountDetails && ['MTN Mobile Money', 'Airtel Money', 'Zamtel'].includes(w.accountDetails.network) && (
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', marginTop: '-2px', marginBottom: '2px' }}>
                                ZMW {((w.amount || 0) * (zmPaymentSettings?.rate || 26.5)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
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
                                  {['EcoCash', 'InnBucks', 'OneMoney', 'Eco Cash', 'One Money'].includes(w.accountDetails.network) && (
                                    <div style={{ marginTop: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Amount in ZiG (ZWG):</span>
                                      <span style={{ color: '#10B981', fontWeight: 800 }}>
                                        ZWG {((w.amount || 0) * (paymentSettings?.rate || 26.75)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}
                                  {['MTN Mobile Money', 'Airtel Money', 'Zamtel'].includes(w.accountDetails.network) && (
                                    <div style={{ marginTop: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Amount in Kwacha (ZMW):</span>
                                      <span style={{ color: '#10B981', fontWeight: 800 }}>
                                        ZMW {((w.amount || 0) * (zmPaymentSettings?.rate || 26.5)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}
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

            {/* P2P TRANSFERS TAB */}
            {activeTab === 'p2p_transfers' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={20} color="var(--primary)" /> P2P Transfers
                  </h2>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={fetchTransfers} className="btn" style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={14} /> Refresh
                    </button>
                  </div>
                </div>

                <div className="panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Auto-Approve P2P Transfers</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>If enabled, pending transfers are automatically processed after 5 minutes.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                      <input 
                        type="checkbox" 
                        checked={transferSettings.autoApprove}
                        onChange={(e) => setTransferSettings({ ...transferSettings, autoApprove: e.target.checked })}
                        style={{ opacity: 0, width: 0, height: 0 }} 
                      />
                      <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: transferSettings.autoApprove ? '#10B981' : '#4B5563', transition: '.4s', borderRadius: '34px' }}>
                        <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: transferSettings.autoApprove ? '26px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                      </span>
                    </label>
                    <button onClick={saveTransferSettings} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>Save Settings</button>
                  </div>
                </div>

                {loading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading transfers...</div>
                ) : transfers.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No P2P transfers found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {transfers.map(t => (
                      <div key={t.id} style={{ background: 'var(--bg-dark)', borderRadius: '8px', border: `1px solid ${t.status === 'pending' ? 'var(--warning)' : 'var(--border)'}`, overflow: 'hidden' }}>
                        <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sender UID:</span>
                            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#fff' }}>
                              {t.userId.substring(0,8)}...
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>${t.amount?.toFixed(2)}</div>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: t.status === 'pending' ? 'var(--warning)' : t.status === 'SUCCESS' ? 'var(--success)' : 'var(--danger)' }}>
                              {t.status}
                            </div>
                          </div>
                        </div>

                        <div style={{ padding: '12px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Receiver Email:</span>
                              <div style={{ fontWeight: 600 }}>{t.receiverEmail}</div>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Receiver UID:</span>
                              <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.receiverUid}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Date: {t.createdAt?.toDate ? new Date(t.createdAt.toDate()).toLocaleString() : 'N/A'}
                          </div>
                        </div>

                        {t.status === 'pending' && (
                          <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleApproveP2P(t)}
                              style={{ flex: 1, background: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)', border: '1px solid rgba(46, 204, 113, 0.2)', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                            >
                              <CheckCircle2 size={16} /> Approve
                            </button>
                            <button 
                              onClick={() => handleRejectP2P(t)}
                              style={{ flex: 1, background: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)', border: '1px solid rgba(231, 76, 60, 0.2)', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                            >
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

            {/* BINANCE EXPLORE TAB */}
            {activeTab === 'binance_explore' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={20} color="#F0B90B" /> Binance Deposit History
                  </h2>
                  <div style={{ fontSize: '12px', color: '#F0B90B', background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.3)', borderRadius: '20px', padding: '4px 14px', fontWeight: 600 }}>
                    🟡 Last 90 days · {allTxns.length} deposits
                  </div>
                </div>

                {/* Search + Network Filter */}
                <div className="panel" style={{ padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <input type="text" value={txnSearchQuery} onChange={e => setTxnSearchQuery(e.target.value)}
                    placeholder="Search TXID, coin, network, address..."
                    style={{ flex: 1, minWidth: '160px', padding: '7px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', fontSize: '13px' }} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['all', 'TRC20', 'BNB Smart Chain', 'ETH'].map(n => (
                      <button key={n} onClick={() => setNetworkFilter(n)}
                        style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                          background: networkFilter === n ? '#F0B90B' : 'transparent',
                          color: networkFilter === n ? '#000' : 'var(--text-muted)',
                          border: `1px solid ${networkFilter === n ? '#F0B90B' : 'var(--border)'}` }}>
                        {n === 'all' ? 'All Networks' : n}
                      </button>
                    ))}
                  </div>
                  <button onClick={fetchAllTxns} disabled={binanceLoading}
                    style={{ padding: '7px 16px', fontSize: '12px', flexShrink: 0, background: '#F0B90B', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: binanceLoading ? 0.7 : 1 }}>
                    {binanceLoading ? 'Loading...' : '↻ Refresh'}
                  </button>
                </div>

                {binanceLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
                    Fetching from Binance API...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {allTxns
                      .filter(tx => {
                        const matchNet = networkFilter === 'all' || tx.network === networkFilter;
                        if (!txnSearchQuery) return matchNet;
                        const q = txnSearchQuery.toLowerCase();
                        return matchNet && (
                          tx.txid?.toLowerCase().includes(q) ||
                          tx.address?.toLowerCase().includes(q) ||
                          tx.coin?.toLowerCase().includes(q) ||
                          tx.network?.toLowerCase().includes(q) ||
                          String(tx.amount).includes(q)
                        );
                      })
                      .map((tx, i) => (
                        <div key={tx.txid || i} className="panel" style={{ padding: '12px 16px', borderLeft: `3px solid ${tx.status === 'Success' ? 'var(--success)' : tx.status === 'Pending' ? 'var(--warning)' : 'var(--danger)'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              {/* Badges */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <span style={{ fontSize: '10px', background: 'rgba(240,185,11,0.15)', color: '#F0B90B', borderRadius: '4px', padding: '2px 7px', fontWeight: 700 }}>{tx.network}</span>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: tx.status === 'Success' ? 'var(--success)' : tx.status === 'Pending' ? 'var(--warning)' : 'var(--danger)' }}>{tx.status}</span>
                                {tx.confirmTimes && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>✓ {tx.confirmTimes} confirms</span>}
                              </div>
                              {/* TXID */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-dark)', borderRadius: '6px', padding: '5px 8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.txid || '—'}</span>
                                {tx.txid && (
                                  <button onClick={() => { navigator.clipboard.writeText(tx.txid); toast.success('TXID copied!'); }}
                                    style={{ background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.3)', borderRadius: '4px', cursor: 'pointer', color: '#F0B90B', padding: '2px 6px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                    <Copy size={9} /> Copy
                                  </button>
                                )}
                              </div>
                              {/* Address */}
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>To:</span>
                                <span style={{ fontFamily: 'monospace' }}>{tx.address?.substring(0, 22)}...</span>
                                <button onClick={() => { navigator.clipboard.writeText(tx.address); toast.success('Address copied'); }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0 }}>
                                  <Copy size={10} />
                                </button>
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{tx.date}</div>
                            </div>
                            {/* Amount */}
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '22px', fontWeight: 800, color: '#F0B90B' }}>{tx.amount}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{tx.coin}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                    {!binanceLoading && allTxnsLoaded && allTxns.filter(tx => networkFilter === 'all' || tx.network === networkFilter).length === 0 && (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No Binance deposits found in the last 90 days.</div>
                    )}
                    {!allTxnsLoaded && !binanceLoading && (
                      <div style={{ padding: '40px', textAlign: 'center' }}>
                        <button onClick={fetchAllTxns}
                          style={{ background: '#F0B90B', color: '#000', border: 'none', borderRadius: '12px', padding: '12px 32px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                          Load Binance Deposits
                        </button>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Fetches last 90 days of USDT deposits via Binance API</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}



                {/* Wallet addresses */}

            {/* PUSH NOTIFICATIONS TAB */}

            {activeTab === 'push' && (
              <div>
                <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={20} color="var(--primary)" /> Broadcast Push Notifications
                </h2>
                <div className="panel" style={{ padding: '24px', maxWidth: '600px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Target Audience</label>
                    <select 
                      value={pushForm.userId} 
                      onChange={e => setPushForm(prev => ({...prev, userId: e.target.value}))}
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                    >
                      <option value="all">All Users (Broadcast)</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>{u.email} ({u.id.substring(0,8)})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Notification Title</label>
                    <input 
                      type="text" 
                      value={pushForm.title} 
                      onChange={e => setPushForm(prev => ({...prev, title: e.target.value}))}
                      placeholder="e.g. Special Bonus Event!"
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                    />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Notification Body</label>
                    <textarea 
                      value={pushForm.body} 
                      onChange={e => setPushForm(prev => ({...prev, body: e.target.value}))}
                      placeholder="Type your message here..."
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', height: '100px', resize: 'none' }}
                    />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Image Attachment (Optional)</label>
                    <input 
                      id="pushImageInput"
                      type="file" 
                      accept="image/*"
                      onChange={e => setPushImageFile(e.target.files[0] || null)}
                      style={{ width: '100%', padding: '10px', background: 'var(--bg-dark)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff' }}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>The image will be securely uploaded to your storage and attached to the push notification.</p>
                  </div>
                  <button 
                    onClick={handleAdminPush} 
                    disabled={pushForm.loading}
                    className="btn btn-primary" 
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: pushForm.loading ? 0.7 : 1 }}
                  >
                    <Send size={16} /> {pushForm.loading ? 'Sending...' : 'Send Push Notification'}
                  </button>
                </div>
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
        {/* PAYMENT SETTINGS TAB */}
        {activeTab === 'payment_settings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="var(--primary)" /> Payment Methods Configuration
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={fetchPaymentSettings} className="btn" style={{ padding: '8px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={16} /> Refresh
                </button>
                <button onClick={savePaymentSettings} className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>

            {paymentLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading settings...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* ZIMBABWE BLOCK */}
                <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>🇿🇼 Zimbabwe Settings</h3>
                </div>
                <div className="panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>General Settings</h3>
                  <div className="input-group" style={{ maxWidth: '300px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>USD to ZiG (ZWG) Rate</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="input-field" 
                      value={paymentSettings.rate} 
                      onChange={(e) => setPaymentSettings({...paymentSettings, rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Mobile Money Networks</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {paymentSettings.networks?.map((net, idx) => (
                      <div key={net.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={net.logo} alt={net.name} style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                            <div>
                              <h4 style={{ margin: 0, fontSize: '16px' }}>{net.name}</h4>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {net.id}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', color: net.disabled ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                              {net.disabled ? 'Disabled' : 'Enabled'}
                            </span>
                            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                              <input 
                                type="checkbox" 
                                checked={!net.disabled}
                                onChange={(e) => {
                                  const newNetworks = [...paymentSettings.networks];
                                  newNetworks[idx] = { ...newNetworks[idx], disabled: !e.target.checked };
                                  setPaymentSettings({ ...paymentSettings, networks: newNetworks });
                                }}
                                style={{ opacity: 0, width: 0, height: 0 }} 
                              />
                              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: !net.disabled ? '#10B981' : '#4B5563', transition: '.4s', borderRadius: '34px' }}>
                                <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: !net.disabled ? '26px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                              </span>
                            </label>
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Name</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={net.accountName} 
                              onChange={(e) => {
                                const newNetworks = [...paymentSettings.networks];
                                newNetworks[idx].accountName = e.target.value;
                                setPaymentSettings({ ...paymentSettings, networks: newNetworks });
                              }}
                            />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Number</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={net.accountNo} 
                              onChange={(e) => {
                                const newNetworks = [...paymentSettings.networks];
                                newNetworks[idx].accountNo = e.target.value;
                                setPaymentSettings({ ...paymentSettings, networks: newNetworks });
                              }}
                            />
                          </div>
                          {net.disabled && (
                            <div className="input-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Disable Reason (shown to user)</label>
                              <input 
                                type="text" 
                                className="input-field" 
                                placeholder="e.g. System upgrade, please use another network"
                                value={net.disableReason || ''} 
                                onChange={(e) => {
                                  const newNetworks = [...paymentSettings.networks];
                                  newNetworks[idx].disableReason = e.target.value;
                                  setPaymentSettings({ ...paymentSettings, networks: newNetworks });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ZAMBIA BLOCK */}
                <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginTop: '20px' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>🇿🇲 Zambia Settings</h3>
                </div>
                <div className="panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>General Settings</h3>
                  <div className="input-group" style={{ maxWidth: '300px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>USD to Kwacha (ZMW) Rate</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="input-field" 
                      value={zmPaymentSettings.rate} 
                      onChange={(e) => setZmPaymentSettings({...zmPaymentSettings, rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="panel" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Mobile Money Networks</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {zmPaymentSettings.networks?.map((net, idx) => (
                      <div key={net.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg-dark)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={net.logo} alt={net.name} style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                            <div>
                              <h4 style={{ margin: 0, fontSize: '16px' }}>{net.name}</h4>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {net.id}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', color: net.disabled ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                              {net.disabled ? 'Disabled' : 'Enabled'}
                            </span>
                            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                              <input 
                                type="checkbox" 
                                checked={!net.disabled}
                                onChange={(e) => {
                                  const newNetworks = [...zmPaymentSettings.networks];
                                  newNetworks[idx] = { ...newNetworks[idx], disabled: !e.target.checked };
                                  setZmPaymentSettings({ ...zmPaymentSettings, networks: newNetworks });
                                }}
                                style={{ opacity: 0, width: 0, height: 0 }} 
                              />
                              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: !net.disabled ? '#10B981' : '#4B5563', transition: '.4s', borderRadius: '34px' }}>
                                <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: !net.disabled ? '26px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                              </span>
                            </label>
                          </div>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Name</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={net.accountName} 
                              onChange={(e) => {
                                const newNetworks = [...zmPaymentSettings.networks];
                                newNetworks[idx].accountName = e.target.value;
                                setZmPaymentSettings({ ...zmPaymentSettings, networks: newNetworks });
                              }}
                            />
                          </div>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Account Number</label>
                            <input 
                              type="text" 
                              className="input-field" 
                              value={net.accountNo} 
                              onChange={(e) => {
                                const newNetworks = [...zmPaymentSettings.networks];
                                newNetworks[idx].accountNo = e.target.value;
                                setZmPaymentSettings({ ...zmPaymentSettings, networks: newNetworks });
                              }}
                            />
                          </div>
                          {net.disabled && (
                            <div className="input-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                              <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Disable Reason (shown to user)</label>
                              <input 
                                type="text" 
                                className="input-field" 
                                placeholder="e.g. System upgrade, please use another network"
                                value={net.disableReason || ''} 
                                onChange={(e) => {
                                  const newNetworks = [...zmPaymentSettings.networks];
                                  newNetworks[idx].disableReason = e.target.value;
                                  setZmPaymentSettings({ ...zmPaymentSettings, networks: newNetworks });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

            {/* AI FRAUD SCANNER TAB */}
                        {activeTab === 'referrals' && (
              <div>
                <h2 style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, marginBottom: '8px' }}>Referrals Overview</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>All users with their total, active (made a deposit), and inactive referrals.</p>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by Email, Name, UID, or Ref Code..." 
                    value={referralSearchQuery}
                    onChange={(e) => setReferralSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                {referralStatsLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading referral data...</div>
                ) : referralStats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <UserCheck size={40} color="var(--text-muted)" style={{ marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No referral data yet.</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ background: 'var(--bg-panel)', borderRadius: '14px', padding: '14px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-muted)' }}>Referrers</p>
                        <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>{referralStats.length}</p>
                      </div>
                      <div style={{ background: 'var(--bg-panel)', borderRadius: '14px', padding: '14px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-muted)' }}>Total Referred</p>
                        <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--warning)' }}>{referralStats.reduce((s, r) => s + r.total, 0)}</p>
                      </div>
                      <div style={{ background: 'var(--bg-panel)', borderRadius: '14px', padding: '14px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--text-muted)' }}>Active</p>
                        <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--success)' }}>{referralStats.reduce((s, r) => s + r.active, 0)}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {referralStats.filter(u => !referralSearchQuery || (u.name + u.email + u.id + u.referralCode).toLowerCase().includes(referralSearchQuery.toLowerCase())).map((u, idx) => (
                        <motion.div key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                          style={{ background: 'var(--bg-panel)', borderRadius: '12px', padding: '12px 14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{idx + 1}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email} · Code: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{u.referralCode}</span></div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '5px 10px' }}>
                              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Total</div>
                              <div style={{ fontSize: '15px', fontWeight: 800 }}>{u.total}</div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', padding: '5px 10px' }}>
                              <div style={{ fontSize: '9px', color: 'var(--success)' }}>Active</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--success)' }}>{u.active}</div>
                            </div>
                            <div style={{ textAlign: 'center', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', padding: '5px 10px' }}>
                              <div style={{ fontSize: '9px', color: 'var(--danger)' }}>Inactive</div>
                              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--danger)' }}>{u.inactive}</div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

{activeTab === 'ai_scanner' && (
              <div>
                <div style={{ padding: '0 20px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ScanFace size={28} color="#0ea5e9" />
                      AI Fraud Scanner 
                      <span style={{ fontSize: '12px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}>BETA</span>
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Real-time anomalous pattern detection and IP clustering analysis across the platform.</p>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s infinite' }} />
                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '13px' }}>System Active</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  {/* Simulated AI Radar */}
                  <div className="panel" style={{ flex: '1 1 300px', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px', background: 'linear-gradient(180deg, var(--bg-panel) 0%, rgba(14, 165, 233, 0.05) 100%)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(14, 165, 233, 0.1) 0%, transparent 70%)' }} />
                    
                    <div style={{ width: '220px', height: '220px', borderRadius: '50%', border: '1px solid rgba(14, 165, 233, 0.3)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(14, 165, 233, 0.1)' }}>
                      <div style={{ width: '160px', height: '160px', borderRadius: '50%', border: '1px dashed rgba(14, 165, 233, 0.4)' }} />
                      <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '1px solid rgba(14, 165, 233, 0.5)', position: 'absolute' }} />
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(14, 165, 233, 0.1)', border: '2px solid rgba(14, 165, 233, 0.8)', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <ShieldAlert size={20} color="#0ea5e9" />
                      </div>
                      
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                        style={{ position: 'absolute', width: '50%', height: '50%', top: 0, left: '50%', transformOrigin: 'bottom left', background: 'conic-gradient(from 0deg, transparent 0deg, rgba(14, 165, 233, 0.3) 90deg)', borderRight: '2px solid #0ea5e9', borderTopRightRadius: '100px' }}
                      />
                      
                      {/* Fake pings */}
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', top: '50px', left: '70px', boxShadow: '0 0 10px #10b981' }} />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }} style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', bottom: '60px', right: '50px', boxShadow: '0 0 10px #10b981' }} />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 2.5 }} style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', top: '90px', right: '40px', boxShadow: '0 0 10px #ef4444' }} />
                    </div>
                    
                    <h3 style={{ marginTop: '32px', color: 'var(--text-primary)', fontSize: '1.1rem', zIndex: 1 }}>Scanning for Anomalies...</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', zIndex: 1 }}>Monitoring active platform connections</p>
                  </div>

                  <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="panel" style={{ padding: '20px', height: '100%' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={20} color="var(--warning)" /> Security Events Log
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {[
                          { id: 1, type: 'suspicious_p2p', risk: 'High', msg: 'Multiple $5 P2P transfers grouped by identical device fingerprint.', time: '2 mins ago' },
                          { id: 2, type: 'rapid_withdrawal', risk: 'Medium', msg: 'Rapid withdrawal requested immediately upon new deposit.', time: '14 mins ago' },
                          { id: 3, type: 'location_change', risk: 'Low', msg: 'Admin session spawned from unrecognized geographical location.', time: '1 hr ago' },
                        ].map(event => (
                          <div key={event.id} style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: `4px solid ${event.risk === 'High' ? '#ef4444' : event.risk === 'Medium' ? '#f59e0b' : '#3b82f6'}` }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                               <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{event.risk} Risk Detected</span>
                               <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{event.time}</span>
                             </div>
                             <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{event.msg}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SYSTEM SETTINGS TAB */}
            {activeTab === 'system_settings' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', color: 'var(--text-primary)' }}>
                  <h2 style={{ fontSize: '20px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                    <ShieldAlert size={20} color="var(--primary)" /> Page Access Controls
                  </h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={fetchSystemSettings} className="btn" style={{ padding: '8px 16px', background: 'var(--bg-panel)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={16} /> Refresh
                    </button>
                    <button onClick={saveSystemSettings} className="btn btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={systemLoading}>
                      <Save size={16} /> {systemLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-primary)' }}>VIP Bots Page Control</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Block VIP Bots Page</p>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>If enabled, users will see the message below instead of the VIP Bots page content.</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                          <input 
                            type="checkbox" 
                            checked={systemSettings?.vipBotBlocked || false}
                            onChange={(e) => setSystemSettings({...systemSettings, vipBotBlocked: e.target.checked})}
                            style={{ opacity: 0, width: 0, height: 0 }} 
                          />
                          <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: systemSettings?.vipBotBlocked ? '#EF4444' : '#4B5563', transition: '.4s', borderRadius: '34px' }}>
                            <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: systemSettings?.vipBotBlocked ? '26px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                          </span>
                        </label>
                      </div>
                      
                      {systemSettings?.vipBotBlocked && (
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Block Message</label>
                          <textarea 
                            className="input-field" 
                            rows="2"
                            value={systemSettings?.vipBotMessage || ''} 
                            onChange={(e) => setSystemSettings({...systemSettings, vipBotMessage: e.target.value})}
                            placeholder="e.g. This page is currently unaccessible."
                            style={{ resize: 'vertical' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-primary)' }}>My Bots Page Control</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Block My Bots Page</p>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>If enabled, users will see the message below instead of the My Bots page content.</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                          <input 
                            type="checkbox" 
                            checked={systemSettings?.myBotsBlocked || false}
                            onChange={(e) => setSystemSettings({...systemSettings, myBotsBlocked: e.target.checked})}
                            style={{ opacity: 0, width: 0, height: 0 }} 
                          />
                          <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: systemSettings?.myBotsBlocked ? '#EF4444' : '#4B5563', transition: '.4s', borderRadius: '34px' }}>
                            <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: systemSettings?.myBotsBlocked ? '26px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                          </span>
                        </label>
                      </div>
                      
                      {systemSettings?.myBotsBlocked && (
                        <div className="input-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Block Message</label>
                          <textarea 
                            className="input-field" 
                            rows="2"
                            value={systemSettings?.myBotsMessage || ''} 
                            onChange={(e) => setSystemSettings({...systemSettings, myBotsMessage: e.target.value})}
                            placeholder="e.g. This page is currently unaccessible."
                            style={{ resize: 'vertical' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

      </div>
    </div>
  );
};
