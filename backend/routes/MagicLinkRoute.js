// backend/routes/MagicLinkRoute.js
import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { MagicLinkSchema } from '../models/MagicLink.js';
import { sendMagicLinkEmail } from '../tools/email.js';
import { magicRequestLimiter, magicRedeemLimiter } from '../middleware/rateLimiters.js';

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default function createMagicLinkRoute(appDBConnection) {
  const router = express.Router();

  // ✅ model bound to the correct DB connection
  const MagicLink =
    appDBConnection.models.MagicLink ||
    appDBConnection.model('MagicLink', MagicLinkSchema);

  router.post('/magic/request', magicRequestLimiter, async (req, res) => {
    try {
      const { email } = req.body || {};
      const normalizedEmail = (email || '').toLowerCase().trim();

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return res.json({ ok: true });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = sha256(rawToken);

      await MagicLink.deleteMany({
        email: normalizedEmail,
        purpose: 'login',
        usedAt: null,
      });

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await MagicLink.create({
        email: normalizedEmail,
        tokenHash,
        purpose: 'login',
        expiresAt,
        ip: req.ip || '',
        userAgent: req.get('user-agent') || '',
      });

      // ✅ use one env name consistently (see note below)
      const appOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
      const linkUrl = `${appOrigin}/magic?token=${rawToken}`;

      await sendMagicLinkEmail({ to: normalizedEmail, linkUrl });

      return res.json({ ok: true });
    } catch (err) {
      console.error('magic/request error:', err);
      return res.json({ ok: true });
    }
  });

  router.post('/magic/redeem', magicRedeemLimiter, async (req, res) => {
    try {
      const { token } = req.body || {};
      if (!token) return res.status(400).json({ error: 'Missing token' });

      const tokenHash = sha256(token);

      const link = await MagicLink.findOne({
        tokenHash,
        purpose: 'login',
        usedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (!link) return res.status(400).json({ error: 'Invalid or expired link' });

      link.usedAt = new Date();
      await link.save();

      const email = link.email;

      const accessToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ email }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      const isProd = process.env.NODE_ENV === 'production';

      res.cookie('token', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error('magic/redeem error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
