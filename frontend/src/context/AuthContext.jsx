import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('billiards_admin');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('billiards_token');
    if (token && !admin) {
      authApi.me()
        .then((res) => {
          setAdmin(res.data);
          localStorage.setItem('billiards_admin', JSON.stringify(res.data));
          if (res.data.subdomain) {
            sessionStorage.setItem('tenant_id', res.data.subdomain);
          }
        })
        .catch(() => {
          localStorage.removeItem('billiards_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username, password) => {
    const res = await authApi.login(username, password);
    const { access_token, ...adminInfo } = res.data;
    localStorage.setItem('billiards_token', access_token);
    localStorage.setItem('billiards_admin', JSON.stringify(adminInfo));
    if (adminInfo.subdomain) {
      sessionStorage.setItem('tenant_id', adminInfo.subdomain);
    }
    setAdmin(adminInfo);
    return adminInfo;
  };

  const logout = () => {
    localStorage.removeItem('billiards_token');
    localStorage.removeItem('billiards_admin');
    setAdmin(null);
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
