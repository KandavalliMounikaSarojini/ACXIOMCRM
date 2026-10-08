# 🏢 AcxiomCRM Enterprise — Technical Specification & Comprehensive Documentation

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite%20WAL%20Engine-blue.svg)]()
[![Security](https://img.shields.io/badge/Security-RBAC%20%7C%20Bcrypt%20%7C%20Audit%20Diffs-orange.svg)]()
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Architecture](https://img.shields.io/badge/Architecture-5--Tier%20Decoupled%20MVC-brightgreen.svg)]()

> **AcxiomCRM Enterprise** is a production-grade, enterprise-scale Customer Relationship Management (CRM) system designed to orchestrate the end-to-end sales lifecycle—from prospect lead acquisition, scoring, and atomic one-click customer conversion to multi-stage opportunity pipeline forecasting, interactive Kanban management, activity scheduling, compliance reporting, and immutable audit logging.

---

## 📑 Master Table of Contents

1. [Executive Summary & System Vision](#1-executive-summary--system-vision)
2. [5-Tier Layered Architecture & Design Patterns](#2-5-tier-layered-architecture--design-patterns)
3. [Repository Structure & Codebase Map](#3-repository-structure--codebase-map)
4. [Relational Database Schema & Data Dictionary](#4-relational-database-schema--data-dictionary)
5. [Business Logic, Domain Services & Validation Engine](#5-business-logic-domain-services--validation-engine)
6. [Security Architecture & Hardening Guide](#6-security-architecture--hardening-guide)
7. [Comprehensive Functional Module Walkthrough](#7-comprehensive-functional-module-walkthrough)
8. [Complete REST API Specification](#8-complete-rest-api-specification)
9. [Operational Deployment & Production Readiness](#9-operational-deployment--production-readiness)
10. [Setup, 1-Click Launchers & Troubleshooting](#10-setup-1-click-launchers--troubleshooting)
11. [System Roles & Default Governance Directory](#11-system-roles--default-governance-directory)

---

## 1. Executive Summary & System Vision

Modern enterprise sales operations require strict scope isolation, reliable lead-to-revenue tracking, data integrity, and compliance auditing without unnecessary overhead. AcxiomCRM is engineered to satisfy all functional and technical criteria defined in the *AcxiomCRM Complete Project Assignment Specification*.

### Core Value Propositions:
- **Strict Role-Based Scope Isolation:** Dedicated operational boundaries for **Administrators**, **Sales Managers**, and **Sales Executives**.
- **Atomic Lead Conversion Engine:** A transactional 1-click conversion mechanism that seamlessly creates customer accounts and linked sales opportunities without orphan records or data loss.
- **Visual Opportunity Pipeline Board:** An interactive 5-stage Kanban board providing stage-by-stage valuations and automated weighted pipeline forecasting ($\text{Value} = \text{Amount} \times \text{Probability} / 100$).
- **Customer 360° View:** A unified account console consolidating master records, active deals, follow-up calendars, engagement histories, and historical audit entries.
- **Immutable Compliance Audit Trail:** Append-only security and mutation tracking with JSON before/after state diff snapshots.
- **Zero Placeholder / Zero Fake Data:** Initialized with a clean production schema and primary administrative roles, ready for real enterprise operational data.

---

## 2. 5-Tier Layered Architecture & Design Patterns

AcxiomCRM strictly enforces a decoupled 5-tier architecture. Each tier has single-responsibility encapsulation, ensuring maintainability, testability, and clear separation of concerns.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       TIER 1: PRESENTATION & CLIENT LAYER                        │
│  - Semantic HTML5 & Responsive Enterprise Layout                                 │
│  - Google Fonts: Inter Typography & Curated Neutral/Slate Palette               │
│  - Dynamic Chart.js 4.4 Visualizations (Funnel Doughnut, Stage Bar, Sales Trend) │
│  - Unobtrusive Client-Side Validation Engine & Toast Notification Dispatcher    │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                   TIER 2: APPLICATION & CONTROLLER LAYER                         │
│  - MVC Web Controllers: Request parsing, session retrieval, view rendering       │
│  - REST API Controllers: JSON payload handling, DTO serialization, HTTP codes    │
│  - HTTP Security Headers Middleware: Clickjacking, XSS, and MIME-sniffing armor  │
│  - Centralized Error Handling: RFC-compliant 403 Forbidden, 404, 500 responders  │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                   TIER 3: SECURITY, AUTH & MIDDLEWARE LAYER                      │
│  - Session Management: Secure HttpOnly, SameSite=Lax cookie lifecycle            │
│  - Session Fixation Prevention: Session regeneration upon authentication         │
│  - JWT Bearer Token Issuer & Cryptographic Verifier (HS256)                      │
│  - RBAC Scope Guard: Scoped ownership filtering (Admin vs. Manager vs. Sales)   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                    TIER 4: DOMAIN & BUSINESS SERVICES LAYER                      │
│  - CustomerService: Email/Phone uniqueness check, 360° data aggregation          │
│  - LeadService: Source tracking, priority scoring, atomic conversion engine      │
│  - OpportunityService: Financial constraint checks, weighted value calculation   │
│  - FollowUpService: Timeframe filters, overdue calculation, status automation    │
│  - AuthService & UserService: Password complexity, 5-strike lockout state machine│
│  - AuditService: Append-only audit writer, JSON snapshot generator               │
│  - ReportService: Aggregate SQL metric derivation, anti-formula CSV exporter     │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                   TIER 5: DATA ACCESS & PERSISTENCE LAYER                        │
│  - Node 24 Native High-Performance SQLite Relational Engine                      │
│  - Write-Ahead Logging (WAL) Mode for High Concurrent Read/Write Throughput      │
│  - Parameterized Prepared Statements (Zero SQL Injection Risk)                   │
│  - Foreign Key Constraints (`PRAGMA foreign_keys = ON`)                          │
│  - Performance B-Tree Indexes on Foreign Keys, Emails, and Search Attributes     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Repository Structure & Codebase Map

```text
d:/PROJECTS/PRO/
│
├── .env                                  # Environment variables (Port, Secrets, Lockout params)
├── .vscode/                              # IDE 1-Click Launch & Task configurations
│   ├── launch.json                       # F5 Run & Debug launcher with browser integration
│   └── tasks.json                        # Build & execution tasks
├── data/
│   └── acxiomcrm.db                      # Persistent SQLite relational database file
│
├── src/
│   ├── api/                              # REST API Controllers (JSON DTO responses)
│   │   ├── activityApiController.js      # Activity REST endpoints (/api/activities)
│   │   ├── auditApiController.js         # Audit log query API (/api/audit)
│   │   ├── authApiController.js          # REST Login & Token issuance (/api/auth/login)
│   │   ├── customerApiController.js      # Customer CRUD API (/api/customers)
│   │   ├── followUpApiController.js      # Follow-up scheduler API (/api/followups)
│   │   ├── leadApiController.js          # Lead capture & conversion API (/api/leads)
│   │   ├── opportunityApiController.js   # Opportunity & stage API (/api/opportunities)
│   │   └── reportApiController.js        # KPI & pipeline analytics API (/api/reports)
│   │
│   ├── config/                           # Centralized application configuration
│   │   └── appConfig.js                  # Configuration loader with safe environment fallbacks
│   │
│   ├── controllers/                      # MVC Web Controllers (EJS View rendering)
│   │   ├── activityController.js         # Activity feed & logger web controller
│   │   ├── auditController.js            # Audit trail viewer web controller
│   │   ├── authController.js             # Authentication, registration & profile controller
│   │   ├── customerController.js         # Customer directory & 360° overview controller
│   │   ├── dashboardController.js        # Executive analytics dashboard controller
│   │   ├── followUpController.js         # Follow-up scheduler & status controller
│   │   ├── leadController.js             # Lead management & conversion web controller
│   │   ├── opportunityController.js      # Deal tracker & Kanban board controller
│   │   ├── reportController.js           # Analytics & CSV export controller
│   │   └── userController.js             # User & role administration controller
│   │
│   ├── database/                         # Data layer & migrations
│   │   ├── db.js                         # Database connection, foreign keys, DDL & indexes
│   │   └── seed.js                       # Clean initialization of roles & primary accounts
│   │
│   ├── middleware/                       # Security & cross-cutting middlewares
│   │   ├── apiAuthMiddleware.js          # JWT Bearer token authentication & role guard
│   │   ├── authMiddleware.js             # Session authentication, RBAC & context injection
│   │   └── errorHandler.js               # Centralized 403, 404, and 500 error handlers
│   │
│   ├── public/                           # Static public client assets
│   │   ├── css/
│   │   │   └── style.css                 # Enterprise CSS design system (Inter, cards, badges)
│   │   └── js/
│   │       ├── api-tester.js             # Live REST API Explorer client logic
│   │       ├── dashboard-charts.js       # Chart.js initialization & data fetchers
│   │       └── main.js                   # Client-side validation, toasts & modal binders
│   │
│   ├── routes/                           # Express routing configuration
│   │   ├── apiRoutes.js                  # Mounts all secured REST API endpoints (/api/*)
│   │   └── webRoutes.js                  # Mounts all MVC web application routes (/*)
│   │
│   ├── services/                         # Domain & Business Services
│   │   ├── activityService.js            # Activity logging & relationship management
│   │   ├── auditService.js               # Immutable audit logging & diff tracking
│   │   ├── authService.js                # Password hashing, lockout & token generation
│   │   ├── customerService.js            # Customer validation, uniqueness & 360° queries
│   │   ├── followUpService.js            # Scheduling, overdue checks & status transitions
│   │   ├── leadService.js                # Lead validation, scoring & 1-click conversion
│   │   ├── opportunityService.js         # Financial bounds, stage changes & weighted math
│   │   ├── reportService.js              # Aggregate reporting & anti-formula CSV exports
│   │   └── userService.js                # User provisioning, role assignment & unlock logic
│   │
│   ├── views/                            # EJS Template Views
│   │   ├── activities/                   # Activity list & creation templates
│   │   ├── audit/                        # Security audit log & JSON state diff modal
│   │   ├── auth/                         # Login, Register, User Profile views
│   │   ├── customers/                    # Customer directory, create, edit, 360° view
│   │   ├── dashboard/                    # Executive dashboard with KPI cards & Chart.js
│   │   ├── errors/                       # 403 Forbidden, 404 Not Found, 500 Error views
│   │   ├── followups/                    # Follow-up scheduler (today, upcoming, overdue)
│   │   ├── leads/                        # Lead capture, details, 1-click conversion modal
│   │   ├── opportunities/                # Opportunities table, 5-stage Kanban board
│   │   ├── reports/                      # Pipeline, lead conversion & sales reports
│   │   ├── users/                        # Admin user & role governance directory
│   │   └── layout.ejs                    # Global responsive application layout
│   │
│   └── server.js                         # Application entrypoint & HTTP server bootstrap
│
├── package.json                          # Dependencies & NPM scripts
├── package-lock.json
├── README.md                             # Complete master technical documentation
├── start.bat                             # Windows 1-click batch launcher
└── start.ps1                             # PowerShell 1-click launcher
```

---

## 4. Relational Database Schema & Data Dictionary

The persistence tier utilizes SQLite in `WAL` mode with foreign keys enabled (`PRAGMA foreign_keys = ON;`).

### 1. `Roles` Table
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `RoleId` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique Role identifier |
| `RoleName` | `TEXT` | `UNIQUE NOT NULL` | Role identifier (`Admin`, `Manager`, `SalesExecutive`) |

### 2. `Users` Table
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `UserId` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique User identifier |
| `Name` | `TEXT` | `NOT NULL` | Full Name of corporate employee |
| `Email` | `TEXT` | `UNIQUE NOT NULL` | Corporate email address (login username) |
| `PasswordHash` | `TEXT` | `NOT NULL` | Bcrypt password hash (10 salt rounds) |
| `RoleId` | `INTEGER` | `NOT NULL, FK -> Roles(RoleId)` | Role Foreign Key |
| `RoleName` | `TEXT` | `NOT NULL` | Denormalized role name for rapid authorization |
| `IsActive` | `INTEGER` | `NOT NULL DEFAULT 1` | Active status flag (1=Active, 0=Deactivated) |
| `FailedLoginCount` | `INTEGER` | `NOT NULL DEFAULT 0` | Consecutive failed login attempt counter |
| `LockoutEnd` | `TEXT` | `NULL` | ISO-8601 timestamp when account lockout expires |
| `CreatedDate` | `TEXT` | `NOT NULL` | Account registration timestamp |
| `LastLoginDate` | `TEXT` | `NULL` | Most recent successful login timestamp |

### 3. `Customers` Table
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `CustomerId` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique Customer identifier |
| `CustomerCode` | `TEXT` | `UNIQUE NOT NULL` | Auto-generated sequential code (`CUST-XXXX`) |
| `CustomerName` | `TEXT` | `NOT NULL` | Name of primary contact or business |
| `Email` | `TEXT` | `UNIQUE NOT NULL` | Unique customer email address |
| `Phone` | `TEXT` | `UNIQUE NOT NULL` | Unique customer phone number (10–15 digits) |
| `CompanyName` | `TEXT` | `NULL` | Organization / Corporate entity name |
| `Address` | `TEXT` | `NULL` | Street address |
| `City` | `TEXT` | `NULL` | City |
| `State` | `TEXT` | `NULL` | State / Province |
| `Status` | `TEXT` | `NOT NULL DEFAULT 'Active'` | `Active`, `Inactive`, or `Prospect` |
| `OwnerId` | `INTEGER` | `FK -> Users(UserId)` | Assigned Sales Executive owner |
| `CreatedBy` | `INTEGER` | `FK -> Users(UserId)` | Creator user ID |
| `Notes` | `TEXT` | `NULL` | Account notes and background information |
| `CreatedDate` | `TEXT` | `NOT NULL` | Record creation timestamp |
| `ModifiedDate` | `TEXT` | `NOT NULL` | Last update timestamp |

### 4. `Leads` Table
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `LeadId` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique Lead identifier |
| `LeadCode` | `TEXT` | `UNIQUE NOT NULL` | Auto-generated code (`LEAD-XXXX`) |
| `LeadName` | `TEXT` | `NOT NULL` | Prospect name |
| `Email` | `TEXT` | `NOT NULL` | Prospect email address |
| `Phone` | `TEXT` | `NOT NULL` | Prospect phone number |
| `CompanyName` | `TEXT` | `NULL` | Prospect company name |
| `Source` | `TEXT` | `NOT NULL` | `Website`, `Referral`, `LinkedIn`, `Cold Call`, `Exhibition`, `Email Campaign`, `Other` |
| `Status` | `TEXT` | `NOT NULL DEFAULT 'New'` | `New`, `Contacted`, `Qualified`, `Unqualified`, `Converted`, `Lost` |
| `Priority` | `TEXT` | `NOT NULL DEFAULT 'Medium'`| `Low`, `Medium`, `High`, `Urgent` |
| `ExpectedValue` | `REAL` | `NOT NULL DEFAULT 0` | Estimated potential deal amount |
| `AssignedTo` | `INTEGER` | `FK -> Users(UserId)` | Assigned Sales Executive |
| `Notes` | `TEXT` | `NULL` | Qualification and discovery notes |
| `ConvertedCustomerId` | `INTEGER` | `NULL, FK -> Customers` | Linked Customer ID upon conversion |
| `ConvertedOpportunityId` | `INTEGER`| `NULL, FK -> Opportunities` | Linked Opportunity ID upon conversion |
| `CreatedDate` | `TEXT` | `NOT NULL` | Record creation timestamp |
| `ModifiedDate` | `TEXT` | `NOT NULL` | Last update timestamp |

### 5. `Opportunities` Table
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `OpportunityId` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique Opportunity identifier |
| `OpportunityName` | `TEXT` | `NOT NULL` | Deal name / Project title |
| `CustomerId` | `INTEGER` | `FK -> Customers(CustomerId)` | Linked Customer account |
| `LeadId` | `INTEGER` | `NULL, FK -> Leads(LeadId)` | Linked source Lead (if converted) |
| `Amount` | `REAL` | `NOT NULL DEFAULT 0` | Total monetary value ($> 0$) |
| `Stage` | `TEXT` | `NOT NULL DEFAULT 'Qualification'` | `Qualification`, `Proposal`, `Negotiation`, `Won`, `Lost` |
| `Probability` | `INTEGER` | `NOT NULL DEFAULT 20` | Win probability percentage ($0 \le p \le 100$) |
| `ExpectedCloseDate` | `TEXT` | `NOT NULL` | Target closing date |
| `Status` | `TEXT` | `NOT NULL DEFAULT 'Open'` | `Open`, `Won`, `Lost`, `Abandoned` |
| `AssignedTo` | `INTEGER` | `FK -> Users(UserId)` | Opportunity owner |
| `Notes` | `TEXT` | `NULL` | Commercial terms & deal notes |
| `CreatedDate` | `TEXT` | `NOT NULL` | Record creation timestamp |
| `ModifiedDate` | `TEXT` | `NOT NULL` | Last update timestamp |

### 6. `FollowUps` Table
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `FollowUpId` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique Follow-up identifier |
| `CustomerId` | `INTEGER` | `NULL, FK -> Customers` | Linked Customer (if applicable) |
| `LeadId` | `INTEGER` | `NULL, FK -> Leads` | Linked Lead (if applicable) |
| `OpportunityId` | `INTEGER` | `NULL, FK -> Opportunities`| Linked Opportunity (if applicable) |
| `FollowUpDate` | `TEXT` | `NOT NULL` | Scheduled date and time |
| `FollowUpType` | `TEXT` | `NOT NULL` | `Call`, `Meeting`, `Email`, `Video Demo`, `Quote Review`, `Task` |
| `Subject` | `TEXT` | `NOT NULL` | Purpose / Topic of activity |
| `Remarks` | `TEXT` | `NULL` | Outcome notes or agenda |
| `Status` | `TEXT` | `NOT NULL DEFAULT 'Planned'`| `Planned`, `Completed`, `Missed`, `Cancelled` |
| `AssignedTo` | `INTEGER` | `NOT NULL, FK -> Users` | Assigned user |
| `CreatedDate` | `TEXT` | `NOT NULL` | Creation timestamp |
| `CompletedDate` | `TEXT` | `NULL` | Timestamp when marked completed |

### 7. `Activities` Table
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `ActivityId` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique Activity identifier |
| `ActivityType` | `TEXT` | `NOT NULL` | `Call`, `Meeting`, `Email`, `Task` |
| `Subject` | `TEXT` | `NOT NULL` | Activity headline |
| `Description` | `TEXT` | `NULL` | Detailed notes & interaction log |
| `ActivityDate` | `TEXT` | `NOT NULL` | Timestamp when interaction occurred |
| `CustomerId` | `INTEGER` | `NULL, FK -> Customers` | Linked Customer |
| `LeadId` | `INTEGER` | `NULL, FK -> Leads` | Linked Lead |
| `OpportunityId` | `INTEGER` | `NULL, FK -> Opportunities`| Linked Opportunity |
| `AssignedTo` | `INTEGER` | `NOT NULL, FK -> Users` | Executive who performed activity |
| `Status` | `TEXT` | `NOT NULL DEFAULT 'Completed'`| `Completed`, `Pending`, `In-Progress` |
| `CreatedDate` | `TEXT` | `NOT NULL` | Log creation timestamp |

### 8. `AuditLogs` Table (Immutable)
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `AuditLogId` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique log entry identifier |
| `UserId` | `INTEGER` | `NULL` | ID of acting user |
| `UserName` | `TEXT` | `NULL` | Name of acting user |
| `UserRole` | `TEXT` | `NULL` | Role of acting user at mutation time |
| `Action` | `TEXT` | `NOT NULL` | `LOGIN`, `LOGOUT`, `FAILED_LOGIN`, `LOCKOUT`, `CREATE`, `UPDATE`, `DELETE`, `CONVERT`, `STAGE_CHANGE` |
| `EntityName` | `TEXT` | `NOT NULL` | `User`, `Customer`, `Lead`, `Opportunity`, `FollowUp`, `Activity`, `Auth` |
| `RecordId` | `TEXT` | `NULL` | Target record primary key ID |
| `OldValue` | `TEXT` | `NULL` | JSON formatted snapshot of prior record state |
| `NewValue` | `TEXT` | `NULL` | JSON formatted snapshot of new record state |
| `Details` | `TEXT` | `NULL` | Human-readable explanation of mutation |
| `IpAddress` | `TEXT` | `NULL` | Client IPv4/IPv6 address |
| `CreatedDate` | `TEXT` | `NOT NULL` | Immutable timestamp of audit event |

---

## 5. Business Logic, Domain Services & Validation Engine

### 1. Dual-Layer Validation Architecture
Every user interaction passes through two validation boundaries:
1. **Client-Side Unobtrusive Layer (`main.js`):** Intercepts form submissions, verifies required fields, applies regular expressions for email and phone formats, validates positive numeric deal amounts, confirms probability bounds ($0-100\%$), checks future date constraints, and displays non-blocking toast notifications.
2. **Server-Side Domain Service Layer:** Re-validates all rules on the server, verifies database-level uniqueness constraints (e.g., checking if email or phone already exists), and returns structured error arrays (`{ field, message }`).

### 2. Atomic Lead-to-Customer Conversion Engine
When a lead is converted:
```text
[Qualified Lead (LEAD-XXXX)]
           │
           ▼
[LeadService.convertLead()] ──► BEGIN TRANSACTION
           │
           ├─► 1. Check Lead status (Must not already be 'Converted')
           ├─► 2. Insert new Customer record (Code: CUST-XXXX)
           ├─► 3. Insert new Opportunity record (Stage: Proposal, Amount: ExpectedValue)
           ├─► 4. Update Lead: Status = 'Converted', ConvertedCustomerId, ConvertedOpportunityId
           ├─► 5. Insert AuditLog ('CONVERT', Lead) & AuditLog ('CREATE', Customer)
           │
           ▼
     COMMIT TRANSACTION ──► Redirect to Customer 360 Profile
```

### 3. Weighted Pipeline Derivation
For any opportunity, the derived weighted pipeline value is mathematically computed in real-time as:
$$\text{Weighted Value} = \text{Amount} \times \left(\frac{\text{Probability}}{100}\right)$$
- `Qualification` Stage (Default Probability: 20%)
- `Proposal` Stage (Default Probability: 50%)
- `Negotiation` Stage (Default Probability: 80%)
- `Closed Won` Stage (Default Probability: 100%)
- `Closed Lost` Stage (Default Probability: 0%)

### 4. Follow-Up Overdue & Schedule Engine
Follow-ups in `Planned` status are evaluated against the current system timestamp:
$$\text{IsOverdue} = (\text{Status} == \text{'Planned'}) \land (\text{FollowUpDate} < \text{NOW()})$$
Overdue items trigger an alert banner across the Executive Dashboard with a direct 1-click resolution filter.

---

## 6. Security Architecture & Hardening Guide

### 1. HTTP Security Headers
Every HTTP response emitted by the Express server includes standard security headers:
- `X-Content-Type-Options: nosniff` — Prevents browsers from MIME-sniffing away from declared Content-Type.
- `X-Frame-Options: SAMEORIGIN` — Blocks clickjacking attacks by forbidding embedding in foreign iframes.
- `X-XSS-Protection: 1; mode=block` — Enables browser-level reflected cross-site scripting blocking.
- `Referrer-Policy: strict-origin-when-cross-origin` — Restricts sensitive referrer URL parameter leakage.
- `Permissions-Policy: geolocation=(), camera=(), microphone=()` — Blocks unauthorized hardware access.
- `app.disable('x-powered-by')` — Removes framework fingerprinting.
- `Cache-Control: no-store, no-cache, must-revalidate, private` — Applied to authenticated views and APIs to prevent caching of sensitive CRM data on shared proxies.

### 2. Session Fixation & Cookie Defense
- Upon every successful login or registration, `req.session.regenerate()` is invoked to issue a brand new session identifier, neutralizing session fixation vulnerabilities.
- Session cookies are configured with:
  - `httpOnly: true` (JavaScript cannot access cookies)
  - `sameSite: 'lax'` (CSRF mitigation)
  - `maxAge: 8 hours`

### 3. 5-Strike Brute Force Account Lockout Policy
- Tracks `FailedLoginCount` in the `Users` table.
- When `FailedLoginCount >= 5`:
  - `LockoutEnd` is set to $\text{NOW()} + 15\text{ minutes}$.
  - An audit log entry (`LOCKOUT`) is recorded.
  - Subsequent login attempts are blocked with HTTP 403 until the lockout expires or an Administrator manually unlocks the account via `/users/:id/unlock`.

### 4. Anti-CSV Formula Injection Defense
When exporting customer, lead, opportunity, or audit reports to CSV, any field starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) is sanitized by prefixing a single quote (`'`):
```javascript
function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}
```

### 5. Broken Object Level Authorization (BOLA / IDOR Defense)
- **Sales Executive Scoping:** When fetching individual records (`getCustomerById`, `getLeadById`, `getOpportunityById`), the service injects `AND OwnerId = user.userId` (or `AssignedTo = user.userId`).
- Unauthorized URL manipulation (attempting to view another executive's customer) immediately returns `403 Forbidden`.

---

## 7. Comprehensive Functional Module Walkthrough

### Module 1: Authentication & Identity Management
- **Registration (`/register`):** Allows corporate users to register. Validates name, corporate email, password policy (min 8 characters, uppercase, lowercase, number), and password confirmation.
- **Login (`/login`):** Validates credentials using `bcrypt.compare`, verifies account lockout status, regenerates session, records `LOGIN` audit event, and routes to `/dashboard`.
- **User Profile (`/profile`):** Displays authenticated user name, email, role, and active session details.
- **Logout (`/logout`):** Destroys server-side session, clears client cookie, and writes `LOGOUT` audit log.

### Module 2: Executive Dashboard & Visual Analytics
- **Live KPI Metric Cards:** Total Active Customers, Open vs. Total Leads, Active Pipeline Value ($), Weighted Pipeline Value ($), and Closed-Won Revenue ($).
- **Overdue Action Banner:** Prominently alerts executives to overdue follow-up activities with a direct action button.
- **Visual Chart.js Widgets:**
  - *Lead Status Funnel:* Interactive Doughnut chart breakdown (`New`, `Contacted`, `Qualified`, `Converted`, `Lost`).
  - *Opportunity Pipeline Bar Chart:* Stage-by-stage valuation breakdown.
  - *Monthly Revenue Performance:* Smooth spline area chart tracking closed-won sales over time.

### Module 3: Customer 360° Management
- **Directory (`/customers`):** Filterable table with pagination, keyword search (Name, Email, Phone, Company, Code), status filters (`Active`, `Inactive`, `Prospect`), and owner filters.
- **Create & Edit Customer:** Comprehensive validation for unique email, unique phone, and contact details.
- **Customer 360° Profile (`/customers/:id`):**
  - Master corporate information panel.
  - **Opportunities Tab:** List of all linked active and closed deals.
  - **Follow-Ups Tab:** Scheduled calls, meetings, and reviews with completion toggles.
  - **Activity Log Tab:** Historical interactions log.
  - **Audit Trail Tab:** Historical mutation logs for this customer account.

### Module 4: Lead Lifecycle & Conversion Engine
- **Lead Capture (`/leads/create`):** Captures lead source (`Website`, `Referral`, `LinkedIn`, etc.), priority (`Low`, `Medium`, `High`, `Urgent`), and expected value.
- **Lead Details (`/leads/:id`):** Prospect overview with status progression buttons.
- **1-Click Conversion Modal:** Modal window allowing the executive to set deal name, amount, and close date, converting the lead to an active Customer and Opportunity in one step.

### Module 5: Opportunity Pipeline & Visual Kanban Board
- **Table View (`/opportunities`):** Tabular view with deal amounts, probabilities, weighted values, and close dates.
- **5-Stage Kanban Board (`/opportunities/kanban`):** Visual pipeline with cards categorized across `Qualification`, `Proposal`, `Negotiation`, `Closed Won`, and `Closed Lost`.
- **1-Click Stage Transitions:** Dedicated navigation controls on cards to move deals forward or backward with live weighted value recalculation.

### Module 6: Follow-Up Scheduler
- **Timeframe Filtering (`/followups`):** Quick filter tabs for `All`, `Today`, `Upcoming`, and `Overdue`.
- **Follow-up Creation (`/followups/create`):** Validates that scheduled date is not in the past; supports linking to Customer, Lead, or Opportunity.
- **1-Click Mark Completed:** Instantly transitions status to `Completed` and logs completion timestamp.

### Module 7: Engagement & Activity Logging
- **Activity Feed (`/activities`):** Comprehensive chronological record of client touchpoints (Calls, Meetings, Emails, Tasks).
- **Activity Logger (`/activities/create`):** Captures description, interaction date, and associated customer/lead.

### Module 8: Executive Reports & Analytics
- **Reports Console (`/reports`):** Centralized hub with metrics and export utilities:
  - *Customer Directory Report:* Account roster with contact details.
  - *Lead Conversion Rate Report:* Funnel velocity and conversion percentages.
  - *Pipeline Valuation Report:* Stage-wise distribution and weighted revenue projections.
  - *Sales Performance Report:* Closed-won revenue leaderboards.
- **CSV Exporters:** One-click CSV downloads with formula injection neutralization.

### Module 9: User Governance & Administration (Admin Only)
- **User Directory (`/users`):** Full roster of system users, role tags, and activity status.
- **Create User (`/users/create`):** Provision new corporate users with specific roles (`Admin`, `Manager`, `SalesExecutive`).
- **Account Unlocking (`/users/:id/unlock`):** Manually resets `FailedLoginCount` and clears `LockoutEnd` for locked accounts.
- **Status Toggle (`/users/:id/toggle-status`):** Instantly activates or deactivates user access.

---

## 8. Complete REST API Specification

All `/api/*` endpoints require header `Authorization: Bearer <JWT_TOKEN>`.

### Authentication Endpoints

#### `POST /api/auth/login`
- **Description:** Authenticates user credentials and returns JWT bearer token.
- **Request Body:**
  ```json
  {
    "email": "sales@acxiomcrm.com",
    "password": "Sales@12345"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": 3,
      "name": "Sales Executive",
      "email": "sales@acxiomcrm.com",
      "roleId": 3,
      "roleName": "SalesExecutive"
    }
  }
  ```

---

### Customer Endpoints

#### `GET /api/customers`
- **Description:** Search and paginate customers within authorized user scope.
- **Query Parameters:** `page` (default 1), `limit` (default 20), `search`, `status`, `ownerId`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "CustomerId": 1,
        "CustomerCode": "CUST-0001",
        "CustomerName": "Apex Healthcare Systems",
        "Email": "contact@apexhealth.in",
        "Phone": "9876543210",
        "CompanyName": "Apex Healthcare Pvt Ltd",
        "Status": "Active",
        "OwnerName": "Sales Executive",
        "OpportunityCount": 1,
        "FollowUpCount": 0
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
  }
  ```

#### `POST /api/customers`
- **Description:** Create a new customer master record.
- **Request Body:**
  ```json
  {
    "CustomerName": "Nexus Cloud Solutions",
    "Email": "info@nexuscloud.io",
    "Phone": "9820011223",
    "CompanyName": "Nexus Cloud Ltd",
    "City": "Mumbai",
    "State": "Maharashtra",
    "Status": "Active"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Customer created successfully.",
    "data": { "CustomerId": 2, "CustomerCode": "CUST-0002", "CustomerName": "Nexus Cloud Solutions" }
  }
  ```

---

### Lead Endpoints

#### `GET /api/leads`
- **Description:** Query prospects with status, priority, and source filters.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "LeadId": 1,
        "LeadCode": "LEAD-0001",
        "LeadName": "Aditya Birla",
        "Email": "aditya@birlatextiles.in",
        "Phone": "9822011223",
        "Source": "Website",
        "Status": "Qualified",
        "Priority": "High",
        "ExpectedValue": 45000
      }
    ]
  }
  ```

#### `POST /api/leads/:id/convert`
- **Description:** 1-Click atomic conversion of qualified lead into Customer and Opportunity.
- **Request Body:**
  ```json
  {
    "OpportunityName": "Birla Smart Textiles Expansion",
    "Amount": 45000,
    "Stage": "Proposal",
    "ExpectedCloseDate": "2026-12-15"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Lead converted successfully.",
    "data": {
      "lead": { "LeadId": 1, "Status": "Converted" },
      "customer": { "CustomerId": 3, "CustomerCode": "CUST-0003" },
      "opportunity": { "OpportunityId": 2, "OpportunityName": "Birla Smart Textiles Expansion", "Amount": 45000 }
    }
  }
  ```

---

### Opportunity Endpoints

#### `GET /api/opportunities`
- **Description:** List opportunities with derived weighted valuations.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "OpportunityId": 1,
        "OpportunityName": "Apex Healthcare EHR Rollout",
        "Amount": 60000,
        "Stage": "Proposal",
        "Probability": 50,
        "WeightedAmount": 30000,
        "ExpectedCloseDate": "2026-11-30",
        "CustomerName": "Apex Healthcare Systems"
      }
    ]
  }
  ```

#### `POST /api/opportunities`
- **Description:** Create sales deal opportunity.
- **Request Body:**
  ```json
  {
    "OpportunityName": "Zenith FinTech Payment Gateway",
    "CustomerId": 1,
    "Amount": 85000,
    "Stage": "Qualification",
    "Probability": 20,
    "ExpectedCloseDate": "2026-12-31"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Opportunity created successfully.",
    "data": { "OpportunityId": 3, "OpportunityName": "Zenith FinTech Payment Gateway", "Amount": 85000 }
  }
  ```

---

### Follow-Up Endpoints

#### `GET /api/followups`
- **Description:** List follow-up items filterable by `?timeFilter=overdue` or `?timeFilter=today`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "FollowUpId": 1,
        "Subject": "Review Enterprise SLA Contract",
        "FollowUpDate": "2026-10-15T14:30:00",
        "FollowUpType": "Meeting",
        "Status": "Planned",
        "CustomerName": "Apex Healthcare Systems"
      }
    ]
  }
  ```

---

## 9. Operational Deployment & Production Readiness

### 1. Environment Configuration (`.env`)
```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=e7b49a12c8f630de45689134bcae521098ef3412567890abcdef1234567890ab
JWT_SECRET=c3d810fa24e759bc61029475adef1823904561234567890abcdef1234567890ab
MAX_FAILED_LOGINS=5
LOCKOUT_DURATION_MINUTES=15
```

### 2. Reverse Proxy Setup (Nginx Example)
```nginx
server {
    listen 80;
    server_name crm.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.yourcompany.com;

    ssl_certificate /etc/ssl/certs/acxiomcrm.crt;
    ssl_certificate_key /etc/ssl/private/acxiomcrm.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Database Backup & Disaster Recovery
Because SQLite WAL mode is enabled, database backups can be taken safely in hot production state:
```bash
# Hot backup command
sqlite3 data/acxiomcrm.db ".backup 'data/backup_acxiomcrm_$(date +%Y%m%d_%H%M%S).db'"
```

---

## 10. Setup, 1-Click Launchers & Troubleshooting

### Prerequisites:
- **Node.js:** v18.0.0 or higher (v20+ recommended). Check with `node -v`.
- **NPM:** v9.0.0 or higher. Check with `npm -v`.

---

### 1-Click Launch Options

#### Option A: Windows Batch Launcher (`start.bat`)
Double-click [`start.bat`](file:///d:/PROJECTS/PRO/start.bat) from File Explorer or run in terminal:
```cmd
.\start.bat
```
*Automatically sets project directory, verifies Node.js, auto-installs dependencies if missing, ensures database migrations, starts port 3000, and launches default browser to `http://localhost:3000/login`.*

#### Option B: PowerShell Launcher (`start.ps1`)
Run [`.\start.ps1`](file:///d:/PROJECTS/PRO/start.ps1) in PowerShell:
```powershell
.\start.ps1
```

#### Option C: VS Code / Antigravity IDE Debugger (`F5`)
Press **`F5`** or select **"Start AcxiomCRM Enterprise (Server)"** in the Run & Debug panel ([`.vscode/launch.json`](file:///d:/PROJECTS/PRO/.vscode/launch.json)).

#### Option D: Standard NPM Commands
```bash
# 1. Install dependencies
npm install

# 2. Initialize clean production database
npm run seed

# 3. Start server
npm start
```

---

### Troubleshooting Common Issues

| Symptom | Cause | Resolution |
| :--- | :--- | :--- |
| `EADDRINUSE: port 3000 already in use` | Another process is holding port 3000. | In Windows Command Prompt, run `netstat -ano \| findstr :3000` and kill the PID with `taskkill /PID <PID> /F`, or set `PORT=3001` in `.env`. |
| `Account Locked Out (HTTP 403)` | 5 consecutive failed login attempts occurred. | Log in with the **Administrator** account (`admin@acxiomcrm.com`), navigate to `/users`, and click **Unlock** on the locked user account. |
| `Session Expired` | Inactivity exceeded the 8-hour cookie lifetime. | Log in again at `/login` to refresh the session token. |

---

## 11. System Roles & Default Governance Directory

The clean production database is initialized with the three core organizational accounts:

| Role | Initial Corporate Email | Password | Administrative & Scope Privileges |
| :--- | :--- | :--- | :--- |
| **👑 System Administrator** | `admin@acxiomcrm.com` | `Admin@12345` | Global system control, user provisioning, account unlocking, role assignment, immutable compliance audit trail, and organization-wide reports. |
| **📊 Regional Sales Manager** | `manager@acxiomcrm.com` | `Manager@12345` | Team pipeline visibility, revenue forecasting, lead distribution oversight, and sales conversion analytics. |
| **💼 Sales Executive** | `sales@acxiomcrm.com` | `Sales@12345` | Isolated operational scope restricted strictly to personally assigned customer accounts, prospect leads, pipeline deals, and follow-up activities. |

---

*AcxiomCRM Enterprise © 2026 • Production-Ready Role-Based Customer Relationship Management Suite*
