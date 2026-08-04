const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');
const { isPremium, grantPremium } = require('../utils/premium');

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
// İleride gerçek bir ödeme gateway'i entegre edildiğinde buradan geçirilir.
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

module.exports = router;
