const LeadService = require('../services/leadService');

class LeadApiController {
  static getAll(req, res) {
    const user = req.apiUser;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
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

    return res.status(200).json({
      success: true,
      data: result.leads,
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
    const leadId = req.params.id;

    const lead = LeadService.getLeadById(leadId, user);

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found or unauthorized.',
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: lead
    });
  }

  static create(req, res) {
    const user = req.apiUser;
    const ipAddress = req.ip || '127.0.0.1';

    const result = LeadService.createLead(req.body, user, ipAddress);

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
      message: 'Lead created successfully.',
      data: result.lead
    });
  }

  static update(req, res) {
    const user = req.apiUser;
    const leadId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';

    const result = LeadService.updateLead(leadId, req.body, user, ipAddress);

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
      message: 'Lead updated successfully.',
      data: result.lead
    });
  }

  static convert(req, res) {
    const user = req.apiUser;
    const leadId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';

    const result = LeadService.convertLead(leadId, req.body, user, ipAddress);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
        code: 'CONVERSION_FAILED'
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        lead: result.lead,
        customer: result.customer,
        opportunity: result.opportunity
      }
    });
  }

  static delete(req, res) {
    const user = req.apiUser;
    const leadId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';

    const result = LeadService.deleteLead(leadId, user, ipAddress);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.message,
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message
    });
  }
}

module.exports = LeadApiController;
