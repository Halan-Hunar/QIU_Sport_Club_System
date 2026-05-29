import { create } from 'zustand';
import { apiFetch } from '../lib/api';

const API = import.meta.env.VITE_API_URL;

export const useTournamentStatsStore = create((set) => ({
  data: null,        // { tournament, applicable, champion, top_scorers, clean_sheets, most_wins }
  loading: false,
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

  clear: () => set({ data: null, error: null }),
}));
