const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');
const { isPremium, grantPremium } = require('../utils/premium');
const { verifyProduct, verifySubscription, isProductActive, isSubscriptionActive, getServiceAccountJson } = require('../utils/googlePlay');
const { google } = require('googleapis');

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';
const ENTITLEMENT_ID = 'premium';

function getRevenueCatSecretKey() {
  return process.env.REVENUECAT_SECRET_KEY || '';
}

function getWebhookAuthToken() {
  return process.env.REVENUECAT_WEBHOOK_AUTH || '';
}

// Reads a RevenueCat subscriber object and derives our internal premium fields.
function extractPremiumFromSubscriber(subscriber) {
  const entitlement = subscriber?.entitlements?.[ENTITLEMENT_ID];
  if (!entitlement) return { isPremium: false, premiumUntil: null };
  const expiresMs = entitlement.expires_date ? new Date(entitlement.expires_date).getTime() : null;
  const isActive = !expiresMs || expiresMs > Date.now();
  return {
    isPremium: Boolean(isActive),
    premiumUntil: expiresMs ? new Date(expiresMs) : null,
  };
}

async function applyPremiumUpdate(uid, { isPremium, premiumUntil }, source) {
  const userRef = firestore.collection('users').doc(uid);
  await userRef.set({
    is_premium: isPremium,
    premium_until: premiumUntil,
    premium_updated_at: serverTimestamp(),
    premium_updated_by: source,
  }, { merge: true });
}

