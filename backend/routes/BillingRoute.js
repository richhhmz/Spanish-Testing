// backend/routes/BillingRoute.js
import express from 'express';
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

  // Helper for model registration
  const getProfileModel = () => 
    profilesDBConnection.models.Profile || profilesDBConnection.model('Profile', ProfileSchema);

  /* ───────────────────────────── WEBHOOK ───────────────────────────── */
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
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        const profileModel = getProfileModel();

        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object;
            if (session.mode !== 'subscription') break;

            const stripeCustomerId = session.customer;
            const stripeSubscriptionId = session.subscription;

            const profile = await profileModel.findOne({
              'subscription.stripeCustomerId': stripeCustomerId,
            });

            if (profile) {
              await setSubscriptionInfo(profile.userId, profilesDBConnection, {
                status: 'active',
                stripeSubscriptionId,
              });
            }
            break;
          }

          case 'customer.subscription.updated':
          case 'customer.subscription.deleted': {
            const sub = event.data.object;
            const profile = await profileModel.findOne({
              'subscription.stripeCustomerId': sub.customer,
            });

            if (profile) {
              await setSubscriptionInfo(profile.userId, profilesDBConnection, {
                status: sub.status,
                stripeSubscriptionId: sub.id,
                currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
              });
            }
            break;
          }
        }
        res.json({ received: true });
      } catch (err) {
        console.error('❌ Webhook handler error:', err);
        res.status(500).send('Internal Error');
      }
    }
  );

  /* ───────────────────────────── SESSIONS ───────────────────────────── */

  router.post('/create-checkout-session', requireAuth, effectiveUserMiddleware, async (req, res) => {
    try {
      const userId = req.effectiveUserId;
      const profileModel = getProfileModel();

      let profile = await profileModel.findOne({ userId });
      if (!profile) profile = await profileModel.create({ userId });

      let stripeCustomerId = profile.subscription?.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({ metadata: { userId } });
        stripeCustomerId = customer.id;
        await setSubscriptionInfo(userId, profilesDBConnection, { stripeCustomerId });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        success_url: `${FRONTEND_ORIGIN}/?billing=success`,
        cancel_url: `${FRONTEND_ORIGIN}/?billing=cancelled`,
      });

      return res.json({ url: session.url });
    } catch (err) {
      console.error('❌ Checkout error:', err);
      return res.status(500).json({ error: 'Failed to create session' });
    }
  });

  router.post('/customer-portal', requireAuth, effectiveUserMiddleware, async (req, res) => {
    try {
      const userId = req.effectiveUserId;
      const profileModel = getProfileModel();
      const profile = await profileModel.findOne({ userId });

      const stripeCustomerId = profile?.subscription?.stripeCustomerId;
      if (!stripeCustomerId) {
        return res.status(400).json({ error: 'No Stripe customer found.' });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${FRONTEND_ORIGIN}/`,
      });

      return res.json({ url: portalSession.url });
    } catch (err) {
      console.error('❌ Portal error:', err);
      return res.status(500).json({ error: 'Failed to create portal' });
    }
  });

  return router;
};

export default createBillingRouter;