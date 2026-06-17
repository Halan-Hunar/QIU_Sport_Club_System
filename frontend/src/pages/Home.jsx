import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Users, Swords, Calendar, CircleDot, ArrowRight,
} from 'lucide-react';
import { useHomeStore } from '../store/homeStore';
import { sportLabel } from '../constants/sports';

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
  upcoming:  'bg-white/15 text-white',
  active:    'bg-white/25 text-white',
  completed: 'bg-white/10 text-white/80',
};

const tournamentCardStatusStyles = {
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

// Vertical stat block — value above, label below. Aligns cleanly in a grid.
function HeroStat({ Icon, label, value, loading }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-md
                    px-4 py-3 flex flex-col items-start">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={12} strokeWidth={2} className="text-white/60" aria-hidden />
        <span className="font-label text-label-md uppercase tracking-wider text-white/70">
          {label}
        </span>
      </div>
      {loading ? (
        <span className="h-7 w-12 bg-white/20 rounded animate-pulse" />
      ) : (
        <span className="font-display text-display-lg text-white leading-none tabular-nums">
          {value ?? 0}
        </span>
      )}
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
        <span className={`sc-chip capitalize ${tournamentCardStatusStyles[t.status] ?? tournamentCardStatusStyles.upcoming}`}>
          {t.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="sc-chip bg-surface-low text-ink-variant">
          {sportLabel(t.sport_type)}
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

function ResultCard({ match }) {
  const homeName = match.home_team?.name ?? match.home_player?.name ?? 'TBD';
  const awayName = match.away_team?.name ?? match.away_player?.name ?? 'TBD';
  const homeColor = match.home_team?.primary_color ?? '#94a3b8';
  const awayColor = match.away_team?.primary_color ?? '#cbd5e1';
  const homeWon = match.winner_id && match.winner_id === match.home_team_id;
  const awayWon = match.winner_id && match.winner_id === match.away_team_id;
  return (
    <Link
      to={`/tournaments/${match.tournament_id}`}
      className="sc-card p-5 sm:p-6 flex flex-col h-full hover:shadow-card-hover
                 transition-all group"
    >
      <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mb-4">
        {match.round}
      </p>
      <div className="space-y-3 flex-1">
        {[{ name: homeName, color: homeColor, score: match.home_score, winner: homeWon },
          { name: awayName, color: awayColor, score: match.away_score, winner: awayWon }
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-1.5 h-7 rounded-full flex-shrink-0" style={{ background: row.color }} />
            <span className={`flex-1 truncate font-display text-base sm:text-lg leading-none
                              ${row.winner ? 'text-ink font-semibold' : 'text-ink/80'}`}>
              {row.name}
            </span>
            <span className={`font-display text-2xl sm:text-3xl tabular-nums leading-none
                              ${row.winner ? 'text-primary' : 'text-ink'}`}>
              {row.score ?? 0}
            </span>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default function Home() {
  const { stats, upcoming, latestResults, loading, error, fetchHomeData } = useHomeStore();

  useEffect(() => { fetchHomeData(); }, [fetchHomeData]);

  const featured = stats?.featured_tournament;
  const isLoadingHero = loading && !stats;

  // When a featured tournament exists, the hero shows ITS counts.
  // Otherwise we fall back to cross-system totals so the page still feels alive.
  const competitorLabel = featured?.is_individual ? 'Players' : 'Teams';
  const competitorCount = featured ? featured.competitors_count : (stats?.total_teams ?? 0);
  const matchesCount = featured ? featured.matches_played : (stats?.total_matches ?? 0);
  const goalsCount = featured ? featured.goals_scored : (stats?.total_goals ?? 0);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-12">
      {/* Hero */}
      <motion.section
        {...fadeUp}
        className="relative overflow-hidden rounded-lg bg-hero-deep p-6 sm:p-12
                   shadow-card text-white"
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full
                        bg-primary-container/30 blur-3xl pointer-events-none" />
        <div className="relative">
          {/* Header chip */}
          {isLoadingHero ? (
            <span className="inline-block h-6 w-24 bg-white/20 rounded-full animate-pulse" />
          ) : featured ? (
            <span className={`sc-chip capitalize ${statusStyles[featured.status] ?? statusStyles.upcoming}`}>
              {featured.status === 'active' && (
                <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse-dot" />
              )}
              {featured.status === 'active' ? 'Live · Featured' : 'Featured Tournament'}
            </span>
          ) : (
            <span className="sc-chip bg-white/15 text-white">Welcome</span>
          )}

          {/* Title — featured tournament's name, or a neutral fallback */}
          {isLoadingHero ? (
            <div className="h-12 w-2/3 bg-white/20 rounded animate-pulse mt-4" />
          ) : featured ? (
            <h1 className="font-display text-headline-lg sm:text-display-lg mt-4 leading-tight">
              {featured.name}
            </h1>
          ) : (
            <div className="mt-4 flex items-center gap-3">
              <img
                src="/export-assets/logo/QIU-Sports-Club-Logo.png"
                alt="QIU Sports Club"
                style={{ height: '56px', width: 'auto' }}
              />
              <span className="font-display text-headline-lg sm:text-display-lg leading-tight">
                Hub
              </span>
            </div>
          )}

          <p className="text-white/80 mt-3 max-w-2xl">
            {featured
              ? `Real-time scores, rosters, and standings — built for the players, coaches, and the crowd.`
              : `Live scores, rosters, brackets, and stats for every competition.`}
          </p>

          {/* Stats grid — equal-width vertical blocks, properly aligned */}
          <div className="grid grid-cols-3 gap-3 mt-6 max-w-xl">
            <HeroStat Icon={Users}     label={competitorLabel}    value={competitorCount} loading={isLoadingHero} />
            <HeroStat Icon={Swords}    label="Matches Played"     value={matchesCount}    loading={isLoadingHero} />
            <HeroStat Icon={CircleDot} label="Goals"              value={goalsCount}      loading={isLoadingHero} />
          </div>

          {error && (
            <p className="mt-4 text-sm bg-white/10 rounded-sm px-3 py-2 inline-block">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-8">
            {featured ? (
              <Link to={`/tournaments/${featured.id}`}
                    className="sc-btn-primary bg-primary-container text-primary-on-container hover:bg-white">
                Open {featured.name}
                <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            ) : (
              <Link to="/tournaments"
                    className="sc-btn-primary bg-primary-container text-primary-on-container hover:bg-white">
                Browse Tournaments
              </Link>
            )}
            <Link to="/teams"
                  className="sc-btn-secondary !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">
              View Teams
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
            Brackets, fixtures and results for every competition we run.
          </p>
        </motion.div>
      </section>

      {/* Latest Results — aligned in the same 3-up grid as the feature cards */}
      {latestResults.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-headline-md text-ink mb-4">Latest Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {latestResults.slice(0, 3).map((m) => <ResultCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

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
