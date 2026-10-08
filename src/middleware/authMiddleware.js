/**
 * Authentication and Role-Based Authorization Middleware for MVC Web Views
 */

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  // If AJAX or JSON request, return 401
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }

  // Store return URL
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.status(401).json({ success: false, error: 'Authentication required.' });
      }
      return res.redirect('/login');
    }

    const userRole = req.session.user.roleName;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (roles.includes(userRole) || userRole === 'Admin') {
      return next();
    }

    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(403).json({ success: false, error: 'Access denied: Insufficient privileges.' });
    }

    return res.status(403).render('errors/403', {
      title: 'Access Denied - 403',
      message: `Your account role (${userRole}) does not have permission to access this resource.`,
      currentUser: req.session.user
    });
  };
}

function attachUser(req, res, next) {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.currentPath = req.path;
  res.locals.flashSuccess = req.session ? req.session.flashSuccess : null;
  res.locals.flashError = req.session ? req.session.flashError : null;

  // Clear flash messages once consumed
  if (req.session) {
    req.session.flashSuccess = null;
    req.session.flashError = null;
  }

  next();
}

module.exports = {
  requireAuth,
  requireRole,
  attachUser
};
