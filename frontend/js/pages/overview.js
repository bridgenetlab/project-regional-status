/**
 * Overview page logic - KPI cards, charts, region cards, summary table
 */

import * as api from '../api.js';
import * as state from '../state.js';
import { getCSSVar } from '../theme.js';
import { showError } from '../components/toast.js';
import { navigateTo } from '../components/nav.js';
import { openRenovationModal } from '../components/modal.js';

let chartInstances = {};

/**
 * Initialize overview page
 */
export function initOverviewPage() {
  document.addEventListener('page-changed', async (e) => {
    if (e.detail.page === 'overview') {
      await loadOverview();
    }
  });

  // Expose filter functions globally
  window.filterByStatus = filterByStatus;
  window.filterBySiteReadiness = filterBySiteReadiness;
  window.filterByUAT = filterByUAT;
}

/**
 * Load and render overview data
 */
async function loadOverview() {
  const sessionId = state.getSessionId();
  if (!sessionId) {
    showError('No session found');
    return;
  }

  try {
    const data = await api.fetchOverview(sessionId);
    state.setOverviewData(data);

    // Render all overview components
    renderKPIs(data.summary);
    renderRegionalCards(data.regions);
    renderSummaryTable(data.regions);
    renderCharts(data);
  } catch (error) {
    showError(`Failed to load overview: ${error.message}`);
  }
}

/**
 * Render KPI cards
 */
function renderKPIs(summary) {
  // All KPIs in single row
  document.getElementById('kpi-total').textContent = summary.total_branches;
  document.getElementById('kpi-completed').textContent = summary.completed;
  document.getElementById('kpi-completed-pct').textContent = `${summary.completion_rate.toFixed(1)}%`;
  document.getElementById('kpi-in-progress').textContent = summary.in_progress;
  document.getElementById('kpi-not-started').textContent = summary.not_started;
  document.getElementById('kpi-behind').textContent = summary.behind_schedule;
  document.getElementById('kpi-avg-delta').textContent = summary.avg_days_delta !== null
    ? summary.avg_days_delta.toFixed(1)
    : '—';
  document.getElementById('kpi-under-renovation').textContent = summary.site_readiness_under_renovation;
  document.getElementById('kpi-pending-uat').textContent = summary.pending_uat;

  // Delivery Status - show most common status
  const deliveryStatus = summary.delivery_status_count || {};
  const deliveryEntries = Object.entries(deliveryStatus);
  let deliveryDisplay = '—';
  if (deliveryEntries.length > 0) {
    // Sort by count, get top status
    const topStatus = deliveryEntries.reduce((a, b) => a[1] > b[1] ? a : b);
    deliveryDisplay = `${topStatus[0]} (${topStatus[1]})`;
  }
  document.getElementById('kpi-delivery-status').textContent = deliveryDisplay;
}

/**
 * Render region cards
 */
function renderRegionalCards(regions) {
  const container = document.getElementById('region-cards-container');
  container.innerHTML = '';

  regions.forEach((region) => {
    const card = document.createElement('div');
    card.className = 'region-card';
    card.style.cursor = 'pointer';
    card.onclick = () => {
      state.setRegionFilter(region.region);
      navigateTo('branches');
      document.dispatchEvent(new CustomEvent('page-changed', { detail: { page: 'branches' } }));
    };

    const completionRate = region.completion_rate || 0;
    const avgDelta = region.avg_days_delta !== null ? region.avg_days_delta.toFixed(1) : '—';

    card.innerHTML = `
      <div class="region-name">${region.region}</div>
      <div class="region-stats">
        <div class="region-stat">
          <div class="region-stat-label">Total</div>
          <div class="region-stat-value">${region.total}</div>
        </div>
        <div class="region-stat">
          <div class="region-stat-label">Completed</div>
          <div class="region-stat-value">${region.completed}</div>
        </div>
        <div class="region-stat">
          <div class="region-stat-label">In Progress</div>
          <div class="region-stat-value">${region.in_progress}</div>
        </div>
        <div class="region-stat">
          <div class="region-stat-label">Not Started</div>
          <div class="region-stat-value">${region.not_started}</div>
        </div>
      </div>
      <div class="region-progress">
        <div class="region-progress-label">
          <span>Progress</span>
          <span>${completionRate.toFixed(1)}%</span>
        </div>
        <div class="region-progress-bar">
          <div class="region-progress-fill" style="width: ${completionRate}%"></div>
        </div>
      </div>
      <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color); text-align: center;">
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">Avg Days Delta</div>
        <div style="font-weight: 600; color: var(--accent-primary);">${avgDelta}</div>
      </div>
    `;

    container.appendChild(card);
  });
}

/**
 * Render summary table
 */
function renderSummaryTable(regions) {
  const tbody = document.getElementById('summary-tbody');
  tbody.innerHTML = '';

  regions.forEach((region) => {
    const row = document.createElement('tr');
    const completionRate = region.completion_rate || 0;
    const avgDelta = region.avg_days_delta !== null ? region.avg_days_delta.toFixed(1) : '—';

    row.innerHTML = `
      <td style="font-weight: 600;">${region.region}</td>
      <td>${region.total}</td>
      <td class="text-completed">${region.completed}</td>
      <td class="text-progress">${region.in_progress}</td>
      <td class="text-pending">${region.not_started}</td>
      <td><span class="pct">${completionRate.toFixed(1)}%</span></td>
      <td>${avgDelta}</td>
    `;

    tbody.appendChild(row);
  });
}

