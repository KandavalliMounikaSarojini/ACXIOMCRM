const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('../config/appConfig');

// Ensure database directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(config.dbPath);

// Enable foreign keys & WAL mode
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
function initializeDatabase() {
  db.exec(`
    -- Roles table
    CREATE TABLE IF NOT EXISTS Roles (
      RoleId INTEGER PRIMARY KEY AUTOINCREMENT,
      RoleName TEXT UNIQUE NOT NULL
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS Users (
      UserId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Email TEXT UNIQUE NOT NULL,
      PasswordHash TEXT NOT NULL,
      RoleId INTEGER NOT NULL,
      RoleName TEXT NOT NULL,
      IsActive INTEGER NOT NULL DEFAULT 1,
      FailedLoginCount INTEGER NOT NULL DEFAULT 0,
      LockoutEnd TEXT NULL,
      CreatedDate TEXT NOT NULL,
      LastLoginDate TEXT NULL,
      FOREIGN KEY (RoleId) REFERENCES Roles(RoleId)
    );

    -- Customers table
    CREATE TABLE IF NOT EXISTS Customers (
      CustomerId INTEGER PRIMARY KEY AUTOINCREMENT,
      CustomerCode TEXT UNIQUE NOT NULL,
      CustomerName TEXT NOT NULL,
      Email TEXT UNIQUE NOT NULL,
      Phone TEXT UNIQUE NOT NULL,
      CompanyName TEXT,
      Address TEXT,
      City TEXT,
      State TEXT,
      Status TEXT NOT NULL DEFAULT 'Active', -- Active, Inactive, Prospect
      OwnerId INTEGER,
      CreatedBy INTEGER,
      Notes TEXT,
      CreatedDate TEXT NOT NULL,
      ModifiedDate TEXT NOT NULL,
      FOREIGN KEY (OwnerId) REFERENCES Users(UserId),
      FOREIGN KEY (CreatedBy) REFERENCES Users(UserId)
    );

    -- Leads table
    CREATE TABLE IF NOT EXISTS Leads (
      LeadId INTEGER PRIMARY KEY AUTOINCREMENT,
      LeadCode TEXT UNIQUE NOT NULL,
      LeadName TEXT NOT NULL,
      Email TEXT NOT NULL,
      Phone TEXT NOT NULL,
      CompanyName TEXT,
      Source TEXT NOT NULL, -- Website, Referral, LinkedIn, Cold Call, Exhibition, Email Campaign, Other
      Status TEXT NOT NULL DEFAULT 'New', -- New, Contacted, Qualified, Unqualified, Converted, Lost
      Priority TEXT NOT NULL DEFAULT 'Medium', -- Low, Medium, High, Urgent
      ExpectedValue REAL NOT NULL DEFAULT 0,
      AssignedTo INTEGER,
      Notes TEXT,
      ConvertedCustomerId INTEGER NULL,
      ConvertedOpportunityId INTEGER NULL,
      CreatedDate TEXT NOT NULL,
      ModifiedDate TEXT NOT NULL,
      FOREIGN KEY (AssignedTo) REFERENCES Users(UserId),
      FOREIGN KEY (ConvertedCustomerId) REFERENCES Customers(CustomerId)
    );

    -- Opportunities table
    CREATE TABLE IF NOT EXISTS Opportunities (
      OpportunityId INTEGER PRIMARY KEY AUTOINCREMENT,
      OpportunityName TEXT NOT NULL,
      CustomerId INTEGER,
      LeadId INTEGER,
      Amount REAL NOT NULL DEFAULT 0,
      Stage TEXT NOT NULL DEFAULT 'Qualification', -- Qualification, Proposal, Negotiation, Won, Lost
      Probability INTEGER NOT NULL DEFAULT 20, -- 0 to 100
      ExpectedCloseDate TEXT NOT NULL,
      Status TEXT NOT NULL DEFAULT 'Open', -- Open, Won, Lost, Abandoned
      AssignedTo INTEGER,
      Notes TEXT,
      CreatedDate TEXT NOT NULL,
      ModifiedDate TEXT NOT NULL,
      FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId),
      FOREIGN KEY (LeadId) REFERENCES Leads(LeadId),
      FOREIGN KEY (AssignedTo) REFERENCES Users(UserId)
    );

    -- Follow-ups table
    CREATE TABLE IF NOT EXISTS FollowUps (
      FollowUpId INTEGER PRIMARY KEY AUTOINCREMENT,
      CustomerId INTEGER,
      LeadId INTEGER,
      OpportunityId INTEGER,
      FollowUpDate TEXT NOT NULL,
      FollowUpType TEXT NOT NULL, -- Call, Meeting, Email, Video Demo, Quote Review, Task
      Subject TEXT NOT NULL,
      Remarks TEXT,
      Status TEXT NOT NULL DEFAULT 'Planned', -- Planned, Completed, Missed, Cancelled
      AssignedTo INTEGER NOT NULL,
      CreatedDate TEXT NOT NULL,
      CompletedDate TEXT,
      FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId),
      FOREIGN KEY (LeadId) REFERENCES Leads(LeadId),
      FOREIGN KEY (OpportunityId) REFERENCES Opportunities(OpportunityId),
      FOREIGN KEY (AssignedTo) REFERENCES Users(UserId)
    );

    -- Activities table
    CREATE TABLE IF NOT EXISTS Activities (
      ActivityId INTEGER PRIMARY KEY AUTOINCREMENT,
      ActivityType TEXT NOT NULL, -- Call, Meeting, Email, Task
      Subject TEXT NOT NULL,
      Description TEXT,
      ActivityDate TEXT NOT NULL,
      CustomerId INTEGER,
      LeadId INTEGER,
      OpportunityId INTEGER,
      AssignedTo INTEGER NOT NULL,
      Status TEXT NOT NULL DEFAULT 'Completed', -- Completed, Pending, In-Progress
      CreatedDate TEXT NOT NULL,
      FOREIGN KEY (CustomerId) REFERENCES Customers(CustomerId),
      FOREIGN KEY (LeadId) REFERENCES Leads(LeadId),
      FOREIGN KEY (OpportunityId) REFERENCES Opportunities(OpportunityId),
      FOREIGN KEY (AssignedTo) REFERENCES Users(UserId)
    );

    -- Audit Logs table
    CREATE TABLE IF NOT EXISTS AuditLogs (
      AuditLogId INTEGER PRIMARY KEY AUTOINCREMENT,
      UserId INTEGER,
      UserName TEXT,
      UserRole TEXT,
      Action TEXT NOT NULL, -- LOGIN, LOGOUT, FAILED_LOGIN, CREATE, UPDATE, DELETE, CONVERT, STAGE_CHANGE, LOCKOUT, UNLOCK, PASSWORD_RESET
      EntityName TEXT NOT NULL, -- User, Customer, Lead, Opportunity, FollowUp, Activity, Auth
      RecordId TEXT,
      OldValue TEXT, -- JSON formatted snapshot of prior state
      NewValue TEXT, -- JSON formatted snapshot of new state
      Details TEXT,
      IpAddress TEXT,
      CreatedDate TEXT NOT NULL
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON Users(Email);
    CREATE INDEX IF NOT EXISTS idx_customers_owner ON Customers(OwnerId);
    CREATE INDEX IF NOT EXISTS idx_customers_status ON Customers(Status);
    CREATE INDEX IF NOT EXISTS idx_leads_assigned ON Leads(AssignedTo);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON Leads(Status);
    CREATE INDEX IF NOT EXISTS idx_opps_assigned ON Opportunities(AssignedTo);
    CREATE INDEX IF NOT EXISTS idx_opps_stage ON Opportunities(Stage);
    CREATE INDEX IF NOT EXISTS idx_opps_customer ON Opportunities(CustomerId);
    CREATE INDEX IF NOT EXISTS idx_followups_assigned ON FollowUps(AssignedTo);
    CREATE INDEX IF NOT EXISTS idx_followups_date ON FollowUps(FollowUpDate);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON AuditLogs(EntityName, RecordId);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON AuditLogs(UserId);
    CREATE INDEX IF NOT EXISTS idx_audit_date ON AuditLogs(CreatedDate);
  `);

  // Insert default roles if missing
  const checkRoles = db.prepare('SELECT COUNT(*) as count FROM Roles').get();
  if (checkRoles.count === 0) {
    const insertRole = db.prepare('INSERT INTO Roles (RoleName) VALUES (?)');
    insertRole.run('Admin');
    insertRole.run('Manager');
    insertRole.run('SalesExecutive');
  }
}

initializeDatabase();

module.exports = db;
