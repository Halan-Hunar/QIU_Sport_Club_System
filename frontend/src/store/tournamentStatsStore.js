import { create } from 'zustand';
import { apiFetch } from '../lib/api';

const API = import.meta.env.VITE_API_URL;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const useTournamentStatsStore = create((set, get) => ({
  data: null,
  loading: false,
  saving: false,
  error: null,

  fetch: async (tournamentId) => {
    set({ loading: true, error: null, data: null });
    try {
      const res = await apiFetch(`${API}/api/stats/tournament/${tournamentId}`);
      const body = await res.json();
      if (!res.ok) {
        set({ error: body.error || 'Failed to load tournament stats', loading: false });
        return;
      }
      set({ data: body, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  setBestPlayer: async (tournamentId, { name, teamId, teamName, teamColor }) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments/${tournamentId}/awards`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          best_player_name: name || null,
          best_player_team_id: teamId || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        set({ error: body.error || 'Failed to save best player', saving: false });
        return false;
      }
      // Patch local state so the card refreshes without a full refetch.
      const current = get().data;
      if (current) {
        const next = { ...current };
        if (name) {
          next.best_player = {
            player_name: name,
            player_id: null,
            team_id: teamId ?? null,
            team_name: teamName ?? null,
            team_color: teamColor ?? null,
          };
          if (!next.applicable.includes('best_player')) {
            next.applicable = [...next.applicable, 'best_player'];
          }
        } else {
          next.best_player = null;
        }
        set({ data: next, saving: false });
      } else {
        set({ saving: false });
      }
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  clear: () => set({ data: null, error: null }),
}));
