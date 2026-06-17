import { create } from 'zustand';
import { apiFetch } from '../lib/api';

const API = import.meta.env.VITE_API_URL;

export const useHomeStore = create((set) => ({
  // /api/match-events/stats now includes featured_tournament alongside totals.
  stats: null,
  upcoming: [],          // up to 4 upcoming/active tournaments
  latestResults: [],     // up to 3 most-recently-completed matches
  loading: false,
  error: null,

  fetchHomeData: async () => {
    set({ loading: true, error: null });
    try {
      const [statsRes, tournamentsRes, latestRes] = await Promise.all([
        apiFetch(`${API}/api/match-events/stats`),
        apiFetch(`${API}/api/tournaments`),
        apiFetch(`${API}/api/matches?status=completed&limit=3`),
      ]);
      const statsData = await statsRes.json();
      const tournamentsData = await tournamentsRes.json();
      const latestData = latestRes.ok ? await latestRes.json() : { matches: [] };

      if (!statsRes.ok) {
        set({ error: statsData.error || 'Failed to load stats', loading: false });
        return;
      }
      if (!tournamentsRes.ok) {
        set({ error: tournamentsData.error || 'Failed to load tournaments', loading: false });
        return;
      }

      const upcoming = (tournamentsData.tournaments ?? [])
        .filter((t) => t.status === 'active' || t.status === 'upcoming')
        .slice(0, 4);

      set({
        stats: statsData,
        upcoming,
        latestResults: latestData.matches ?? [],
        loading: false,
      });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },
}));
