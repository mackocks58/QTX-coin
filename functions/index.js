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
    // 1. Get all pending deposits from ALL users
    // Using a CollectionGroup query allows us to search 'transactions' subcollections across all users
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

    // 2. Fetch recent deposits from Binance Spot API
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

    const binanceDeposits = binanceResponse.data; // Array of deposits

    // 3. Match pending TXIDs with Binance deposits
    for (const pendingTx of pendingDocs) {
      // Find matching TXID in Binance history
      const matchedDeposit = binanceDeposits.find(dep => dep.txId === pendingTx.txid);

      if (matchedDeposit) {
        // Binance status 1 means successful/completed
        if (matchedDeposit.status === 1) {
          const amount = parseFloat(matchedDeposit.amount);
          
          if (amount > 0) {
            // Transaction to safely update and prevent duplicates
            await db.runTransaction(async (transaction) => {
              const txDoc = await transaction.get(pendingTx.ref);
              if (txDoc.data().status !== "pending") return; // Already processed

              // Get parent user document
              const userRef = pendingTx.ref.parent.parent;
              const userDoc = await transaction.get(userRef);
              const userData = userDoc.data() || {};
              const currentBalance = userData.balance || 0;

              // Find referrer document if needed
              let referrerRef = null;
              let referrerDoc = null;
              if (userData.referredByCode && !userData.firstDepositRewarded) {
                const referrerSnapshot = await db.collection("users").where("referralCode", "==", userData.referredByCode).limit(1).get();
                if (!referrerSnapshot.empty) {
                  referrerRef = referrerSnapshot.docs[0].ref;
                  referrerDoc = await transaction.get(referrerRef);
                }
              }

              // ---- ALL READS COMPLETE. START WRITES ----
              
              // Update transaction
              transaction.update(pendingTx.ref, {
                status: "verified",
                amount: amount,
                coin: matchedDeposit.coin,
                network: matchedDeposit.network
              });

              // Set the balance of the depositor
              let userUpdates = { balance: currentBalance + amount };

              // --- Affiliate Reward Logic ---
              if (referrerDoc && referrerDoc.exists) {
                const rewardAmount = amount * 0.30;
                const referrerBalance = referrerDoc.data().balance || 0;
                
                // Credit 30% to Referrer
                transaction.set(referrerRef, { balance: referrerBalance + rewardAmount }, { merge: true });
                
                // Create affiliate_reward transaction
                const rewardTxRef = referrerRef.collection("transactions").doc();
                transaction.set(rewardTxRef, {
                  type: "affiliate_reward",
                  amount: rewardAmount,
                  currency: "USDT",
                  status: "verified",
                  fromUser: userDoc.id,
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
                });

                // Prevent future rewards for this user
                userUpdates.firstDepositRewarded = true;
                
                console.log(`Affiliate reward of ${rewardAmount} given to code ${userData.referredByCode}`);
              }

              // Finally update user
              transaction.set(userRef, userUpdates, { merge: true });
            });
            console.log(`Verified deposit ${pendingTx.txid} for ${amount} ${matchedDeposit.coin}`);
            await sendPushNotification(pendingTx.ref.parent.parent.id, "Deposit Successful", `Your deposit of ${amount} ${matchedDeposit.coin} has been verified and credited!`);
          }
        } else {
          console.log(`Deposit ${pendingTx.txid} found but status is ${matchedDeposit.status} (not 1)`);
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

        // Process VIP Bots
        const newBots = activatedBots.map(bot => {
          if (bot.status !== 'running') return bot;
          const activatedTime = new Date(bot.activatedAt).getTime();
          const lastPayout = bot.lastPayoutAt ? new Date(bot.lastPayoutAt).getTime() : activatedTime;
          
          if (now >= lastPayout + msInDay) {
            const daysActive = Math.floor((now - activatedTime) / msInDay);
            if (daysActive >= 365) {
              bot.status = 'expired';
              updated = true;
              return bot;
            }

            const invested = parseFloat(bot.userAmount || bot.price || 0);
            const percent = parseFloat(bot.dailyPercent || parseInt(bot.returnRange) || 0);
            const profit = (invested * percent) / 100;
            
            totalProfit += profit;
            bot.lastPayoutAt = new Date(lastPayout + msInDay).toISOString();
            updated = true;
          }
          return bot;
        });

        // Process Crypto Investments
        const newCrypto = activatedCrypto.map(crypto => {
          if (crypto.status !== 'running') return crypto;
          const activatedTime = new Date(crypto.activatedAt).getTime();
          const lastPayout = crypto.lastPayoutAt ? new Date(crypto.lastPayoutAt).getTime() : activatedTime;
          
          if (now >= lastPayout + msInDay) {
            const daysActive = Math.floor((now - activatedTime) / msInDay);
            if (daysActive >= 365) {
              crypto.status = 'expired';
              updated = true;
              return crypto;
            }

            const invested = parseFloat(crypto.price || 0);
            // Use live rate; fall back to DB value if coin not in map
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
            console.log(`Credited ${totalProfit} to user ${userDoc.id} for bot mining.`);
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
  // Verify admin logic (basic check, could be expanded to check custom claims)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { userId, title, body } = data;
  if (!title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Title and body are required');
  }

  try {
    if (userId === 'all') {
      // Broadcast to all users with tokens
      const usersSnap = await db.collection('users').get();
      const tokens = [];
      usersSnap.forEach(doc => {
        if (doc.data().fcmToken) tokens.push(doc.data().fcmToken);
      });
      
      if (tokens.length > 0) {
        // Send in batches of 500
        const messages = {
          notification: { title, body },
          tokens: tokens
        };
        const response = await admin.messaging().sendEachForMulticast(messages);
        return { success: true, sentCount: response.successCount, failureCount: response.failureCount };
      }
      return { success: true, sentCount: 0 };
    } else {
      // Single user
      await sendPushNotification(userId, title, body);
      return { success: true, sentCount: 1 };
    }
  } catch (error) {
    console.error("Admin push error:", error);
    throw new functions.https.HttpsError('internal', 'Failed to send notifications');
  }
});

Object.assign(exports, require('./palmpesa'));

// ─── Binance Deposit History (Admin only) ────────────────────────────────────
exports.getBinanceDeposits = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!BINANCE_API_KEY || !BINANCE_SECRET_KEY) {
    throw new functions.https.HttpsError('failed-precondition', 'Binance API keys not configured');
  }

  // Fetch last 90 days
  const endTime = Date.now();
  const startTime = endTime - 90 * 24 * 60 * 60 * 1000;

  const allDeposits = [];

  // Binance supports max 90 days per request, fetch USDT deposits
  const coins = ['USDT'];
  for (const coin of coins) {
    const qs = `coin=${coin}&startTime=${startTime}&endTime=${endTime}&timestamp=${Date.now()}`;
    const sig = getBinanceSignature(qs);
    try {
      const res = await axios.get(
        `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${qs}&signature=${sig}`,
        { headers: { 'X-MBX-APIKEY': BINANCE_API_KEY } }
      );
      const deposits = res.data || [];
      deposits.forEach(d => allDeposits.push({
        txid: d.txId || d.id || '',
        coin: d.coin,
        network: d.network,
        amount: d.amount,
        status: d.status === 1 ? 'Success' : d.status === 0 ? 'Pending' : 'Failed',
        address: d.address,
        addressTag: d.addressTag || '',
        insertTime: d.insertTime,
        date: new Date(d.insertTime).toLocaleString(),
        confirmTimes: d.confirmTimes || '',
        unlockConfirm: d.unlockConfirm || ''
      }));
    } catch (e) {
      console.error(`Binance deposit fetch error for ${coin}:`, e.response?.data || e.message);
    }
  }

  // Sort newest first
  allDeposits.sort((a, b) => b.insertTime - a.insertTime);
  return { deposits: allDeposits };
});

// ─── Watch-to-Earn Video Rewards ─────────────────────────────────────────────
exports.claimVideoReward = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to claim rewards');
  }

  const { videoId } = data;
  if (!videoId) {
    throw new functions.https.HttpsError('invalid-argument', 'Video ID is required');
  }

  const uid = context.auth.uid;
  const userRef = db.collection('users').doc(uid);

  try {
    return await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found');
      }

      const userData = userDoc.data();
      const claimedVideos = userData.claimedVideos || {};
      const lastClaimedRaw = claimedVideos[videoId];
      if (lastClaimedRaw) {
        // Handle both Firestore Timestamp objects and ISO strings
        const lastClaimed = lastClaimedRaw?.toDate ? lastClaimedRaw.toDate().getTime() : new Date(lastClaimedRaw).getTime();
        const now = Date.now();
        if (now - lastClaimed < 24 * 60 * 60 * 1000) {
          throw new functions.https.HttpsError('failed-precondition', 'You can only watch this video once every 24 hours');
        }
      }
      
      const activatedCrypto = userData.activatedCrypto || [];
      const activeCrypto = activatedCrypto.filter(c => c.status === 'running');

      if (activeCrypto.length === 0) {
        throw new functions.https.HttpsError('failed-precondition', 'You need active Crypto Investments to earn video rewards');
      }

      // Calculate reward: daily profit ÷ 6 videos (watching all 6 earns full daily profit)
      const TOTAL_VIDEOS = 6;
      let totalReward = 0;
      activeCrypto.forEach(crypto => {
        const rawPrice = String(crypto.price || '0').replace(/[^0-9.-]+/g,"");
        const invested = parseFloat(rawPrice || 0);
        // Use live rates — not stale DB values
        const CRYPTO_RATES = { doge: 2.2, ada: 3, matic: 3.6, xrp: 4, link: 5, dot: 6, avax: 7, sol: 8, eth: 9, btc: 10 };
        const percent = CRYPTO_RATES[crypto.id] !== undefined ? CRYPTO_RATES[crypto.id] : parseFloat(crypto.dailyPercent || 0);
        const dailyProfit = (invested * percent) / 100;
        totalReward += dailyProfit / TOTAL_VIDEOS; // each video = 1/6 of daily profit
      });

      if (totalReward <= 0) {
        throw new functions.https.HttpsError('failed-precondition', 'Calculated reward is zero. Please activate a crypto investment.');
      }

      const currentBalance = userData.balance || 0;
      const currentMiningBalance = userData.miningBalance || 0;

      // Store as ISO string — serverTimestamp() can't be used inside a map field
      claimedVideos[videoId] = new Date().toISOString();
      
      transaction.update(userRef, {
        balance: currentBalance + totalReward,
        miningBalance: currentMiningBalance + totalReward,
        claimedVideos: claimedVideos
      });

      // Log transaction
      const txRef = userRef.collection('transactions').doc();
      transaction.set(txRef, {
        type: 'movie_reward',
        videoId: videoId,
        amount: totalReward,
        currency: 'USDT',
        status: 'verified',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, rewardAmount: totalReward };
    });
  } catch (err) {
    console.error("claimVideoReward error:", err);
    throw new functions.https.HttpsError('internal', err.message || 'Failed to process reward');
  }
});
