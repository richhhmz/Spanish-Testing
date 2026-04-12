// backend/tools/StripeWebhook.js

import mongoose from 'mongoose';
import Stripe from 'stripe';
import { appDBURL, isDebug } from '../config.js';
import { StripeSchema } from '../models/StripeDataModel.js';
import { ProfileSchema } from '../models/ProfileModel.js';
import { insertStripeInvoices } from './StripeUtil.js';
import { setSubscriptionInfo } from './UserProfile.js';

let appConnection;
let StripeModel;
let fallbackStripeClient;
let indexesEnsured = false;

function getAppConnection() {
  if (appConnection) return appConnection;

  appConnection = mongoose.createConnection(appDBURL, {
    autoIndex: true,
  });

  StripeModel =
    appConnection.models.Stripe ||
    appConnection.model('Stripe', StripeSchema, 'stripe_payments');

  return appConnection;
}

function getStripeModel() {
  const conn = getAppConnection();

  if (!StripeModel) {
    StripeModel =
      conn.models.Stripe ||
      conn.model('Stripe', StripeSchema, 'stripe_payments');
  }

  return StripeModel;
}

function getFallbackStripeClient() {
  if (fallbackStripeClient) return fallbackStripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined.');
  }

  fallbackStripeClient = new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });

  return fallbackStripeClient;
}

async function ensureStripeIndexes() {
  if (indexesEnsured) return;

  const stripeModel = getStripeModel();
  await stripeModel.createIndexes();
  indexesEnsured = true;
}

export async function handleStripeWebhook(req, res, options = {}) {
  if (isDebug) console.log('[handleStripeWebhook] begin');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[StripeWebhook] STRIPE_WEBHOOK_SECRET is not defined.');
    return res.status(500).send('Webhook secret is not configured.');
  }

  const signature = req.headers['stripe-signature'];

  if (!signature) {
    if (isDebug) {
      console.warn('[StripeWebhook] Missing stripe-signature header.');
    }
    return res.status(400).send('Missing stripe-signature header.');
  }

  const stripe = options.stripe || getFallbackStripeClient();
  const profilesDBConnection = options.profilesDBConnection;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('[StripeWebhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (isDebug) {
    console.log(
      `[StripeWebhook] received event type=${event.type} id=${event.id}`
    );
  }

  try {
    const conn = getAppConnection();
    if (conn.readyState !== 1) {
      await conn.asPromise();
    }

    await ensureStripeIndexes();

    const stripeModel = getStripeModel();

    let profileModel = null;
    if (profilesDBConnection) {
      profileModel =
        profilesDBConnection.models.Profile ||
        profilesDBConnection.model('Profile', ProfileSchema);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        if (!profilesDBConnection || !profileModel) {
          if (isDebug) {
            console.warn(
              '[StripeWebhook] profilesDBConnection not provided; skipping checkout.session.completed profile update.'
            );
          }
          break;
        }

        const session = event.data.object;

        if (isDebug) {
          console.log('[StripeWebhook] checkout.session.completed fired');
          console.log('[StripeWebhook] session.mode:', session.mode);
        }

        if (session.mode !== 'subscription') {
          if (isDebug) {
            console.log('[StripeWebhook] Ignored checkout session: not subscription mode');
          }
          break;
        }

        const stripeCustomerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id;

        const stripeSubscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;

        const profile = await profileModel.findOne({
          'subscription.stripeCustomerId': stripeCustomerId,
        });

        if (!profile) {
          console.warn(
            '[StripeWebhook] No profile found for Stripe customer:',
            stripeCustomerId
          );
          break;
        }

        await setSubscriptionInfo(profile.userId, profilesDBConnection, {
          status: 'active',
          stripeSubscriptionId,
        });

        if (isDebug) {
          console.log('[StripeWebhook] Subscription activated for:', profile.userId);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        if (!profilesDBConnection || !profileModel) {
          if (isDebug) {
            console.warn(
              '[StripeWebhook] profilesDBConnection not provided; skipping subscription profile update.'
            );
          }
          break;
        }

        const sub = event.data.object;
        const stripeCustomerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;

        if (isDebug) {
          console.log('[StripeWebhook] Subscription change:', sub.status);
          console.log('[StripeWebhook] sub.id:', sub.id);
          console.log('[StripeWebhook] sub.current_period_end:', sub.current_period_end);
          console.log(
            '[StripeWebhook] sub.items?.data?.[0]?.current_period_end:',
            sub.items?.data?.[0]?.current_period_end
          );
        }

        const profile = await profileModel.findOne({
          'subscription.stripeCustomerId': stripeCustomerId,
        });

        if (!profile) {
          console.warn(
            '[StripeWebhook] No profile found for Stripe customer:',
            stripeCustomerId
          );
          break;
        }

        const currentPeriodEndUnix =
          sub.current_period_end ??
          sub.items?.data?.[0]?.current_period_end ??
          null;

        await setSubscriptionInfo(profile.userId, profilesDBConnection, {
          status: sub.status,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: currentPeriodEndUnix
            ? new Date(currentPeriodEndUnix * 1000)
            : null,
        });

        if (isDebug) {
          console.log('[StripeWebhook] Subscription updated for:', profile.userId);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;

        if (isDebug) {
          console.log('[StripeWebhook] invoice.paid insertStripeInvoices');
        }

        const summary = await insertStripeInvoices(stripeModel, [invoice]);

        if (isDebug) {
          console.log(
            `[StripeWebhook] invoice.paid summary=${JSON.stringify(summary)}`
          );
        }
        break;
      }

      default:
        if (isDebug) {
          console.log(`[StripeWebhook] ignoring event type=${event.type}`);
        }
        break;
    }

    if (isDebug) console.log('[handleStripeWebhook] end');
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[StripeWebhook] Processing error:', err);
    return res.status(500).send('Webhook handler error');
  }
}