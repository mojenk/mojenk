import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { getMessaging, getToken as webGetToken, onMessage as webOnMessage } from 'firebase/messaging';
import app from '../firebase';
import { registerFcmToken } from './api';

const isNative = Capacitor.isNativePlatform();

export async function initPush() {
  if (!('Notification' in window)) return;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  if (isNative) {
    try {
      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        await registerFcmToken(token, Capacitor.getPlatform());
      }
      FirebaseMessaging.addListener('notificationReceived', (event) => {
        console.log('Push received:', event);
      });
    } catch (err) {
      console.warn('Native push init error:', err.message);
    }
  } else if (app) {
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
      console.warn('Web push init error:', err.message);
    }
  }
}
