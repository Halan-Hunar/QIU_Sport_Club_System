import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
const Login = lazy(() => import('./pages/Login'));
const Teams = lazy(() => import('./pages/Teams'));
const TeamDetail = lazy(() => import('./pages/TeamDetail'));
const Tournaments = lazy(() => import('./pages/Tournaments'));
const TournamentDetail = lazy(() => import('./pages/TournamentDetail'));
const TournamentStats = lazy(() => import('./pages/TournamentStats'));
const Players = lazy(() => import('./pages/Players'));
const Stats = lazy(() => import('./pages/Stats'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PrivacyPolicy = lazy(() => import('./pages/PolicyPage'));
const TermsOfService = lazy(() => import('./pages/TermsPage'));
const Declined = lazy(() => import('./pages/Declined'));
const NotFound = lazy(() => import('./pages/NotFound'));
import ConsentBanner from './components/ConsentBanner';

const News = lazy(() => import('./pages/News'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const NewsAdmin = lazy(() => import('./pages/NewsAdmin'));
const NewsEditor = lazy(() => import('./pages/NewsEditor'));

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
      <Suspense fallback={<p role="status" className="max-w-5xl mx-auto p-8">Loading page…</p>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<News />} />
        <Route path="/events/:id" element={<NewsDetail />} />
        <Route path="/admin/events" element={<ProtectedRoute adminOnly><NewsAdmin /></ProtectedRoute>} />
        <Route path="/admin/events/new" element={<ProtectedRoute adminOnly><NewsEditor key="new" /></ProtectedRoute>} />
        <Route path="/admin/events/:id" element={<ProtectedRoute adminOnly><NewsEditor /></ProtectedRoute>} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:id" element={<NewsDetail />} />
        <Route path="/admin/news" element={<ProtectedRoute adminOnly><NewsAdmin /></ProtectedRoute>} />
        <Route path="/admin/news/new" element={<ProtectedRoute adminOnly><NewsEditor key="new" /></ProtectedRoute>} />
        <Route path="/admin/news/:id" element={<ProtectedRoute adminOnly><NewsEditor /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />

        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/new" element={<Navigate to="/teams?new=1" replace />} />
        <Route path="/teams/:id" element={
          <ProtectedRoute>
            <TeamDetail />
          </ProtectedRoute>
        } />

        <Route path="/players" element={
          <ProtectedRoute>
            <Players />
          </ProtectedRoute>
        } />

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

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      <ConsentBanner />
    </Layout>
  );
}

export default App;
