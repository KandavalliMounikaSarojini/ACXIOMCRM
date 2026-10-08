const CustomerService = require('../services/customerService');
const UserService = require('../services/userService');

class CustomerController {
  static renderIndex(req, res) {
    const user = req.session.user;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
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
    const salesExecutives = UserService.getSalesExecutives();

    res.render('customers/index', {
      title: 'Customer Directory - AcxiomCRM',
      customers: result.customers,
      total: result.total,
      currentPage: page,
      totalPages: Math.ceil(result.total / limit) || 1,
      filters,
      salesExecutives
    });
  }

  static renderCreate(req, res) {
    const salesExecutives = UserService.getSalesExecutives();
    res.render('customers/create', {
      title: 'New Customer - AcxiomCRM',
      salesExecutives,
      errors: [],
      formData: {}
    });
  }

  static handleCreate(req, res) {
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = CustomerService.createCustomer(req.body, user, ipAddress);

    if (!result.success) {
      const salesExecutives = UserService.getSalesExecutives();
      return res.render('customers/create', {
        title: 'New Customer - AcxiomCRM',
        salesExecutives,
        errors: result.errors || [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = `Customer ${result.customer.CustomerName} (${result.customer.CustomerCode}) created successfully.`;
    res.redirect(`/customers/${result.customer.CustomerId}`);
  }

  static renderDetails(req, res) {
    const customerId = req.params.id;
    const user = req.session.user;

    const data = CustomerService.getCustomer360(customerId, user);
    if (!data) {
      return res.status(404).render('errors/404', {
        title: 'Customer Not Found',
        message: 'The requested customer was not found or you do not have permission to view it.'
      });
    }

    const salesExecutives = UserService.getSalesExecutives();

    res.render('customers/details', {
      title: `${data.customer.CustomerName} - Customer 360`,
      customer: data.customer,
      opportunities: data.opportunities,
      followUps: data.followUps,
      activities: data.activities,
      leads: data.leads,
      auditTrail: data.auditTrail,
      salesExecutives
    });
  }

  static renderEdit(req, res) {
    const customerId = req.params.id;
    const user = req.session.user;

    const customer = CustomerService.getCustomerById(customerId, user);
    if (!customer) {
      return res.status(404).render('errors/404', {
        title: 'Customer Not Found',
        message: 'Customer not found or unauthorized.'
      });
    }

    const salesExecutives = UserService.getSalesExecutives();

    res.render('customers/edit', {
      title: `Edit Customer - ${customer.CustomerName}`,
      customer,
      salesExecutives,
      errors: [],
      formData: customer
    });
  }

  static handleUpdate(req, res) {
    const customerId = req.params.id;
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = CustomerService.updateCustomer(customerId, req.body, user, ipAddress);

    if (!result.success) {
      const salesExecutives = UserService.getSalesExecutives();
      return res.render('customers/edit', {
        title: 'Edit Customer - AcxiomCRM',
        customer: { ...req.body, CustomerId: customerId },
        salesExecutives,
        errors: result.errors || [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = 'Customer updated successfully.';
    res.redirect(`/customers/${customerId}`);
  }

  static handleDelete(req, res) {
    const customerId = req.params.id;
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = CustomerService.deleteCustomer(customerId, user, ipAddress);

    if (!result.success) {
      req.session.flashError = result.message;
    } else {
      req.session.flashSuccess = result.message;
    }

    res.redirect('/customers');
  }
}

module.exports = CustomerController;
