/**
 * Installation Costing Dashboard
 */

import * as api from '../api.js';
import * as state from '../state.js';
import { getCSSVar } from '../theme.js';
import { showError } from '../components/toast.js';

let chartInstances = {};

/**
 * Initialize costing page
 */
export function initCostingPage() {
  document.addEventListener('page-changed', async (e) => {
    if (e.detail.page === 'costing') {
      await loadCosting();
    }
  });

  // Region filter
  document.getElementById('costing-filter-region')?.addEventListener('change', async (e) => {
    const region = e.target.value;
    await loadCosting(region);
  });
}

/**
 * Load and render costing data
 */
async function loadCosting(region = null) {
  const sessionId = state.getSessionId();
  if (!sessionId) {
    showError('No session found');
    return;
  }

  try {
    const params = {};
    if (region) {
      params.region = region;
    }

    const data = await api.fetchCosting(sessionId, params);

    // Populate region filter
    populateRegionFilter(data.regions);

    // Render components
    renderSummaryCards(data);
    renderCostByRegionChart(data.regions);
    renderCostByVendorChart(data.vendors);
    renderRegionBreakdownTable(data.regions);
    renderVendorBreakdownTable(data.vendors);
  } catch (error) {
    showError(`Failed to load costing data: ${error.message}`);
  }
}

/**
 * Populate region filter dropdown
 */
function populateRegionFilter(regions) {
  const regionSelect = document.getElementById('costing-filter-region');
  if (!regionSelect) return;

  const currentValue = regionSelect.value;
  const existingOptions = regionSelect.querySelectorAll('option').length;

  // Only populate if not already done
  if (existingOptions <= 1) {
    regions.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.region;
      opt.textContent = r.region;
      regionSelect.appendChild(opt);
    });
  }
}

/**
 * Render summary KPI cards
 */
function renderSummaryCards(data) {
  const totalCostEl = document.getElementById('costing-total-cost');
  const totalRecordsEl = document.getElementById('costing-total-records');
  const topVendorEl = document.getElementById('costing-top-vendor');
  const topRegionEl = document.getElementById('costing-top-region');

  if (totalCostEl) {
    totalCostEl.textContent = `$${data.total_cost.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (totalRecordsEl) {
    totalRecordsEl.textContent = data.total_records;
  }

  // Top vendor
  if (topVendorEl && data.vendors.length > 0) {
    const top = data.vendors[0];
    topVendorEl.textContent = `${top.vendor} ($${top.total_cost.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })})`;
  } else if (topVendorEl) {
    topVendorEl.textContent = '—';
  }

  // Top region
  if (topRegionEl && data.regions.length > 0) {
    const top = data.regions[0];
    topRegionEl.textContent = `${top.region} ($${top.total_cost.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })})`;
  } else if (topRegionEl) {
    topRegionEl.textContent = '—';
  }
}

/**
 * Render cost by region bar chart
 */
function renderCostByRegionChart(regions) {
  const canvas = document.getElementById('chart-cost-by-region');
  if (!canvas) return;

  if (chartInstances['cost-by-region']) {
    chartInstances['cost-by-region'].destroy();
  }

  const chartData = {
    labels: regions.map((r) => r.region),
    datasets: [
      {
        label: 'Installation Cost ($)',
        data: regions.map((r) => r.total_cost),
        backgroundColor: getCSSVar('--accent-primary'),
        borderColor: getCSSVar('--accent-secondary'),
        borderWidth: 2,
      },
    ],
  };

  chartInstances['cost-by-region'] = new Chart(canvas, {
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
 * Render cost by vendor bar chart
 */
function renderCostByVendorChart(vendors) {
  const canvas = document.getElementById('chart-cost-by-vendor');
  if (!canvas) return;

  if (chartInstances['cost-by-vendor']) {
    chartInstances['cost-by-vendor'].destroy();
  }

  const chartData = {
    labels: vendors.map((v) => v.vendor),
    datasets: [
      {
        label: 'Installation Cost ($)',
        data: vendors.map((v) => v.total_cost),
        backgroundColor: getCSSVar('--accent-teal'),
        borderColor: getCSSVar('--status-completed'),
        borderWidth: 2,
      },
    ],
  };

  chartInstances['cost-by-vendor'] = new Chart(canvas, {
    type: 'bar',
    data: chartData,
    options: {
      indexAxis: 'x',
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
          grid: { color: getCSSVar('--border-color') },
        },
      },
    },
  });
}

/**
 * Render region breakdown table
 */
function renderRegionBreakdownTable(regions) {
  const tbody = document.getElementById('costing-region-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  regions.forEach((region) => {
    const row = document.createElement('tr');

    const topVendor = Object.entries(region.vendors).sort((a, b) => b[1] - a[1])[0];
    const topVendorText = topVendor ? topVendor[0] : '—';

    row.innerHTML = `
      <td style="font-weight: 600;">${region.region}</td>
      <td>${region.count}</td>
      <td>$${region.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>$${region.avg_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>${topVendorText}</td>
    `;

    tbody.appendChild(row);
  });
}

/**
 * Render vendor breakdown table
 */
function renderVendorBreakdownTable(vendors) {
  const tbody = document.getElementById('costing-vendor-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  vendors.forEach((vendor) => {
    const row = document.createElement('tr');

    const topRegion = Object.entries(vendor.regions).sort((a, b) => b[1] - a[1])[0];
    const topRegionText = topRegion ? topRegion[0] : '—';

    row.innerHTML = `
      <td style="font-weight: 600;">${vendor.vendor}</td>
      <td>${vendor.count}</td>
      <td>$${vendor.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>$${vendor.avg_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>${topRegionText}</td>
    `;

    tbody.appendChild(row);
  });
}

// Initialize on module load
initCostingPage();
