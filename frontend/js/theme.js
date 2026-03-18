/**
 * Theme toggle (dark/light mode)
 * Persists to localStorage, reads data-theme attribute from <html>
 */

const THEME_KEY = 'pt-theme';

/**
 * Initialize theme on page load
 */
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(saved);
}

/**
 * Toggle between dark and light theme
 */
export function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

/**
 * Apply theme and update UI
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀' : '☾';
  }
}

/**
 * Get current theme
 */
export function getCurrentTheme() {
  return document.documentElement.dataset.theme || 'dark';
}

/**
 * Get CSS variable value
 */
export function getCSSVar(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// Initialize on module load
initTheme();

// Attach toggle to button
document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
