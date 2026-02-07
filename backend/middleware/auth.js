import jwt from 'jsonwebtoken';
import { isDebug } from '../config.js';

export const requireAuth = (req, res, next) => {
  if (isDebug) {
    console.log('🔍 [auth] Authorization header:', req.headers.authorization);
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (isDebug) {
      console.log('✅ [auth] JWT decoded:', decoded);
      console.log('[auth] Issued at:', new Date(decoded.iat * 1000).toISOString());
      console.log('[auth] Expires at:', new Date(decoded.exp * 1000).toISOString());
      console.log('[auth] Current time:', new Date().toISOString());
    }

    req.user = decoded;
    next();
  } catch (err) {
    if(isDebug)console.log('❌ [auth] JWT error:', err.name, err.message);

    // IMPORTANT: return immediately, no more verify calls
    if(isDebug)console.log('🚨 [auth] requireAuth sending 401 response');
    return res.status(401).json({
      error: err.name === 'Error'
        ? 'Token expired'
        : 'Invalid token'
    });
  }
};
