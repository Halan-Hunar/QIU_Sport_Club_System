import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, CircleDot, ShieldCheck, TrendingUp, Target, Medal,
} from 'lucide-react';
import { useTournamentStatsStore } from '../store/tournamentStatsStore';
import { sportLabel } from '../constants/sports';

function ColorBar({ color }) {
  return (
    <span
      className="inline-block w-2.5 h-5 rounded-full flex-shrink-0"
      style={{ background: color ?? '#94a3b8' }}
    />
  );
}

function HeadlineCard({ Icon, tone, label, value, subtext }) {
  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5
                    flex flex-col h-full">
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
        <p className="text-sm text-ink-variant italic">Not yet decided.</p>
      )}
      {subtext && (
        <p className="text-xs text-ink-variant mt-1">{subtext}</p>
      )}
    </div>
  );
}

function LeaderboardTable({ rows, columns, emptyText }) {
  if (rows.length === 0) {
    return (
      <div className="bg-surface-low rounded-sm py-8 text-center">
        <p className="text-ink-variant text-sm">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-ink-variant border-b border-outline-variant/30">
            <th className="px-3 py-2 font-label text-label-md uppercase tracking-wider w-10">#</th>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 font-label text-label-md uppercase tracking-wider
                            ${c.align === 'right' ? 'text-right' : ''}
                            ${c.accent ? 'text-primary' : ''}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const goldRow = idx === 0;
            return (
              <tr
                key={row._key ?? idx}
                className={`border-b border-outline-variant/20 last:border-0
                            ${goldRow
                              ? 'bg-gradient-to-r from-amber-50 to-transparent'
                              : 'hover:bg-surface-low/50'}`}
              >
                <td className={`px-3 py-2.5 tabular-nums
                                ${goldRow ? 'text-amber-600 font-display' : 'text-ink-variant'}`}>
                  {idx + 1}
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2.5
                                ${c.align === 'right' ? 'text-right tabular-nums' : ''}
                                ${c.accent ? 'font-display text-primary' : 'text-ink'}`}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TournamentStats() {
  const { id } = useParams();
  const { data, loading, error, fetch: fetchStats } = useTournamentStatsStore();

  useEffect(() => { fetchStats(id); }, [id, fetchStats]);

  const t = data?.tournament;
  const applicable = data?.applicable ?? [];

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12"
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

      <div className="mb-8">
        <h1 className="font-display text-headline-lg sm:text-display-lg text-ink leading-tight">
          {t?.name ? `${t.name} · Stats` : 'Statistics'}
        </h1>
        {t && (
          <p className="text-ink-variant mt-2">
            {sportLabel(t.sport_type)}
            {t.is_individual && ' · Individual'}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-md border border-outline-variant/30
                                    shadow-card p-5 h-32 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Headline cards — only what's applicable to this sport */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {applicable.includes('champion') && (
              <HeadlineCard
                Icon={Trophy}
                tone="text-primary"
                label="Champion"
                value={data.champion?.name ?? null}
                subtext={data.champion ? `${data.champion.kind === 'player' ? 'Player' : 'Team'}` : null}
              />
            )}
            {applicable.includes('top_scorer') && (
              <HeadlineCard
                Icon={CircleDot}
                tone="text-primary"
                label="Top Scorer"
                value={data.top_scorers[0]?.player_name ?? null}
                subtext={data.top_scorers[0]
                  ? `${data.top_scorers[0].goal_count} ${data.top_scorers[0].goal_count === 1 ? 'goal' : 'goals'}`
                  : null}
              />
            )}
            {applicable.includes('clean_sheet') && (
              <HeadlineCard
                Icon={ShieldCheck}
                tone="text-secondary"
                label="Clean Sheets"
                value={data.clean_sheets[0]?.team_name ?? null}
                subtext={data.clean_sheets[0]
                  ? `${data.clean_sheets[0].clean_sheet_count} ${data.clean_sheets[0].clean_sheet_count === 1 ? 'match' : 'matches'}`
                  : null}
              />
            )}
            {applicable.includes('most_wins') && (
              <HeadlineCard
                Icon={Medal}
                tone="text-tertiary"
                label="Most Wins"
                value={data.most_wins[0]?.name ?? null}
                subtext={data.most_wins[0]
                  ? `${data.most_wins[0].win_count} ${data.most_wins[0].win_count === 1 ? 'win' : 'wins'}`
                  : null}
              />
            )}
          </div>

          {/* Detail tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {applicable.includes('top_scorer') && (
              <section className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={18} strokeWidth={2} className="text-primary" aria-hidden />
                  <h2 className="font-display text-headline-md text-ink">Top Scorers</h2>
                </div>
                <LeaderboardTable
                  rows={data.top_scorers.map((r) => ({ ...r, _key: r.player_id }))}
                  emptyText="No goals logged yet."
                  columns={[
                    {
                      key: 'player',
                      label: 'Player',
                      render: (r) => (
                        <span>
                          {r.player_name ?? '—'}
                          {r.jersey_number != null && (
                            <span className="text-ink-variant ml-1.5">#{r.jersey_number}</span>
                          )}
                        </span>
                      ),
                    },
                    {
                      key: 'team',
                      label: 'Team',
                      render: (r) => r.team_name ? (
                        <div className="flex items-center gap-2">
                          <ColorBar color={r.team_color} />
                          <span className="truncate">{r.team_name}</span>
                        </div>
                      ) : <span className="text-ink-variant">—</span>,
                    },
                    {
                      key: 'goals',
                      label: 'Goals',
                      align: 'right',
                      accent: true,
                      render: (r) => r.goal_count,
                    },
                  ]}
                />
              </section>
            )}

            {applicable.includes('clean_sheet') && (
              <section className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={18} strokeWidth={2} className="text-secondary" aria-hidden />
                  <h2 className="font-display text-headline-md text-ink">Clean Sheets</h2>
                </div>
                <LeaderboardTable
                  rows={data.clean_sheets.map((r) => ({ ...r, _key: r.team_id }))}
                  emptyText="No clean sheets recorded yet."
                  columns={[
                    {
                      key: 'team',
                      label: 'Team',
                      render: (r) => (
                        <div className="flex items-center gap-2">
                          <ColorBar color={r.team_color} />
                          <span className="truncate">{r.team_name}</span>
                        </div>
                      ),
                    },
                    {
                      key: 'count',
                      label: 'Clean sheets',
                      align: 'right',
                      accent: true,
                      render: (r) => r.clean_sheet_count,
                    },
                  ]}
                />
              </section>
            )}

            {applicable.includes('most_wins') && (
              <section className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={18} strokeWidth={2} className="text-tertiary" aria-hidden />
                  <h2 className="font-display text-headline-md text-ink">Most Wins</h2>
                </div>
                <LeaderboardTable
                  rows={data.most_wins.map((r) => ({ ...r, _key: r.id }))}
                  emptyText="No completed matches yet."
                  columns={[
                    {
                      key: 'name',
                      label: data.tournament?.is_individual ? 'Player' : 'Team',
                      render: (r) => (
                        <div className="flex items-center gap-2">
                          {r.kind === 'team' ? <ColorBar color={r.color} /> : null}
                          <span className="truncate">{r.name ?? '—'}</span>
                          {r.kind === 'player' && r.jersey_number != null && (
                            <span className="text-ink-variant text-xs">#{r.jersey_number}</span>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'wins',
                      label: 'Wins',
                      align: 'right',
                      accent: true,
                      render: (r) => r.win_count,
                    },
                  ]}
                />
              </section>
            )}
          </div>

          <p className="text-xs text-ink-variant">
            All stats are auto-computed from match results and event logs. They update the moment
            scores are saved or events are logged.
          </p>
        </>
      ) : null}
    </motion.div>
  );
}
