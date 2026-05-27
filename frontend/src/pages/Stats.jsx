import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Trophy, Calendar, Users } from 'lucide-react';
import { useTournamentStore } from '../store/tournamentStore';
import { sportLabel } from '../constants/sports';

const formatShort = {
  single_elim:    'Single Elim',
  double_elim:    'Double Elim',
  round_robin:    'Round Robin',
  group_knockout: 'Groups + Knockout',
};

const statusStyles = {
  upcoming:  'bg-secondary-container/50 text-secondary',
  active:    'bg-primary-container/30 text-primary',
  completed: 'bg-surface-low text-ink-variant',
};

function formatDateRange(start, end) {
  if (!start && !end) return 'Dates TBD';
  const opts = { month: 'short', day: 'numeric' };
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, opts);
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt(start || end);
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5 h-44
                    animate-pulse" />
  );
}

function StatsCard({ t }) {
  return (
    <Link
      to={`/tournaments/${t.id}/stats`}
      className="group bg-white rounded-md border border-outline-variant/30 shadow-card
                 hover:shadow-card-hover transition-all p-5 flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-low text-primary
                        flex items-center justify-center">
          <Trophy size={18} strokeWidth={2} aria-hidden />
        </div>
        <span className={`sc-chip capitalize ${statusStyles[t.status] ?? statusStyles.upcoming}`}>
          {t.status}
        </span>
      </div>

      <h3 className="font-display text-headline-md text-ink leading-snug mt-3
                     group-hover:text-primary transition-colors">
        {t.name}
      </h3>

      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className="sc-chip bg-surface-low text-ink-variant">
          {sportLabel(t.sport_type)}
        </span>
        <span className="sc-chip bg-surface-low text-ink-variant">
          {formatShort[t.format] ?? t.format}
        </span>
        {t.is_individual && (
          <span className="sc-chip bg-tertiary-container/40 text-tertiary">
            Individual
          </span>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-outline-variant/30 flex items-center
                      gap-4 text-xs text-ink-variant">
        <span className="flex items-center gap-1.5">
          <Calendar size={12} strokeWidth={2} aria-hidden />
          {formatDateRange(t.start_date, t.end_date)}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={12} strokeWidth={2} aria-hidden />
          {t.team_count ?? 0}
        </span>
      </div>
    </Link>
  );
}

export default function Stats() {
  const { tournaments, loading, error, fetchTournaments } = useTournamentStore();
  const [query, setQuery] = useState('');

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  const filtered = useMemo(() => {
    if (!query.trim()) return tournaments;
    const q = query.toLowerCase();
    return tournaments.filter((t) => t.name.toLowerCase().includes(q));
  }, [tournaments, query]);

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg sm:text-display-lg text-ink leading-tight">
            Statistics
          </h1>
          <p className="text-ink-variant mt-2 max-w-xl">
            Pick a tournament to see its leaderboards, champion, and auto-computed awards.
          </p>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-variant">
            <Search size={18} strokeWidth={2} aria-hidden />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tournaments..."
            className="sc-input pl-10 !py-2.5 min-w-[240px]"
          />
        </div>
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-md border border-dashed border-outline-variant
                        py-16 px-6 text-center">
          <p className="font-display text-headline-md text-ink">
            {query ? 'No tournaments match your search.' : 'No tournaments yet.'}
          </p>
          {!query && (
            <p className="text-ink-variant mt-2">
              Create one in the Tournaments page to see stats here.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => <StatsCard key={t.id} t={t} />)}
        </div>
      )}
    </motion.div>
  );
}
