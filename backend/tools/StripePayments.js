import mongoose from 'mongoose';
import Stripe from 'stripe';
import { appDBURL, isDebug } from '../config.js';
import { StripeSchema } from '../models/StripeDataModel.js';
import { insertStripeInvoices } from './StripeUtil.js';

let appConnection;
let StripeModel;

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

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined.');
  }

  // ✅ Good practice: lock API version
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

function toUnixSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

export async function getStripePayments() {
  const conn = getAppConnection();

  if (isDebug) console.log('[getStripePayments] begin');

  if (conn.readyState !== 1) {
    await conn.asPromise();
  }

  // Ensure model exists (defensive)
  if (!StripeModel) {
    StripeModel =
      conn.models.Stripe ||
      conn.model('Stripe', StripeSchema, 'stripe_payments');
  }

  // Ensure indexes exist
  if (isDebug) console.log('[getStripePayments] createIndexes');
  await StripeModel.createIndexes();

  if (isDebug) console.log('[getStripePayments] getStripeClient');
  const stripe = getStripeClient();

  // Get latest stored payment
  if (isDebug) console.log('[getStripePayments] get latest stored payment');
  const newestExisting = await StripeModel.findOne({})
    .sort({ transactionDateAndTimeISO: -1 })
    .lean();

  const startISO =
    newestExisting?.transactionDateAndTimeISO ||
    '2001-01-01T00:00:00.000Z';

  // Buffer to avoid missing late-paid invoices
  const bufferSeconds = 60 * 60 * 24 * 2; // 2 days
  const createdGt = Math.max(0, toUnixSeconds(startISO) - bufferSeconds);

  let startingAfter = undefined;
  let hasMore = true;
  let fetchedCount = 0;

  // ✅ Instead of building one giant array, process in chunks
  let totalSummary = {
    receivedCount: 0,
    normalizedCount: 0,
    upsertedCount: 0,
    modifiedCount: 0,
    matchedCount: 0,
  };

  if (isDebug) console.log(`[getStripePayments] start loop, hasMore=${hasMore}`);
  while (hasMore) {
    const page = await stripe.invoices.list({
      limit: 100,
      status: 'paid',
      created: { gt: createdGt },
      starting_after: startingAfter,
    });

    const invoices = page.data || [];
    if (isDebug) console.log(`[getStripePayments] fetchedCount=${fetchedCount}`);
    fetchedCount += invoices.length;

    if (isDebug) {
      console.log(
        `[getStripePayments] page fetched=${invoices.length}, total=${fetchedCount}`
      );
    }

    // ✅ KEY CHANGE: delegate everything to shared util
    if (isDebug) console.log('[getStripePayments] insertStripeInvoices');
    const summary = await insertStripeInvoices(StripeModel, invoices);

    // accumulate totals
    totalSummary.receivedCount += summary.receivedCount;
    totalSummary.normalizedCount += summary.normalizedCount;
    totalSummary.upsertedCount += summary.upsertedCount;
    totalSummary.modifiedCount += summary.modifiedCount;
    totalSummary.matchedCount += summary.matchedCount;

    hasMore = !!page.has_more;

    startingAfter =
      hasMore && invoices.length > 0
        ? invoices[invoices.length - 1].id
        : undefined;
    if (isDebug) console.log('[getStripePayments] end hasMore loop');
  }

  return {
    ...totalSummary,
    fetchedCount,
    newestExistingISO: newestExisting?.transactionDateAndTimeISO || null,
    startISO,
    bufferedStartISO: new Date(createdGt * 1000).toISOString(),
  };
}