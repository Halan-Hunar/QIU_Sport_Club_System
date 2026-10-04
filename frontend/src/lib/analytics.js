export const CONSENT_KEY = 'qiu-analytics-consent-v1';
export const CONSENT_EVENT = 'qiu-analytics-consent';
export function consentChoice() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return 'denied'; }
}
export function setAnalyticsConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
    if (value !== 'granted') sessionStorage.removeItem('qiu-visit');
  } catch { /* Storage restrictions must never break browsing. */ }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}
export function trackingAllowed() {
  try { return consentChoice() === 'granted' && navigator.doNotTrack !== '1' && !navigator.globalPrivacyControl && !localStorage.getItem('token'); }
  catch { return false; }
}
export function trafficSource(referrer, origin) {
  try {
    const url = new URL(referrer);
    if (url.origin === origin) return 'Direct / unknown';
    const host = url.hostname.toLowerCase();
    if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'Google';
    for (const [domain, name] of [['instagram.com','Instagram'],['facebook.com','Facebook'],['bing.com','Bing']]) {
      if (host === domain || host.endsWith(`.${domain}`)) return name;
    }
    return 'Other websites';
  } catch { return 'Direct / unknown'; }
}
function visit() {
  const now = Date.now();
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem('qiu-visit')); } catch { /* new visit */ }
  if (!saved?.id || now - saved.last > 30 * 60000) saved = { id: crypto.randomUUID(), source: trafficSource(document.referrer, location.origin) };
  saved.last = now;
  sessionStorage.setItem('qiu-visit', JSON.stringify(saved));
  return saved;
}
export function startView(path, article = false) {
  if (!trackingAllowed()) return () => {};
  let session;
  try { session = visit(); } catch { return () => {}; }
  const agent = navigator.userAgent;
  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1) ? 'Tablet' : /Mobi/i.test(agent) ? 'Mobile' : 'Desktop';
  const event = { event_id: crypto.randomUUID(), session_id: session.id, path, source: session.source, device, active_seconds: 0, scroll_depth: 0 };
  let activeMs = 0, lastTick = performance.now(), lastInput = Date.now(), stopped = false, sent = false;
  const started = performance.now();
  const input = () => { lastInput = Date.now(); };
  const tick = () => {
    const now = performance.now();
    if (document.visibilityState === 'visible' && document.hasFocus() && Date.now() - lastInput < 60000) {
      activeMs += Math.min(now - lastTick, 15000);
      try { const saved = JSON.parse(sessionStorage.getItem('qiu-visit')); if (saved?.id === session.id) sessionStorage.setItem('qiu-visit', JSON.stringify({ ...saved, last: Date.now() })); } catch { /* ignore */ }
    }
    lastTick = now;
    event.active_seconds = Math.min(1800, Math.floor(activeMs / 1000));
    const element = article && document.querySelector('[data-analytics-article]');
    if (element && document.visibilityState === 'visible') {
      const rect = element.getBoundingClientRect();
      event.scroll_depth = Math.max(event.scroll_depth, Math.min(100, Math.max(0, Math.round((window.innerHeight - rect.top) / Math.max(rect.height, 1) * 100))));
    }
  };
  const send = () => {
    if (stopped || !trackingAllowed()) return;
    tick(); sent = true;
    // No token, raw referrer, query string, IP, user-agent, or external analytics tag.
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/analytics/collect`, { method: 'POST', credentials: 'omit', keepalive: true,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event) }).catch(() => {});
  };
  const visibility = () => { send(); lastTick = performance.now(); };
  const timer = setInterval(send, 15000);
  const first = setTimeout(send, 250);
  ['pointerdown', 'keydown', 'scroll'].forEach((type) => window.addEventListener(type, input, { passive: true }));
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', send);
  return () => {
    clearTimeout(first); clearInterval(timer);
    if (sent || performance.now() - started >= 250) send();
    stopped = true;
    ['pointerdown', 'keydown', 'scroll'].forEach((type) => window.removeEventListener(type, input));
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', send);
  };
}
