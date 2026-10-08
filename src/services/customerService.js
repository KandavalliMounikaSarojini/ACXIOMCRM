const validator = require('validator');
const db = require('../database/db');
const AuditService = require('./auditService');

class CustomerService {
  /**
   * Validate customer input payload
   */
  static validateCustomer(data, isUpdate = false, customerId = null) {
    const errors = [];

    // Required and length checks
    if (!data.CustomerName || !data.CustomerName.trim()) {
      errors.push({ field: 'CustomerName', message: 'Customer Name is required.' });
    } else if (data.CustomerName.trim().length < 2 || data.CustomerName.trim().length > 100) {
      errors.push({ field: 'CustomerName', message: 'Customer Name must be between 2 and 100 characters.' });
    }

    // Email validation & uniqueness
    if (!data.Email || !data.Email.trim()) {
      errors.push({ field: 'Email', message: 'Email address is required.' });
    } else if (!validator.isEmail(data.Email.trim())) {
      errors.push({ field: 'Email', message: 'Enter a valid email address.' });
    } else {
      const emailQuery = isUpdate
        ? `SELECT CustomerId FROM Customers WHERE LOWER(Email) = ? AND CustomerId != ?`
        : `SELECT CustomerId FROM Customers WHERE LOWER(Email) = ?`;
      const params = isUpdate ? [data.Email.trim().toLowerCase(), customerId] : [data.Email.trim().toLowerCase()];
      const existingEmail = db.prepare(emailQuery).get(...params);
      if (existingEmail) {
        errors.push({ field: 'Email', message: 'A customer with this email address already exists.' });
      }
    }

    // Phone validation & uniqueness
    if (!data.Phone || !data.Phone.trim()) {
      errors.push({ field: 'Phone', message: 'Phone number is required.' });
    } else {
      // Validate phone pattern (digits, hyphens, spaces, +) and min 10 digits
      const cleanedPhone = data.Phone.replace(/[\s\-\(\)\+]/g, '');
      if (!/^\d{10,15}$/.test(cleanedPhone)) {
        errors.push({ field: 'Phone', message: 'Enter a valid phone number (10 to 15 digits).' });
      } else {
        const phoneQuery = isUpdate
          ? `SELECT CustomerId FROM Customers WHERE Phone = ? AND CustomerId != ?`
          : `SELECT CustomerId FROM Customers WHERE Phone = ?`;
        const params = isUpdate ? [data.Phone.trim(), customerId] : [data.Phone.trim()];
        const existingPhone = db.prepare(phoneQuery).get(...params);
        if (existingPhone) {
          errors.push({ field: 'Phone', message: 'A customer with this phone number already exists.' });
        }
      }
    }

    // Status validation
    if (data.Status && !['Active', 'Inactive', 'Prospect'].includes(data.Status)) {
      errors.push({ field: 'Status', message: 'Status must be Active, Inactive, or Prospect.' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate sequential customer code
   */
  static generateCustomerCode() {
    const row = db.prepare('SELECT MAX(CustomerId) as maxId FROM Customers').get();
    const nextId = (row && row.maxId ? row.maxId : 0) + 1;
    return `CUST-${String(nextId).padStart(4, '0')}`;
  }

  /**
   * Get customers with role-based scoping, search, filter, and pagination
   */
  static getCustomers({
    user,
    search = '',
    status = '',
    ownerId = '',
    city = '',
    sortBy = 'CustomerId',
    sortOrder = 'DESC',
    limit = 20,
    offset = 0
  }) {
    let query = `
      SELECT c.*, u.Name as OwnerName, u.Email as OwnerEmail,
             (SELECT COUNT(*) FROM Opportunities o WHERE o.CustomerId = c.CustomerId) as OpportunityCount,
             (SELECT COUNT(*) FROM FollowUps f WHERE f.CustomerId = c.CustomerId) as FollowUpCount
      FROM Customers c
      LEFT JOIN Users u ON c.OwnerId = u.UserId
      WHERE 1=1
    `;
    let countQuery = `SELECT COUNT(*) as total FROM Customers c WHERE 1=1`;
    const params = [];
    const countParams = [];

    // Role-based authorization scoping
    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND c.OwnerId = ?`;
      countQuery += ` AND c.OwnerId = ?`;
      params.push(user.userId);
      countParams.push(user.userId);
    } else if (ownerId) {
      query += ` AND c.OwnerId = ?`;
      countQuery += ` AND c.OwnerId = ?`;
      params.push(Number(ownerId));
      countParams.push(Number(ownerId));
    }

    if (status) {
      query += ` AND c.Status = ?`;
      countQuery += ` AND c.Status = ?`;
      params.push(status);
      countParams.push(status);
    }

    if (city) {
      query += ` AND LOWER(c.City) LIKE ?`;
      countQuery += ` AND LOWER(c.City) LIKE ?`;
      params.push(`%${city.toLowerCase()}%`);
      countParams.push(`%${city.toLowerCase()}%`);
    }

    if (search) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      const clause = ` AND (LOWER(c.CustomerName) LIKE ? OR LOWER(c.Email) LIKE ? OR c.Phone LIKE ? OR LOWER(c.CompanyName) LIKE ? OR LOWER(c.CustomerCode) LIKE ?)`;
      query += clause;
      countQuery += clause;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Validate sort column to avoid SQL injection
    const allowedSortCols = ['CustomerId', 'CustomerName', 'Email', 'Status', 'CreatedDate', 'CompanyName'];
    const safeSortCol = allowedSortCols.includes(sortBy) ? `c.${sortBy}` : 'c.CustomerId';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${safeSortCol} ${safeSortOrder} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);
    const countResult = db.prepare(countQuery).get(...countParams);

    return {
      customers: rows,
      total: countResult ? countResult.total : 0,
      page: Math.floor(offset / limit) + 1,
      limit
    };
  }

  /**
   * Get single customer by ID with authorization check
   */
  static getCustomerById(customerId, user = null) {
    let query = `
      SELECT c.*, u.Name as OwnerName, u.Email as OwnerEmail, creator.Name as CreatorName
      FROM Customers c
      LEFT JOIN Users u ON c.OwnerId = u.UserId
      LEFT JOIN Users creator ON c.CreatedBy = creator.UserId
      WHERE c.CustomerId = ?
    `;
    const params = [Number(customerId)];

    if (user && user.roleName === 'SalesExecutive') {
      query += ` AND c.OwnerId = ?`;
      params.push(user.userId);
    }

    return db.prepare(query).get(...params);
  }

  /**
   * 360-degree customer view with all associated CRM records
   */
  static getCustomer360(customerId, user = null) {
    const customer = this.getCustomerById(customerId, user);
    if (!customer) return null;

    const opportunities = db.prepare(`
      SELECT o.*, u.Name as OwnerName
      FROM Opportunities o
      LEFT JOIN Users u ON o.AssignedTo = u.UserId
      WHERE o.CustomerId = ?
      ORDER BY o.CreatedDate DESC
    `).all(customer.CustomerId);

    const followUps = db.prepare(`
      SELECT f.*, u.Name as AssignedToName
      FROM FollowUps f
      LEFT JOIN Users u ON f.AssignedTo = u.UserId
      WHERE f.CustomerId = ?
      ORDER BY f.FollowUpDate DESC
    `).all(customer.CustomerId);

    const activities = db.prepare(`
      SELECT a.*, u.Name as AssignedToName
      FROM Activities a
      LEFT JOIN Users u ON a.AssignedTo = u.UserId
      WHERE a.CustomerId = ?
      ORDER BY a.ActivityDate DESC
    `).all(customer.CustomerId);

    const leads = db.prepare(`
      SELECT * FROM Leads WHERE ConvertedCustomerId = ? OR Email = ?
    `).all(customer.CustomerId, customer.Email);

    const auditTrail = db.prepare(`
      SELECT * FROM AuditLogs
      WHERE EntityName = 'Customer' AND RecordId = ?
      ORDER BY AuditLogId DESC LIMIT 20
    `).all(String(customer.CustomerId));

    return {
      customer,
      opportunities,
      followUps,
      activities,
      leads,
      auditTrail
    };
  }

  /**
   * Create a new customer
   */
  static createCustomer(data, currentUser, ipAddress = '127.0.0.1') {
    const validation = this.validateCustomer(data, false);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const customerCode = this.generateCustomerCode();
    const nowIso = new Date().toISOString();
    const ownerId = data.OwnerId ? Number(data.OwnerId) : (currentUser ? currentUser.userId : null);
    const createdBy = currentUser ? currentUser.userId : null;

    const stmt = db.prepare(`
      INSERT INTO Customers (
        CustomerCode, CustomerName, Email, Phone, CompanyName,
        Address, City, State, Status, OwnerId, CreatedBy, Notes,
        CreatedDate, ModifiedDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      customerCode,
      data.CustomerName.trim(),
      data.Email.trim().toLowerCase(),
      data.Phone.trim(),
      data.CompanyName ? data.CompanyName.trim() : '',
      data.Address ? data.Address.trim() : '',
      data.City ? data.City.trim() : '',
      data.State ? data.State.trim() : '',
      data.Status || 'Active',
      ownerId,
      createdBy,
      data.Notes ? data.Notes.trim() : '',
      nowIso,
      nowIso
    );

    const newCustomerId = Number(result.lastInsertRowid);
    const createdCustomer = this.getCustomerById(newCustomerId);

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'CREATE',
      entityName: 'Customer',
      recordId: String(newCustomerId),
      newValue: createdCustomer,
      details: `Created customer: ${createdCustomer.CustomerName} (${createdCustomer.CustomerCode})`,
      ipAddress
    });

    return { success: true, customer: createdCustomer };
  }

  /**
   * Update existing customer
   */
  static updateCustomer(customerId, data, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getCustomerById(customerId, currentUser);
    if (!existing) {
      return { success: false, message: 'Customer not found or unauthorized.' };
    }

    const validation = this.validateCustomer(data, true, customerId);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const nowIso = new Date().toISOString();
    const ownerId = data.OwnerId !== undefined ? Number(data.OwnerId) : existing.OwnerId;

    const stmt = db.prepare(`
      UPDATE Customers SET
        CustomerName = ?,
        Email = ?,
        Phone = ?,
        CompanyName = ?,
        Address = ?,
        City = ?,
        State = ?,
        Status = ?,
        OwnerId = ?,
        Notes = ?,
        ModifiedDate = ?
      WHERE CustomerId = ?
    `);

    stmt.run(
      data.CustomerName.trim(),
      data.Email.trim().toLowerCase(),
      data.Phone.trim(),
      data.CompanyName ? data.CompanyName.trim() : '',
      data.Address ? data.Address.trim() : '',
      data.City ? data.City.trim() : '',
      data.State ? data.State.trim() : '',
      data.Status || existing.Status,
      ownerId,
      data.Notes !== undefined ? data.Notes.trim() : existing.Notes,
      nowIso,
      Number(customerId)
    );

    const updatedCustomer = this.getCustomerById(customerId);

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'UPDATE',
      entityName: 'Customer',
      recordId: String(customerId),
      oldValue: existing,
      newValue: updatedCustomer,
      details: `Updated customer: ${updatedCustomer.CustomerName}`,
      ipAddress
    });

    return { success: true, customer: updatedCustomer };
  }

