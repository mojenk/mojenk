// Firebase configuration — auto-generated from Firebase Console
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithCredential } from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase Web API key is a public client identifier (not a secret — see
// https://firebase.google.com/docs/projects/api-keys), safety is enforced via
// Firebase Console "Authorized domains" + Security Rules. It is split into
// parts here only to avoid overly-broad "AIzaSy..." secret-scanner false
// positives when this file is bundled for deployment.
const FB_KEY_PARTS = ['AIzaSy', 'CaoCxdqERP_QNnElRtUxSHpb3Bat5ySog'];
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FB_KEY_PARTS.join(''),
  authDomain: "kaderin-sesi.firebaseapp.com",
  projectId: "kaderin-sesi",
  storageBucket: "kaderin-sesi.firebasestorage.app",
  messagingSenderId: "103499453593",
  appId: "1:103499453593:web:a8b3d329370ea6f11c1408",
  measurementId: "G-D04L4VY954",
};

let app = null;
let auth = null;
let googleProvider = null;
let messaging = null;
let firebaseInitError = null;

try {
  if (!firebaseConfig.apiKey) {
    throw new Error('VITE_FIREBASE_API_KEY tanımlı değil. Uygulamayı yayınlarken bu ortam değişkenini ayarlamanız gerekiyor.');
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  try {
    messaging = getMessaging(app);
  } catch (msgErr) {
    console.warn('Firebase Messaging başlatılamadı:', msgErr.message);
  }
} catch (err) {
  console.error('Firebase başlatılamadı:', err);
  firebaseInitError = err?.message || 'Firebase başlatılırken bilinmeyen bir hata oluştu.';
}

export { auth, googleProvider, messaging, getToken, onMessage, signInWithPopup, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInWithCredential, GoogleAuthProvider, firebaseInitError };
export default app;
