/**
 * Branch detail modal
 */

/**
 * Open branch detail modal
 */
export function openBranchModal(branch) {
  const modal = document.getElementById('branch-modal');
  const titleEl = document.getElementById('modal-branch-name');
  const bodyEl = document.getElementById('modal-body');

  titleEl.textContent = branch.branch_name || 'Branch Details';

  // Build two-column grid of fields
  const fieldsHTML = buildFieldsHTML(branch);
  bodyEl.innerHTML = fieldsHTML;

  modal.classList.add('active');
}

/**
 * Close modal
 */
export function closeBranchModal() {
  const modal = document.getElementById('branch-modal');
  modal.classList.remove('active');
}

/**
 * Open renovation branches modal
 */
export function openRenovationModal(branches) {
  const modal = document.getElementById('renovation-modal');
  const tbody = document.getElementById('renovation-branches-tbody');

  tbody.innerHTML = '';

  branches.forEach((branch) => {
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.onclick = () => {
      closeRenovationModal();
      openBranchModal(branch);
    };

    row.innerHTML = `
      <td style="font-weight: 600;">${branch.branch_name || '—'}</td>
      <td>${branch.region || '—'}</td>
      <td><span class="badge badge-${(branch.status || '').toLowerCase().replace(' ', '-')}">${branch.status || '—'}</span></td>
      <td>${branch.installation_date || '—'}</td>
      <td>${branch.site_readiness || '—'}</td>
    `;

    tbody.appendChild(row);
  });

  modal.classList.add('active');
}

/**
 * Close renovation modal
 */
export function closeRenovationModal() {
  const modal = document.getElementById('renovation-modal');
  modal.classList.remove('active');
}

/**
 * Build HTML for all branch fields in table format
 */
function buildFieldsHTML(branch) {
  const fields = [
    { label: 'No', key: 'no' },
    { label: 'Branch Name', key: 'branch_name' },
    { label: 'Status', key: 'status' },
    { label: 'Region', key: 'region' },
    { label: 'Address', key: 'address' },
    { label: 'PIC', key: 'pic' },
    { label: 'Planned Start Date', key: 'planned_start_date' },
    { label: 'Target End Date', key: 'target_end_date' },
    { label: 'Actual End Date', key: 'actual_end_date' },
    { label: 'Expected Delivery', key: 'expected_delivery' },
    { label: 'Delivery Status', key: 'delivery_status' },
    { label: 'Site Readiness', key: 'site_readiness' },
    { label: 'Installation Date', key: 'installation_date' },
    { label: 'Voice Gateway', key: 'voice_gateway' },
    { label: 'Cisco 9851', key: 'cisco_9851' },
    { label: 'Cisco 9841', key: 'cisco_9841' },
    { label: 'POE', key: 'poe' },
    { label: 'Field Engineer', key: 'field_engineer' },
    { label: 'HP', key: 'hp' },
    { label: 'IC', key: 'ic' },
    { label: 'VOIP IP', key: 'voip_ip' },
    { label: 'Gateway', key: 'gateway' },
    { label: 'Note', key: 'note' },
    { label: 'Physical Phone Installation', key: 'physical_phone_installation' },
    { label: 'Issue', key: 'issue' },
    { label: 'Dependency', key: 'dependency' },
    { label: 'UAT Document', key: 'uat_document' },
    { label: 'Days Delta', key: 'days_delta' },
    { label: 'Schedule Status', key: 'schedule_status' },
  ];

  let html = `<div style="max-height: 60vh; overflow-y: auto;">
    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
      <tbody>`;

  fields.forEach((field, index) => {
    const value = branch[field.key];
    const displayValue = value !== null && value !== undefined ? String(value) : '—';
    const bgColor = index % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent';

    html += `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 0.75rem; background: ${bgColor}; font-weight: 600; color: var(--text-secondary); width: 35%; white-space: nowrap;">
          ${field.label}
        </td>
        <td style="padding: 0.75rem; background: ${bgColor}; color: var(--text-primary); word-break: break-word;">
          ${displayValue}
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  </div>`;
  return html;
}

// Close modal on click outside
document.addEventListener('DOMContentLoaded', () => {
  const branchModal = document.getElementById('branch-modal');
  branchModal?.addEventListener('click', (e) => {
    if (e.target === branchModal) {
      closeBranchModal();
    }
  });

  const renovationModal = document.getElementById('renovation-modal');
  renovationModal?.addEventListener('click', (e) => {
    if (e.target === renovationModal) {
      closeRenovationModal();
    }
  });

  // Expose globally for inline onclick
  window.closeBranchModal = closeBranchModal;
  window.closeRenovationModal = closeRenovationModal;
});
