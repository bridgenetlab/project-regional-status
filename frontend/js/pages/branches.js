/**
 * Branches page logic - filterable, sortable, paginated table
 */

import * as api from '../api.js';
import * as state from '../state.js';
import { showError } from '../components/toast.js';
import { openBranchModal } from '../components/modal.js';

/**
 * Initialize branches page
 */
export function initBranchesPage() {
  document.addEventListener('page-changed', async (e) => {
    if (e.detail.page === 'branches') {
      await loadBranches();
    }
  });

  // Filter event listeners
  document.getElementById('filter-region')?.addEventListener('change', async (e) => {
    state.setRegionFilter(e.target.value);
    await loadBranches();
  });

  document.getElementById('filter-status')?.addEventListener('change', async (e) => {
    state.setStatusFilter(e.target.value);
    await loadBranches();
  });

  document.getElementById('filter-search')?.addEventListener('input', async (e) => {
    state.setSearchFilter(e.target.value);
    await loadBranches();
  });

  // Pagination
  document.getElementById('prev-page')?.addEventListener('click', async () => {
    const current = state.getCurrentBranchesPage();
    if (current > 1) {
      state.setCurrentBranchesPage(current - 1);
      await loadBranches();
    }
  });

  document.getElementById('next-page')?.addEventListener('click', async () => {
    const data = state.getBranchesData();
    if (data && data.page < Math.ceil(data.total / data.per_page)) {
      state.setCurrentBranchesPage(data.page + 1);
      await loadBranches();
    }
  });
}

/**
 * Load and render branches
 */
async function loadBranches() {
  const sessionId = state.getSessionId();
  if (!sessionId) {
    showError('No session found');
    return;
  }

  try {
    // Populate region filter from overview data
    populateRegionFilter();

    // Fetch branches with filters (get all branches for grouping)
    const params = {
      page: 1,
      per_page: 1000,
      sort_by: state.getCurrentSort().by,
      sort_dir: state.getCurrentSort().dir,
    };

    if (state.getRegionFilter()) {
      params.region = state.getRegionFilter();
    }
    if (state.getStatusFilter()) {
      params.status = state.getStatusFilter();
    }
    if (state.getSearchFilter()) {
      params.search = state.getSearchFilter();
    }
    if (state.getSiteReadinessFilter()) {
      params.site_readiness = state.getSiteReadinessFilter();
    }
    if (state.getUATDocumentFilter()) {
      params.uat_document = state.getUATDocumentFilter();
    }

    const data = await api.fetchBranches(sessionId, params);
    state.setBranchesData(data);

    // Debug: Log the request params
    console.log('API Params sent:', params);
    console.log('API Response total:', data.total);

    // Sync filter dropdowns with current state
    syncFilterDropdowns();

    renderBranchesTable(data.branches);
    renderPagination(data);
  } catch (error) {
    showError(`Failed to load branches: ${error.message}`);
  }
}

/**
 * Populate region filter dropdown
 */
function populateRegionFilter() {
  const overviewData = state.getOverviewData();
  if (!overviewData) return;

  const regionSelect = document.getElementById('filter-region');
  if (!regionSelect) return;

  const currentValue = regionSelect.value;
  const existingOptions = regionSelect.querySelectorAll('option').length;

  // Only populate if not already done
  if (existingOptions <= 1) {
    overviewData.regions.forEach((region) => {
      const opt = document.createElement('option');
      opt.value = region.region;
      opt.textContent = region.region;
      regionSelect.appendChild(opt);
    });
  }

  regionSelect.value = currentValue;
}

/**
 * Sync filter dropdowns with current state
 */
function syncFilterDropdowns() {
  // Sync region filter
  const regionSelect = document.getElementById('filter-region');
  if (regionSelect) {
    regionSelect.value = state.getRegionFilter() || '';
  }

  // Sync status filter
  const statusSelect = document.getElementById('filter-status');
  if (statusSelect) {
    statusSelect.value = state.getStatusFilter() || '';
  }

  // Sync search filter
  const searchInput = document.getElementById('filter-search');
  if (searchInput) {
    searchInput.value = state.getSearchFilter() || '';
  }

  // Show active filters banner for overview dashboard filters
  updateActiveFiltersBanner();
}

/**
 * Update the active filters banner
 */
