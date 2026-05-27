import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Users, Swords, Calendar, CircleDot } from 'lucide-react';
import { useHomeStore } from '../store/homeStore';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

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
  const opts = { month: 'short', day: 'numeric' };
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, opts);
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt(start || end);
}

function StatPill({ label, value, loading }) {
  return (
    <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm
                    border border-white/20 rounded-full px-4 py-2 min-w-[100px]">
      {loading ? (
        <span className="h-5 w-8 bg-white/30 rounded animate-pulse" />
      ) : (
        <span className="font-display text-stats text-white tabular-nums">{value}</span>
      )}
      <span className="font-label text-label-md uppercase tracking-wider text-white/80">
        {label}
      </span>
    </div>
  );
}

function TournamentMiniCard({ t }) {
  return (
    <Link
      to={`/tournaments/${t.id}`}
      className="group flex-shrink-0 w-64 bg-white rounded-md border border-outline-variant/30
                 shadow-card hover:shadow-card-hover transition-all p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-headline-md text-ink leading-snug
                       group-hover:text-primary transition-colors truncate">
          {t.name}
        </h3>
        <span className={`sc-chip capitalize ${statusStyles[t.status] ?? statusStyles.upcoming}`}>
          {t.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="sc-chip bg-surface-low text-ink-variant capitalize">
          {t.sport_type}
        </span>
        <span className="sc-chip bg-surface-low text-ink-variant">
          {formatLabels[t.format] ?? t.format}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-xs text-ink-variant">
        <Calendar size={12} strokeWidth={2} aria-hidden />
        {formatDateRange(t.start_date, t.end_date)}
      </div>
    </Link>
  );
}

export default function Home() {
  const { stats, upcoming, loading, error, fetchHomeData } = useHomeStore();

  useEffect(() => { fetchHomeData(); }, [fetchHomeData]);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12">
      {/* Hero */}
      <motion.section
        {...fadeUp}
        className="relative overflow-hidden rounded-lg bg-hero-deep p-8 sm:p-12
                   shadow-card text-white"
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full
                        bg-primary-container/30 blur-3xl pointer-events-none" />
        <div className="relative">
          <span className="sc-chip bg-live/20 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse-dot" />
            Live Now
          </span>
          <h1 className="font-display text-headline-lg sm:text-display-lg mt-4 leading-tight">
            Inter-Faculty Championship
          </h1>
          <p className="text-white/80 mt-3 max-w-2xl">
            Real-time scores, rosters, and standings for every competition —
            built for the players, coaches, and the crowd.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <StatPill label="Teams"          value={stats?.total_teams ?? 0}   loading={loading && !stats} />
            <StatPill label="Matches Played" value={stats?.total_matches ?? 0} loading={loading && !stats} />
            <StatPill label="Goals"          value={stats?.total_goals ?? 0}   loading={loading && !stats} />
          </div>

          {error && (
            <p className="mt-4 text-sm bg-white/10 rounded-sm px-3 py-2 inline-block">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/teams"
                  className="sc-btn-primary bg-primary-container text-primary-on-container hover:bg-white">
              View Teams
            </Link>
            <Link to="/tournaments"
                  className="sc-btn-secondary !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">
              Tournaments
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Feature grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}
          className="sc-card p-6">
          <div className="w-10 h-10 rounded-full bg-primary-container/15 text-primary
                          flex items-center justify-center mb-3">
            <Users size={22} strokeWidth={2} aria-hidden />
          </div>
          <h3 className="font-display text-headline-md text-ink">Team Rosters</h3>
          <p className="text-sm text-ink-variant mt-1">
            Browse every team, jersey numbers, positions, and captains across all disciplines.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}
          className="sc-card p-6">
          <div className="w-10 h-10 rounded-full bg-tertiary-container/40 text-tertiary
                          flex items-center justify-center mb-3">
            <CircleDot size={22} strokeWidth={2} aria-hidden />
          </div>
          <h3 className="font-display text-headline-md text-ink">Live Standings</h3>
          <p className="text-sm text-ink-variant mt-1">
            Up-to-the-minute league tables, top scorers, and performance trends.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}
          className="sc-card p-6">
          <div className="w-10 h-10 rounded-full bg-secondary-container/30 text-secondary
                          flex items-center justify-center mb-3">
            <Swords size={22} strokeWidth={2} aria-hidden />
          </div>
          <h3 className="font-display text-headline-md text-ink">Tournaments</h3>
          <p className="text-sm text-ink-variant mt-1">
            Brackets, fixtures and results for every inter-faculty championship.
          </p>
        </motion.div>
      </section>

      {/* Upcoming & Active */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={20} strokeWidth={2} className="text-primary" aria-hidden />
          <h2 className="font-display text-headline-md text-ink">Upcoming &amp; Active</h2>
        </div>

        {loading && upcoming.length === 0 ? (
          <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}
                   className="flex-shrink-0 w-64 h-32 bg-white rounded-md
                              border border-outline-variant/30 shadow-card animate-pulse" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-md border border-dashed border-outline-variant
                          py-10 text-center">
            <p className="text-ink-variant text-sm">No upcoming or active tournaments yet.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-2">
            {upcoming.map((t) => <TournamentMiniCard key={t.id} t={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}
