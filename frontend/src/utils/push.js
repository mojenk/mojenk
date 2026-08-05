import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { getMessaging, getToken as webGetToken, onMessage as webOnMessage } from 'firebase/messaging';
import app from '../firebase';
import { registerFcmToken } from './api';

const isNative = Capacitor.isNativePlatform();

let permissionRequested = false;

// İlk açılışta bildirim izni iste (kullanıcı login olmadan önce de).
export async function requestPushPermission() {
  if (permissionRequested) return Notification?.permission || 'default';
  permissionRequested = true;

  if (!('Notification' in window)) return 'unsupported';

  try {
    if (isNative) {
      // Android 13+ için runtime izin; eski sürümlerde otomatik izinli sayılır
      const { receive } = await FirebaseMessaging.requestPermissions();
      return receive === 'granted' ? 'granted' : receive || 'default';
    }
    // Web
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn('Push permission error:', err.message);
    return 'default';
  }
}

// Auth hazır olduktan sonra FCM tokeni al ve sunucuya kaydet.
export async function registerPushToken(uid) {
  if (!uid) return;
  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    console.warn('Push permission not granted, skipping FCM token registration');
    return;
  }

  if (isNative) {
    try {
      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        await registerFcmToken(token, Capacitor.getPlatform());
      }
      FirebaseMessaging.addListener('notificationReceived', (event) => {
        console.log('Push received:', event);
      });
      FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        console.log('Push action:', event);
      });
    } catch (err) {
      console.warn('Native push token error:', err.message);
    }
    return;
  }

  // Web
  if (!app) return;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey || vapidKey.includes('YOUR_VAPID_KEY')) {
    console.warn('VAPID key tanımlı değil, web push devre dışı');
    return;
  }
  try {
    const webMessaging = getMessaging(app);
    const token = await webGetToken(webMessaging, { vapidKey });
    if (token) {
      await registerFcmToken(token, 'web');
    }
    webOnMessage(webMessaging, (payload) => {
      const { title, body, icon } = payload.notification || {};
      if (Notification.permission === 'granted') {
        new Notification(title || 'Kader\'in Sesi', {
          body: body || 'Yeni bir gelişme var!',
          icon: icon || '/icon-192.png',
        });
      }
    });
  } catch (err) {
    console.warn('Web push token error:', err.message);
  }
}

// Eski isimle uyumluluk: initPush artık izin + kayıt yapar (login sonrası için).
export async function initPush(uid) {
  return registerPushToken(uid);
}
