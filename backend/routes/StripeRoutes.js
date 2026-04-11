import express from 'express';
import { getStripePayments } from '../tools/Stripe.js';
import { requireAuth } from '../middleware/auth.js';
import { isDebug } from '../config.js';

const router = express.Router();

/**
 * One-time backfill from Stripe
 * GET /api/stripe/get-stripe-payments
 */
router.get('/get-stripe-payments', requireAuth, async (req, res) => {
  if(isDebug)console.log('[/get-stripe-payments] Starting Stripe backfill...');

  try {
    // Optional: lock this down to admin only
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin only',
      });
    }

    if(isDebug)console.log('[/get-stripe-payments] Starting Stripe backfill...');

    const result = await getStripePayments();

    if(isDebug)console.log('[/get-stripe-payments] Completed:', result);

    return res.json({
      success: true,
      message: 'Stripe payments sync completed.',
      ...result,
    });
  } catch (err) {
    console.error('[/get-stripe-payments] getStripePayments failed:', err);

    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to sync Stripe payments.',
    });
  }
});

export default router;