const db = require('../database/db');
const AuditService = require('./auditService');

const VALID_TYPES = ['Call', 'Meeting', 'Email', 'Task'];
const VALID_STATUSES = ['Completed', 'Pending', 'In-Progress'];

class ActivityService {
  /**
   * Validate activity
   */
  static validateActivity(data) {
    const errors = [];

    if (!data.Subject || !data.Subject.trim()) {
      errors.push({ field: 'Subject', message: 'Subject is required.' });
    }

    if (!data.ActivityDate) {
      errors.push({ field: 'ActivityDate', message: 'Activity Date is required.' });
    }

    if (data.ActivityType && !VALID_TYPES.includes(data.ActivityType)) {
      errors.push({ field: 'ActivityType', message: `Type must be one of: ${VALID_TYPES.join(', ')}.` });
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
   * Get activities with filtering and role scoping
   */
  static getActivities({
    user,
    type = '',
    status = '',
    assignedTo = '',
    customerId = '',
    leadId = '',
    opportunityId = '',
    sortBy = 'ActivityDate',
    sortOrder = 'DESC',
    limit = 50,
    offset = 0
  } = {}) {
    let query = `
      SELECT a.*,
             c.CustomerName, c.Phone as CustomerPhone, c.Email as CustomerEmail,
             l.LeadName,
             o.OpportunityName,
             u.Name as AssignedToName
      FROM Activities a
      LEFT JOIN Customers c ON a.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON a.LeadId = l.LeadId
      LEFT JOIN Opportunities o ON a.OpportunityId = o.OpportunityId
      LEFT JOIN Users u ON a.AssignedTo = u.UserId
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM Activities a WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND a.AssignedTo = ?`;
      countQuery += ` AND a.AssignedTo = ?`;
      params.push(user.userId);
      countParams.push(user.userId);
    } else if (assignedTo) {
      query += ` AND a.AssignedTo = ?`;
      countQuery += ` AND a.AssignedTo = ?`;
      params.push(Number(assignedTo));
      countParams.push(Number(assignedTo));
    }

    if (type) {
      query += ` AND a.ActivityType = ?`;
      countQuery += ` AND a.ActivityType = ?`;
      params.push(type);
      countParams.push(type);
    }

    if (status) {
      query += ` AND a.Status = ?`;
      countQuery += ` AND a.Status = ?`;
      params.push(status);
      countParams.push(status);
    }

    if (customerId) {
      query += ` AND a.CustomerId = ?`;
      countQuery += ` AND a.CustomerId = ?`;
      params.push(Number(customerId));
      countParams.push(Number(customerId));
    }

    if (leadId) {
      query += ` AND a.LeadId = ?`;
      countQuery += ` AND a.LeadId = ?`;
      params.push(Number(leadId));
      countParams.push(Number(leadId));
    }

    if (opportunityId) {
      query += ` AND a.OpportunityId = ?`;
      countQuery += ` AND a.OpportunityId = ?`;
      params.push(Number(opportunityId));
      countParams.push(Number(opportunityId));
    }

    const safeSortCol = ['ActivityId', 'ActivityDate', 'ActivityType', 'Status'].includes(sortBy) ? `a.${sortBy}` : 'a.ActivityDate';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${safeSortCol} ${safeSortOrder} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);
    const countResult = db.prepare(countQuery).get(...countParams);

    return {
      activities: rows,
      total: countResult ? countResult.total : 0,
      page: Math.floor(offset / limit) + 1,
      limit
    };
  }

  /**
   * Get single activity by ID
   */
  static getActivityById(activityId, user = null) {
    let query = `
      SELECT a.*,
             c.CustomerName, c.Phone as CustomerPhone, c.Email as CustomerEmail,
             l.LeadName,
             o.OpportunityName,
             u.Name as AssignedToName
      FROM Activities a
      LEFT JOIN Customers c ON a.CustomerId = c.CustomerId
      LEFT JOIN Leads l ON a.LeadId = l.LeadId
      LEFT JOIN Opportunities o ON a.OpportunityId = o.OpportunityId
      LEFT JOIN Users u ON a.AssignedTo = u.UserId
      WHERE a.ActivityId = ?
    `;
    const params = [Number(activityId)];

    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND a.AssignedTo = ?`;
      params.push(user.userId);
    }

    return db.prepare(query).get(...params);
  }

  /**
   * Create activity
   */
  static createActivity(data, currentUser, ipAddress = '127.0.0.1') {
    const validation = this.validateActivity(data);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const nowIso = new Date().toISOString();
    const assignedTo = data.AssignedTo ? Number(data.AssignedTo) : (currentUser ? currentUser.userId : null);

    const stmt = db.prepare(`
      INSERT INTO Activities (
        ActivityType, Subject, Description, ActivityDate,
        CustomerId, LeadId, OpportunityId, AssignedTo, Status, CreatedDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.ActivityType || 'Call',
      data.Subject.trim(),
      data.Description ? data.Description.trim() : '',
      data.ActivityDate,
      data.CustomerId ? Number(data.CustomerId) : null,
      data.LeadId ? Number(data.LeadId) : null,
      data.OpportunityId ? Number(data.OpportunityId) : null,
      assignedTo,
      data.Status || 'Completed',
      nowIso
    );

    const newId = Number(result.lastInsertRowid);
    const created = this.getActivityById(newId);

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'CREATE',
      entityName: 'Activity',
      recordId: String(newId),
      newValue: created,
      details: `Logged ${created.ActivityType} activity: "${created.Subject}"`,
      ipAddress
    });

    return { success: true, activity: created };
  }
}

module.exports = ActivityService;
