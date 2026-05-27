import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useMatchStore } from './matchStore';
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

export const useEventStore = create((set, get) => ({
  events: [],
  matchId: null,
  channel: null,
  loading: false,
  saving: false,
  error: null,

  fetchEvents: async (matchId) => {
    set({ loading: true, error: null, matchId });
    try {
      const res = await apiFetch(`${API}/api/match-events?match_id=${matchId}`);
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to load events', loading: false });
        return;
      }
      set({ events: data.events, loading: false });
    } catch {
      set({ error: 'Connection failed.', loading: false });
    }
  },

  logEvent: async (payload) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/match-events`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ error: data.error || 'Failed to log event', saving: false });
        return null;
      }
      set((s) => ({
        events: [...s.events, data.event],
        saving: false,
      }));

      // Mirror the backend's score bump so the scoreboard updates instantly.
      // For 'goal' the team_id team scores; for 'own_goal' the opponent does.
      const { event_type, team_id, match_id } = payload;
      if ((event_type === 'goal' || event_type === 'own_goal') && team_id && match_id) {
        const matches = useMatchStore.getState().matches;
        const match = matches.find((m) => m.id === match_id);
        if (match) {
          const scoringTeamId = event_type === 'goal'
            ? team_id
            : (team_id === match.home_team_id ? match.away_team_id : match.home_team_id);
          useMatchStore.getState().bumpScore(match_id, scoringTeamId);
        }
      }

      return data.event;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return null;
    }
  },

  deleteEvent: async (eventId) => {
    set({ saving: true, error: null });
    try {
      const res = await apiFetch(`${API}/api/match-events/${eventId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        set({ error: data.error || 'Failed to delete event', saving: false });
        return false;
      }
      set((s) => ({
        events: s.events.filter((e) => e.id !== eventId),
        saving: false,
      }));
      return true;
    } catch {
      set({ error: 'Connection failed.', saving: false });
      return false;
    }
  },

  // ─── Realtime ──────────────────────────────────────────────
  subscribeToEvents: (matchId) => {
    const existing = get().channel;
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`match-events:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Refetch for joined player/team data not present in payload
            get().fetchEvents(matchId);
          } else if (payload.eventType === 'DELETE') {
            set((s) => ({ events: s.events.filter((e) => e.id !== payload.old.id) }));
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

  clearError: () => set({ error: null }),
}));
