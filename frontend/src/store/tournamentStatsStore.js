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

  // Set (or clear) a manual individual award. `awardKey` is one of
  // 'best_player' | 'best_defender' | 'best_playmaker' | 'best_goalkeeper'.
  setAward: async (tournamentId, awardKey, { name, teamId, teamName, teamColor }) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments/${tournamentId}/awards`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          [`${awardKey}_name`]: name || null,
          [`${awardKey}_team_id`]: teamId || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        set({ error: body.error || 'Failed to save award', saving: false });
        return false;
      }
      // Patch local state so the card refreshes without a full refetch.
      const current = get().data;
      if (current) {
        const next = { ...current };
        if (name) {
          next[awardKey] = {
            player_name: name,
            player_id: null,
            team_id: teamId ?? null,
            team_name: teamName ?? null,
            team_color: teamColor ?? null,
          };
          if (!next.applicable.includes(awardKey)) {
            next.applicable = [...next.applicable, awardKey];
          }
        } else {
          next[awardKey] = null;
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

  // Permanently end a tournament (status → completed, stamps ended_at).
  endTournament: async (tournamentId) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments/${tournamentId}/end`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) {
        set({ error: body.error || 'Failed to end tournament', saving: false });
        return false;
      }
      const current = get().data;
      if (current?.tournament) {
        set({
          data: { ...current, tournament: { ...current.tournament, ...body.tournament } },
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

  clear: () => set({ data: null, error: null }),
}));
