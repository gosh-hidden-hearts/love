import jwt from 'jsonwebtoken';
import config from '../config/env.js';

const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts = null;
let certsExpiresAt = 0;

function parseMaxAgeSeconds(cacheControlHeader) {
  if (!cacheControlHeader) return 3600;
  const match = cacheControlHeader.match(/max-age=(\d+)/i);
  return match ? parseInt(match[1], 10) : 3600;
}

export async function getFirebasePublicCerts(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedCerts && now < certsExpiresAt) {
    return cachedCerts;
  }

  const response = await fetch(FIREBASE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Firebase public certificates (${response.status})`);
  }

  const certs = await response.json();
  const maxAge = parseMaxAgeSeconds(response.headers.get('cache-control'));
  cachedCerts = certs;
  certsExpiresAt = now + maxAge * 1000;
  return cachedCerts;
}

/**
 * Verifies a Firebase Auth ID token using Google's RS256 public certificates
 * per Firebase's official third-party JWT verification specification.
 */
export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing Firebase ID token.');
  }

  const decodedComplete = jwt.decode(idToken, { complete: true });
  if (!decodedComplete || !decodedComplete.header) {
    throw new Error('Malformed Firebase ID token.');
  }

  const { alg, kid } = decodedComplete.header;
  if (alg !== 'RS256' || !kid) {
    throw new Error('Invalid Firebase token algorithm or key ID.');
  }

  let certs = await getFirebasePublicCerts(false);
  let cert = certs[kid];
  if (!cert) {
    // Key may have rotated; force refresh once
    certs = await getFirebasePublicCerts(true);
    cert = certs[kid];
  }

  if (!cert) {
    throw new Error('Firebase public certificate not found for token kid.');
  }

  const projectId = config.firebase.projectId;
  const issuer = `https://securetoken.google.com/${projectId}`;

  const payload = jwt.verify(idToken, cert, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer
  });

  if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) {
    throw new Error('Invalid Firebase subject (uid).');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.auth_time === 'number' && payload.auth_time > nowSeconds + 60) {
    throw new Error('Firebase token auth_time is in the future.');
  }

  return {
    uid: payload.sub,
    email: payload.email ? payload.email.toLowerCase().trim() : null,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || null,
    picture: payload.picture || null,
    phoneNumber: payload.phone_number || null,
    provider: payload.firebase?.sign_in_provider || null
  };
}

export default {
  verifyFirebaseIdToken,
  getFirebasePublicCerts
};
