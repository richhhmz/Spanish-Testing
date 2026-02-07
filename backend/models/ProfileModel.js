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
  },
  { timestamps: true }
);
