/**
 * Global application state
 */

let sessionId = null;
let currentPage = 'upload';
let overviewData = null;
let branchesData = null;
let timelineData = null;
let currentRegionFilter = null;
let currentStatusFilter = null;
let currentSearchFilter = null;
let currentSiteReadinessFilter = null;
let currentUATDocumentFilter = null;
let currentPage_branches = 1;
let currentSort = { by: 'branch_name', dir: 'asc' };

// Getters
export function getSessionId() {
  return sessionId;
}

export function getCurrentPage() {
  return currentPage;
}

export function getOverviewData() {
  return overviewData;
}

export function getBranchesData() {
  return branchesData;
}

export function getTimelineData() {
  return timelineData;
}

export function getRegionFilter() {
  return currentRegionFilter;
}

export function getStatusFilter() {
  return currentStatusFilter;
}

export function getSearchFilter() {
  return currentSearchFilter;
}

export function getSiteReadinessFilter() {
  return currentSiteReadinessFilter;
}

export function getUATDocumentFilter() {
  return currentUATDocumentFilter;
}

export function getCurrentBranchesPage() {
  return currentPage_branches;
}

export function getCurrentSort() {
  return currentSort;
}

// Setters
export function setSessionId(id) {
  sessionId = id;
}

export function setCurrentPage(page) {
  currentPage = page;
  updatePageDisplay();
}

export function setOverviewData(data) {
  overviewData = data;
}

export function setBranchesData(data) {
  branchesData = data;
}

export function setTimelineData(data) {
  timelineData = data;
}

export function setRegionFilter(region) {
  currentRegionFilter = region;
  currentPage_branches = 1; // Reset to first page on filter change
}

export function setStatusFilter(status) {
  currentStatusFilter = status;
  currentPage_branches = 1;
}

export function setSearchFilter(search) {
  currentSearchFilter = search;
  currentPage_branches = 1;
}

export function setSiteReadinessFilter(readiness) {
  currentSiteReadinessFilter = readiness;
  currentPage_branches = 1;
}

export function setUATDocumentFilter(uat) {
  currentUATDocumentFilter = uat;
  currentPage_branches = 1;
}

export function setCurrentBranchesPage(page) {
  currentPage_branches = page;
}

export function setCurrentSort(by, dir) {
  currentSort = { by, dir };
}

/**
 * Update page display (show/hide sections)
 */
function updatePageDisplay() {
  const pages = document.querySelectorAll('.page');
  pages.forEach((page) => {
    page.style.display = 'none';
  });

  const activePage = document.getElementById(`page-${currentPage}`);
  if (activePage) {
    activePage.style.display = 'block';
  }
}

/**
 * Reset all state
 */
export function resetState() {
  sessionId = null;
  currentPage = 'upload';
  overviewData = null;
  branchesData = null;
  timelineData = null;
  currentRegionFilter = null;
  currentStatusFilter = null;
  currentSearchFilter = null;
  currentSiteReadinessFilter = null;
  currentUATDocumentFilter = null;
  currentPage_branches = 1;
  currentSort = { by: 'branch_name', dir: 'asc' };
  updatePageDisplay();
}
