// public/assets/api.js
// API client functions

const API_BASE = '';

/**
 * Fetch wrapper with credentials
 */
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API call failed');
  }
  
  return response.json();
}

// ==================== MAIN LINKS ====================

/**
 * ดึง main links
 */
async function getMainLinks() {
  return apiCall('/api/main-links');
}

/**
 * สร้าง main link
 */
async function createMainLink(data) {
  return apiCall('/api/main-links', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * แก้ไข main link
 */
async function updateMainLink(id, data) {
  return apiCall(`/api/main-links/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * ลบ main link (ต้องส่ง confirm_slug)
 */
async function deleteMainLink(id, confirmSlug) {
  return apiCall(`/api/main-links/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirm_slug: confirmSlug }),
  });
}

// ==================== DESTINATIONS ====================

/**
 * ดึง destinations
 */
async function getDestinations(mainLinkId) {
  return apiCall(`/api/main-links/${mainLinkId}/destinations`);
}

/**
 * สร้าง destination
 */
async function createDestination(mainLinkId, data) {
  return apiCall(`/api/main-links/${mainLinkId}/destinations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * แก้ไข destination
 */
async function updateDestination(id, data) {
  return apiCall(`/api/destinations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * ลบ destination
 */
async function deleteDestination(id) {
  return apiCall(`/api/destinations/${id}`, {
    method: 'DELETE',
  });
}

// ==================== CONVERSION ====================

/**
 * ตั้งค่า conversion setting
 */
async function setConversionSetting(data) {
  return apiCall('/api/conversion/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==================== USER ====================

/**
 * แก้ไข user slug
 */
async function updateUserSlug(newSlug) {
  return apiCall('/api/user/slug', {
    method: 'PUT',
    body: JSON.stringify({ new_slug: newSlug }),
  });
}

// ==================== BRANDING ====================

/**
 * ดึง branding
 */
async function getBranding() {
  return apiCall('/api/branding');
}
