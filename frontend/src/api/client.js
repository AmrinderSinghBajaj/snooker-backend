import axios from 'axios';
import { secureStorage, secureSessionStorage } from '../utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = secureStorage.getItem('billiards_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const tenantId = secureSessionStorage.getItem('tenant_id');
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      secureStorage.removeItem('billiards_token');
      secureStorage.removeItem('billiards_admin');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
