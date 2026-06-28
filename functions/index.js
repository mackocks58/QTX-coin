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
                status: "SUCCESS",
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
            const CRYPTO_RATES = { doge: 6.0, ada: 6.8, matic: 7.4, xrp: 8.0, link: 8.8, dot: 9.6, avax: 10.4, sol: 11.0, eth: 12.0, btc: 14.0 };
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
      const isSuccess = newData.status === 'SUCCESS' || newData.status === 'success' || newData.status === 'verified';
      const isFailed = newData.status === 'failed' || newData.status === 'rejected';
      const amount = newData.amount || newData.expectedAmount || 0;
      let currency = newData.currency || 'USD';

      if (newData.type === 'withdrawal') {
        const txid = newData.txid || 'N/A';
        let destinationLine = '';
        if (newData.accountDetails) {
          if (newData.accountDetails.type === 'crypto_address') {
            destinationLine = `Destination Address: ${newData.accountDetails.address}\nNetwork: ${newData.accountDetails.network}`;
          } else if (newData.accountDetails.type === 'binance_id') {
            destinationLine = `Binance Pay ID: ${newData.accountDetails.binanceId}`;
          } else if (newData.accountDetails.type === 'mobile') {
            destinationLine = `Mobile Number: ${newData.accountDetails.accountNumber}\nAccount Name: ${newData.accountDetails.accountName}\nNetwork: ${newData.accountDetails.network}`;
          }
        }

        if (isSuccess) {
          const body = `${txid} confirmed — You have successfully withdrawn ${amount} ${currency} from your QTX Coin wallet.\n\n━━━━━━━━━━━━━━━━━━━\n📋 TRANSACTION DETAILS\n━━━━━━━━━━━━━━━━━━━\nTransaction ID: ${txid}\nAmount: ${amount} ${currency}\nType: Withdrawal\n${destinationLine}\nStatus: ✅ Approved & Processed\nSent By: QTX Coin\n━━━━━━━━━━━━━━━━━━━\n\n🎉 Congratulations! Your funds have been sent. Please allow a few minutes for the transfer to reflect on your account. Thank you for using QTX Coin!`;
          await sendPushNotification(userId, `${txid} Confirmed ✅`, body);
        } else if (isFailed) {
          const body = `${txid} — Your withdrawal of ${amount} ${currency} could not be processed.\n\nReason: ${newData.failureReason || 'Rejected by admin'}\n${destinationLine}\n\nYour balance has been refunded. Please contact support if you need assistance.`;
          await sendPushNotification(userId, "Withdrawal Failed ❌", body);
        }
      } else if (newData.type === 'deposit') {
        let networkStr = newData.network ? `\nNetwork: ${newData.network}` : '';
        let txidStr = newData.txid ? `\nTransaction Hash: ${newData.txid}` : '';

        if (isSuccess) {
          const body = `Your deposit of ${amount} ${currency} has been approved.\nAmount: ${amount} ${currency}${networkStr}${txidStr}\nStatus: Verified`;
          await sendPushNotification(userId, "Deposit Approved", body);
        } else if (isFailed) {
          const body = `Your deposit of ${amount} ${currency} was rejected.\nReason: ${newData.failureReason || 'Admin action'}${networkStr}${txidStr}`;
          await sendPushNotification(userId, "Deposit Failed", body);
        }
      } else if (newData.type === 'transfer_out') {
        const receiverEmail = newData.receiverEmail || 'another user';
        if (isSuccess) {
           await sendPushNotification(userId, "Transfer Successful ✅", `Your transfer of ${amount} ${currency} to ${receiverEmail} has been completed.`);
        } else if (isFailed) {
           await sendPushNotification(userId, "Transfer Failed ❌", `Your transfer of ${amount} ${currency} to ${receiverEmail} was rejected.\nReason: ${newData.failureReason}`);
        }
      }
    } else if (!oldData && newData && newData.status === 'SUCCESS' && newData.type === 'transfer_in') {
      const senderEmail = newData.senderEmail || 'Another user';
      const amount = newData.amount || 0;
      const currency = newData.currency || 'USD';
      await sendPushNotification(userId, "Funds Received 💰", `You received ${amount} ${currency} from ${senderEmail}.\nTransaction Hash: ${newData.txid}`);
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
        const CRYPTO_RATES = { doge: 6.0, ada: 6.8, matic: 7.4, xrp: 8.0, link: 8.8, dot: 9.6, avax: 10.4, sol: 11.0, eth: 12.0, btc: 14.0 };
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

exports.adminApproveTransfer = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  if (context.auth.token.email !== 'mackocks588@gmail.com') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }

  const { transferId, senderUid, action } = data;
  if (!transferId || !action || !senderUid) throw new functions.https.HttpsError('invalid-argument', 'Missing parameters');

  try {
    // Use direct document path - avoids unsupported collectionGroup in transactions
    const transferRef = db.collection('users').doc(senderUid).collection('transactions').doc(transferId);

    return await db.runTransaction(async (transaction) => {
      const transferDoc = await transaction.get(transferRef);
      if (!transferDoc.exists) throw new functions.https.HttpsError('not-found', 'Transfer not found');
      
      const transferData = transferDoc.data();
      const senderRef = db.collection('users').doc(senderUid);
      const senderId = senderUid;

      if (transferData.type !== 'transfer_out' || transferData.status !== 'pending') {
         throw new functions.https.HttpsError('failed-precondition', 'Transfer is not pending or invalid type');
      }

      if (action === 'reject') {
        transaction.update(transferRef, { status: 'rejected', failureReason: 'Rejected by admin' });
        return { success: true, message: 'Transfer rejected' };
      }

      const receiverUid = transferData.receiverUid;
      const amount = parseFloat(transferData.amount);
      const fee = parseFloat(transferData.fee || (amount * 0.05));
      const totalDeduction = parseFloat(transferData.totalDeduction || (amount + fee));

      if (isNaN(amount) || amount <= 0) throw new functions.https.HttpsError('invalid-argument', 'Invalid amount');

      const senderSnap = await transaction.get(senderRef);
      const senderData = senderSnap.data() || {};
      const senderBalance = parseFloat(senderData.balance || 0);

      if (senderBalance < totalDeduction) {
         transaction.update(transferRef, { status: 'rejected', failureReason: 'Insufficient funds for amount + fee' });
         return { success: false, message: 'Insufficient funds for amount + fee' };
      }

      const receiverRef = db.collection('users').doc(receiverUid);
      const receiverSnap = await transaction.get(receiverRef);
      if (!receiverSnap.exists) {
         transaction.update(transferRef, { status: 'rejected', failureReason: 'Receiver not found' });
         return { success: false, message: 'Receiver not found' };
      }

      const receiverData = receiverSnap.data() || {};
      const receiverBalance = parseFloat(receiverData.balance || 0);

      transaction.update(senderRef, { balance: senderBalance - totalDeduction });
      transaction.update(receiverRef, { balance: receiverBalance + amount });

      const txHash = 'QTX' + crypto.randomBytes(8).toString('hex').toUpperCase();
      transaction.update(transferRef, { status: 'SUCCESS', txid: txHash });

      const receiverTxRef = receiverRef.collection('transactions').doc();
      transaction.set(receiverTxRef, {
        type: 'transfer_in',
        status: 'SUCCESS',
        amount: amount,
        currency: transferData.currency || 'USD',
        senderUid: senderId,
        senderEmail: senderData.email || 'Unknown',
        receiverUid: receiverUid,
        receiverEmail: receiverData.email || transferData.receiverEmail,
        txid: txHash,
        fee: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, message: 'Transfer approved', txid: txHash };
    });
  } catch (err) {
    console.error("Error in adminApproveTransfer:", err);
    throw new functions.https.HttpsError('internal', err.message);
  }
});



