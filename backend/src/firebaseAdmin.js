const admin = require('firebase-admin');

let initStatus = 'not_configured';
let initError = null;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    try {
      const normalized = raw.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n');
      return JSON.parse(normalized);
    } catch (err2) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', err.message);
      initError = err.message;
      return null;
    }
  }
}

if (admin.getApps().length === 0) {
  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    try {
      admin.initializeApp({ credential: admin.cert(serviceAccount) });
      console.log('Firebase Admin initialized with service account:', serviceAccount.client_email);
      initStatus = 'service_account';
    } catch (err) {
      console.error('Firebase Admin failed to initialize with service account:', err.message);
      initError = err.message;
      admin.initializeApp({ projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'kaderin-sesi' });
      initStatus = 'error';
    }
  } else {
    admin.initializeApp({
      credential: admin.applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || 'kaderin-sesi',
    });
    initStatus = process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'application_default' : 'application_default_pending';
  }
}

admin.__initStatus = initStatus;
admin.__initError = initError;

module.exports = admin;
