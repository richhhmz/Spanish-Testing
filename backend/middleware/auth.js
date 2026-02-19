import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  try {
    // Cookie-based access token
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    // ✅ Must match what /auth/login and /auth/refresh sign with
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
      isAdmin: !!decoded.isAdmin,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
