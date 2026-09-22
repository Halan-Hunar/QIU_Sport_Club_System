import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import { cachedPublicJson } from '../lib/publicCache';

let pending;
const load = (path) => cachedPublicJson(path, async () => {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error('Some home content could not be loaded. Please try again.');
  return response.json();
});
export const useHomeStore = create((set) => ({
  stats: null, upcoming: [], latestResults: [], champion: null, hasActive: null,
  loading: false, championLoading: false,
  sectionLoading: { stats: true, tournaments: true, results: true },
  error: null,
  fetchHomeData: () => {
    if (pending) return pending;
    set({ loading: true, championLoading: true, error: null,
      sectionLoading: { stats: true, tournaments: true, results: true } });
    const section = async (key, path, update) => {
      try { set(update(await load(path))); }
      catch (e) { set({ error: e.message }); }
      finally { set((state) => ({ sectionLoading: { ...state.sectionLoading, [key]: false } })); }
    };
    pending = Promise.allSettled([
      section('stats', '/api/match-events/stats', (stats) => ({ stats })),
      section('tournaments', '/api/tournaments', (data) => ({ hasActive: (data.tournaments ?? []).some((t) => t.status === 'active'), upcoming: (data.tournaments ?? [])
        .filter((t) => ['active', 'upcoming'].includes(t.status)).slice(0, 4) })),
      section('results', '/api/matches?status=completed&limit=3', (data) => ({ latestResults: data.matches ?? [] })),
      load('/api/stats/latest-champion').then((data) => set({ champion: data.champion }))
        .catch(() => set({ champion: null })).finally(() => set({ championLoading: false })),
    ]).finally(() => { pending = null; set({ loading: false }); });
    return pending;
  },
}));
