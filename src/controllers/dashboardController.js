const db = require('../database/db');
const ReportService = require('../services/reportService');
const LeadService = require('../services/leadService');
const FollowUpService = require('../services/followUpService');
const OpportunityService = require('../services/opportunityService');
const AuditService = require('../services/auditService');

class DashboardController {
  static async renderDashboard(req, res) {
    const user = req.session.user;

    const kpis = ReportService.getDashboardKPIs(user);
    const recentLeads = LeadService.getLeads({ user, limit: 6 }).leads;
    const upcomingFollowUps = FollowUpService.getFollowUps({ user, timeFilter: 'upcoming', limit: 6 }).followUps;
    const overdueFollowUps = FollowUpService.getFollowUps({ user, timeFilter: 'overdue', limit: 6 }).followUps;
    const recentOpportunities = OpportunityService.getOpportunities({ user, limit: 6 }).opportunities;
    
    // Admin specific metadata
    let adminStats = null;
    let recentAuditLogs = [];
    if (user.roleName === 'Admin') {
      const userCount = db.prepare('SELECT COUNT(*) as count FROM Users').get().count;
      const lockedCount = db.prepare('SELECT COUNT(*) as count FROM Users WHERE FailedLoginCount >= 5').get().count;
      const custCount = db.prepare('SELECT COUNT(*) as count FROM Customers').get().count;
      const leadCount = db.prepare('SELECT COUNT(*) as count FROM Leads').get().count;
      const oppCount = db.prepare('SELECT COUNT(*) as count FROM Opportunities').get().count;
      const auditCount = db.prepare('SELECT COUNT(*) as count FROM AuditLogs').get().count;

      adminStats = {
        totalUsers: userCount,
        lockedAccounts: lockedCount,
        totalEntities: custCount + leadCount + oppCount,
        auditCount
      };
      recentAuditLogs = AuditService.getLogs({ limit: 6 }).logs;
    }

    // Manager specific metadata (Team Leaderboard & Stage Pipeline)
    let managerStats = null;
    if (user.roleName === 'Manager' || user.roleName === 'Admin') {
      const charts = ReportService.getDashboardCharts(user);
      const pipelineData = ReportService.getPipelineReport(user);
      managerStats = {
        leaderboard: charts.leaderboard || [],
        stageSummary: pipelineData.stageSummary || [],
        ownerSummary: pipelineData.ownerSummary || []
      };
    }

    // Sales Executive specific metadata (Hot Leads & DealIQ Insights)
    let salesStats = null;
    if (user.roleName === 'SalesExecutive') {
      const hotLeads = recentLeads.filter(l => l.LeadScore && (l.LeadScore.grade === 'Hot' || l.LeadScore.grade === 'Warm'));
      const activeOpps = recentOpportunities.filter(o => o.Stage !== 'Won' && o.Stage !== 'Lost');
      salesStats = {
        hotLeads,
        activeOpps
      };
    }

    res.render('dashboard/index', {
      title: 'Dashboard - AcxiomCRM',
      user,
      kpis,
      recentLeads,
      upcomingFollowUps,
      overdueFollowUps,
      recentOpportunities,
      recentAuditLogs,
      adminStats,
      managerStats,
      salesStats
    });
  }

  static getChartsData(req, res) {
    const user = req.session.user;
    const chartsData = ReportService.getDashboardCharts(user);
    res.json({ success: true, data: chartsData });
  }
}

module.exports = DashboardController;
