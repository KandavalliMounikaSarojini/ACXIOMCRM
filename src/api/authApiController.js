const AuthService = require('../services/authService');
const AuditService = require('../services/auditService');

class AuthApiController {
  static async login(req, res) {
    const { email, password } = req.body;
    const ipAddress = req.ip || '127.0.0.1';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
        code: 'VALIDATION_ERROR'
      });
    }

    const result = await AuthService.authenticateUser(email, password, ipAddress);

    if (!result.success) {
      const statusCode = result.isLocked ? 403 : 401;
      return res.status(statusCode).json({
        success: false,
        error: result.message,
        isLocked: result.isLocked || false,
        code: result.isLocked ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token: result.token,
      user: result.user
    });
  }

  static logout(req, res) {
    if (req.apiUser) {
      AuditService.log({
        userId: req.apiUser.userId,
        userName: req.apiUser.name,
        userRole: req.apiUser.roleName,
        action: 'LOGOUT',
        entityName: 'Auth',
        details: 'API user terminated session',
        ipAddress: req.ip || '127.0.0.1'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  }

  static getProfile(req, res) {
    return res.status(200).json({
      success: true,
      user: req.apiUser
    });
  }
}

module.exports = AuthApiController;