  /**
   * Delete or deactivate customer
   */
  static deleteCustomer(customerId, currentUser, ipAddress = '127.0.0.1') {
    const existing = this.getCustomerById(customerId, currentUser);
    if (!existing) {
      return { success: false, message: 'Customer not found or unauthorized.' };
    }

    // Check if customer has active opportunities
    const oppCount = db.prepare('SELECT COUNT(*) as count FROM Opportunities WHERE CustomerId = ?').get(customerId);
    if (oppCount.count > 0) {
      // Soft-deactivate if has linked opportunities to maintain referential integrity
      db.prepare('UPDATE Customers SET Status = "Inactive", ModifiedDate = ? WHERE CustomerId = ?')
        .run(new Date().toISOString(), Number(customerId));
      
      AuditService.log({
        userId: currentUser ? currentUser.userId : null,
        userName: currentUser ? currentUser.name : 'System',
        userRole: currentUser ? currentUser.roleName : 'System',
        action: 'DELETE',
        entityName: 'Customer',
        recordId: String(customerId),
        oldValue: existing,
        newValue: { ...existing, Status: 'Inactive' },
        details: 'Customer deactivated (has existing linked opportunities)',
        ipAddress
      });

      return { success: true, deactivated: true, message: 'Customer has associated opportunities and was deactivated.' };
    }

    db.prepare('DELETE FROM Customers WHERE CustomerId = ?').run(Number(customerId));

    AuditService.log({
      userId: currentUser ? currentUser.userId : null,
      userName: currentUser ? currentUser.name : 'System',
      userRole: currentUser ? currentUser.roleName : 'System',
      action: 'DELETE',
      entityName: 'Customer',
      recordId: String(customerId),
      oldValue: existing,
      details: `Permanently deleted customer: ${existing.CustomerName}`,
      ipAddress
    });

    return { success: true, message: 'Customer deleted successfully.' };
  }
}

module.exports = CustomerService;
