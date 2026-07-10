# Kader'in Sesi

React, Express, Firebase Authentication, Firestore ve Gemini ile geliştirilen yapay zekâ destekli rol yapma oyunu.

## Veri kaynağı

Uygulamanın tek kalıcı veri kaynağı Firestore'dur. Frontend Firestore'a doğrudan erişmez; tüm oyun işlemleri Firebase ID token doğrulayan Express API üzerinden yürür.

Ana koleksiyonlar:

- `users`
- `characters`
- `sessions`
- `fallenHeroes`
- `announcements`
- `worldEvents`
- `appSettings`

Karakter alt koleksiyonları:

- `inventory`
- `npcs`
- `quests`
- `perks`

Oturum mesajları `sessions/{sessionId}/messages` altında tutulur.

## Firebase yayını

Üretimde React arayüzü Firebase Hosting, Express API ise 2. nesil Firebase Functions üzerinde çalışır. Functions çalışma zamanı Firestore'a otomatik Google Cloud kimliğiyle bağlanır; Service Account JSON gerekmez.

Gemini anahtarı yalnızca Secret Manager'da tutulur:

```bash
npx firebase-tools functions:secrets:set GEMINI_API_KEY
```

İlk yönetici, giriş yaptıktan sonra Ayarlar sayfasındaki tek kullanımlık yönetici atama düğmesiyle belirlenir.

## Firestore güvenliği

`firestore.rules` istemciden tüm doğrudan okumaları ve yazmaları kapatır. Firebase Admin SDK güvenilir backend ortamında kuralları aşarak çalışır.

Derleme ve Firebase dağıtımı:

```bash
npm run firebase:deploy
```

Bu komut frontend'i derler; Functions, Hosting, Firestore kuralları ve indekslerini `kaderin-sesi` projesine dağıtır. Dağıtım için Firebase projesinin Blaze planında olması gerekir.

## Çalıştırma

```bash
npm run install:all
npm run dev
```

Frontend build:

```bash
cd frontend
npm run build
```

Backend:

```bash
cd backend
npm start
```

Yerel Firebase Emulator Suite:

```bash
npm run firebase:serve
```
