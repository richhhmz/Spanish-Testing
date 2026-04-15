// backend/routes/StripeRoutes.js

import express from 'express';
import Stripe from 'stripe';

import {
  STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID,
  FRONTEND_ORIGIN,
  isDebug,
} from '../config.js';

import { requireAuth } from '../middleware/auth.js';
import effectiveUserMiddleware from '../middleware/EffectiveUser.js';
import { ProfileSchema } from '../models/ProfileModel.js';
import { setSubscriptionInfo } from '../tools/UserProfile.js';
import { getStripePayments } from '../tools/Stripe.js';
import { handleStripeWebhook } from '../tools/StripeWebhook.js';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const createStripeRouter = (profilesDBConnection) => {
  const router = express.Router();

  /* ----------------------------- WEBHOOK -----------------------------
   * IMPORTANT:
   * This route must receive the raw request body for Stripe signature verification.
   *
   * POST /api/stripe/webhook
   */
  router.post('/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      try {
        if (isDebug) console.log('[/api/stripe/webhook] begin');

        return await handleStripeWebhook(req, res, {
          profilesDBConnection,
          stripe,
        });
      } catch (err) {
        console.error('[StripeRoutes /webhook] Unexpected error:', err);
        return res.status(500).json({
          error: 'Stripe webhook handling failed.',
        });
      }
    }
  );

  /* ------------------------- CREATE CHECKOUT SESSION -------------------------
   * POST /api/stripe/create-checkout-session
   */
  router.post('/create-checkout-session',
    requireAuth,
    effectiveUserMiddleware,
    async (req, res) => {
      if (isDebug) console.log('[/create-checkout-session] begin');

      try {
        const userId = req.effectiveUserId;

        const profileModel =
          profilesDBConnection.models.Profile ||
          profilesDBConnection.model('Profile', ProfileSchema);

        let profile = await profileModel.findOne({ userId });

        if (!profile) {
          profile = await profileModel.create({ userId });
        }

        let stripeCustomerId = profile.subscription?.stripeCustomerId;

        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            metadata: { userId },
          });

          stripeCustomerId = customer.id;

          await setSubscriptionInfo(userId, profilesDBConnection, {
            stripeCustomerId,
          });
        }

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: stripeCustomerId,
          line_items: [
            {
              price: STRIPE_PRICE_ID,
              quantity: 1,
            },
          ],
          success_url: `${FRONTEND_ORIGIN}/?billing=success`,
          cancel_url: `${FRONTEND_ORIGIN}/?billing=cancelled`,
        });

        return res.json({ url: session.url });
      } catch (err) {
        console.error('[/create-checkout-session] Error:', err);
        return res.status(500).json({
          error: 'Failed to create checkout session',
        });
      }
    }
  );

  /* ----------------------------- CUSTOMER PORTAL -----------------------------
   * POST /api/stripe/customer-portal
   */
  router.post('/customer-portal',
    requireAuth,
    effectiveUserMiddleware,
    async (req, res) => {
      if (isDebug) console.log('[/customer-portal] begin');

      try {
        const userId = req.effectiveUserId;

        const profileModel =
          profilesDBConnection.models.Profile ||
          profilesDBConnection.model('Profile', ProfileSchema);

        const profile = await profileModel.findOne({ userId });
        const stripeCustomerId = profile?.subscription?.stripeCustomerId;

        if (!stripeCustomerId) {
          return res.status(400).json({
            error: 'No Stripe customer found for this user.',
          });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${FRONTEND_ORIGIN}/`,
        });

        return res.json({ url: portalSession.url });
      } catch (err) {
        console.error('[/customer-portal] Error:', {
          message: err.message,
          type: err.type,
          code: err.code,
          raw: err.raw,
        });

        return res.status(500).json({
          error: 'Failed to create customer portal',
        });
      }
    }
  );

  /* ----------------------------- BACKFILL / SYNC -----------------------------
   * GET /api/stripe/get-stripe-payments
   */
  router.get('/get-stripe-payments', requireAuth, async (req, res) => {
    if (isDebug) console.log('[/get-stripe-payments] Starting Stripe backfill...');

    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin only',
        });
      }

      if (isDebug) console.log('[/get-stripe-payments] getStripePayments');
      const result = await getStripePayments();
      if (isDebug) console.log('[/get-stripe-payments] getStripePayments completed:', result);

      return res.json({
        success: true,
        message: 'Stripe payments sync completed.',
        ...result,
      });
    } catch (err) {
      console.error('[/get-stripe-payments] getStripePayments failed:', err);

      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to sync Stripe payments.',
      });
    }
  });

  return router;
};

export default createStripeRouter;