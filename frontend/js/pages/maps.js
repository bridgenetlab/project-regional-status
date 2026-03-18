/**
 * Maps page logic - Google Maps dashboard with status color-coding
 */

import * as api from '../api.js';
import * as state from '../state.js';
import { showError } from '../components/toast.js';
import { openBranchModal } from '../components/modal.js';

let map = null;
let markers = [];
let mapsEnabled = localStorage.getItem('mapsEnabled') === 'true'; // Default: disabled
let googleMapsLoaded = false;

// Geocoding cache configuration
const GEOCODE_CACHE_KEY = 'branchGeocodeCache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Initialize maps page
 */
export function initMapsPage() {
  document.addEventListener('page-changed', async (e) => {
    if (e.detail.page === 'maps') {
      checkApiKeyAndLoadMap();
    }
  });

  // Toggle maps on/off
  document.getElementById('maps-enabled-toggle')?.addEventListener('change', (e) => {
    mapsEnabled = e.target.checked;
    localStorage.setItem('mapsEnabled', mapsEnabled);

    if (mapsEnabled) {
      checkApiKeyAndLoadMap();
    } else {
      clearMap();
      document.getElementById('maps-container').innerHTML = `
        <div style="text-align: center; color: var(--text-secondary);">
          <div style="font-size: 2rem; margin-bottom: 1rem;">💾</div>
          <p>Map disabled to save API credits</p>
        </div>
      `;
    }
  });

  // Configure API Key button
  document.getElementById('configure-api-btn')?.addEventListener('click', () => {
    openMapsApiKeyModal();
  });

  // Save API Key button
  document.getElementById('save-maps-api-key-btn')?.addEventListener('click', () => {
    saveMapsApiKey();
  });

  // API Key input - Enter key
  document.getElementById('maps-api-key-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveMapsApiKey();
    }
  });

  // Close modal on outside click
  const modal = document.getElementById('maps-api-key-modal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeMapsApiKeyModal();
    }
  });

  // Sync toggle state
  const toggle = document.getElementById('maps-enabled-toggle');
  if (toggle) {
    toggle.checked = mapsEnabled;
  }

  // Expose functions globally
  window.closeMapsApiKeyModal = closeMapsApiKeyModal;
}

/**
 * Get geocoded coordinates from cache
 */
function getGeocodeCacheForAddress(address) {
  const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}');
  const entry = cache[address];

  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.location; // Return cached location
  }
  return null; // Cache expired or not found
}

/**
 * Store geocoded coordinates in cache
 */
function cacheGeocodeResult(address, location) {
  const cache = JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}');
  cache[address] = { location, timestamp: Date.now() };
  localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
}

/**
 * Check if API key is configured, then load map
 */
async function checkApiKeyAndLoadMap() {
  const apiKey = localStorage.getItem('googleMapsApiKey');

  if (!apiKey) {
    // Show API key modal
    openMapsApiKeyModal();
    return;
  }

  // API key exists, load map
  await loadMapsPage();
}

/**
 * Load and initialize maps
 */
async function loadMapsPage() {
  const sessionId = state.getSessionId();
  if (!sessionId) {
    showError('No session found');
    return;
  }

  try {
    // Fetch branches - limited to 300 to save API/geocoding credits
    const data = await api.fetchBranches(sessionId, { page: 1, per_page: 300 });

    if (!data.branches || data.branches.length === 0) {
      showError('No branches found');
      return;
    }

    // Filter branches that have addresses (required for geocoding)
    const branchesWithAddresses = data.branches.filter(b => b.address && b.address.trim());

    if (branchesWithAddresses.length === 0) {
      showError('No branches with addresses found');
      return;
    }

    // Update stats using only branches with addresses
    updateStats(branchesWithAddresses);

    // Load map if enabled
    if (mapsEnabled) {
      if (!googleMapsLoaded) {
        await loadGoogleMapsScript();
      }

      if (map) {
        clearMarkers();
        addMarkersToMap(branchesWithAddresses);
      }
    }
  } catch (error) {
    showError(`Failed to load map: ${error.message}`);
  }
}

/**
 * Load Google Maps script
 */
function loadGoogleMapsScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      googleMapsLoaded = true;
      initializeMap();
      resolve();
      return;
    }

    // Get API key from localStorage (saved in dashboard or elsewhere)
    const apiKey = localStorage.getItem('googleMapsApiKey');
    if (!apiKey) {
      reject(new Error('Google Maps API key not found. Please configure it in the dashboard first.'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.onload = () => {
      googleMapsLoaded = true;
      initializeMap();
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps. Please check your API key.'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Map
 */
function initializeMap() {
  const container = document.getElementById('maps-container');

  if (!container) return;

  // Center on Malaysia
  const center = { lat: 4.2105, lng: 101.6964 };

  map = new google.maps.Map(container, {
    zoom: 6,
    center: center,
    styles: getDarkMapStyle(),
  });
}

/**
 * Get dark theme map style
 */
function getDarkMapStyle() {
  return [
    {
      elementType: 'geometry',
      stylers: [{ color: '#1a1f2e' }],
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#1a1f2e' }],
    },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: '#b0b8c1' }],
    },
    {
      featureType: 'administrative',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#2a3142' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#252d3d' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#0f1419' }],
    },
  ];
}

/**
 * Get color for status
 */
function getColorForStatus(status) {
  switch (status?.toLowerCase()) {
    case 'completed':
      return '#10b981'; // Green
    case 'in progress':
      return '#f59e0b'; // Yellow/Amber
    case 'not started':
    default:
      return '#ef4444'; // Red
  }
}

/**
 * Add markers to map
 */
function addMarkersToMap(branches) {
  if (!map) return;

  const bounds = new google.maps.LatLngBounds();
  let processedCount = 0;

  branches.forEach((branch, index) => {
    // Use address from Excel for geocoding
    if (!branch.address || !branch.address.trim()) {
      return;
    }

    // Stagger geocoding requests to avoid rate limiting
    setTimeout(() => {
      geocodeBranch(branch, bounds);
      processedCount++;
    }, index * 100); // 100ms delay between requests
  });
}

/**
 * Helper to fit map bounds after geocoding
 */
function fitMapBounds(bounds) {
  if (bounds && !bounds.isEmpty()) {
    map.fitBounds(bounds);
  }
}

/**
 * Add marker to map for a branch location
 */
function addMarkerToMap(branch, location, bounds) {
  const color = getColorForStatus(branch.status);
  const marker = new google.maps.Marker({
    position: location,
    map: map,
    title: branch.branch_name || 'Branch',
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    },
  });

  // Add click listener to show branch details
  marker.addListener('click', () => {
    openBranchModal(branch);
  });

  markers.push(marker);

  // Extend bounds
  if (bounds) {
    bounds.extend(location);
    fitMapBounds(bounds);
  }
}

/**
 * Geocode a single branch using its address (with caching)
 */
function geocodeBranch(branch, bounds) {
  if (!map || !branch.address) return;

  // Check if we already have coordinates cached
  const cachedLocation = getGeocodeCacheForAddress(branch.address);
  if (cachedLocation) {
    // Convert cached object to LatLng if needed
    const location = new google.maps.LatLng(cachedLocation.lat, cachedLocation.lng);
    addMarkerToMap(branch, location, bounds);
    return;
  }

  // If not cached, call API
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: branch.address }, (results, status) => {
    if (status === 'OK' && results[0]) {
      const location = results[0].geometry.location;

      // Cache the result
      cacheGeocodeResult(branch.address, {
        lat: location.lat(),
        lng: location.lng(),
      });

      addMarkerToMap(branch, location, bounds);
    }
  });
}

/**
 * Clear all markers
 */
function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
}

/**
 * Clear map
 */
function clearMap() {
  clearMarkers();
  if (map) {
    map.setMap(null);
    map = null;
  }
}

/**
 * Update statistics
 */
function updateStats(branches) {
  const completed = branches.filter((b) => b.status?.toLowerCase() === 'completed').length;
  const inProgress = branches.filter((b) => b.status?.toLowerCase() === 'in progress').length;
  const notStarted = branches.filter((b) => b.status?.toLowerCase() === 'not started' || !b.status).length;
  const total = branches.length;

  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const progressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const notStartedPct = total > 0 ? Math.round((notStarted / total) * 100) : 0;

  document.getElementById('map-completed-count').textContent = completed;
  document.getElementById('map-completed-pct').textContent = `${completedPct}%`;

  document.getElementById('map-progress-count').textContent = inProgress;
  document.getElementById('map-progress-pct').textContent = `${progressPct}%`;

  document.getElementById('map-notstarted-count').textContent = notStarted;
  document.getElementById('map-notstarted-pct').textContent = `${notStartedPct}%`;
}

/**
 * Open API key modal
 */
function openMapsApiKeyModal() {
  const modal = document.getElementById('maps-api-key-modal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('maps-api-key-input')?.focus();
  }
}

/**
 * Close API key modal
 */
function closeMapsApiKeyModal() {
  const modal = document.getElementById('maps-api-key-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Save API key and load map
 */
async function saveMapsApiKey() {
  const input = document.getElementById('maps-api-key-input');
  const key = input?.value?.trim();

  if (!key) {
    showError('Please enter an API key');
    return;
  }

  // Save to localStorage
  localStorage.setItem('googleMapsApiKey', key);

  // Close modal
  closeMapsApiKeyModal();

  // Load map
  googleMapsLoaded = false; // Reset so script loads with new key
  await loadMapsPage();
}

// Initialize on module load
initMapsPage();
