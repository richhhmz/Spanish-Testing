import { getProfile } from '../tools/UserProfile.js';

export default async function effectiveUserMiddleware(req, res, next) {
  try {
    if (!req.user?.userId) {
      return next();
    }

    const profilesDB = req.app.locals.profilesDB;
    const realUserId = req.user.userId;

    const profile = await getProfile(realUserId, profilesDB);

    req.realUserId = realUserId;

    req.effectiveUserId =
      profile.impersonation?.active
        ? profile.impersonation.targetUserId
        : realUserId;

    req.effectiveUserIsAdmin = profile.isAdmin === true;

    next();
  } catch (err) {
    console.error('❌ effectiveUserMiddleware failed:', err);
    res.status(500).json({ error: 'User resolution failed' });
  }
}
