const LeadService = require('../services/leadService');
const UserService = require('../services/userService');

class LeadController {
  static renderIndex(req, res) {
    const user = req.session.user;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const filters = {
      user,
      search: req.query.search || '',
      status: req.query.status || '',
      source: req.query.source || '',
      priority: req.query.priority || '',
      assignedTo: req.query.assignedTo || '',
      sortBy: req.query.sortBy || 'LeadId',
      sortOrder: req.query.sortOrder || 'DESC',
      limit,
      offset
    };

    const result = LeadService.getLeads(filters);
    const salesExecutives = UserService.getSalesExecutives();

    res.render('leads/index', {
      title: 'Lead Pipeline - AcxiomCRM',
      leads: result.leads,
      total: result.total,
      currentPage: page,
      totalPages: Math.ceil(result.total / limit) || 1,
      filters,
      salesExecutives
    });
  }

  static renderCreate(req, res) {
    const salesExecutives = UserService.getSalesExecutives();
    res.render('leads/create', {
      title: 'Capture New Lead - AcxiomCRM',
      salesExecutives,
      errors: [],
      formData: {}
    });
  }

  static handleCreate(req, res) {
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = LeadService.createLead(req.body, user, ipAddress);

    if (!result.success) {
      const salesExecutives = UserService.getSalesExecutives();
      return res.render('leads/create', {
        title: 'Capture New Lead - AcxiomCRM',
        salesExecutives,
        errors: result.errors || [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = `Lead ${result.lead.LeadName} (${result.lead.LeadCode}) created successfully.`;
    res.redirect(`/leads/${result.lead.LeadId}`);
  }

  static renderDetails(req, res) {
    const leadId = req.params.id;
    const user = req.session.user;

    const lead = LeadService.getLeadById(leadId, user);
    if (!lead) {
      return res.status(404).render('errors/404', {
        title: 'Lead Not Found',
        message: 'Lead not found or unauthorized.'
      });
    }

    const salesExecutives = UserService.getSalesExecutives();

    res.render('leads/details', {
      title: `Lead - ${lead.LeadName} (${lead.LeadCode})`,
      lead,
      salesExecutives
    });
  }

  static renderEdit(req, res) {
    const leadId = req.params.id;
    const user = req.session.user;

    const lead = LeadService.getLeadById(leadId, user);
    if (!lead) {
      return res.status(404).render('errors/404', {
        title: 'Lead Not Found',
        message: 'Lead not found or unauthorized.'
      });
    }

    const salesExecutives = UserService.getSalesExecutives();

    res.render('leads/edit', {
      title: `Edit Lead - ${lead.LeadName}`,
      lead,
      salesExecutives,
      errors: [],
      formData: lead
    });
  }

  static handleUpdate(req, res) {
    const leadId = req.params.id;
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = LeadService.updateLead(leadId, req.body, user, ipAddress);

    if (!result.success) {
      const salesExecutives = UserService.getSalesExecutives();
      return res.render('leads/edit', {
        title: 'Edit Lead - AcxiomCRM',
        lead: { ...req.body, LeadId: leadId },
        salesExecutives,
        errors: result.errors || [{ message: result.message }],
        formData: req.body
      });
    }

    req.session.flashSuccess = 'Lead updated successfully.';
    res.redirect(`/leads/${leadId}`);
  }

  static handleConvert(req, res) {
    const leadId = req.params.id;
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const convertOptions = {
      CustomerName: req.body.CustomerName,
      Address: req.body.Address,
      City: req.body.City,
      State: req.body.State,
      createOpportunity: req.body.createOpportunity !== 'false',
      OpportunityName: req.body.OpportunityName,
      Amount: req.body.Amount,
      Stage: req.body.Stage || 'Qualification',
      Probability: req.body.Probability || 30,
      ExpectedCloseDate: req.body.ExpectedCloseDate
    };

    const result = LeadService.convertLead(leadId, convertOptions, user, ipAddress);

    if (!result.success) {
      req.session.flashError = result.message;
      return res.redirect(`/leads/${leadId}`);
    }

    req.session.flashSuccess = `Lead successfully converted! Customer "${result.customer.CustomerName}" (${result.customer.CustomerCode}) created.`;
    res.redirect(`/customers/${result.customer.CustomerId}`);
  }

  static handleDelete(req, res) {
    const leadId = req.params.id;
    const user = req.session.user;
    const ipAddress = req.ip || '127.0.0.1';

    const result = LeadService.deleteLead(leadId, user, ipAddress);

    if (!result.success) {
      req.session.flashError = result.message;
    } else {
      req.session.flashSuccess = result.message;
    }

    res.redirect('/leads');
  }
}

module.exports = LeadController;
