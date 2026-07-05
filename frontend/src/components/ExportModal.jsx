import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import {
  X, Download, Loader2, Smartphone, Image as ImageIcon, Square,
  GitBranch, ListChecks, Trophy, LayoutGrid, Target, ShieldCheck, Users,
} from 'lucide-react';
import ExportCanvas from './ExportCanvas';

const ASPECT_OPTIONS = [
  { id: '9:16', label: 'Stories',  size: '1080×1920', icon: Smartphone, w: 1080, h: 1920 },
  { id: '3:4',  label: 'Portrait', size: '1080×1440', icon: ImageIcon,  w: 1080, h: 1440 },
  { id: '1:1',  label: 'Square',   size: '1080×1080', icon: Square,     w: 1080, h: 1080 },
];

const TYPE_OPTIONS = [
  { id: 'bracket',         label: 'Bracket',         icon: GitBranch },
  { id: 'results',         label: 'Results',         icon: ListChecks },
  { id: 'standings',       label: 'Standings',       icon: Trophy },
  { id: 'group_standings', label: 'Group Standings', icon: Users },
];

const STATS_TYPE_OPTIONS = [
  { id: 'stats_overview', label: 'Overview',     icon: LayoutGrid,  applicableKey: null },
  { id: 'champion',       label: 'Champion',     icon: Trophy,      applicableKey: 'champion_stats' },
  { id: 'top_scorers',    label: 'Top Scorers',  icon: Target,      applicableKey: 'top_scorer' },
  { id: 'clean_sheets',   label: 'Clean Sheets', icon: ShieldCheck, applicableKey: 'clean_sheet' },
];

function extractRounds(matches) {
  const seen = new Map();
  const sorted = [...matches].sort(
    (a, b) => (a.match_number ?? 0) - (b.match_number ?? 0),
  );
  for (const m of sorted) {
    if (!m.round) continue;
    if (!seen.has(m.round)) seen.set(m.round, true);
  }
  return [...seen.keys()];
}

function describeMatchup(m) {
  const home =
    m.home_team?.name || m.home_player?.name || 'TBD';
  const away =
    m.away_team?.name || m.away_player?.name || 'TBD';
  return `${home} vs ${away}`;
}

