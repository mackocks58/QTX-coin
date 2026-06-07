import { initializeApp } from 'firebase/app';
import { getFirestore, collectionGroup, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCTZLN6gdOILNEsji-NMe0-g46EXXI7254",
  authDomain: "xxxx-connection.firebaseapp.com",
  databaseURL: "https://xxxx-connection-default-rtdb.firebaseio.com",
  projectId: "xxxx-connection",
  storageBucket: "xxxx-connection.firebasestorage.app",
  messagingSenderId: "728781241137",
  appId: "1:728781241137:web:dd0614bb806beb7e878e10",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(
    collectionGroup(db, 'transactions'),
    where('type', '==', 'deposit'),
    orderBy('createdAt', 'desc'),
    limit(5)
  );
  const snap = await getDocs(q);
  console.log("LAST 5 DEPOSITS:");
  snap.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
  console.log("DONE");
  process.exit(0);
}
check().catch(console.error);
