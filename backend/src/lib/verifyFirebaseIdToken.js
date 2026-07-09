// Manually verifies a Firebase Auth ID token without requiring a service
// account credential. Firebase ID tokens are standard signed JWTs (RS256)
// that can be verified against Google's *public* signing certificates —
// no secret/private key is needed for verification, only the (non-secret)
// Firebase project ID. This lets auth work in environments where storing
// a service-account private key as an env var isn't available.
//
// Reference: https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
const crypto = require('crypto');

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certsCache = null;
let certsCacheExpiry = 0;

function base64UrlToBuffer(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

function base64UrlDecodeJSON(input) {
  return JSON.parse(base64UrlToBuffer(input).toString('utf8'));
}

async function fetchGoogleCerts() {
  const now = Date.now();
  if (certsCache && now < certsCacheExpiry) return certsCache;

  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Google signing certs: ${res.status}`);
  const certs = await res.json();

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 60 * 60 * 1000;

  certsCache = certs;
  certsCacheExpiry = now + Math.max(maxAgeMs, 5 * 60 * 1000);
  return certs;
}

/**
 * Verifies a Firebase Auth ID token's signature and standard claims using
 * Google's public certs. Throws on any failure.
 * Returns the decoded payload (with `uid` aliased from `sub`) on success.
 */
async function verifyFirebaseIdToken(idToken, projectId) {
  if (!idToken || typeof idToken !== 'string') throw new Error('Token missing');
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = base64UrlDecodeJSON(headerB64);
  const payload = base64UrlDecodeJSON(payloadB64);

  if (header.alg !== 'RS256') throw new Error(`Unexpected alg: ${header.alg}`);
  if (!header.kid) throw new Error('Token missing kid');

  const certs = await fetchGoogleCerts();
  let cert = certs[header.kid];
  if (!cert) {
    // kid not found in cache — force a refresh once in case keys rotated.
    certsCache = null;
    const freshCerts = await fetchGoogleCerts();
    cert = freshCerts[header.kid];
  }
  if (!cert) throw new Error('Signing key not found for kid');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToBuffer(signatureB64);
  const validSignature = verifier.verify(cert, signature);
  if (!validSignature) throw new Error('Invalid token signature');

  const now = Math.floor(Date.now() / 1000);
  const clockSkew = 60;

  if (typeof payload.exp !== 'number' || now > payload.exp + clockSkew) {
    throw new Error('Token expired');
  }
  if (typeof payload.iat !== 'number' || payload.iat > now + clockSkew) {
    throw new Error('Token issued in the future');
  }
  if (payload.aud !== projectId) {
    throw new Error(`Invalid audience: expected ${projectId}, got ${payload.aud}`);
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error(`Invalid issuer: ${payload.iss}`);
  }
  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token missing sub claim');
  }

  return { ...payload, uid: payload.sub };
}

module.exports = { verifyFirebaseIdToken };
