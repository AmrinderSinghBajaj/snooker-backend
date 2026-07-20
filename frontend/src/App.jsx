import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import IntroAnimation from './pages/IntroAnimation';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Billing from './pages/Billing';
import TableSetup from './pages/TableSetup';
import FoodAndDrink from './pages/FoodAndDrink';
import Revenue from './pages/Revenue';
import TvDashboard from './pages/TvDashboard';
import Settings from './pages/Settings';
import AdvancePayments from './pages/AdvancePayments';

function SplashGuard({ children }) {
  const introDone = sessionStorage.getItem('intro_done');
  if (!introDone && window.location.pathname !== '/') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<SplashGuard><Login /></SplashGuard>} />
            <Route path="/tv" element={<TvDashboard />} />

            <Route
              element={
                <SplashGuard>
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                </SplashGuard>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/tables" element={<TableSetup />} />
              <Route path="/food" element={<FoodAndDrink />} />
              <Route path="/advance-payments" element={<AdvancePayments />} />
              <Route path="/revenue" element={<Revenue />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="/" element={<IntroAnimation />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </BrandingProvider>
  );
}
