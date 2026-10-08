const db = require('../database/db');

class AuditService {
  /**
   * Log an audit event
   */
  static log({
    userId = null,
    userName = 'System',
    userRole = 'System',
    action,
    entityName,
    recordId = null,
    oldValue = null,
    newValue = null,
    details = '',
    ipAddress = '127.0.0.1'
  }) {
    try {
      const stmt = db.prepare(`
        INSERT INTO AuditLogs (
          UserId, UserName, UserRole, Action, EntityName, RecordId,
          OldValue, NewValue, Details, IpAddress, CreatedDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const oldValJson = oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : null;
      const newValJson = newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : null;
      const now = new Date().toISOString();

      stmt.run(
        userId,
        userName,
        userRole,
        action,
        entityName,
        recordId ? String(recordId) : null,
        oldValJson,
        newValJson,
        details,
        ipAddress,
        now
      );
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
    }
  }

  /**
   * Fetch audit logs with rich filtering & pagination
   */
  static getLogs({
    entityName,
    recordId,
    userId,
    action,
    startDate,
    endDate,
    search,
    limit = 50,
    offset = 0
  } = {}) {
    let query = `SELECT * FROM AuditLogs WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM AuditLogs WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (entityName) {
      query += ` AND EntityName = ?`;
      countQuery += ` AND EntityName = ?`;
      params.push(entityName);
      countParams.push(entityName);
    }

    if (recordId) {
      query += ` AND RecordId = ?`;
      countQuery += ` AND RecordId = ?`;
      params.push(String(recordId));
      countParams.push(String(recordId));
    }

    if (userId) {
      query += ` AND UserId = ?`;
      countQuery += ` AND UserId = ?`;
      params.push(Number(userId));
      countParams.push(Number(userId));
    }

    if (action) {
      query += ` AND Action = ?`;
      countQuery += ` AND Action = ?`;
      params.push(action);
      countParams.push(action);
    }

    if (startDate) {
      query += ` AND CreatedDate >= ?`;
      countQuery += ` AND CreatedDate >= ?`;
      params.push(startDate);
      countParams.push(startDate);
    }

    if (endDate) {
      query += ` AND CreatedDate <= ?`;
      countQuery += ` AND CreatedDate <= ?`;
      params.push(endDate + 'T23:59:59.999Z');
      countParams.push(endDate + 'T23:59:59.999Z');
    }

    if (search) {
      const searchPattern = `%${search}%`;
      query += ` AND (UserName LIKE ? OR Action LIKE ? OR EntityName LIKE ? OR Details LIKE ?)`;
      countQuery += ` AND (UserName LIKE ? OR Action LIKE ? OR EntityName LIKE ? OR Details LIKE ?)`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    query += ` ORDER BY AuditLogId DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);
    const countResult = db.prepare(countQuery).get(...countParams);

    return {
      logs: rows,
      total: countResult ? countResult.total : 0,
      page: Math.floor(offset / limit) + 1,
      limit
    };
  }

  static getLogById(id) {
    return db.prepare(`SELECT * FROM AuditLogs WHERE AuditLogId = ?`).get(id);
  }
}

module.exports = AuditService;
