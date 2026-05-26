import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';

function ComingSoon({ title, description }) {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-16 text-center">
      <h1 className="font-display text-headline-lg sm:text-display-lg text-ink">{title}</h1>
      <p className="text-ink-variant mt-3 max-w-md mx-auto">{description}</p>
      <span className="qiu-chip-primary mt-6 inline-flex">Coming soon</span>
    </div>
  );
}

function Layout({ children }) {
  const location = useLocation();
  const hideChrome = location.pathname === '/login';
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {!hideChrome && <Navbar />}
      <main className="flex-1">{children}</main>
      {!hideChrome && <Footer />}
    </div>
  );
}

function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => { fetchMe(); }, []);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/new" element={<Navigate to="/teams?new=1" replace />} />
        <Route path="/teams/:id" element={<TeamDetail />} />

        <Route path="/tournaments" element={
          <ComingSoon title="Tournaments"
            description="Brackets, fixtures, and live results for every inter-faculty championship." />
        } />
        <Route path="/stats" element={
          <ComingSoon title="Performance Dashboard"
            description="Real-time statistics and rankings for the current university season." />
        } />

        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <ComingSoon title="Admin Dashboard"
              description="Management tools for administrators." />
          </ProtectedRoute>
        } />
      </Routes>
    </Layout>
  );
}

export default App;
