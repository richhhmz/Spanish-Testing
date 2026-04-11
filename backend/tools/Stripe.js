import mongoose from 'mongoose';
import Stripe from 'stripe';
import { appDBURL } from '../config.js';
import { StripeSchema } from '../models/StripeDataModel.js';
import { isDebug } from '../config.js';

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

  return new Stripe(secretKey);
}

function toUnixSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function unixToISO(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString();
}

function normalizeStripeInvoice(invoice) {
  const paidAtUnix = invoice?.status_transitions?.paid_at;

  if (!paidAtUnix) return null;

  const subscriptionId =
    invoice.subscription ||
    invoice.parent?.subscription_details?.subscription;

  if (!subscriptionId) return null;

  return {
    stripeCustomerId: invoice.customer || '',
    stripeSubscriptionId: subscriptionId,
    subscriberEmail:
      invoice.customer_email || invoice.customer_details?.email || '',
    subscriberName: invoice.customer_name || '',
    transactionDateAndTimeISO: unixToISO(paidAtUnix),
    currency: (invoice.currency || '').toUpperCase(),
    amountPaid: Number(invoice.amount_paid || 0),
  };
}

function makeRowKey(row) {
  return [
    row.stripeCustomerId,
    row.stripeSubscriptionId,
    row.transactionDateAndTimeISO,
    row.amountPaid,
  ].join('|');
}

export async function getStripePayments() {
  const conn = getAppConnection();

  if (conn.readyState !== 1) {
    await conn.asPromise();
  }

  if (!StripeModel) {
    StripeModel =
      conn.models.Stripe ||
      conn.model('Stripe', StripeSchema, 'stripe_payments');
  }

  const stripe = getStripeClient();

  const newestExisting = await StripeModel.findOne({})
    .sort({ transactionDateAndTimeISO: -1 })
    .lean();

  const startISO =
    newestExisting?.transactionDateAndTimeISO ||
    '2001-01-01T00:00:00.000Z';

  // Buffer helps catch invoices created earlier but paid later.
  const bufferSeconds = 60 * 60 * 24 * 2; // 2 days
  const createdGt = Math.max(0, toUnixSeconds(startISO) - bufferSeconds);

  let startingAfter = undefined;
  let hasMore = true;
  let fetchedCount = 0;
  const rowsToInsert = [];

  while (hasMore) {
    const page = await stripe.invoices.list({
      limit: 100,
      status: 'paid',
      created: { gt: createdGt },
      starting_after: startingAfter,
    });

    // if(isDebug)console.log(`[getStripePayments] page=${JSON.stringify(page,null,2)}`);

    const invoices = page.data || [];
    fetchedCount += invoices.length;
    if (isDebug) console.log(`[getStripePayments] fetchedCount=${fetchedCount}`);

    for (const invoice of invoices) {
      if (isDebug) console.log(`[getStripePayments] check has values`);
      const subscriptionId =
        invoice.subscription ||
        invoice.parent?.subscription_details?.subscription;

      if (!subscriptionId) continue;
      if (isDebug) console.log(`[getStripePayments] has subscription`);
      const row = normalizeStripeInvoice(invoice);
      if (!row) continue;
      if (!row.stripeCustomerId) continue;
      if(isDebug)console.log(`[getStripePayments] has stripeCustomerId`);
      if (!row.stripeSubscriptionId) continue;
      if(isDebug)console.log(`[getStripePayments] has stripeSubscriptionId`);
      if (!row.transactionDateAndTimeISO) continue;
      if(isDebug)console.log(`[getStripePayments] has transactionDateAndTimeISO`);
      if (!row.currency) continue;
      if(isDebug)console.log(`[getStripePayments] has currency`);

      if(isDebug)console.log(`[getStripePayments] pushing`);
      rowsToInsert.push(row);
    }

    hasMore = !!page.has_more;
    startingAfter =
      hasMore && invoices.length > 0
        ? invoices[invoices.length - 1].id
        : undefined;
  }

  rowsToInsert.sort((a, b) =>
    a.transactionDateAndTimeISO.localeCompare(b.transactionDateAndTimeISO)
  );

  // Remove duplicates within this run before hitting MongoDB.
  const seen = new Set();
  const dedupedRows = [];

  for (const row of rowsToInsert) {
    const key = makeRowKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedRows.push(row);
  }

  let insertedCount = 0;
  let duplicateCount = 0;

  if (dedupedRows.length > 0) {
    try {
      const inserted = await StripeModel.insertMany(dedupedRows, {
        ordered: false,
      });
      insertedCount = inserted.length;
    } catch (err) {
      // insertMany with ordered:false still throws on duplicate key errors,
      // but successful inserts are kept.
      if (err?.writeErrors?.length) {
        duplicateCount = err.writeErrors.filter(
          (e) => e.code === 11000
        ).length;

        insertedCount = dedupedRows.length - duplicateCount;
      } else {
        throw err;
      }
    }
  }

  return {
    insertedCount,
    duplicateCount,
    newestExistingISO: newestExisting?.transactionDateAndTimeISO || null,
    fetchedCount,
    startISO,
    bufferedStartISO: new Date(createdGt * 1000).toISOString(),
  };
}