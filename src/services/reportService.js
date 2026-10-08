const db = require('../database/db');

class ReportService {
  /**
   * Calculate role-scoped Dashboard KPIs
   */
  static getDashboardKPIs(user) {
    let custScope = '';
    let leadScope = '';
    let oppScope = '';
    let followUpScope = '';
    const params = [];

    if (user && user.roleName === 'SalesExecutive') {
      custScope = ' WHERE OwnerId = ?';
      leadScope = ' WHERE AssignedTo = ?';
      oppScope = ' WHERE AssignedTo = ?';
      followUpScope = ' WHERE AssignedTo = ?';
      params.push(user.userId);
    }

    // Customers
    const totalCustomers = db.prepare(`SELECT COUNT(*) as count FROM Customers${custScope}`).get(...(custScope ? [user.userId] : [])).count;

    // Leads
    const totalLeads = db.prepare(`SELECT COUNT(*) as count FROM Leads${leadScope}`).get(...(leadScope ? [user.userId] : [])).count;
    const openLeads = db.prepare(`SELECT COUNT(*) as count FROM Leads WHERE Status NOT IN ('Converted', 'Lost')${leadScope ? ' AND AssignedTo = ?' : ''}`).get(...(leadScope ? [user.userId] : [])).count;
    const convertedLeads = db.prepare(`SELECT COUNT(*) as count FROM Leads WHERE Status = 'Converted'${leadScope ? ' AND AssignedTo = ?' : ''}`).get(...(leadScope ? [user.userId] : [])).count;

    // Opportunities
    const totalOpps = db.prepare(`SELECT COUNT(*) as count FROM Opportunities${oppScope}`).get(...(oppScope ? [user.userId] : [])).count;
    const openOpps = db.prepare(`SELECT COUNT(*) as count FROM Opportunities WHERE Status = 'Open' AND Stage NOT IN ('Won', 'Lost')${oppScope ? ' AND AssignedTo = ?' : ''}`).get(...(oppScope ? [user.userId] : [])).count;
    const wonOpps = db.prepare(`SELECT COUNT(*) as count FROM Opportunities WHERE Stage = 'Won'${oppScope ? ' AND AssignedTo = ?' : ''}`).get(...(oppScope ? [user.userId] : [])).count;
    const lostOpps = db.prepare(`SELECT COUNT(*) as count FROM Opportunities WHERE Stage = 'Lost'${oppScope ? ' AND AssignedTo = ?' : ''}`).get(...(oppScope ? [user.userId] : [])).count;

    // Pipeline amounts
    const pipelineSum = db.prepare(`
      SELECT 
        COALESCE(SUM(Amount), 0) as TotalPipeline,
        COALESCE(SUM(Amount * Probability / 100.0), 0) as WeightedPipeline
      FROM Opportunities
      WHERE Stage NOT IN ('Won', 'Lost')${oppScope ? ' AND AssignedTo = ?' : ''}
    `).get(...(oppScope ? [user.userId] : []));

    const wonSum = db.prepare(`
      SELECT COALESCE(SUM(Amount), 0) as WonRevenue
      FROM Opportunities
      WHERE Stage = 'Won'${oppScope ? ' AND AssignedTo = ?' : ''}
    `).get(...(oppScope ? [user.userId] : [])).WonRevenue;

    // Follow-ups
    const nowIso = new Date().toISOString();
    const pendingFollowUps = db.prepare(`
      SELECT COUNT(*) as count FROM FollowUps
      WHERE Status = 'Planned'${followUpScope ? ' AND AssignedTo = ?' : ''}
    `).get(...(followUpScope ? [user.userId] : [])).count;

    const overdueFollowUps = db.prepare(`
      SELECT COUNT(*) as count FROM FollowUps
      WHERE Status = 'Planned' AND FollowUpDate < ?${followUpScope ? ' AND AssignedTo = ?' : ''}
    `).get(...(followUpScope ? [nowIso, user.userId] : [nowIso])).count;

    return {
      totalCustomers,
      totalLeads,
      openLeads,
      convertedLeads,
      totalOpportunities: totalOpps,
      openOpportunities: openOpps,
      wonOpportunities: wonOpps,
      lostOpportunities: lostOpps,
      totalPipelineValue: pipelineSum.TotalPipeline || 0,
      weightedPipelineValue: pipelineSum.WeightedPipeline || 0,
      wonRevenue: wonSum || 0,
      pendingFollowUps,
      overdueFollowUps
    };
  }

  /**
   * Get chart datasets for Chart.js
   */
  static getDashboardCharts(user) {
    let leadScope = '';
    let oppScope = '';
    const leadParams = [];
    const oppParams = [];

    if (user && user.roleName === 'SalesExecutive') {
      leadScope = ' WHERE AssignedTo = ?';
      oppScope = ' WHERE AssignedTo = ?';
      leadParams.push(user.userId);
      oppParams.push(user.userId);
    }

    // 1. Lead Status Breakdown
    const leadStatuses = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Lost'];
    const leadStatusData = leadStatuses.map(status => {
      const sql = `SELECT COUNT(*) as count FROM Leads WHERE Status = ?${leadScope ? ' AND AssignedTo = ?' : ''}`;
      const params = leadScope ? [status, user.userId] : [status];
      const res = db.prepare(sql).get(...params);
      return res ? res.count : 0;
    });

    // 2. Opportunity Pipeline by Stage
    const oppStages = ['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    const oppStageData = oppStages.map(stage => {
      const sql = `SELECT COUNT(*) as count, COALESCE(SUM(Amount), 0) as totalAmount FROM Opportunities WHERE Stage = ?${oppScope ? ' AND AssignedTo = ?' : ''}`;
      const params = oppScope ? [stage, user.userId] : [stage];
      const res = db.prepare(sql).get(...params);
      return {
        stage,
        count: res ? res.count : 0,
        amount: res ? res.totalAmount : 0
      };
    });

