const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('🌱 Seeding AcxiomCRM Enterprise Database...');

  // 1. Ensure Roles
  const roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Manager' },
    { id: 3, name: 'SalesExecutive' }
  ];

  for (const r of roles) {
    const exists = db.prepare('SELECT RoleId FROM Roles WHERE RoleName = ?').get(r.name);
    if (!exists) {
      db.prepare('INSERT INTO Roles (RoleId, RoleName) VALUES (?, ?)').run(r.id, r.name);
    }
  }

  // 2. Hash default passwords
  const salt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash('Admin@12345', salt);
  const managerHash = await bcrypt.hash('Manager@12345', salt);
  const salesHash = await bcrypt.hash('Sales@12345', salt);

  const now = new Date().toISOString();

  // 3. Clear existing test data cleanly for deterministic re-seeding
  db.exec(`
    DELETE FROM AuditLogs;
    DELETE FROM Activities;
    DELETE FROM FollowUps;
    DELETE FROM Opportunities;
    DELETE FROM Leads;
    DELETE FROM Customers;
    DELETE FROM Users;
  `);

  // 4. Insert Primary Organizational Accounts (Admin, Manager, Sales Executive)
  const insertUser = db.prepare(`
    INSERT INTO Users (UserId, Name, Email, PasswordHash, RoleId, RoleName, IsActive, FailedLoginCount, CreatedDate)
    VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
  `);

  insertUser.run(1, 'System Administrator', 'admin@acxiomcrm.com', adminHash, 1, 'Admin', now);
  insertUser.run(2, 'Regional Sales Manager', 'manager@acxiomcrm.com', managerHash, 2, 'Manager', now);
  insertUser.run(3, 'Sales Executive', 'sales@acxiomcrm.com', salesHash, 3, 'SalesExecutive', now);

  console.log('✅ System Roles & Primary Organizational Accounts Initialized:');
  console.log('   👑 Admin:           admin@acxiomcrm.com       / Admin@12345');
  console.log('   📊 Manager:         manager@acxiomcrm.com     / Manager@12345');
  console.log('   💼 Sales Executive: sales@acxiomcrm.com       / Sales@12345');
  console.log('✨ Clean production database initialized. No mock business data present.');
}

if (require.main === module) {
  seed().then(() => {
    console.log('Seeding completed.');
    process.exit(0);
  }).catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
