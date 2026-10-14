const { createHmac, randomUUID, timingSafeEqual } = require('node:crypto');
const User = require('../models/User');

const COOKIE_NAME = 'library_session';
const SESSION_LIFETIME_SECONDS = 60 * 60 * 8;
const sessions = new Map();
const DEVELOPMENT_SECRET = 'development-only-secret-change-before-production';

function getSecret() {
  const secret = process.env.JWT_SECRET
    || (process.env.NODE_ENV === 'production' ? undefined : DEVELOPMENT_SECRET);
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  return secret;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(content) {
  return createHmac('sha256', getSecret()).update(content).digest('base64url');
}

function createToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const sessionId = randomUUID();
  const payload = { sub: userId, sid: sessionId, iat: now, exp: now + SESSION_LIFETIME_SECONDS };

  for (const [id, session] of sessions) {
    if (session.exp <= now) {
      sessions.delete(id);
    }
  }
  sessions.set(sessionId, payload);

  const content = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  return `${content}.${sign(content)}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') {
    return undefined;
  }
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => !/^[\w-]+$/.test(part))) {
    return undefined;
  }

  const content = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(content), 'base64url');
  const supplied = Buffer.from(parts[2], 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return undefined;
  }

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (header.alg !== 'HS256'
      || typeof payload.sub !== 'string'
      || typeof payload.sid !== 'string'
      || typeof payload.exp !== 'number'
      || payload.exp <= Math.floor(Date.now() / 1000)) {
      return undefined;
    }

    const session = sessions.get(payload.sid);
    if (!session || session.sub !== payload.sub || session.exp !== payload.exp) {
      return undefined;
    }
    return payload;
  } catch {
    return undefined;
  }
}

function readCookie(header) {
  if (typeof header !== 'string') {
    return undefined;
  }

  const prefix = `${COOKIE_NAME}=`;
  const cookie = header.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  if (!cookie) {
    return undefined;
  }
  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return undefined;
  }
}

function cookieOptions() {
  return `Path=/; HttpOnly; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

function setSessionCookie(token) {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieOptions()}; Max-Age=${SESSION_LIFETIME_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; ${cookieOptions()}; Max-Age=0`;
}

function revokeToken(token) {
  const payload = verifyToken(token);
  if (payload) {
    sessions.delete(payload.sid);
  }
}

async function requireAuth(req, res, next) {
  try {
    const token = readCookie(req.headers.cookie);
    const payload = token ? verifyToken(token) : undefined;
    if (!payload) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    next();
  };
}

module.exports = {
  clearSessionCookie,
  createToken,
  readCookie,
  requireAuth,
  requireRole,
  revokeToken,
  setSessionCookie,
  verifyToken,
};