exports.processPendingTransfers = functions.region('europe-west1').pubsub.schedule('every 5 minutes').onRun(async (context) => {
  try {
    const settingsDoc = await db.collection('settings').doc('transfers').get();
    if (!settingsDoc.exists || !settingsDoc.data().autoApprove) return null;

    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    
    const pendingTransfers = await db.collectionGroup('transactions')
      .where('type', '==', 'transfer_out')
      .where('status', '==', 'pending')
      .get();
      
    if (pendingTransfers.empty) return null;

    for (const doc of pendingTransfers.docs) {
      const data = doc.data();
      const createdAt = data.createdAt ? data.createdAt.toMillis() : Date.now();
      
      if (createdAt <= fiveMinsAgo) {
        const senderRef = doc.ref.parent.parent;
        const senderId = senderRef.id;
        const receiverUid = data.receiverUid;
        const amount = parseFloat(data.amount);
        const fee = parseFloat(data.fee || (amount * 0.05));
        const totalDeduction = parseFloat(data.totalDeduction || (amount + fee));

        if (isNaN(amount) || amount <= 0) {
           await doc.ref.update({ status: 'rejected', failureReason: 'Invalid amount' });
           continue;
        }

        try {
          await db.runTransaction(async (transaction) => {
            const transferDoc = await transaction.get(doc.ref);
            if (transferDoc.data().status !== 'pending') return;

            const senderSnap = await transaction.get(senderRef);
            const senderBalance = parseFloat(senderSnap.data()?.balance || 0);

            if (senderBalance < totalDeduction) {
              transaction.update(doc.ref, { status: 'rejected', failureReason: 'Insufficient funds for amount + fee' });
              return;
            }

            const receiverRef = db.collection('users').doc(receiverUid);
            const receiverSnap = await transaction.get(receiverRef);
            if (!receiverSnap.exists) {
              transaction.update(doc.ref, { status: 'rejected', failureReason: 'Receiver not found' });
              return;
            }
            const receiverBalance = parseFloat(receiverSnap.data()?.balance || 0);

            transaction.update(senderRef, { balance: senderBalance - totalDeduction });
            transaction.update(receiverRef, { balance: receiverBalance + amount });
            
            const txHash = 'QTX' + crypto.randomBytes(8).toString('hex').toUpperCase();
            transaction.update(doc.ref, { status: 'SUCCESS', txid: txHash });

            const receiverTxRef = receiverRef.collection('transactions').doc();
            transaction.set(receiverTxRef, {
              type: 'transfer_in',
              status: 'SUCCESS',
              amount: amount,
              currency: data.currency || 'USD',
              senderUid: senderId,
              senderEmail: senderSnap.data()?.email || 'Unknown',
              receiverUid: receiverUid,
              receiverEmail: receiverSnap.data()?.email || data.receiverEmail,
              txid: txHash,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          });
        } catch (e) {
          console.error("Auto-approve failed for", doc.id, e);
        }
      }
    }
  } catch (error) {
    console.error("Error in processPendingTransfers:", error);
  }
  return null;
});

// Realtime notification generator for Receiver
exports.onP2PTransferChange = functions.region('europe-west1').firestore
  .document('users/{userId}/transactions/{txId}')
  .onWrite(async (change, context) => {
    // If deleted, ignore
    if (!change.after.exists) return null;

    const data = change.after.data();
    const beforeData = change.before.exists ? change.before.data() : null;
    const senderId = context.params.userId;

    // We only care about transfer_out events to dispatch notifications to the receiver
    if (data.type !== 'transfer_out' || !data.receiverUid) return null;

    const receiverRef = db.collection('users').doc(data.receiverUid);
    const receiverSnap = await receiverRef.get();
    if (!receiverSnap.exists) return null;

    const senderSnap = await db.collection('users').doc(senderId).get();
    const senderEmail = senderSnap.exists ? senderSnap.data().email : 'A user';

    const updates = {};
    const notifyPayload = {
      id: context.params.txId,
      txid: data.txid || context.params.txId,
      senderUid: senderId,
      amount: data.amount,
      createdAt: new Date().toISOString()
    };

    // Scenario 1: Newly Created and Pending
    if (!beforeData && data.status === 'pending') {
      notifyPayload.type = 'p2p_pending';
      notifyPayload.title = 'Incoming Transfer Pending';
      notifyPayload.message = `${senderEmail} is sending you $${parseFloat(data.amount).toFixed(2)}. Security clearance in progress (5-15 mins).`;
      notifyPayload.read = false;
      
      updates.notifications = admin.firestore.FieldValue.arrayUnion(notifyPayload);

      if (receiverSnap.data().fcmToken) {
        try {
          await admin.messaging().send({
            token: receiverSnap.data().fcmToken,
            notification: {
              title: notifyPayload.title,
              body: notifyPayload.message,
            },
            data: { txid: String(notifyPayload.txid), type: notifyPayload.type }
          });
        } catch(e) { console.error('Push notification failed:', e); }
      }
    }
    // Scenario 2: Updated from Pending to SUCCESS
    else if (beforeData && beforeData.status === 'pending' && data.status === 'SUCCESS') {
      // Remove the old pending notification
      const oldNotifications = receiverSnap.data().notifications || [];
      const filtered = oldNotifications.filter(n => n.id !== context.params.txId);
      
      // Add the new success notification
      notifyPayload.type = 'p2p_success';
      notifyPayload.title = 'Transfer Approved!';
      notifyPayload.message = `You have successfully received $${parseFloat(data.amount).toFixed(2)} from ${senderEmail}!`;
      notifyPayload.read = false;
      
      filtered.push(notifyPayload);
      updates.notifications = filtered;

      // Receiver Push Notification
      if (receiverSnap.data().fcmToken) {
        try {
          await admin.messaging().send({
            token: receiverSnap.data().fcmToken,
            notification: {
              title: notifyPayload.title,
              body: notifyPayload.message,
            },
            data: { txid: String(notifyPayload.txid), type: notifyPayload.type }
          });
        } catch(e) { console.error('Receiver push failed', e); }
      }

      // Sender Push Notification
      const senderToken = senderSnap.data()?.fcmToken;
      if (senderToken) {
        try {
          await admin.messaging().send({
            token: senderToken,
            notification: {
              title: 'Transfer Delivered!',
              body: `Your P2P transfer of $${parseFloat(data.amount).toFixed(2)} to ${receiverSnap.data().email} has been approved and delivered!`,
            },
            data: { txid: String(notifyPayload.txid), type: 'p2p_success_sender' }
          });
        } catch(e) { console.error('Sender push failed', e); }
      }
    }
    // Scenario 3: Updated from Pending to Rejected
    else if (beforeData && beforeData.status === 'pending' && data.status === 'rejected') {
      // Just clear the pending notification, no need to alert receiver if it was rejected
      const oldNotifications = receiverSnap.data().notifications || [];
      const filtered = oldNotifications.filter(n => n.id !== context.params.txId);
      updates.notifications = filtered;
    }

    if (Object.keys(updates).length > 0) {
      return receiverRef.update(updates);
    }

    return null;
  });
