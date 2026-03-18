/**
 * API client - centralized fetch calls to backend
 * Base URL: /api/v1
 */

const API_BASE = '/api/v1';

/**
 * Upload Excel file
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return await response.json();
}

/**
 * Fetch overview dashboard data
 */
export async function fetchOverview(sessionId) {
  const response = await fetch(`${API_BASE}/overview?session_id=${sessionId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch overview');
  }

  return await response.json();
}

/**
 * Fetch paginated branch list
 */
export async function fetchBranches(sessionId, params = {}) {
  const queryParams = new URLSearchParams({
    session_id: sessionId,
    ...params,
  });

  const response = await fetch(`${API_BASE}/branches?${queryParams}`);

  if (!response.ok) {
    throw new Error('Failed to fetch branches');
  }

  return await response.json();
}

/**
 * Fetch timeline data (branches sorted by days_delta)
 */
export async function fetchTimeline(sessionId, params = {}) {
  const queryParams = new URLSearchParams({
    session_id: sessionId,
    ...params,
  });

  const response = await fetch(`${API_BASE}/timeline?${queryParams}`);

  if (!response.ok) {
    throw new Error('Failed to fetch timeline');
  }

  return await response.json();
}

/**
 * Delete session
 */
export async function deleteSession(sessionId) {
  const response = await fetch(`${API_BASE}/session?session_id=${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }

  return await response.json();
}

/**
 * Fetch costing data
 */
export async function fetchCosting(sessionId, params = {}) {
  const queryParams = new URLSearchParams({
    session_id: sessionId,
    ...params,
  });

  const response = await fetch(`${API_BASE}/costing?${queryParams}`);

  if (!response.ok) {
    throw new Error('Failed to fetch costing data');
  }

  return await response.json();
}

/**
 * Check API health
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
