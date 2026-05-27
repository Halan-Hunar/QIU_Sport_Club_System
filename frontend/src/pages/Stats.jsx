import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Target, Shield, Activity, TrendingUp, Users, Swords, CircleDot,
} from 'lucide-react';
import { useStatsStore } from '../store/statsStore';

function StatTile({ label, value, Icon, tone = 'text-primary', loading }) {
  return (
    <div className={`bg-white rounded-md border border-outline-variant/30 shadow-card
                    border-l-4 ${tone} border-l-current px-4 py-3 flex items-center gap-3`}>
      <Icon size={22} strokeWidth={2} aria-hidden className={tone} />
      <div className="flex-1 min-w-0">
        <p className="font-label text-label-md uppercase tracking-wider text-ink-variant">
          {label}
        </p>
        {loading ? (
          <div className="h-5 w-12 bg-surface-low rounded animate-pulse mt-1" />
        ) : (
          <p className="font-display text-headline-md text-ink leading-none mt-1 tabular-nums">
            {value ?? 0}
          </p>
        )}
      </div>
    </div>
  );
}

function ColorBar({ color }) {
  return (
    <span
      className="inline-block w-2.5 h-5 rounded-full flex-shrink-0"
      style={{ background: color ?? '#94a3b8' }}
    />
  );
}

