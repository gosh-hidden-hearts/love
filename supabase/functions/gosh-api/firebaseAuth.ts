import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';

const FIREBASE_JWKS_URL = new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
);

const jwks = createRemoteJWKSet(FIREBASE_JWKS_URL);

export interface VerifiedFirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  phoneNumber: string | null;
}

export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string
): Promise<VerifiedFirebaseUser> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing Firebase ID token.');
  }

  const issuer = `https://securetoken.google.com/${projectId}`;
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer,
    audience: projectId,
    algorithms: ['RS256']
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
    email: typeof payload.email === 'string' ? payload.email.toLowerCase().trim() : null,
    emailVerified: Boolean(payload.email_verified),
    name: typeof payload.name === 'string' ? payload.name : null,
    picture: typeof payload.picture === 'string' ? payload.picture : null,
    phoneNumber: typeof payload.phone_number === 'string' ? payload.phone_number : null
  };
}
