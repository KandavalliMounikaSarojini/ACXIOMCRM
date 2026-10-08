const db = require('../database/db');
const AuditService = require('./auditService');

const VALID_STAGES = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const VALID_STATUSES = ['Open', 'Won', 'Lost', 'Abandoned'];

class OpportunityService {
  /**
   * Validate opportunity payload against business rules
   */
  static validateOpportunity(data, isUpdate = false) {
    const errors = [];

    if (!data.OpportunityName || !data.OpportunityName.trim()) {
      errors.push({ field: 'OpportunityName', message: 'Opportunity Name is required.' });
    } else if (data.OpportunityName.trim().length < 2 || data.OpportunityName.trim().length > 150) {
      errors.push({ field: 'OpportunityName', message: 'Opportunity Name must be between 2 and 150 characters.' });
    }

    // Amount validation
    if (data.Amount === undefined || data.Amount === null || data.Amount === '') {
      errors.push({ field: 'Amount', message: 'Opportunity Amount is required.' });
    } else {
      const amountVal = Number(data.Amount);
      if (isNaN(amountVal) || amountVal <= 0) {
        errors.push({ field: 'Amount', message: 'Opportunity Amount must be greater than 0.' });
      }
    }

    // Probability validation (0 to 100)
    if (data.Probability === undefined || data.Probability === null || data.Probability === '') {
      errors.push({ field: 'Probability', message: 'Probability is required.' });
    } else {
      const probVal = Number(data.Probability);
      if (isNaN(probVal) || probVal < 0 || probVal > 100) {
        errors.push({ field: 'Probability', message: 'Probability must be between 0 and 100.' });
      }
    }

    // Expected Close Date validation (cannot be in past for active opportunities)
    if (!data.ExpectedCloseDate) {
      errors.push({ field: 'ExpectedCloseDate', message: 'Expected Close Date is required.' });
    } else {
      const closeDate = new Date(data.ExpectedCloseDate);
      if (isNaN(closeDate.getTime())) {
        errors.push({ field: 'ExpectedCloseDate', message: 'Enter a valid Expected Close Date.' });
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closeDateOnly = new Date(data.ExpectedCloseDate);
        closeDateOnly.setHours(0, 0, 0, 0);

        // For active/open stages, close date cannot be in past
        const stage = data.Stage || 'Qualification';
        if (!['Won', 'Lost'].includes(stage) && closeDateOnly < today) {
          errors.push({ field: 'ExpectedCloseDate', message: 'Expected Close Date cannot be in the past.' });
        }
      }
    }

    // Stage validation
    if (data.Stage && !VALID_STAGES.includes(data.Stage)) {
      errors.push({ field: 'Stage', message: `Stage must be one of: ${VALID_STAGES.join(', ')}.` });
    }

    // CustomerId validation
    if (data.CustomerId) {
      const customer = db.prepare('SELECT CustomerId FROM Customers WHERE CustomerId = ?').get(Number(data.CustomerId));
      if (!customer) {
        errors.push({ field: 'CustomerId', message: 'Referenced Customer does not exist.' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get opportunities with filtering, role-based scoping, and search
   */
  static getOpportunities({
    user,
    search = '',
    stage = '',
    status = '',
    customerId = '',
    assignedTo = '',
    sortBy = 'OpportunityId',
    sortOrder = 'DESC',
    limit = 20,
    offset = 0
  }) {
    let query = `
      SELECT o.*, 
             c.CustomerName, c.CompanyName as CustomerCompany, c.Email as CustomerEmail,
             u.Name as AssignedToName, u.Email as AssignedToEmail,
             (o.Amount * o.Probability / 100.0) as WeightedAmount
      FROM Opportunities o
      LEFT JOIN Customers c ON o.CustomerId = c.CustomerId
      LEFT JOIN Users u ON o.AssignedTo = u.UserId
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM Opportunities o WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND o.AssignedTo = ?`;
      countQuery += ` AND o.AssignedTo = ?`;
      params.push(user.userId);
      countParams.push(user.userId);
    } else if (assignedTo) {
      query += ` AND o.AssignedTo = ?`;
      countQuery += ` AND o.AssignedTo = ?`;
      params.push(Number(assignedTo));
      countParams.push(Number(assignedTo));
    }

    if (stage) {
      query += ` AND o.Stage = ?`;
      countQuery += ` AND o.Stage = ?`;
      params.push(stage);
      countParams.push(stage);
    }

    if (status) {
      query += ` AND o.Status = ?`;
      countQuery += ` AND o.Status = ?`;
      params.push(status);
      countParams.push(status);
    }

    if (customerId) {
      query += ` AND o.CustomerId = ?`;
      countQuery += ` AND o.CustomerId = ?`;
      params.push(Number(customerId));
      countParams.push(Number(customerId));
    }

    if (search) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      const clause = ` AND (LOWER(o.OpportunityName) LIKE ? OR LOWER(c.CustomerName) LIKE ? OR LOWER(c.CompanyName) LIKE ?)`;
      query += clause;
      countQuery += clause;
      params.push(searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    const allowedSortCols = ['OpportunityId', 'OpportunityName', 'Amount', 'Probability', 'ExpectedCloseDate', 'Stage', 'Status', 'CreatedDate'];
    const safeSortCol = allowedSortCols.includes(sortBy) ? `o.${sortBy}` : 'o.OpportunityId';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${safeSortCol} ${safeSortOrder} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);
    const countResult = db.prepare(countQuery).get(...countParams);

    return {
      opportunities: rows,
      total: countResult ? countResult.total : 0,
      page: Math.floor(offset / limit) + 1,
      limit
    };
  }

  /**
   * Get single opportunity by ID
   */
  static getOpportunityById(opportunityId, user = null) {
    let query = `
      SELECT o.*, 
             c.CustomerName, c.CompanyName as CustomerCompany, c.Email as CustomerEmail, c.Phone as CustomerPhone,
             u.Name as AssignedToName, u.Email as AssignedToEmail,
             (o.Amount * o.Probability / 100.0) as WeightedAmount
      FROM Opportunities o
      LEFT JOIN Customers c ON o.CustomerId = c.CustomerId
      LEFT JOIN Users u ON o.AssignedTo = u.UserId
      WHERE o.OpportunityId = ?
    `;
    const params = [Number(opportunityId)];

    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND o.AssignedTo = ?`;
      params.push(user.userId);
    }

    return db.prepare(query).get(...params);
  }

  /**
   * Create opportunity
   */
  static createOpportunity(data, currentUser, ipAddress = '127.0.0.1') {
    const validation = this.validateOpportunity(data, false);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const nowIso = new Date().toISOString();
    const assignedTo = data.AssignedTo ? Number(data.AssignedTo) : (currentUser ? currentUser.userId : null);
    const status = data.Stage === 'Won' ? 'Won' : (data.Stage === 'Lost' ? 'Lost' : 'Open');

    const stmt = db.prepare(`
      INSERT INTO Opportunities (
        OpportunityName, CustomerId, LeadId, Amount, Stage,
        Probability, ExpectedCloseDate, Status, AssignedTo, Notes,
        CreatedDate, ModifiedDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.OpportunityName.trim(),
      data.CustomerId ? Number(data.CustomerId) : null,
      data.LeadId ? Number(data.LeadId) : null,
      Number(data.Amount),
      data.Stage || 'Qualification',
      Number(data.Probability),
      data.ExpectedCloseDate,
      status,
      assignedTo,
      data.Notes ? data.Notes.trim() : '',
      nowIso,
      nowIso
    );

    const newOppId = Number(result.lastInsertRowid);
    const createdOpp = this.getOpportunityById(newOppId);

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'CREATE',
      entityName: 'Opportunity',
      recordId: String(newOppId),
      newValue: createdOpp,
      details: `Created opportunity: ${createdOpp.OpportunityName} ($${createdOpp.Amount.toLocaleString()})`,
      ipAddress
    });

    return { success: true, opportunity: createdOpp };
  }

  /**
   * Update opportunity
   */
  static updateOpportunity(opportunityId, data, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getOpportunityById(opportunityId, currentUser);
    if (!existing) {
      return { success: false, message: 'Opportunity not found or unauthorized.' };
    }

    const validation = this.validateOpportunity(data, true);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const nowIso = new Date().toISOString();
    const stage = data.Stage || existing.Stage;
    const status = stage === 'Won' ? 'Won' : (stage === 'Lost' ? 'Lost' : (data.Status || existing.Status));
    const assignedTo = data.AssignedTo !== undefined ? (data.AssignedTo ? Number(data.AssignedTo) : null) : existing.AssignedTo;

    const stmt = db.prepare(`
      UPDATE Opportunities SET
        OpportunityName = ?,
        CustomerId = ?,
        Amount = ?,
        Stage = ?,
        Probability = ?,
        ExpectedCloseDate = ?,
        Status = ?,
        AssignedTo = ?,
        Notes = ?,
        ModifiedDate = ?
      WHERE OpportunityId = ?
    `);

    stmt.run(
      data.OpportunityName.trim(),
      data.CustomerId ? Number(data.CustomerId) : null,
      Number(data.Amount),
      stage,
      Number(data.Probability),
      data.ExpectedCloseDate,
      status,
      assignedTo,
      data.Notes !== undefined ? data.Notes.trim() : existing.Notes,
      nowIso,
      Number(opportunityId)
    );

    const updatedOpp = this.getOpportunityById(opportunityId);

    // Audit stage change specifically if stage changed
    const action = existing.Stage !== stage ? 'STAGE_CHANGE' : 'UPDATE';
    const details = existing.Stage !== stage
      ? `Opportunity stage changed from ${existing.Stage} to ${stage}`
      : `Updated opportunity: ${updatedOpp.OpportunityName}`;

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action,
      entityName: 'Opportunity',
      recordId: String(opportunityId),
      oldValue: existing,
      newValue: updatedOpp,
      details,
      ipAddress
    });

    return { success: true, opportunity: updatedOpp };
  }

