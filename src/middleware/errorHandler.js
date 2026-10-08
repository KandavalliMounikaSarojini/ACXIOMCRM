/**
 * Centralized error handler - prevents leaking server stack traces or database errors to users
 */

function notFoundHandler(req, res, next) {
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      code: 'RESOURCE_NOT_FOUND'
    });
  }

  res.status(404).render('errors/404', {
    title: 'Page Not Found - 404',
    url: req.originalUrl,
    currentUser: req.session ? req.session.user : null
  });
}

function globalErrorHandler(err, req, res, next) {
  console.error('[Application Error]:', err.stack || err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const isApi = req.xhr || req.path.startsWith('/api/');

  if (isApi) {
    return res.status(statusCode).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : (err.message || 'Internal Server Error'),
      code: 'INTERNAL_SERVER_ERROR'
    });
  }

  res.status(statusCode).render('errors/500', {
    title: 'Server Error - 500',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong on our end. Please try again shortly.' : err.message,
    currentUser: req.session ? req.session.user : null
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
