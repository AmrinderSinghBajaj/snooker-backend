import { createContext, useContext, useState, useEffect } from 'react';
import api from './api';
import { secureStorage } from './utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = secureStorage.getItem('superadmin_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = secureStorage.getItem('superadmin_token');
    if (token) {
      if (!admin) {
        api.get('/auth/me')
          .then((res) => {
            setAdmin(res.data);
            secureStorage.setItem('superadmin_user', JSON.stringify(res.data));
          })
          .catch(() => {
            secureStorage.removeItem('superadmin_token');
            secureStorage.removeItem('superadmin_user');
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [admin]);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { access_token, ...adminInfo } = res.data;
    
    if (adminInfo.role !== 'superadmin') {
      throw new Error('Access denied: You are not authorized to view the Super Admin panel.');
    }

    secureStorage.setItem('superadmin_token', access_token);
    secureStorage.setItem('superadmin_user', JSON.stringify(adminInfo));
    setAdmin(adminInfo);
    return adminInfo;
  };

  const logout = () => {
    api.post('/auth/logout')
      .catch((err) => console.error('Superadmin server logout failed:', err))
      .finally(() => {
        secureStorage.removeItem('superadmin_token');
        secureStorage.removeItem('superadmin_user');
        setAdmin(null);
      });
  };

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
