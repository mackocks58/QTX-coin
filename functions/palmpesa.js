const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

const db = admin.firestore();
const PALMPESA_API_KEY = process.env.PALMPESA_API_KEY;

// Keep Push notification DRY, but we need to re-implement or require it if we separate files.
// To avoid circular dependencies, we'll redefine the push sender here or just use admin.messaging()
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

async function processSuccessfulDeposit(localTxId, amountLocal, palmpesaOrderId) {
  const txQuery = await db.collectionGroup("transactions").where("id", "==", localTxId).get();
  if (txQuery.empty) return;
  const txDoc = txQuery.docs[0];
  const txData = txDoc.data();
  if (txData.status !== "pending") return;

  const userRef = txDoc.ref.parent.parent;
  const userId = userRef.id;

  // 1. Transaction to update balance and tx status securely
  await db.runTransaction(async (t) => {
    const freshTx = await t.get(txDoc.ref);
    if (freshTx.data().status !== "pending") throw new Error("Already processed");
    const freshUser = await t.get(userRef);
    
    t.update(txDoc.ref, {
      status: "SUCCESS",
      amount: amountLocal,
      palmpesaOrderId: palmpesaOrderId || null,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    let newBalance = (freshUser.data().balance || 0) + amountLocal;
    let spinChancesInc = 0;
    
    const thresholdLocal = 1000 * 2600; // $1000 threshold
    if (amountLocal >= thresholdLocal) {
      spinChancesInc = 1;
    }
    
    t.update(userRef, { 
      balance: newBalance,
      ...(spinChancesInc > 0 && { spinChances: admin.firestore.FieldValue.increment(spinChancesInc) })
    });
  });

  await sendPushNotification(userId, "Deposit Successful", `Your mobile money deposit of TZS ${amountLocal.toLocaleString()} has been verified!`);

  // 2. Process Affiliates sequentially
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
      const commission = parseFloat((amountLocal * TIERS[tier].pct).toFixed(2));

      await db.collection("users").doc(referrerId).update({ balance: admin.firestore.FieldValue.increment(commission) });
      
      await db.collection("users").doc(referrerId).collection("transactions").add({
        type: 'affiliate_reward',
        title: TIERS[tier].label,
        amount: commission,
        fromUid: currentUid,
        status: 'SUCCESS',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // L1 Spin chance logic
      if (tier === 0 && amountLocal >= (1000 * 2600)) {
         await db.collection("users").doc(referrerId).update({ spinChances: admin.firestore.FieldValue.increment(1) });
      }

      currentUid = referrerId;
    }
  } catch(e) {
    console.error("Affiliate reward error:", e);
  }
}

exports.palmpesaInitiate = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  
  const { name, email, phone, amount, transaction_id } = data;
  if (!phone || !amount || !transaction_id) throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');

  try {
    const callback_url = `https://europe-west1-${process.env.VITE_FIREBASE_PROJECT_ID || 'xxxx-connection'}.cloudfunctions.net/palmpesaWebhook`;
    
    const response = await axios.post('https://palmpesa.drmlelwa.co.tz/api/palmpesa/initiate', {
      name: name || "FINTEX User",
      email: email || "user@fintex.com",
      phone: phone,
      amount: amount,
      transaction_id: transaction_id,
      address: "Tanzania",
      postcode: "00000",
      callback_url: callback_url
    }, {
      headers: {
        'Authorization': `Bearer ${PALMPESA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Palmpesa initiate error:", error.response?.data || error.message);
    throw new functions.https.HttpsError('internal', 'Failed to initiate Palmpesa payment');
  }
});

exports.palmpesaCheckStatus = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  
  const { order_id, local_tx_id } = data;
  if (!order_id || !local_tx_id) throw new functions.https.HttpsError('invalid-argument', 'Missing order_id or local_tx_id');

  try {
    const response = await axios.post('https://palmpesa.drmlelwa.co.tz/api/order-status', {
      order_id: order_id
    }, {
      headers: {
        'Authorization': `Bearer ${PALMPESA_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const resData = response.data;
    if (resData && resData.data && resData.data.length > 0) {
       const status = resData.data[0].payment_status;
       const amount = parseFloat(resData.data[0].amount);
       
       if (status === "COMPLETED" || status === "SUCCESS") {
          await processSuccessfulDeposit(local_tx_id, amount, order_id);
          return { status: "COMPLETED" };
       } else if (status === "FAILED") {
          const txQuery = await db.collectionGroup("transactions").where("id", "==", local_tx_id).get();
          if (!txQuery.empty) {
             await txQuery.docs[0].ref.update({ status: "failed", failureReason: "Palmpesa FAILED" });
          }
          return { status: "FAILED" };
       }
       return { status: status }; // e.g. PENDING
    }
    return { status: "UNKNOWN" };
  } catch (error) {
    console.error("Palmpesa check status error:", error.response?.data || error.message);
    throw new functions.https.HttpsError('internal', 'Failed to check status');
  }
});

exports.palmpesaWebhook = functions.region('europe-west1').https.onRequest(async (req, res) => {
  try {
    const data = req.body;
    console.log("Palmpesa Webhook received:", data);
    
    let order_id = null;
    let payment_status = null;
    let amount = 0;
    
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      order_id = data.data[0].order_id;
      payment_status = data.data[0].payment_status;
      amount = parseFloat(data.data[0].amount);
    } else if (data.order_id && data.payment_status) {
      order_id = data.order_id;
      payment_status = data.payment_status;
      amount = parseFloat(data.amount || 0);
    }
    
    if (order_id && (payment_status === "COMPLETED" || payment_status === "SUCCESS")) {
       const txQuery = await db.collectionGroup("transactions").where("palmpesaOrderId", "==", order_id).get();
       if (!txQuery.empty) {
          const txDoc = txQuery.docs[0];
          const localId = txDoc.data().id;
          const txAmount = amount > 0 ? amount : parseFloat(txDoc.data().amount);
          await processSuccessfulDeposit(localId, txAmount, order_id);
       }
    }
    
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Error");
  }
});
