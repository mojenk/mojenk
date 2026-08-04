// Google Play Billing wrapper via cordova-plugin-purchase
// https://github.com/j3k0/cordova-plugin-purchase

let initialized = false;
let products = [];
let errorHandler = null;
let logs = [];

function log(level, message, data) {
  const entry = { ts: Date.now(), level, message, data };
  logs.push(entry);
  if (logs.length > 200) logs.shift();
  // eslint-disable-next-line no-console
  console.log(`[billing] ${message}`, data || '');
}

export function getBillingLogs() {
  return [...logs];
}

export function clearBillingLogs() {
  logs = [];
}

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
  log('info', 'initBilling called', { productIds, subscriptionIds, isNative: isNative(), platform: typeof window !== 'undefined' ? window.Capacitor?.getPlatform?.() : null });
  if (!isBillingAvailable()) {
    const reason = !isNative() ? 'not_native' : (!getStore() ? 'no_store' : 'unknown');
    log('error', 'Billing not available', { reason });
    throw new Error('Billing is only available on Android native builds');
  }
  if (initialized) {
    log('info', 'Billing already initialized');
    if (typeof callbacks.onProductUpdated === 'function') {
      products.forEach((p) => callbacks.onProductUpdated(p));
    }
    return;
  }

  const store = getStore();
  const CdvPurchase = getCdvPurchase();
  const { Platform, ProductType } = CdvPurchase || {};

  log('info', 'CdvPurchase check', { hasCdvPurchase: Boolean(CdvPurchase), hasPlatform: Boolean(Platform), hasProductType: Boolean(ProductType) });

  if (!ProductType || !Platform) {
    log('error', 'CdvPurchase API not ready');
    throw new Error('CdvPurchase API not ready');
  }

  log('info', 'Registering products', { consumables: productIds, subscriptions: subscriptionIds });
  store.register(
    productIds.map((id) => ({ id, type: ProductType.CONSUMABLE })),
  );
  store.register(
    subscriptionIds.map((id) => ({ id, type: ProductType.PAID_SUBSCRIPTION })),
  );

  addWhenListener(store, 'productUpdated', (product) => {
    log('info', 'productUpdated', { id: product.id, title: product.title, state: product.state });
    const idx = products.findIndex((p) => p.id === product.id);
    if (idx >= 0) products[idx] = product;
    else products.push(product);
    if (typeof callbacks.onProductUpdated === 'function') {
      try { callbacks.onProductUpdated(product); } catch (e) { console.error(e); }
    }
  });

  addWhenListener(store, 'approved', async (transaction) => {
    log('info', 'approved', { transactionId: transaction.transactionId });
    try {
      await transaction.finish();
    } catch (err) {
      log('error', 'transaction.finish error', { message: err.message });
    }
  });

  addWhenListener(store, 'verified', (receipt) => {
    log('info', 'verified');
    try { receipt.finish(); } catch (err) { log('error', 'receipt.finish error', { message: err.message }); }
  });

  addWhenListener(store, 'unverified', (receipt) => {
    log('warn', 'unverified', receipt);
    if (errorHandler) errorHandler('unverified', receipt);
  });

  addWhenListener(store, 'error', (err) => {
    log('error', 'billing error event', { message: err.message, code: err.code });
    if (errorHandler) errorHandler('error', err);
  });

  try {
    log('info', 'Calling store.initialize', { platform: Platform.GOOGLE_PLAY });
    await store.initialize([Platform.GOOGLE_PLAY]);
    log('info', 'store.initialize done');
  } catch (initErr) {
    log('error', 'store.initialize failed', { message: initErr.message });
    throw initErr;
  }

  if (typeof store.update === 'function') {
    try {
      log('info', 'Calling store.update');
      await store.update();
      log('info', 'store.update done');
    } catch (updateErr) {
      log('error', 'store.update failed', { message: updateErr.message });
    }
  }

  log('info', 'Billing initialized', { productCount: products.length });
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
  log('info', 'Calling restorePurchases');
  try {
    await store.restorePurchases();
    log('info', 'restorePurchases done');
  } catch (err) {
    log('error', 'restorePurchases failed', { message: err.message });
  }
  if (typeof store.update === 'function') {
    try {
      await store.update();
    } catch (err) {
      log('error', 'store.update after restore failed', { message: err.message });
    }
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
