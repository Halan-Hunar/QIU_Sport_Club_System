import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useTournamentStore } from '../store/tournamentStore';
import CreateTournamentModal from '../components/CreateTournamentModal';

const formatLabels = {
  single_elim:    'Single Elim',
  double_elim:    'Double Elim',
  round_robin:    'Round Robin',
  group_knockout: 'Group + Knockout',
};

const statusStyles = {
  upcoming:  'bg-secondary-container/50 text-secondary',
  active:    'bg-primary-container/30 text-primary',
  completed: 'bg-surface-low text-ink-variant',
};

function formatDateRange(start, end) {
  if (!start && !end) return 'Dates TBD';
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, opts);
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt(start || end);
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-5 bg-surface-low rounded w-2/3" />
        <div className="h-5 bg-surface-low rounded w-16" />
      </div>
      <div className="mt-4 h-3 bg-surface-low rounded w-1/2" />
      <div className="mt-2 h-3 bg-surface-low rounded w-2/3" />
      <div className="mt-5 pt-4 border-t border-outline-variant/30 h-4 bg-surface-low rounded w-1/3" />
    </div>
  );
}

function TournamentCard({ t }) {
  return (
    <Link
      to={`/tournaments/${t.id}`}
      className="group bg-white rounded-md border border-outline-variant/30 shadow-card
                 hover:shadow-card-hover transition-all p-5 flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-headline-md text-ink group-hover:text-primary
                       transition-colors leading-snug">
          {t.name}
        </h3>
        <span className={`sc-chip ${statusStyles[t.status] ?? statusStyles.upcoming}`}>
          {t.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="sc-chip bg-surface-low text-ink-variant">
          {t.sport_type[0].toUpperCase() + t.sport_type.slice(1)}
        </span>
        <span className="sc-chip bg-surface-low text-ink-variant">
          {formatLabels[t.format] ?? t.format}
        </span>
      </div>

      <p className="text-sm text-ink-variant mt-4">
        {formatDateRange(t.start_date, t.end_date)}
      </p>

      <div className="mt-4 pt-4 border-t border-outline-variant/30 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" className="text-ink-variant">
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M2 20c1-3 3.5-4.5 7-4.5s6 1.5 7 4.5M14 20c.5-2 2-3 4-3s3.5 1 4 3" />
        </svg>
        <span className="font-label text-label-md uppercase tracking-wider text-ink-variant">
          {t.team_count} {t.team_count === 1 ? 'Team' : 'Teams'}
        </span>
        <span className="ml-auto text-primary group-hover:translate-x-1 transition-transform">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

export default function Tournaments() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { tournaments, loading, error, fetchTournaments } = useTournamentStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => { fetchTournaments(); }, [fetchTournaments]);

  const filtered = useMemo(() => {
    let list = tournaments;
    if (statusFilter !== 'All') {
      list = list.filter((t) => t.status === statusFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [tournaments, query, statusFilter]);

  const statuses = ['All', 'upcoming', 'active', 'completed'];

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
            Tournaments
          </h1>
          <p className="text-ink-variant mt-2 max-w-xl">
            Brackets, fixtures, and live results for every inter-faculty championship.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-variant">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tournaments..."
              className="sc-input pl-10 !py-2.5 min-w-[240px]"
            />
          </div>
          {isAdmin && (
            <button onClick={() => setModalOpen(true)} className="sc-btn-primary !py-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              New Tournament
            </button>
          )}
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-1.5 bg-white rounded-full border
                      border-outline-variant/40 p-1 shadow-card mb-6 w-fit">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-label-md font-label font-semibold
                       uppercase tracking-wider transition-colors
                       ${statusFilter === s
                         ? 'bg-primary text-white shadow-card'
                         : 'text-ink-variant hover:text-primary'}`}
          >
            {s}
          </button>
        ))}
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
          <div className="w-14 h-14 rounded-full bg-surface-low mx-auto flex items-center
                          justify-center text-primary mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2">
              <path d="M8 21h8M12 17v4M5 4h14v5a7 7 0 01-14 0V4z" />
              <path d="M5 6H3v2a3 3 0 003 3M19 6h2v2a3 3 0 01-3 3" />
            </svg>
          </div>
          <p className="font-display text-headline-md text-ink">
            {query || statusFilter !== 'All'
              ? 'No tournaments match your filters.'
              : 'No tournaments yet.'}
          </p>
          {isAdmin && !query && statusFilter === 'All' && (
            <button onClick={() => setModalOpen(true)} className="sc-btn-primary mt-4">
              Create the first one
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => <TournamentCard key={t.id} t={t} />)}
        </div>
      )}

      <CreateTournamentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </motion.div>
  );
}
