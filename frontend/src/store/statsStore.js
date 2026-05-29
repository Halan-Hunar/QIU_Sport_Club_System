import { create } from 'zustand';
import { apiFetch } from '../lib/api';

const API = import.meta.env.VITE_API_URL;

export const useStatsStore = create((set) => ({
  totals: null,
  topScorers: [],
  mostWins: [],
  recentResults: [],
  recentActivity: [],
  loading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/stats`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load stats', loading: false });
        return;
      }
      set({
        totals: data.totals,
        topScorers: data.top_scorers ?? [],
        mostWins: data.most_wins ?? [],
        recentResults: data.recent_results ?? [],
        recentActivity: data.recent_activity ?? [],
        loading: false,
      });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },
}));
