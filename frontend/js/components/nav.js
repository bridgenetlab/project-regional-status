/**
 * Navigation bar management
 */

import * as state from '../state.js';

const NAV_ITEMS = [
  { id: 'upload', label: 'Upload', icon: '📤' },
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'branches', label: 'Branches', icon: '🏢' },
  { id: 'timeline', label: 'Timeline', icon: '📅' },
  { id: 'costing', label: 'Costing', icon: '💰' },
  { id: 'maps', label: 'Map', icon: '🗺️' },
  { id: 'progress', label: 'In Progress', icon: '⚙️' },
];

/**
 * Initialize navigation
 */
export function initNav() {
  const navContainer = document.getElementById('navigation');
  if (!navContainer) return;

  // Clear existing
  navContainer.innerHTML = '';

  // Add buttons
  NAV_ITEMS.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'nav-button';
    btn.dataset.page = item.id;
    btn.textContent = `${item.icon} ${item.label}`;
    btn.onclick = () => navigateTo(item.id);

    navContainer.appendChild(btn);
  });

  updateNavHighlight();
}

/**
 * Navigate to page
 */
export function navigateTo(pageId) {
  state.setCurrentPage(pageId);
  updateNavHighlight();

  // Trigger page-specific initialization if needed
  const event = new CustomEvent('page-changed', { detail: { page: pageId } });
  document.dispatchEvent(event);
}

/**
 * Update active button
 */
function updateNavHighlight() {
  const currentPage = state.getCurrentPage();
  const buttons = document.querySelectorAll('.nav-button');

  buttons.forEach((btn) => {
    const isActive = btn.dataset.page === currentPage;
    btn.classList.toggle('active', isActive);
  });
}

/**
 * Show/hide nav items based on session state
 */
export function updateNavAvailability() {
  const sessionId = state.getSessionId();
  const buttons = document.querySelectorAll('.nav-button');

  buttons.forEach((btn) => {
    const page = btn.dataset.page;
    if (page === 'upload') {
      // Always available
      btn.disabled = false;
    } else {
      // Only available if we have a session
      btn.disabled = !sessionId;
    }
  });
}

// Initialize on load
initNav();

// Listen for state changes
document.addEventListener('session-created', updateNavAvailability);
document.addEventListener('session-cleared', updateNavAvailability);
