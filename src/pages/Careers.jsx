import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../hooks/useCurrency';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { ChevronLeft, Users, UserCheck, Briefcase, CheckCircle2, AlertTriangle, UploadCloud, ScanFace, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const POSITIONS = [
    { title: 'Intern Assistant', salaryUSD: 150, reqReferrals: 20 },
    { title: 'Formal Assistant', salaryUSD: 262.5, reqReferrals: 35 },
    { title: 'Formal Supervisor', salaryUSD: 300, reqReferrals: 45 },
    { title: 'Marketing Manager', salaryUSD: 450, reqReferrals: 50 },
    { title: 'Regional Minister', salaryUSD: 562.5, reqReferrals: 60 },
    { title: 'Regional Partners', salaryUSD: 750, reqReferrals: 75 }
];

export const Careers = () => {
    const { currentUser, userData } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [referrals, setReferrals] = useState({ total: 0, active: 0, refs: [] });
    const [loadingRefs, setLoadingRefs] = useState(true);

    const [modalData, setModalData] = useState(null); 
    const [currentStep, setCurrentStep] = useState(1);
    const [showRequirementPopup, setShowRequirementPopup] = useState(false);
    const [aiScanning, setAiScanning] = useState(false);

    // Application state
    const [fullName, setFullName] = useState(userData?.fullName || '');
    const [phone, setPhone] = useState(userData?.phoneNumber || '');
    const [idFile, setIdFile] = useState(null);
    const [selfieFile, setSelfieFile] = useState(null);
    const [idPreview, setIdPreview] = useState(null);
    const [selfiePreview, setSelfiePreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const fetchReferrals = async () => {
            if (!currentUser) return;
            setLoadingRefs(true);
            try {
                const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
                const myReferralCode = userSnap.data()?.referralCode;

                if (myReferralCode) {
                    const referralsQ = query(
                        collection(db, 'users'),
                        where('referredByCode', '==', myReferralCode)
                    );
                    const referralsSnap = await getDocs(referralsQ);
                    
                    const refsData = [];
                    referralsSnap.forEach((docSnap) => {
                        refsData.push(docSnap.id);
                    });

                    const checkPromises = refsData.map(async (uid) => {
                        const txSnap = await getDocs(query(collection(db, 'users', uid, 'transactions'), where('status', '==', 'SUCCESS')));
                        return !txSnap.empty;
                    });
                    const activeChecks = await Promise.all(checkPromises);
                    const activeCount = activeChecks.filter(Boolean).length;

                    setReferrals({
                        total: refsData.length,
                        active: activeCount,
                        refs: refsData
                    });
                }
            } catch (error) {
                console.error("Error fetching referrals:", error);
            }
            setLoadingRefs(false);
        };
        fetchReferrals();
    }, [currentUser]);

    const handleApplyClick = (pos) => {
        setModalData(pos);
        setCurrentStep(1);
        setShowSuccess(false);
        setFullName(userData?.fullName || '');
        setPhone(userData?.phoneNumber || '');
        setIdFile(null);
        setSelfieFile(null);
        setIdPreview(null);
        setSelfiePreview(null);
    };

    const handleNextStep = (e) => {
        e.preventDefault();
        if (referrals.active < modalData.reqReferrals) {
            setShowRequirementPopup(true);
            return;
        }

        if (!fullName || !phone) {
            toast.error("Please provide your name and phone number");
            return;
        }

        setCurrentStep(2);
    };

    const handlePreSubmit = (e) => {
        e.preventDefault();
        
        if (!idFile || !selfieFile) {
            toast.error("Please upload your required documents");
            return;
        }

        executeApplicationWithAI();
    };

    const executeApplicationWithAI = () => {
        setAiScanning(true);
        setTimeout(() => {
            setAiScanning(false);
            submitApplication();
        }, 2500);
    };

    const submitApplication = async () => {
        setSubmitting(true);
        try {
            const idBase64 = await fileToBase64(idFile);
            const selfieBase64 = await fileToBase64(selfieFile);

            const applicationData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                position: modalData.title,
                salaryUSD: modalData.salaryUSD,
                requiredReferrals: modalData.reqReferrals,
                userReferrals: {
                    total: referrals.total,
                    active: referrals.active,
                    referralUIDs: referrals.refs
                },
                fullName: fullName,
                phone: phone,
                idDocument: idBase64,
                selfie: selfieBase64,
                status: 'pending',
                timestamp: serverTimestamp(),
                idFileName: idFile.name,
                selfieFileName: selfieFile.name,
                idFileType: idFile.type,
                selfieFileType: selfieFile.type
            };

            await addDoc(collection(db, 'job_applications'), applicationData);
            
            setShowSuccess(true);
            
            setTimeout(() => {
                setModalData(null);
                setShowSuccess(false);
            }, 3000);

        } catch (err) {
            console.error("Error applying:", err);
            toast.error("Error submitting application. Please try again.");
        }
        setSubmitting(false);
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        if (type === 'id') {
            setIdFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => setIdPreview(ev.target.result);
                reader.readAsDataURL(file);
            } else {
                setIdPreview(null);
            }
        } else {
            setSelfieFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => setSelfiePreview(ev.target.result);
                reader.readAsDataURL(file);
            } else {
                setSelfiePreview(null);
            }
        }
    };

    return (
        <motion.div 
            className="page-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ padding: '16px', position: 'relative', zIndex: 1, paddingBottom: '90px' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button 
                    onClick={() => navigate(-1)}
                    style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={22} color="var(--primary)" />
                    <h2 style={{ fontSize: '20px', margin: 0, color: '#fff' }}>Company Positions</h2>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {POSITIONS.map((pos, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={idx}
                        style={{
                            background: 'var(--bg-panel)',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{pos.title}</span>
                                <span style={{ fontSize: '14px', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                   <div style={{width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                       <span style={{color: 'var(--success)', fontSize: '10px', fontWeight: 900}}>$</span>
                                   </div>
                                   ${pos.salaryUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Users size={14} color="var(--warning)" /> Required: {pos.reqReferrals} active referrals
                                </span>
                            </div>
                            <button 
                                onClick={() => handleApplyClick(pos)}
                                className="btn btn-primary"
                                style={{ 
                                    padding: '10px 24px', 
                                    borderRadius: '40px', 
                                    fontSize: '14px',
                                }}
                            >
                                Apply
                            </button>
                        </div>
                    </motion.div>
                ))}

                <div style={{
                    marginTop: '20px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.7',
                    fontSize: '14px',
                    background: 'var(--bg-panel)',
                    padding: '24px',
                    borderRadius: '24px',
                    border: '1px solid var(--border)'
                }}>
                    QTX-coin platform has always valued talents. When you apply to become a QTX-coin online manager, your behavior will be regarded as representing QTX-coin. This is not only an honor, but also a heavy responsibility. Therefore, please always maintain a high level of professionalism and moral standards.
                </div>
            </div>

            {/* Application Multi-Step Bottom Sheet */}
            <AnimatePresence>
                {modalData && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ 
                            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', 
                            zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                            backdropFilter: 'blur(4px)',
                            paddingBottom: '85px' // Padding ensures Next button raises above bottom nav
                        }}
                        onClick={() => setModalData(null)}
                    >
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
                            style={{
                                backgroundColor: 'var(--bg-panel)',
                                borderTopLeftRadius: '24px',
                                borderTopRightRadius: '24px',
                                padding: '12px 20px 20px 20px',
                                maxHeight: '85vh',
                                overflowY: 'auto',
                                position: 'relative',
                                boxShadow: '0 -15px 40px rgba(0,0,0,0.4)',
                                width: '100%',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--text-muted)', opacity: 0.3, borderRadius: '10px', alignSelf: 'center', margin: '4px 0 16px 0' }} />
                                {!showSuccess ? (
                                    <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                                            Step {currentStep} of 2
                                        </h3>
                                        <button type="button" onClick={() => setModalData(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                            ✕
                                        </button>
                                    </div>
                                    <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '16px', marginTop: '0' }}>Applying: {modalData.title}</p>

                                    {currentStep === 1 && (
                                        <form onSubmit={handleNextStep}>
                                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><Users size={12} style={{marginRight: '6px', verticalAlign: 'text-top'}}/>Total Referrals</span>
                                                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{loadingRefs ? '...' : referrals.total}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0' }}>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><UserCheck size={12} style={{marginRight: '6px', verticalAlign: 'text-top'}}/>Active Referrals</span>
                                                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{loadingRefs ? '...' : referrals.active}</span>
                                                </div>
                                                
                                                <div style={{ 
                                                    background: referrals.active >= modalData.reqReferrals ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', 
                                                    color: referrals.active >= modalData.reqReferrals ? 'var(--success)' : 'var(--danger)',
                                                    padding: '8px', borderRadius: '8px', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', marginTop: '12px'
                                                }}>
                                                    {referrals.active >= modalData.reqReferrals ? 
                                                        `✓ Requirement Met!` : 
                                                        `✗ Required: ${modalData.reqReferrals} referrals`
                                                    }
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div className="input-group" style={{ margin: 0 }}>
                                                    <label className="input-label" style={{ fontSize: '0.85rem', marginBottom: '6px' }}>Full Name</label>
                                                    <input 
                                                        type="text" 
                                                        className="input-field"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        placeholder="Enter your full name" 
                                                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '0.95rem' }}
                                                        required
                                                    />
                                                </div>
                                                
                                                <div className="input-group" style={{ margin: 0 }}>
                                                    <label className="input-label" style={{ fontSize: '0.85rem', marginBottom: '6px' }}>Phone Number</label>
                                                    <input 
                                                        type="tel" 
                                                        className="input-field"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        placeholder="e.g., +254712345678" 
                                                        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: '0.95rem' }}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <button 
                                                type="submit" 
                                                className="btn btn-primary w-100" 
                                                style={{ padding: '12px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '6px' }}
                                            >
                                                Next Step <ChevronRight size={18} />
                                            </button>
                                        </form>
                                    )}

                                    {currentStep === 2 && (
                                        <form onSubmit={handlePreSubmit}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div className="input-group" style={{ margin: 0 }}>
                                                    <label className="input-label" style={{ fontSize: '0.85rem', marginBottom: '6px' }}>National ID / Passport</label>
                                                    <div 
                                                        onClick={() => document.getElementById('idFile').click()}
                                                        style={{ background: 'rgba(0,0,0,0.2)', border: '2px dashed var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
                                                    >
                                                        <UploadCloud size={24} color="var(--primary)" style={{ marginBottom: '6px' }} />
                                                        <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Upload document</p>
                                                        {idFile && <p style={{ margin: '6px 0 0', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>{idFile.name}</p>}
                                                    </div>
                                                    <input type="file" id="idFile" style={{ display: 'none' }} accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => handleFileChange(e, 'id')} />
                                                    {idPreview && <div style={{marginTop: '8px', padding: '6px', background: 'var(--bg-dark)', borderRadius: '10px', border: '1px solid var(--border)'}}><img src={idPreview} alt="ID Preview" style={{ width: '100%', height: '70px', objectFit: 'contain', borderRadius: '6px' }} /></div>}
                                                </div>

                                                <div className="input-group" style={{ margin: 0 }}>
                                                    <label className="input-label" style={{ fontSize: '0.85rem', marginBottom: '6px' }}>Selfie Photo</label>
                                                    <div 
                                                        onClick={() => document.getElementById('selfieFile').click()}
                                                        style={{ background: 'rgba(0,0,0,0.2)', border: '2px dashed var(--border)', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
                                                    >
                                                        <UploadCloud size={24} color="var(--primary)" style={{ marginBottom: '6px' }} />
                                                        <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Upload selfie</p>
                                                        {selfieFile && <p style={{ margin: '6px 0 0', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>{selfieFile.name}</p>}
                                                    </div>
                                                    <input type="file" id="selfieFile" style={{ display: 'none' }} accept=".jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'selfie')} />
                                                    {selfiePreview && <div style={{marginTop: '8px', padding: '6px', background: 'var(--bg-dark)', borderRadius: '10px', border: '1px solid var(--border)'}}><img src={selfiePreview} alt="Selfie Preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} /></div>}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                                <button 
                                                    type="button"
                                                    onClick={() => setCurrentStep(1)}
                                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
                                                    disabled={submitting}
                                                >
                                                    Back
                                                </button>
                                                <button 
                                                    type="submit" 
                                                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                                                    disabled={submitting || aiScanning}
                                                >
                                                    {submitting ? 'Submitting...' : 'Submit Now'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '24px 10px 10px 10px' }}>
                                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
                                            <CheckCircle2 size={30} color="var(--success)" />
                                        </div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Application Submitted!</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4', margin: '0' }}>Your application for <br/><strong style={{color: 'var(--primary)'}}>{modalData.title}</strong><br/> has been successfully received.</p>
                                    </div>
                                )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Scanning Modal */}
            <AnimatePresence>
                {aiScanning && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ 
                            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', 
                            zIndex: 10000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        <motion.div 
                            animate={{ rotateY: [0, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}
                        >
                            <ScanFace size={40} color="var(--success)" />
                        </motion.div>
                        <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: 600, letterSpacing: '1px', textAlign: 'center' }}>AI Security Scan</h3>
                            <p style={{ margin: '8px 0 0 0', color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center' }}>Verifying document authenticity...</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Requirement Popup Bottom Sheet */}
            <AnimatePresence>
                {showRequirementPopup && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ 
                            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', 
                            zIndex: 10000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                            backdropFilter: 'blur(4px)',
                            paddingBottom: '85px'
                        }}
                        onClick={() => setShowRequirementPopup(false)}
                    >
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.8 }}
                            style={{
                                backgroundColor: 'var(--bg-panel)',
                                borderTopLeftRadius: '24px',
                                borderTopRightRadius: '24px',
                                padding: '12px 20px 24px 20px',
                                position: 'relative',
                                boxShadow: '0 -15px 40px rgba(0,0,0,0.5)',
                                borderTop: '2px solid var(--danger)',
                                textAlign: 'center'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--text-muted)', opacity: 0.3, borderRadius: '10px', alignSelf: 'center', marginBottom: '16px' }} />
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '2px solid rgba(239,68,68,0.3)' }}>
                                <AlertTriangle size={24} color="var(--danger)" />
                            </div>
                            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: '0 0 8px', fontWeight: 800 }}>Requirements Not Met</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                You don't meet the active referral requirements for this position.
                            </p>
                            
                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                                    <span style={{color: 'var(--text-secondary)'}}>Required</span>
                                    <strong style={{color: 'var(--text-primary)'}}>{modalData?.reqReferrals}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                                    <span style={{color: 'var(--text-secondary)'}}>Current Active</span>
                                    <strong style={{color: 'var(--danger)'}}>{referrals.active}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{color: 'var(--text-secondary)'}}>Shortfall</span>
                                    <strong style={{color: 'var(--danger)'}}>{Math.max(0, (modalData?.reqReferrals || 0) - referrals.active)}</strong>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowRequirementPopup(false)}
                                style={{ width: '100%', background: 'var(--danger)', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}
                            >
                                Dismiss
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
