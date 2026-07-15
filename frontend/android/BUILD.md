# Kader'in Sesi — Android Build Talimatları

Bu dosya, mevcut React + Vite web uygulamasının Capacitor ile Android APK/AAB olarak nasıl derleneceğini açıklar.

## Ön koşullar

- Node.js 20+
- Android Studio (en kolay yol) veya Android SDK + JDK 17
- Java 17 (Android Studio ile birlikte gelir)

## Adım adım build

### 1. Web build al

```bash
cd frontend
npm install
npm run build
```

Build çıktısı `../public` dizinine gider.

### 2. Capacitor sync çalıştır

```bash
cd frontend
npx cap sync android
```

Bu, `public` içeriğini `android/app/src/main/assets/public` altına kopyalar.

### 3. Android Studio ile aç ve build al

```bash
cd frontend
npx cap open android
```

Android Studio açıldığında:
- `Build > Generate App Bundle / APK` seçeneğini kullan.
- İlk kez yayınlarken "Create new keystore" ile `.jks` dosyası oluştur.
- Play Store için **AAB** formatını seç.

### 4. Komut satırından build (tercihe bağlı)

```bash
cd frontend/android
./gradlew bundleRelease
```

Çıktı: `frontend/android/app/build/outputs/bundle/release/app-release.aab`

## Otomatik build (GitHub Actions)

`.github/workflows/android-build.yml` workflow'u ile her push'ta otomatik AAB üretilebilir. Gizli anahtarlar GitHub Secrets üzerinde saklanmalıdır:

- `KEYSTORE_BASE64`: Base64 ile kodlanmış keystore dosyası
- `KEYSTORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

## Önemli notlar

- `capacitor.config.json` içinde `webDir` olarak `../public` kullanılıyor; bu Vite build çıktısı ile eşleşir.
- AdMob entegrasyonu için ayrıca `@capacitor-community/admob` kurulmalı ve `google-services.json` eklenmelidir.
- İlk Play Store yayını için:
  1. Google Play Developer hesabı ($25)
  2. Gizlilik politikası URL'si
  3. Uygulama simgesi (512×512 PNG) ve özellik grafiği (1024×500)
  4. İçerik derecelendirmesi formu
  5. Veri güvenliği formu

## Sorun giderme

- `JAVA_HOME` tanımlı değilse: Android Studio'nun içindeki JDK'yi işaret edin.
- Gradle hatası alırsanız: `cd android && ./gradlew clean` deneyin.
- Web güncellemeleri Android'e yansımazsa: `npm run build && npx cap copy android` yapın.
