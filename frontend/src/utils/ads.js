import { AdMob } from '@capacitor-community/admob';

const isMobile = () => {
  return typeof window !== 'undefined' && typeof window.Capacitor !== 'undefined';
};

// Gerçek AdMob reklam birimleri (Kader'in Sesi)
const AD_UNITS = {
  rewarded: 'ca-app-pub-8440103571072982/3242234831',
  interstitial: 'ca-app-pub-8440103571072982/9877448450',
};

let admobInitialized = false;
let lastInterstitialAt = 0;
const INTERSTITIAL_COOLDOWN_MS = 60_000;

export async function initializeAdMob() {
  if (!isMobile()) return;
  if (admobInitialized) return;
  try {
    await AdMob.initialize({
      testingDevices: [],
      initializeForTesting: false,
    });
    admobInitialized = true;
  } catch (e) {
    console.warn('AdMob init failed:', e);
  }
}

export async function showRewardedAd(onReward) {
  if (!isMobile()) {
    await onReward({ type: 'gold', amount: 10 });
    return;
  }
  await initializeAdMob();
  try {
    const handler = await AdMob.addListener('onRewardedVideoUserDidEarnReward', (info) => {
      onReward(info);
      handler.remove();
    });
    await AdMob.prepareRewardVideoAd({
      adId: AD_UNITS.rewarded,
      isTesting: false,
    });
    await AdMob.showRewardVideoAd();
  } catch (e) {
    console.warn('Rewarded ad failed:', e);
    throw e;
  }
}

export async function showInterstitialAd() {
  if (!isMobile()) return;
  if (Date.now() - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return;
  await initializeAdMob();
  try {
    await AdMob.prepareInterstitial({
      adId: AD_UNITS.interstitial,
      isTesting: false,
    });
    await AdMob.showInterstitial();
    lastInterstitialAt = Date.now();
  } catch (e) {
    console.warn('Interstitial ad failed:', e);
  }
}

// Banner fonksiyonları artık kullanılmıyor, geriye dönük uyumluluk için boş bırakıldı
export async function showBannerAd() {}
export async function hideBannerAd() {}
