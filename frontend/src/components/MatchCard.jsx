import { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useMatchStore } from '../store/matchStore';

const statusStyles = {
  scheduled: 'bg-surface-low text-ink-variant',
  live:      'bg-danger/15 text-danger',
  completed: 'bg-primary-container/30 text-primary',
  postponed: 'bg-secondary-container/40 text-secondary',
};

function formatKickoff(iso) {
  if (!iso) return 'Time TBD';
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// datetime-local needs YYYY-MM-DDTHH:mm in the user's local TZ — Date.toISOString
// is UTC and would shift the displayed value, so format from local parts instead.
function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Build a uniform competitor shape from either a team or a player join.
// Players don't carry brand colours, so we fall back to neutral ink tones.
function asCompetitor(team, player) {
  if (team) {
    return {
      kind: 'team',
      name: team.name,
      primary_color: team.primary_color,
      secondary_color: team.secondary_color,
      initial: team.name?.charAt(0).toUpperCase() ?? '?',
    };
  }
  if (player) {
    return {
      kind: 'player',
      name: player.name,
      primary_color: '#577b99',
      secondary_color: '#3d4850',
      initial: player.jersey_number != null
        ? String(player.jersey_number).padStart(2, '0')
        : (player.name?.charAt(0).toUpperCase() ?? '?'),
    };
  }
  return null;
}

function CompetitorRow({ competitor, score, isWinner, isLive }) {
  return (
    <div className={`flex items-center gap-3 py-1.5
                     ${isWinner ? 'text-ink font-semibold' : 'text-ink-variant'}`}>
      {competitor ? (
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-white
                     text-xs font-display flex-shrink-0 border border-outline-variant/40"
          style={{
            background: `linear-gradient(135deg, ${competitor.primary_color}, ${competitor.secondary_color})`,
          }}
        >
          {competitor.initial}
        </span>
      ) : (
        <span className="w-7 h-7 rounded-full bg-surface-low flex-shrink-0
                         border border-dashed border-outline-variant" />
      )}
      <span className="flex-1 min-w-0 truncate">{competitor?.name ?? 'TBD'}</span>
      <span className={`font-display text-headline-md leading-none tabular-nums
                        ${isLive ? 'text-danger' : ''}`}>
        {score ?? 0}
      </span>
    </div>
  );
}

function InlineScheduler({ match, onClose }) {
  const updateMatch = useMatchStore((s) => s.updateMatch);
  const [value, setValue] = useState(() => toLocalInputValue(match.scheduled_at));
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleSet = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!value || saving) return;
    setSaving(true);
    const iso = new Date(value).toISOString();
    const result = await updateMatch(match.id, { scheduled_at: iso });
    setSaving(false);
    if (result) onClose();
  };

  return (
    <div
      ref={wrapRef}
      className="absolute left-0 right-0 top-full mt-1 z-20 bg-white rounded-md
                 border border-outline-variant/40 shadow-card-hover p-3 space-y-2"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="sc-input w-full !py-1.5 !text-sm"
        autoFocus
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-xs text-ink-variant hover:text-ink transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSet}
          disabled={!value || saving}
          className="sc-btn-primary !py-1 !px-3 text-sm"
        >
          {saving ? 'Saving…' : 'Set Time'}
        </button>
      </div>
    </div>
  );
}

export default function MatchCard({ match, isAdmin, onEditScore, onOpen, compact = false }) {
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';
  const [schedOpen, setSchedOpen] = useState(false);

  const home = asCompetitor(match.home_team, match.home_player);
  const away = asCompetitor(match.away_team, match.away_player);

  // Winner detection works for both team and player matches.
  const homeWins = isCompleted && (
    (match.winner_id && match.winner_id === match.home_team_id) ||
    (match.winner_player_id && match.winner_player_id === match.home_player_id)
  );
  const awayWins = isCompleted && (
    (match.winner_id && match.winner_id === match.away_team_id) ||
    (match.winner_player_id && match.winner_player_id === match.away_player_id)
  );

  const timeText = formatKickoff(match.scheduled_at);

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

      <CompetitorRow competitor={home} score={match.home_score} isWinner={homeWins} isLive={isLive} />
      <CompetitorRow competitor={away} score={match.away_score} isWinner={awayWins} isLive={isLive} />

      {match.scheduled_at && match.status === 'scheduled' && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-variant">
          <Calendar size={12} strokeWidth={2} aria-hidden />
          <span>{formatKickoff(match.scheduled_at)}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-3 pt-3
                      border-t border-outline-variant/30 relative">
        <span className="text-xs text-ink-variant flex items-center gap-1 min-w-0 flex-1">
          {isAdmin ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSchedOpen((v) => !v); }}
              className="text-primary underline cursor-pointer hover:text-primary/70
                         transition-colors font-label text-label-md truncate"
            >
              {timeText}
            </button>
          ) : (
            <span className="truncate">{timeText}</span>
          )}
          {match.location ? <span className="truncate"> · {match.location}</span> : null}
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

        {isAdmin && schedOpen && (
          <InlineScheduler match={match} onClose={() => setSchedOpen(false)} />
        )}
      </div>
    </div>
  );
}
