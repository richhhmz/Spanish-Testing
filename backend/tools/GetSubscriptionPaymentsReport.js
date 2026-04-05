import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '../config.js';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  // Keep your chosen API version style if you already standardize this elsewhere.
  apiVersion: '2023-10-16',
});

export async function getSubscriptionPaymentsReport() {
  const rows = [];
  let startingAfter = null;
  let hasMore = true;

  while (hasMore) {
    const response = await stripe.invoices.list({
      status: 'paid',
      limit: 100,
      starting_after: startingAfter || undefined,
      expand: ['data.customer'],
    });

    for (const invoice of response.data) {
      // Keep only subscription-related invoices
      if (!invoice.subscription) continue;

      const customer = invoice.customer;
      const subscriberEmail =
        customer && typeof customer === 'object' ? customer.email || '' : '';

      rows.push({
        invoiceId: invoice.id,
        paymentDate: new Date(invoice.created * 1000).toISOString(),
        subscriberEmail,
        paymentAmount: (invoice.amount_paid || 0) / 100,
        currency: invoice.currency || 'usd',
      });
    }

    hasMore = response.has_more;
    startingAfter =
      response.data.length > 0 ? response.data[response.data.length - 1].id : null;
  }

  return rows;
}