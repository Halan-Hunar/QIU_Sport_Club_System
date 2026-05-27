// Shared fetch wrapper used by every Zustand store.
//
// Why this exists: Supabase access tokens expire after ~1 hour. The first
// failed write after that timeout shows up as "Invalid or expired token" in
// the UI, which looks like rate limiting but is actually the JWT being stale.
//
// apiFetch transparently refreshes the token (using the refresh_token we
// already stored on login) and retries the original request once. If refresh
// itself fails, the user is logged out via authStore.refreshToken and the
// caller sees the 401 — at which point ProtectedRoute will bounce them.
import { useAuthStore } from '../store/authStore';

const API = import.meta.env.VITE_API_URL;

function buildHeaders(init) {
  const token = localStorage.getItem('token');
  const headers = { ...(init.headers || {}) };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (init.body && typeof init.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

// Guard against multiple concurrent 401s all kicking off their own refresh.
// The first one wins; everyone else awaits the same promise.
let inflightRefresh = null;
async function refreshOnce() {
  if (!inflightRefresh) {
    inflightRefresh = useAuthStore.getState().refreshToken()
      .finally(() => { inflightRefresh = null; });
  }
  return inflightRefresh;
}

export async function apiFetch(path, init = {}) {
  const url = path.startsWith('http') ? path : `${API}${path}`;

  let res = await fetch(url, { ...init, headers: buildHeaders(init) });

  // Don't bother trying to refresh for the auth endpoints themselves.
  const isAuthEndpoint = url.includes('/api/auth/');

  if (res.status === 401 && !isAuthEndpoint && localStorage.getItem('refresh_token')) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      res = await fetch(url, { ...init, headers: buildHeaders(init) });
    }
  }

  return res;
}
