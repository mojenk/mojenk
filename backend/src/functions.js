const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const app = require('./index');

const geminiApiKey = defineSecret('GEMINI_API_KEY');

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