const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Middleware to verify JWT Token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

/**
 * Optional token extraction (doesn't fail if guest)
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      req.user = decoded;
    } catch (e) {
      // ignore guest mode
    }
  }
  next();
}

/**
 * Middleware to check admin role
 * Restricts access to authenticated users with role: 'admin' (or designated evaluator admin emails)
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const authorizedEmails = ['admin@ecowalk.local', 'rakshithmr52@gmail.com'];
  const userEmail = req.user.email?.toLowerCase();
  const isAdmin = req.user.role === 'admin' || authorizedEmails.includes(userEmail);

  if (!isAdmin) {
    return res.status(403).json({ error: 'Access restricted. Administrator privileges required.' });
  }
  next();
}

module.exports = {
  verifyToken,
  optionalAuth,
  requireAdmin
};
