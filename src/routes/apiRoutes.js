const express = require('express');
const router = express.Router();

const { requireApiAuth, requireApiRole } = require('../middleware/apiAuthMiddleware');

const AuthApiController = require('../api/authApiController');
const CustomerApiController = require('../api/customerApiController');
const LeadApiController = require('../api/leadApiController');
const OpportunityApiController = require('../api/opportunityApiController');
const FollowUpApiController = require('../api/followUpApiController');
const ActivityApiController = require('../api/activityApiController');
const ReportApiController = require('../api/reportApiController');
const AuditApiController = require('../api/auditApiController');

// Authentication Endpoints (Public / Authenticated)
router.post('/auth/login', AuthApiController.login);
router.post('/auth/logout', requireApiAuth, AuthApiController.logout);
router.get('/auth/me', requireApiAuth, AuthApiController.getProfile);

// Customer Endpoints (Authorized)
router.get('/customers', requireApiAuth, CustomerApiController.getAll);
router.get('/customers/:id', requireApiAuth, CustomerApiController.getById);
router.post('/customers', requireApiAuth, CustomerApiController.create);
router.put('/customers/:id', requireApiAuth, CustomerApiController.update);
router.delete('/customers/:id', requireApiAuth, CustomerApiController.delete);

// Lead Endpoints (Authorized)
router.get('/leads', requireApiAuth, LeadApiController.getAll);
router.get('/leads/:id', requireApiAuth, LeadApiController.getById);
router.post('/leads', requireApiAuth, LeadApiController.create);
router.put('/leads/:id', requireApiAuth, LeadApiController.update);
router.post('/leads/:id/convert', requireApiAuth, LeadApiController.convert);
router.delete('/leads/:id', requireApiAuth, LeadApiController.delete);

// Opportunity Endpoints (Authorized)
router.get('/opportunities', requireApiAuth, OpportunityApiController.getAll);
router.get('/opportunities/:id', requireApiAuth, OpportunityApiController.getById);
router.post('/opportunities', requireApiAuth, OpportunityApiController.create);
router.put('/opportunities/:id', requireApiAuth, OpportunityApiController.update);
router.delete('/opportunities/:id', requireApiAuth, OpportunityApiController.delete);

// Follow-Up Endpoints (Authorized)
router.get('/followups', requireApiAuth, FollowUpApiController.getAll);
router.get('/followups/:id', requireApiAuth, FollowUpApiController.getById);
router.post('/followups', requireApiAuth, FollowUpApiController.create);
router.put('/followups/:id', requireApiAuth, FollowUpApiController.update);
router.delete('/followups/:id', requireApiAuth, FollowUpApiController.delete);

// Activity Endpoints (Authorized)
router.get('/activities', requireApiAuth, ActivityApiController.getAll);
router.get('/activities/:id', requireApiAuth, ActivityApiController.getById);
router.post('/activities', requireApiAuth, ActivityApiController.create);

// Reporting Endpoints (Manager/Admin / Authorized)
router.get('/reports/pipeline', requireApiAuth, ReportApiController.getPipeline);
router.get('/reports/dashboard', requireApiAuth, ReportApiController.getDashboardKPIs);
router.get('/reports/sales', requireApiAuth, requireApiRole(['Admin', 'Manager']), ReportApiController.getSalesPerformance);

// Audit Log Endpoints (Admin & Manager)
router.get('/audit-logs', requireApiAuth, requireApiRole(['Admin', 'Manager']), AuditApiController.getAll);
router.get('/audit-logs/:id', requireApiAuth, requireApiRole(['Admin', 'Manager']), AuditApiController.getById);

module.exports = router;
