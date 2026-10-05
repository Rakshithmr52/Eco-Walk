const API_BASE = '/api';

/**
 * Retrieve authorization header if token exists
 */
function getHeaders() {
  const token = localStorage.getItem('ecowalk_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Generic response handler
 */
async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'Request failed');
    throw new Error(errorMsg);
  }
  return data;
}

export const api = {
  // Auth
  auth: {
    login: async (email, password) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return handleResponse(res);
    },
    register: async (userData) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return handleResponse(res);
    },
    getProfile: async () => {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    updatePreferences: async (preferencesData) => {
      const res = await fetch(`${API_BASE}/auth/preferences`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(preferencesData)
      });
      return handleResponse(res);
    }
  },

  // Routes & Recommendations
  routes: {
    getLocations: async () => {
      const res = await fetch(`${API_BASE}/routes/locations`);
      return handleResponse(res);
    },
    getAll: async () => {
      const res = await fetch(`${API_BASE}/routes`);
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${API_BASE}/routes/${id}`);
      return handleResponse(res);
    },
    recommend: async (payload) => {
      const res = await fetch(`${API_BASE}/routes/recommend`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse(res);
    }
  },

  // Hazard Reports (Potholes, drainage, road conditions)
  reports: {
    getAll: async (filter = {}) => {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.routeId) params.append('routeId', filter.routeId);
      if (filter.issueType) params.append('issueType', filter.issueType);
      
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/reports${query}`);
      return handleResponse(res);
    },
    create: async (reportData) => {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(reportData)
      });
      return handleResponse(res);
    },
    updateStatus: async (id, status, adminNotes = '') => {
      const res = await fetch(`${API_BASE}/reports/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, adminNotes })
      });
      return handleResponse(res);
    }
  },

  // Feedback & Ratings
  feedback: {
    getAll: async () => {
      const res = await fetch(`${API_BASE}/feedback`);
      return handleResponse(res);
    },
    getByRoute: async (routeId) => {
      const res = await fetch(`${API_BASE}/feedback/route/${routeId}`);
      return handleResponse(res);
    },
    create: async (feedbackData) => {
      const res = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(feedbackData)
      });
      return handleResponse(res);
    },
    updateStatus: async (id, status, adminNotes = '') => {
      const res = await fetch(`${API_BASE}/feedback/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, adminNotes })
      });
      return handleResponse(res);
    }
  },

  // Admin Portal
  admin: {
    getStats: async () => {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    getUsers: async () => {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: getHeaders()
      });
      return handleResponse(res);
    },
    resetDatabase: async () => {
      const res = await fetch(`${API_BASE}/admin/reset`, {
        method: 'POST',
        headers: getHeaders()
      });
      return handleResponse(res);
    }
  }
};
