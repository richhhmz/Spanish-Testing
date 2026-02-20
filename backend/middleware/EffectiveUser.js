// backend/middleware/EffectiveUser.js
import { getProfile } from '../tools/UserProfile.js';

// Convert to a factory function that accepts the connection
const effectiveUserMiddleware = (profilesDBConnection) => async (req, res, next) => {
  try {
    const realUserId = req.user?.userId;
    if (!realUserId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Pass both the ID and the connection to your tool
    const profile = await getProfile(realUserId, profilesDBConnection);
    const impersonation = profile?.impersonation || {};
    
    // Set the effective user based on impersonation status
    req.effectiveUserId = (impersonation.active && impersonation.targetUserId) 
      ? impersonation.targetUserId 
      : realUserId;

    next();
  } catch (err) {
    console.error('❌ effectiveUserMiddleware failed:', err);
    res.status(500).json({ 
      error: 'Failed to resolve effective user',
      details: err.message 
    });
  }
};

export default effectiveUserMiddleware;