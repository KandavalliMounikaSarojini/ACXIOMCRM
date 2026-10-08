const FollowUpService = require('../services/followUpService');

class FollowUpApiController {
  static getAll(req, res) {
    const user = req.apiUser;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = (page - 1) * limit;

    const filters = {
      user,
      status: req.query.status || '',
      type: req.query.type || '',
      timeFilter: req.query.timeFilter || '',
      assignedTo: req.query.assignedTo || '',
      customerId: req.query.customerId || '',
      leadId: req.query.leadId || '',
      sortBy: req.query.sortBy || 'FollowUpDate',
      sortOrder: req.query.sortOrder || 'ASC',
      limit,
      offset
    };

    const result = FollowUpService.getFollowUps(filters);

    return res.status(200).json({
      success: true,
      data: result.followUps,
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
    const followUpId = req.params.id;

    const followUp = FollowUpService.getFollowUpById(followUpId, user);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up not found or unauthorized.',
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: followUp
    });
  }

  static create(req, res) {
    const user = req.apiUser;
    const ipAddress = req.ip || '127.0.0.1';

    const result = FollowUpService.createFollowUp(req.body, user, ipAddress);

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
      message: 'Follow-up created successfully.',
      data: result.followUp
    });
  }

  static update(req, res) {
    const user = req.apiUser;
    const followUpId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';

    const result = FollowUpService.updateFollowUp(followUpId, req.body, user, ipAddress);

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
      message: 'Follow-up updated successfully.',
      data: result.followUp
    });
  }

  static delete(req, res) {
    const user = req.apiUser;
    const followUpId = req.params.id;
    const ipAddress = req.ip || '127.0.0.1';

    const result = FollowUpService.deleteFollowUp(followUpId, user, ipAddress);

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

module.exports = FollowUpApiController;
