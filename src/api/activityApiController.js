const ActivityService = require('../services/activityService');

class ActivityApiController {
  static getAll(req, res) {
    const user = req.apiUser;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = (page - 1) * limit;

    const filters = {
      user,
      type: req.query.type || '',
      status: req.query.status || '',
      assignedTo: req.query.assignedTo || '',
      customerId: req.query.customerId || '',
      leadId: req.query.leadId || '',
      opportunityId: req.query.opportunityId || '',
      limit,
      offset
    };

    const result = ActivityService.getActivities(filters);

    return res.status(200).json({
      success: true,
      data: result.activities,
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
    const activityId = req.params.id;

    const activity = ActivityService.getActivityById(activityId, user);

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found or unauthorized.',
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: activity
    });
  }

  static create(req, res) {
    const user = req.apiUser;
    const ipAddress = req.ip || '127.0.0.1';

    const result = ActivityService.createActivity(req.body, user, ipAddress);

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
      message: 'Activity recorded successfully.',
      data: result.activity
    });
  }
}

module.exports = ActivityApiController;
