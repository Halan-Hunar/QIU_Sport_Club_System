import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import MatchEventLog from './MatchEventLog';
import LogEventModal from './LogEventModal';
import EditScoreModal from './EditScoreModal';
import { useEventStore } from '../store/eventStore';
import { useMatchStore } from '../store/matchStore';

const STATUSES = [
  { value: 'scheduled', label: 'Scheduled', activeClass: 'bg-surface-low text-ink' },
  { value: 'live',      label: 'Live',      activeClass: 'bg-danger/15 text-danger' },
  { value: 'completed', label: 'Completed', activeClass: 'bg-primary-container/30 text-primary' },
  { value: 'postponed', label: 'Postponed', activeClass: 'bg-secondary-container/40 text-secondary' },
];

function asCompetitor(team, player) {
  if (team) {
    return {
      name: team.name,
      primary_color: team.primary_color,
      secondary_color: team.secondary_color,
      initial: team.name?.charAt(0).toUpperCase() ?? '?',
    };
  }
  if (player) {
    return {
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

function ScoreSide({ competitor, score, winner }) {
  return (
    <div className="text-center min-w-0">
      {competitor ? (
        <span
          className="inline-flex w-12 h-12 rounded-full items-center justify-center
                     text-white font-display text-lg border border-outline-variant/40"
          style={{
            background: `linear-gradient(135deg, ${competitor.primary_color}, ${competitor.secondary_color})`,
          }}
        >
          {competitor.initial}
        </span>
      ) : (
        <span className="inline-block w-12 h-12 rounded-full bg-surface-low border border-dashed
                         border-outline-variant" />
      )}
      <p className={`mt-2 text-sm truncate ${winner ? 'font-semibold text-ink' : 'text-ink-variant'}`}>
        {competitor?.name ?? 'TBD'}
      </p>
      <p className="font-display text-3xl text-ink mt-1 tabular-nums">{score ?? 0}</p>
    </div>
  );
}

// Segmented control for status. Each pill triggers updateMatch immediately
// and shows a spinner in place of its label while the request is in flight.
function StatusControl({ match }) {
  const updateMatch = useMatchStore((s) => s.updateMatch);
  const [pendingStatus, setPendingStatus] = useState(null);

  // Clear the pending intent once the store reflects the new status.
  useEffect(() => {
    if (pendingStatus && match.status === pendingStatus) setPendingStatus(null);
  }, [match.status, pendingStatus]);

  const handleClick = async (status) => {
    if (status === match.status || pendingStatus) return;
    setPendingStatus(status);
    const result = await updateMatch(match.id, { status });
    if (!result) setPendingStatus(null);
  };

  return (
    <div>
      <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mb-2">
        Status
      </p>
      <div className="flex flex-wrap gap-1.5 bg-white rounded-full border
                      border-outline-variant/40 p-1 shadow-card w-fit">
        {STATUSES.map((s) => {
          const isActive = s.value === match.status;
          const isPending = pendingStatus === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => handleClick(s.value)}
              disabled={!!pendingStatus}
              className={`px-3 py-1.5 rounded-full text-label-md font-label font-semibold
                         uppercase tracking-wider transition-colors flex items-center gap-1.5
                         disabled:cursor-not-allowed
                         ${isActive
                           ? s.activeClass
                           : 'text-ink-variant hover:text-primary'}`}
            >
              {isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : isActive && s.value === 'live' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse inline-block" />
              ) : null}
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Read the *live* match from the store rather than relying solely on the prop
// (which is just the snapshot captured when the modal was opened). This way
// score updates, status changes, etc. propagate without re-opening the modal.
function useLiveMatch(matchProp) {
  const matches = useMatchStore((s) => s.matches);
  if (!matchProp) return null;
  return matches.find((m) => m.id === matchProp.id) ?? matchProp;
}

export default function MatchDetailModal({ open, onClose, match: matchProp, isAdmin }) {
  const match = useLiveMatch(matchProp);
  const [logOpen, setLogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteEvent = useEventStore((s) => s.deleteEvent);

  if (!match) return null;

  const isPlayerMatch = !!(match.home_player_id || match.away_player_id);
  const home = asCompetitor(match.home_team, match.home_player);
  const away = asCompetitor(match.away_team, match.away_player);
  const homeWins = match.status === 'completed' && (
    (match.winner_id && match.winner_id === match.home_team_id) ||
    (match.winner_player_id && match.winner_player_id === match.home_player_id)
  );
  const awayWins = match.status === 'completed' && (
    (match.winner_id && match.winner_id === match.away_team_id) ||
    (match.winner_player_id && match.winner_player_id === match.away_player_id)
  );
  const currentStatusMeta = STATUSES.find((s) => s.value === match.status);

  const handleDeleteEvent = async (ev) => {
    if (!window.confirm('Remove this event from the log?')) return;
    await deleteEvent(ev.id);
  };

  return (
    <>
      <Modal
        open={open && !logOpen && !editOpen}
        onClose={onClose}
        title={match.round ?? 'Match'}
        subtitle={
          match.match_number ? `Match #${match.match_number}` : undefined
        }
      >
        <div className="space-y-5">
          {/* Scoreboard */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4
                          bg-surface-low rounded-md p-4">
            <ScoreSide competitor={home} score={match.home_score} winner={homeWins} />
            <span className="font-display text-headline-md text-ink-variant">vs</span>
            <ScoreSide competitor={away} score={match.away_score} winner={awayWins} />
          </div>

          {/* Status — admin gets the inline segmented control; viewers get a chip */}
          {isAdmin ? (
            <StatusControl match={match} />
          ) : (
            <div>
              <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mb-2">
                Status
              </p>
              <span className={`sc-chip capitalize ${currentStatusMeta?.activeClass ?? ''}`}>
                {match.status === 'live' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse mr-1 inline-block" />
                )}
                {match.status}
              </span>
            </div>
          )}

          {/* Admin actions — Log Event is football-style (goals/cards/subs)
              and not meaningful for solo sports like chess, so we hide it there. */}
          {isAdmin && (
            <div className="flex gap-2">
              {!isPlayerMatch && (
                <button onClick={() => setLogOpen(true)} className="sc-btn-secondary flex-1">
                  Log Event
                </button>
              )}
              <button onClick={() => setEditOpen(true)} className="sc-btn-primary flex-1">
                Edit Score
              </button>
            </div>
          )}

          {/* Event feed only applies to team / goal-based matches. */}
          {!isPlayerMatch && (
            <div>
              <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mb-2">
                Event Feed
              </p>
              <MatchEventLog
                matchId={match.id}
                isAdmin={isAdmin}
                onDelete={handleDeleteEvent}
              />
            </div>
          )}
        </div>
      </Modal>

      <LogEventModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        match={match}
      />
      <EditScoreModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        match={match}
      />
    </>
  );
}
