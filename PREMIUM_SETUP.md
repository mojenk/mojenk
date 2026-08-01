# Premium (RevenueCat) Kurulum Rehberi — Kader'in Sesi

Bu dosya, oyuna Android üzerinden Premium abonelik satın alma sisteminin tam olarak çalışması için **senin yapman gereken** dış servis/dashboard ayarlarını ve linkleri içerir.

> Kod tarafında yapılacaklar zaten yapıldı:
> - `frontend/src/utils/purchases.js` RevenueCat SDK yapılandırması
> - `frontend/src/pages/SettingsPage.jsx` Premium UI
> - `backend/src/routes/premium.js` sync + webhook
> - `.github/workflows/build-android.yml` CI env injection
> - `frontend/env.android.example` örnek env dosyası
> - Sürüm `1.2.2` (versionCode 18) olarak güncellendi

---

## 1. Google Play Console

### 1a. Uygulamayı imzalı AAB olarak yükle
- [Google Play Console](https://play.google.com/console/developers/)
- **Testing → Internal Testing** veya **Closed Testing** kanalına `app-release.aab` yükle.
- Abonelik ürünleri eklemeden önce Play Console'un uygulamayı bir kez görmesi gerekir.

### 1b. Abonelik ürünü oluştur
- Sol menü: **Monetize → Products → Subscriptions**
- **Create subscription**
  - **Product ID:** `premium_monthly` (veya kendi ID'n — aşağıdaki RevenueCat'te aynısını kullan)
  - **Name:** Premium Aylık
  - **Billing period:** Monthly
  - **Price:** İstediğin fiyat (örn. ₺49,99)
  - **Free trial** isteğe bağlı
  - Kaydet ve **Activate** et.

### 1c. Lisans test kullanıcısı ekle
- Play Console → **Setup → License testing**
- Kendi Gmail hesabını ekle.
- **License response:** LICENSED
- Bu sayede test cihazında gerçek para çekmeden “test satın alma” yapabilirsin.

---

## 2. Google Cloud Console — Servis Hesabı Anahtarı

RevenueCat, Google Play Developer API'ye erişmek için bir servis hesabı JSON anahtarı ister.

- Resmi rehber (adım adım):  
  [https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials)

Özet:
1. [Google Cloud Console](https://console.cloud.google.com/) → IAM & Admin → Service Accounts
2. Yeni service account oluştur (`revenuecat@...`)
3. Bir JSON anahtarı oluştur ve indir (`revenuecat-key.json`)
4. [Google Play Console](https://play.google.com/console/developers/) → Users and permissions → service account'ı davet et, izin olarak **Finance** ve **View app information** yeterli.

---

## 3. RevenueCat Dashboard

### 3a. Proje oluştur / uygulama ekle
- [RevenueCat Dashboard](https://app.revenuecat.com/)
- Sol üstten uygulamayı seç veya yeni ekle.
- **Platform:** Android
- **Package name:** `com.kaderinsesi.app`

### 3b. Google Play App Settings
- **Project Settings → Google Play App Settings**
- İndirdiğin `revenuecat-key.json` dosyasını yükle.
- RevenueCat bağlantıyı test edene kadar bekleyin.

### 3c. Products (ürün)
- **Products → Add product**
  - Identifier: `premium_monthly`
  - Google Play Product ID: Play Console'de oluşturduğun ID
  - Type: Subscription

### 3d. Entitlement (hak)
- **Entitlements → New entitlement**
  - Identifier: `premium`
  - `premium_monthly` ürününü bu entitlement'a bağla.

### 3e. Offering (paket)
- **Offerings → New offering**
  - Identifier: `current` (önerilen) veya dilediğin ad
  - İçine `premium_monthly` paketini ekle.
  - Bu offering'i **Default offering** yap.

### 3f. API anahtarlarını al
- **Project Settings → API Keys**
  - **Android SDK Key** — public, uygulamaya girecek
  - **Secret API Key** — backend tarafında kullanılacak
  - **Webhooks → Authorization header token** — webhook doğrulaması için

### 3g. Webhook ekle
- **Integrations → Webhooks → Add**
  - **URL:** `https://kaderin-sesi.web.app/api/premium/webhook`
  - **Authorization:** `Bearer <REVENUECAT_WEBHOOK_AUTH>`
  - **Events:**
    - INITIAL_PURCHASE
    - RENEWAL
    - UNCANCELLATION
    - CANCELLATION
    - EXPIRATION

---

## 4. GitHub Secrets (CI build için zorunlu)

Repo'ya git: `mojenk/mojenk` → **Settings → Secrets and variables → Actions → New repository secret**

| Secret adı | Değer |
|---|---|
| `REVENUECAT_ANDROID_KEY` | RevenueCat Android SDK Key |
| `REVENUECAT_SECRET_KEY` | RevenueCat Secret API Key |
| `REVENUECAT_WEBHOOK_AUTH` | RevenueCat Webhook Authorization token |

> `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` zaten ekli olmalı.

---

## 5. Backend ortam değişkenleri

Backend iki şekilde çalışabilir. Sadece birini seçmen yeterli.

### Seçenek A — `.env.kaderin-sesi` dosyası (daha basit)
`backend/.env.kaderin-sesi` dosyasına şunları ekle:

```env
NARRATOR_MODEL=...
REVENUECAT_SECRET_KEY=sk_...
REVENUECAT_WEBHOOK_AUTH=webhook_...
```

> `.env.kaderin-sesi` dosyası sadece production deploy'ta Firebase Functions tarafından otomatik yüklenir.

### Seçenek B — Firebase Secret Manager (daha güvenli)
```bash
firebase functions:secrets:set REVENUECAT_SECRET_KEY
firebase functions:secrets:set REVENUECAT_WEBHOOK_AUTH
```

Sonra `firebase deploy --only functions` ile deploy et.

---

## 6. Lokal/test build (isteğe bağlı)

```bash
cd frontend
# .env.android dosyasına kendi test anahtarını yaz
npm run build:android
npx cap sync android
npx cap open android
```

Test cihazında Google Play hesabın lisans test kullanıcısı olarak eklenmişse, gerçek para çekmeden satın alma test edilebilir.

---

## 7. Yayın akışı

1. `main` branch'ine push et → GitHub Actions otomatik AAB build eder.
2. Çıkan `app-release.aab` dosyasını Play Console'a yükle.
3. Backend env/secret'larını ayarla ve `firebase deploy` yap.
4. RevenueCat dashboard'da webhook'u kontrol et.
5. Internal/Closed Testing kullanıcılarıyla test et.
6. Her şey düzgünse Production'a aç.

---

## Faydalı Linkler

| Açıklama | Link |
|---|---|
| RevenueCat Docs | https://www.revenuecat.com/docs |
| Google Play Service Credentials | https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials |
| RevenueCat Webhooks | https://www.revenuecat.com/docs/integrations/webhooks |
| Google Play Console | https://play.google.com/console/developers/ |
| Google Cloud Console | https://console.cloud.google.com/ |
| Firebase Console | https://console.firebase.google.com/project/kaderin-sesi |
| GitHub Repo Secrets | https://github.com/mojenk/mojenk/settings/secrets/actions |

---

## Hızlı kontrol listesi

- [ ] Play Console'da `premium_monthly` aboneliği oluşturuldu ve aktif
- [ ] Google Cloud service account JSON indirildi
- [ ] RevenueCat Dashboard'a JSON yüklendi
- [ ] RevenueCat'te `premium` entitlement ve `current` offering oluşturuldu
- [ ] GitHub Secrets (`REVENUECAT_ANDROID_KEY`, `REVENUECAT_SECRET_KEY`, `REVENUECAT_WEBHOOK_AUTH`) eklendi
- [ ] Backend `.env.kaderin-sesi` veya Firebase Secret Manager'a secret'lar eklendi
- [ ] RevenueCat webhook URL `https://kaderin-sesi.web.app/api/premium/webhook` olarak ayarlandı
- [ ] Internal Testing kullanıcısı eklendi
- [ ] Test satın alma başarılı oldu
