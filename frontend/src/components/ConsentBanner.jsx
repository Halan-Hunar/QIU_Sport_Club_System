import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { consentChoice, setAnalyticsConsent, CONSENT_EVENT } from '../lib/analytics';

export default function ConsentBanner() {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(() => !consentChoice());
  useEffect(() => {
    const open = () => setVisible(true);
    const update = () => setVisible(!consentChoice());
    window.addEventListener('qiu-privacy-settings', open);
    window.addEventListener(CONSENT_EVENT, update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('qiu-privacy-settings', open); window.removeEventListener(CONSENT_EVENT, update); window.removeEventListener('storage', update); };
  }, []);
  if (!visible || user || pathname === '/login') return null;
  const choose = (value) => { setAnalyticsConsent(value); setVisible(false); };
  return <aside className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-outline-variant shadow-lg" aria-label="Optional analytics">
    <div className="max-w-[1280px] mx-auto p-5 flex flex-col md:flex-row md:items-center gap-5 justify-between">
      <div className="max-w-2xl"><h2 className="font-semibold text-ink">Help us understand what the club enjoys</h2>
        <p className="text-sm text-ink-variant mt-1">Allow optional visit counts and reading engagement? You can browse normally if you decline, and change your choice in Privacy settings. <Link to="/privacy" className="underline text-primary">Privacy policy</Link></p></div>
      <div className="flex flex-wrap gap-3 shrink-0"><button className="sc-btn-secondary" onClick={() => choose('denied')}>Decline analytics</button><button className="sc-btn-primary" onClick={() => choose('granted')}>Allow analytics</button></div>
    </div>
  </aside>;
}
