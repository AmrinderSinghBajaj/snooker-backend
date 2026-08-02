import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--chalk-400)' }}>
        Loading…
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  // Route-level permission guards
  const role = admin?.role;
  if (role !== 'superadmin' && role !== 'Club Owner') {
    const path = location.pathname;

    // Employee Management is owner-only
    if (path === '/employee-management') {
      return <Navigate to="/dashboard" replace />;
    }

    const mapping = {
      '/dashboard': 'dashboard',
      '/customers': 'customers',
      '/billing': 'billing',
      '/tables': 'tables',
      '/food': 'foodDrink',
      '/advance-payments': 'advancePay',
      '/revenue': 'revenue',
      '/settings': 'settings'
    };

    const moduleKey = mapping[path];
    if (moduleKey && !admin.permissions?.[moduleKey]?.view) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
