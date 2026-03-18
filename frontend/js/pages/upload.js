/**
 * Upload page logic
 */

import * as api from '../api.js';
import * as state from '../state.js';
import { showToast, showSuccess, showError } from '../components/toast.js';
import { updateNavAvailability, navigateTo } from '../components/nav.js';

// DOM elements
const dragDropZone = document.getElementById('drag-drop-zone');
const fileInput = document.getElementById('file-input');
const uploadStatus = document.getElementById('upload-status');
const uploadMessage = document.getElementById('upload-message');
const uploadErrors = document.getElementById('upload-errors');
const uploadSuccess = document.getElementById('upload-success');
const rowCountMsg = document.getElementById('row-count-msg');
const continueBtn = document.getElementById('continue-btn');

/**
 * Initialize upload page
 */
export function initUploadPage() {
  // Drag and drop
  dragDropZone.addEventListener('click', () => fileInput.click());
  dragDropZone.addEventListener('dragover', handleDragOver);
  dragDropZone.addEventListener('dragleave', handleDragLeave);
  dragDropZone.addEventListener('drop', handleDrop);

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Continue button
  continueBtn.addEventListener('click', () => {
    // Trigger overview page load and navigation
    navigateTo('overview');
    document.dispatchEvent(new CustomEvent('page-changed', { detail: { page: 'overview' } }));
  });

  // Reset upload UI on return to upload page
  document.addEventListener('page-changed', (e) => {
    if (e.detail.page === 'upload' && !state.getSessionId()) {
      resetUploadUI();
    }
  });
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
  e.preventDefault();
  dragDropZone.classList.add('dragover');
}

/**
 * Handle drag leave
 */
function handleDragLeave() {
  dragDropZone.classList.remove('dragover');
}

/**
 * Handle drop
 */
function handleDrop(e) {
  e.preventDefault();
  dragDropZone.classList.remove('dragover');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
}

/**
 * Handle file upload
 */
async function handleFile(file) {
  // Validate file type
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    showError('Please upload an .xlsx or .xls file');
    return;
  }

  // Show loading state
  dragDropZone.style.opacity = '0.5';
  dragDropZone.style.pointerEvents = 'none';
  showToast('Uploading file...', 'info');

  try {
    const response = await api.uploadFile(file);

    // Store session ID
    state.setSessionId(response.session_id);

    // Show success
    rowCountMsg.textContent = `Successfully loaded ${response.row_count} branches`;
    uploadSuccess.style.display = 'block';
    dragDropZone.style.display = 'none';
    uploadStatus.style.display = 'none';

    // Update nav availability
    updateNavAvailability();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('session-created', { detail: { sessionId: response.session_id } }));

    showSuccess('File uploaded successfully!');

    // Show warnings if any
    if (response.warnings && response.warnings.length > 0) {
      showToast(`${response.warnings.length} parsing warnings - see details in data`, 'info', 6000);
    }
  } catch (error) {
    showError(`Upload failed: ${error.message}`);
    dragDropZone.style.opacity = '1';
    dragDropZone.style.pointerEvents = 'auto';
  }
}

/**
 * Reset upload UI
 */
function resetUploadUI() {
  dragDropZone.style.display = 'block';
  dragDropZone.style.opacity = '1';
  dragDropZone.style.pointerEvents = 'auto';
  uploadSuccess.style.display = 'none';
  uploadStatus.style.display = 'none';
  fileInput.value = '';
}

// Initialize on module load
initUploadPage();
