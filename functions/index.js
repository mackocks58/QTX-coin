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
        
        let updated = false;
        let totalProfit = 0;

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
            
            // Increment the lastPayoutAt exactly by 24 hours to prevent time drift
            bot.lastPayoutAt = new Date(lastPayout + msInDay).toISOString();
            updated = true;
          }
          return bot;
        });

        if (updated) {
          const currentBalance = freshData.balance || 0;
          const currentMiningBalance = freshData.miningBalance || 0;
          
          transaction.update(userDoc.ref, {
            activatedBots: newBots,
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
          }
        }
      });
    }
  } catch (err) {
    console.error("Error processing bot payouts:", err);
  }
  return null;
});

