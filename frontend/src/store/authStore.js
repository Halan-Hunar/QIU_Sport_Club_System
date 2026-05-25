import { create } from 'zustand';

const API = import.meta.env.VITE_API_URL;

export const useAuthStore = create((set) => ({
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
    set({ user: null, token: null });
  },

  // Call this on app load to restore session
  fetchMe: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        localStorage.removeItem('token');
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
