// backend/routes/TestingRoute.js
import express from 'express';
import {
  getProfile,
  updateProfile,
  profileCount,
  setSubscriptionInfo,
} from '../tools/UserProfile.js';
import { getAllSpanishWords, updateWord } from '../tools/Words.js';
import { getMessages, addMessage, deleteMessage } from '../tools/Messages.js';
import {
  getTest,
  getTodaysSpanishTests,
  updateTest,
  getAllSpanishWordTests
} from '../tools/Tests.js';
import { resetCache } from '../tools/cache.js';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';
import effectiveUserMiddleware from '../middleware/EffectiveUser.js';
import crypto from 'crypto';
import LoginAttempt from '../models/LoginAttempt.js';
import { sendMagicLinkEmail } from '../tools/email.js';
import { isDebug } from '../config.js';

const createTestsRouter = (
  profilesDBConnection,
  spanishWordsDBConnection,
  spanishTestsDBConnection,
  appDBConnection
) => {
  const router = express.Router();

  /* ───────────────────────── Auth/Cookie Helpers ───────────────────────── */

  const isProd = process.env.NODE_ENV === 'production';

  const accessCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  };

  const refreshCookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  // ✅ Initialize the middleware with the connection
  // This allows the middleware to perform the user lookup internally
  const useEffectiveUser = effectiveUserMiddleware(profilesDBConnection);

  const requireRealUserId = (req, res) => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    }
    return req.user.userId;
  };

  const requireAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }
    next();
  };

  /* ───────────────────────── Spanish Routes ───────────────────────── */

  router.get('/api/spanish/allSpanishTests', requireAuth, useEffectiveUser, async (req, res) => {
    try {
      const userId = req.effectiveUserId;
      if (!userId) return;

      const words = await getAllSpanishWords(spanishWordsDBConnection);
      const tests = await getAllSpanishWordTests(
        userId,
        words,
        profilesDBConnection,
        spanishTestsDBConnection
      );

      res.status(200).json({ data: tests });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  router.get('/api/spanish/getTest/:word', requireAuth, useEffectiveUser, async (req, res) => {
    try {
      const userId = req.effectiveUserId;
      if (!userId) return;

      const { word } = req.params;
      const test = await getTest(
        word,
        userId,
        spanishWordsDBConnection,
        spanishTestsDBConnection
      );

      res.status(200).json({ data: test });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  router.put('/api/spanish/updateTest/:word', requireAuth, useEffectiveUser, async (req, res) => {
    try {
      const userId = req.effectiveUserId;
      if (!userId) return;

      const { word } = req.params;
      const test = await updateTest(
        word,
        userId,
        spanishWordsDBConnection,
        spanishTestsDBConnection,
        req.body
      );

      res.status(200).json({ data: test });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  router.get('/api/spanish/todaysSpanishTests', requireAuth, useEffectiveUser, async (req, res) => {
    try {
      const userId = req.effectiveUserId;
      if (!userId) return;

      const tests = await getTodaysSpanishTests(
        userId,
        profilesDBConnection,
        spanishWordsDBConnection,
        spanishTestsDBConnection
      );

      res.status(200).json({ data: tests });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  router.get('/api/spanish/getProfile', requireAuth, useEffectiveUser, async (req, res) => {
    try {
      const userId = req.effectiveUserId;
      const profile = await getProfile(userId, profilesDBConnection);
      res.json({ data: profile });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  router.put('/api/spanish/updateProfile', requireAuth, useEffectiveUser, async (req, res) => {
    try {
      const userId = req.effectiveUserId;
      const result = await updateProfile(userId, profilesDBConnection, req.body);
      res.status(result.status).json(result);
    } catch (err) {
      console.error('❌ updateProfile failed:', err);
      res.status(500).json({ error: 'Profile update failed' });
    }
  });

  /* ───────────────────────── Admin Routes ───────────────────────── */

  router.post('/admin/impersonate', requireAuth, async (req, res) => {
    try {
      const adminUserId = requireRealUserId(req, res);
      if (!adminUserId) return;

      const { targetUserId } = req.body;
      const adminProfile = await getProfile(adminUserId, profilesDBConnection);

      if (!adminProfile?.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await updateProfile(adminUserId, profilesDBConnection, {
        impersonation: {
          active: true,
          targetUserId,
          startedAt: new Date()
        }
      });

      res.status(200).json({ message: `Now impersonating ${targetUserId}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  /* ───────────────────────── Auth/Token Routes ───────────────────────── */

  router.post('/auth/refresh', async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) return res.status(401).json({ error: 'Missing token' });

      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      const accessToken = jwt.sign(
        { userId: payload.userId, isAdmin: !!payload.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      res.cookie('token', accessToken, accessCookieOptions);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  });

  router.get('/auth/effective-user', requireAuth, async (req, res) => {
    try {
      const realUserId = req.user.userId;
      const profile = await getProfile(realUserId, profilesDBConnection);
      if (!profile) return res.status(404).json({ error: 'Profile not found' });

      const impersonation = profile.impersonation || {};
      const effectiveUserId = impersonation.active ? impersonation.targetUserId : realUserId;

      return res.json({
        realUserId,
        effectiveUserId,
        isAdmin: req.user.isAdmin,
        impersonating: !!impersonation.active,
      });
    } catch (err) {
      console.error('effective-user error:', err);
      return res.status(500).json({ error: 'Failed to resolve user' });
    }
  });

  /* ───────────────────────── Other Routes ───────────────────────── */

  router.get('/api/spanish/allSpanishWords', requireAuth, async (_req, res) => {
    try {
      const words = await getAllSpanishWords(spanishWordsDBConnection);
      res.status(200).json({ data: words });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  router.get('/ping', requireAuth, async (_req, res) => {
    const count = await profileCount(profilesDBConnection);
    res.status(200).json({ data: `pong: profiles=${count}` });
  });

  return router;
};

export default createTestsRouter;