// Mevcut premium durumunu döner (RevenueCat'siz de çalışır).
router.get('/status', verifyFirebaseToken, async (req, res) => {
  const uid = req.firebaseUser.uid;
  try {
    const premium = await isPremium(uid);
    const userDoc = docData(await firestore.collection('users').doc(uid).get());
    return res.json({
      ok: true,
      isPremium: premium,
      premiumUntil: userDoc?.premium_until || null,
    });
  } catch (err) {
    console.error('premium/status error:', err.message);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// RevenueCat dışı kendi ödeme/demo akışımız: kullanıcıyı premium yapar.
// Test/destek amaçlıdır. Canlıda gerçek ödeme verify-purchase üzerinden gider.
router.post('/activate', verifyFirebaseToken, async (req, res) => {
  const uid = req.firebaseUser.uid;
  const { days = null } = req.body;
  try {
    const result = await grantPremium(uid, days, 'self_activate');
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error('premium/activate error:', err.message);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Google Play Billing doğrulama endpointi.
// Uygulama satın alma sonrası purchaseToken + productId + isSubscription gönderir.
router.post('/verify-purchase', verifyFirebaseToken, async (req, res) => {
  const uid = req.firebaseUser.uid;
  const { productId, purchaseToken, isSubscription = false } = req.body;

  if (!productId || !purchaseToken) {
    return res.status(400).json({ error: 'productId ve purchaseToken gerekli' });
  }

  try {
    let active = false;
    let premiumUntil = null;

    if (isSubscription) {
      const sub = await verifySubscription(productId, purchaseToken);
      active = isSubscriptionActive(sub);
      premiumUntil = sub?.expiryTimeMillis ? new Date(parseInt(sub.expiryTimeMillis, 10)) : null;
    } else {
      const product = await verifyProduct(productId, purchaseToken);
      active = isProductActive(product);
      // One-time lifetime purchase: no expiry
      premiumUntil = null;
    }

    if (!active) {
      return res.status(402).json({ error: 'Satın alım aktif değil veya doğrulanamadı' });
    }

    await applyPremiumUpdate(uid, { isPremium: true, premiumUntil }, 'google_play_billing');
    const userDoc = docData(await firestore.collection('users').doc(uid).get());
    return res.json({ ok: true, isPremium: true, premiumUntil, user: userDoc });
  } catch (err) {
    console.error('premium/verify-purchase error:', err.message);
    return res.status(500).json({ error: 'Satın alım doğrulanırken hata oluştu', detail: err.message });
  }
});

// Called by the app right after a purchase/restore completes, so the user's
// premium flag updates immediately instead of waiting for the webhook.
router.post('/sync', verifyFirebaseToken, async (req, res) => {
  const uid = req.firebaseUser.uid;
  const secretKey = getRevenueCatSecretKey();
  if (!secretKey) {
    return res.status(503).json({ error: 'Ödeme sistemi henüz yapılandırılmadı' });
  }
  try {
    const r = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(uid)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('RevenueCat sync error:', r.status, text);
      return res.status(502).json({ error: 'RevenueCat ile iletişim kurulamadı' });
    }
    const data = await r.json();
    const result = extractPremiumFromSubscriber(data.subscriber);
    await applyPremiumUpdate(uid, result, 'revenuecat_sync');
    const userDoc = docData(await firestore.collection('users').doc(uid).get());
    return res.json({ ok: true, isPremium: result.isPremium, premiumUntil: result.premiumUntil, user: userDoc });
  } catch (err) {
    console.error('premium/sync error:', err.message);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// RevenueCat webhook: https://www.revenuecat.com/docs/integrations/webhooks
// Configure the same Authorization header value in the RevenueCat dashboard.
router.post('/webhook', async (req, res) => {
  const expectedAuth = getWebhookAuthToken();
  const receivedAuth = req.headers.authorization || '';
  if (!expectedAuth || receivedAuth !== `Bearer ${expectedAuth}`) {
    return res.status(401).json({ error: 'Yetkisiz' });
  }
  try {
    const event = req.body?.event;
    const uid = event?.app_user_id;
    if (!uid) return res.status(400).json({ error: 'app_user_id eksik' });

    const cancelTypes = ['CANCELLATION', 'EXPIRATION'];
    const activeTypes = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE'];

    if (activeTypes.includes(event.type)) {
      const premiumUntil = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
      await applyPremiumUpdate(uid, { isPremium: true, premiumUntil }, 'revenuecat_webhook');
    } else if (cancelTypes.includes(event.type)) {
      await applyPremiumUpdate(uid, { isPremium: false, premiumUntil: null }, 'revenuecat_webhook');
    }
    // BILLING_ISSUE and other event types: no immediate change, RevenueCat retries/grace period handles it.
    return res.json({ ok: true });
  } catch (err) {
    console.error('premium/webhook error:', err.message);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Test endpoint: verifies the backend can connect to Google Play API and
// that the configured service account can see the premium_monthly subscription.
router.get('/test-connection', verifyFirebaseToken, async (req, res) => {
  const results = {
    serviceAccountConfigured: false,
    serviceAccountClientEmail: null,
    androidPublisherAuth: false,
    subscriptionFound: false,
    subscriptionDetails: null,
    error: null,
  };

  try {
    const credentials = getServiceAccountJson();
    if (!credentials) {
      throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured');
    }
    results.serviceAccountConfigured = true;
    results.serviceAccountClientEmail = credentials.client_email || null;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    const androidpublisher = google.androidpublisher({ version: 'v3', auth });
    results.androidPublisherAuth = true;

    try {
      const subRes = await androidpublisher.monetization.subscriptions.get({
        packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.kaderinsesi.app',
        productId: 'premium_monthly',
      });
      results.subscriptionFound = true;
      results.subscriptionDetails = {
        productId: subRes.data.productId,
        packageName: subRes.data.packageName,
        status: subRes.data.status,
      };
    } catch (subErr) {
      results.error = {
        step: 'subscription_lookup',
        message: subErr.message,
        code: subErr.code,
      };
    }

    return res.json({ ok: true, results });
  } catch (err) {
    console.error('premium/test-connection error:', err.message);
    results.error = { step: 'auth', message: err.message };
    return res.status(500).json({ ok: false, results });
  }
});

module.exports = router;
