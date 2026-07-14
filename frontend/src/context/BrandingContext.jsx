import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const BrandingContext = createContext(null);

const FALLBACK = {
  club_name: 'The Billiards Arena',
  owner_full_name: 'Beerbal Ji',
  owner_role_label: 'Club Owner',
  logo_url: null,
  has_logo: false,
};

function adjustColor(hex, percent) {
  try {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00ff) + amt;
    const B = (num & 0x0000ff) + amt;

    const rClamped = Math.max(0, Math.min(255, R));
    const gClamped = Math.max(0, Math.min(255, G));
    const bClamped = Math.max(0, Math.min(255, B));

    return '#' + (0x1000000 + rClamped * 0x10000 + gClamped * 0x100 + bClamped).toString(16).slice(1);
  } catch {
    return hex;
  }
}

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(FALLBACK);
  const [loaded, setLoaded] = useState(false);

  const applyThemeColors = (primary, secondary) => {
    if (primary) {
      document.documentElement.style.setProperty('--felt-900', primary);
      document.documentElement.style.setProperty('--felt-800', adjustColor(primary, 5));
      document.documentElement.style.setProperty('--felt-700', adjustColor(primary, 10));
      document.documentElement.style.setProperty('--felt-600', adjustColor(primary, 15));
      document.documentElement.style.setProperty('--felt-500', adjustColor(primary, 20));
    }
    if (secondary) {
      document.documentElement.style.setProperty('--brass-500', secondary);
      document.documentElement.style.setProperty('--brass-300', adjustColor(secondary, 15));
      document.documentElement.style.setProperty('--brass-700', adjustColor(secondary, -15));
    }
  };

  const updateBranding = (newData) => {
    setBranding((prev) => {
      const merged = { ...prev, ...newData };
      const primary = merged.theme_primary || merged.themePrimary;
      const secondary = merged.theme_secondary || merged.themeSecondary;
      
      if (merged.themePrimary) merged.theme_primary = merged.themePrimary;
      if (merged.themeSecondary) merged.theme_secondary = merged.themeSecondary;

      applyThemeColors(primary, secondary);
      return merged;
    });
  };

  useEffect(() => {
    // 1. Detect and persist tenant from URL query param if present
    const urlParams = new URLSearchParams(window.location.search);
    const clubParam = urlParams.get('club');
    if (clubParam) {
      sessionStorage.setItem('tenant_id', clubParam);
    }

    const tenantId = sessionStorage.getItem('tenant_id');

    // 2. Fetch branding for the current tenant
    api.get('/branding', { params: tenantId ? { club: tenantId } : {} })
      .then((res) => {
        const data = res.data;
        setBranding(data);

        // 3. Dynamically apply custom white-labeled themes using CSS variables
        applyThemeColors(data.theme_primary, data.theme_secondary);
      })
      .catch(() => setBranding(FALLBACK))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <BrandingContext.Provider value={{ ...branding, loaded, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
