const AuthService = require('../services/authService');
const AuditService = require('../services/auditService');

class AuthController {
  static renderLogin(req, res) {
    if (req.session && req.session.user) {
      return res.redirect('/dashboard');
    }
    res.render('auth/login', {
      title: 'Login - AcxiomCRM',
      error: req.query.error || null,
      message: req.query.message || null
    });
  }

  static async handleLogin(req, res) {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';

    const result = await AuthService.authenticateUser(email, password, ipAddress);

    if (!result.success) {
      return res.render('auth/login', {
        title: 'Login - AcxiomCRM',
        error: result.message,
        message: null,
        email: email || '',
        isLocked: result.isLocked || false
      });
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
      }
      req.session.user = result.user;
      req.session.token = result.token;

      const redirectTo = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;

      return res.redirect(redirectTo);
    });
  }

  static renderRegister(req, res) {
    if (req.session && req.session.user) {
      return res.redirect('/dashboard');
    }
    res.render('auth/register', {
      title: 'Register - AcxiomCRM',
      errors: [],
      formData: {}
    });
  }

  static async handleRegister(req, res) {
    const { name, email, password, confirmPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';

    if (password !== confirmPassword) {
      return res.render('auth/register', {
        title: 'Register - AcxiomCRM',
        errors: [{ field: 'confirmPassword', message: 'Passwords do not match.' }],
        formData: { name, email }
      });
    }

    const result = await AuthService.registerUser({
      name,
      email,
      password,
      roleName: 'SalesExecutive', // Default self-registration role
      ipAddress
    });

    if (!result.success) {
      return res.render('auth/register', {
        title: 'Register - AcxiomCRM',
        errors: [{ field: 'general', message: result.message }],
        formData: { name, email }
      });
    }

    // Auto-login after successful registration
    const loginResult = await AuthService.authenticateUser(email, password, ipAddress);
    if (loginResult.success) {
      req.session.regenerate((err) => {
        if (err) console.error('Session regeneration error on register:', err);
        req.session.user = loginResult.user;
        req.session.token = loginResult.token;
        req.session.flashSuccess = 'Welcome to AcxiomCRM! Your account was registered successfully.';
        return res.redirect('/dashboard');
      });
      return;
    }

    return res.redirect('/login?message=Registration successful. Please log in.');
  }

  static handleLogout(req, res) {
    if (req.session && req.session.user) {
      AuditService.log({
        userId: req.session.user.userId,
        userName: req.session.user.name,
        userRole: req.session.user.roleName,
        action: 'LOGOUT',
        entityName: 'Auth',
        details: 'User logged out',
        ipAddress: req.ip || '127.0.0.1'
      });
    }

    req.session.destroy(() => {
      res.redirect('/login?message=You have been logged out securely.');
    });
  }

  static renderProfile(req, res) {
    res.render('auth/profile', {
      title: 'My Profile - AcxiomCRM',
      user: req.session.user
    });
  }
}

module.exports = AuthController;
