const admin = require('../firebaseAdmin');
const { firestore, docData, serverTimestamp } = require('../firestore');

async function sendPushNotification({ uid, title, body, data = {}, tag = 'kaderin-sesi' }) {
  try {
    const userDoc = await firestore.collection('users').doc(uid).get();
    const user = docData(userDoc);
    if (!user || !user.fcm_tokens || user.fcm_tokens.length === 0) return { sent: 0 };

    const tokens = user.fcm_tokens
      .filter((entry) => entry && typeof entry.token === 'string' && entry.token.length > 20)
      .map((entry) => entry.token);

    if (tokens.length === 0) return { sent: 0 };

    const message = {
      tokens,
      notification: { title, body },
      data: { tag, ...data },
      webpush: {
        notification: {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag,
          requireInteraction: false,
        },
      },
      android: {
        notification: {
          icon: 'ic_launcher',
          color: '#120e0a',
          channelId: 'kaderin-sesi-general',
          tag,
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`FCM sent to ${uid}: ${response.successCount}/${tokens.length} success`);

    // Remove invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code || resp.error?.message || '';
          if (code.includes('registration-token-not-registered') || code.includes('invalid-registration')) {
            invalidTokens.push(tokens[idx]);
          }
        }
      });
      if (invalidTokens.length > 0) {
        const userRef = firestore.collection('users').doc(uid);
        const currentTokens = (user.fcm_tokens || []).filter((entry) => !invalidTokens.includes(entry.token));
        await userRef.update({ fcm_tokens: currentTokens });
      }
    }

    return { sent: response.successCount, failed: response.failureCount };
  } catch (err) {
    console.error('sendPushNotification error:', err.message);
    return { sent: 0, error: err.message };
  }
}

async function sendNotificationToAll({ title, body, data = {}, tag = 'kaderin-sesi-admin' }) {
  try {
    const snapshot = await firestore.collection('users').get();
    let totalSent = 0;
    const promises = snapshot.docs.map((doc) => {
      const user = docData(doc);
      if (!user?.fcm_tokens?.length) return null;
      return sendPushNotification({ uid: user.id, title, body, data, tag }).then((r) => {
        totalSent += r.sent || 0;
      });
    }).filter(Boolean);
    await Promise.all(promises);
    return { sent: totalSent };
  } catch (err) {
    console.error('sendNotificationToAll error:', err.message);
    return { sent: 0, error: err.message };
  }
}

module.exports = { sendPushNotification, sendNotificationToAll };
