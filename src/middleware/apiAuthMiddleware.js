const jwt = require('jsonwebtoken');
const config = require('../config/appConfig');
const db = require('../database/db');

/**
 * JWT Bearer Authentication Middleware for REST API endpoints
 */
function requireApiAuth(req, res, next) {
  let token = null;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.session && req.session.user) {
    // Fallback: Allow authenticated web session to consume API if making internal client calls
    req.apiUser = req.session.user;
    return next();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication token is missing or malformed.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Verify user is still active in database
    const user = db.prepare('SELECT UserId, Name, Email, RoleId, RoleName, IsActive FROM Users WHERE UserId = ?').get(decoded.userId);
    if (!user || !user.IsActive) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: User account is inactive or not found.',
        code: 'USER_INACTIVE'
      });
    }

    req.apiUser = {
      userId: user.UserId,
      name: user.Name,
      email: user.Email,
      roleId: user.RoleId,
      roleName: user.RoleName
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired token.',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
}

/**
 * Role-Based Authorization for REST API endpoints
 */
function requireApiRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.apiUser) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const userRole = req.apiUser.roleName;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (roles.includes(userRole) || userRole === 'Admin') {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Forbidden: Role '${userRole}' is not permitted to perform this action.`,
      code: 'FORBIDDEN'
    });
  };
}

module.exports = {
  requireApiAuth,
  requireApiRole
};
