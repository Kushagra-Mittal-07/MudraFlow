// =============================================================================
// MudraFlow Backend: JWT Authentication Middleware
// File: backend/middleware/auth.js
//
// Verifies the JWT from the Authorization header and attaches the decoded
// payload to req.user. Customer routes reject staff tokens and vice versa.
// =============================================================================

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'mudraflow_demo_jwt_secret_change_in_prod';

/**
 * requireAuth(role) returns middleware that:
 *  1. Reads the Bearer token from Authorization header
 *  2. Verifies the JWT signature
 *  3. Checks the token role matches the required role
 *  4. Attaches req.user = { id, role }
 *
 * @param {'customer'|'staff'} role - The required role.
 */
function requireAuth(role) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      // WHY: A customer token must not access staff routes, and vice versa.
      if (decoded.role !== role) {
        return res.status(403).json({ ok: false, message: 'Access denied' });
      }
      req.user = decoded; // { id, role }
      next();
    } catch (err) {
      return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
    }
  };
}

module.exports = { requireAuth };

