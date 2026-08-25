const { google } = require('googleapis');

const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.kaderinsesi.app';

function getServiceAccountJson() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    // Accept base64-encoded JSON or plain JSON
    let decoded = raw;
    if (!raw.trim().startsWith('{')) {
      decoded = Buffer.from(raw, 'base64').toString('utf8');
    }
    return JSON.parse(decoded);
  } catch (err) {
    console.error('Invalid GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:', err.message);
    return null;
  }
}

function getAndroidPublisher() {
  const credentials = getServiceAccountJson();
  if (!credentials) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured');
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return google.androidpublisher({ version: 'v3', auth });
}

// Verify a one-time product purchase
async function verifyProduct(productId, purchaseToken) {
  const androidpublisher = getAndroidPublisher();
  const res = await androidpublisher.purchases.products.get({
    packageName: PACKAGE_NAME,
    productId,
    token: purchaseToken,
  });
  return res.data;
}

// Consume a one-time product purchase (kozmetik gibi tekrar satin alinabilir urunler icin)
async function consumeProduct(productId, purchaseToken) {
  const androidpublisher = getAndroidPublisher();
  await androidpublisher.purchases.products.consume({
    packageName: PACKAGE_NAME,
    productId,
    token: purchaseToken,
  });
}

// Verify a subscription purchase
async function verifySubscription(subscriptionId, purchaseToken) {
  const androidpublisher = getAndroidPublisher();
  const res = await androidpublisher.purchases.subscriptions.get({
    packageName: PACKAGE_NAME,
    subscriptionId,
    token: purchaseToken,
  });
  return res.data;
}

function isProductActive(product) {
  // purchaseState 0 = Purchased, 1 = Canceled, 2 = Pending
  return product && product.purchaseState === 0;
}

function isSubscriptionActive(sub) {
  if (!sub) return false;
  const expiry = sub.expiryTimeMillis ? parseInt(sub.expiryTimeMillis, 10) : 0;
  if (expiry && expiry < Date.now()) return false;
  // paymentState 1 = Payment received, 2 = Free trial, 3 = Pending deferred upgrade
  return [1, 2].includes(sub.paymentState);
}

module.exports = {
  verifyProduct,
  verifySubscription,
  consumeProduct,
  isProductActive,
  isSubscriptionActive,
  getServiceAccountJson,
};
