const OpportunityService = require('../services/opportunityService');

class OpportunityApiController {
  static getAll(req, res) {
    const user = req.apiUser;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
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

    return res.status(200).json({
      success: true,
      data: result.opportunities,
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
    const opportunityId = req.params.id;

    const opportunity = OpportunityService.getOpportunityById(opportunityId, user);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Opportunity not found or unauthorized.',
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: opportunity
    });
  }

  static create(req, res) {
    const user = req.apiUser;
    const ipAddress = req.ip || '127.0.0.1';

    const result = OpportunityService.createOpportunity(req.body, user, ipAddress);

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
      message: 'Opportunity created successfully.',
      data: result.opportunity
    });
  }

  static update(req, res) {
    const user = req.apiUser;
    const opportunityId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';

    const result = OpportunityService.updateOpportunity(opportunityId, req.body, user, ipAddress);

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
      message: 'Opportunity updated successfully.',
      data: result.opportunity
    });
  }

  static delete(req, res) {
    const user = req.apiUser;
    const opportunityId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';

    const result = OpportunityService.deleteOpportunity(opportunityId, user, ipAddress);

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

module.exports = OpportunityApiController;
