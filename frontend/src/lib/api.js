// =============================================================================
// MudraFlow Frontend: API Client
// =============================================================================

const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, token } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Attach token from options or role-aware storage
  const isStaffCall = endpoint.startsWith('/staff');
  let authToken = token;
  if (!authToken) {
    if (isStaffCall) {
      authToken = localStorage.getItem('mf_staff_token') || localStorage.getItem('mf_token');
    } else {
      authToken = localStorage.getItem('mf_customer_token') || localStorage.getItem('mf_token');
    }
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export default apiRequest;