    // 3. Monthly Sales (Won opportunities in past 6 months)
    const months = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const label = `${monthNames[d.getMonth()]} ${year}`;
      const startIso = `${year}-${monthNum}-01`;
      const nextMonth = new Date(year, d.getMonth() + 1, 1);
      const endIso = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const sql = `
        SELECT COALESCE(SUM(Amount), 0) as totalWon, COUNT(*) as count
        FROM Opportunities
        WHERE Stage = 'Won' AND ExpectedCloseDate >= ? AND ExpectedCloseDate < ?
        ${oppScope ? ' AND AssignedTo = ?' : ''}
      `;
      const params = oppScope ? [startIso, endIso, user.userId] : [startIso, endIso];
      const res = db.prepare(sql).get(...params);

      months.push({
        label,
        amount: res ? res.totalWon : 0,
        count: res ? res.count : 0
      });
    }

    // 4. Sales Leaderboard (for Manager/Admin)
    const leaderboard = db.prepare(`
      SELECT u.UserId, u.Name, u.RoleName,
             COUNT(DISTINCT c.CustomerId) as CustomerCount,
             COUNT(DISTINCT l.LeadId) as LeadCount,
             COUNT(DISTINCT o.OpportunityId) as OppCount,
             COALESCE(SUM(CASE WHEN o.Stage = 'Won' THEN o.Amount ELSE 0 END), 0) as WonRevenue,
             COALESCE(SUM(CASE WHEN o.Stage NOT IN ('Won', 'Lost') THEN o.Amount ELSE 0 END), 0) as ActivePipeline
      FROM Users u
      LEFT JOIN Customers c ON c.OwnerId = u.UserId
      LEFT JOIN Leads l ON l.AssignedTo = u.UserId
      LEFT JOIN Opportunities o ON o.AssignedTo = u.UserId
      WHERE u.IsActive = 1 AND u.RoleName IN ('SalesExecutive', 'Manager')
      GROUP BY u.UserId
      ORDER BY WonRevenue DESC
    `).all();

    return {
      leadStatus: {
        labels: leadStatuses,
        data: leadStatusData
      },
      opportunityPipeline: {
        labels: oppStages,
        counts: oppStageData.map(d => d.count),
        amounts: oppStageData.map(d => d.amount)
      },
      monthlySales: {
        labels: months.map(m => m.label),
        data: months.map(m => m.amount),
        deals: months.map(m => m.count)
      },
      leaderboard
    };
  }

  /**
   * Pipeline report data (for API & Reports page)
   */
  static getPipelineReport(user) {
    let oppScope = '';
    const params = [];
    if (user && user.roleName === 'SalesExecutive') {
      oppScope = ' WHERE o.AssignedTo = ?';
      params.push(user.userId);
    }

    const stageSummary = db.prepare(`
      SELECT 
        o.Stage,
        COUNT(*) as DealCount,
        COALESCE(SUM(o.Amount), 0) as TotalAmount,
        COALESCE(AVG(o.Probability), 0) as AvgProbability,
        COALESCE(SUM(o.Amount * o.Probability / 100.0), 0) as WeightedAmount
      FROM Opportunities o
      ${oppScope}
      GROUP BY o.Stage
      ORDER BY 
        CASE o.Stage
          WHEN 'Qualification' THEN 1
          WHEN 'Proposal' THEN 2
          WHEN 'Negotiation' THEN 3
          WHEN 'Won' THEN 4
          WHEN 'Lost' THEN 5
          ELSE 6
        END
    `).all(...params);

    const ownerSummary = db.prepare(`
      SELECT 
        COALESCE(u.Name, 'Unassigned') as OwnerName,
        COUNT(o.OpportunityId) as DealCount,
        COALESCE(SUM(CASE WHEN o.Stage NOT IN ('Won', 'Lost') THEN o.Amount ELSE 0 END), 0) as OpenPipeline,
        COALESCE(SUM(CASE WHEN o.Stage = 'Won' THEN o.Amount ELSE 0 END), 0) as WonRevenue,
        COALESCE(SUM(o.Amount * o.Probability / 100.0), 0) as WeightedPipeline
      FROM Opportunities o
      LEFT JOIN Users u ON o.AssignedTo = u.UserId
      ${oppScope}
      GROUP BY o.AssignedTo
      ORDER BY OpenPipeline DESC
    `).all(...params);

    return {
      stageSummary,
      ownerSummary,
      generatedDate: new Date().toISOString()
    };
  }

  /**
   * Helper to convert JSON rows to CSV string with formula injection defense
   */
  static convertToCSV(data, headers) {
    if (!data || !data.length) return '';
    const headerRow = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');
    const bodyRows = data.map(row => {
      return headers.map(h => {
        let val = row[h.key];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'string') {
          // Defend against CSV formula injection (e.g. =, +, -, @, \t, \r)
          if (/^[=\+\-@\t\r]/.test(val)) {
            val = `'${val}`;
          }
          val = val.replace(/"/g, '""');
        }
        return `"${val}"`;
      }).join(',');
    });
    return [headerRow, ...bodyRows].join('\r\n');
  }
}

module.exports = ReportService;
