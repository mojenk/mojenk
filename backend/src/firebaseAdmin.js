const {
  applicationDefault,
  cert,
  getApp,
  getApps,
  initializeApp,
} = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

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

if (getApps().length === 0) {
  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    try {
      initializeApp({ credential: cert(serviceAccount) });
      console.log('Firebase Admin initialized with service account:', serviceAccount.client_email);
      initStatus = 'service_account';
    } catch (err) {
      console.error('Firebase Admin failed to initialize with service account:', err.message);
      initError = err.message;
      initializeApp({ projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID || 'kaderin-sesi' });
      initStatus = 'error';
    }
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID || 'kaderin-sesi',
    });
    initStatus = 'application_default';
  }
}

const app = getApp();

module.exports = {
  app,
  auth: () => getAuth(app),
  __initStatus: initStatus,
  __initError: initError,
};
