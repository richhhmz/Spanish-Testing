import mongoose from 'mongoose';

export const PartnerPaymentSchema = new mongoose.Schema(
  {
    transactionDateAndTimeISO: {
      type: String,
      required: true,
    },
    transactionType: { // subscriberPayment, partnerPayment, monthBegin, monthEnd
      type: String,
      required: true,
    },
    subscriberAmount: {
      type: Number,
      required: false,
    },
    partnerPercent: {
      type: Number,
      required: false,
    },
    partnerAmount: {
      type: Number,
      required: true,
    },
    subscriberName: {
      type: String,
      required: false,
    },
    partnerName: {
      type: String,
      required: false,
    },
    isTestAccount: {
      type: Boolean,
      default: false,
    },
    userPreferredName: {
      type: String,
      required: false,
    },
  },
);

// Compound unique index
PartnerPaymentSchema.index(
  {
    transactionDateAndTimeISO: 1,
    transactionType: 1,
    subscriberName: 1,
    partnerName: 1,
  },
  { unique: true }
);
