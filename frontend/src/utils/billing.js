// Google Play Billing wrapper via cordova-plugin-purchase
// https://github.com/j3k0/cordova-plugin-purchase

const PLATFORM = {
  GOOGLE_PLAY: 'google-play',
  APPLE_APPSTORE: 'apple-appstore',
  TEST: 'test',
};

let initialized = false;
let products = [];
let errorHandler = null;

function getStore() {
  // Cordova plugin exposes CdvPurchase global
  const w = typeof window !== 'undefined' ? window : {};
  return w.CdvPurchase?.store || w.store;
}

function isNative() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
}

function isAndroid() {
  return isNative() && window.Capacitor?.getPlatform?.() === 'android';
}

export function isBillingAvailable() {
  return isAndroid() && Boolean(getStore());
}

export function setBillingErrorHandler(handler) {
  errorHandler = handler;
}

export async function initBilling(productIds = [], subscriptionIds = []) {
  if (!isBillingAvailable()) {
    throw new Error('Billing is only available on Android native builds');
  }
  if (initialized) return;

  const store = getStore();
  const { Platform, ProductType } = window.CdvPurchase || {};

  store.register(
    productIds.map((id) => ({ id, type: ProductType.CONSUMABLE })),
  );
  store.register(
    subscriptionIds.map((id) => ({ id, type: ProductType.PAID_SUBSCRIPTION })),
  );

  store.when()
    .productUpdated((product) => {
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx >= 0) products[idx] = product;
      else products.push(product);
    })
    .approved(async (transaction) => {
      // Finish/acknowledge the transaction on the device.
      // Backend verification happens after purchase() resolves.
      try {
        await transaction.finish();
      } catch (err) {
        console.error('transaction.finish error:', err);
      }
    })
    .verified((receipt) => receipt.finish())
    .unverified((receipt) => {
      console.warn('Unverified receipt:', receipt);
      if (errorHandler) errorHandler('unverified', receipt);
    })
    .error((err) => {
      console.error('Billing error:', err);
      if (errorHandler) errorHandler('error', err);
    });

  await store.initialize([Platform.GOOGLE_PLAY]);
  initialized = true;
}

export function getBillingProducts() {
  const store = getStore();
  if (!store) return [];
  // v13 API: store.products array
  return store.products || [];
}

export async function purchaseProduct(productId) {
  if (!isBillingAvailable()) {
    throw new Error('Billing not available');
  }
  const store = getStore();
  const product = products.find((p) => p.id === productId) || store.get(productId);
  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }
  const offer = product.offers?.[0];
  if (!offer) {
    throw new Error(`Product ${productId} has no offer`);
  }
  const order = await store.order(offer);
  // Wait for the approved/verified event and extract transaction
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Purchase timed out')), 60000);

    const unsubscribe = store.when().approved((transaction) => {
      if (transaction.products?.some((p) => p.id === productId)) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(transaction);
      }
    });

    store.when().error((err) => {
      clearTimeout(timeout);
      unsubscribe();
      reject(err);
    });
  });
}

export async function restoreBillingPurchases() {
  if (!isBillingAvailable()) return [];
  const store = getStore();
  await store.restorePurchases();
  return products;
}

export function getPurchaseToken(transaction) {
  // Native Google Play purchase token is usually inside transaction.nativePurchase
  const native = transaction?.nativePurchase;
  return native?.purchaseToken || native?.purchaseToken || transaction?.purchaseToken || null;
}

export function getProductId(transaction) {
  return transaction?.products?.[0]?.id || transaction?.productId || null;
}
