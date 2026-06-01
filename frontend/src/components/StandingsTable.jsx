export default function StandingsTable({ standings }) {
  if (!standings || standings.length === 0) {
    return (
      <div className="bg-white rounded-md border border-dashed border-outline-variant
                      py-12 text-center">
        <p className="text-ink-variant">No standings yet — generate matches first.</p>
      </div>
    );
  }

  // Group by group_name (if any), else single table
  const groups = new Map();
  for (const row of standings) {
    const key = row.group_name || '__default';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([groupKey, rows]) => {
        const isGroupStage = groupKey !== '__default';
        // Only show ADV indicators once the stage is underway.
        const stageStarted = rows.some((r) => (r.played ?? 0) > 0);
        return (
        <div key={groupKey}
             className="bg-white rounded-md border border-outline-variant/30 shadow-card
                        overflow-hidden">
          {isGroupStage && (
            <div className="px-4 py-3 border-b border-outline-variant/30
                            bg-surface-low">
              <span className="font-label text-label-md uppercase tracking-wider text-ink">
                Group {groupKey}
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-variant border-b border-outline-variant/30">
                  <th className="px-4 py-2 font-label text-label-md uppercase tracking-wider">#</th>
                  <th className="px-4 py-2 font-label text-label-md uppercase tracking-wider">Team</th>
                  <th className="px-3 py-2 text-center font-label text-label-md uppercase tracking-wider">P</th>
                  <th className="px-3 py-2 text-center font-label text-label-md uppercase tracking-wider">W</th>
                  <th className="px-3 py-2 text-center font-label text-label-md uppercase tracking-wider">D</th>
                  <th className="px-3 py-2 text-center font-label text-label-md uppercase tracking-wider">L</th>
                  <th className="px-3 py-2 text-center font-label text-label-md uppercase tracking-wider">GF</th>
                  <th className="px-3 py-2 text-center font-label text-label-md uppercase tracking-wider">GA</th>
                  <th className="px-3 py-2 text-center font-label text-label-md uppercase tracking-wider">GD</th>
                  <th className="px-4 py-2 text-center font-label text-label-md uppercase tracking-wider text-primary">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const advances = isGroupStage && stageStarted && idx < 2;
                  return (
                  <tr key={r.team_id}
                      className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-low/50">
                    <td className="px-4 py-3 text-ink-variant tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-7 rounded-full"
                          style={{ background: r.primary_color }}
                        />
                        <span className="font-medium text-ink">{r.team_name}</span>
                        {advances && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-sm
                                           bg-tertiary-container/40 text-tertiary-on-container
                                           font-label text-[10px] uppercase tracking-wider"
                                title="Advances to knockout stage">
                            ADV
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-ink-variant">{r.played}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-ink-variant">{r.won}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-ink-variant">{r.drawn}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-ink-variant">{r.lost}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-ink-variant">{r.goals_for}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-ink-variant">{r.goals_against}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-ink-variant">
                      {r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff}
                    </td>
                    <td className="px-4 py-3 text-center font-display text-headline-md text-primary tabular-nums">
                      {r.points}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        );
      })}
    </div>
  );
}
