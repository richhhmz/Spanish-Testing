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
import { setSubscriptionInfo, getProfile } from '../tools/UserProfile.js';
import { handleStripeWebhook } from '../tools/StripeWebhook.js';
import { getStripeSubscriptionPayments } from '../tools/Stripe.js';
import {
  getPartnerPayments,
  getPartnerPaidStatusAndBalance,
  getPartnersListForAdmin,
  payPartner,
  getPartnerCounts,
} from '../tools/Partner.js';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const createStripeRouter = (appDBConnection, partnerDBConnection, profilesDBConnection) => {
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

  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));

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

        // If we already have a Stripe customer, verify it actually belongs
        // to this user before reusing it.
        if (stripeCustomerId) {
          try {
            const existingCustomer = await stripe.customers.retrieve(stripeCustomerId);

            const metadataUserId = existingCustomer?.metadata?.userId;
            const email = existingCustomer?.email;

            const belongsToThisUser =
              metadataUserId === userId || email === userId;

            if (!belongsToThisUser) {
              console.warn(
                '[/create-checkout-session] Stripe customer mismatch. ' +
                `profile userId=${userId}, stripeCustomerId=${stripeCustomerId}, ` +
                `metadata.userId=${metadataUserId}, email=${email}`
              );

              // Do not reuse a customer that appears to belong to someone else.
              stripeCustomerId = null;
            }
          } catch (err) {
            console.warn(
              '[/create-checkout-session] Failed to retrieve existing Stripe customer:',
              stripeCustomerId,
              err.message
            );

            // If Stripe customer is invalid/deleted/etc, create a new one.
            stripeCustomerId = null;
          }
        }

        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: userId,              // assuming userId is the user's email
            metadata: { userId },
          });

          stripeCustomerId = customer.id;

          await setSubscriptionInfo(userId, profilesDBConnection, {
            stripeCustomerId,
          });

          if (isDebug) {
            console.log(
              `[/create-checkout-session] Created Stripe customer ${stripeCustomerId} for ${userId}`
            );
          }
        }

        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          customer: stripeCustomerId,
          client_reference_id: userId,
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

  /*
   * /api/stripe/stripe-subscription-payments
   */
  router.get('/stripe-subscription-payments', requireAuth, async (req, res) => {
    try {
      if (isDebug) console.log('[/api/billing/stripe-subscription-payments] begin');
      const data = await getStripeSubscriptionPayments();

      if (isDebug) console.log('[/api/billing/stripe-subscription-payments] end');
      return res.status(200).json({
        status: 200,
        count: data.length,
        data,
      });
    } catch (err) {
      console.error('❌ subscription-payments-report failed:', err);

      return res.status(500).json({
        status: 500,
        error: 'Failed to load subscription payments report',
      });
    }
  });

  /*
   * /api/stripe/partner-payments
   */
  router.get(
    '/partner-payments',
    requireAuth,
    effectiveUserMiddleware,
    async (req, res) => {
      try {
        if (isDebug) console.log('[/partner-payments] begin');
        if (isDebug) console.log('req.originalUrl=', req.originalUrl);
        if (isDebug) console.log('req.query=', req.query);

        const { month, partnerUserId: requestedPartnerUserId } =
          req.query || {};

        if (!month) {
          return res.status(400).json({
            status: 400,
            error: 'month is required',
          });
        }

        if(isDebug)console.log('req.effectiveUserId=', req.effectiveUserId);
        if(isDebug)console.log('req.effectiveUserIsAdmin=', req.effectiveUserIsAdmin);
        if (requestedPartnerUserId && !req.effectiveUserIsAdmin) {
          return res.status(403).json({
            status: 403,
            error: 'Not authorized to view another partner report',
          });
        }

        const userId =
          requestedPartnerUserId || req.effectiveUserId;

        const profileModel =
          profilesDBConnection.models.Profile ||
          profilesDBConnection.model('Profile', ProfileSchema);

        const profile = await profileModel.findOne({ userId });

        if (!profile) {
          return res.status(404).json({
            status: 404,
            error: 'Partner profile not found',
          });
        }

        const data = await getPartnerPayments(
          profile,
          month,
          appDBConnection,
          partnerDBConnection,
          profilesDBConnection
        );

        if (isDebug) console.log('[/partner-payments] end');

        return res.status(200).json({
          status: 200,
          count: data.length,
          data,
        });
      } catch (err) {
        console.error('❌ get partner payments failed:', err);

        return res.status(500).json({
          status: 500,
          error: 'Failed to get partner payments',
        });
      }
    }
  );

  /*
   * /api/stripe/partner-outstanding-balance
   */
  router.get(
    '/partner-outstanding-balance',
    requireAuth,
    effectiveUserMiddleware,
    async (req, res) => {
      try {
        if (isDebug) {
          console.log('[/partner-outstanding-balance] begin');
        }

        const userId = req.effectiveUserId;

        const data = await getPartnerPaidStatusAndBalance(
          userId,
          appDBConnection,
          partnerDBConnection,
          profilesDBConnection
        );

        if (isDebug) {
          console.log('[/partner-outstanding-balance] end');
        }

        return res.status(200).json({
          status: 200,
          data,
        });
      } catch (err) {
        console.error(
          '❌ get partner outstanding balance failed:',
          err
        );

        return res.status(500).json({
          status: 500,
          error: 'Failed to get partner outstanding balance',
        });
      }
    }
  );

  /*
   * /api/stripe/partners-list
   */
  router.get(
  '/partners-list',
  requireAuth,
  effectiveUserMiddleware,
  async (req, res) => {
    try {
      if (isDebug) {
        console.log('[/partners-list] begin');
      }

      const data = await getPartnersListForAdmin(
        appDBConnection,
        partnerDBConnection,
        profilesDBConnection
      );

      if (isDebug) {
        console.log('[/partners-list] end');
      }

      return res.status(200).json({
        status: 200,
        count: data.length,
        data,
      });
      } catch (err) {
        console.error('❌ get partners list failed:', err);

        return res.status(500).json({
          status: 500,
          error: 'Failed to get partners list',
        });
      }
    }
  );

  /*
   * /api/stripe/pay-partner
   */
  router.post(
    '/pay-partner',
    requireAuth,
    effectiveUserMiddleware,
    async (req, res) => {
      try {
        if (isDebug) {
          console.log('[/pay-partner] begin');
        }

        const { partnerUserId, amountInCents } = req.body || {};

        if (!partnerUserId) {
          return res.status(400).json({
            status: 400,
            error: 'partnerUserId is required',
          });
        }

        if (
          amountInCents === undefined ||
          amountInCents === null ||
          Number.isNaN(Number(amountInCents))
        ) {
          return res.status(400).json({
            status: 400,
            error: 'amountInCents is required',
          });
        }

        const profileModel =
          profilesDBConnection.models.Profile ||
          profilesDBConnection.model('Profile', ProfileSchema);

        const partnerProfile = await profileModel.findOne({
          userId: partnerUserId,
        });

        if (!partnerProfile) {
          return res.status(404).json({
            status: 404,
            error: 'Partner profile not found',
          });
        }

        const amount = await payPartner(
          partnerProfile,
          partnerDBConnection,
          Number(amountInCents)
        );

        if (isDebug) {
          console.log('[/pay-partner] end');
        }

        return res.status(200).json({
          status: 200,
          amount,
        });
      } catch (err) {
        console.error('❌ pay partner failed:', err);

        return res.status(500).json({
          status: 500,
          error: 'Failed to pay partner',
        });
      }
    }
  );

  /*
   * /api/stripe/partner-counts
   */
  router.get(
    '/partner-counts',
    requireAuth,
    effectiveUserMiddleware,
    async (req, res) => {
      try {
        const profilesDB = req.app.locals.profilesDB;

        let userId = req.effectiveUserId;

        // Admin may request counts for a specific partner
        if (
          req.query.partnerUserId &&
          req.effectiveUserIsAdmin
        ) {
          userId = req.query.partnerUserId;
        }

        const partnerProfile = await getProfile(
          userId,
          profilesDB
        );

        if (!partnerProfile) {
          return res.status(404).json({
            error: 'Partner profile not found',
          });
        }

        const counts = await getPartnerCounts(
          partnerProfile.partnerName,
          profilesDB
        );

        res.json(counts);
      } catch (err) {
        console.error(
          '[GET /partner-counts] error:',
          err
        );
        res.status(500).json({
          error: err.message,
        });
      }
    }
  );

  return router;
};

export default createStripeRouter;