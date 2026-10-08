const CustomerService = require('../services/customerService');

class CustomerApiController {
  static getAll(req, res) {
    const user = req.apiUser;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = (page - 1) * limit;

    const filters = {
      user,
      search: req.query.search || '',
      status: req.query.status || '',
      ownerId: req.query.ownerId || '',
      city: req.query.city || '',
      sortBy: req.query.sortBy || 'CustomerId',
      sortOrder: req.query.sortOrder || 'DESC',
      limit,
      offset
    };

    const result = CustomerService.getCustomers(filters);

    return res.status(200).json({
      success: true,
      data: result.customers,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit) || 1
      }
    });
  }

  static getById(req, res) {
    const user = req.apiUser;
    const customerId = req.params.id;

    const customer = CustomerService.getCustomerById(customerId, user);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found or unauthorized.',
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: customer
    });
  }

  static create(req, res) {
    const user = req.apiUser;
    const ipAddress = req.ip || '127.0.0.1';

    const result = CustomerService.createCustomer(req.body, user, ipAddress);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        details: result.errors || [{ message: result.message }],
        code: 'VALIDATION_ERROR'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully.',
      data: result.customer
    });
  }

  static update(req, res) {
    const user = req.apiUser;
    const customerId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';

    const result = CustomerService.updateCustomer(customerId, req.body, user, ipAddress);

    if (!result.success) {
      const statusCode = result.errors ? 400 : 404;
      return res.status(statusCode).json({
        success: false,
        error: result.message || 'Validation failed.',
        details: result.errors || [],
        code: result.errors ? 'VALIDATION_ERROR' : 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully.',
      data: result.customer
    });
  }

  static delete(req, res) {
    const user = req.apiUser;
    const customerId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';

    const result = CustomerService.deleteCustomer(customerId, user, ipAddress);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.message,
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      deactivated: result.deactivated || false
    });
  }
}

module.exports = CustomerApiController;
