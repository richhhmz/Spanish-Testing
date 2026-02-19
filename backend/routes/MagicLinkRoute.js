// backend/routes/MagicLinkRoute.js
import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { MagicLinkSchema } from '../models/MagicLink.js';
import { sendMagicLinkEmail } from '../tools/email.js';
import { magicRequestLimiter, magicRedeemLimiter } from '../middleware/rateLimiters.js';
import { getProfile } from '../tools/UserProfile.js';

/**
 * Helper to hash the raw token before storing/checking in DB
 */
function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export default function createMagicLinkRoute(appDBConnection, profilesDBConnection) {
  const router = express.Router();

  // Bind the model to the specific app database connection
  const MagicLink =
    appDBConnection.models.MagicLink ||
    appDBConnection.model('MagicLink', MagicLinkSchema);

  /* ──────────────────────────────────────────────────────────────────────────
     POST /magic/request
     Generates a token, stores the hash, and emails the link to the user.
     ────────────────────────────────────────────────────────────────────────── */
  router.post('/magic/request', magicRequestLimiter, async (req, res) => {
    try {
      const { email } = req.body || {};
      const normalizedEmail = (email || '').toLowerCase().trim();

      // Basic validation: if invalid, return 'ok' to prevent email harvesting
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return res.json({ ok: true });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = sha256(rawToken);

      // Invalidate any previous unused login tokens for this email
      await MagicLink.deleteMany({
        email: normalizedEmail,
        purpose: 'login',
        usedAt: null,
      });

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minute expiry

      await MagicLink.create({
        email: normalizedEmail,
        tokenHash,
        purpose: 'login',
        expiresAt,
        ip: req.ip || '',
        userAgent: req.get('user-agent') || '',
      });

      const appOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
      const linkUrl = `${appOrigin}/magic?token=${rawToken}`;

      await sendMagicLinkEmail({ to: normalizedEmail, linkUrl });

      return res.json({ ok: true });
    } catch (err) {
      console.error('magic/request error:', err);
      // Return ok even on error for security/consistency
      return res.json({ ok: true });
    }
  });

  /* ──────────────────────────────────────────────────────────────────────────
     POST /magic/redeem
     Validates the token and issues long-term Auth cookies.
     ────────────────────────────────────────────────────────────────────────── */
  router.post('/magic/redeem', magicRedeemLimiter, async (req, res) => {
    try {
      console.log("/magic/redeem");
      const { token } = req.body || {};
      if (!token) return res.status(400).json({ error: '[/magic/redeem] Missing token' });

      const tokenHash = sha256(token);

      console.log("/magic/redeem before findeOne");
      const link = await MagicLink.findOne({
        tokenHash,
        purpose: 'login',
        usedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (!link) {
        return res.status(400).json({ error: 'Invalid or expired link' });
      }

      console.log("/magic/redeem before link.save");

      // Mark token as used immediately
      link.usedAt = new Date();
      await link.save();

      const email = link.email; // This is your User ID

      console.log("/magic/redeem before getProfile");

      // Fetch profile to check for Admin status
      const profile = await getProfile(email, profilesDBConnection);
      const isAdmin = !!profile?.isAdmin;

      // payload MUST use 'userId' key to satisfy auth.js middleware
      const payload = { 
        userId: email, 
        isAdmin: isAdmin 
      };

      console.log("/magic/redeem before signing");

      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      const isProd = process.env.NODE_ENV === 'production';

      const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
      };

      // Set cookies for Cookie-based Auth
      res.cookie('token', accessToken, { 
        ...cookieOptions, 
        maxAge: 15 * 60 * 1000 
      });

      res.cookie('refreshToken', refreshToken, { 
        ...cookieOptions, 
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });

      console.log("/magic/redeem before return");

      return res.json({ ok: true });
    } catch (err) {
      console.error('magic/redeem error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}