const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const app = require('./index');

const geminiApiKey = defineSecret('GEMINI_API_KEY');
// NOT: REVENUECAT_SECRET_KEY / REVENUECAT_WEBHOOK_AUTH henuz Secret Manager'da
// olusturulmadigi icin gecici olarak devre disi birakildi (deploy'u bloke ediyordu).
// RevenueCat API key'leri alinip `firebase functions:secrets:set` ile eklendikten
// sonra asagidaki iki satiri ve secrets dizisindeki referanslari geri ac.
// const revenueCatSecretKey = defineSecret('REVENUECAT_SECRET_KEY');
// const revenueCatWebhookAuth = defineSecret('REVENUECAT_WEBHOOK_AUTH');

exports.api = onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 120,
    minInstances: 0,
    maxInstances: 10,
    secrets: [geminiApiKey],
  },
  app
);