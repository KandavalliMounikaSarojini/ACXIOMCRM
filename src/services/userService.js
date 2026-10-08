const db = require('../database/db');
const AuthService = require('./authService');
const AuditService = require('./auditService');

class UserService {
  /**
   * Get all users (sanitized, no password hash exposed)
   */
  static getUsers({ search = '', role = '', status = '', limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT UserId, Name, Email, RoleId, RoleName, IsActive,
             FailedLoginCount, LockoutEnd, CreatedDate, LastLoginDate
      FROM Users
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM Users WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (role) {
      query += ` AND RoleName = ?`;
      countQuery += ` AND RoleName = ?`;
      params.push(role);
      countParams.push(role);
    }

    if (status !== '') {
      const isActiveNum = status === 'active' || status === '1' ? 1 : 0;
      query += ` AND IsActive = ?`;
      countQuery += ` AND IsActive = ?`;
      params.push(isActiveNum);
      countParams.push(isActiveNum);
    }

    if (search) {
      const pattern = `%${search.trim().toLowerCase()}%`;
      query += ` AND (LOWER(Name) LIKE ? OR LOWER(Email) LIKE ? OR LOWER(RoleName) LIKE ?)`;
      countQuery += ` AND (LOWER(Name) LIKE ? OR LOWER(Email) LIKE ? OR LOWER(RoleName) LIKE ?)`;
      params.push(pattern, pattern, pattern);
      countParams.push(pattern, pattern, pattern);
    }

    query += ` ORDER BY UserId ASC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);
    const countResult = db.prepare(countQuery).get(...countParams);

    const now = new Date();
    const processed = rows.map(u => ({
      ...u,
      isLocked: u.LockoutEnd ? new Date(u.LockoutEnd) > now : false
    }));

    return {
      users: processed,
      total: countResult ? countResult.total : 0,
      page: Math.floor(offset / limit) + 1,
      limit
    };
  }

  /**
   * Get single user by ID (sanitized)
   */
  static getUserById(userId) {
    const user = db.prepare(`
      SELECT UserId, Name, Email, RoleId, RoleName, IsActive,
             FailedLoginCount, LockoutEnd, CreatedDate, LastLoginDate
      FROM Users
      WHERE UserId = ?
    `).get(Number(userId));

    if (!user) return null;

    const now = new Date();
    return {
      ...user,
      isLocked: user.LockoutEnd ? new Date(user.LockoutEnd) > now : false
    };
  }

  /**
   * Get all active sales executives for assignment dropdowns
   */
  static getSalesExecutives() {
    return db.prepare(`
      SELECT UserId, Name, Email, RoleName
      FROM Users
      WHERE IsActive = 1 AND RoleName IN ('SalesExecutive', 'Manager', 'Admin')
      ORDER BY Name ASC
    `).all();
  }

  /**
   * Get all available roles
   */
  static getRoles() {
    return db.prepare('SELECT * FROM Roles ORDER BY RoleId ASC').all();
  }

  /**
   * Create a new user (Admin function)
   */
  static async createUser(data, currentUser, ipAddress = '127.0.0.1') {
    const result = await AuthService.registerUser({
      name: data.Name,
      email: data.Email,
      password: data.Password,
      roleName: data.RoleName || 'SalesExecutive',
      createdBy: currentUser ? currentUser.userId : null,
      ipAddress
    });

    return result;
  }

  /**
   * Update user details and role
   */
  static updateUser(userId, data, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getUserById(userId);
    if (!existing) {
      return { success: false, message: 'User not found.' };
    }

    const errors = [];
    if (!data.Name || !data.Name.trim()) {
      errors.push({ field: 'Name', message: 'Name is required.' });
    }

    if (!data.Email || !data.Email.trim()) {
      errors.push({ field: 'Email', message: 'Email is required.' });
    } else {
      const emailExists = db.prepare('SELECT UserId FROM Users WHERE LOWER(Email) = ? AND UserId != ?')
        .get(data.Email.trim().toLowerCase(), Number(userId));
      if (emailExists) {
        errors.push({ field: 'Email', message: 'Another user is already registered with this email.' });
      }
    }

    let role = null;
    if (data.RoleName) {
      role = db.prepare('SELECT * FROM Roles WHERE RoleName = ?').get(data.RoleName);
      if (!role) {
        errors.push({ field: 'RoleName', message: 'Invalid role.' });
      }
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const roleName = role ? role.RoleName : existing.RoleName;
    const roleId = role ? role.RoleId : existing.RoleId;
    const isActive = data.IsActive !== undefined ? (data.IsActive === '1' || data.IsActive === 1 || data.IsActive === true ? 1 : 0) : existing.IsActive;

    db.prepare(`
      UPDATE Users SET
        Name = ?,
        Email = ?,
        RoleId = ?,
        RoleName = ?,
        IsActive = ?
      WHERE UserId = ?
    `).run(
      data.Name.trim(),
      data.Email.trim().toLowerCase(),
      roleId,
      roleName,
      isActive,
      Number(userId)
    );

    const updated = this.getUserById(userId);

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: existing.RoleName !== roleName ? 'ROLE_CHANGE' : 'UPDATE',
      entityName: 'User',
      recordId: String(userId),
      oldValue: existing,
      newValue: updated,
      details: existing.RoleName !== roleName ? `User role changed to ${roleName}` : `User updated: ${updated.Name}`,
      ipAddress
    });

    return { success: true, user: updated };
  }

  /**
   * Reset user password (Admin function)
   */
  static async resetPassword(userId, newPassword, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getUserById(userId);
    if (!existing) {
      return { success: false, message: 'User not found.' };
    }

    const policy = AuthService.validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return { success: false, message: policy.message };
    }

    const hash = await AuthService.hashPassword(newPassword);

    db.prepare(`
      UPDATE Users SET
        PasswordHash = ?,
        FailedLoginCount = 0,
        LockoutEnd = NULL
      WHERE UserId = ?
    `).run(hash, Number(userId));

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'PASSWORD_RESET',
      entityName: 'User',
      recordId: String(userId),
      details: `Password reset performed by Admin for user: ${existing.Email}`,
      ipAddress
    });

    return { success: true, message: 'Password reset successfully.' };
  }

  /**
   * Unlock locked user account
   */
  static unlockAccount(userId, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getUserById(userId);
    if (!existing) {
      return { success: false, message: 'User not found.' };
    }

    db.prepare(`
      UPDATE Users SET
        FailedLoginCount = 0,
        LockoutEnd = NULL
      WHERE UserId = ?
    `).run(Number(userId));

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'UNLOCK',
      entityName: 'User',
      recordId: String(userId),
      details: `Account unlocked by Admin for user: ${existing.Email}`,
      ipAddress
    });

    return { success: true, message: 'Account successfully unlocked.' };
  }
}

module.exports = UserService;
