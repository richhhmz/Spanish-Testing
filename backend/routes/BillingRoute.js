// backend/routes/BillingRoute.js

import express, { json } from 'express';
import Stripe from 'stripe';

import {
  STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID,
  FRONTEND_ORIGIN,
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
      console.log('🔔 Stripe webhook received');

      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );

        console.log('✅ Stripe event type:', event.type);
      } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        const profileModel = profilesDBConnection.model(
          'Profile',
          ProfileSchema
        );

        switch (event.type) {

          /* ─────────────────────────
             Checkout completed
          ───────────────────────── */
          case 'checkout.session.completed': {
            const session = event.data.object;

            console.log('💰 checkout.session.completed fired');
            console.log('🧾 session.mode:', session.mode);

            if (session.mode !== 'subscription') {
              console.log('ℹ️ Ignored — not subscription mode');
              break;
            }

            const stripeCustomerId = session.customer;
            const stripeSubscriptionId = session.subscription;

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

            console.log('✅ Subscription activated for:', profile.userId);
            break;
          }

          /* ─────────────────────────
             Subscription updated
          ───────────────────────── */
          case 'customer.subscription.updated':
          case 'customer.subscription.created':
          case 'customer.subscription.deleted': {

            const sub = event.data.object;
            const stripeCustomerId = sub.customer;

            console.log('🔄 Subscription change:', sub.status);

            const profile = await profileModel.findOne({
              'subscription.stripeCustomerId': stripeCustomerId,
            });

            if (!profile) {
              console.warn('⚠️ No profile found for Stripe customer:', stripeCustomerId);
              break;
            }

            await setSubscriptionInfo(profile.userId, profilesDBConnection, {
              status: sub.status,
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null,
            });

            console.log('✅ Subscription updated for:', profile.userId);
            break;
          }

          /* ─────────────────────────
             Ignore other events
          ───────────────────────── */
          default:
            console.log('ℹ️ Ignored Stripe event:', event.type);
        }

        res.json({ received: true });

      } catch (err) {
        console.error('❌ Error processing webhook:', err);
        res.status(500).send('Webhook handler error');
      }
    }
  );

/* ───────────────────────────── CREATE CHECKOUT SESSION ───────────────────────────── */

  router.post(
    '/create-checkout-session',
    requireAuth,
    effectiveUserMiddleware,
    async (req, res) => {
      console.log('✅ HIT create-checkout-session', req.path);
      try {
        const userId = req.effectiveUserId;
        console.log("before profile");
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

          console.log("before setSubscriptionInfo");

          await setSubscriptionInfo(userId, profilesDBConnection, {
            stripeCustomerId,
          });
        }

          console.log("before stripe.checkout.sessions.create");

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

        console.log("before return");

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
          return_url: `${FRONTEND_ORIGIN}/`,
        });

        return res.json({ url: portalSession.url });
      } catch (err) {
        console.error('❌ Error creating customer portal session:', {
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

  return router;
};

export default createBillingRouter;
