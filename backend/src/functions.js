const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const app = require('./index');

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const googlePlayServiceAccountJson = defineSecret('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
// NOT: REVENUECAT_SECRET_KEY / REVENUECAT_WEBHOOK_AUTH henuz Secret Manager'da
// olusturulmadigi icin gecici olarak devre disi birakildi (deploy'u bloke ediyordu).
// RevenueCat API key'leri alinip `firebase functions:secrets:set` ile eklendikten
// sonra asagidaki iki satiri ve secrets dizisindeki referanslari geri ac.
// const revenueCatSecretKey = defineSecret('REVENUECAT_SECRET_KEY');
// const revenueCatWebhookAuth = defineSecret('REVENUECAT_WEBHOOK_AUTH');

exports.api = onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 10,
    secrets: [geminiApiKey, googlePlayServiceAccountJson],
  },
  (req, res) => {
    // Inject secrets as environment variables so existing utils can read them.
    process.env.GEMINI_API_KEY = geminiApiKey.value();
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = googlePlayServiceAccountJson.value();
    return app(req, res);
  }
);

// ─── Re-engagement push bildirimleri ────────────────────────────────────────
// Her 6 saatte bir çalışır; 20 saatten uzun süredir aktif olmayan, FCM tokeni
// olan kullanıcılara kişiselleştirilmiş "macera seni bekliyor" bildirimi gönderir.
// Aynı kullanıcıya 3 günde en fazla 1 bildirim gider (last_reminder_at damgası).
const { firestore, docData, serverTimestamp } = require('./firestore');
const { sendPushNotification } = require('./utils/notifications');

const INACTIVE_MS = 20 * 60 * 60 * 1000;      // 20 saat inaktiflik eşiği
const REMINDER_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 gün cooldown
const MAX_PER_RUN = 500; // tek çalıştırmada güvenlik üst sınırı

exports.engagementReminder = onSchedule(
  {
    region: 'europe-west1',
    schedule: 'every 6 hours',
    timeZone: 'Europe/Istanbul',
    memory: '256MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const now = Date.now();
    const usersSnap = await firestore.collection('users').limit(MAX_PER_RUN).get();
    let sent = 0;
    for (const userDoc of usersSnap.docs) {
      try {
        const user = docData(userDoc);
        if (!user || user.isSuspended) continue;
        if (!Array.isArray(user.fcm_tokens) || user.fcm_tokens.length === 0) continue;

        const lastActive = user.last_active_at ? new Date(user.last_active_at).getTime() : 0;
        if (!lastActive || now - lastActive < INACTIVE_MS) continue; // hâlâ aktif
        const lastReminder = user.last_reminder_at ? new Date(user.last_reminder_at).getTime() : 0;
        if (lastReminder && now - lastReminder < REMINDER_COOLDOWN_MS) continue;

        // Kullanıcının son karakterini bul (kişiselleştirme için)
        let heroName = null;
        const charsSnap = await firestore.collection('characters')
          .where('ownerUid', '==', userDoc.id).limit(5).get();
        for (const c of charsSnap.docs) {
          const ch = docData(c);
          if (ch && ch.status !== 'dead' && ch.name) { heroName = ch.name; break; }
        }

        const lang = user.language === 'en' ? 'en' : 'tr';
        const title = lang === 'en' ? 'Voice of Destiny' : "Kader'in Sesi";
        const body = lang === 'en'
          ? (heroName ? `${heroName}'s adventure awaits you. The story continues…` : 'Your adventure awaits you. The story continues…')
          : (heroName ? `${heroName} macerada seni bekliyor. Hikaye kaldığı yerden devam ediyor…` : 'Macera seni bekliyor. Hikaye kaldığı yerden devam ediyor…');

        const result = await sendPushNotification({ uid: userDoc.id, title, body, tag: 'reengagement' });
        if (result.sent > 0) {
          await firestore.collection('users').doc(userDoc.id)
            .set({ last_reminder_at: serverTimestamp() }, { merge: true });
          sent += result.sent;
        }
      } catch (err) {
        console.warn('engagementReminder user error:', userDoc.id, err.message);
      }
    }
    console.log(`engagementReminder: ${sent} bildirim gönderildi`);
  }
);
