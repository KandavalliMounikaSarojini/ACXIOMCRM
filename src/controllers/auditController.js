const AuditService = require('../services/auditService');

class AuditController {
  static renderIndex(req, res) {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = (page - 1) * limit;

    const filters = {
      entityName: req.query.entityName || '',
      action: req.query.action || '',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      search: req.query.search || '',
      limit,
      offset
    };

    const result = AuditService.getLogs(filters);

    res.render('audit/index', {
      title: 'Security & Activity Audit Log - AcxiomCRM',
      logs: result.logs,
      total: result.total,
      currentPage: page,
      totalPages: Math.ceil(result.total / limit) || 1,
      filters
    });
  }

  static getLogDetails(req, res) {
    const logId = req.params.id;
    const log = AuditService.getLogById(logId);

    if (!log) {
      return res.status(404).json({ success: false, error: 'Audit log entry not found.' });
    }

    let parsedOld = null;
    let parsedNew = null;
    try {
      if (log.OldValue) parsedOld = JSON.parse(log.OldValue);
    } catch (_) {
      parsedOld = log.OldValue;
    }
    try {
      if (log.NewValue) parsedNew = JSON.parse(log.NewValue);
    } catch (_) {
      parsedNew = log.NewValue;
    }

    res.json({
      success: true,
      log: {
        ...log,
        oldValueParsed: parsedOld,
        newValueParsed: parsedNew
      }
    });
  }
}

module.exports = AuditController;
