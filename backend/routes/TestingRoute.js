import express from 'express';
import { getProfile, updateProfile, profileCount } from '../tools/UserProfile.js';
import { getAllSpanishWords, updateWord } from '../tools/Words.js';
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
import { isDebug } from '../config.js';

if(isDebug)console.log('📦 [chat]TestingRoute loaded');

const createTestsRouter = (
  profilesDBConnection,
  spanishWordsDBConnection,
  spanishTestsDBConnection
) => {
  const router = express.Router();

  /* ───────────────────────── Helpers ───────────────────────── */

  const requireUserId = (req, res) => {
    if (!req.user?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    }
    return req.effectiveUserId || req.user.userId;
  };

  /* ───────────────────────── Spanish routes ───────────────────────── */

  router.get('/api/spanish/allSpanishTests', requireAuth, effectiveUserMiddleware, async (req, res) => {
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

  router.get('/api/spanish/allSpanishWords', requireAuth, async (_req, res) => {
    try {
      const words = await getAllSpanishWords(spanishWordsDBConnection);
      res.status(200).json({ data: words });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  router.get('/api/spanish/getTest/:word', requireAuth, effectiveUserMiddleware,
    async (req, res) => {
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

  router.put('/api/spanish/updateTest/:word', requireAuth, effectiveUserMiddleware, async (req, res) => {
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

  router.put('/api/spanish/updateWord/:word', requireAuth, effectiveUserMiddleware,
    async (req, res) => {
    try {
      // if(isDebug)console.log(`req.body=${JSON.stringify(req.body, 2, null)}`);
      const userId = req.effectiveUserId;
      if (!userId) return;

      const { word } = req.params;

      const test = await updateWord(
        word,
        spanishWordsDBConnection,
        req.body
      );

      res.status(200).json({ data: test });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  router.get('/api/spanish/todaysSpanishTests', requireAuth, effectiveUserMiddleware,
    async (req, res) => {
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

  router.get('/api/spanish/getProfile', requireAuth, effectiveUserMiddleware,
    async (req, res) => {
      const userId = req.effectiveUserId;
      const profile = await getProfile(userId, profilesDBConnection);
      res.json({ data: profile });
    }
  );

  router.put('/api/spanish/updateProfile', requireAuth, effectiveUserMiddleware,
    async (req, res) => {
      try {
        const userId = req.effectiveUserId;

        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await updateProfile(
          userId,
          profilesDBConnection,
          req.body
        );

        res.status(result.status).json(result);
      } catch (err) {
        console.error('❌ updateProfile failed:', err);
        res.status(500).json({ error: 'Profile update failed' });
      }
    }
  );

  /* ───────────────────────── Admin routes ───────────────────────── */

  router.post('/admin/impersonate', requireAuth, async (req, res) => {
    try {
      const adminUserId = requireUserId(req, res);
      if (!adminUserId) return;

      const { targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ error: 'targetUserId required' });
      }

      const adminProfile = await getProfile(
        adminUserId,
        profilesDBConnection
      );

      if (!adminProfile.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      await updateProfile(adminUserId, profilesDBConnection, {
        impersonation: {
          active: true,
          targetUserId,
          startedAt: new Date()
        }
      });

      res.status(200).json({
        message: `Now impersonating ${targetUserId}`,
        effectiveUserId: targetUserId
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  router.post('/admin/reset-impersonation', requireAuth, async (req, res) => {
    const { userId, isAdmin } = req.user;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const profile = await getProfile(userId, profilesDBConnection);

    if (!profile.impersonation?.active) {
      return res.status(400).json({ error: 'Not impersonating' });
    }

    await updateProfile(userId, profilesDBConnection, {
      impersonation: {
        active: false,
        targetUserId: null,
        startedAt: null
      }
    });

    res.json({ message: 'Impersonation reset' });
  });

  router.get('/auth/effective-user', requireAuth, async (req, res) => {
    if (isDebug) console.log('➡️ [route] GET /api/auth/effective-user');
    if (isDebug) console.log('[route] req.user =', req.user);

    try {
      const realUserId = req.user.userId;

      const profile = await getProfile(realUserId, profilesDBConnection);

      let effectiveUserId = realUserId;
      if (profile.impersonation?.active) {
        effectiveUserId = profile.impersonation.targetUserId;
      }

      const response = {
        realUserId,
        effectiveUserId,
        isAdmin: req.user.isAdmin,
        impersonating: !!profile.impersonation?.active
      };

      if (isDebug) console.log('📤 [route] effective-user response:', response);

      res.json(response);

      if (isDebug) console.log('✅ [route] /api/auth/effective-user sent');
    } catch (err) {
      console.log('❌ [route] /api/auth/effective-user error:', err);
      res.status(500).json({ error: 'Failed to resolve effective user' });
    }
  });

  router.post('/auth/refresh', async (req, res) => {
    try {
      if(isDebug)console.log("/auth/refresh");
      if(isDebug)console.log('/auth/refresh cookies:', req.cookies);
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        if(isDebug)console.log("/auth/refresh is returning 401, No refresh token");
        return res.status(401).json({ error: 'No refresh token' });
      }

      if(isDebug)console.log("Verify refreshToken");
      // Verify refresh token
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );
    if (isDebug) {
      console.log('✅ [auth] refresh - Refresh verified:', payload);
      console.log('[auth] Issued at:', new Date(payload.iat * 1000).toISOString());
      console.log('[auth] Expires at:', new Date(payload.exp * 1000).toISOString());
      console.log('[auth] Current time:', new Date().toISOString());
    }

      // Issue new access token
      const newAccessToken = jwt.sign(
        {
          userId: payload.userId,
          isAdmin: payload.isAdmin,
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.json({ accessToken: newAccessToken });
    } catch (err) {
      if(isDebug)console.log("/auth/refresh returning 401 Refresh token expired or invalid");
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }
  });

  router.post('/auth/login', async (req, res) => {
    console.log("/auth/login");
    const { userId } = req.body;

    // TODO: validate userId properly
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const profile = await getProfile(userId, profilesDBConnection);

    const accessToken = jwt.sign(
      { userId, isAdmin: profile.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, isAdmin: profile.isAdmin },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    if (isDebug) {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      console.log('✅ [auth] login - refresh decoded:', decoded);
      console.log('[auth] Issued at:', new Date(decoded.iat * 1000).toISOString());
      console.log('[auth] Expires at:', new Date(decoded.exp * 1000).toISOString());
      console.log('[auth] Current time:', new Date().toISOString());
    }

    // 🍪 Store refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // true in production (HTTPS)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ⬅️ Send ONLY access token to React
    res.json({ token: accessToken });
  });


  /* ───────────────────────── Utilities ───────────────────────── */

  router.get('/ping', async (_req, res) => {
    const count = await profileCount(profilesDBConnection);
    res.status(200).json({ data: `pong: profiles=${count}`});
  });

  router.get('/resetCache', (_req, res) => {
    resetCache();
    res.status(200).json({ data: 'Cache was reset.' });
  });

  router.post('/backlog', (req, res) => {
    const { message, context } = req.body;

    const timestamp = new Date().toISOString();
    console.log(
      `[BackLog ${timestamp}]`,
      context ? `[${context}]` : '',
      message
    );

    res.status(200).json({ ok: true });
  });


  return router;
};

export default createTestsRouter;
