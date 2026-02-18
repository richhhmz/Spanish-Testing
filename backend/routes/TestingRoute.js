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
import MagicLink from '../models/MagicLink.js';
import { sendMagicLinkEmail } from '../tools/email.js';
import { isDebug } from '../config.js';

const createTestsRouter = (
  profilesDBConnection,
  spanishWordsDBConnection,
  spanishTestsDBConnection,
  appDBConnection
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

  // Simple admin guard for admin-only routes
  const requireAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }
    next();
  };

  /* ───────────────────────── Spanish routes ───────────────────────── */

  router.get('/magic/test-email', async (req, res) => {
    try {
      console.log('[test-email] hit');

      const hasKey = !!process.env.SENDGRID_API_KEY;
      const from = process.env.EMAIL_FROM;
      const origin = process.env.FRONTEND_ORIGIN;

      console.log('[test-email] env', {
        hasSendgridKey: hasKey,
        emailFrom: from,
        appOrigin: origin,
      });

      await sendMagicLinkEmail({
        to: 'richhhmz@gmail.com',
        linkUrl: `${origin}/magic?token=test`,
      });

      console.log('[test-email] sent ok');
      res.json({ ok: true });
    } catch (err) {
      console.error('[test-email] failed', err?.response?.body || err);

      res.status(500).json({
        ok: false,
        error: err?.message || 'send failed',
        sendgrid: err?.response?.body || null,
      });
    }
  });

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

  router.get('/api/messageList', requireAuth, async (_req, res) => {
    try {
      const messages = await getMessages(appDBConnection);
      res.status(200).json({ data: messages });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });

  router.post('/api/addMessage', requireAuth, async (req, res) => {
    try {
      const savedMessage = await addMessage(
        appDBConnection,
        req.body
      );

      res.status(201).json({
        data: savedMessage,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  });
  router.post('/api/deleteMessage', requireAuth, async (req, res) => {
    try {
      const { messageId } = req.body;

      if (!messageId) {
        return res.status(400).json({
          message: 'messageId is required',
        });
      }

      const deletedMessage = await deleteMessage(
        appDBConnection,
        messageId
      );

      if (!deletedMessage) {
        return res.status(404).json({
          message: 'Message not found',
        });
      }

      res.status(200).json({
        data: deletedMessage,
      });
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

  // Admin: set subscription info for a user
  router.post('/admin/set-subscription', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { targetUserId, status, plan } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ error: 'targetUserId is required' });
      }
      if (!status) {
        return res.status(400).json({ error: 'status is required' });
      }

      const subscriptionUpdates = { status };
      if (plan) subscriptionUpdates.plan = plan;

      const updatedProfile = await setSubscriptionInfo(
        targetUserId,
        profilesDBConnection,
        subscriptionUpdates
      );

      if (!updatedProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ ok: true, subscription: updatedProfile.subscription });
    } catch (err) {
      console.error('Error in /admin/set-subscription:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/auth/effective-user', requireAuth, async (req, res) => {
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

      res.json(response);
    } catch (err) {
      res.status(500).json({ error: 'Failed to resolve effective user' });
    }
  });

  router.post('/auth/refresh', async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' });
      }
      // Verify refresh token
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );

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
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }
  });

  router.post('/auth/login', async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      const profile = await getProfile(userId, profilesDBConnection);

      if (!profile) {
        return res.status(401).json({ error: 'Invalid userId' });
      }

      // ✅ Create a one-time login-attempt token (10 minutes)
      const loginAttemptToken = crypto.randomBytes(32).toString('hex');

      await LoginAttempt.create({
        userId,
        token: loginAttemptToken,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      // ✅ JWT access/refresh tokens
      const accessToken = jwt.sign(
        { userId, isAdmin: !!profile.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { userId, isAdmin: !!profile.isAdmin },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // 🍪 Store refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // ⬅️ Send access token (+ loginAttemptToken if you actually use it)
      res.json({ token: accessToken, loginAttemptToken });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error during login' });
    }
  });

  router.get('/auth/email-confirm/:token', async (req, res) => {
    const attempt = await LoginAttempt.findOne({
      token: req.params.token,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (!attempt) {
      return res.redirect('/login?error=expired');
    }

    attempt.status = 'approved';
    await attempt.save();

    const jwtToken = generateJWT(attempt.userId);

    res.cookie('token', jwtToken, { httpOnly: true });
    res.redirect('/');
  });

  router.get('/auth/email-cancel/:token', async (req, res) => {
    const attempt = await LoginAttempt.findOne({ token: req.params.token });

    if (attempt) {
      attempt.status = 'cancelled';
      await attempt.save();
    }

    res.redirect('/login?cancelled=true');
  });


  /* ───────────────────────── Utilities ───────────────────────── */

  router.get('/ping', requireAuth, async (_req, res) => {
    const count = await profileCount(profilesDBConnection);
    res.status(200).json({ data: `pong: profiles=${count}` });
  });

  router.get('/resetCache', requireAuth, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    resetCache();
    res.status(200).json({ data: 'Cache was reset.' });
  });

  router.post('/backlog', requireAuth, (req, res) => {
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
