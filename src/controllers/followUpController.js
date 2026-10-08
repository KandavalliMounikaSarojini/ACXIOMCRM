const FollowUpService = require('../services/followUpService');
const CustomerService = require('../services/customerService');
const LeadService = require('../services/leadService');
const UserService = require('../services/userService');

class FollowUpController {
  static renderIndex(req, res) {
    const user = req.session.user;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '15', 10);
    const offset = (page - 1) * limit;

    const filters = {
      user,
      status: req.query.status || '',
      type: req.query.type || '',
      timeFilter: req.query.timeFilter || '', // today, upcoming, overdue
      assignedTo: req.query.assignedTo || '',
      sortBy: req.query.sortBy || 'FollowUpDate',
      sortOrder: req.query.sortOrder || 'ASC',
      limit,
      offset
    };

    const result = FollowUpService.getFollowUps(filters);
    const salesExecutives = UserService.getSalesExecutives();

    res.render('followups/index', {
      title: 'Follow-Up Schedule - AcxiomCRM',
      followUps: result.followUps,
      total: result.total,
      currentPage: page,
      totalPages: Math.ceil(result.total / limit) || 1,
      filters,
      salesExecutives
    });
  }

  static renderCreate(req, res) {
    const user = req.session.user;
    const salesExecutives = UserService.getSalesExecutives();
    const customers = CustomerService.getCustomers({ user, limit: 100 }).customers;
    const leads = LeadService.getLeads({ user, limit: 100 }).leads;

    // Default to today + 2 hours
    const now = new Date();
    now.setHours(now.getHours() + 2);
    const defaultDate = now.toISOString().slice(0, 16);

    res.render('followups/create', {
      title: 'Schedule Follow-Up - AcxiomCRM',
      salesExecutives,
      customers,
      leads,
      preselectedCustomerId: req.query.customerId || '',
      preselectedLeadId: req.query.leadId || '',
      defaultDate,
      errors: [],
      formData: { FollowUpDate: defaultDate, FollowUpType: 'Call' }
    });
  }

  static handleCreate(req, res) {
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = FollowUpService.createFollowUp(req.body, user, ipAddress);

    if (!result.success) {
      const salesExecutives = UserService.getSalesExecutives();
      const customers = CustomerService.getCustomers({ user, limit: 100 }).customers;
      const leads = LeadService.getLeads({ user, limit: 100 }).leads;

      return res.render('followups/create', {
        title: 'Schedule Follow-Up - AcxiomCRM',
        salesExecutives,
        customers,
        leads,
        preselectedCustomerId: req.body.CustomerId,
        preselectedLeadId: req.body.LeadId,
        defaultDate: req.body.FollowUpDate,
        errors: result.errors || [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = 'Follow-up scheduled successfully.';
    
    if (req.body.CustomerId) {
      return res.redirect(`/customers/${req.body.CustomerId}`);
    } else if (req.body.LeadId) {
      return res.redirect(`/leads/${req.body.LeadId}`);
    }
    res.redirect('/followups');
  }

  static handleStatusUpdate(req, res) {
    const followUpId = req.params.id;
    const user = req.session.user;
    const { status, remarks } = req.body;
    const ipAddress = req.ip || '127.0.0.1';

    const existing = FollowUpService.getFollowUpById(followUpId, user);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Follow-up not found.' });
    }

    const result = FollowUpService.updateFollowUp(followUpId, {
      ...existing,
      Status: status,
      Remarks: remarks !== undefined ? remarks : existing.Remarks
    }, user, ipAddress);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.errors ? result.errors[0].message : result.message });
    }

    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({ success: true, followUp: result.followUp });
    }

    req.session.flashSuccess = `Follow-up status marked as ${status}.`;
    res.redirect('/followups');
  }

  static handleDelete(req, res) {
    const followUpId = req.params.id;
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = FollowUpService.deleteFollowUp(followUpId, user, ipAddress);

    if (!result.success) {
      req.session.flashError = result.message;
    } else {
      req.session.flashSuccess = result.message;
    }

    res.redirect('/followups');
  }
}

module.exports = FollowUpController;
