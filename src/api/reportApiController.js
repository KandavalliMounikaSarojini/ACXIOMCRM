const ReportService = require('../services/reportService');

class ReportApiController {
  static getPipeline(req, res) {
    const user = req.apiUser;
    const data = ReportService.getPipelineReport(user);

    return res.status(200).json({
      success: true,
      data
    });
  }

  static getDashboardKPIs(req, res) {
    const user = req.apiUser;
    const kpis = ReportService.getDashboardKPIs(user);
    const charts = ReportService.getDashboardCharts(user);

    return res.status(200).json({
      success: true,
      kpis,
      charts
    });
  }

  static getSalesPerformance(req, res) {
    const user = req.apiUser;
    const charts = ReportService.getDashboardCharts(user);

    return res.status(200).json({
      success: true,
      monthlySales: charts.monthlySales,
      leaderboard: charts.leaderboard
    });
  }
}

module.exports = ReportApiController;
