/**
 * Timeline page logic - branches sorted by days delta (schedule deviation)
 */

import * as api from '../api.js';
import * as state from '../state.js';
import { showError } from '../components/toast.js';
import { openBranchModal } from '../components/modal.js';

/**
 * Initialize timeline page
 */
export function initTimelinePage() {
  document.addEventListener('page-changed', async (e) => {
    if (e.detail.page === 'timeline') {
      await loadTimeline();
    }
  });

  // Region filter
  document.getElementById('timeline-filter-region')?.addEventListener('change', async (e) => {
    await loadTimeline(e.target.value);
  });
}

/**
 * Load and render timeline data
 */
async function loadTimeline(region = null) {
  const sessionId = state.getSessionId();
  if (!sessionId) {
    showError('No session found');
    return;
  }

  try {
    // Populate region filter
    populateTimelineRegionFilter();

    // Fetch timeline data - request up to 1000 branches to show all regions
    const params = { limit: 1000 };
    if (region) {
      params.region = region;
    }

    const data = await api.fetchTimeline(sessionId, params);
    state.setTimelineData(data);

    renderTimelineSummary(data.summary);
    renderTimelineItems(data.branches);
  } catch (error) {
    showError(`Failed to load timeline: ${error.message}`);
  }
}

/**
 * Populate region filter dropdown
 */
