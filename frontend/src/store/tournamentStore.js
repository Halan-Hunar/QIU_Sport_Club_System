import { create } from 'zustand';
import { apiFetch } from '../lib/api';

const API = import.meta.env.VITE_API_URL;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...authHeaders(),
});

export const useTournamentStore = create((set, get) => ({
  tournaments: [],
  current: null,          // { tournament, teams }
  loading: false,
  saving: false,
  error: null,

  // ─── Reads ──────────────────────────────────────────────────
  fetchTournaments: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load tournaments', loading: false });
        return;
      }
      set({ tournaments: data.tournaments, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  fetchTournamentById: async (id) => {
    set({ loading: true, error: null, current: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments/${id}`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load tournament', loading: false });
        return;
      }
      set({ current: data, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  // ─── Tournament writes ──────────────────────────────────────
  createTournament: async (payload) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to create tournament', saving: false });
        return null;
      }
      set((s) => ({
        tournaments: [{ ...data.tournament, team_count: 0 }, ...s.tournaments],
        saving: false,
      }));
      return data.tournament;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  updateTournament: async (id, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to update tournament', saving: false });
        return null;
      }
      set((s) => ({
        tournaments: s.tournaments.map((t) =>
          t.id === id ? { ...t, ...data.tournament } : t,
        ),
        current: s.current && s.current.tournament.id === id
          ? { ...s.current, tournament: data.tournament }
          : s.current,
        saving: false,
      }));
      return data.tournament;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  deleteTournament: async (id) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ error: data.error || 'Failed to delete tournament', saving: false });
        return false;
      }
      set((s) => ({
        tournaments: s.tournaments.filter((t) => t.id !== id),
        saving: false,
      }));
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  // ─── Team registration ─────────────────────────────────────
  registerTeam: async (tournamentId, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to register team', saving: false });
        return null;
      }
      set((s) => ({
        current: s.current && s.current.tournament.id === tournamentId
          ? { ...s.current, teams: [...s.current.teams, data.registration] }
          : s.current,
        tournaments: s.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, team_count: (t.team_count ?? 0) + 1 } : t,
        ),
        saving: false,
      }));
      return data.registration;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  unregisterTeam: async (tournamentId, teamId) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(
        `${API}/api/tournaments/${tournamentId}/teams/${teamId}`,
        { method: 'DELETE', headers: authHeaders() },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ error: data.error || 'Failed to unregister team', saving: false });
        return false;
      }
      const { current } = get();
      set({
        current: current && current.tournament.id === tournamentId
          ? { ...current, teams: current.teams.filter((r) => r.team.id !== teamId) }
          : current,
        tournaments: get().tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, team_count: Math.max(0, (t.team_count ?? 1) - 1) }
            : t,
        ),
        saving: false,
      });
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  // ─── Player registration (individual sport tournaments) ────
  registerPlayer: async (tournamentId, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments/${tournamentId}/players`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to register player', saving: false });
        return null;
      }
      set((s) => ({
        current: s.current && s.current.tournament.id === tournamentId
          ? {
              ...s.current,
              players: [...(s.current.players ?? []), data.registration],
            }
          : s.current,
        saving: false,
      }));
      return data.registration;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  unregisterPlayer: async (tournamentId, playerId) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(
        `${API}/api/tournaments/${tournamentId}/players/${playerId}`,
        { method: 'DELETE', headers: authHeaders() },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ error: data.error || 'Failed to unregister player', saving: false });
        return false;
      }
      const { current } = get();
      set({
        current: current && current.tournament.id === tournamentId
          ? {
              ...current,
              players: (current.players ?? []).filter((r) => r.player.id !== playerId),
            }
          : current,
        saving: false,
      });
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
