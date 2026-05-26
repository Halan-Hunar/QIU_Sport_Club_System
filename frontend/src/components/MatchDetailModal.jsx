import { useState } from 'react';
import Modal from './Modal';
import MatchEventLog from './MatchEventLog';
import LogEventModal from './LogEventModal';
import EditScoreModal from './EditScoreModal';
import { useEventStore } from '../store/eventStore';

const statusStyles = {
  scheduled: 'bg-surface-low text-ink-variant',
  live:      'bg-danger/15 text-danger',
  completed: 'bg-primary-container/30 text-primary',
  postponed: 'bg-secondary-container/40 text-secondary',
};

function ScoreSide({ team, score, winner }) {
  return (
    <div className="text-center min-w-0">
      {team ? (
        <span
          className="inline-flex w-12 h-12 rounded-full items-center justify-center
                     text-white font-display text-lg border border-outline-variant/40"
          style={{
            background: `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`,
          }}
        >
          {team.name.charAt(0).toUpperCase()}
        </span>
      ) : (
        <span className="inline-block w-12 h-12 rounded-full bg-surface-low border border-dashed
                         border-outline-variant" />
      )}
      <p className={`mt-2 text-sm truncate ${winner ? 'font-semibold text-ink' : 'text-ink-variant'}`}>
        {team?.name ?? 'TBD'}
      </p>
      <p className="font-display text-3xl text-ink mt-1 tabular-nums">{score ?? 0}</p>
    </div>
  );
}

export default function MatchDetailModal({ open, onClose, match, isAdmin }) {
  const [logOpen, setLogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const deleteEvent = useEventStore((s) => s.deleteEvent);

  if (!match) return null;

  const homeWins = match.status === 'completed' && match.winner_id === match.home_team_id;
  const awayWins = match.status === 'completed' && match.winner_id === match.away_team_id;

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
            <ScoreSide team={match.home_team} score={match.home_score} winner={homeWins} />
            <span className="font-display text-headline-md text-ink-variant">vs</span>
            <ScoreSide team={match.away_team} score={match.away_score} winner={awayWins} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className={`sc-chip capitalize ${statusStyles[match.status] ?? ''}`}>
              {match.status === 'live' && (
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse mr-1 inline-block" />
              )}
              {match.status}
            </span>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={() => setLogOpen(true)} className="sc-btn-secondary !py-1.5 !px-3 text-sm">
                  Log Event
                </button>
                <button onClick={() => setEditOpen(true)} className="sc-btn-primary !py-1.5 !px-3 text-sm">
                  Edit Score
                </button>
              </div>
            )}
          </div>

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