export default function ExportModal({
  open, onClose, tournament, matches, standings, stats,
}) {
  // Stats mode is implied by the presence of a stats payload.
  const isStatsMode = !!stats;
  const applicable = stats?.applicable || [];
  const availableStatsTypes = useMemo(
    () => STATS_TYPE_OPTIONS.filter(
      (o) => !o.applicableKey || applicable.includes(o.applicableKey),
    ),
    [applicable],
  );

  const allRounds = useMemo(() => extractRounds(matches || []), [matches]);

  // For Results we let admins pick any match — completed or not — so an
  // upcoming-fixtures graphic is possible too.
  const selectableMatches = useMemo(() => {
    return [...(matches || [])].sort((a, b) => {
      const ra = a.round || '';
      const rb = b.round || '';
      if (ra !== rb) return ra.localeCompare(rb);
      return (a.match_number ?? 0) - (b.match_number ?? 0);
    });
  }, [matches]);

  const completedIds = useMemo(
    () => selectableMatches.filter((m) => m.status === 'completed').map((m) => m.id),
    [selectableMatches],
  );

  const supportsStandings =
    tournament?.format === 'round_robin' || tournament?.format === 'group_knockout';
  const supportsGroupStandings = tournament?.format === 'group_knockout';

  const availableGroups = useMemo(() => {
    if (!supportsGroupStandings) return [];
    const names = new Set();
    (standings || []).forEach((r) => { if (r.group_name) names.add(r.group_name); });
    return [...names].sort();
  }, [standings, supportsGroupStandings]);

  const [type, setType] = useState(isStatsMode ? (availableStatsTypes[0]?.id || 'stats_overview') : 'bracket');
  const [selectedGroup, setSelectedGroup] = useState(availableGroups[0] || '');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [selectedRounds, setSelectedRounds] = useState(allRounds);
  const [selectedMatchIds, setSelectedMatchIds] = useState(completedIds);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(0.25);

  useEffect(() => {
    if (!open) return;
    setSelectedRounds(allRounds);
    setSelectedMatchIds(completedIds);
    setError(null);
    if (availableGroups.length && !availableGroups.includes(selectedGroup)) {
      setSelectedGroup(availableGroups[0]);
    }
    // Reset to a valid default for the current mode each time the modal opens.
    if (isStatsMode) {
      const first = availableStatsTypes[0]?.id;
      if (first && !availableStatsTypes.some((o) => o.id === type)) setType(first);
    } else if (!['bracket', 'results', 'standings', 'group_standings'].includes(type)) {
      setType('bracket');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, allRounds, completedIds, isStatsMode, availableGroups]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !downloading && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, downloading]);

  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const el = previewRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const dim = ASPECT_OPTIONS.find((a) => a.id === aspectRatio);
      if (!dim) return;
      const scale = Math.min(width / dim.w, height / dim.h);
      setPreviewScale(scale > 0 ? scale : 0.25);
    };
    compute();
    window.addEventListener('resize', compute);
    const t = setTimeout(compute, 50);
    return () => {
      window.removeEventListener('resize', compute);
      clearTimeout(t);
    };
  }, [open, aspectRatio]);

  useEffect(() => {
    if (type === 'standings' && !supportsStandings) setType('bracket');
    if (type === 'group_standings' && !supportsGroupStandings) setType('bracket');
  }, [type, supportsStandings, supportsGroupStandings]);

  const toggleRound = (round) => {
    setSelectedRounds((prev) =>
      prev.includes(round) ? prev.filter((r) => r !== round) : [...prev, round],
    );
  };

  const toggleMatch = (id) => {
    setSelectedMatchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleRoundMatches = (round, allSelected) => {
    const idsInRound = selectableMatches.filter((m) => m.round === round).map((m) => m.id);
    setSelectedMatchIds((prev) => {
      if (allSelected) return prev.filter((id) => !idsInRound.includes(id));
      const next = new Set(prev);
      idsInRound.forEach((id) => next.add(id));
      return [...next];
    });
  };

  const handleDownload = async () => {
    if (!canvasRef.current || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const dim = ASPECT_OPTIONS.find((a) => a.id === aspectRatio);
      const dataUrl = await toPng(canvasRef.current, {
        width: dim.w,
        height: dim.h,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#06334e',
      });
      const link = document.createElement('a');
      const safeName = (tournament?.name || 'tournament').replace(/[^a-z0-9-_]+/gi, '_');
      link.download = `${safeName}-${type}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      setError(err?.message || 'Export failed.');
    } finally {
      setDownloading(false);
    }
  };

  const orderedSelectedRounds = useMemo(
    () => allRounds.filter((r) => selectedRounds.includes(r)),
    [allRounds, selectedRounds],
  );

  const filteredResultMatches = useMemo(
    () => selectableMatches.filter((m) => selectedMatchIds.includes(m.id)),
    [selectableMatches, selectedMatchIds],
  );

  // Pick which matches go to the canvas based on the export type
  const canvasMatches = type === 'results' ? filteredResultMatches : matches;

  // For the group_standings export, narrow standings to just the chosen group
  // and re-sort by the same tie-breakers the backend uses.
  const canvasStandings = useMemo(() => {
    if (type !== 'group_standings') return standings;
    return (standings || [])
      .filter((r) => r.group_name === selectedGroup)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
        return b.goals_for - a.goals_for;
      });
  }, [type, standings, selectedGroup]);

  const dim = ASPECT_OPTIONS.find((a) => a.id === aspectRatio);

  // Results: group selectable matches by round for the checklist UI
  const resultsByRound = useMemo(() => {
    const map = new Map();
    selectableMatches.forEach((m) => {
      const k = m.round || 'Round';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(m);
    });
    return [...map.entries()];
  }, [selectableMatches]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-ink/40 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !downloading && onClose()}
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
                  {isStatsMode ? 'Export Stats' : 'Export Tournament'}
                </h2>
                <p className="text-sm text-ink-variant mt-0.5">
                  Generate a styled PNG ready for social.
                </p>
              </div>
              <button
                onClick={() => !downloading && onClose()}
                disabled={downloading}
                className="w-8 h-8 rounded-full text-ink-variant hover:bg-surface-low
                           hover:text-primary flex items-center justify-center
                           transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Body — two-panel layout */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-0">
                {/* LEFT — controls */}
                <div className="p-6 space-y-6 border-b md:border-b-0
                                md:border-r border-outline-variant/30">
                  {/* Export type */}
                  <div>
                    <p className="font-label text-label-md uppercase tracking-wider
                                  text-ink-variant mb-2">Export Type</p>
                    {isStatsMode ? (
                      <div
                        className="grid gap-1 bg-surface-low rounded-sm p-1"
                        style={{ gridTemplateColumns: `repeat(${Math.max(availableStatsTypes.length, 1)}, minmax(0, 1fr))` }}
                      >
                        {availableStatsTypes.map((opt) => {
                          const Icon = opt.icon;
                          const active = type === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setType(opt.id)}
                              className={`flex flex-col items-center gap-1 py-2 px-2
                                          rounded-sm text-xs font-medium transition-all
                                          ${active
                                            ? 'bg-white text-primary shadow-card'
                                            : 'text-ink-variant hover:text-ink'}`}
                            >
                              <Icon size={16} strokeWidth={2} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        className="grid gap-1 bg-surface-low rounded-sm p-1"
                        style={{ gridTemplateColumns: `repeat(${supportsGroupStandings ? 4 : 3}, minmax(0, 1fr))` }}
                      >
                        {TYPE_OPTIONS
                          .filter((opt) => opt.id !== 'group_standings' || supportsGroupStandings)
                          .map((opt) => {
                          const Icon = opt.icon;
                          const disabled = opt.id === 'standings' && !supportsStandings;
                          const active = type === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => !disabled && setType(opt.id)}
                              disabled={disabled}
                              className={`flex flex-col items-center gap-1 py-2 px-2
                                          rounded-sm text-xs font-medium transition-all
                                          ${active
                                            ? 'bg-white text-primary shadow-card'
                                            : 'text-ink-variant hover:text-ink'}
                                          ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                            >
                              <Icon size={16} strokeWidth={2} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {!isStatsMode && !supportsStandings && (
                      <p className="text-xs text-ink-variant mt-2">
                        Standings export is only for round-robin and group formats.
                      </p>
                    )}
                  </div>

                  {/* Group picker (group_standings only) */}
                  {!isStatsMode && type === 'group_standings' && (
                    <div>
                      <p className="font-label text-label-md uppercase tracking-wider
                                    text-ink-variant mb-2">Group</p>
                      {availableGroups.length === 0 ? (
                        <p className="text-sm text-ink-variant">
                          No groups in the standings yet.
                        </p>
                      ) : (
                        <select
                          value={selectedGroup}
                          onChange={(e) => setSelectedGroup(e.target.value)}
                          className="w-full bg-white border border-outline-variant/40
                                     rounded-sm px-3 py-2 text-ink focus:outline-none
                                     focus:border-primary"
                        >
                          {availableGroups.map((g) => (
                            <option key={g} value={g}>Group {g}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Rounds (bracket only) */}
                  {!isStatsMode && type === 'bracket' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-label text-label-md uppercase tracking-wider
                                      text-ink-variant">Rounds</p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedRounds(allRounds)}
                            className="text-xs text-primary hover:text-primary/70 transition-colors"
                          >
                            All
                          </button>
                          <span className="text-xs text-outline">·</span>
                          <button
                            type="button"
                            onClick={() => setSelectedRounds([])}
                            className="text-xs text-ink-variant hover:text-ink transition-colors"
                          >
                            None
                          </button>
                        </div>
                      </div>
                      {allRounds.length === 0 ? (
                        <p className="text-sm text-ink-variant">
                          No matches yet — generate a bracket first.
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                          {allRounds.map((round) => {
                            const checked = selectedRounds.includes(round);
                            return (
                              <label
                                key={round}
                                className={`flex items-center gap-3 px-3 py-2 rounded-sm
                                            border cursor-pointer transition-colors
                                            ${checked
                                              ? 'border-primary-container bg-primary-container/10'
                                              : 'border-outline-variant/40 hover:bg-surface-low'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleRound(round)}
                                  className="w-4 h-4 accent-primary"
                                />
                                <span className="text-ink text-sm flex-1">{round}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Matches (results only) */}
                  {!isStatsMode && type === 'results' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-label text-label-md uppercase tracking-wider
                                      text-ink-variant">Matches</p>
                        <div className="flex gap-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedMatchIds(selectableMatches.map((m) => m.id))}
                            className="text-primary hover:text-primary/70 transition-colors"
                          >
                            All
                          </button>
                          <span className="text-outline">·</span>
                          <button
                            type="button"
                            onClick={() => setSelectedMatchIds(completedIds)}
                            className="text-primary hover:text-primary/70 transition-colors"
                          >
                            Completed
                          </button>
                          <span className="text-outline">·</span>
                          <button
                            type="button"
                            onClick={() => setSelectedMatchIds([])}
                            className="text-ink-variant hover:text-ink transition-colors"
                          >
                            None
                          </button>
                        </div>
                      </div>
                      {selectableMatches.length === 0 ? (
                        <p className="text-sm text-ink-variant">
                          No matches to choose from.
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {resultsByRound.map(([round, ms]) => {
                            const inRoundIds = ms.map((m) => m.id);
                            const allChecked = inRoundIds.every((id) => selectedMatchIds.includes(id));
                            return (
                              <div key={round}>
                                <button
                                  type="button"
                                  onClick={() => toggleRoundMatches(round, allChecked)}
                                  className="w-full flex items-center justify-between
                                             text-left px-1 py-1 group"
                                >
                                  <span className="font-label text-label-md uppercase tracking-wider
                                                   text-ink-variant group-hover:text-ink transition-colors">
                                    {round}
                                  </span>
                                  <span className="text-xs text-primary opacity-0 group-hover:opacity-100
                                                   transition-opacity">
                                    {allChecked ? 'Deselect all' : 'Select all'}
                                  </span>
                                </button>
                                <div className="space-y-1 mt-1">
                                  {ms.map((m) => {
                                    const checked = selectedMatchIds.includes(m.id);
                                    const done = m.status === 'completed';
                                    return (
                                      <label
                                        key={m.id}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-sm
                                                    border cursor-pointer transition-colors
                                                    ${checked
                                                      ? 'border-primary-container bg-primary-container/10'
                                                      : 'border-outline-variant/40 hover:bg-surface-low'}`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleMatch(m.id)}
                                          className="w-4 h-4 accent-primary"
                                        />
                                        <span className="text-ink text-sm flex-1 truncate">
                                          #{m.match_number} · {describeMatchup(m)}
                                        </span>
                                        {done ? (
                                          <span className="text-xs font-label uppercase tracking-wider
                                                          text-primary tabular-nums">
                                            {m.home_score ?? 0}–{m.away_score ?? 0}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-label uppercase tracking-wider
                                                          text-ink-variant">
                                            {m.status}
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aspect ratio */}
                  <div>
                    <p className="font-label text-label-md uppercase tracking-wider
                                  text-ink-variant mb-2">Aspect Ratio</p>
                    <div className="grid grid-cols-3 gap-2">
                      {ASPECT_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const active = aspectRatio === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAspectRatio(opt.id)}
                            className={`flex flex-col items-center gap-1 py-3 px-2
                                        rounded-sm border transition-all
                                        ${active
                                          ? 'border-primary bg-primary-container/10 text-primary'
                                          : 'border-outline-variant/40 text-ink-variant hover:bg-surface-low'}`}
                          >
                            <Icon size={18} strokeWidth={2} />
                            <span className="text-xs font-semibold">{opt.id}</span>
                            <span className="text-[10px] text-ink-variant">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-danger-container text-danger-on-container
                                    rounded-sm px-3 py-2 text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="sc-btn-primary w-full"
                  >
                    {downloading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Exporting…
                      </>
                    ) : (
                      <>
                        <Download size={16} strokeWidth={2.25} />
                        Download PNG
                      </>
                    )}
                  </button>
                </div>

                {/* RIGHT — preview */}
                <div className="p-6 bg-surface-low/40">
                  <p className="font-label text-label-md uppercase tracking-wider
                                text-ink-variant mb-2">Preview</p>
                  <div
                    ref={previewRef}
                    className="w-full bg-ink/5 rounded-md border border-outline-variant/40
                               overflow-hidden flex items-center justify-center"
                    style={{ height: 'min(60vh, 520px)' }}
                  >
                    <div
                      style={{
                        width: dim.w * previewScale,
                        height: dim.h * previewScale,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          transform: `scale(${previewScale})`,
                          transformOrigin: 'top left',
                          width: dim.w,
                          height: dim.h,
                        }}
                      >
                        <ExportCanvas
                          type={type}
                          tournament={tournament}
                          matches={canvasMatches}
                          standings={canvasStandings}
                          stats={stats}
                          rounds={orderedSelectedRounds}
                          aspectRatio={aspectRatio}
                          groupName={selectedGroup}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-ink-variant mt-2 text-center">
                    {dim.size} · {dim.id}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Off-screen full-resolution canvas for export capture */}
          <div
            style={{
              position: 'fixed',
              left: -9999,
              top: -9999,
              width: dim.w,
              height: dim.h,
              pointerEvents: 'none',
            }}
            aria-hidden
          >
            <ExportCanvas
              ref={canvasRef}
              type={type}
              tournament={tournament}
              matches={canvasMatches}
              standings={canvasStandings}
              stats={stats}
              rounds={orderedSelectedRounds}
              aspectRatio={aspectRatio}
              groupName={selectedGroup}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
