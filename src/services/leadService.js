const validator = require('validator');
const db = require('../database/db');
const AuditService = require('./auditService');

const VALID_STATUSES = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'];
const VALID_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Exhibition', 'Email Campaign', 'Other'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

class LeadService {
  /**
   * Validate lead data
   */
  static validateLead(data) {
    const errors = [];

    if (!data.LeadName || !data.LeadName.trim()) {
      errors.push({ field: 'LeadName', message: 'Lead Name is required.' });
    } else if (data.LeadName.trim().length < 2 || data.LeadName.trim().length > 100) {
      errors.push({ field: 'LeadName', message: 'Lead Name must be between 2 and 100 characters.' });
    }

    if (!data.Email || !data.Email.trim()) {
      errors.push({ field: 'Email', message: 'Email address is required.' });
    } else if (!validator.isEmail(data.Email.trim())) {
      errors.push({ field: 'Email', message: 'Enter a valid email address.' });
    }

    if (!data.Phone || !data.Phone.trim()) {
      errors.push({ field: 'Phone', message: 'Phone number is required.' });
    } else {
      const cleaned = data.Phone.replace(/[\s\-\(\)\+]/g, '');
      if (!/^\d{10,15}$/.test(cleaned)) {
        errors.push({ field: 'Phone', message: 'Enter a valid phone number (10 to 15 digits).' });
      }
    }

    if (data.Status && !VALID_STATUSES.includes(data.Status)) {
      errors.push({ field: 'Status', message: `Status must be one of: ${VALID_STATUSES.join(', ')}.` });
    }

    if (data.ExpectedValue !== undefined && data.ExpectedValue !== '') {
      const val = Number(data.ExpectedValue);
      if (isNaN(val) || val < 0) {
        errors.push({ field: 'ExpectedValue', message: 'Expected Value must be a number greater than or equal to 0.' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate sequential lead code
   */
  static generateLeadCode() {
    const row = db.prepare('SELECT MAX(LeadId) as maxId FROM Leads').get();
    const nextId = (row && row.maxId ? row.maxId : 0) + 1;
    return `LEAD-${String(nextId).padStart(4, '0')}`;
  }

  /**
   * Get leads with filtering, search, and role scoping
   */
  static getLeads({
    user,
    search = '',
    status = '',
    source = '',
    priority = '',
    assignedTo = '',
    sortBy = 'LeadId',
    sortOrder = 'DESC',
    limit = 20,
    offset = 0
  }) {
    let query = `
      SELECT l.*, u.Name as AssignedToName, u.Email as AssignedToEmail
      FROM Leads l
      LEFT JOIN Users u ON l.AssignedTo = u.UserId
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM Leads l WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND l.AssignedTo = ?`;
      countQuery += ` AND l.AssignedTo = ?`;
      params.push(user.userId);
      countParams.push(user.userId);
    } else if (assignedTo) {
      query += ` AND l.AssignedTo = ?`;
      countQuery += ` AND l.AssignedTo = ?`;
      params.push(Number(assignedTo));
      countParams.push(Number(assignedTo));
    }

    if (status) {
      query += ` AND l.Status = ?`;
      countQuery += ` AND l.Status = ?`;
      params.push(status);
      countParams.push(status);
    }

    if (source) {
      query += ` AND l.Source = ?`;
      countQuery += ` AND l.Source = ?`;
      params.push(source);
      countParams.push(source);
    }

    if (priority) {
      query += ` AND l.Priority = ?`;
      countQuery += ` AND l.Priority = ?`;
      params.push(priority);
      countParams.push(priority);
    }

    if (search) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      const clause = ` AND (LOWER(l.LeadName) LIKE ? OR LOWER(l.Email) LIKE ? OR l.Phone LIKE ? OR LOWER(l.CompanyName) LIKE ? OR LOWER(l.LeadCode) LIKE ?)`;
      query += clause;
      countQuery += clause;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const allowedSortCols = ['LeadId', 'LeadName', 'Email', 'Status', 'Priority', 'ExpectedValue', 'CreatedDate'];
    const safeSortCol = allowedSortCols.includes(sortBy) ? `l.${sortBy}` : 'l.LeadId';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${safeSortCol} ${safeSortOrder} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params).map(r => ({
      ...r,
      LeadScore: LeadService.calculateLeadScore(r)
    }));
    const countResult = db.prepare(countQuery).get(...countParams);

    return {
      leads: rows,
      total: countResult ? countResult.total : 0,
      page: Math.floor(offset / limit) + 1,
      limit
    };
  }

  /**
   * Calculate LeadScore 360 predictive scoring (0 - 100)
   */
  static calculateLeadScore(lead) {
    if (!lead) return { score: 30, grade: 'Cold', badgeClass: 'bg-secondary' };
    let score = 25;
    
    // Source weighting
    if (lead.Source === 'Referral') score += 35;
    else if (lead.Source === 'Website') score += 25;
    else if (lead.Source === 'LinkedIn') score += 20;
    else if (lead.Source === 'Cold Call' || lead.Source === 'Cold Outreach') score += 10;
    else score += 15;

    // Priority weighting
    if (lead.Priority === 'Urgent') score += 30;
    else if (lead.Priority === 'High') score += 20;
    else if (lead.Priority === 'Medium') score += 10;
    else score += 5;

    // Expected value weighting
    const val = Number(lead.ExpectedValue || 0);
    if (val >= 50000) score += 20;
    else if (val >= 15000) score += 12;
    else if (val > 0) score += 5;

    // Engagement status weighting
    if (lead.Status === 'Qualified') score += 15;
    else if (lead.Status === 'Contacted') score += 10;
    else if (lead.Status === 'Lost' || lead.Status === 'Unqualified') score = Math.min(score, 20);

    score = Math.min(Math.max(score, 10), 99);
    let grade = 'Cold';
    let badgeClass = 'badge bg-info text-dark';
    if (score >= 75) {
      grade = 'Hot';
      badgeClass = 'badge bg-danger text-white';
    } else if (score >= 45) {
      grade = 'Warm';
      badgeClass = 'badge bg-warning text-dark';
    }

    return { score, grade, badgeClass };
  }

  /**
   * Get single lead by ID
   */
  static getLeadById(leadId, user = null) {
    let query = `
      SELECT l.*, u.Name as AssignedToName, u.Email as AssignedToEmail,
             c.CustomerName as ConvertedCustomerName,
             o.OpportunityName as ConvertedOpportunityName
      FROM Leads l
      LEFT JOIN Users u ON l.AssignedTo = u.UserId
      LEFT JOIN Customers c ON l.ConvertedCustomerId = c.CustomerId
      LEFT JOIN Opportunities o ON l.ConvertedOpportunityId = o.OpportunityId
      WHERE l.LeadId = ?
    `;
    const params = [Number(leadId)];

    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND l.AssignedTo = ?`;
      params.push(user.userId);
    }

    const lead = db.prepare(query).get(...params);
    if (!lead) return null;
    return {
      ...lead,
      LeadScore: LeadService.calculateLeadScore(lead)
    };
  }

  /**
   * Create lead
   */
  static createLead(data, currentUser, ipAddress = '127.0.0.1') {
    const validation = this.validateLead(data);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const leadCode = this.generateLeadCode();
    const nowIso = new Date().toISOString();
    const assignedTo = data.AssignedTo ? Number(data.AssignedTo) : (currentUser ? currentUser.userId : null);

    const stmt = db.prepare(`
      INSERT INTO Leads (
        LeadCode, LeadName, Email, Phone, CompanyName, Source,
        Status, Priority, ExpectedValue, AssignedTo, Notes,
        CreatedDate, ModifiedDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      leadCode,
      data.LeadName.trim(),
      data.Email.trim().toLowerCase(),
      data.Phone.trim(),
      data.CompanyName ? data.CompanyName.trim() : '',
      data.Source || 'Website',
      data.Status || 'New',
      data.Priority || 'Medium',
      data.ExpectedValue ? Number(data.ExpectedValue) : 0,
      assignedTo,
      data.Notes ? data.Notes.trim() : '',
      nowIso,
      nowIso
    );

    const newLeadId = Number(result.lastInsertRowid);
    const createdLead = this.getLeadById(newLeadId);

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'CREATE',
      entityName: 'Lead',
      recordId: String(newLeadId),
      newValue: createdLead,
      details: `Created lead: ${createdLead.LeadName} (${createdLead.LeadCode})`,
      ipAddress
    });

    return { success: true, lead: createdLead };
  }

  /**
   * Update lead
   */
  static updateLead(leadId, data, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getLeadById(leadId, currentUser);
    if (!existing) {
      return { success: false, message: 'Lead not found or unauthorized.' };
    }

    const validation = this.validateLead(data);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const nowIso = new Date().toISOString();
    const assignedTo = data.AssignedTo !== undefined ? (data.AssignedTo ? Number(data.AssignedTo) : null) : existing.AssignedTo;

    const stmt = db.prepare(`
      UPDATE Leads SET
        LeadName = ?,
        Email = ?,
        Phone = ?,
        CompanyName = ?,
        Source = ?,
        Status = ?,
        Priority = ?,
        ExpectedValue = ?,
        AssignedTo = ?,
        Notes = ?,
        ModifiedDate = ?
      WHERE LeadId = ?
    `);

    stmt.run(
      data.LeadName.trim(),
      data.Email.trim().toLowerCase(),
      data.Phone.trim(),
      data.CompanyName ? data.CompanyName.trim() : '',
      data.Source || existing.Source,
      data.Status || existing.Status,
      data.Priority || existing.Priority,
      data.ExpectedValue !== undefined ? Number(data.ExpectedValue) : existing.ExpectedValue,
      assignedTo,
      data.Notes !== undefined ? data.Notes.trim() : existing.Notes,
      nowIso,
      Number(leadId)
    );

    const updatedLead = this.getLeadById(leadId);

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'UPDATE',
      entityName: 'Lead',
      recordId: String(leadId),
      oldValue: existing,
      newValue: updatedLead,
      details: `Updated lead: ${updatedLead.LeadName}`,
      ipAddress
    });

