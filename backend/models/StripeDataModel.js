import mongoose from 'mongoose';

export const StripeSchema = new mongoose.Schema(
  {
    stripeCustomerId: { // invoice.customer
      type: String,
      required: true,
    },
    stripeSubscriptionId: { // invoice.subscription
      type: String,
      required: true,
    },
    subscriberEmail: { // invoice.customer_email || invoice.customer_details?.email
      type: String,
      required: false,
    },
    subscriberName: { // invoice.customer_name - often missing
      type: String,
      required: false,
    },
    transactionDateAndTimeISO: { // invoice.status_transitions?.paid_at || invoice.created
      type: String,
      required: true,
    },
    currency: { // invoice.currency e.g. USD
      type: String,
      required: true,
    },
    amountPaid: { // invoice.amount_paid in cents
      type: Number,
      required: true,
    },
  },
  {
    collection: 'stripe_payments',
  }
);

StripeSchema.index({ transactionDateAndTimeISO: -1 });

StripeSchema.index(
  {
    stripeCustomerId: 1,
    stripeSubscriptionId: 1,
    transactionDateAndTimeISO: 1,
    amountPaid: 1,
  },
  { unique: true }
);