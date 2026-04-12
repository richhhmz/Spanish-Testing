import mongoose from 'mongoose';

export const PartnerPaymentSchema = new mongoose.Schema(
  {
    transactionDateAndTimeISO: {
      type: String,
      required: true,
    },
    transactionType: { // subscriberPayment, partnerPayment, trialStart, trialEnd, cancelled
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    partnerBalance: {
      type: Number,
      required: true,
    },
    subscriberName: {
      type: String,
      required: true,
    },
    partnerName: {
      type: String,
      required: false,
    },
  },
);
