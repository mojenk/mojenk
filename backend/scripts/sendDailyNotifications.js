require('dotenv').config();
const admin = require('../src/firebaseAdmin');
const { firestore, docData } = require('../src/firestore');
const { sendPushNotification } = require('../src/utils/notifications');

async function main() {
  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000);

  // Active users (last 24h) → daily move refresh notification
  const activeSnapshot = await firestore
    .collection('users')
    .where('last_active_at', '>=', oneDayAgo)
    .get();

  let dailySent = 0;
  for (const doc of activeSnapshot.docs) {
    const user = docData(doc);
    if (!user?.fcm_tokens?.length) continue;
    const res = await sendPushNotification({
      uid: user.id,
      title: "Günlük Hamle Hakların Hazır",
      body: "Kader'in Sesi'nde bugünkü 40 ücretsiz hamle hakkın yenilendi. Maceraya devam et!",
      data: { type: 'daily_refresh' },
      tag: 'kaderin-sesi-daily',
    });
    dailySent += res.sent || 0;
  }

  // Inactive users (24h-48h) → re-engagement notification
  const inactiveSnapshot = await firestore
    .collection('users')
    .where('last_active_at', '>=', twoDaysAgo)
    .where('last_active_at', '<', oneDayAgo)
    .get();

  let reengageSent = 0;
  for (const doc of inactiveSnapshot.docs) {
    const user = docData(doc);
    if (!user?.fcm_tokens?.length) continue;
    const res = await sendPushNotification({
      uid: user.id,
      title: "Kader'in Seni Bekliyor",
      body: "Uzun süredir oyuna girmedin. Kahramanın seni özledi, maceraya geri dön!",
      data: { type: 're_engagement' },
      tag: 'kaderin-sesi-reengage',
    });
    reengageSent += res.sent || 0;
  }

  console.log(`Daily refresh notifications: ${dailySent}`);
  console.log(`Re-engagement notifications: ${reengageSent}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Daily notifications error:', err);
  process.exit(1);
});
