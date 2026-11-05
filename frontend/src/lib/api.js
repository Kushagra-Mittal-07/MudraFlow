// =============================================================================
// MudraFlow Frontend: API Client
// Handles both local development (Vite dev proxy) and production (Vercel backend)
// =============================================================================

/**
 * Returns the sanitized base URL from import.meta.env.VITE_API_URL.
 * Strips any trailing slashes or accidental trailing '/api'.
 * In local dev where VITE_API_URL is unset, returns an empty string to use dev proxy.
 */
function getBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  return envUrl.replace(/\/+$/, '').replace(/\/api$/, '');
}

/**
 * Constructs a safe API URL without double slashes or duplicated '/api' segments.
 */
export function buildApiUrl(endpoint) {
  const base = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Ensure path starts with /api
  const apiPath = cleanEndpoint.startsWith('/api/') || cleanEndpoint === '/api'
    ? cleanEndpoint
    : `/api${cleanEndpoint}`;

  // Prepend base URL if configured; otherwise use relative path for local proxy
  return base ? `${base}${apiPath}` : apiPath;
}

export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, token } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Attach token from options or role-aware storage
  const isStaffCall = endpoint.startsWith('/staff') || endpoint.startsWith('/api/staff');
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

  const url = buildApiUrl(endpoint);
  const response = await fetch(url, config);
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

