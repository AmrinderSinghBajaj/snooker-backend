import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/endpoints';
import { useBranding } from './BrandingContext';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { updateBranding } = useBranding();
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('billiards_admin');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('billiards_token');
    if (token) {
      if (!admin) {
        authApi.me()
          .then((res) => {
            setAdmin(res.data);
            localStorage.setItem('billiards_admin', JSON.stringify(res.data));
            if (res.data.subdomain) {
              const currentTenant = sessionStorage.getItem('tenant_id');
              if (currentTenant !== res.data.subdomain) {
                sessionStorage.setItem('tenant_id', res.data.subdomain);
                api.get('/branding', { params: { club: res.data.subdomain } })
                  .then(brandingRes => updateBranding(brandingRes.data))
                  .catch(err => console.error(err));
              }
            }
          })
          .catch(() => {
            localStorage.removeItem('billiards_token');
          })
          .finally(() => setLoading(false));
      } else {
        // Session exists in localStorage, ensure sessionStorage matches the user's club subdomain
        if (admin.subdomain) {
          const currentTenant = sessionStorage.getItem('tenant_id');
          if (currentTenant !== admin.subdomain) {
            sessionStorage.setItem('tenant_id', admin.subdomain);
            api.get('/branding', { params: { club: admin.subdomain } })
              .then(brandingRes => updateBranding(brandingRes.data))
              .catch(err => console.error(err));
          }
        }
        setLoading(false);
      }
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
    localStorage.removeItem('billiards_token');
    localStorage.removeItem('billiards_admin');
    sessionStorage.removeItem('tenant_id');
    setAdmin(null);
    window.location.href = '/login';
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
