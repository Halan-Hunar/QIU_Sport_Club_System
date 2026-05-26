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

export const useTeamStore = create((set, get) => ({
  teams: [],
  current: null,          // { team, players, captains }
  loading: false,
  saving: false,
  error: null,

  // ─── Reads ──────────────────────────────────────────────────
  fetchTeams: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/teams`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load teams', loading: false });
        return;
      }
      set({ teams: data.teams, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  fetchTeamById: async (id) => {
    set({ loading: true, error: null, current: null });
    try {
      const res = await fetch(`${API}/api/teams/${id}`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load team', loading: false });
        return;
      }
      set({ current: data, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  // ─── Team writes ────────────────────────────────────────────
  createTeam: async (payload) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/teams`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to create team', saving: false });
        return null;
      }
      set((s) => ({
        teams: [{ ...data.team, player_count: 0 }, ...s.teams],
        saving: false,
      }));
      return data.team;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  updateTeam: async (id, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/teams/${id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to update team', saving: false });
        return null;
      }
      set((s) => ({
        teams: s.teams.map((t) =>
          t.id === id ? { ...t, ...data.team } : t,
        ),
        current: s.current && s.current.team.id === id
          ? { ...s.current, team: data.team }
          : s.current,
        saving: false,
      }));
      return data.team;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  deleteTeam: async (id) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/teams/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ error: data.error || 'Failed to delete team', saving: false });
        return false;
      }
      set((s) => ({
        teams: s.teams.filter((t) => t.id !== id),
        saving: false,
      }));
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  // ─── Player writes ──────────────────────────────────────────
  addPlayer: async (teamId, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/teams/${teamId}/players`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to add player', saving: false });
        return null;
      }
      set((s) => ({
        current: s.current && s.current.team.id === teamId
          ? { ...s.current, players: [...s.current.players, data.player] }
          : s.current,
        teams: s.teams.map((t) =>
          t.id === teamId ? { ...t, player_count: (t.player_count ?? 0) + 1 } : t,
        ),
        saving: false,
      }));
      return data.player;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  updatePlayer: async (playerId, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/players/${playerId}`, {
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
        current: s.current
          ? {
              ...s.current,
              players: s.current.players.map((p) =>
                p.id === playerId ? { ...p, ...data.player } : p,
              ),
            }
          : s.current,
        saving: false,
      }));
      return data.player;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  deletePlayer: async (playerId) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/players/${playerId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ error: data.error || 'Failed to delete player', saving: false });
        return false;
      }
      set((s) => {
        if (!s.current) return { saving: false };
        const teamId = s.current.team.id;
        return {
          current: {
            ...s.current,
            players: s.current.players.filter((p) => p.id !== playerId),
            captains: s.current.captains.filter((c) => c.player_id !== playerId),
          },
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, player_count: Math.max(0, (t.player_count ?? 1) - 1) }
              : t,
          ),
          saving: false,
        };
      });
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  setCaptain: async (teamId, playerId, tournamentId = null) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/teams/${teamId}/captain`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify({ player_id: playerId, tournament_id: tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to set captain', saving: false });
        return false;
      }
      const { current } = get();
      if (current && current.team.id === teamId) {
        const others = current.captains.filter(
          (c) => (c.tournament_id ?? null) !== (tournamentId ?? null),
        );
        set({
          current: { ...current, captains: [...others, data.captain] },
          saving: false,
        });
      } else {
        set({ saving: false });
      }
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
