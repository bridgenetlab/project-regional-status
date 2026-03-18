/**
 * Toast notifications
 */

const TOAST_DURATION = 4000;

/**
 * Show toast notification
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    toast.remove();
  }, duration);
}

/**
 * Show success toast
 */
export function showSuccess(message) {
  showToast(message, 'success');
}

/**
 * Show error toast
 */
export function showError(message) {
  showToast(message, 'error', 5000);
}

/**
 * Show info toast
 */
export function showInfo(message) {
  showToast(message, 'info');
}
