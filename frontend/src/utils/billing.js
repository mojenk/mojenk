// Google Play Billing wrapper via cordova-plugin-purchase
// https://github.com/j3k0/cordova-plugin-purchase

let initialized = false;
let products = [];
let errorHandler = null;

function getStore() {
  // Cordova plugin v13 exposes CdvPurchase global.
  // Do NOT fall back to window.store; that is the legacy v11 API and its
  // when() chain does not include unverified()/verified().
  const w = typeof window !== 'undefined' ? window : {};
  return w.CdvPurchase?.store;
}

function getCdvPurchase() {
  const w = typeof window !== 'undefined' ? window : {};
  return w.CdvPurchase;
}

export function isNative() {
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

function safeWhen(store) {
  return typeof store.when === 'function' ? store.when() : null;
}

function addWhenListener(store, event, callback) {
  const when = safeWhen(store);
  if (!when) return null;
  if (typeof when[event] !== 'function') {
    console.warn(`[billing] store.when().${event} is not available`);
    return null;
  }
  return when[event](callback);
}

export async function initBilling(productIds = [], subscriptionIds = [], callbacks = {}) {
  if (!isBillingAvailable()) {
    throw new Error('Billing is only available on Android native builds');
  }
  if (initialized) {
    if (typeof callbacks.onProductUpdated === 'function') {
      // Already initialized; immediately report current products and register callback for future updates.
      products.forEach((p) => callbacks.onProductUpdated(p));
    }
    return;
  }

  const store = getStore();
  const CdvPurchase = getCdvPurchase();
  const { Platform, ProductType } = CdvPurchase || {};

  if (!ProductType || !Platform) {
    throw new Error('CdvPurchase API not ready');
  }

  store.register(
    productIds.map((id) => ({ id, type: ProductType.CONSUMABLE })),
  );
  store.register(
    subscriptionIds.map((id) => ({ id, type: ProductType.PAID_SUBSCRIPTION })),
  );

  // Use individual listeners instead of chaining to avoid runtime issues if
  // the deployed plugin build is missing any of the chained methods.
  addWhenListener(store, 'productUpdated', (product) => {
    const idx = products.findIndex((p) => p.id === product.id);
    if (idx >= 0) products[idx] = product;
    else products.push(product);
    if (typeof callbacks.onProductUpdated === 'function') {
      try { callbacks.onProductUpdated(product); } catch (e) { console.error(e); }
    }
  });

  addWhenListener(store, 'approved', async (transaction) => {
    // Finish/acknowledge the transaction on the device.
    // Backend verification happens after purchase() resolves.
    try {
      await transaction.finish();
    } catch (err) {
      console.error('transaction.finish error:', err);
    }
  });

  // verified/unverified only fire when a receipt validator is configured.
  // They are not required for our manual backend verification flow, so skip
  // them if the current plugin build does not expose them.
  addWhenListener(store, 'verified', (receipt) => {
    try {
      receipt.finish();
    } catch (err) {
      console.error('receipt.finish error:', err);
    }
  });

  addWhenListener(store, 'unverified', (receipt) => {
    console.warn('Unverified receipt:', receipt);
    if (errorHandler) errorHandler('unverified', receipt);
  });

  addWhenListener(store, 'error', (err) => {
    console.error('Billing error:', err);
    if (errorHandler) errorHandler('error', err);
  });

  await store.initialize([Platform.GOOGLE_PLAY]);

  // Refresh product metadata after initialization.
  if (typeof store.update === 'function') {
    await store.update();
  }

  initialized = true;
}

export function getBillingProducts() {
  const store = getStore();
  if (!store) return [];
  // v13 API: store.products getter
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
  await store.order(offer);

  // Wait for the approved event and extract transaction.
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Purchase timed out')), 60000);

    let approvedUnsub = null;
    let errorUnsub = null;

    function cleanup() {
      clearTimeout(timeout);
      if (typeof approvedUnsub === 'function') approvedUnsub();
      if (typeof errorUnsub === 'function') errorUnsub();
    }

    approvedUnsub = addWhenListener(store, 'approved', (transaction) => {
      if (transaction.products?.some((p) => p.id === productId)) {
        cleanup();
        resolve(transaction);
      }
    });

    errorUnsub = addWhenListener(store, 'error', (err) => {
      cleanup();
      reject(err);
    });
  });
}

export async function restoreBillingPurchases() {
  if (!isBillingAvailable()) return [];
  const store = getStore();
  await store.restorePurchases();
  if (typeof store.update === 'function') {
    await store.update();
  }
  return getBillingProducts();
}

export function getPurchaseToken(transaction) {
  // Native Google Play purchase token is usually inside transaction.nativePurchase
  const native = transaction?.nativePurchase;
  return native?.purchaseToken || transaction?.purchaseToken || null;
}

export function getProductId(transaction) {
  return transaction?.products?.[0]?.id || transaction?.productId || null;
}
