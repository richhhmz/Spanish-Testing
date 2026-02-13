// backend/routes/BillingRoute.js

import express from 'express';
import Stripe from 'stripe';

import {
  STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID,
  FRONTEND_BASE_URL,
} from '../config.js';

import { requireAuth } from '../middleware/auth.js';
import effectiveUserMiddleware from '../middleware/EffectiveUser.js';
import { ProfileSchema } from '../models/ProfileModel.js';
import { setSubscriptionInfo } from '../tools/UserProfile.js';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const createBillingRouter = (profilesDBConnection) => {
  const router = express.Router();

  /* ───────────────────────────── WEBHOOK ─────────────────────────────
   * MUST be mounted before express.json() in index.js
   * POST /api/billing/webhook
   */

  router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const sig = req.headers['stripe-signature'];

      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error('❌ Stripe signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object;

            const stripeCustomerId = session.customer;
            const stripeSubscriptionId = session.subscription;

            const profileModel = profilesDBConnection.model('Profile', ProfileSchema);

            const profile = await profileModel.findOne({
              'subscription.stripeCustomerId': stripeCustomerId,
            });

            if (!profile) {
              console.warn('⚠️ No profile found for Stripe customer:', stripeCustomerId);
              break;
            }

            await setSubscriptionInfo(profile.userId, profilesDBConnection, {
              status: 'active',
              stripeSubscriptionId,
            });

            break;
          }

          case 'customer.subscription.updated':
          case 'customer.subscription.deleted': {
            const sub = event.data.object;

            const stripeCustomerId = sub.customer;
            const stripeSubscriptionId = sub.id;
            const status = sub.status;

            const currentPeriodEnd = sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null;

            const profileModel = profilesDBConnection.model(
              'Profile',
              ProfileSchema
            );

            const profile = await profileModel.findOne({
              'subscription.stripeCustomerId': stripeCustomerId,
            });

            if (!profile) {
              console.warn(
                '⚠️ No profile found for Stripe customer:',
                stripeCustomerId
              );
              break;
            }

            await setSubscriptionInfo(
              profile.userId,
              profilesDBConnection,
              {
                status,
                stripeSubscriptionId,
                currentPeriodEnd,
              }
            );

            break;
          }

          default:
            console.log('ℹ️ Ignored Stripe event:', event.type);
        }

        return res.status(200).json({ received: true });
      } catch (err) {
        console.error('❌ Error processing Stripe webhook:', err);
        return res.status(500).send('Webhook handler error');
      }
    }
  );

  /* ───────────────────────────── CREATE CHECKOUT SESSION ───────────────────────────── */

  router.post(
    '/create-checkout-session',
    requireAuth,
    effectiveUserMiddleware,
    async (req, res) => {
      try {
        const userId = req.effectiveUserId;

        const profileModel = profilesDBConnection.model(
          'Profile',
          ProfileSchema
        );

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
          success_url: `${FRONTEND_BASE_URL}/spanish/home?billing=success`,
          cancel_url: `${FRONTEND_BASE_URL}/spanish/home?billing=cancelled`,
        });

        return res.json({ url: session.url });
      } catch (err) {
        console.error('❌ Error creating checkout session:', err);
        return res.status(500).json({
          error: 'Failed to create checkout session',
        });
      }
    }
  );

  /* ───────────────────────────── CUSTOMER PORTAL ───────────────────────────── */

  router.post(
    '/customer-portal',
    requireAuth,
    effectiveUserMiddleware,
    async (req, res) => {
      try {
        const userId = req.effectiveUserId;

        const profileModel = profilesDBConnection.model(
          'Profile',
          ProfileSchema
        );

        const profile = await profileModel.findOne({ userId });

        const stripeCustomerId = profile?.subscription?.stripeCustomerId;

        if (!stripeCustomerId) {
          return res.status(400).json({
            error: 'No Stripe customer found for this user.',
          });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
          customer: stripeCustomerId,
          return_url: `${FRONTEND_BASE_URL}/spanish/home`,
        });

        return res.json({ url: portalSession.url });
      } catch (err) {
        console.error('❌ Error creating customer portal session:', err);
        return res.status(500).json({
          error: 'Failed to create customer portal',
        });
      }
    }
  );

  return router;
};

export default createBillingRouter;