/**
 * Render all charts
 */
function renderCharts(data) {
  renderRegionChart(data.regions);
  renderStatusChart(data.summary);
  renderRegionalStatusChart(data.regions);
}

/**
 * Render horizontal bar chart - Branches per Region
 */
function renderRegionChart(regions) {
  const canvas = document.getElementById('chart-regions');
  if (!canvas) return;

  // Destroy existing chart
  if (chartInstances['regions']) {
    chartInstances['regions'].destroy();
  }

  const chartData = {
    labels: regions.map((r) => r.region),
    datasets: [
      {
        label: 'Branches',
        data: regions.map((r) => r.total),
        backgroundColor: getCSSVar('--accent-primary'),
        borderColor: getCSSVar('--accent-secondary'),
        borderWidth: 2,
      },
    ],
  };

  chartInstances['regions'] = new Chart(canvas, {
    type: 'bar',
    data: chartData,
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: { color: getCSSVar('--text-secondary') },
          grid: { color: getCSSVar('--border-color') },
        },
        y: {
          ticks: { color: getCSSVar('--text-secondary') },
          grid: { display: false },
        },
      },
    },
  });
}

/**
 * Render doughnut chart - Status Distribution
 */
function renderStatusChart(summary) {
  const canvas = document.getElementById('chart-status');
  if (!canvas) return;

  // Destroy existing chart
  if (chartInstances['status']) {
    chartInstances['status'].destroy();
  }

  const chartData = {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [
      {
        data: [summary.completed, summary.in_progress, summary.not_started],
        backgroundColor: [
          getCSSVar('--status-completed'),
          getCSSVar('--status-progress'),
          getCSSVar('--status-pending'),
        ],
        borderColor: getCSSVar('--bg-card'),
        borderWidth: 2,
      },
    ],
  };

  chartInstances['status'] = new Chart(canvas, {
    type: 'doughnut',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: getCSSVar('--text-secondary'), padding: 20 },
        },
      },
    },
  });
}

/**
 * Render stacked bar chart - Status Breakdown by Region
 */
function renderRegionalStatusChart(regions) {
  const canvas = document.getElementById('chart-regional-status');
  if (!canvas) return;

  // Destroy existing chart
  if (chartInstances['regional-status']) {
    chartInstances['regional-status'].destroy();
  }

  const chartData = {
    labels: regions.map((r) => r.region),
    datasets: [
      {
        label: 'Completed',
        data: regions.map((r) => r.completed),
        backgroundColor: getCSSVar('--status-completed'),
      },
      {
        label: 'In Progress',
        data: regions.map((r) => r.in_progress),
        backgroundColor: getCSSVar('--status-progress'),
      },
      {
        label: 'Not Started',
        data: regions.map((r) => r.not_started),
        backgroundColor: getCSSVar('--status-pending'),
      },
    ],
  };

  chartInstances['regional-status'] = new Chart(canvas, {
    type: 'bar',
    data: chartData,
    options: {
      indexAxis: 'x',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: { color: getCSSVar('--text-secondary') },
          grid: { color: getCSSVar('--border-color') },
        },
        y: {
          stacked: true,
          ticks: { color: getCSSVar('--text-secondary') },
          grid: { color: getCSSVar('--border-color') },
        },
      },
      plugins: {
        legend: {
          labels: { color: getCSSVar('--text-secondary'), padding: 20 },
        },
      },
    },
  });
}

/**
 * Filter by branch status and navigate to branches page
 */
function filterByStatus(status) {
  // Clear other filters to avoid conflicts
  state.setRegionFilter(null);
  state.setSearchFilter(null);
  state.setSiteReadinessFilter(null);
  state.setUATDocumentFilter(null);
  state.setStatusFilter(status);
  navigateTo('branches');
  const event = new CustomEvent('page-changed', { detail: { page: 'branches' } });
  document.dispatchEvent(event);
}

/**
 * Filter by site readiness (under renovation) and show modal
 */
async function filterBySiteReadiness() {
  const sessionId = state.getSessionId();
  if (!sessionId) {
    showError('No session found');
    return;
  }

  try {
    // Fetch all branches and filter locally for renovation
    const data = await api.fetchBranches(sessionId, { page: 1, per_page: 1000 });
    const renovationBranches = data.branches.filter(
      (b) => (b.site_readiness || '').toLowerCase().includes('renovation')
    );

    if (renovationBranches.length === 0) {
      showError('No branches under renovation found');
      return;
    }

    openRenovationModal(renovationBranches);
  } catch (error) {
    showError(`Failed to load renovation branches: ${error.message}`);
  }
}

/**
 * Filter by pending UAT and navigate to branches page
 */
function filterByUAT() {
  // Clear other filters to avoid conflicts
  state.setRegionFilter(null);
  state.setStatusFilter(null);
  state.setSearchFilter(null);
  state.setSiteReadinessFilter(null);
  state.setUATDocumentFilter('not started');
  navigateTo('branches');
  const event = new CustomEvent('page-changed', { detail: { page: 'branches' } });
  document.dispatchEvent(event);
}

// Initialize on module load
initOverviewPage();