function populateTimelineRegionFilter() {
  const overviewData = state.getOverviewData();
  if (!overviewData) return;

  const regionSelect = document.getElementById('timeline-filter-region');
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
 * Render summary stats
 */
function renderTimelineSummary(summary) {
  const worst = summary.worst_delay !== null ? `+${summary.worst_delay}` : '—';
  const best = summary.best_performance !== null ? `${summary.best_performance}` : '—';
  const avg = summary.avg_delta !== null ? summary.avg_delta.toFixed(1) : '—';

  document.getElementById('timeline-worst').textContent = worst;
  document.getElementById('timeline-best').textContent = best;
  document.getElementById('timeline-avg').textContent = avg;
}

/**
 * Render timeline items grouped by region
 */
function renderTimelineItems(branches) {
  const container = document.getElementById('timeline-items-container');
  container.innerHTML = '';

  if (branches.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No branches to display</p>';
    return;
  }

  // Group branches by region
  const grouped = {};
  branches.forEach((branch) => {
    const region = branch.region || 'Unknown';
    if (!grouped[region]) {
      grouped[region] = [];
    }
    grouped[region].push(branch);
  });

  // Render each group
  Object.entries(grouped).forEach(([region, regionBranches]) => {
    const groupEl = createTimelineGroup(region, regionBranches);
    container.appendChild(groupEl);
  });
}

/**
 * Create a collapsible timeline group for a region
 */
function createTimelineGroup(region, branches) {
  const groupDiv = document.createElement('div');
  groupDiv.style.marginBottom = '0.5rem';

  // Calculate group statistics
  const stats = calculateGroupStats(branches);

  // Group header (clickable to expand/collapse)
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.6rem 0.75rem;
    background: var(--bg-tertiary);
    border-radius: 6px;
    user-select: none;
    transition: all 0.2s;
    font-size: 0.9rem;
  `;
  header.onmouseover = () => header.style.background = 'var(--bg-secondary)';
  header.onmouseout = () => header.style.background = 'var(--bg-tertiary)';

  // Expand/collapse icon
  const icon = document.createElement('span');
  icon.textContent = '▶';
  icon.style.cssText = `
    min-width: 16px;
    transition: transform 0.2s;
    color: var(--accent-teal);
    font-size: 0.75rem;
  `;

  // Header text
  const headerText = document.createElement('div');
  headerText.style.cssText = `
    flex: 0 0 auto;
    min-width: 100px;
  `;
  headerText.innerHTML = `
    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.1rem;">
      ${region} (${branches.length})
    </div>
  `;

  // Summary stats
  const summaryStats = document.createElement('div');
  summaryStats.style.cssText = `
    flex: 1;
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
  `;
  summaryStats.innerHTML = `
    <span>✓ ${stats.completed} Completed</span>
    <span>→ ${stats.inProgress} In Progress</span>
    <span>⊘ ${stats.notStarted} Not Started</span>
    <span style="color: ${stats.avgDeltaColor};">Δ ${stats.avgDelta}</span>
  `;

  header.appendChild(icon);
  header.appendChild(headerText);
  header.appendChild(summaryStats);

  // Items container (collapsible - initially hidden)
  const itemsContainer = document.createElement('div');
  itemsContainer.style.cssText = `
    margin-top: 0.3rem;
    display: none;
    flex-direction: column;
    gap: 0.4rem;
    padding-left: 0.5rem;
    border-left: 2px solid var(--border-color);
  `;

  // Add timeline items
  branches.forEach((branch) => {
    const item = createTimelineItem(branch);
    itemsContainer.appendChild(item);
  });

  // Toggle function
  const toggle = () => {
    const isCollapsed = itemsContainer.style.display === 'none';
    itemsContainer.style.display = isCollapsed ? 'flex' : 'none';
    icon.style.transform = isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)';
  };

  header.onclick = toggle;

  groupDiv.appendChild(header);
  groupDiv.appendChild(itemsContainer);

  return groupDiv;
}

/**
 * Calculate summary statistics for a group of branches
 */
function calculateGroupStats(branches) {
  const completed = branches.filter(b => (b.status || '').toLowerCase() === 'completed').length;
  const inProgress = branches.filter(b => (b.status || '').toLowerCase() === 'in progress').length;
  const notStarted = branches.length - completed - inProgress;

  const deltas = branches.map(b => b.days_delta).filter(d => d !== null);
  const avgDelta = deltas.length > 0 ? (deltas.reduce((a, b) => a + b, 0) / deltas.length).toFixed(1) : '—';

  const avgDeltaColor = avgDelta === '—' ? 'var(--text-muted)' :
                        avgDelta > 0 ? '#ef4444' :
                        avgDelta < 0 ? '#10b981' : '#00d4ff';

  return { completed, inProgress, notStarted, avgDelta, avgDeltaColor };
}

/**
 * Create a single timeline item element - compact version
 */
function createTimelineItem(branch) {
  const div = document.createElement('div');
  div.style.cssText = `
    cursor: pointer;
    transition: all 0.2s;
    background: var(--bg-secondary);
    padding: 0.5rem 0.6rem;
    border-radius: 4px;
    border: 1px solid transparent;
    font-size: 0.85rem;
  `;
  div.onmouseover = () => {
    div.style.background = 'var(--bg-tertiary)';
    div.style.borderColor = 'var(--accent-teal)';
  };
  div.onmouseout = () => {
    div.style.background = 'var(--bg-secondary)';
    div.style.borderColor = 'transparent';
  };
  div.onclick = () => openBranchModal(branch);

  const delta = branch.days_delta;
  const status = branch.schedule_status || 'not_applicable';
  const deltaDisplay = delta !== null ? `${delta > 0 ? '+' : ''}${delta}` : '—';
  const color = getDaysDeltaColor(delta);
  const barWidth = calculateBarWidth(delta);

  div.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.3rem;">
      <div style="flex: 0 0 140px;">
        <div style="font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${branch.branch_name || '—'}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">
          ${branch.status || '—'}
        </div>
      </div>

      <div style="flex: 1; display: flex; align-items: center; gap: 0.5rem; min-width: 0;">
        <div style="
          flex: 1;
          height: 20px;
          background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
          border-radius: 2px;
          position: relative;
          overflow: hidden;
          min-width: 60px;
        ">
          <div style="
            position: absolute;
            top: 0;
            left: ${barWidth}%;
            width: 3px;
            height: 100%;
            background: white;
            opacity: 1;
            box-shadow: 0 0 6px rgba(255, 255, 255, 0.9), 0 0 12px rgba(255, 255, 255, 0.6);
            margin-left: -1.5px;
          "></div>
        </div>
        <div style="font-weight: 600; min-width: 50px; text-align: right; color: ${color}; font-size: 0.8rem;">
          ${deltaDisplay}d
        </div>
      </div>

      <div style="flex: 0 0 70px;">
        <span class="badge badge-${status}" style="font-size: 0.7rem; padding: 0.3rem 0.5rem;">
          ${status === 'not_applicable' ? 'N/A' : status}
        </span>
      </div>
    </div>

    <div style="display: flex; gap: 0.8rem; font-size: 0.75rem; color: var(--text-muted); overflow: hidden;">
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        📍 ${branch.address ? branch.address.substring(0, 30) : '—'}
      </div>
      <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        👤 ${branch.pic ? branch.pic.substring(0, 25) : '—'}
      </div>
    </div>
  `;

  return div;
}

/**
 * Get color for days delta
 */
function getDaysDeltaColor(delta) {
  if (delta === null) return 'var(--text-muted)';
  if (delta > 10) return '#ef4444'; // deep red
  if (delta > 0) return '#f59e0b';  // orange
  if (delta === 0) return '#00d4ff'; // cyan
  return '#10b981'; // green
}

/**
 * Calculate bar width as percentage (0-100, center = on-time)
 */
function calculateBarWidth(delta) {
  if (delta === null) return 50;

  // Scale: -100 days = 0%, 0 days = 50%, +100 days = 100%
  const normalized = (delta + 100) / 200;
  return Math.max(0, Math.min(100, normalized * 100));
}

// Initialize on module load
initTimelinePage();
