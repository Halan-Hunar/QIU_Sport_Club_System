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
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import TournamentStats from './pages/TournamentStats';
import Players from './pages/Players';
import Stats from './pages/Stats';
import AdminDashboard from './pages/AdminDashboard';
import PrivacyPolicy from './pages/PolicyPage';
import TermsOfService from './pages/TermsPage';
import Declined from './pages/Declined';
import ConsentBanner from './components/ConsentBanner';

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

        <Route path="/players" element={<Players />} />

        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/tournaments/:id/stats" element={<TournamentStats />} />
        {/* Old /awards path kept as a redirect for any external links. */}
        <Route path="/tournaments/:id/awards" element={<Navigate to="../stats" replace />} />

        <Route path="/stats" element={<Stats />} />

        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/declined" element={<Declined />} />

        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
      </Routes>
      <ConsentBanner />
    </Layout>
  );
}

export default App;
