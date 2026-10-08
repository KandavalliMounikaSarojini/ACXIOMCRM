const assert = require('assert');
const bcrypt = require('bcryptjs');
const db = require('../src/database/db');
const AuthService = require('../src/services/authService');
const CustomerService = require('../src/services/customerService');
const LeadService = require('../src/services/leadService');
const OpportunityService = require('../src/services/opportunityService');
const FollowUpService = require('../src/services/followUpService');

async function runTests() {
  console.log('🧪 Starting AcxiomCRM Enterprise Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function it(description, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function itAsync(description, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${description}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  console.log('--- 1. Database Schema & State Verification ---');
  it('Primary roles exist (Admin, Manager, SalesExecutive)', () => {
    const roles = db.prepare('SELECT RoleName FROM Roles ORDER BY RoleId ASC').all();
    const roleNames = roles.map(r => r.RoleName);
    assert.deepStrictEqual(roleNames, ['Admin', 'Manager', 'SalesExecutive']);
  });

  it('Zero mock / fake entities exist in clean production state', () => {
    const custCount = db.prepare('SELECT COUNT(*) as count FROM Customers').get().count;
    const leadCount = db.prepare('SELECT COUNT(*) as count FROM Leads').get().count;
    const oppCount = db.prepare('SELECT COUNT(*) as count FROM Opportunities').get().count;
    const followCount = db.prepare('SELECT COUNT(*) as count FROM FollowUps').get().count;
    assert.strictEqual(custCount, 0, 'Customers table must have 0 mock records');
    assert.strictEqual(leadCount, 0, 'Leads table must have 0 mock records');
    assert.strictEqual(oppCount, 0, 'Opportunities table must have 0 mock records');
    assert.strictEqual(followCount, 0, 'FollowUps table must have 0 mock records');
  });

  console.log('\n--- 2. Authentication & Security ---');
  await itAsync('Admin account authenticates with correct credentials', async () => {
    const res = await AuthService.authenticateUser('admin@acxiomcrm.com', 'Admin@12345', '127.0.0.1');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.user.roleName, 'Admin');
    assert.ok(res.token, 'JWT token should be generated');
  });

  await itAsync('Manager account authenticates with correct credentials', async () => {
    const res = await AuthService.authenticateUser('manager@acxiomcrm.com', 'Manager@12345', '127.0.0.1');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.user.roleName, 'Manager');
  });

  await itAsync('Sales Executive account authenticates with correct credentials', async () => {
    const res = await AuthService.authenticateUser('sales@acxiomcrm.com', 'Sales@12345', '127.0.0.1');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.user.roleName, 'SalesExecutive');
  });

  await itAsync('Invalid password fails authentication gracefully', async () => {
    const res = await AuthService.authenticateUser('admin@acxiomcrm.com', 'WrongPassword!', '127.0.0.1');
    assert.strictEqual(res.success, false);
    assert.ok(res.message.includes('Invalid') || res.message.includes('attempts remaining'));
  });

  await itAsync('Self-registration creates new SalesExecutive user and rejects duplicates', async () => {
    const testEmail = `testuser_${Date.now()}@acxiomtest.com`;
    const regRes = await AuthService.registerUser({
      name: 'Test Candidate',
      email: testEmail,
      password: 'Password@123',
      roleName: 'SalesExecutive',
      ipAddress: '127.0.0.1'
    });
    assert.strictEqual(regRes.success, true);

    // Duplicate email check
    const dupRes = await AuthService.registerUser({
      name: 'Duplicate Candidate',
      email: testEmail,
      password: 'Password@123',
      roleName: 'SalesExecutive',
      ipAddress: '127.0.0.1'
    });
    assert.strictEqual(dupRes.success, false);
    assert.ok(dupRes.message.includes('already exists'));

    // Clean up test user
    db.prepare('DELETE FROM Users WHERE Email = ?').run(testEmail);
  });

  console.log('\n--- 3. Core Business Services Verification ---');
  it('Customer creation, retrieval, and code generation', () => {
    const res = CustomerService.createCustomer({
      CustomerName: 'Alice Smith',
      CompanyName: 'Test Corporation',
      Email: 'alice@testcorp.com',
      Phone: '+1 555-019-9999',
      Address: '100 Market St',
      City: 'San Francisco',
      State: 'CA',
      Status: 'Active',
      OwnerId: 3
    }, { userId: 3, name: 'Sales Executive', roleName: 'SalesExecutive' });

    assert.strictEqual(res.success, true);
    assert.ok(res.customer.CustomerId);
    assert.ok(res.customer.CustomerCode.startsWith('CUST-'));

    const fetched = CustomerService.getCustomerById(res.customer.CustomerId);
    assert.strictEqual(fetched.CustomerName, 'Alice Smith');

    // Clean up
    CustomerService.deleteCustomer(res.customer.CustomerId, { userId: 1, name: 'Admin', roleName: 'Admin' });
  });

  it('Lead lifecycle and validation', () => {
    const res = LeadService.createLead({
      LeadName: 'Bob Vance',
      CompanyName: 'Vance Refrigeration',
      Email: 'bob@vancerefrig.com',
      Phone: '+1 555-014-4444',
      Source: 'Website',
      Status: 'New',
      Priority: 'High',
      ExpectedValue: 25000,
      AssignedTo: 3
    }, { userId: 3, name: 'Sales Executive', roleName: 'SalesExecutive' });

    assert.strictEqual(res.success, true);
    assert.ok(res.lead.LeadId);
    assert.ok(res.lead.LeadCode.startsWith('LEAD-'));

    const fetched = LeadService.getLeadById(res.lead.LeadId);
    assert.strictEqual(fetched.LeadName, 'Bob Vance');

    // Clean up
    LeadService.deleteLead(res.lead.LeadId, { userId: 1, name: 'Admin', roleName: 'Admin' });
  });

  it('Opportunity creation and pipeline stage progression', () => {
    const res = OpportunityService.createOpportunity({
      OpportunityName: 'Enterprise Software Subscription',
      Amount: 48000,
      Stage: 'Qualification',
      Probability: 25,
      ExpectedCloseDate: '2026-12-31',
      AssignedTo: 3
    }, { userId: 3, name: 'Sales Executive', roleName: 'SalesExecutive' });

    assert.strictEqual(res.success, true);
    assert.ok(res.opportunity.OpportunityId);

    // Update stage to Proposal
    const updateRes = OpportunityService.updateOpportunity(
      res.opportunity.OpportunityId,
      {
        OpportunityName: 'Enterprise Software Subscription',
        Amount: 48000,
        Stage: 'Proposal',
        Probability: 50,
        ExpectedCloseDate: '2026-12-31',
        AssignedTo: 3
      },
      { userId: 3, name: 'Sales Executive', roleName: 'SalesExecutive' }
    );
    assert.strictEqual(updateRes.success, true);

    // Clean up
    OpportunityService.deleteOpportunity(res.opportunity.OpportunityId, { userId: 1, name: 'Admin', roleName: 'Admin' });
  });

  it('Follow-Up scheduling and completion', () => {
    const res = FollowUpService.createFollowUp({
      Subject: 'Follow up on introductory demo',
      FollowUpDate: '2026-11-15T10:00',
      Type: 'Call',
      Remarks: 'Follow up on introductory demo and pricing questions.',
      Status: 'Planned',
      AssignedTo: 3
    }, { userId: 3, name: 'Sales Executive', roleName: 'SalesExecutive' });

    assert.strictEqual(res.success, true);
    assert.ok(res.followUp.FollowUpId);

    // Update follow-up to Completed
    const completeRes = FollowUpService.updateFollowUp(
      res.followUp.FollowUpId,
      {
        Subject: 'Follow up on introductory demo',
        FollowUpDate: '2026-11-15T10:00',
        Type: 'Call',
        Remarks: 'Call completed with positive feedback.',
        Status: 'Completed',
        AssignedTo: 3
      },
      { userId: 3, name: 'Sales Executive', roleName: 'SalesExecutive' }
    );
    assert.strictEqual(completeRes.success, true);

    // Clean up
    FollowUpService.deleteFollowUp(res.followUp.FollowUpId, { userId: 1, name: 'Admin', roleName: 'Admin' });
  });

  console.log('\n========================================================');
  console.log(`📊 Total Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All acceptance tests passed successfully with 100% success rate!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
