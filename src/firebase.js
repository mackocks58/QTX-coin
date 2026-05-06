import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCTZLN6gdOILNEsji-NMe0-g46EXXI7254",
  authDomain: "xxxx-connection.firebaseapp.com",
  databaseURL: "https://xxxx-connection-default-rtdb.firebaseio.com",
  projectId: "xxxx-connection",
  storageBucket: "xxxx-connection.firebasestorage.app",
  messagingSenderId: "728781241137",
  appId: "1:728781241137:web:dd0614bb806beb7e878e10",
  measurementId: "G-J8QJ5RQBXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west1');
export const storage = getStorage(app);

export default app;
