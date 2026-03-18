/**
 * In Progress / Dependencies page logic
 * Shows branches in progress and their dependencies
 */

import * as api from '../api.js';
import * as state from '../state.js';
import { getCSSVar } from '../theme.js';
import { showError } from '../components/toast.js';
import { openBranchModal } from '../components/modal.js';

let chartInstances = {};

/**
 * Initialize progress page
 */
export function initProgressPage() {
  document.addEventListener('page-changed', async (e) => {
    if (e.detail.page === 'progress') {
      await loadProgressPage();
    }
  });
}

/**
 * Load and render progress data
 */
async function loadProgressPage() {
  const sessionId = state.getSessionId();
  if (!sessionId) {
    showError('No session found');
    return;
  }

  try {
    // Fetch all branches
    const data = await api.fetchBranches(sessionId, { page: 1, per_page: 1000 });

    if (!data.branches) {
      showError('No branches found');
      return;
    }

    // Filter to "In Progress" branches
    const inProgressBranches = data.branches.filter(
      (b) => (b.status || '').toLowerCase() === 'in progress'
    );

    if (inProgressBranches.length === 0) {
      document.getElementById('progress-total').textContent = '0';
      document.getElementById('progress-with-deps').textContent = '0';
      document.getElementById('progress-blocked').textContent = '0';
      document.getElementById('progress-dependencies-tbody').innerHTML =
        '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No branches in progress</td></tr>';
      return;
    }

    // Analyze dependencies
    const analysis = analyzeDependencies(inProgressBranches);

    // Render components
    renderProgressStats(inProgressBranches, analysis);
    renderDependencyCharts(analysis);
    renderDependencyTable(analysis.withDeps);
    renderDependencyNetwork(analysis.withDeps);
  } catch (error) {
    showError(`Failed to load progress data: ${error.message}`);
  }
}

/**
 * Analyze dependencies in branches
 */
function analyzeDependencies(branches) {
  // Parse all branches and calculate dependencies
  const allBranchesAnalyzed = branches.map((b) => {
    const dependencies = b.dependency && b.dependency.trim() ? parseDependencies(b.dependency) : [];
    return {
      ...b,
      dependencies,
      depCount: dependencies.length,
      riskLevel: calculateRiskLevel(b),
    };
  });

  // Filter to those with dependencies for detailed analysis
  const withDeps = allBranchesAnalyzed.filter((b) => b.depCount > 0);

  // Count by dependency bucket
  const depCounts = { 0: 0, 1: 0, '2-3': 0, '4+': 0 };

  allBranchesAnalyzed.forEach((b) => {
    if (b.depCount === 0) depCounts[0]++;
    else if (b.depCount === 1) depCounts[1]++;
    else if (b.depCount <= 3) depCounts['2-3']++;
    else depCounts['4+']++;
  });

  // Count dependency types (only from branches with deps)
  const dependencyTypes = {};
  withDeps.forEach((b) => {
    b.dependencies.forEach((dep) => {
      const depType = extractDependencyType(dep);
      dependencyTypes[depType] = (dependencyTypes[depType] || 0) + 1;
    });
  });

  return {
    total: branches.length,
    withDeps,
    withoutDeps: branches.length - withDeps.length,
    blocked: withDeps.filter((b) => b.riskLevel === 'high').length,
    dependencyTypes,
    depCounts,
  };
}

/**
 * Parse dependency string into array
 */
function parseDependencies(depString) {
  if (!depString) return [];
  return depString
    .split(',')
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

/**
 * Extract dependency type/category
 */
function extractDependencyType(depString) {
  if (!depString) return 'None';
  const lower = depString.toLowerCase();

  if (lower.includes('site') || lower.includes('civil')) return 'Site/Civil';
  if (lower.includes('power') || lower.includes('electrical')) return 'Power';
  if (lower.includes('network') || lower.includes('connectivity')) return 'Network';
  if (lower.includes('delivery') || lower.includes('equipment')) return 'Equipment';
  if (lower.includes('uat') || lower.includes('testing')) return 'UAT/Testing';
  if (lower.includes('approval') || lower.includes('vendor')) return 'Approval/Vendor';

  return 'Other';
}

/**
 * Calculate risk level based on dependencies and status
 */
function calculateRiskLevel(branch) {
  const depCount = branch.dependency && branch.dependency.trim()
    ? parseDependencies(branch.dependency).length
    : 0;

  if (depCount >= 3) return 'high';
  if (depCount === 2) return 'medium';
  if (depCount === 1) return 'low';
  return 'none';
}

/**
 * Render progress summary stats
 */
function renderProgressStats(branches, analysis) {
  const withDepsPct =
    branches.length > 0
      ? ((analysis.withDeps.length / branches.length) * 100).toFixed(1)
      : 0;

  document.getElementById('progress-total').textContent = branches.length;
  document.getElementById('progress-with-deps').textContent = analysis.withDeps.length;
  document.getElementById('progress-with-deps-pct').textContent = `${withDepsPct}%`;
  document.getElementById('progress-blocked').textContent = analysis.blocked;
}

/**
 * Render dependency charts
 */
function renderDependencyCharts(analysis) {
  // Chart 1: Dependency count distribution
  renderDependencyCountChart(analysis.depCounts);

  // Chart 2: Dependency types pie chart
  renderDependencyTypesChart(analysis.dependencyTypes);
}

/**
 * Render dependency count bar chart
 */
function renderDependencyCountChart(depCounts) {
  const ctx = document.getElementById('chart-dependency-count')?.getContext('2d');
  if (!ctx) return;

  if (chartInstances['depCount']) chartInstances['depCount'].destroy();

  chartInstances['depCount'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['No Deps', '1 Dep', '2-3 Deps', '4+ Deps'],
      datasets: [
        {
          label: 'Number of Branches',
          data: [depCounts[0], depCounts[1], depCounts['2-3'], depCounts['4+']],
          backgroundColor: ['#10b981', '#f59e0b', '#f59e0b', '#ef4444'],
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: getCSSVar('--text-secondary') } },
      },
      scales: {
        y: {
          ticks: { color: getCSSVar('--text-secondary') },
          grid: { color: getCSSVar('--border-color') },
        },
        x: {
          ticks: { color: getCSSVar('--text-secondary') },
          grid: { color: getCSSVar('--border-color') },
        },
      },
    },
  });
}

