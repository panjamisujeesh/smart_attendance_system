const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_attendance_secret_2024';

function auth(roles) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      if (roles && roles.length > 0) {
        if (!roles.includes(decoded.role)) {
          return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = auth;
