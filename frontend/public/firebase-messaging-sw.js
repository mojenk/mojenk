import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

const firebaseConfig = {
  apiKey: 'AIzaSyCaoCxdqERP_QNnElRtUxSHpb3Bat5ySog',
  authDomain: 'kaderin-sesi.firebaseapp.com',
  projectId: 'kaderin-sesi',
  storageBucket: 'kaderin-sesi.firebasestorage.app',
  messagingSenderId: '103499453593',
  appId: '1:103499453593:web:a8b3d329370ea6f11c1408',
  measurementId: 'G-D04L4VY954',
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Kader\'in Sesi', {
    body: body || 'Yeni bir gelişme var!',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.tag || 'kaderin-sesi',
  });
});
