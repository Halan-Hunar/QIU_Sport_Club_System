import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, TrendingUp, Trophy, ShieldCheck, Share2, Pencil, Star,
} from 'lucide-react';
import { useTournamentStatsStore } from '../store/tournamentStatsStore';
import { useAuthStore } from '../store/authStore';
import { sportLabel } from '../constants/sports';
import ExportModal from '../components/ExportModal';
import BestPlayerModal from '../components/BestPlayerModal';

const monthYear = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

// Visual color rotation when a team doesn't carry its own palette.
const fallbackPalette = ['#7c3aed', '#16a34a', '#ea580c', '#0ea5e9', '#db2777', '#facc15'];
const tintFor = (color, idx) => color || fallbackPalette[idx % fallbackPalette.length];

function SummaryCard({ Icon, tone, value, label, sub }) {
  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card
                    px-5 py-4 flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-md ${tone} flex items-center justify-center`}>
        <Icon size={18} strokeWidth={2.25} aria-hidden />
      </div>
      <div>
        <p className="font-display text-[2rem] sm:text-[2.25rem] text-ink leading-none tabular-nums">{value}</p>
        <p className="text-sm text-ink-variant mt-1.5">{label}</p>
        {sub && (
          <p className="text-xs text-ink-variant/80 mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

function LeaderRow({ rank, color, label, sublabel, count, countLabel, max, highlight }) {
  const pct = max > 0 ? Math.max(6, Math.round((count / max) * 100)) : 0;
  return (
    <div
      className={`flex items-center gap-3 px-3 sm:px-4 py-3 rounded-md
                  ${highlight ? 'bg-amber-50/60' : ''}`}
    >
      <span className={`w-6 text-sm tabular-nums flex-shrink-0
                        ${highlight ? 'text-amber-600 font-display' : 'text-ink-variant'}`}>
        {rank}
      </span>

      <div
        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center
                   text-white font-display text-base shadow-sm"
        style={{ background: color }}
        aria-hidden
      >
        {label?.charAt(0)?.toUpperCase() ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-ink text-base leading-tight truncate">{label}</p>
        </div>
        {sublabel && (
          <p className="text-xs text-ink-variant mt-0.5 truncate">{sublabel}</p>
        )}
        <div className="mt-2 h-1.5 bg-surface-low rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-end flex-shrink-0 min-w-[48px]">
        <span className="font-display text-headline-md text-ink tabular-nums leading-none">
          {count}
        </span>
        <span className="text-[10px] font-label uppercase tracking-wider text-ink-variant mt-1">
          {countLabel}
        </span>
      </div>
    </div>
  );
}

function HeroCard({ Icon, tone, label, value, sub, edit }) {
  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card
                    p-5 flex flex-col h-full relative">
      {edit}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full bg-surface-low flex items-center
                        justify-center ${tone}`}>
          <Icon size={22} strokeWidth={2} aria-hidden />
        </div>
        <p className="font-label text-label-md uppercase tracking-wider text-ink-variant">
          {label}
        </p>
      </div>
      {value ? (
        <p className="font-display text-headline-md text-ink leading-tight">{value}</p>
      ) : (
        <p className="font-display text-headline-md text-ink-variant italic">TBD</p>
      )}
      {sub && (
        <p className="text-xs text-ink-variant mt-1 truncate">{sub}</p>
      )}
    </div>
  );
}

