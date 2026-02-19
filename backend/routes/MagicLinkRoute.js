// backend/routes/MagicLinkRoute.js

// 1. You'll need to pass the profiles connection here too
export default function createMagicLinkRoute(appDBConnection, profilesDBConnection) {
  // ...
  
  router.post('/magic/redeem', magicRedeemLimiter, async (req, res) => {
    try {
      // ... (finding the link code) ...

      const email = link.email; // This is your User ID

      // 2. Even if email is the ID, you still need to know if they are an admin
      // Assuming your UserProfile tool has a way to get the profile
      const profile = await getProfile(email, profilesDBConnection);
      const isAdmin = !!profile?.isAdmin;

      // 3. FIX: Use 'userId' as the key so auth.js can find it
      const payload = { 
        userId: email, 
        isAdmin: isAdmin 
      };

      const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      // ... (setting cookies) ...

      return res.json({ ok: true });
    } catch (err) {
      console.error('magic/redeem error:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}