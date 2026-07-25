import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';

const ANDROID_API_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';
const ENTITLEMENT_ID = 'premium';

let configured = false;

export function isPurchasesAvailable() {
  return Capacitor.isNativePlatform() && Boolean(ANDROID_API_KEY);
}

export async function configurePurchases(uid) {
  if (!isPurchasesAvailable() || !uid || configured) return;
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({ apiKey: ANDROID_API_KEY, appUserID: uid });
    configured = true;
  } catch (err) {
    console.error('RevenueCat yapılandırma hatası:', err);
  }
}

// { current: Offering|null, error?: string }
export async function fetchOfferings() {
  if (!isPurchasesAvailable()) return { current: null, error: 'unavailable' };
  try {
    const result = await Purchases.getOfferings();
    return { current: result.current || null };
  } catch (err) {
    console.error('Offerings alınamadı:', err);
    return { current: null, error: err?.message || 'unknown' };
  }
}

// pkg: bir Offering.availablePackages elemanı
export async function purchasePackage(pkg) {
  if (!isPurchasesAvailable()) throw new Error('unavailable');
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return isEntitlementActive(customerInfo);
}

export async function restorePurchases() {
  if (!isPurchasesAvailable()) throw new Error('unavailable');
  const { customerInfo } = await Purchases.restorePurchases();
  return isEntitlementActive(customerInfo);
}

export async function getCustomerInfo() {
  if (!isPurchasesAvailable()) return null;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (err) {
    console.error('CustomerInfo alınamadı:', err);
    return null;
  }
}

function isEntitlementActive(customerInfo) {
  return Boolean(customerInfo?.entitlements?.active?.[ENTITLEMENT_ID]);
}