  /**
   * Delete opportunity
   */
  static deleteOpportunity(opportunityId, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getOpportunityById(opportunityId, currentUser);
    if (!existing) {
      return { success: false, message: 'Opportunity not found or unauthorized.' };
    }

    db.prepare('DELETE FROM Opportunities WHERE OpportunityId = ?').run(Number(opportunityId));

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'DELETE',
      entityName: 'Opportunity',
      recordId: String(opportunityId),
      oldValue: existing,
      details: `Deleted opportunity: ${existing.OpportunityName}`,
      ipAddress
    });

    return { success: true, message: 'Opportunity deleted successfully.' };
  }

  /**
   * Get Kanban grouped opportunities
   */
  static getKanbanPipeline(user) {
    const oppsResult = this.getOpportunities({ user, limit: 200 });
    const grouped = {
      Qualification: [],
      Proposal: [],
      Negotiation: [],
      Won: [],
      Lost: []
    };

    let totalPipeline = 0;
    let weightedPipeline = 0;

    for (const opp of oppsResult.opportunities) {
      if (grouped[opp.Stage]) {
        grouped[opp.Stage].push(opp);
      }
      if (opp.Status === 'Open' || !['Won', 'Lost'].includes(opp.Stage)) {
        totalPipeline += opp.Amount;
        weightedPipeline += (opp.Amount * opp.Probability / 100);
      }
    }

    return {
      grouped,
      totalPipeline,
      weightedPipeline,
      totalCount: oppsResult.opportunities.length
    };
  }
}

module.exports = OpportunityService;
