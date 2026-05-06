import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [miningBalance, setMiningBalance] = useState(0);
  const [investmentBalance, setInvestmentBalance] = useState(0);
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Listen to live balance
        const unsubDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Concurrent login check
            const localSession = localStorage.getItem('fintex_session');
            if (data.currentSessionToken && localSession && data.currentSessionToken !== localSession) {
              signOut(auth);
              localStorage.removeItem('fintex_session');
              toast.error('You have been logged out because your account was accessed from another device or browser.', { duration: 6000 });
              return;
            }

            setBalance(data.balance || 0);
            setMiningBalance(data.miningBalance || 0);
            setInvestmentBalance(data.investmentBalance || 0);
            setUserData({
              photoURL: data.photoURL || null,
              lastPhotoUpdate: data.lastPhotoUpdate || null,
              country: data.country || 'Global',
              createdAt: data.createdAt || null,
              loginHistory: data.loginHistory || [],
              notifications: data.notifications || [],
              activatedBots: data.activatedBots || []
            });
          }
        });
        setLoading(false);
        return unsubDoc;
      } else {
        setBalance(0);
        setMiningBalance(0);
        setInvestmentBalance(0);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const signup = async (email, password, country = 'Global', referredByCode = null) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const sessionToken = Date.now().toString() + Math.random().toString(36).substring(2);
    localStorage.setItem('fintex_session', sessionToken);
    
    // Create initial user document
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: email,
      balance: 0,
      miningBalance: 0,
      investmentBalance: 0,
      country: country,
      referralCode: generateReferralCode(),
      referredByCode: referredByCode,
      firstDepositRewarded: false,
      createdAt: new Date().toISOString(),
      currentSessionToken: sessionToken
    });
    return userCredential;
  };

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const sessionToken = Date.now().toString() + Math.random().toString(36).substring(2);
    localStorage.setItem('fintex_session', sessionToken);
    
    // Log login history to the main user doc array to avoid subcollection rule issues
    try {
      let ip = 'Unknown';
      let country = 'Unknown';
      
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
        const data = await res.json();
        ip = data.ip || 'Unknown';
        country = data.country || 'Unknown';
      } catch (e) {
        console.log("Could not fetch IP", e);
      }

      const userRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const currentHistory = userSnap.data().loginHistory || [];
        const currentNotifications = userSnap.data().notifications || [];
        
        const newEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          ip,
          country,
          device: navigator.userAgent
        };
        const updatedHistory = [newEntry, ...currentHistory].slice(0, 10);
        
        const newNotification = {
          id: Date.now().toString() + '_notif',
          type: 'security',
          title: 'New Login Detected',
          message: `Account accessed from ${ip} (${country}). Device: ${navigator.userAgent.substring(0, 30)}...`,
          timestamp: new Date().toISOString(),
          read: false
        };
        const updatedNotifications = [newNotification, ...currentNotifications].slice(0, 30);
        
        await updateDoc(userRef, { 
          loginHistory: updatedHistory,
          notifications: updatedNotifications,
          currentSessionToken: sessionToken
        });
      }
    } catch (err) {
      console.error("Error saving login history:", err);
    }
    
    return userCredential;
  };

  const logout = () => {
    localStorage.removeItem('fintex_session');
    return signOut(auth);
  };

  const isAdmin = currentUser && currentUser.email === 'mackocks588@gmail.com';

  const value = {
    currentUser,
    isAdmin,
    balance,
    miningBalance,
    investmentBalance,
    userData,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
