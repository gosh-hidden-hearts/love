import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { verifyFirebaseIdToken } from '../services/firebaseAuthService.js';
import db from '../repositories/databaseRepository.js';

function extractBearerToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1]?.trim() || null;
}

/**
 * Strictly requires a valid Firebase ID token in Authorization: Bearer <token>.
 * Attaches verified claims to req.firebaseUser. Never trusts client body UID.
 */
export async function requireFirebaseToken(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required: Firebase ID token missing.'
    });
  }

  try {
    const firebaseUser = await verifyFirebaseIdToken(token);
    req.firebaseUser = firebaseUser;
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: `Invalid or expired Firebase ID token: ${err.message}`
    });
  }
}

/**
 * Verifies either a backend-issued HS256 session JWT or a Firebase RS256 ID token
 * and resolves req.user with the canonical Supabase user UUID.
 */
export async function resolveAuthenticatedUser(token) {
  const decodedHeader = jwt.decode(token, { complete: true })?.header;
  if (!decodedHeader) {
    throw new Error('Malformed authorization token.');
  }

  if (decodedHeader.alg === 'HS256') {
    if (!config.jwtSecret) {
      throw new Error('Server JWT secret is not configured.');
    }
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    if (!decoded?.id) {
      throw new Error('Token missing user ID.');
    }
    return {
      id: decoded.id,
      firebaseUid: decoded.firebaseUid || null,
      email: decoded.email || null,
      username: decoded.username || null
    };
  }

  if (decodedHeader.alg === 'RS256') {
    const firebaseUser = await verifyFirebaseIdToken(token);
    const dbUser = await db.findUserByFirebaseUid(firebaseUser.uid);
    if (!dbUser) {
      throw new Error('User is not synchronized in database. Call /api/auth/sync-user first.');
    }
    return {
      id: dbUser.id,
      firebaseUid: firebaseUser.uid,
      email: dbUser.email,
      username: dbUser.username
    };
  }

  throw new Error('Unsupported token algorithm.');
}

export async function authenticateToken(req, res, next) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token required.'
    });
  }

  try {
    req.user = await resolveAuthenticatedUser(token);
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: `Invalid or expired authentication token: ${err.message}`
    });
  }
}

export async function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);
  if (token) {
    try {
      req.user = await resolveAuthenticatedUser(token);
    } catch {
      // Proceed unauthenticated if optional
    }
  }
  return next();
}

export default authenticateToken;
