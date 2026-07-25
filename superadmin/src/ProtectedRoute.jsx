import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0b2b22',
        color: '#f4f1e8',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div className="pulse-text" style={{ fontSize: '1.2rem', opacity: 0.8 }}>Loading Super Admin Portal...</div>
      </div>
    );
  }

  if (!admin || admin.role !== 'superadmin') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
