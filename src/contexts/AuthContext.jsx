import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [qtxBalance, setQtxBalance] = useState(0);
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
            const localSession = localStorage.getItem('qtx coin_session');
            if (data.currentSessionToken && localSession && data.currentSessionToken !== localSession) {
              signOut(auth);
              localStorage.removeItem('qtx coin_session');
              toast.error('You have been logged out because your account was accessed from another device or browser.', { duration: 6000 });
              return;
            }

            setBalance(data.balance || 0);
            setQtxBalance(data.qtxBalance || 0);
            setMiningBalance(data.miningBalance || 0);
            setInvestmentBalance(data.investmentBalance || 0);
            setUserData({
              photoURL: data.photoURL || null,
              lastPhotoUpdate: data.lastPhotoUpdate || null,
              country: data.country || 'Global',
              createdAt: data.createdAt || null,
              loginHistory: data.loginHistory || [],
              notifications: data.notifications || [],
              activatedBots: data.activatedBots || [],
              activatedCrypto: data.activatedCrypto || [],
              claimedVideos: data.claimedVideos || {}
            });
          }
        });
        setLoading(false);
        return unsubDoc;
      } else {
        setBalance(0);
        setQtxBalance(0);
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
    localStorage.removeItem('qtx coin_session');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const sessionToken = Date.now().toString() + Math.random().toString(36).substring(2);
    
    // Create initial user document
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: email,
      phone: null,
      balance: 0,
      qtxBalance: 0,
      miningBalance: 0,
      investmentBalance: 0,
      country: country,
      referralCode: generateReferralCode(),
      referredByCode: referredByCode,
      firstDepositRewarded: false,
      createdAt: new Date().toISOString(),
      currentSessionToken: sessionToken
    });
    localStorage.setItem('qtx coin_session', sessionToken);
    return userCredential;
  };

  const setupRecaptcha = (containerId) => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response) => {
          // reCAPTCHA solved
        }
      });
    }
    return window.recaptchaVerifier;
  };

  const sendOTP = async (phoneNumber, appVerifier) => {
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      return confirmationResult;
    } catch (error) {
      console.error('Error sending OTP', error);
      throw error;
    }
  };

  const verifyOTP = async (code, country = 'Global', referredByCode = null) => {
    try {
      const confirmationResult = window.confirmationResult;
      const result = await confirmationResult.confirm(code);
      const user = result.user;

      localStorage.removeItem('qtx coin_session');
      const sessionToken = Date.now().toString() + Math.random().toString(36).substring(2);

      // Check if user document exists
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Initialize new phone user
        await setDoc(userRef, {
          email: null,
          phone: user.phoneNumber,
          balance: 0,
          qtxBalance: 0,
          miningBalance: 0,
          investmentBalance: 0,
          country: country,
          referralCode: generateReferralCode(),
          referredByCode: referredByCode,
          firstDepositRewarded: false,
          createdAt: new Date().toISOString(),
          currentSessionToken: sessionToken
        });
      } else {
        await updateDoc(userRef, { currentSessionToken: sessionToken });
        // Also log history
        await logLoginHistory(user.uid, userSnap);
      }
      localStorage.setItem('qtx coin_session', sessionToken);
      return result;
    } catch (error) {
      console.error('Error verifying OTP', error);
      throw error;
    }
  };

  const logLoginHistory = async (uid, userSnap) => {
    let ip = 'Unknown';
    let country = 'Unknown';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      ip = data.ip || 'Unknown';
      country = data.country || 'Unknown';
    } catch (e) {
      console.log("Could not fetch IP", e);
    }

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
      const updatedNotifications = [newNotification, ...currentNotifications];
      
      await updateDoc(userSnap.ref, { 
        loginHistory: updatedHistory,
        notifications: updatedNotifications
      });
    }
  };

  const login = async (email, password) => {
    localStorage.removeItem('qtx coin_session');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const sessionToken = Date.now().toString() + Math.random().toString(36).substring(2);
    
    // Log login history to the main user doc array to avoid subcollection rule issues
    try {
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, { currentSessionToken: sessionToken });
        await logLoginHistory(userCredential.user.uid, userSnap);
      }
    } catch (err) {
      console.error("Error saving login history:", err);
    }
    
    localStorage.setItem('qtx coin_session', sessionToken);
    return userCredential;
  };

  const logout = () => {
    localStorage.removeItem('qtx coin_session');
    return signOut(auth);
  };

  const buyQTX = async (amountUSD, currentPrice) => {
    if (!currentUser) return false;
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const qtxAmount = amountUSD / currentPrice;
      const newNotif = {
        id: Date.now().toString() + '_buy',
        type: 'transaction',
        title: 'Bought QTX',
        message: `Purchased ${qtxAmount.toFixed(4)} QTX for $${amountUSD.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      const updatedNotifs = [newNotif, ...(userData.notifications || [])].slice(0, 30);
      
      await updateDoc(userRef, {
        balance: balance - amountUSD,
        qtxBalance: qtxBalance + qtxAmount,
        notifications: updatedNotifs
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const sellQTX = async (amountQTX, currentPrice) => {
    if (!currentUser) return false;
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const usdAmount = amountQTX * currentPrice;
      const newNotif = {
        id: Date.now().toString() + '_sell',
        type: 'transaction',
        title: 'Sold QTX',
        message: `Sold ${amountQTX.toFixed(4)} QTX for $${usdAmount.toFixed(2)}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      const updatedNotifs = [newNotif, ...(userData.notifications || [])].slice(0, 30);
      
      await updateDoc(userRef, {
        balance: balance + usdAmount,
        qtxBalance: qtxBalance - amountQTX,
        notifications: updatedNotifs
      });
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const isAdmin = currentUser && currentUser.email === 'mackocks588@gmail.com';

  const value = {
    currentUser,
    isAdmin,
    balance,
    qtxBalance,
    miningBalance,
    investmentBalance,
    userData,
    signup,
    setupRecaptcha,
    sendOTP,
    verifyOTP,
    login,
    logout,
    buyQTX,
    sellQTX
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
