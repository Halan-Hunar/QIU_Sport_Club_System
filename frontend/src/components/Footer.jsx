import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant/40 bg-white mt-16">
      <div className="max-w-[1280px] mx-auto px-6 py-8
                      flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg text-primary tracking-wide">Sport Club</p>
          <p className="text-sm text-ink-variant mt-0.5">
            © {new Date().getFullYear()} Sport Club. All rights reserved.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-variant">
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
        </nav>
      </div>
    </footer>
  );
}
