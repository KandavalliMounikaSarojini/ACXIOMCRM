const ReportService = require('../services/reportService');
const CustomerService = require('../services/customerService');
const LeadService = require('../services/leadService');
const OpportunityService = require('../services/opportunityService');
const FollowUpService = require('../services/followUpService');
const UserService = require('../services/userService');
const AuditService = require('../services/auditService');

class ReportController {
  static renderIndex(req, res) {
    const user = req.session.user;
    const kpis = ReportService.getDashboardKPIs(user);

    res.render('reports/index', {
      title: 'Business Intelligence & Reports - AcxiomCRM',
      kpis
    });
  }

  static renderCustomerReport(req, res) {
    const user = req.session.user;
    const result = CustomerService.getCustomers({
      user,
      status: req.query.status || '',
      ownerId: req.query.ownerId || '',
      limit: 200
    });
    const salesExecutives = UserService.getSalesExecutives();

    res.render('reports/customer-report', {
      title: 'Customer Master Report - AcxiomCRM',
      customers: result.customers,
      total: result.total,
      filters: req.query,
      salesExecutives
    });
  }

  static exportCustomerCSV(req, res) {
    const user = req.session.user;
    const result = CustomerService.getCustomers({
      user,
      status: req.query.status || '',
      ownerId: req.query.ownerId || '',
      limit: 1000
    });

    const headers = [
      { key: 'CustomerCode', label: 'Customer Code' },
      { key: 'CustomerName', label: 'Customer Name' },
      { key: 'Email', label: 'Email' },
      { key: 'Phone', label: 'Phone' },
      { key: 'CompanyName', label: 'Company' },
      { key: 'City', label: 'City' },
      { key: 'State', label: 'State' },
      { key: 'Status', label: 'Status' },
      { key: 'OwnerName', label: 'Assigned Executive' },
      { key: 'CreatedDate', label: 'Created Date' }
    ];

    const csv = ReportService.convertToCSV(result.customers, headers);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=customers_export_${Date.now()}.csv`);
    res.send(csv);
  }

  static renderLeadReport(req, res) {
    const user = req.session.user;
    const result = LeadService.getLeads({
      user,
      status: req.query.status || '',
      source: req.query.source || '',
      limit: 200
    });
    const salesExecutives = UserService.getSalesExecutives();

    res.render('reports/lead-report', {
      title: 'Lead Conversion & Source Report - AcxiomCRM',
      leads: result.leads,
      total: result.total,
      filters: req.query,
      salesExecutives
    });
  }

  static exportLeadCSV(req, res) {
    const user = req.session.user;
    const result = LeadService.getLeads({
      user,
      status: req.query.status || '',
      source: req.query.source || '',
      limit: 1000
    });

    const headers = [
      { key: 'LeadCode', label: 'Lead Code' },
      { key: 'LeadName', label: 'Lead Name' },
      { key: 'Email', label: 'Email' },
      { key: 'Phone', label: 'Phone' },
      { key: 'CompanyName', label: 'Company' },
      { key: 'Source', label: 'Lead Source' },
      { key: 'Status', label: 'Status' },
      { key: 'Priority', label: 'Priority' },
      { key: 'ExpectedValue', label: 'Expected Value ($)' },
      { key: 'AssignedToName', label: 'Assigned Executive' },
      { key: 'CreatedDate', label: 'Created Date' }
    ];

    const csv = ReportService.convertToCSV(result.leads, headers);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_export_${Date.now()}.csv`);
    res.send(csv);
  }

  static renderPipelineReport(req, res) {
    const user = req.session.user;
    const pipelineData = ReportService.getPipelineReport(user);
    const opps = OpportunityService.getOpportunities({ user, limit: 100 }).opportunities;

    res.render('reports/pipeline-report', {
      title: 'Opportunity Pipeline Valuation Report - AcxiomCRM',
      stageSummary: pipelineData.stageSummary,
      ownerSummary: pipelineData.ownerSummary,
      opportunities: opps
    });
  }

  static exportPipelineCSV(req, res) {
    const user = req.session.user;
    const opps = OpportunityService.getOpportunities({ user, limit: 1000 }).opportunities;

    const headers = [
      { key: 'OpportunityName', label: 'Opportunity Name' },
      { key: 'CustomerName', label: 'Customer' },
      { key: 'Stage', label: 'Stage' },
      { key: 'Amount', label: 'Amount ($)' },
      { key: 'Probability', label: 'Probability (%)' },
      { key: 'WeightedAmount', label: 'Weighted Amount ($)' },
      { key: 'ExpectedCloseDate', label: 'Expected Close Date' },
      { key: 'Status', label: 'Status' },
      { key: 'AssignedToName', label: 'Assigned Executive' }
    ];

    const csv = ReportService.convertToCSV(opps, headers);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=pipeline_export_${Date.now()}.csv`);
    res.send(csv);
  }

  static renderSalesReport(req, res) {
    const user = req.session.user;
    const charts = ReportService.getDashboardCharts(user);
    const wonOpps = OpportunityService.getOpportunities({ user, stage: 'Won', limit: 100 }).opportunities;

    res.render('reports/sales-report', {
      title: 'Sales Performance & Leaderboard - AcxiomCRM',
      leaderboard: charts.leaderboard,
      monthlySales: charts.monthlySales,
      wonOpportunities: wonOpps
    });
  }

  static renderAuditReport(req, res) {
    const result = AuditService.getLogs({
      entityName: req.query.entityName || '',
      action: req.query.action || '',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      limit: 100
    });

    res.render('reports/audit-report', {
      title: 'Security & Compliance Audit Report - AcxiomCRM',
      logs: result.logs,
      total: result.total,
      filters: req.query
    });
  }
}

module.exports = ReportController;
