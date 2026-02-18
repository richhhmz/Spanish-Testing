import mongoose from 'mongoose';

const MagicLinkSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    purpose: { type: String, default: 'login', index: true },
    usedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

MagicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('MagicLink', MagicLinkSchema);
