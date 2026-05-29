import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

export default function ConsentBanner() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('consent') === 'accepted') {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, []);

  if (user) return null;
  if (location.pathname === '/declined' || location.pathname === '/login') return null;

  const accept = () => {
    localStorage.setItem('consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    setVisible(false);
    navigate('/declined', { replace: true });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, delay: 1 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white
                     border-t border-outline-variant/40 shadow-lg"
          role="region"
          aria-label="Consent notice"
        >
          <div className="max-w-[1280px] mx-auto px-6 py-4
                          flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-sm text-ink-variant leading-relaxed max-w-3xl">
              By continuing to use Sport Club, you agree to our{' '}
              <Link to="/privacy" className="text-primary underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="text-primary underline">
                Terms of Service
              </Link>
              , and acknowledge that all tournament data is publicly accessible.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={decline}
                className="sc-btn-secondary !py-2 !px-4"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={accept}
                className="sc-btn-primary !py-2 !px-4"
              >
                I Agree
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
