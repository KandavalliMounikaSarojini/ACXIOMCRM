const express = require('express');
const router = express.Router();

const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const AuthController = require('../controllers/authController');
const DashboardController = require('../controllers/dashboardController');
const CustomerController = require('../controllers/customerController');
const LeadController = require('../controllers/leadController');
const OpportunityController = require('../controllers/opportunityController');
const FollowUpController = require('../controllers/followUpController');
const ActivityController = require('../controllers/activityController');
const UserController = require('../controllers/userController');
const AuditController = require('../controllers/auditController');
const ReportController = require('../controllers/reportController');

// Root redirect
router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

// Authentication & Profile Routes
router.get('/login', AuthController.renderLogin);
router.post('/login', AuthController.handleLogin);
router.get('/register', AuthController.renderRegister);
router.post('/register', AuthController.handleRegister);
router.get('/logout', AuthController.handleLogout);
router.get('/profile', requireAuth, AuthController.renderProfile);

// Dashboard Routes
router.get('/dashboard', requireAuth, DashboardController.renderDashboard);
router.get('/dashboard/charts-data', requireAuth, DashboardController.getChartsData);

// Customer Management Routes
router.get('/customers', requireAuth, CustomerController.renderIndex);
router.get('/customers/create', requireAuth, CustomerController.renderCreate);
router.post('/customers/create', requireAuth, CustomerController.handleCreate);
router.get('/customers/:id', requireAuth, CustomerController.renderDetails);
router.get('/customers/:id/edit', requireAuth, CustomerController.renderEdit);
router.post('/customers/:id/edit', requireAuth, CustomerController.handleUpdate);
router.post('/customers/:id/delete', requireAuth, CustomerController.handleDelete);

// Lead Management Routes
router.get('/leads', requireAuth, LeadController.renderIndex);
router.get('/leads/create', requireAuth, LeadController.renderCreate);
router.post('/leads/create', requireAuth, LeadController.handleCreate);
router.get('/leads/:id', requireAuth, LeadController.renderDetails);
router.get('/leads/:id/edit', requireAuth, LeadController.renderEdit);
router.post('/leads/:id/edit', requireAuth, LeadController.handleUpdate);
router.post('/leads/:id/convert', requireAuth, LeadController.handleConvert);
router.post('/leads/:id/delete', requireAuth, LeadController.handleDelete);

// Opportunity Management Routes
router.get('/opportunities', requireAuth, OpportunityController.renderIndex);
router.get('/opportunities/kanban', requireAuth, OpportunityController.renderKanban);
router.get('/opportunities/create', requireAuth, OpportunityController.renderCreate);
router.post('/opportunities/create', requireAuth, OpportunityController.handleCreate);
router.get('/opportunities/:id', requireAuth, OpportunityController.renderDetails);
router.get('/opportunities/:id/edit', requireAuth, OpportunityController.renderEdit);
router.post('/opportunities/:id/edit', requireAuth, OpportunityController.handleUpdate);
router.post('/opportunities/:id/stage', requireAuth, OpportunityController.handleQuickStageUpdate);
router.post('/opportunities/:id/delete', requireAuth, OpportunityController.handleDelete);

// Follow-Up Routes
router.get('/followups', requireAuth, FollowUpController.renderIndex);
router.get('/followups/create', requireAuth, FollowUpController.renderCreate);
router.post('/followups/create', requireAuth, FollowUpController.handleCreate);
router.post('/followups/:id/status', requireAuth, FollowUpController.handleStatusUpdate);
router.post('/followups/:id/delete', requireAuth, FollowUpController.handleDelete);

// Activity Routes
router.get('/activities', requireAuth, ActivityController.renderIndex);
router.get('/activities/create', requireAuth, ActivityController.renderCreate);
router.post('/activities/create', requireAuth, ActivityController.handleCreate);

// User & Role Management Routes (Admin only)
router.get('/users', requireRole('Admin'), UserController.renderIndex);
router.get('/users/create', requireRole('Admin'), UserController.renderCreate);
router.post('/users/create', requireRole('Admin'), UserController.handleCreate);
router.get('/users/:id/edit', requireRole('Admin'), UserController.renderEdit);
router.post('/users/:id/edit', requireRole('Admin'), UserController.handleUpdate);
router.post('/users/:id/reset-password', requireRole('Admin'), UserController.handleResetPassword);
router.post('/users/:id/unlock', requireRole('Admin'), UserController.handleUnlock);

// Audit Log Routes (Admin & Manager)
router.get('/audit', requireRole(['Admin', 'Manager']), AuditController.renderIndex);
router.get('/audit/:id/details', requireRole(['Admin', 'Manager']), AuditController.getLogDetails);

// Report Routes
router.get('/reports', requireAuth, ReportController.renderIndex);
router.get('/reports/customers', requireAuth, ReportController.renderCustomerReport);
router.get('/reports/customers/export', requireAuth, ReportController.exportCustomerCSV);
router.get('/reports/leads', requireAuth, ReportController.renderLeadReport);
router.get('/reports/leads/export', requireAuth, ReportController.exportLeadCSV);
router.get('/reports/pipeline', requireAuth, ReportController.renderPipelineReport);
router.get('/reports/pipeline/export', requireAuth, ReportController.exportPipelineCSV);
router.get('/reports/sales', requireRole(['Admin', 'Manager']), ReportController.renderSalesReport);
router.get('/reports/audit', requireRole('Admin'), ReportController.renderAuditReport);

// API Documentation & Interactive Explorer
router.get('/api-docs', requireAuth, (req, res) => {
  res.render('api-docs/index', {
    title: 'REST API Interactive Documentation - AcxiomCRM',
    jwtToken: req.session.token || ''
  });
});

module.exports = router;
