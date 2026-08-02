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

export function isRewardedAdAvailable() {
  return isMobile();
}

/**
 * Ödüllü reklam gösterir. Ödül SADECE AdMob'un `onRewardedVideoAdReward`
 * olayı geldiğinde verilir — `showRewardVideoAd()` promise'i reklam
 * gösterilir gösterilmez çözülebildiği için ona güvenilmez.
 *
 * @param {Function} onReward  Ödül hak edildiğinde çağrılır
 * @param {Function} [onAdStart] Reklam ekrana gelmeden hemen önce çağrılır
 *                               (sunucudan doğrulama bileti almak için)
 */
export async function showRewardedAd(onReward, onAdStart) {
  if (!isMobile()) {
    // Web'de AdMob yok; ödül vermek istismara açık olurdu.
    const error = new Error('Ödüllü reklam yalnızca mobil uygulamada kullanılabilir');
    error.code = 'AD_NOT_AVAILABLE';
    throw error;
  }
  await initializeAdMob();

  const handles = [];
  const cleanup = () => {
    handles.forEach((h) => h?.remove?.());
    handles.length = 0;
  };

  try {
    const reward = await new Promise((resolve, reject) => {
      let settled = false;
      let rewardEarned = null;
      let dismissed = false;

      // Reklam hiçbir sinyal göndermeden asılı kalırsa arayüz sonsuza dek kilitli kalmasın
      const safetyTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Reklam zaman aşımına uğradı'));
        }
      }, 60000);

      const settle = () => {
        if (settled) return;
        if (rewardEarned) {
          settled = true;
          clearTimeout(safetyTimer);
          resolve(rewardEarned);
        } else if (dismissed) {
          settled = true;
          clearTimeout(safetyTimer);
          resolve(null);
        }
      };

      AdMob.addListener('onRewardedVideoAdReward', (info) => {
        rewardEarned = info || { type: 'gold', amount: 0 };
        settle();
      }).then((h) => handles.push(h));

      // Ödül alınmadan reklam kapatılırsa (kullanıcı erken çıkarsa) bunu da yakala,
      // aksi halde showRewardVideoAd() promise'i hiç çözülmeyip arayüz kilitli kalır
      AdMob.addListener('onRewardedVideoAdDismissed', () => {
        dismissed = true;
        settle();
      }).then((h) => handles.push(h));

      AdMob.prepareRewardVideoAd({
        adId: AD_UNITS.rewarded,
        isTesting: false,
      })
        .then(async () => {
          // Reklam ekrana gelmeden hemen önce sunucudan doğrulama bileti al
          if (onAdStart) await onAdStart();
          return AdMob.showRewardVideoAd();
        })
        .then(() => {
          // showRewardVideoAd() reklam gösterilir gösterilmez çözülebiliyor;
          // ödülü burada VERMİYORUZ. Yalnızca reward/dismiss olayları karar verir.
          if (!rewardEarned && !dismissed) {
            // Kapanış sinyali gecikirse arayüz kilitlenmesin diye ek güvenlik
            setTimeout(() => { dismissed = true; settle(); }, 90000);
          }
        })
        .catch((e) => {
          if (!settled) {
            settled = true;
            clearTimeout(safetyTimer);
            reject(e);
          }
        });
    });

    if (reward) {
      await onReward(reward);
    } else {
      throw new Error('Reklam ödül alınmadan kapatıldı');
    }
  } catch (e) {
    console.warn('Rewarded ad failed:', e);
    throw e;
  } finally {
    cleanup();
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
