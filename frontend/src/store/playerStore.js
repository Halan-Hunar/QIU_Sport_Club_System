import { create } from 'zustand';

const API = import.meta.env.VITE_API_URL;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...authHeaders(),
});

export const usePlayerStore = create((set, get) => ({
  players: [],          // current list (filtered by whatever was last fetched)
  detail: null,         // { player, stats }
  loading: false,
  saving: false,
  error: null,

  // ─── Reads ──────────────────────────────────────────────────
  fetchPlayers: async ({ standalone = false, teamId = null, sport = null } = {}) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (standalone) params.set('standalone', 'true');
      if (teamId)     params.set('team_id', teamId);
      if (sport)      params.set('sport', sport);
      const url = `${API}/api/players${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load players', loading: false });
        return;
      }
      set({ players: data.players, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  fetchPlayerDetail: async (id) => {
    set({ loading: true, error: null, detail: null });
    try {
      const res = await fetch(`${API}/api/players/${id}`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load player', loading: false });
        return;
      }
      set({ detail: data, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  // ─── Writes ─────────────────────────────────────────────────
  createPlayer: async (payload) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/players`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to create player', saving: false });
        return null;
      }
      set((s) => ({ players: [data.player, ...s.players], saving: false }));
      return data.player;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  updatePlayer: async (id, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/players/${id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to update player', saving: false });
        return null;
      }
      set((s) => ({
        players: s.players.map((p) => (p.id === id ? { ...p, ...data.player } : p)),
        detail: s.detail && s.detail.player.id === id
          ? { ...s.detail, player: { ...s.detail.player, ...data.player } }
          : s.detail,
        saving: false,
      }));
      return data.player;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  deletePlayer: async (id) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/players/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ error: data.error || 'Failed to delete player', saving: false });
        return false;
      }
      set((s) => ({
        players: s.players.filter((p) => p.id !== id),
        saving: false,
      }));
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  clearDetail: () => set({ detail: null }),
  clearError: () => set({ error: null }),
}));