function TopScorersTable({ rows, loading }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 bg-surface-low rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="bg-surface-low rounded-sm py-8 text-center">
        <p className="text-ink-variant text-sm">No goals logged yet.</p>
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-ink-variant border-b border-outline-variant/30">
          <th className="px-3 py-2 font-label text-label-md uppercase tracking-wider w-10">#</th>
          <th className="px-3 py-2 font-label text-label-md uppercase tracking-wider">Player</th>
          <th className="px-3 py-2 font-label text-label-md uppercase tracking-wider">Team</th>
          <th className="px-3 py-2 text-right font-label text-label-md uppercase tracking-wider text-primary w-16">
            Goals
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => {
          const goldRow = idx === 0;
          return (
            <tr
              key={r.player_id}
              className={`border-b border-outline-variant/20 last:border-0
                          ${goldRow
                            ? 'bg-gradient-to-r from-amber-50 to-transparent'
                            : 'hover:bg-surface-low/50'}`}
            >
              <td className={`px-3 py-2.5 tabular-nums
                              ${goldRow ? 'text-amber-600 font-display' : 'text-ink-variant'}`}>
                {idx + 1}
              </td>
              <td className="px-3 py-2.5 font-medium text-ink">
                {r.player_name ?? '—'}
                {r.jersey_number != null && (
                  <span className="text-ink-variant ml-1.5">#{r.jersey_number}</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-ink-variant">
                {r.team_name ? (
                  <div className="flex items-center gap-2">
                    <ColorBar color={r.team_color} />
                    <span className="truncate">{r.team_name}</span>
                  </div>
                ) : '—'}
              </td>
              <td className="px-3 py-2.5 text-right font-display text-primary tabular-nums">
                {r.goal_count}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function MostWinsTable({ rows, loading }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 bg-surface-low rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="bg-surface-low rounded-sm py-8 text-center">
        <p className="text-ink-variant text-sm">No completed matches yet.</p>
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-ink-variant border-b border-outline-variant/30">
          <th className="px-3 py-2 font-label text-label-md uppercase tracking-wider w-10">#</th>
          <th className="px-3 py-2 font-label text-label-md uppercase tracking-wider">Team</th>
          <th className="px-3 py-2 text-right font-label text-label-md uppercase tracking-wider text-primary w-16">
            Wins
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, idx) => {
          const goldRow = idx === 0;
          return (
            <tr
              key={r.team_id}
              className={`border-b border-outline-variant/20 last:border-0
                          ${goldRow
                            ? 'bg-gradient-to-r from-amber-50 to-transparent'
                            : 'hover:bg-surface-low/50'}`}
            >
              <td className={`px-3 py-2.5 tabular-nums
                              ${goldRow ? 'text-amber-600 font-display' : 'text-ink-variant'}`}>
                {idx + 1}
              </td>
              <td className="px-3 py-2.5 font-medium text-ink">
                <div className="flex items-center gap-2">
                  <ColorBar color={r.team_color} />
                  <span className="truncate">{r.team_name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right font-display text-primary tabular-nums">
                {r.win_count}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ResultCard({ r }) {
  const homeWins = r.winner_id && r.winner_id === r.home_team?.id;
  const awayWins = r.winner_id && r.winner_id === r.away_team?.id;
  const dateLabel = r.ended_at
    ? new Date(r.ended_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '—';

  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="sc-chip bg-surface-low text-ink-variant truncate max-w-[60%]">
          {r.tournament_name ?? 'Tournament'}
        </span>
        <span className="text-xs text-ink-variant">{dateLabel}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ColorBar color={r.home_team?.primary_color} />
          <span className={`truncate ${homeWins ? 'font-semibold text-ink' : 'text-ink-variant'}`}>
            {r.home_team?.name ?? 'TBD'}
          </span>
        </div>
        <span className="font-display text-headline-md text-ink tabular-nums whitespace-nowrap">
          {r.home_score} – {r.away_score}
        </span>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className={`truncate ${awayWins ? 'font-semibold text-ink' : 'text-ink-variant'}`}>
            {r.away_team?.name ?? 'TBD'}
          </span>
          <ColorBar color={r.away_team?.primary_color} />
        </div>
      </div>
    </div>
  );
}

export default function Stats() {
  const {
    totals, topScorers, mostWins, recentResults,
    loading, error, fetchStats,
  } = useStatsStore();

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h1 className="font-display text-headline-lg sm:text-display-lg text-ink leading-tight">
          Statistics
        </h1>
        <p className="text-ink-variant mt-2 max-w-xl">
          League-wide leaderboards, recent results, and competition totals — recomputed live
          from match events.
        </p>
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {/* Totals row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <StatTile label="Teams"       value={totals?.teams}       Icon={Shield}     tone="text-primary"   loading={loading && !totals} />
        <StatTile label="Players"     value={totals?.players}     Icon={Users}      tone="text-tertiary"  loading={loading && !totals} />
        <StatTile label="Tournaments" value={totals?.tournaments} Icon={Trophy}     tone="text-secondary" loading={loading && !totals} />
        <StatTile label="Matches"     value={totals?.matches}     Icon={Swords}     tone="text-primary"   loading={loading && !totals} />
        <StatTile label="Goals"       value={totals?.goals}       Icon={CircleDot}  tone="text-primary"   loading={loading && !totals} />
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <section className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} strokeWidth={2} className="text-primary" aria-hidden />
            <h2 className="font-display text-headline-md text-ink">Top Scorers</h2>
          </div>
          <TopScorersTable rows={topScorers} loading={loading && topScorers.length === 0} />
        </section>

        <section className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} strokeWidth={2} className="text-primary" aria-hidden />
            <h2 className="font-display text-headline-md text-ink">Most Wins</h2>
          </div>
          <MostWinsTable rows={mostWins} loading={loading && mostWins.length === 0} />
        </section>
      </div>

      {/* Recent results */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={18} strokeWidth={2} className="text-primary" aria-hidden />
          <h2 className="font-display text-headline-md text-ink">Recent Results</h2>
        </div>
        {loading && recentResults.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-md border border-outline-variant/30
                                      shadow-card animate-pulse" />
            ))}
          </div>
        ) : recentResults.length === 0 ? (
          <div className="bg-white rounded-md border border-dashed border-outline-variant
                          py-12 text-center">
            <p className="text-ink-variant text-sm">No completed matches yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentResults.map((r) => <ResultCard key={r.match_id} r={r} />)}
          </div>
        )}
      </section>
    </motion.div>
  );
}
