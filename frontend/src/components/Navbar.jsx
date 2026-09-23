import { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Teams is now public (visitor-readable, non-clickable cards) so it lives in
// the public list. Players still requires auth.
const PUBLIC_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/club', label: 'The Club', club: true },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/teams', label: 'Teams' },
  { to: '/stats', label: 'Stats' },
];
function getVisibleLinks(isLoggedIn) {
  return isLoggedIn
    ? [...PUBLIC_LINKS.slice(0, 4), { to: '/players', label: 'Players' }, PUBLIC_LINKS[4]]
    : PUBLIC_LINKS;
}

function ClubMenu({ mobile = false, closeMenu = () => {} }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const active = /^\/(events|news|club|admin\/(heads|events))/.test(location.pathname);
  return <div className={mobile ? "relative" : "h-16 flex items-center"} onMouseEnter={() => { if (!mobile) setOpen(true); }} onMouseLeave={() => { if (!mobile) setOpen(false); }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); e.currentTarget.querySelector('button').focus(); } }}>
    <button type="button" aria-expanded={open} aria-controls={mobile ? 'club-mobile-links' : 'club-desktop-links'} onClick={(e) => setOpen((previous) => !mobile && e.detail > 0 ? true : !previous)} className={`font-label font-semibold uppercase tracking-wider text-sm py-2 flex items-center gap-2 ${active ? 'text-primary' : 'text-ink-variant'}`}>
      The Club <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    <div id={mobile ? 'club-mobile-links' : 'club-desktop-links'} className={`club-dropdown ${mobile ? 'club-dropdown-mobile' : 'club-dropdown-desktop'} ${open ? 'is-open' : ''}`} inert={open ? undefined : ''}>
      <div className="club-dropdown-inner">
        {[{ to: '/events', label: 'Events', description: 'Club stories, activities, and highlights.' }, { to: '/club/heads', label: 'Heads of the Club', description: 'Meet our current and former club heads.' }].map((link) => <NavLink key={link.to} to={link.to} onClick={() => { setOpen(false); closeMenu(); }} className={({ isActive }) => `club-dropdown-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isActive ? 'text-primary' : 'text-ink'}`}><span className="club-dropdown-title">{link.label}</span><span className="club-dropdown-description">{link.description}</span></NavLink>)}
      </div>
    </div>
  </div>;
}

function NavItem({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative font-label font-semibold uppercase tracking-wider text-sm whitespace-nowrap
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
          className="group shrink-0"
          aria-label="QIU Sports Club home"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <img
            src="/club-logo.webp"
            alt=""
            style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
          />
          <span className="font-display text-lg text-primary tracking-wide hidden sm:inline whitespace-nowrap">
            QIU Sports Club
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden xl:flex items-center gap-5">
          {links.map((l) => l.club ? <ClubMenu key={l.to} /> : <NavItem key={l.to} {...l} />)}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {token && user ? (
            <div className="hidden xl:flex items-center gap-2">
              {user.role === 'admin' && (
                <span className="sc-chip-primary">Admin</span>
              )}
              <span className="text-sm text-ink-variant max-w-32 truncate">{user.display_name || 'Club admin'}</span>
              <button onClick={handleLogout} className="sc-btn-ghost">Logout</button>
            </div>
          ) : null}

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="xl:hidden p-2 rounded-full hover:bg-surface-low transition-colors"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
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
        <div className="xl:hidden border-t border-outline-variant/40 bg-white">
          <nav className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => l.club ? <ClubMenu key={l.to} mobile closeMenu={() => setMenuOpen(false)} /> : (
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
                Logout ({user.display_name || 'Club admin'})
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
