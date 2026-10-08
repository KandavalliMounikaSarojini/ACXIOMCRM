const db = require('../database/db');
const AuditService = require('./auditService');

const VALID_TYPES = ['Call', 'Meeting', 'Email', 'Video Demo', 'Quote Review', 'Task'];
const VALID_STATUSES = ['Planned', 'Completed', 'Missed', 'Cancelled'];

class FollowUpService {
  /**
   * Validate follow-up
   */
  static validateFollowUp(data, isUpdate = false) {
    const errors = [];

    if (!data.Subject || !data.Subject.trim()) {
      errors.push({ field: 'Subject', message: 'Subject is required.' });
    }

    if (!data.FollowUpDate) {
      errors.push({ field: 'FollowUpDate', message: 'Follow-up Date is required.' });
    } else {
      const parsedDate = new Date(data.FollowUpDate);
      if (isNaN(parsedDate.getTime())) {
        errors.push({ field: 'FollowUpDate', message: 'Enter a valid Follow-up Date.' });
      } else if (!isUpdate || data.Status === 'Planned') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(data.FollowUpDate);
        targetDate.setHours(0, 0, 0, 0);

        // Date cannot be earlier than today for new or planned follow-ups
        if (targetDate < today) {
          errors.push({ field: 'FollowUpDate', message: 'Follow-up date cannot be earlier than today.' });
        }
      }
    }

    if (data.FollowUpType && !VALID_TYPES.includes(data.FollowUpType)) {
      errors.push({ field: 'FollowUpType', message: `Type must be one of: ${VALID_TYPES.join(', ')}.` });
    }

