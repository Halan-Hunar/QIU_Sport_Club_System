import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const PUBLIC_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/stats', label: 'Stats' },
];

// Visible only once the user is logged in (any role) — these routes require
// auth, so showing the link to a logged-out visitor would just bounce them.
const AUTH_ONLY_LINKS = [
  { to: '/teams', label: 'Teams' },
  { to: '/players', label: 'Players' },
];

function getVisibleLinks(isLoggedIn) {
  if (!isLoggedIn) return PUBLIC_LINKS;
  // Keep the same nav order: Home, Tournaments, Teams, Players, Stats.
  return [
    PUBLIC_LINKS[0],
    PUBLIC_LINKS[1],
    AUTH_ONLY_LINKS[0],
    AUTH_ONLY_LINKS[1],
    PUBLIC_LINKS[2],
  ];
}

function NavItem({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative font-label font-semibold uppercase tracking-wider text-sm
         px-1 py-1 transition-colors
         ${isActive ? 'text-primary' : 'text-ink-variant hover:text-primary'}`
      }
    >
      {({ isActive }) => (
        <>
          {label}
          {isActive && (
            <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-primary-container rounded-full" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isLoggedIn = !!(token && user);
  const links = getVisibleLinks(isLoggedIn);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-outline-variant/40">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="group"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <img
            src="/export-assets/logo/QIU-Sports-Club-Logo.png"
            alt=""
            style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
          />
          <span className="font-display text-xl text-primary tracking-wide hidden sm:inline">
            Sport Club
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => <NavItem key={l.to} {...l} />)}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {token && user ? (
            <div className="hidden sm:flex items-center gap-3">
              {user.role === 'admin' && (
                <span className="sc-chip-primary">Admin</span>
              )}
              <span className="text-sm text-ink-variant hidden lg:inline">{user.email}</span>
              <button onClick={handleLogout} className="sc-btn-ghost">Logout</button>
            </div>
          ) : (
            <Link to="/login" className="sc-btn-primary !py-2 !px-5">Login</Link>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden p-2 rounded-full hover:bg-surface-low transition-colors"
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                : <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-outline-variant/40 bg-white">
          <nav className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `font-label font-semibold uppercase tracking-wider text-sm py-2
                   ${isActive ? 'text-primary' : 'text-ink-variant'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {token && user && (
              <button onClick={handleLogout} className="sc-btn-ghost self-start">
                Logout ({user.email})
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
