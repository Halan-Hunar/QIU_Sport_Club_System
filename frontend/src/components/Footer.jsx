import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant/40 bg-white mt-16">
      <div className="max-w-[1280px] mx-auto px-6 py-8
                      flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/club-logo.webp"
              alt=""
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
            />
            <span className="font-display text-lg text-primary tracking-wide">
              QIU Sports Club
            </span>
          </div>
          <p className="text-sm text-ink-variant mt-1">
            © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-variant">
          <a href="https://www.instagram.com/qiu_sportsclub/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>Follow us on Instagram</a>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </nav>
      </div>
    </footer>
  );
}
