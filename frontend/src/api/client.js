import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('billiards_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const tenantId = sessionStorage.getItem('tenant_id');
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('billiards_token');
      localStorage.removeItem('billiards_admin');
      
      // If we got a 403, store the warning message in sessionStorage so the login page can show it
      if (error.response.data && error.response.data.detail) {
        sessionStorage.setItem('login_error_message', error.response.data.detail);
      }
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
