const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config({ path: require("path").resolve(__dirname, "./.env") });

const serviceAccount = require("./serviceAccount.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY;

function getBinanceSignature(queryString) {
  return crypto
    .createHmac("sha256", BINANCE_SECRET_KEY)
    .update(queryString)
    .digest("hex");
}

async function sendPushNotification(uid, title, body) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      const fcmToken = userDoc.data().fcmToken;
      if (fcmToken) {
        await admin.messaging().send({
          token: fcmToken,
          notification: { title, body }
        });
        console.log(`Push notification sent to ${uid}`);
      }
    }
  } catch (error) {
    console.error(`Failed to send push notification to ${uid}:`, error);
  }
}

exports.verifyPendingDeposits = functions.region('europe-west1').pubsub.schedule('every 5 minutes').onRun(async (context) => {
  if (!BINANCE_API_KEY || !BINANCE_SECRET_KEY) {
    console.error("Binance API keys missing");
    return null;
  }

  try {
    const pendingDepositsSnapshot = await db.collectionGroup("transactions")
      .where("type", "==", "deposit")
      .where("status", "==", "pending")
      .get();

    if (pendingDepositsSnapshot.empty) {
      console.log("No pending deposits found.");
      return null;
    }

    const pendingDocs = [];
    pendingDepositsSnapshot.forEach(doc => {
      pendingDocs.push({ id: doc.id, ref: doc.ref, ...doc.data() });
    });

    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=60000`;
    const signature = getBinanceSignature(queryString);

    const binanceResponse = await axios.get(
      `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${queryString}&signature=${signature}`,
      {
        headers: {
          "X-MBX-APIKEY": BINANCE_API_KEY
        }
      }
    );

    const binanceDeposits = binanceResponse.data;

    for (const pendingTx of pendingDocs) {
      const matchedDeposit = binanceDeposits.find(dep => dep.txId === pendingTx.txid);

      if (matchedDeposit) {
        if (matchedDeposit.status === 1) {
          const amount = parseFloat(matchedDeposit.amount);
          
          if (amount > 0) {
            const userRef = pendingTx.ref.parent.parent;
            const userId = userRef.id;

            await db.runTransaction(async (transaction) => {
              const txDoc = await transaction.get(pendingTx.ref);
              if (txDoc.data().status !== "pending") return;

              const userDoc = await transaction.get(userRef);
              const userData = userDoc.data() || {};
              const currentBalance = userData.balance || 0;

              // 1. Verify and Credit User
              transaction.update(pendingTx.ref, {
                status: "verified",
                amount: amount,
                coin: matchedDeposit.coin,
                network: matchedDeposit.network
              });

              transaction.set(userRef, { 
                balance: currentBalance + amount,
                firstDepositRewarded: true 
              }, { merge: true });
            });

            // 2. Process 3-Tier Affiliates (outside transaction to avoid complex lookups, or inside if you prefer)
            // For USDT deposits, we implement the same 3-tier logic as Palmpesa
            try {
              const TIERS = [
                { pct: 0.10, label: 'Level 1 (Direct) Commission' },
                { pct: 0.03, label: 'Level 2 Commission' },
                { pct: 0.01, label: 'Level 3 Commission' },
              ];
              let currentUid = userId;
              
              for (let tier = 0; tier < TIERS.length; tier++) {
                const uDoc = await db.collection("users").doc(currentUid).get();
                if (!uDoc.exists) break;
                const referredByCode = uDoc.data().referredByCode;
                if (!referredByCode) break;

                const refSnap = await db.collection("users").where("referralCode", "==", referredByCode).limit(1).get();
                if (refSnap.empty) break;

                const referrerDoc = refSnap.docs[0];
                const referrerId = referrerDoc.id;
                const referrerData = referrerDoc.data();
                
                let commission = amount * TIERS[tier].pct;
                let currency = "USDT";

                // Currency Conversion logic
                if (referrerData.country === 'Tanzania') {
                  commission = parseFloat((commission * 2600).toFixed(2));
                  currency = "TZS";
                } else {
                  commission = parseFloat(commission.toFixed(4));
                }

                await db.collection("users").doc(referrerId).update({
                  balance: admin.firestore.FieldValue.increment(commission)
                });

                await db.collection("users").doc(referrerId).collection("transactions").add({
                  type: 'affiliate_reward',
                  title: TIERS[tier].label,
                  amount: commission,
                  currency: currency,
                  fromUid: userId, // Always from the original depositor
                  status: 'SUCCESS',
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                currentUid = referrerId;
              }
            } catch (e) {
              console.error("USDT Affiliate reward error:", e);
            }

            console.log(`Verified deposit ${pendingTx.txid} for ${amount} ${matchedDeposit.coin}`);
            await sendPushNotification(userId, "Deposit Successful", `Your deposit of ${amount} ${matchedDeposit.coin} has been verified and credited!`);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error running verifyPendingDeposits:", error.response?.data || error.message);
  }
  return null;
});

exports.processBotPayouts = functions.region('europe-west1').pubsub.schedule('every 1 hours').onRun(async (context) => {
  try {
    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.empty) return null;

    const now = Date.now();
    const msInDay = 1000 * 60 * 60 * 24;

    for (const userDoc of usersSnapshot.docs) {
      await db.runTransaction(async (transaction) => {
        const freshSnap = await transaction.get(userDoc.ref);
        if (!freshSnap.exists) return;
        const freshData = freshSnap.data();
        const activatedBots = freshData.activatedBots || [];
        const activatedCrypto = freshData.activatedCrypto || [];
        
        let updated = false;
        let totalProfit = 0;

        const newBots = activatedBots.map(bot => {
          if (bot.status !== 'running') return bot;
          const activatedTime = new Date(bot.activatedAt).getTime();
          const lastPayout = bot.lastPayoutAt ? new Date(bot.lastPayoutAt).getTime() : activatedTime;
          
          if (now >= lastPayout + msInDay) {
            const invested = parseFloat(bot.userAmount || bot.price || 0);
            const percent = parseFloat(bot.dailyPercent || parseInt(bot.returnRange) || 0);
            const profit = (invested * percent) / 100;
            
            totalProfit += profit;
            bot.lastPayoutAt = new Date(lastPayout + msInDay).toISOString();
            updated = true;
          }
          return bot;
        });

        const newCrypto = activatedCrypto.map(crypto => {
          if (crypto.status !== 'running') return crypto;
          const activatedTime = new Date(crypto.activatedAt).getTime();
          const lastPayout = crypto.lastPayoutAt ? new Date(crypto.lastPayoutAt).getTime() : activatedTime;
          
          if (now >= lastPayout + msInDay) {
            const invested = parseFloat(crypto.price || 0);
            const CRYPTO_RATES = { doge: 2.2, ada: 3, matic: 3.6, xrp: 4, link: 5, dot: 6, avax: 7, sol: 8, eth: 9, btc: 10 };
            const percent = CRYPTO_RATES[crypto.id] || parseFloat(crypto.dailyPercent || 0);
            const profit = (invested * percent) / 100;
            
            totalProfit += profit;
            crypto.lastPayoutAt = new Date(lastPayout + msInDay).toISOString();
            updated = true;
          }
          return crypto;
        });

        if (updated) {
          const currentBalance = freshData.balance || 0;
          const currentMiningBalance = freshData.miningBalance || 0;
          
          transaction.update(userDoc.ref, {
            activatedBots: newBots,
            activatedCrypto: newCrypto,
            ...(totalProfit > 0 && {
              balance: currentBalance + totalProfit,
              miningBalance: currentMiningBalance + totalProfit
            })
          });

          if (totalProfit > 0) {
            const txRef = userDoc.ref.collection('transactions').doc();
            transaction.set(txRef, {
              type: 'bot_profit',
              amount: totalProfit,
              currency: 'USD',
              status: 'verified',
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            sendPushNotification(userDoc.id, "Mining Profit", `Your bots generated $${totalProfit.toFixed(2)} in profit today!`);
          }
        }
      });
    }
  } catch (err) {
    console.error("Error processing bot payouts:", err);
  }
  return null;
});

exports.onTransactionUpdated = functions.region('europe-west1').firestore
  .document('users/{userId}/transactions/{transactionId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    const userId = context.params.userId;

    if (oldData.status === 'pending' && newData.status !== 'pending') {
      if (newData.type === 'withdrawal') {
        if (newData.status === 'SUCCESS' || newData.status === 'success') {
          await sendPushNotification(userId, "Withdrawal Approved", `Your withdrawal of $${newData.amount} has been approved and processed.`);
        } else if (newData.status === 'failed' || newData.status === 'rejected') {
          await sendPushNotification(userId, "Withdrawal Failed", `Your withdrawal of $${newData.amount} was rejected. Reason: ${newData.failureReason || 'Admin action'}`);
        }
      }
    }
});

exports.adminSendPushNotification = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  
  const { userId, title, body } = data;
  if (!title || !body) throw new functions.https.HttpsError('invalid-argument', 'Title and body are required');

  try {
    if (userId === 'all') {
      const usersSnap = await db.collection('users').get();
      const tokens = [];
      usersSnap.forEach(doc => {
        if (doc.data().fcmToken) tokens.push(doc.data().fcmToken);
      });
      
      if (tokens.length > 0) {
        const messages = { notification: { title, body }, tokens: tokens };
        const response = await admin.messaging().sendEachForMulticast(messages);
        return { success: true, sentCount: response.successCount };
      }
      return { success: true, sentCount: 0 };
    } else {
      await sendPushNotification(userId, title, body);
      return { success: true, sentCount: 1 };
    }
  } catch (error) {
    console.error("Admin push error:", error);
    throw new functions.https.HttpsError('internal', 'Failed to send notifications');
  }
});

Object.assign(exports, require('./palmpesa'));

exports.getBinanceDeposits = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!BINANCE_API_KEY || !BINANCE_SECRET_KEY) throw new functions.https.HttpsError('failed-precondition', 'Binance API keys not configured');

  const endTime = Date.now();
  const startTime = endTime - 90 * 24 * 60 * 60 * 1000;
  const allDeposits = [];
  const qs = `coin=USDT&startTime=${startTime}&endTime=${endTime}&timestamp=${Date.now()}`;
  const sig = getBinanceSignature(qs);
  try {
    const res = await axios.get(`https://api.binance.com/sapi/v1/capital/deposit/hisrec?${qs}&signature=${sig}`, { headers: { 'X-MBX-APIKEY': BINANCE_API_KEY } });
    const deposits = res.data || [];
    deposits.forEach(d => allDeposits.push({
      txid: d.txId || d.id || '',
      coin: d.coin,
      amount: d.amount,
      status: d.status === 1 ? 'Success' : 'Pending',
      date: new Date(d.insertTime).toLocaleString(),
      insertTime: d.insertTime
    }));
  } catch (e) {
    console.error(`Binance fetch error:`, e.message);
  }

  allDeposits.sort((a, b) => b.insertTime - a.insertTime);
  return { deposits: allDeposits };
});

