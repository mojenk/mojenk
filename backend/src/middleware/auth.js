const admin = require('../firebaseAdmin');
const { verifyFirebaseIdToken } = require('../lib/verifyFirebaseIdToken');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'kaderin-sesi';

// Firebase Admin SDK requires a service-account credential to verify tokens.
// When that credential isn't configured (e.g. no env var support for
// secrets), we fall back to manual JWT verification against Google's public
// signing certs, which only needs the (non-secret) project ID. See
// backend/src/lib/verifyFirebaseIdToken.js for details.
const useAdminSdk = admin.__initStatus === 'service_account'
  || (admin.__initStatus === 'application_default' && Boolean(
    process.env.K_SERVICE
    || process.env.FUNCTION_TARGET
    || process.env.GOOGLE_APPLICATION_CREDENTIALS
    || process.env.GOOGLE_CLOUD_PROJECT
  ));

async function decodeToken(token) {
  if (useAdminSdk) {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
  }
  return verifyFirebaseIdToken(token, PROJECT_ID);
}

/**
 * Express middleware that verifies the Firebase ID token sent in the
 * Authorization: Bearer <token> header.
 *
 * On success: req.firebaseUser = { uid, email, name, picture }
 * On failure: returns 401
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Yetkilendirme tokeni gerekli' });
  }

  try {
    const decoded = await decodeToken(token);
    req.firebaseUser = {
      uid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || decoded.email || null,
      picture: decoded.picture || null,
    };
    next();
  } catch (err) {
    console.error('Firebase token verification failed:', err.message);
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
}

/**
 * Optional auth middleware: attaches firebaseUser if token exists,
 * but does not reject requests without a token.
 */
async function optionalFirebaseAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const decoded = await decodeToken(token);
      req.firebaseUser = {
        uid: decoded.uid,
        email: decoded.email || null,
        name: decoded.name || decoded.email || null,
        picture: decoded.picture || null,
      };
    } catch { /* ignore invalid token */ }
  }
  next();
}

module.exports = { verifyFirebaseToken, optionalFirebaseAuth };
