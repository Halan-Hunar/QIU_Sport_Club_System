import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  // Restore session on app load
  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <div className="min-h-screen">
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Public home (placeholder for now) */}
        <Route path="/" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-accent mb-2">QIU Sport Club</h1>
              <p className="text-white/50">Tournaments coming soon.</p>
            </div>
          </div>
        } />

        {/* Admin protected */}
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <div className="flex items-center justify-center min-h-screen">
              <h1 className="text-2xl font-bold text-accent">Admin Dashboard</h1>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

export default App;
