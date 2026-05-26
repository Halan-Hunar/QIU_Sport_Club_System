const statusStyles = {
  scheduled: 'bg-surface-low text-ink-variant',
  live:      'bg-danger/15 text-danger',
  completed: 'bg-primary-container/30 text-primary',
  postponed: 'bg-secondary-container/40 text-secondary',
};

function formatKickoff(iso) {
  if (!iso) return 'Time TBD';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function TeamRow({ team, score, isWinner, isLive }) {
  return (
    <div className={`flex items-center gap-3 py-1.5
                     ${isWinner ? 'text-ink font-semibold' : 'text-ink-variant'}`}>
      {team ? (
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-white
                     text-xs font-display flex-shrink-0 border border-outline-variant/40"
          style={{
            background: `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`,
          }}
        >
          {team.name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <span className="w-7 h-7 rounded-full bg-surface-low flex-shrink-0
                         border border-dashed border-outline-variant" />
      )}
      <span className="flex-1 min-w-0 truncate">{team?.name ?? 'TBD'}</span>
      <span className={`font-display text-headline-md leading-none tabular-nums
                        ${isLive ? 'text-danger' : ''}`}>
        {score ?? 0}
      </span>
    </div>
  );
}

export default function MatchCard({ match, isAdmin, onEditScore, onOpen, compact = false }) {
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';
  const homeWins = isCompleted && match.winner_id && match.winner_id === match.home_team_id;
  const awayWins = isCompleted && match.winner_id && match.winner_id === match.away_team_id;

  return (
    <div className={`bg-white rounded-md border border-outline-variant/30 shadow-card
                     ${compact ? 'p-3' : 'p-4'} relative`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-label text-label-md uppercase tracking-wider text-ink-variant">
          {match.round} {match.match_number ? `· #${match.match_number}` : ''}
        </span>
        <span className={`sc-chip capitalize ${statusStyles[match.status] ?? ''}`}>
          {isLive && (
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse mr-1 inline-block" />
          )}
          {match.status}
        </span>
      </div>

      <TeamRow
        team={match.home_team}
        score={match.home_score}
        isWinner={homeWins}
        isLive={isLive}
      />
      <TeamRow
        team={match.away_team}
        score={match.away_score}
        isWinner={awayWins}
        isLive={isLive}
      />

      <div className="flex items-center justify-between gap-2 mt-3 pt-3
                      border-t border-outline-variant/30">
        <span className="text-xs text-ink-variant">
          {formatKickoff(match.scheduled_at)}
          {match.location ? ` · ${match.location}` : ''}
        </span>
        <div className="flex gap-1">
          {onOpen && (
            <button
              onClick={() => onOpen(match)}
              className="sc-btn-ghost !py-1 !px-2 !text-xs"
            >
              Details
            </button>
          )}
          {isAdmin && onEditScore && (
            <button
              onClick={() => onEditScore(match)}
              className="sc-btn-ghost !py-1 !px-2 !text-xs"
            >
              Edit Score
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
