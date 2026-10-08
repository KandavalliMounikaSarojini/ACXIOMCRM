const ReportService = require('../services/reportService');
const LeadService = require('../services/leadService');
const FollowUpService = require('../services/followUpService');
const OpportunityService = require('../services/opportunityService');
const AuditService = require('../services/auditService');

class DashboardController {
  static async renderDashboard(req, res) {
    const user = req.session.user;

    const kpis = ReportService.getDashboardKPIs(user);
    const recentLeads = LeadService.getLeads({ user, limit: 5 }).leads;
    const upcomingFollowUps = FollowUpService.getFollowUps({ user, timeFilter: 'upcoming', limit: 5 }).followUps;
    const overdueFollowUps = FollowUpService.getFollowUps({ user, timeFilter: 'overdue', limit: 5 }).followUps;
    const recentOpportunities = OpportunityService.getOpportunities({ user, limit: 5 }).opportunities;
    const recentAuditLogs = user.roleName === 'Admin' ? AuditService.getLogs({ limit: 6 }).logs : [];

    res.render('dashboard/index', {
      title: 'Dashboard - AcxiomCRM',
      user,
      kpis,
      recentLeads,
      upcomingFollowUps,
      overdueFollowUps,
      recentOpportunities,
      recentAuditLogs
    });
  }

  static getChartsData(req, res) {
    const user = req.session.user;
    const chartsData = ReportService.getDashboardCharts(user);
    res.json({ success: true, data: chartsData });
  }
}

module.exports = DashboardController;