    return { success: true, lead: updatedLead };
  }

  /**
   * Convert Lead to Customer and Opportunity (Core CRM Workflow)
   */
  static convertLead(leadId, convertOptions, currentUser, ipAddress = '127.0.0.1') {
    const lead = this.getLeadById(leadId, currentUser);
    if (!lead) {
      return { success: false, message: 'Lead not found or unauthorized.' };
    }

    if (lead.Status === 'Converted') {
      return { success: false, message: 'This lead has already been converted.' };
    }

    const CustomerService = require('./customerService');
    const OpportunityService = require('./opportunityService');

    const nowIso = new Date().toISOString();

    // 1. Create or link Customer
    let customer = null;
    const existingCustomer = db.prepare('SELECT * FROM Customers WHERE LOWER(Email) = ?').get(lead.Email.toLowerCase());
    
    if (existingCustomer) {
      customer = existingCustomer;
    } else {
      const custResult = CustomerService.createCustomer({
        CustomerName: convertOptions.CustomerName || lead.LeadName,
        Email: lead.Email,
        Phone: lead.Phone,
        CompanyName: lead.CompanyName,
        Address: convertOptions.Address || '',
        City: convertOptions.City || '',
        State: convertOptions.State || '',
        Status: 'Active',
        OwnerId: lead.AssignedTo || (currentUser ? currentUser.userId : null),
        Notes: `Converted from Lead ${lead.LeadCode}. Original notes: ${lead.Notes || 'None'}`
      }, currentUser, ipAddress);

      if (!custResult.success) {
        return { success: false, message: 'Failed to create Customer during lead conversion: ' + (custResult.errors ? custResult.errors.map(e => e.message).join(', ') : custResult.message) };
      }
      customer = custResult.customer;
    }

    // 2. Create Opportunity if requested (default true)
    let opportunity = null;
    if (convertOptions.createOpportunity !== false) {
      const expectedClose = convertOptions.ExpectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const oppResult = OpportunityService.createOpportunity({
        OpportunityName: convertOptions.OpportunityName || `${lead.CompanyName || lead.LeadName} - Deal`,
        CustomerId: customer.CustomerId,
        LeadId: lead.LeadId,
        Amount: convertOptions.Amount !== undefined ? Number(convertOptions.Amount) : (lead.ExpectedValue > 0 ? lead.ExpectedValue : 10000),
        Stage: convertOptions.Stage || 'Qualification',
        Probability: convertOptions.Probability !== undefined ? Number(convertOptions.Probability) : 30,
        ExpectedCloseDate: expectedClose,
        AssignedTo: lead.AssignedTo || (currentUser ? currentUser.userId : null),
        Notes: `Originated from Lead conversion (${lead.LeadCode}).`
      }, currentUser, ipAddress);

      if (!oppResult.success) {
        return { success: false, message: 'Failed to create Opportunity during lead conversion: ' + (oppResult.errors ? oppResult.errors.map(e => e.message).join(', ') : oppResult.message) };
      }
      opportunity = oppResult.opportunity;
    }

    // 3. Mark Lead as Converted
    db.prepare(`
      UPDATE Leads SET
        Status = 'Converted',
        ConvertedCustomerId = ?,
        ConvertedOpportunityId = ?,
        ModifiedDate = ?
      WHERE LeadId = ?
    `).run(
      customer.CustomerId,
      opportunity ? opportunity.OpportunityId : null,
      nowIso,
      lead.LeadId
    );

    const convertedLead = this.getLeadById(lead.LeadId);

    // 4. Log conversion event
    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'CONVERT',
      entityName: 'Lead',
      recordId: String(lead.LeadId),
      oldValue: lead,
      newValue: convertedLead,
      details: `Lead ${lead.LeadCode} converted to Customer #${customer.CustomerId} (${customer.CustomerName}) and Opportunity #${opportunity ? opportunity.OpportunityId : 'N/A'}`,
      ipAddress
    });

    return {
      success: true,
      lead: convertedLead,
      customer,
      opportunity,
      message: 'Lead successfully converted to Customer and Opportunity!'
    };
  }

  /**
   * Delete lead
   */
  static deleteLead(leadId, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getLeadById(leadId, currentUser);
    if (!existing) {
      return { success: false, message: 'Lead not found or unauthorized.' };
    }

    db.prepare('DELETE FROM Leads WHERE LeadId = ?').run(Number(leadId));

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'DELETE',
      entityName: 'Lead',
      recordId: String(leadId),
      oldValue: existing,
      details: `Deleted lead: ${existing.LeadName}`,
      ipAddress
    });

    return { success: true, message: 'Lead deleted successfully.' };
  }
}

module.exports = LeadService;
