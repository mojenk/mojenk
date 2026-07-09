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

## Gerekli backend ortam değişkenleri

- `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase hizmet hesabı JSON'u, tek satır
- `FIREBASE_PROJECT_ID`: Firebase proje kimliği
- `GEMINI_API_KEY`: Gemini API anahtarı veya ilk kurulumdan sonra Firestore `appSettings` kaydı
- `ADMIN_UIDS`: Virgülle ayrılmış Firebase UID listesi veya ilk admin kurulumu
- `PORT`: Platform tarafından atanır

Hizmet hesabı kaynak koduna veya `.env.example` içine yazılmamalıdır.

## Firestore güvenliği

`firestore.rules` istemciden tüm doğrudan okumaları ve yazmaları kapatır. Firebase Admin SDK güvenilir backend ortamında kuralları aşarak çalışır.

Firebase CLI kullanıldığında indeks ve kurallar:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

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