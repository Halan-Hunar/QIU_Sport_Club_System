import { create } from 'zustand';

const API = import.meta.env.VITE_API_URL;

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        set({ error: data.error, loading: false });
        return false;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('refresh_token', data.refresh_token);
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch {
      set({ error: 'Connection failed. Is the server running?', loading: false });
      return false;
    }
  },

  logout: async () => {
    const token = localStorage.getItem('token');

    try {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // logout locally even if server call fails
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null });
  },

  // Silently refresh the access token using the refresh token
  refreshToken: async () => {
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) return false;

    try {
      const res = await fetch(`${API}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });

      if (!res.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        set({ user: null, token: null });
        return false;
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('refresh_token', data.refresh_token);
      set({ user: data.user, token: data.token });
      return true;
    } catch {
      return false;
    }
  },

  // Call this on app load to restore session
  fetchMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // Token expired — try to refresh silently
        const refreshed = await get().refreshToken();
        if (!refreshed) return;

        // Retry /me with the new token
        const newToken = localStorage.getItem('token');
        const retry = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
        if (!retry.ok) return;
        const user = await retry.json();
        set({ user, token: newToken });
        return;
      }

      if (!res.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        set({ user: null, token: null });
        return;
      }

      const user = await res.json();
      set({ user, token });
    } catch {
      // server unreachable, keep token for when it comes back
    }
  },
}));
