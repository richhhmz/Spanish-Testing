import rateLimit from 'express-rate-limit';

// Helper: return consistent message
const tooMany = (req, res) =>
  res.status(429).json({
    error: 'Too many requests. Please wait a bit and try again.',
  });

// 1) Magic-link request: stricter (protects email sender)
export const magicRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
});

// 2) Magic-link redeem: moderate (prevents brute-force tokens)
export const magicRedeemLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 30,                  // 30 tries per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
});
