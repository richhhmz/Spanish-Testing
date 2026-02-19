// backend/middleware/EffectiveUser.js
import { getProfile } from '../tools/UserProfile.js';

const effectiveUserMiddleware = (profilesDBConnection) => async (req, res, next) => {
  try {
    const realUserId = req.user?.userId;
    if (!realUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Pass the connection to getProfile
    const profile = await getProfile(realUserId, profilesDBConnection);

    const impersonation = profile?.impersonation || {};
    req.effectiveUserId = impersonation.active ? impersonation.targetUserId : realUserId;

    next();
  } catch (err) {
    console.error('❌ effectiveUserMiddleware failed:', err);
    res.status(500).json({ error: 'Failed to resolve effective user' });
  }
};

export default effectiveUserMiddleware;