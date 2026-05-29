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

export const useAwardStore = create((set) => ({
  awards: [],
  topScorers: [],
  loading: false,
  saving: false,
  error: null,

  fetchAwards: async (tournamentId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/api/awards?tournament_id=${tournamentId}`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load awards', loading: false });
        return;
      }
      set({ awards: data.awards, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  fetchTopScorers: async (tournamentId) => {
    try {
      const res = await fetch(
        `${API}/api/awards/top-scorers?tournament_id=${tournamentId}`,
      );
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load top scorers' });
        return;
      }
      set({ topScorers: data.scorers });
    } catch {
      set({ error: 'Connection failed.' });
    }
  },

  saveAward: async (payload) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/awards`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to save award', saving: false });
        return null;
      }
      set((s) => ({
        // Replace any existing award of the same type (server already deletes it)
        awards: [
          ...s.awards.filter((a) => a.award_type !== data.award.award_type),
          data.award,
        ],
        saving: false,
      }));
      return data.award;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  deleteAward: async (id) => {
    set({ saving: true, error: null });
    try {
      const res = await fetch(`${API}/api/awards/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ error: data.error || 'Failed to delete award', saving: false });
        return false;
      }
      set((s) => ({
        awards: s.awards.filter((a) => a.id !== id),
        saving: false,
      }));
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
