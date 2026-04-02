// backend/routes/MagicLinkRoute.js
import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { MagicLinkSchema } from '../models/MagicLink.js';
import { sendMagicLinkEmail } from '../tools/email.js';
import { magicRequestLimiter, magicRedeemLimiter } from '../middleware/rateLimiters.js';
import { getProfile } from '../tools/UserProfile.js';
import { isDebug } from '../config.js';

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

      const appOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:8080';
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
      if(isDebug)console.log(`[/magic/redeem] /magic/redeem start`);
      const { token } = req.body || {};
      if (!token) return res.status(400).json({ error: 'Missing token' });
      if(isDebug)console.log(`[/magic/redeem] /magic/redeem token=${token}`);

      const tokenHash = sha256(token);
      const link = await MagicLink.findOne({
        tokenHash,
        purpose: 'login',
        usedAt: null,
        expiresAt: { $gt: new Date() },
      });

      if (!link) {
        if(isDebug)console.log(`[/magic/redeem] /magic/redeem link not found`);
        return res.status(400).json({ error: 'Invalid or expired link' });
      }

      // Mark token as used immediately
      link.usedAt = new Date();
      await link.save();

      const email = link.email; // This is your User ID

      // Fetch profile to check for Admin status
      if(isDebug)console.log(`[/magic/redeem] before getProfile`);
      const profile = await getProfile(email, profilesDBConnection);
      if(isDebug)console.log(`[/magic/redeem] after getProfile`);

      const isAdmin = !!profile?.isAdmin;

      // payload MUST use 'userId' key to satisfy auth.js middleware
      const payload = { 
        userId: email, 
        isAdmin: isAdmin 
      };

      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      const isProd = process.env.NODE_ENV === 'production';
      if(isDebug)console.log(`[/magic/redeem] isProd=${isProd}`);


      const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
      };

      // Set cookies for Cookie-based Auth
      if(isDebug)console.log(`[/magic/redeem] /magic/redeem creating token`);
      res.cookie('token', accessToken, { 
        ...cookieOptions, 
        maxAge: 15 * 60 * 1000 
      });

      if(isDebug)console.log(`[/magic/redeem] /magic/redeem creating refeshToken`);
      res.cookie('refreshToken', refreshToken, { 
        ...cookieOptions, 
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });

      // 🔍 DEBUG: add a visible, non-httpOnly cookie so we can see
      // res.cookie('debugFromRedeem', 'yes', {          // DEBUG
      //   httpOnly: false,                              // DEBUG
      //   secure: false,                                // DEBUG
      //   sameSite: 'lax',                              // DEBUG
      //   path: '/',                                    // DEBUG
      // });                                             // DEBUG

      // 🔍 DEBUG: log headers that Express is about to send
      if (isDebug) {                                  // DEBUG
        console.log('[/magic/redeem] headers about to send:', res.getHeaders());
      }                                               // DEBUG

      if (isDebug) console.log(`[/magic/redeem] /magic/redeem end`);

      return res.json({ ok: true });
    } catch (err) {
      console.error('magic/redeem error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}