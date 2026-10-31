import { initializeApp } from
"https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence
} from
"https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDU_uD-oAKYbZ3E9iPODXBNrs-Jw03_ETA",
  authDomain: "sarah-stock-v2.firebaseapp.com",
  projectId: "sarah-stock-v2",
  storageBucket: "sarah-stock-v2.firebasestorage.app",
  messagingSenderId: "518321057938",
  appId: "1:518321057938:web:58fb27cf3c231fe88a364b"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

setPersistence(auth, browserLocalPersistence);

export {
  app,
  auth,
  db,
  googleProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp
};
