require('dotenv').config();
const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'acxiomcrm_default_session_secret_2026',
  jwtSecret: process.env.JWT_SECRET || 'acxiomcrm_default_jwt_secret_2026',
  jwtExpiresIn: '8h',
  env: process.env.NODE_ENV || 'development',
  maxFailedLogins: parseInt(process.env.MAX_FAILED_LOGINS || '5', 10),
  lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
  dbPath: path.join(__dirname, '../../data/acxiomcrm.db'),
  roles: {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    SALES_EXECUTIVE: 'SalesExecutive'
  }
};
