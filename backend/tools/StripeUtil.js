// backend/utils/StripeUtil.js

import { isDebug } from "../config.js";

const unixToISO = (unixSeconds) => {
  if (!unixSeconds && unixSeconds !== 0) return '';
  return new Date(unixSeconds * 1000).toISOString();
};

const normalizeCurrency = (currency) => {
  return String(currency || '').trim().toUpperCase();
};

const normalizeSubscriberName = (invoice) => {
  return (
    invoice?.customer_name ||
    invoice?.customer_details?.name ||
    invoice?.customer_email ||
    invoice?.customer_details?.email ||
    ''
  );
};

const normalizeSubscriberEmail = (invoice) => {
  return (
    invoice?.customer_email ||
    invoice?.customer_details?.email ||
    ''
  );
};

/**
 * Convert one Stripe invoice object into your MongoDB row shape.
 *
 * Expected output fields match your Stripe model:
 * - stripeCustomerId
 * - stripeSubscriptionId
 * - subscriberEmail
 * - subscriberName
 * - transactionDateAndTimeISO
 * - currency
 * - amountPaid
 *
 * Returns null if the invoice should not be stored.
 */
export const normalizeStripeInvoice = (invoice) => {
  if(isDebug)console.log(`[normalizeStripeInvoice] begin`);
  if(isDebug)console.log(`[normalizeStripeInvoice] invoice=${JSON.stringify(invoice,null,2)}`);

  if (!invoice) return null;

  const stripeCustomerId = invoice?.customer ? String(invoice.customer) : '';
  const stripeSubscriptionId =
    invoice?.subscription || // older / simpler invoices
    invoice?.parent?.subscription_details?.subscription || // your current case
    invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription || // fallback
    '';

  // Prefer the actual paid time. Fall back to created if needed.
  const paidAtUnix = invoice?.status_transitions?.paid_at;
  const createdUnix = invoice?.created;

  const transactionDateAndTimeISO = paidAtUnix
    ? unixToISO(paidAtUnix)
    : createdUnix
      ? unixToISO(createdUnix)
      : '';

  const amountPaid = Number(invoice?.amount_paid ?? 0);
  const currency = normalizeCurrency(invoice?.currency);
  const subscriberEmail = normalizeSubscriberEmail(invoice);
  const subscriberName = normalizeSubscriberName(invoice);

  // Skip rows that do not have the key data your collection expects.
  if(isDebug)console.log(`[normalizeStripeInvoice] stripeCustomerId=${stripeCustomerId}`);
  if (!stripeCustomerId) return null;

  if(isDebug)console.log(`[normalizeStripeInvoice] stripeSubscriptionId=${stripeSubscriptionId}`);
  if (!stripeSubscriptionId) return null;

  if(isDebug)console.log(`[normalizeStripeInvoice] transactionDateAndTimeISO=${transactionDateAndTimeISO}`);
  if (!transactionDateAndTimeISO) return null;

  if(isDebug)console.log(`[normalizeStripeInvoice] currency=${currency}`);
  if (!currency) return null;

  if(isDebug)console.log(`[normalizeStripeInvoice] amountPaid=${amountPaid}`);
  if (!Number.isFinite(amountPaid)) return null;

  if(isDebug)console.log(`[normalizeStripeInvoice] end`);
  return {
    stripeCustomerId,
    stripeSubscriptionId,
    subscriberEmail,
    subscriberName,
    transactionDateAndTimeISO,
    currency,
    amountPaid,
  };
};

/**
 * Build one Mongo bulkWrite upsert operation for a normalized invoice row.
 *
 * This assumes your uniqueness rule is based on:
 *   stripeSubscriptionId + transactionDateAndTimeISO
 *
 * If your actual unique index is different, change the filter here
 * to match it exactly.
 */
export const buildStripeInvoiceUpsert = (normalizedRow) => {
  if(isDebug)console.log(`[buildStripeInvoiceUpsert] begin`);
  if(isDebug)console.log(`[buildStripeInvoiceUpsert] normalizedRow=${JSON.stringify(normalizedRow,null,2)}`);
  return {
    updateOne: {
      filter: {
        stripeSubscriptionId: normalizedRow.stripeSubscriptionId,
        transactionDateAndTimeISO: normalizedRow.transactionDateAndTimeISO,
      },
      update: {
        $set: normalizedRow,
      },
      upsert: true,
    },
  };
};

/**
 * Normalize and insert/upsert a list of Stripe invoices.
 *
 * @param {mongoose.Model} StripeModel
 * @param {Array} invoices - raw Stripe invoice objects
 *
 * @returns {Promise<any>}
 */
export const insertStripeInvoices = async (StripeModel, invoices) => {
  if(isDebug)console.log('[insertStripeInvoices] begin');
  if (!StripeModel) {
    throw new Error('insertStripeInvoices requires StripeModel.');
  }

  if (!Array.isArray(invoices) || invoices.length === 0) {
    return {
      receivedCount: Array.isArray(invoices) ? invoices.length : 0,
      normalizedCount: 0,
      upsertedCount: 0,
      modifiedCount: 0,
      matchedCount: 0,
    };
  }

  if(isDebug)console.log(`[insertStripeInvoices] invoices=${JSON.stringify(invoices,null,2)}`);

  const normalizedRows = invoices
    .map(normalizeStripeInvoice)
    .filter(Boolean)
    .sort((a, b) =>
      a.transactionDateAndTimeISO.localeCompare(b.transactionDateAndTimeISO)
    );
  if(isDebug)console.log(`[insertStripeInvoices] normalizedRows=${JSON.stringify(normalizedRows,null,2)}`);

  if (normalizedRows.length === 0) {
    return {
      receivedCount: invoices.length,
      normalizedCount: 0,
      upsertedCount: 0,
      modifiedCount: 0,
      matchedCount: 0,
    };
  }

  const operations = normalizedRows.map(buildStripeInvoiceUpsert);
  if(isDebug)console.log(`[insertStripeInvoices] operations=${JSON.stringify(operations,null,2)}`);


  const result = await StripeModel.bulkWrite(operations, { ordered: true });
  if(isDebug)console.log(`[insertStripeInvoices] bulkWrite result=${JSON.stringify(result,null,2)}`);

  return {
    receivedCount: invoices.length,
    normalizedCount: normalizedRows.length,
    upsertedCount: result.upsertedCount || 0,
    modifiedCount: result.modifiedCount || 0,
    matchedCount: result.matchedCount || 0,
  };
};