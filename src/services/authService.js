const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const config = require('../config/appConfig');
const AuditService = require('./auditService');

class AuthService {
  /**
   * Validate password against enterprise security policy
   */
  static validatePasswordPolicy(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, message: 'Password is required.' };
    }
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number.' };
    }
    return { valid: true };
  }

  /**
   * Hash password securely using bcrypt
   */
  static async hashPassword(plainTextPassword) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainTextPassword, salt);
  }

  /**
   * Authenticate user with lockout detection and audit logging
   */
  static async authenticateUser(email, password, ipAddress = '127.0.0.1') {
    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.prepare(`SELECT * FROM Users WHERE LOWER(Email) = ?`).get(trimmedEmail);

    if (!user) {
      AuditService.log({
        action: 'FAILED_LOGIN',
        entityName: 'Auth',
        details: `Login attempt failed for non-existent email: ${trimmedEmail}`,
        ipAddress
      });
      return { success: false, message: 'Invalid email or password.' };
    }

    if (!user.IsActive) {
      AuditService.log({
        userId: user.UserId,
        userName: user.Name,
        userRole: user.RoleName,
        action: 'FAILED_LOGIN',
        entityName: 'Auth',
        details: `Login attempted on deactivated account: ${trimmedEmail}`,
        ipAddress
      });
      return { success: false, message: 'Your account has been deactivated. Please contact an Administrator.' };
    }

    // Check account lockout
    if (user.LockoutEnd) {
      const lockoutExpiry = new Date(user.LockoutEnd);
      const now = new Date();
      if (lockoutExpiry > now) {
        const remainingMinutes = Math.ceil((lockoutExpiry - now) / (60 * 1000));
        AuditService.log({
          userId: user.UserId,
          userName: user.Name,
          userRole: user.RoleName,
          action: 'FAILED_LOGIN',
          entityName: 'Auth',
          details: `Login blocked by active lockout until ${user.LockoutEnd}`,
          ipAddress
        });
        return {
          success: false,
          isLocked: true,
          message: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${remainingMinutes} minute(s) or contact an Administrator.`
        };
      } else {
        // Lockout expired, reset lockout
        db.prepare(`UPDATE Users SET LockoutEnd = NULL, FailedLoginCount = 0 WHERE UserId = ?`).run(user.UserId);
        user.LockoutEnd = null;
        user.FailedLoginCount = 0;
      }
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!isMatch) {
      const newFailedCount = (user.FailedLoginCount || 0) + 1;
      let lockoutEndTime = null;
      let isNowLocked = false;

      if (newFailedCount >= config.maxFailedLogins) {
        lockoutEndTime = new Date(Date.now() + config.lockoutDurationMinutes * 60 * 1000).toISOString();
        isNowLocked = true;

        db.prepare(`
          UPDATE Users 
          SET FailedLoginCount = ?, LockoutEnd = ? 
          WHERE UserId = ?
        `).run(newFailedCount, lockoutEndTime, user.UserId);

        AuditService.log({
          userId: user.UserId,
          userName: user.Name,
          userRole: user.RoleName,
          action: 'LOCKOUT',
          entityName: 'Auth',
          recordId: String(user.UserId),
          details: `Account locked for ${config.lockoutDurationMinutes} minutes after ${newFailedCount} failed attempts`,
          ipAddress
        });

        return {
          success: false,
          isLocked: true,
          message: `Account has been locked for ${config.lockoutDurationMinutes} minutes due to ${config.maxFailedLogins} consecutive failed login attempts.`
        };
      } else {
        db.prepare(`
          UPDATE Users 
          SET FailedLoginCount = ? 
          WHERE UserId = ?
        `).run(newFailedCount, user.UserId);

        AuditService.log({
          userId: user.UserId,
          userName: user.Name,
          userRole: user.RoleName,
          action: 'FAILED_LOGIN',
          entityName: 'Auth',
          recordId: String(user.UserId),
          details: `Failed password attempt (${newFailedCount}/${config.maxFailedLogins})`,
          ipAddress
        });

        const attemptsLeft = config.maxFailedLogins - newFailedCount;
        return {
          success: false,
          message: `Invalid email or password. ${attemptsLeft} attempt(s) remaining before account lockout.`
        };
      }
    }

    // Successful login - reset failed attempts & update last login
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE Users 
      SET FailedLoginCount = 0, LockoutEnd = NULL, LastLoginDate = ? 
      WHERE UserId = ?
    `).run(nowIso, user.UserId);

    AuditService.log({
      userId: user.UserId,
      userName: user.Name,
      userRole: user.RoleName,
      action: 'LOGIN',
      entityName: 'Auth',
      recordId: String(user.UserId),
      details: 'User successfully authenticated',
      ipAddress
    });

    const sanitizedUser = {
      userId: user.UserId,
      name: user.Name,
      email: user.Email,
      roleId: user.RoleId,
      roleName: user.RoleName,
      isActive: user.IsActive,
      lastLoginDate: nowIso
    };

    const token = jwt.sign(sanitizedUser, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    return {
      success: true,
      user: sanitizedUser,
      token
    };
  }

  /**
   * Register a new user
   */
  static async registerUser({ name, email, password, roleName = 'SalesExecutive', createdBy = null, ipAddress = '127.0.0.1' }) {
    if (!name || !name.trim()) {
      return { success: false, message: 'Full Name is required.' };
    }
    if (!email || !email.trim()) {
      return { success: false, message: 'Email address is required.' };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const existing = db.prepare(`SELECT UserId FROM Users WHERE LOWER(Email) = ?`).get(trimmedEmail);
    if (existing) {
      return { success: false, message: 'An account with this email address already exists.' };
    }

    const policyCheck = this.validatePasswordPolicy(password);
    if (!policyCheck.valid) {
      return { success: false, message: policyCheck.message };
    }

    const role = db.prepare(`SELECT * FROM Roles WHERE RoleName = ?`).get(roleName);
    if (!role) {
      return { success: false, message: `Invalid role specified: ${roleName}` };
    }

    const passwordHash = await this.hashPassword(password);
    const nowIso = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO Users (Name, Email, PasswordHash, RoleId, RoleName, IsActive, FailedLoginCount, CreatedDate)
      VALUES (?, ?, ?, ?, ?, 1, 0, ?)
    `);

    const result = insertStmt.run(name.trim(), trimmedEmail, passwordHash, role.RoleId, role.RoleName, nowIso);
    const newUserId = Number(result.lastInsertRowid);

    AuditService.log({
      userId: createdBy || newUserId,
      userName: name.trim(),
      userRole: role.RoleName,
      action: 'CREATE',
      entityName: 'User',
      recordId: String(newUserId),
      newValue: { userId: newUserId, name: name.trim(), email: trimmedEmail, roleName: role.RoleName },
      details: 'User account registered',
      ipAddress
    });

    return {
      success: true,
      user: {
        userId: newUserId,
        name: name.trim(),
        email: trimmedEmail,
        roleName: role.RoleName
      }
    };
  }
}

module.exports = AuthService;
