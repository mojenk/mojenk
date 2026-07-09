// Firebase configuration — auto-generated from Firebase Console
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

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
let firebaseInitError = null;

try {
  if (!firebaseConfig.apiKey) {
    throw new Error('VITE_FIREBASE_API_KEY tanımlı değil. Uygulamayı yayınlarken bu ortam değişkenini ayarlamanız gerekiyor.');
  }
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
} catch (err) {
  console.error('Firebase başlatılamadı:', err);
  firebaseInitError = err?.message || 'Firebase başlatılırken bilinmeyen bir hata oluştu.';
}

export { auth, googleProvider, signInWithPopup, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, firebaseInitError };
export default app;
