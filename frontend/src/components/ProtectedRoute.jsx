import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, token, initializing } = useAuthStore();

  if (token && initializing) return <p role="status" className="p-8">Restoring your session…</p>;

  // Not logged in at all
  if (!token) return <Navigate to="/login" replace />;

  // Logged in but not admin and route requires admin
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
