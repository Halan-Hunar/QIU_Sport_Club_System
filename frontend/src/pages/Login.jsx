import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(form.email, form.password);
    if (success) navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-md shadow-card border border-outline-variant/30 p-8 sm:p-10">
          {/* Logo crest */}
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/export-assets/logo/QIU-Sports-Club-Logo.png"
              alt="Sport Club"
              style={{ height: '64px', width: 'auto', marginBottom: '12px' }}
            />
            <h1 className="font-display text-headline-lg text-ink">Admin Portal</h1>
            <p className="text-sm text-ink-variant mt-1">Only authorised admins are allowed to log in.</p>
            <p className="text-xs text-ink-variant/80 mt-0.5">Sign in to manage your sport club</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="sc-label">Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-variant">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="sc-input pl-10"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="sc-label !mb-0">Password</label>
                <a href="#" className="font-label text-label-md font-semibold text-primary
                                       uppercase tracking-wider hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-variant">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                </span>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="sc-input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-variant cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded-full accent-primary"
              />
              Keep me signed in
            </label>

            {error && (
              <div className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="sc-btn-primary w-full">
              {loading ? 'Signing in…' : (
                <>
                  Sign In
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-variant">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
              </svg>
              Secure Access
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-ink-variant mt-4">
          Authorized staff only.{' '}
          <Link to="/" className="text-primary font-semibold hover:underline">Back to home</Link>
        </p>
      </motion.div>
    </div>
  );
}
