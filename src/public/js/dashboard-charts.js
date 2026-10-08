/**
 * AcxiomCRM Dashboard Chart.js Visualizations
 */

document.addEventListener('DOMContentLoaded', async () => {
  const leadChartEl = document.getElementById('leadStatusChart');
  const pipelineChartEl = document.getElementById('pipelineChart');
  const monthlySalesChartEl = document.getElementById('monthlySalesChart');

  if (!leadChartEl && !pipelineChartEl && !monthlySalesChartEl) return;

  try {
    const res = await fetch('/dashboard/charts-data');
    const result = await res.json();
    if (!result.success || !result.data) return;

    const data = result.data;

    // 1. Lead Status Doughnut Chart
    if (leadChartEl) {
      new Chart(leadChartEl, {
        type: 'doughnut',
        data: {
          labels: data.leadStatus.labels,
          datasets: [{
            data: data.leadStatus.data,
            backgroundColor: [
              '#3b82f6', // New (Blue)
              '#f59e0b', // Contacted (Amber)
              '#10b981', // Qualified (Green)
              '#94a3b8', // Unqualified (Gray)
              '#8b5cf6', // Converted (Purple)
              '#ef4444'  // Lost (Red)
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter', size: 11 } } }
          },
          cutout: '70%'
        }
      });
    }

    // 2. Opportunity Pipeline Bar Chart
    if (pipelineChartEl) {
      new Chart(pipelineChartEl, {
        type: 'bar',
        data: {
          labels: data.opportunityPipeline.labels,
          datasets: [{
            label: 'Total Value ($)',
            data: data.opportunityPipeline.amounts,
            backgroundColor: '#2563eb',
            borderRadius: 6,
            barThickness: 24
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `$${ctx.raw.toLocaleString()}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (val) => '$' + (val >= 1000 ? (val / 1000) + 'k' : val),
                font: { family: 'Inter', size: 10 }
              },
              grid: { color: '#f1f5f9' }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Inter', size: 11 } }
            }
          }
        }
      });
    }

    // 3. Monthly Sales Line / Area Chart
    if (monthlySalesChartEl) {
      new Chart(monthlySalesChartEl, {
        type: 'line',
        data: {
          labels: data.monthlySales.labels,
          datasets: [{
            label: 'Closed-Won Revenue ($)',
            data: data.monthlySales.data,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#10b981',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `Closed Won: $${ctx.raw.toLocaleString()}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (val) => '$' + (val >= 1000 ? (val / 1000) + 'k' : val),
                font: { family: 'Inter', size: 10 }
              },
              grid: { color: '#f1f5f9' }
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Inter', size: 11 } }
            }
          }
        }
      });
    }
  } catch (err) {
    console.error('Failed to load dashboard chart data:', err);
  }
});
