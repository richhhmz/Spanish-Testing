import mongoose from 'mongoose';

const LoginAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Store SHA256 hash of token (never store raw token)
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'cancelled', 'expired'],
      default: 'pending',
      index: true,
    },

    ip: {
      type: String,
      default: '',
    },

    userAgent: {
      type: String,
      default: '',
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// 🔥 Auto-delete expired login attempts
LoginAttemptSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// 🔍 Helpful compound index for cooldown checks
LoginAttemptSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('LoginAttempt', LoginAttemptSchema);
