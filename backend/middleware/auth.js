import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  try {
    // Cookie-based access token
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: '[requireAuth] Missing token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🚨 Make sure payload actually has userId
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.user = {
      userId: decoded.userId,
      isAdmin: !!decoded.isAdmin,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
