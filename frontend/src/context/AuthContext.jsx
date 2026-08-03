import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/endpoints';
import { useBranding } from './BrandingContext';
import api from '../api/client';
import { secureStorage, secureSessionStorage } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { updateBranding } = useBranding();
  const [admin, setAdmin] = useState(() => {
    try {
      const stored = secureStorage.getItem('billiards_admin');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to parse stored admin:', e);
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = secureStorage.getItem('billiards_token');
    if (token) {
      authApi.me()
        .then((res) => {
          setAdmin(res.data);
          secureStorage.setItem('billiards_admin', JSON.stringify(res.data));
          if (res.data.subdomain) {
            const currentTenant = secureSessionStorage.getItem('tenant_id');
            if (currentTenant !== res.data.subdomain) {
              secureSessionStorage.setItem('tenant_id', res.data.subdomain);
              api.get('/branding', { params: { club: res.data.subdomain } })
                .then(brandingRes => updateBranding(brandingRes.data))
                .catch(err => console.error(err));
            }
          }
        })
        .catch(() => {
          secureStorage.removeItem('billiards_token');
          secureStorage.removeItem('billiards_admin');
          setAdmin(null);
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
    secureStorage.setItem('billiards_token', access_token);
    secureStorage.setItem('billiards_admin', JSON.stringify(adminInfo));
    if (adminInfo.subdomain) {
      secureSessionStorage.setItem('tenant_id', adminInfo.subdomain);
      try {
        // Fetch branding details for the logged-in club and update global branding state
        const brandingRes = await api.get('/branding', { params: { club: adminInfo.subdomain } });
        updateBranding(brandingRes.data);
      } catch (err) {
        console.error('Failed to update branding during login:', err);
      }
    }
    setAdmin(adminInfo);
    return adminInfo;
  };

  const logout = () => {
    authApi.logout()
      .catch((err) => console.error('Server logout failed:', err))
      .finally(() => {
        secureStorage.removeItem('billiards_token');
        secureStorage.removeItem('billiards_admin');
        secureSessionStorage.removeItem('tenant_id');
        setAdmin(null);
        window.location.href = '/login';
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
