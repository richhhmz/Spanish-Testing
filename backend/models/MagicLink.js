// backend/models/MagicLink.js
import mongoose from 'mongoose';

export const MagicLinkSchema = new mongoose.Schema(
  {
    email: { type: String, index: true },
    tokenHash: { type: String, index: true },
    purpose: { type: String, default: 'login', index: true },
    expiresAt: { type: Date, index: true },
    usedAt: { type: Date, default: null, index: true },
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);
