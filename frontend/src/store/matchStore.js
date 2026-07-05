// Realtime updates require the matches table to be in Supabase's publication.
// Run once in the SQL editor (idempotent, errors if already added):
//   alter publication supabase_realtime add table public.matches;
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
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

export const useMatchStore = create((set, get) => ({
  matches: [],
  standings: [],
  tournamentId: null,
  channel: null,
  loading: false,
  saving: false,
  error: null,

  // ─── Reads ──────────────────────────────────────────────────
  fetchMatches: async (tournamentId) => {
    set({ loading: true, error: null, tournamentId });
    try {
      const res = await apiFetch(`${API}/api/matches?tournament_id=${tournamentId}`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load matches', loading: false });
        return;
      }
      set({ matches: data.matches, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  fetchStandings: async (tournamentId) => {
    try {
      const res = await apiFetch(`${API}/api/matches/standings?tournament_id=${tournamentId}`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load standings' });
        return;
      }
      set({ standings: data.standings });
    } catch {
      set({ error: 'Connection failed.' });
    }
  },

  // ─── Writes ─────────────────────────────────────────────────
  generateBracket: async (tournamentId) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/matches/generate`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ tournament_id: tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to generate bracket', saving: false });
        return false;
      }
      set({ saving: false });
      await get().fetchMatches(tournamentId);
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  advanceGroups: async (tournamentId) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/tournaments/${tournamentId}/advance-groups`, {
        method: 'POST',
        headers: jsonHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to advance groups', saving: false });
        return false;
      }
      set({ saving: false });
      await get().fetchMatches(tournamentId);
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  updateMatch: async (matchId, payload) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to update match', saving: false });
        return null;
      }
      set((s) => ({
        matches: s.matches.map((m) =>
          m.id === matchId ? { ...m, ...data.match } : m,
        ),
        saving: false,
      }));
      return data.match;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  // ─── Realtime ──────────────────────────────────────────────
  subscribeToMatches: (tournamentId) => {
    const existing = get().channel;
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`matches:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          const { matches } = get();
          if (payload.eventType === 'INSERT') {
            // Realtime payload doesn't include joined team data — refetch to hydrate.
            get().fetchMatches(tournamentId);
          } else if (payload.eventType === 'UPDATE') {
            // Merge column updates while preserving existing joined team objects.
            set({
              matches: matches.map((m) =>
                m.id === payload.new.id ? { ...m, ...payload.new } : m,
              ),
            });
          } else if (payload.eventType === 'DELETE') {
            set({ matches: matches.filter((m) => m.id !== payload.old.id) });
          }
        },
      )
      .subscribe();

    set({ channel });
  },

  unsubscribe: () => {
    const channel = get().channel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ channel: null });
    }
  },

  // Used by eventStore.logEvent to apply the score returned by the backend,
  // so the scoreboard reflects a logged goal immediately even when realtime is
  // delayed (or the publication isn't wired yet). This SETS absolute scores
  // rather than incrementing, so if a realtime UPDATE for the same row also
  // lands, the goal is never counted twice.
  setScore: (matchId, { home_score, away_score }) => {
    set((s) => ({
      matches: s.matches.map((m) =>
        m.id === matchId ? { ...m, home_score, away_score } : m,
      ),
    }));
  },

  clearError: () => set({ error: null }),
}));
