import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';
import { useTournamentStore } from '../store/tournamentStore';

const GROUP_COUNT_OPTIONS = [2, 3, 4];

function groupLetter(idx) {
  return String.fromCharCode(65 + idx); // 0 → 'A'
}

// Build the working state from current registrations. `teams` is the array
// from the tournament fetch — each entry has shape { team, group_name, … }.
function buildInitialAssignments(teams, groupNames) {
  const next = Object.fromEntries(groupNames.map((g) => [g, []]));
  for (const r of teams) {
    if (r.group_name && next[r.group_name]) {
      next[r.group_name].push(r.team.id);
    }
  }
  return next;
}

export default function GroupDrawModal({ open, onClose, tournamentId, teams }) {
  const { assignGroups, saving, error, clearError } = useTournamentStore();

  // How many groups the admin wants for the draw.
  const [groupCount, setGroupCount] = useState(2);
  const groupNames = useMemo(
    () => Array.from({ length: groupCount }, (_, i) => `Group ${groupLetter(i)}`),
    [groupCount],
  );

  // assignments: { "Group A": [team_id, …], … }
  const [assignments, setAssignments] = useState({});
  const [savedMsg, setSavedMsg] = useState(false);

  // When the modal opens, pick an initial group count that fits any existing
  // assignments, then hydrate the assignment map from the registrations.
  useEffect(() => {
    if (!open) return;
    clearError();
    setSavedMsg(false);

    const existing = new Set(
      (teams || []).map((r) => r.group_name).filter(Boolean),
    );
    let initialCount = 2;
    if (existing.size > 2) {
      // Pick the smallest option that covers existing groups.
      initialCount = GROUP_COUNT_OPTIONS.find((n) => n >= existing.size) ?? 4;
    }
    const names = Array.from({ length: initialCount }, (_, i) => `Group ${groupLetter(i)}`);
    setGroupCount(initialCount);
    setAssignments(buildInitialAssignments(teams || [], names));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teams]);

  // Rebuild the assignment map whenever the count changes — preserve picks
  // that still fit, drop the ones whose group disappeared.
  useEffect(() => {
    setAssignments((prev) => {
      const next = Object.fromEntries(groupNames.map((g) => [g, []]));
      for (const g of groupNames) {
        if (prev[g]) next[g] = [...prev[g]];
      }
      return next;
    });
  }, [groupNames]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, saving]);

  const assignedIds = useMemo(() => {
    const s = new Set();
    for (const ids of Object.values(assignments)) {
      for (const id of ids) s.add(id);
    }
    return s;
  }, [assignments]);

  const unassigned = useMemo(
    () => (teams || []).filter((r) => !assignedIds.has(r.team.id)),
    [teams, assignedIds],
  );

  const allAssigned = unassigned.length === 0 && (teams || []).length > 0;

  const assignTo = (teamId, groupName) => {
    setAssignments((prev) => {
      const next = { ...prev };
      // Remove from any other group first
      for (const g of groupNames) {
        if (next[g]?.includes(teamId)) {
          next[g] = next[g].filter((id) => id !== teamId);
        }
      }
      next[groupName] = [...(next[groupName] ?? []), teamId];
      return next;
    });
  };

  const removeFromGroup = (teamId, groupName) => {
    setAssignments((prev) => ({
      ...prev,
      [groupName]: (prev[groupName] ?? []).filter((id) => id !== teamId),
    }));
  };

  const teamById = useMemo(() => {
    const m = new Map();
    for (const r of teams || []) m.set(r.team.id, r.team);
    return m;
  }, [teams]);

  const handleConfirm = async () => {
    if (!allAssigned || saving) return;
    const ok = await assignGroups(tournamentId, assignments);
    if (ok) {
      setSavedMsg(true);
      // Brief confirmation then close.
      setTimeout(() => {
        setSavedMsg(false);
        onClose();
      }, 900);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-ink/40 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !saving && onClose()}
        >
          <motion.div
            className="w-full max-w-5xl bg-white rounded-md shadow-card-hover
                       border border-outline-variant/40 flex flex-col
                       max-h-[95vh]"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-start justify-between gap-3
                            px-6 pt-6 pb-4 border-b border-outline-variant/30">
              <div>
                <h2 className="font-display text-headline-md text-ink tracking-wide">
                  Group Draw
                </h2>
                <p className="text-sm text-ink-variant mt-0.5">
                  Assign every registered team to a group before generating the bracket.
                </p>
              </div>
              <button
                onClick={() => !saving && onClose()}
                disabled={saving}
                className="w-8 h-8 rounded-full text-ink-variant hover:bg-surface-low
                           hover:text-primary flex items-center justify-center
                           transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
              {/* Group count selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-label text-label-md uppercase tracking-wider
                                 text-ink-variant">
                  Number of Groups
                </span>
                <div className="inline-flex bg-surface-low rounded-sm p-1">
                  {GROUP_COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setGroupCount(n)}
                      className={`px-3 py-1 rounded-sm text-sm font-semibold
                                  transition-colors ${groupCount === n
                                    ? 'bg-white text-primary shadow-card'
                                    : 'text-ink-variant hover:text-ink'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Unassigned pool */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-headline-md text-ink">
                    Unassigned
                  </h3>
                  <span className="text-xs font-label uppercase tracking-wider text-ink-variant">
                    {unassigned.length} team{unassigned.length === 1 ? '' : 's'}
                  </span>
                </div>
                {unassigned.length === 0 ? (
                  <div className="bg-surface-low rounded-sm py-6 text-center">
                    <p className="text-sm text-ink-variant">
                      All teams are assigned to a group.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unassigned.map((r) => (
                      <div key={r.team.id}
                           className="flex items-center gap-3 bg-white border border-outline-variant/40
                                      rounded-sm px-3 py-2">
                        <span
                          className="w-7 h-7 rounded-full flex-shrink-0 border border-outline-variant/40
                                     flex items-center justify-center text-white text-xs font-display"
                          style={{
                            background: `linear-gradient(135deg, ${r.team.primary_color}, ${r.team.secondary_color})`,
                          }}
                        >
                          {r.team.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 truncate text-ink">{r.team.name}</span>
                        <div className="flex flex-wrap gap-1">
                          {groupNames.map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => assignTo(r.team.id, g)}
                              className="px-2.5 py-1 rounded-sm text-xs font-label
                                         font-semibold uppercase tracking-wider
                                         text-primary border border-primary-container
                                         hover:bg-primary-container/20 transition-colors"
                            >
                              → {g.replace('Group ', '')}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Groups grid */}
              <section>
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(groupCount, 4)}, minmax(0, 1fr))`,
                  }}
                >
                  {groupNames.map((g) => {
                    const ids = assignments[g] ?? [];
                    return (
                      <div key={g}
                           className="bg-surface-low rounded-md border border-outline-variant/30
                                      p-3 flex flex-col gap-2 min-h-[120px]">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-headline-md text-ink">
                            {g}
                          </span>
                          <span className="text-xs font-label uppercase tracking-wider text-ink-variant">
                            {ids.length} team{ids.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        {ids.length === 0 ? (
                          <p className="text-xs text-ink-variant italic mt-1">
                            No teams yet.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {ids.map((id) => {
                              const team = teamById.get(id);
                              if (!team) return null;
                              return (
                                <div key={id}
                                     className="flex items-center gap-2 bg-white rounded-sm
                                                px-2 py-1.5 border border-outline-variant/30">
                                  <span
                                    className="w-5 h-5 rounded-full flex-shrink-0
                                               flex items-center justify-center text-white
                                               text-[10px] font-display"
                                    style={{
                                      background: `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`,
                                    }}
                                  >
                                    {team.name.charAt(0).toUpperCase()}
                                  </span>
                                  <span className="flex-1 truncate text-ink text-sm">
                                    {team.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeFromGroup(id, g)}
                                    className="w-6 h-6 rounded-full text-ink-variant
                                               hover:text-danger hover:bg-danger-container
                                               flex items-center justify-center transition-colors"
                                    aria-label={`Remove ${team.name} from ${g}`}
                                  >
                                    <X size={12} strokeWidth={2.5} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {error && (
                <div className="bg-danger-container text-danger-on-container
                                rounded-sm px-3 py-2 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex items-center justify-between gap-3
                            px-6 py-4 border-t border-outline-variant/30 bg-white">
              <p className="text-xs text-ink-variant">
                {allAssigned
                  ? 'All teams are placed. Confirm the draw to save.'
                  : `Assign all ${(teams || []).length} teams to a group to enable Confirm.`}
              </p>
              <div className="flex items-center gap-2">
                {savedMsg && (
                  <span className="inline-flex items-center gap-1 text-sm font-label
                                   uppercase tracking-wider text-primary">
                    <Check size={14} strokeWidth={2.5} />
                    Saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="sc-btn-secondary !py-2 !px-4"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!allAssigned || saving}
                  className="sc-btn-primary !py-2 !px-4"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Confirm Draw'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
