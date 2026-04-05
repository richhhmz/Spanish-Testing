import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSubscriptionPaymentsReport } from '../tools/GetSubscriptionPaymentsReport.js';

const createSubscriptionPaymentsReportRouter = () => {
  const router = express.Router();

  router.get('/api/billing/subscription-payments-report', requireAuth, async (req, res) => {
    try {
      const data = await getSubscriptionPaymentsReport();

      return res.status(200).json({
        status: 200,
        count: data.length,
        data,
      });
    } catch (err) {
      console.error('❌ subscription-payments-report failed:', err);

      return res.status(500).json({
        status: 500,
        error: 'Failed to load subscription payments report',
      });
    }
  });

  return router;
};

export default createSubscriptionPaymentsReportRouter;