const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.jsx', 'utf8');

code = code.replace(
  "const [loading, setLoading] = useState(true);",
  "const [transfers, setTransfers] = useState([]);\n  const [loading, setLoading] = useState(true);"
);

code = code.replace(
  "const [paymentLoading, setPaymentLoading] = useState(false);",
  "const [transferSettings, setTransferSettings] = useState({ autoApprove: false });\n  const [paymentLoading, setPaymentLoading] = useState(false);"
);

code = code.replace(
  "if (activeTab === 'users') fetchUsersList();",
  "if (activeTab === 'users') fetchUsersList();\n      if (activeTab === 'p2p_transfers') { fetchTransfers(); fetchTransferSettings(); }"
);

code = code.replace(
  "const fetchDeposits = async () => {",
  `const fetchTransfers = async () => {
    setLoading(true);
    try {
      const { collectionGroup, query, where, orderBy, getDocs, doc, getDoc } = require('firebase/firestore');
      const q = query(collectionGroup(db, 'transactions'), where('type', '==', 'transfer_out'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(docSnap => {
        const userRef = docSnap.ref.parent.parent;
        return {
          id: docSnap.id,
          userId: userRef ? userRef.id : 'unknown',
          ref: docSnap.ref,
          ...docSnap.data()
        };
      });
      setTransfers(data);
    } catch (error) {
      console.error(error);
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

  const fetchDeposits = async () => {`
);

code = code.replace(
  `if (!currentUser) return <div className="p-4 text-center">Please login</div>;`,
  `const handleApproveP2P = async (transfer) => {
    try {
      const approveFn = httpsCallable(functions, 'adminApproveTransfer');
      const res = await approveFn({ transferId: transfer.id, action: 'approve' });
      if(res.data.success) {
        toast.success('Transfer Approved');
        setTransfers(prev => prev.map(t => t.id === transfer.id ? { ...t, status: 'SUCCESS' } : t));
      } else {
        toast.error(res.data.message || 'Error');
      }
    } catch (error) {
      toast.error('Failed to approve transfer');
    }
  };

  const handleRejectP2P = async (transfer) => {
    const confirmReject = window.confirm('Are you sure you want to reject this transfer?');
    if (!confirmReject) return;
    try {
      const approveFn = httpsCallable(functions, 'adminApproveTransfer');
      const res = await approveFn({ transferId: transfer.id, action: 'reject' });
      if(res.data.success) {
        toast.success('Transfer Rejected');
        setTransfers(prev => prev.map(t => t.id === transfer.id ? { ...t, status: 'rejected' } : t));
      }
    } catch (error) {
      toast.error('Failed to reject transfer');
    }
  };

  if (!currentUser) return <div className="p-4 text-center">Please login</div>;`
);

code = code.replace(
  `<TabButton id="binance_explore" icon={Search} label="Binance Explore" />`,
  `<TabButton id="p2p_transfers" icon={Send} label="P2P Transfers" />
          <TabButton id="binance_explore" icon={Search} label="Binance Explore" />`
);

code = code.replace(
  `{/* BINANCE EXPLORE TAB */}`,
  `{/* P2P TRANSFERS TAB */}
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
                      <div key={t.id} style={{ background: 'var(--bg-dark)', borderRadius: '8px', border: \`1px solid \${t.status === 'pending' ? 'var(--warning)' : 'var(--border)'}\`, overflow: 'hidden' }}>
                        <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sender UID:</span>
                            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#fff' }}>
                              {t.userId.substring(0,8)}...
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>\${t.amount?.toFixed(2)}</div>
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

            {/* BINANCE EXPLORE TAB */}`
);

fs.writeFileSync('src/pages/Admin.jsx', code);
console.log('Admin patched successfully');