/**
 * Render dependency types pie chart
 */
function renderDependencyTypesChart(dependencyTypes) {
  const ctx = document.getElementById('chart-dependency-types')?.getContext('2d');
  if (!ctx) return;

  if (chartInstances['depTypes']) chartInstances['depTypes'].destroy();

  const colors = [
    '#00d4ff',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
  ];

  chartInstances['depTypes'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(dependencyTypes),
      datasets: [
        {
          data: Object.values(dependencyTypes),
          backgroundColor: colors.slice(0, Object.keys(dependencyTypes).length),
          borderColor: getCSSVar('--bg-secondary'),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: getCSSVar('--text-secondary'), padding: 15 } },
      },
    },
  });
}

/**
 * Render dependency table
 */
function renderDependencyTable(withDeps) {
  const tbody = document.getElementById('progress-dependencies-tbody');
  tbody.innerHTML = '';

  withDeps.forEach((branch) => {
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.onclick = () => openBranchModal(branch);

    const riskColor =
      branch.riskLevel === 'high'
        ? '#ef4444'
        : branch.riskLevel === 'medium'
          ? '#f59e0b'
          : '#10b981';

    row.innerHTML = `
      <td style="font-weight: 600;">${branch.branch_name || '—'}</td>
      <td>${branch.region || '—'}</td>
      <td><span class="badge badge-in_progress">In Progress</span></td>
      <td>
        <div style="font-size: 0.85rem;">
          ${branch.dependencies.join('<br>')}<br>
          <span style="color: var(--text-muted); font-size: 0.75rem;">(${branch.depCount} dep${branch.depCount !== 1 ? 's' : ''})</span>
        </div>
      </td>
      <td>
        <span style="
          display: inline-block;
          padding: 0.35rem 0.75rem;
          border-radius: 4px;
          background: ${riskColor}20;
          color: ${riskColor};
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: capitalize;
        ">
          ${branch.riskLevel}
        </span>
      </td>
    `;

    tbody.appendChild(row);
  });

  if (withDeps.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No branches with dependencies</td></tr>';
  }
}

/**
 * Render dependency network overview
 */
function renderDependencyNetwork(withDeps) {
  const container = document.getElementById('dependency-list-container');
  container.innerHTML = '';

  // Group by dependency type
  const byType = {};
  withDeps.forEach((b) => {
    const types = new Set();
    b.dependencies.forEach((dep) => {
      const type = extractDependencyType(dep);
      types.add(type);
    });

    types.forEach((type) => {
      if (!byType[type]) byType[type] = [];
      byType[type].push(b);
    });
  });

  // Render grouped by type
  Object.entries(byType)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([type, branches]) => {
      const section = document.createElement('div');
      section.style.marginBottom = '2rem';

      const header = document.createElement('div');
      header.style.cssText = `
        font-weight: 600;
        font-size: 1rem;
        color: var(--accent-teal);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      `;
      header.innerHTML = `
        <span>●</span>
        <span>${type} Dependencies (${branches.length})</span>
      `;

      const list = document.createElement('div');
      list.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        width: 100%;
      `;

      branches.forEach((b) => {
        const card = document.createElement('div');
        card.style.cssText = `
          background: var(--bg-tertiary);
          padding: 0.75rem;
          border-radius: 6px;
          border-left: 3px solid var(--accent-teal);
          cursor: pointer;
          transition: all 0.2s;
          min-width: 0;
          overflow: hidden;
        `;
        card.onmouseover = () => {
          card.style.background = 'var(--bg-secondary)';
          card.style.transform = 'translateX(4px)';
        };
        card.onmouseout = () => {
          card.style.background = 'var(--bg-tertiary)';
          card.style.transform = 'translateX(0)';
        };
        card.onclick = () => openBranchModal(b);

        card.innerHTML = `
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
            ${b.branch_name}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
            ${b.region}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5;">
            ${b.dependencies.map((d) => `• ${d}`).join('<br>')}
          </div>
        `;

        list.appendChild(card);
      });

      section.appendChild(header);
      section.appendChild(list);
      container.appendChild(section);
    });
}

// Initialize on module load
initProgressPage();
