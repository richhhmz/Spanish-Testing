import mongoose from 'mongoose';

const ImpersonationSchema = new mongoose.Schema(
  {
    active: {
      type: Boolean,
      default: false,
    },
    targetUserId: {
      type: String,
      required: false,
    },
    startedAt: {
      type: Date,
      required: false,
    },
  },
  { _id: false } // embedded, no separate _id
);

/**
 * Subscription / billing info for this user.
 * This is where Stripe-related state lives.
 */
const SubscriptionSchema = new mongoose.Schema(
  {
    // High-level status for gating access in the app
    status: {
      type: String,
      enum: [
        'none',                // no subscription / never subscribed
        'active',              // fully active subscription
        'past_due',            // payment failed, but Stripe still trying
        'canceled',            // subscription explicitly canceled
        'incomplete',          // Stripe created but never completed
        'incomplete_expired',  // Stripe incomplete and then expired
      ],
      default: 'none',
    },

    // e.g. "monthly", "yearly", or a Stripe price nickname
    plan: {
      type: String,
      required: false,
    },

    // Stripe IDs to map back from webhooks / dashboard
    stripeCustomerId: {
      type: String,
      index: true,
      required: false,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
      required: false,
    },

    // When the current billing period ends (from Stripe)
    currentPeriodEnd: {
      type: Date,
      required: false,
    },

    // When we last processed a Stripe event for this user
    lastEventAt: {
      type: Date,
      required: false,
    },
  },
  { _id: false } // embedded, no separate _id
);

export const ProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    userPreferredName: {
      type: String,
      required: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    testsPerDay: {
      type: Number,
    },
    lastTestDate: {
      type: String,
      required: true,
    },
    firstVisitDate: {
      type: String,
      required: true,
    },
    lastVisitDate: {
      type: String,
      required: true,
    },
    lastMessagesReadDate: {
      type: String,
      required: true,
    },

    impersonation: {
      type: ImpersonationSchema,
      default: () => ({ active: false }),
    },

    /**
     * Subscription / Stripe billing state.
     *
     * New users default to { status: 'none' }.
     * Existing users will effectively be treated as 'none'
     * until we update them via an admin tool or webhook.
     */
    subscription: {
      type: SubscriptionSchema,
      default: () => ({ status: 'none' }),
    },
  },
  { timestamps: true }
);