    if (data.Status && !VALID_STATUSES.includes(data.Status)) {
      errors.push({ field: 'Status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}.` });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get follow-ups with filtering, overdue checks, and role scoping
   */
  static getFollowUps({
    user,
    status = '',
    type = '',
    timeFilter = '', // today, upcoming, overdue
    assignedTo = '',
    customerId = '',
    leadId = '',
    sortBy = 'FollowUpDate',
    sortOrder = 'ASC',
    limit = 50,
    offset = 0
  } = {}) {
    let query = `
      SELECT f.*, 
             c.CustomerName, c.Phone as CustomerPhone, c.Email as CustomerEmail,
             l.LeadName, l.Phone as LeadPhone,
             u.Name as AssignedToName
      FROM FollowUps f
      LEFT JOIN Customers c ON f.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON f.LeadId = l.LeadId
      LEFT JOIN Users u ON f.AssignedTo = u.UserId
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM FollowUps f WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND f.AssignedTo = ?`;
      countQuery += ` AND f.AssignedTo = ?`;
      params.push(user.userId);
      countParams.push(user.userId);
    } else if (assignedTo) {
      query += ` AND f.AssignedTo = ?`;
      countQuery += ` AND f.AssignedTo = ?`;
      params.push(Number(assignedTo));
      countParams.push(Number(assignedTo));
    }

    if (status) {
      query += ` AND f.Status = ?`;
      countQuery += ` AND f.Status = ?`;
      params.push(status);
      countParams.push(status);
    }

    if (type) {
      query += ` AND f.FollowUpType = ?`;
      countQuery += ` AND f.FollowUpType = ?`;
      params.push(type);
      countParams.push(type);
    }

    if (customerId) {
      query += ` AND f.CustomerId = ?`;
      countQuery += ` AND f.CustomerId = ?`;
      params.push(Number(customerId));
      countParams.push(Number(customerId));
    }

    if (leadId) {
      query += ` AND f.LeadId = ?`;
      countQuery += ` AND f.LeadId = ?`;
      params.push(Number(leadId));
      countParams.push(Number(leadId));
    }

    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    if (timeFilter === 'today') {
      query += ` AND f.FollowUpDate LIKE ?`;
      countQuery += ` AND f.FollowUpDate LIKE ?`;
      params.push(`${todayStr}%`);
      countParams.push(`${todayStr}%`);
    } else if (timeFilter === 'upcoming') {
      query += ` AND f.FollowUpDate >= ? AND f.Status = 'Planned'`;
      countQuery += ` AND f.FollowUpDate >= ? AND f.Status = 'Planned'`;
      params.push(nowIso);
      countParams.push(nowIso);
    } else if (timeFilter === 'overdue') {
      query += ` AND f.FollowUpDate < ? AND f.Status = 'Planned'`;
      countQuery += ` AND f.FollowUpDate < ? AND f.Status = 'Planned'`;
      params.push(nowIso);
      countParams.push(nowIso);
    }

    const safeSortCol = ['FollowUpId', 'FollowUpDate', 'Status', 'FollowUpType'].includes(sortBy) ? `f.${sortBy}` : 'f.FollowUpDate';
    const safeSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    query += ` ORDER BY ${safeSortCol} ${safeSortOrder} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);
    const countResult = db.prepare(countQuery).get(...countParams);

    // Compute dynamic isOverdue flag
    const now = new Date();
    const processed = rows.map(item => {
      const fDate = new Date(item.FollowUpDate);
      return {
        ...item,
        isOverdue: item.Status === 'Planned' && fDate < now
      };
    });

    return {
      followUps: processed,
      total: countResult ? countResult.total : 0,
      page: Math.floor(offset / limit) + 1,
      limit
    };
  }

  /**
   * Get single follow up
   */
  static getFollowUpById(followUpId, user = null) {
    let query = `
      SELECT f.*, 
             c.CustomerName, c.Phone as CustomerPhone, c.Email as CustomerEmail,
             l.LeadName, l.Phone as LeadPhone,
             u.Name as AssignedToName
      FROM FollowUps f
      LEFT JOIN Customers c ON f.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON f.LeadId = l.LeadId
      LEFT JOIN Users u ON f.AssignedTo = u.UserId
      WHERE f.FollowUpId = ?
    `;
    const params = [Number(followUpId)];

    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND f.AssignedTo = ?`;
      params.push(user.userId);
    }

    return db.prepare(query).get(...params);
  }

  /**
   * Create follow-up
   */
  static createFollowUp(data, currentUser, ipAddress = '127.0.0.1') {
    const validation = this.validateFollowUp(data, false);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const nowIso = new Date().toISOString();
    const assignedTo = data.AssignedTo ? Number(data.AssignedTo) : (currentUser ? currentUser.userId : null);

    const stmt = db.prepare(`
      INSERT INTO FollowUps (
        CustomerId, LeadId, OpportunityId, FollowUpDate, FollowUpType,
        Subject, Remarks, Status, AssignedTo, CreatedDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.CustomerId ? Number(data.CustomerId) : null,
      data.LeadId ? Number(data.LeadId) : null,
      data.OpportunityId ? Number(data.OpportunityId) : null,
      data.FollowUpDate,
      data.FollowUpType || 'Call',
      data.Subject.trim(),
      data.Remarks ? data.Remarks.trim() : '',
      data.Status || 'Planned',
      assignedTo,
      nowIso
    );

    const newId = Number(result.lastInsertRowid);
    const created = this.getFollowUpById(newId);

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'CREATE',
      entityName: 'FollowUp',
      recordId: String(newId),
      newValue: created,
      details: `Scheduled follow-up: "${created.Subject}" for ${created.FollowUpDate}`,
      ipAddress
    });

    return { success: true, followUp: created };
  }

  /**
   * Update or complete follow-up
   */
  static updateFollowUp(followUpId, data, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getFollowUpById(followUpId, currentUser);
    if (!existing) {
      return { success: false, message: 'Follow-up not found or unauthorized.' };
    }

    const validation = this.validateFollowUp(data, true);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const completedDate = data.Status === 'Completed' ? new Date().toISOString() : existing.CompletedDate;
    const assignedTo = data.AssignedTo !== undefined ? (data.AssignedTo ? Number(data.AssignedTo) : null) : existing.AssignedTo;

    const stmt = db.prepare(`
      UPDATE FollowUps SET
        CustomerId = ?,
        LeadId = ?,
        OpportunityId = ?,
        FollowUpDate = ?,
        FollowUpType = ?,
        Subject = ?,
        Remarks = ?,
        Status = ?,
        AssignedTo = ?,
        CompletedDate = ?
      WHERE FollowUpId = ?
    `);

    stmt.run(
      data.CustomerId ? Number(data.CustomerId) : existing.CustomerId,
      data.LeadId ? Number(data.LeadId) : existing.LeadId,
      data.OpportunityId ? Number(data.OpportunityId) : existing.OpportunityId,
      data.FollowUpDate || existing.FollowUpDate,
      data.FollowUpType || existing.FollowUpType,
      data.Subject ? data.Subject.trim() : existing.Subject,
      data.Remarks !== undefined ? data.Remarks.trim() : existing.Remarks,
      data.Status || existing.Status,
      assignedTo,
      completedDate,
      Number(followUpId)
    );

    const updated = this.getFollowUpById(followUpId);

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'UPDATE',
      entityName: 'FollowUp',
      recordId: String(followUpId),
      oldValue: existing,
      newValue: updated,
      details: `Updated follow-up: "${updated.Subject}" (Status: ${updated.Status})`,
      ipAddress
    });

    return { success: true, followUp: updated };
  }

  /**
   * Delete follow-up
   */
  static deleteFollowUp(followUpId, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getFollowUpById(followUpId, currentUser);
    if (!existing) {
      return { success: false, message: 'Follow-up not found or unauthorized.' };
    }

    db.prepare('DELETE FROM FollowUps WHERE FollowUpId = ?').run(Number(followUpId));

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'DELETE',
      entityName: 'FollowUp',
      recordId: String(followUpId),
      oldValue: existing,
      details: `Deleted follow-up: "${existing.Subject}"`,
      ipAddress
    });

    return { success: true, message: 'Follow-up deleted successfully.' };
  }
}

module.exports = FollowUpService;
