const AuditService = require('../services/auditService');

class AuditApiController {
  static getAll(req, res) {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = (page - 1) * limit;

    const filters = {
      entityName: req.query.entityName || '',
      action: req.query.action || '',
      userId: req.query.userId || '',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      search: req.query.search || '',
      limit,
      offset
    };

    const result = AuditService.getLogs(filters);

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit) || 1
      }
    });
  }

  static getById(req, res) {
    const logId = req.params.id;
    const log = AuditService.getLogById(logId);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Audit log entry not found.',
        code: 'NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: log
    });
  }
}

module.exports = AuditApiController;
