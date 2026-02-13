import jwt from 'jsonwebtoken';
import { isDebug } from '../config.js';

export const requireAuth = (req, res, next) => {

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // IMPORTANT: return immediately, no more verify calls
    return res.status(401).json({
      error: err.name === 'Error'
        ? 'Token expired'
        : 'Invalid token'
    });
  }
};
