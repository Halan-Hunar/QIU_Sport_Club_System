import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, ChevronDown, LogOut, UserRound } from 'lucide-react';

export default function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null), trigger = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const outside = (e) => { if (!root.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  return <div className="relative" ref={root} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); trigger.current.focus(); } }}>
    <button ref={trigger} type="button" aria-expanded={open} aria-controls="profile-options" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full px-3 py-2 bg-surface-low text-ink focus-visible:outline focus-visible:outline-primary">
      <UserRound size={18} /><span className="hidden sm:inline text-sm max-w-28 truncate">{user.display_name || 'Profile'}</span><ChevronDown size={14} /><span className="sr-only">Profile options</span>
    </button>
    {open && <div id="profile-options" className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-white border border-outline-variant shadow-card p-2">
      <p className="px-3 py-2 text-xs text-ink-variant border-b border-outline-variant/40 mb-1">{user.display_name || 'Club account'}{user.role === 'admin' ? ' · Admin' : ''}</p>
      {user.role === 'admin' && <Link to="/admin/analytics" className="flex items-center gap-3 p-3 rounded-sm hover:bg-surface-low focus-visible:outline focus-visible:outline-primary"><BarChart3 size={18} />Analytics</Link>}
      <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-3 p-3 rounded-sm hover:bg-surface-low focus-visible:outline focus-visible:outline-primary"><LogOut size={18} />Log out</button>
    </div>}
  </div>;
}
