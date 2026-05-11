const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

const db = admin.firestore();
const PALMPESA_API_KEY = process.env.PALMPESA_API_KEY;

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

/**
 * Core deposit processor.
 * Accepts a direct Firestore DocumentReference to avoid collectionGroup
 * index requirements in the hot polling path (palmpesaCheckStatus).
 *
 * @param {FirebaseFirestore.DocumentReference} txDocRef - Direct reference to the transaction doc
 * @param {number} amountLocal - Amount in TZS
 * @param {string} palmpesaOrderId - The Palmpesa order ID (for logging)
 */
async function processSuccessfulDeposit(txDocRef, amountLocal, palmpesaOrderId) {
  if (!txDocRef) {
    console.error("processSuccessfulDeposit: txDocRef is required.");
    return;
  }

  // userRef is users/{userId}
  const userRef = txDocRef.parent.parent;
  const userId = userRef.id;

  // 1. Atomic transaction: mark tx SUCCESS and credit user balance
  let alreadyProcessed = false;
  await db.runTransaction(async (t) => {
    const freshTx = await t.get(txDocRef);
    if (!freshTx.exists || freshTx.data().status !== "pending") {
      console.log(`processSuccessfulDeposit: tx ${txDocRef.id} already processed or missing. Skipping.`);
      alreadyProcessed = true;
      return; // returning inside transaction handler aborts the transaction without error
    }
    const freshUser = await t.get(userRef);

    t.update(txDocRef, {
      status: "SUCCESS",
      amount: amountLocal,
      palmpesaOrderId: palmpesaOrderId || null,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const newBalance = (freshUser.data().balance || 0) + amountLocal;
    const thresholdLocal = 1000 * 2600; // TZS equivalent of $1000
    const spinChancesInc = amountLocal >= thresholdLocal ? 1 : 0;

    t.update(userRef, {
      balance: newBalance,
      ...(spinChancesInc > 0 && { spinChances: admin.firestore.FieldValue.increment(spinChancesInc) })
    });
  });

  if (alreadyProcessed) return;

  await sendPushNotification(
    userId,
    "Deposit Successful 🎉",
    `Your mobile money deposit of TZS ${amountLocal.toLocaleString()} has been credited to your account!`
  );

  // 2. Process 3-tier affiliate commissions
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
      
      let commission = parseFloat((amountLocal * TIERS[tier].pct).toFixed(2));
      let currency = 'TZS';

      // --- Conditional Currency Conversion ---
      // If referrer is NOT Tanzanian, convert TZS commission to USD/USDT
      // Exchange rate: 1 USD = 2600 TZS (derived from threshold logic)
      if (referrerData.country && referrerData.country !== 'Tanzania') {
        commission = parseFloat((commission / 2600).toFixed(4));
        currency = 'USDT';
        console.log(`Converting TZS commission to USD for non-TZ referrer ${referrerId}: ${commission} ${currency}`);
      }

      await db.collection("users").doc(referrerId).update({
        balance: admin.firestore.FieldValue.increment(commission)
      });

      await db.collection("users").doc(referrerId).collection("transactions").add({
        type: 'affiliate_reward',
        title: TIERS[tier].label,
        amount: commission,
        currency: currency,
        fromUid: currentUid,
        status: 'SUCCESS',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // L1 referrer also earns a spin chance for large deposits
      if (tier === 0 && amountLocal >= (1000 * 2600)) {
        await db.collection("users").doc(referrerId).update({
          spinChances: admin.firestore.FieldValue.increment(1)
        });
      }

      currentUid = referrerId;
    }
  } catch (e) {
    console.error("Affiliate reward error:", e);
  }
}

// ─── palmpesaInitiate ─────────────────────────────────────────────────────────
exports.palmpesaInitiate = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');

  const { name, email, phone, amount, transaction_id } = data;
  if (!phone || !amount || !transaction_id) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  try {
    const callback_url = `https://europe-west1-${process.env.VITE_FIREBASE_PROJECT_ID || 'xxxx-connection'}.cloudfunctions.net/palmpesaWebhook`;

    const response = await axios.post('https://palmpesa.drmlelwa.co.tz/api/palmpesa/initiate', {
      name: name || "QTX User",
      email: email || "user@qtxcoin.com",
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

// ─── palmpesaCheckStatus ──────────────────────────────────────────────────────
// Uses a DIRECT document path lookup (users/{uid}/transactions/{local_tx_id})
// so NO Firestore collectionGroup index is required for polling.
exports.palmpesaCheckStatus = functions.region('europe-west1').https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');

  const { order_id, local_tx_id } = data;
  if (!order_id || !local_tx_id) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing order_id or local_tx_id');
  }

  const uid = context.auth.uid;

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
        // Direct path lookup — no index needed
        const txDocRef = db.collection('users').doc(uid).collection('transactions').doc(local_tx_id);
        const txSnap = await txDocRef.get();
        const amountToCredit = amount > 0 ? amount : parseFloat(txSnap.data()?.expectedAmount || 0);
        await processSuccessfulDeposit(txDocRef, amountToCredit, order_id);
        return { status: "COMPLETED" };

      } else if (status === "FAILED") {
        // Direct path lookup to mark as failed
        const txDocRef = db.collection('users').doc(uid).collection('transactions').doc(local_tx_id);
        await txDocRef.update({ status: "failed", failureReason: "Palmpesa FAILED" });
        return { status: "FAILED" };
      }

      return { status: status }; // PENDING or other
    }

    return { status: "UNKNOWN" };
  } catch (error) {
    console.error("Palmpesa check status error:", error.response?.data || error.message);
    throw new functions.https.HttpsError('internal', 'Failed to check status');
  }
});

// ─── palmpesaWebhook ──────────────────────────────────────────────────────────
// Webhook from Palmpesa — uses collectionGroup query by palmpesaOrderId.
// Requires the Firestore index defined in firestore.indexes.json.
exports.palmpesaWebhook = functions.region('europe-west1').https.onRequest(async (req, res) => {
  try {
    const data = req.body;
    console.log("Palmpesa Webhook received:", JSON.stringify(data));

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
      // Find the transaction by palmpesaOrderId field (collectionGroup — needs index)
      const txQuery = await db.collectionGroup("transactions")
        .where("palmpesaOrderId", "==", order_id)
        .get();

      if (!txQuery.empty) {
        const txDoc = txQuery.docs[0];
        const txAmount = amount > 0 ? amount : parseFloat(txDoc.data().expectedAmount || txDoc.data().amount || 0);
        // Pass the DocumentReference directly — no second lookup needed
        await processSuccessfulDeposit(txDoc.ref, txAmount, order_id);
      } else {
        console.warn(`Webhook: No transaction found for palmpesaOrderId=${order_id}`);
      }
    } else if (order_id && payment_status === "FAILED") {
      const txQuery = await db.collectionGroup("transactions")
        .where("palmpesaOrderId", "==", order_id)
        .get();
      if (!txQuery.empty) {
        await txQuery.docs[0].ref.update({ status: "failed", failureReason: "Palmpesa FAILED (webhook)" });
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).send("OK"); // Always 200 to prevent Palmpesa retries
  }
});