exports.claimVideoReward = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  const { videoId } = data;
  const uid = context.auth.uid;
  const userRef = db.collection('users').doc(uid);

  try {
    return await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data();
      const claimedVideos = userData.claimedVideos || {};
      
      const activatedCrypto = userData.activatedCrypto || [];
      const activeCrypto = activatedCrypto.filter(c => c.status === 'running');
      if (activeCrypto.length === 0) throw new functions.https.HttpsError('failed-precondition', 'Need active crypto investment');

      const TOTAL_VIDEOS = 6;
      let totalReward = 0;
      activeCrypto.forEach(crypto => {
        const invested = parseFloat(String(crypto.price || '0').replace(/[^0-9.-]+/g,""));
        const CRYPTO_RATES = { doge: 2.2, ada: 3, matic: 3.6, xrp: 4, link: 5, dot: 6, avax: 7, sol: 8, eth: 9, btc: 10 };
        const percent = CRYPTO_RATES[crypto.id] || 0;
        totalReward += (invested * percent / 100) / TOTAL_VIDEOS;
      });

      const currentBalance = userData.balance || 0;
      claimedVideos[videoId] = new Date().toISOString();
      transaction.update(userRef, { balance: currentBalance + totalReward, claimedVideos });

      const txRef = userRef.collection('transactions').doc();
      transaction.set(txRef, { type: 'movie_reward', amount: totalReward, currency: 'USDT', status: 'verified', createdAt: admin.firestore.FieldValue.serverTimestamp() });

      return { success: true, rewardAmount: totalReward };
    });
  } catch (err) {
    throw new functions.https.HttpsError('internal', err.message);
  }
});
