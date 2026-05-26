import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEventStore } from '../store/eventStore';

const eventLabels = {
  goal:         { label: 'Goal',           icon: '⚽' },
  own_goal:     { label: 'Own Goal',       icon: '🥅' },
  yellow_card:  { label: 'Yellow Card',    icon: '🟨' },
  red_card:     { label: 'Red Card',       icon: '🟥' },
  substitution: { label: 'Substitution',   icon: '🔁' },
};

function formatMinute(m) {
  if (m == null) return "—'";
  return `${m}'`;
}

export default function MatchEventLog({ matchId, isAdmin, onDelete }) {
  const { events, loading, error, fetchEvents, subscribeToEvents, unsubscribe } = useEventStore();

  useEffect(() => {
    if (!matchId) return;
    fetchEvents(matchId);
    subscribeToEvents(matchId);
    return () => unsubscribe();
  }, [matchId, fetchEvents, subscribeToEvents, unsubscribe]);

  if (loading && events.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-surface-low rounded-sm animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
        {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-surface-low rounded-sm py-8 text-center">
        <p className="text-ink-variant text-sm">No events yet.</p>
      </div>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto pr-1 space-y-1">
      <AnimatePresence initial={false}>
        {events.map((ev) => {
          const meta = eventLabels[ev.event_type] ?? { label: ev.event_type, icon: '•' };
          return (
            <motion.div
              key={ev.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-3 bg-white rounded-sm border
                         border-outline-variant/30 px-3 py-2 group"
            >
              <span className="font-display text-headline-md text-ink-variant w-10
                               tabular-nums text-center">
                {formatMinute(ev.minute)}
              </span>
              <span className="text-lg">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">
                  {meta.label}
                  {ev.player && (
                    <span className="text-ink-variant font-normal">
                      {' '}— {ev.player.name}
                      {ev.player.jersey_number != null && (
                        <span className="text-ink-variant"> #{ev.player.jersey_number}</span>
                      )}
                    </span>
                  )}
                </p>
                {ev.team && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: ev.team.primary_color }}
                    />
                    <span className="text-xs text-ink-variant truncate">{ev.team.name}</span>
                  </div>
                )}
                {ev.notes && (
                  <p className="text-xs text-ink-variant italic mt-0.5">{ev.notes}</p>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => onDelete?.(ev)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity
                             text-ink-variant hover:text-danger"
                  aria-label="Delete event"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2.5">
                    <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
