const ActivityService = require('../services/activityService');
const CustomerService = require('../services/customerService');
const LeadService = require('../services/leadService');
const OpportunityService = require('../services/opportunityService');
const UserService = require('../services/userService');

class ActivityController {
  static renderIndex(req, res) {
    const user = req.session.user;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '15', 10);
    const offset = (page - 1) * limit;

    const filters = {
      user,
      type: req.query.type || '',
      status: req.query.status || '',
      assignedTo: req.query.assignedTo || '',
      limit,
      offset
    };

    const result = ActivityService.getActivities(filters);
    const salesExecutives = UserService.getSalesExecutives();

    res.render('activities/index', {
      title: 'Activity Feed & Logs - AcxiomCRM',
      activities: result.activities,
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
    const opportunities = OpportunityService.getOpportunities({ user, limit: 100 }).opportunities;

    const nowIso = new Date().toISOString().slice(0, 16);

    res.render('activities/create', {
      title: 'Log Activity - AcxiomCRM',
      salesExecutives,
      customers,
      leads,
      opportunities,
      preselectedCustomerId: req.query.customerId || '',
      preselectedLeadId: req.query.leadId || '',
      preselectedOpportunityId: req.query.opportunityId || '',
      defaultDate: nowIso,
      errors: [],
      formData: { ActivityDate: nowIso, ActivityType: 'Call', Status: 'Completed' }
    });
  }

  static handleCreate(req, res) {
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = ActivityService.createActivity(req.body, user, ipAddress);

    if (!result.success) {
      const salesExecutives = UserService.getSalesExecutives();
      const customers = CustomerService.getCustomers({ user, limit: 100 }).customers;
      const leads = LeadService.getLeads({ user, limit: 100 }).leads;
      const opportunities = OpportunityService.getOpportunities({ user, limit: 100 }).opportunities;

      return res.render('activities/create', {
        title: 'Log Activity - AcxiomCRM',
        salesExecutives,
        customers,
        leads,
        opportunities,
        preselectedCustomerId: req.body.CustomerId,
        preselectedLeadId: req.body.LeadId,
        preselectedOpportunityId: req.body.OpportunityId,
        defaultDate: req.body.ActivityDate,
        errors: result.errors || [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = 'Activity recorded successfully.';
    
    if (req.body.CustomerId) {
      return res.redirect(`/customers/${req.body.CustomerId}`);
    } else if (req.body.LeadId) {
      return res.redirect(`/leads/${req.body.LeadId}`);
    }
    res.redirect('/activities');
  }
}

module.exports = ActivityController;
