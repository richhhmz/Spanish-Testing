import jwt from 'jsonwebtoken';

export const requireAuth = (req, res, next) => {
  try {
    console.log(`@[requireAuth] start`);
    // Cookie-based access token
    const token = req.cookies?.token;
    if (!token) {
      console.log(`@[requireAuth] missing token`);
      return res.status(401).json({ error: 'Missing token' });
    }

    console.log(`@[requireAuth] before decoded token`);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`@[requireAuth] decoded=${decoded}`);

    // 🚨 Make sure payload actually has userId
    if (!decoded || !decoded.userId) {
      console.log(`@[requireAuth] invalid token payload`);
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    req.user = {
      userId: decoded.userId,
      isAdmin: !!decoded.isAdmin,
    };

    console.log("@[requireAuth] testing error log")
    console.error("@[requireAuth] error log test")
    console.log(`@[requireAuth] end`);

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