export default function TournamentStats() {
  const { id } = useParams();
  const { data, loading, error, fetch: fetchStats } = useTournamentStatsStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [exportOpen, setExportOpen] = useState(false);
  const [bestPlayerOpen, setBestPlayerOpen] = useState(false);

  useEffect(() => { fetchStats(id); }, [id, fetchStats]);

  const t = data?.tournament;
  const applicable = data?.applicable ?? [];
  const summary = data?.summary ?? {};

  const topScorerMax = useMemo(
    () => data?.top_scorers?.[0]?.goal_count ?? 0,
    [data],
  );
  const cleanSheetMax = useMemo(
    () => data?.clean_sheets?.[0]?.clean_sheet_count ?? 0,
    [data],
  );

  const showChampion = applicable.includes('champion');
  const showBestPlayer = applicable.includes('best_player') || isAdmin;

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <nav className="text-sm text-ink-variant mb-4 flex items-center gap-2">
        <Link to="/tournaments" className="hover:text-primary transition-colors">Tournaments</Link>
        <span className="text-outline">›</span>
        {t && (
          <>
            <Link to={`/tournaments/${id}`} className="hover:text-primary transition-colors">
              {t.name}
            </Link>
            <span className="text-outline">›</span>
          </>
        )}
        <span className="text-primary font-semibold">Stats</span>
      </nav>

      {/* Hero banner — dark teal → deep blue */}
      <div
        className="relative overflow-hidden rounded-lg p-8 sm:p-10 mb-8 text-white"
        style={{
          background: 'linear-gradient(135deg, #0d3d56 0%, #0a2a3a 100%)',
        }}
      >
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full
                        bg-cyan-400/15 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <span className="font-label text-label-md uppercase tracking-[0.22em] text-white/70">
              Tournament Analytics
            </span>
            <h1 className="font-display text-display-lg mt-2 leading-tight">
              Stats &amp; Leaders
            </h1>
            {t && (
              <p className="text-white/80 mt-2 text-sm">
                {t.name} · {sportLabel(t.sport_type)}{t.is_individual && ' · Individual'}
              </p>
            )}
          </div>
          {isAdmin && data && applicable.length > 0 && (
            <button
              onClick={() => setExportOpen(true)}
              className="sc-btn-secondary !bg-white/10 !border-white/30 !text-white
                         hover:!bg-white/20 self-start sm:self-auto"
            >
              <Share2 size={16} strokeWidth={2.25} />
              Export
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-md border border-outline-variant/30
                                    shadow-card h-32 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary stat strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard
              Icon={Target}
              tone="bg-cyan-50 text-cyan-700"
              value={summary.total_goals ?? 0}
              label="Total goals"
            />
            <SummaryCard
              Icon={TrendingUp}
              tone="bg-emerald-50 text-emerald-700"
              value={(summary.goals_per_match ?? 0).toFixed(1)}
              label="Goals / match"
            />
            <SummaryCard
              Icon={Trophy}
              tone="bg-violet-50 text-violet-700"
              value={summary.biggest_win
                ? `${Math.max(summary.biggest_win.home_score, summary.biggest_win.away_score)}–${Math.min(summary.biggest_win.home_score, summary.biggest_win.away_score)}`
                : '—'}
              label="Biggest win"
              sub={summary.biggest_win
                ? `${summary.biggest_win.home_name} vs ${summary.biggest_win.away_name}`
                : null}
            />
            <SummaryCard
              Icon={ShieldCheck}
              tone="bg-rose-50 text-rose-700"
              value={summary.total_clean_sheets ?? 0}
              label="Clean sheets"
            />
          </div>

          {/* Hero awards row: Champion + Best Player */}
          {(showChampion || showBestPlayer) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {showChampion && (
                <HeroCard
                  Icon={Trophy}
                  tone="text-primary"
                  label="Champion"
                  value={data.champion?.name ?? null}
                  sub={data.champion ? `${data.champion.kind === 'player' ? 'Player' : 'Team'}` : 'Awaiting Final result'}
                />
              )}
              {showBestPlayer && (
                <HeroCard
                  Icon={Star}
                  tone="text-tertiary"
                  label="Best Player"
                  value={data.best_player?.player_name ?? null}
                  sub={data.best_player?.team_name ?? (isAdmin ? 'Tap pencil to set' : null)}
                  edit={isAdmin && (
                    <button
                      type="button"
                      onClick={() => setBestPlayerOpen(true)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full
                                 bg-surface-low hover:bg-primary-container/15
                                 text-ink-variant hover:text-primary
                                 flex items-center justify-center transition-colors"
                      aria-label="Edit Best Player"
                    >
                      <Pencil size={14} strokeWidth={2.5} />
                    </button>
                  )}
                />
              )}
            </div>
          )}

          {/* Leaderboards — Top Scorers + Clean Sheets */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {applicable.includes('top_scorer') && (
              <section className="bg-white rounded-md border border-outline-variant/30
                                  shadow-card p-5">
                <div className="border-b border-outline-variant/30 pb-3 mb-2">
                  <h2 className="font-display text-headline-md text-ink">Top Scorers</h2>
                  <p className="text-xs text-ink-variant mt-0.5">
                    Golden Boot race{t?.start_date && ` · ${monthYear(t.start_date)}`}
                  </p>
                </div>
                {data.top_scorers.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-ink-variant text-sm">No goals logged yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {data.top_scorers.map((s, i) => (
                      <LeaderRow
                        key={s.player_id ?? i}
                        rank={i + 1}
                        color={tintFor(s.team_color, i)}
                        label={s.player_name ?? '—'}
                        sublabel={s.team_name}
                        count={s.goal_count}
                        countLabel="GOALS"
                        max={topScorerMax}
                        highlight={i === 0}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {applicable.includes('clean_sheet') && (
              <section className="bg-white rounded-md border border-outline-variant/30
                                  shadow-card p-5">
                <div className="border-b border-outline-variant/30 pb-3 mb-2">
                  <h2 className="font-display text-headline-md text-ink">Clean Sheets</h2>
                  <p className="text-xs text-ink-variant mt-0.5">
                    Walls of the tournament
                  </p>
                </div>
                {data.clean_sheets.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-ink-variant text-sm">No clean sheets recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {data.clean_sheets.map((s, i) => (
                      <LeaderRow
                        key={s.team_id ?? i}
                        rank={i + 1}
                        color={tintFor(s.team_color, i)}
                        label={s.team_name}
                        count={s.clean_sheet_count}
                        countLabel="CS"
                        max={cleanSheetMax}
                        highlight={i === 0}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          <p className="text-xs text-ink-variant">
            All stats are auto-computed from match results and event logs. They update the moment
            scores are saved or events are logged.
          </p>
        </>
      ) : null}

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        tournament={t}
        stats={data}
      />
      <BestPlayerModal
        open={bestPlayerOpen}
        onClose={() => setBestPlayerOpen(false)}
        tournamentId={id}
      />
    </motion.div>
  );
}