function updateActiveFiltersBanner() {
  const banner = document.getElementById('active-filters-banner');
  const bannerText = document.getElementById('active-filters-text');

  let activeFilterText = '';

  if (state.getSiteReadinessFilter()) {
    activeFilterText = '🏗️ Under Renovation';
  } else if (state.getUATDocumentFilter()) {
    activeFilterText = '✓ Pending UAT';
  }

  if (activeFilterText) {
    bannerText.textContent = activeFilterText;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

/**
 * Clear active filters from overview dashboard
 */
window.clearActiveFilters = async function () {
  state.setSiteReadinessFilter(null);
  state.setUATDocumentFilter(null);
  state.setCurrentBranchesPage(1);
  await loadBranches();
};

/**
 * Render branches grouped by region
 */
function renderBranchesTable(branches) {
  const container = document.getElementById('branches-tbody').parentElement.parentElement;
  const tableContainer = document.getElementById('branches-tbody').parentElement;
  tableContainer.innerHTML = '';

  // Group branches by region
  const grouped = {};
  branches.forEach((branch) => {
    const region = branch.region || 'Unknown';
    if (!grouped[region]) {
      grouped[region] = [];
    }
    grouped[region].push(branch);
  });

  // Create grouped view
  Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort regions alphabetically
    .forEach(([region, regionBranches]) => {
      // Calculate region stats
      const stats = calculateRegionStats(regionBranches);

      // Region header with summary
      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = `
        background: var(--bg-tertiary);
        padding: 0.75rem 1rem;
        font-weight: 600;
        color: var(--text-primary);
        border-radius: 6px;
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.5rem;
        transition: all 0.2s;
        border: 1px solid transparent;
      `;

      const icon = document.createElement('span');
      icon.textContent = '▶';
      icon.style.cssText = `
        display: inline-block;
        transition: transform 0.2s;
        color: var(--accent-teal);
        min-width: 14px;
        font-size: 0.8rem;
      `;

      const headerText = document.createElement('div');
      headerText.style.cssText = `
        flex: 0 0 auto;
        min-width: 120px;
      `;
      headerText.innerHTML = `
        <div style="font-weight: 600; color: var(--text-primary);">${region} (${regionBranches.length})</div>
      `;

      const summaryStats = document.createElement('div');
      summaryStats.style.cssText = `
        flex: 1;
        display: flex;
        gap: 1.5rem;
        font-size: 0.8rem;
        color: var(--text-secondary);
      `;
      summaryStats.innerHTML = `
        <span><span style="color: #10b981; font-weight: 600;">✓ ${stats.completed}</span> Completed</span>
        <span><span style="color: #f59e0b; font-weight: 600;">→ ${stats.inProgress}</span> In Progress</span>
        <span><span style="color: #ef4444; font-weight: 600;">⊘ ${stats.notStarted}</span> Not Started</span>
      `;

      headerDiv.appendChild(icon);
      headerDiv.appendChild(headerText);
      headerDiv.appendChild(summaryStats);

      // Table for this region
      const table = document.createElement('table');
      table.className = 'table';
      table.style.marginBottom = '1.5rem';
      table.style.display = 'none'; // Default hidden

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th onclick="sortTable('branch_name')">Branch Name ↕</th>
          <th onclick="sortTable('status')">Status ↕</th>
          <th onclick="sortTable('installation_date')">Installation Date ↕</th>
          <th onclick="sortTable('days_delta')">Days Delta ↕</th>
          <th>Schedule</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      regionBranches.forEach((branch) => {
        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.onclick = () => openBranchModal(branch);

        const statusBadgeClass = `badge-${(branch.status || '').toLowerCase().replace(' ', '-')}`;
        const scheduleBadgeClass = getBadgeClass(branch.schedule_status);
        const deltaDisplay = branch.days_delta !== null ? `${branch.days_delta > 0 ? '+' : ''}${branch.days_delta}` : '—';

        row.innerHTML = `
          <td style="font-weight: 600;">${branch.branch_name || '—'}</td>
          <td><span class="badge ${statusBadgeClass}">${branch.status || '—'}</span></td>
          <td>${branch.installation_date || '—'}</td>
          <td style="text-align: center; font-weight: 600;">${deltaDisplay}</td>
          <td><span class="badge ${scheduleBadgeClass}">${branch.schedule_status || '—'}</span></td>
        `;

        tbody.appendChild(row);
      });

      table.appendChild(tbody);

      // Toggle function
      let isExpanded = false;
      const toggle = () => {
        isExpanded = !isExpanded;
        table.style.display = isExpanded ? '' : 'none';
        icon.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
      };

      headerDiv.onclick = toggle;
      headerDiv.onmouseover = () => headerDiv.style.background = 'var(--bg-secondary)';
      headerDiv.onmouseout = () => headerDiv.style.background = 'var(--bg-tertiary)';

      tableContainer.appendChild(headerDiv);
      tableContainer.appendChild(table);
    });
}

/**
 * Calculate region statistics
 */
function calculateRegionStats(branches) {
  const completed = branches.filter(b => (b.status || '').toLowerCase() === 'completed').length;
  const inProgress = branches.filter(b => (b.status || '').toLowerCase() === 'in progress').length;
  const notStarted = branches.length - completed - inProgress;

  return { completed, inProgress, notStarted };
}

/**
 * Get badge CSS class for schedule status
 */
function getBadgeClass(status) {
  switch (status) {
    case 'ahead':
      return 'badge-ahead';
    case 'behind':
      return 'badge-behind';
    case 'on_time':
      return 'badge-ontime';
    default:
      return 'badge-pending';
  }
}

/**
 * Render pagination controls
 */
function renderPagination(data) {
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  const totalPages = Math.ceil(data.total / data.per_page);
  const isFirstPage = data.page === 1;
  const isLastPage = data.page >= totalPages;

  prevBtn.disabled = isFirstPage;
  nextBtn.disabled = isLastPage;

  pageInfo.textContent = `Page ${data.page} of ${totalPages} (${data.total} total)`;
}

/**
 * Sort table by column
 */
window.sortTable = async function (columnName) {
  const current = state.getCurrentSort();
  let newDir = 'asc';

  if (current.by === columnName && current.dir === 'asc') {
    newDir = 'desc';
  }

  state.setCurrentSort(columnName, newDir);
  await loadBranches();
};

// Initialize on module load
initBranchesPage();
