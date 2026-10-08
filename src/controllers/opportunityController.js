const OpportunityService = require('../services/opportunityService');
const CustomerService = require('../services/customerService');
const UserService = require('../services/userService');

class OpportunityController {
  static renderIndex(req, res) {
    const user = req.session.user;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const filters = {
      user,
      search: req.query.search || '',
      stage: req.query.stage || '',
      status: req.query.status || '',
      customerId: req.query.customerId || '',
      assignedTo: req.query.assignedTo || '',
      sortBy: req.query.sortBy || 'OpportunityId',
      sortOrder: req.query.sortOrder || 'DESC',
      limit,
      offset
    };

    const result = OpportunityService.getOpportunities(filters);
    const salesExecutives = UserService.getSalesExecutives();
    const customers = CustomerService.getCustomers({ user, limit: 100 }).customers;

    res.render('opportunities/index', {
      title: 'Sales Opportunities - AcxiomCRM',
      opportunities: result.opportunities,
      total: result.total,
      currentPage: page,
      totalPages: Math.ceil(result.total / limit) || 1,
      filters,
      salesExecutives,
      customers
    });
  }

  static renderKanban(req, res) {
    const user = req.session.user;
    const pipelineData = OpportunityService.getKanbanPipeline(user);

    res.render('opportunities/kanban', {
      title: 'Opportunity Pipeline Board - AcxiomCRM',
      pipeline: pipelineData
    });
  }

  static renderCreate(req, res) {
    const user = req.session.user;
    const salesExecutives = UserService.getSalesExecutives();
    const customers = CustomerService.getCustomers({ user, limit: 100 }).customers;
    const preselectedCustomerId = req.query.customerId || '';

    // Default expected close date: 30 days from now
    const defaultCloseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    res.render('opportunities/create', {
      title: 'New Sales Opportunity - AcxiomCRM',
      salesExecutives,
      customers,
      preselectedCustomerId,
      defaultCloseDate,
      errors: [],
      formData: { ExpectedCloseDate: defaultCloseDate, Probability: 20 }
    });
  }

  static handleCreate(req, res) {
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = OpportunityService.createOpportunity(req.body, user, ipAddress);

    if (!result.success) {
      const salesExecutives = UserService.getSalesExecutives();
      const customers = CustomerService.getCustomers({ user, limit: 100 }).customers;

      return res.render('opportunities/create', {
        title: 'New Sales Opportunity - AcxiomCRM',
        salesExecutives,
        customers,
        preselectedCustomerId: req.body.CustomerId,
        defaultCloseDate: req.body.ExpectedCloseDate,
        errors: result.errors || [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = `Opportunity "${result.opportunity.OpportunityName}" created successfully!`;
    res.redirect(`/opportunities/${result.opportunity.OpportunityId}`);
  }

  static renderDetails(req, res) {
    const opportunityId = req.params.id;
    const user = req.session.user;

    const opportunity = OpportunityService.getOpportunityById(opportunityId, user);
    if (!opportunity) {
      return res.status(404).render('errors/404', {
        title: 'Opportunity Not Found',
        message: 'Opportunity not found or unauthorized.'
      });
    }

    res.render('opportunities/details', {
      title: `Opportunity - ${opportunity.OpportunityName}`,
      opportunity
    });
  }

  static renderEdit(req, res) {
    const opportunityId = req.params.id;
    const user = req.session.user;

    const opportunity = OpportunityService.getOpportunityById(opportunityId, user);
    if (!opportunity) {
      return res.status(404).render('errors/404', {
        title: 'Opportunity Not Found',
        message: 'Opportunity not found or unauthorized.'
      });
    }

    const salesExecutives = UserService.getSalesExecutives();
    const customers = CustomerService.getCustomers({ user, limit: 100 }).customers;

    res.render('opportunities/edit', {
      title: `Edit Opportunity - ${opportunity.OpportunityName}`,
      opportunity,
      salesExecutives,
      customers,
      errors: [],
      formData: opportunity
    });
  }

  static handleUpdate(req, res) {
    const opportunityId = req.params.id;
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = OpportunityService.updateOpportunity(opportunityId, req.body, user, ipAddress);

    if (!result.success) {
      const salesExecutives = UserService.getSalesExecutives();
      const customers = CustomerService.getCustomers({ user, limit: 100 }).customers;

      return res.render('opportunities/edit', {
        title: 'Edit Opportunity - AcxiomCRM',
        opportunity: { ...req.body, OpportunityId: opportunityId },
        salesExecutives,
        customers,
        errors: result.errors || [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = 'Opportunity updated successfully.';
    res.redirect(`/opportunities/${opportunityId}`);
  }

  static handleQuickStageUpdate(req, res) {
    const opportunityId = req.params.id;
    const user = req.session.user;
    const { stage } = req.body;
    const ipAddress = req.ip || '127.0.0.1';

    const existing = OpportunityService.getOpportunityById(opportunityId, user);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Opportunity not found.' });
    }

    const result = OpportunityService.updateOpportunity(opportunityId, {
      ...existing,
      Stage: stage
    }, user, ipAddress);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.errors ? result.errors[0].message : result.message });
    }

    return res.json({ success: true, opportunity: result.opportunity });
  }

  static handleDelete(req, res) {
    const opportunityId = req.params.id;
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = OpportunityService.deleteOpportunity(opportunityId, user, ipAddress);

    if (!result.success) {
      req.session.flashError = result.message;
    } else {
      req.session.flashSuccess = result.message;
    }

    res.redirect('/opportunities');
  }
}

module.exports = OpportunityController;
