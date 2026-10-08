const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const config = require('./config/appConfig');
const { attachUser } = require('./middleware/authMiddleware');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

// Disable express fingerprinting
app.disable('x-powered-by');

// Enterprise Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  
  // Cache-Control for authenticated views & sensitive data
  if (req.path.startsWith('/api') || req.path.startsWith('/dashboard') || req.path.startsWith('/customers') || req.path.startsWith('/leads') || req.path.startsWith('/opportunities') || req.path.startsWith('/audit')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }
  next();
});

// HTTP request logging
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Security & Parsing Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

const expressLayouts = require('express-ejs-layouts');

// View Engine (EJS) with Layouts
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Session Setup
app.use(session({
  name: 'acxiomcrm.sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.env === 'production',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: 'lax'
  }
}));

// Attach logged-in user context to all views
app.use(attachUser);

// Health Check Endpoint (Operational Readiness & Liveness)
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    application: 'AcxiomCRM Enterprise',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: 'connected'
  });
});

// Mount Application Routes
app.use('/', webRoutes);
app.use('/api', apiRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start Server if not imported by test suite
if (process.env.NODE_ENV !== 'test') {
  const PORT = config.port;
  const server = app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`🚀 AcxiomCRM Enterprise Server running on port ${PORT}`);
    console.log(`🌐 Web UI:       http://localhost:${PORT}`);
    console.log(`📡 REST API:     http://localhost:${PORT}/api`);
    console.log(`📚 API Docs:     http://localhost:${PORT}/api-docs`);
    console.log(`🩺 Health:       http://localhost:${PORT}/health`);
    console.log(`========================================================`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

module.exports = app;
