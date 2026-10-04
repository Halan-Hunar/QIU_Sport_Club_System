import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { CONSENT_EVENT, startView } from '../lib/analytics';

export function useTrackView(path, article = false) {
  const token = useAuthStore((s) => s.token);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const changed = () => setRevision((n) => n + 1);
    window.addEventListener(CONSENT_EVENT, changed);
    window.addEventListener('storage', changed);
    return () => { window.removeEventListener(CONSENT_EVENT, changed); window.removeEventListener('storage', changed); };
  }, []);
  useEffect(() => { if (path && !token) return startView(path, article); }, [path, article, token, revision]);
}
export default function AnalyticsTracker() {
  const { pathname } = useLocation();
  const path = ['/', '/events', '/news', '/club/heads', '/teams', '/tournaments', '/stats'].includes(pathname) ? pathname : null;
  useTrackView(path);
  return null;
}
