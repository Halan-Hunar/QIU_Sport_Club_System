import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useTournamentStore } from '../store/tournamentStore';
import { useTeamStore } from '../store/teamStore';
import { useMatchStore } from '../store/matchStore';
import { usePlayerStore } from '../store/playerStore';
import CreateTournamentModal from '../components/CreateTournamentModal';
import Modal from '../components/Modal';
import PlayerDetailModal from '../components/PlayerDetailModal';
import { Trophy, Plus, X, Loader2, UserPlus, Share2 } from 'lucide-react';
import Bracket from '../components/Bracket';
import StandingsTable from '../components/StandingsTable';
import MatchCard from '../components/MatchCard';
import MatchDetailModal from '../components/MatchDetailModal';
import ExportModal from '../components/ExportModal';
import GroupDrawModal from '../components/GroupDrawModal';

const formatLabels = {
  single_elim:    'Single Elimination',
  double_elim:    'Double Elimination',
  round_robin:    'Round Robin',
  group_knockout: 'Group + Knockout',
};

function formatDateRange(start, end) {
  if (!start && !end) return 'Dates TBD';
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  const fmt = (d) => new Date(d).toLocaleDateString(undefined, opts);
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  return fmt(start || end);
}

function RegisterTeamModal({ open, onClose, tournamentId, registeredIds }) {
  const { teams, fetchTeams } = useTeamStore();
  const { registerTeam, error, clearError } = useTournamentStore();
  const [selected, setSelected] = useState(() => new Set());
  // Tracks per-team status during the bulk register run: 'pending' | 'done' | 'failed'
  const [progress, setProgress] = useState({});
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTeams();
      setSelected(new Set());
      setProgress({});
      setRunning(false);
      clearError();
    }
  }, [open, fetchTeams, clearError]);

  const available = useMemo(
    () => teams.filter((t) => !registeredIds.has(t.id)),
    [teams, registeredIds],
  );

  const toggle = (id) => {
    if (running) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.size === 0 || running) return;
    setRunning(true);
    const ids = [...selected];
    setProgress(Object.fromEntries(ids.map((id) => [id, 'pending'])));

    let anyFailed = false;
    for (const teamId of ids) {
      const result = await registerTeam(tournamentId, { team_id: teamId });
      setProgress((p) => ({ ...p, [teamId]: result ? 'done' : 'failed' }));
      if (!result) anyFailed = true;
    }
    setRunning(false);
    if (!anyFailed) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={running ? () => {} : onClose}
      title="Register Teams"
      subtitle="Select one or more teams to register."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {available.length === 0 ? (
          <div className="bg-surface-low rounded-sm py-8 text-center">
            <p className="text-ink-variant text-sm">
              {teams.length === 0 ? 'Loading teams…' : 'All teams are already registered.'}
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto -mx-1 pr-1 space-y-1">
            {available.map((t) => {
              const state = progress[t.id];
              const isChecked = selected.has(t.id);
              return (
                <label
                  key={t.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-sm border
                              transition-colors cursor-pointer
                              ${isChecked
                                ? 'border-primary-container bg-primary-container/10'
                                : 'border-outline-variant/40 hover:bg-surface-low'}
                              ${running ? 'cursor-default opacity-90' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(t.id)}
                    disabled={running}
                    className="w-4 h-4 accent-primary"
                  />
                  <span
                    className="w-7 h-7 rounded-full flex-shrink-0 border border-outline-variant/40
                               flex items-center justify-center text-white text-xs font-display"
                    style={{
                      background: `linear-gradient(135deg, ${t.primary_color}, ${t.secondary_color})`,
                    }}
                  >
                    {t.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-ink">{t.name}</span>
                  {state === 'pending' && (
                    <Loader2 size={16} className="animate-spin text-primary" aria-label="Registering" />
                  )}
                  {state === 'done' && (
                    <span className="text-xs font-label uppercase tracking-wider text-primary">
                      Done
                    </span>
                  )}
                  {state === 'failed' && (
                    <span className="text-xs font-label uppercase tracking-wider text-danger">
                      Failed
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {error && (
          <div className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={running}
            className="sc-btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={selected.size === 0 || running || available.length === 0}
            className="sc-btn-primary flex-1"
          >
            {running
              ? `Registering ${selected.size}…`
              : `Register ${selected.size || ''} ${selected.size === 1 ? 'Team' : 'Teams'}`.trim()}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RegisterPlayersModal({ open, onClose, tournamentId, sportFilter, registeredIds }) {
  const players = usePlayerStore((s) => s.players);
  const fetchPlayers = usePlayerStore((s) => s.fetchPlayers);
  const { registerPlayer, error, clearError } = useTournamentStore();
  const [selected, setSelected] = useState(() => new Set());
  const [progress, setProgress] = useState({});
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (open) {
      fetchPlayers({ standalone: true, sport: sportFilter || null });
      setSelected(new Set());
      setProgress({});
      setRunning(false);
      clearError();
    }
  }, [open, fetchPlayers, sportFilter, clearError]);

  const available = useMemo(
    () => players.filter((p) => !registeredIds.has(p.id)),
    [players, registeredIds],
  );

  const toggle = (id) => {
    if (running) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.size === 0 || running) return;
    setRunning(true);
    const ids = [...selected];
    setProgress(Object.fromEntries(ids.map((id) => [id, 'pending'])));

    let anyFailed = false;
    for (const playerId of ids) {
      const result = await registerPlayer(tournamentId, { player_id: playerId });
      setProgress((p) => ({ ...p, [playerId]: result ? 'done' : 'failed' }));
      if (!result) anyFailed = true;
    }
    setRunning(false);
    if (!anyFailed) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={running ? () => {} : onClose}
      title="Register Players"
      subtitle={
        sportFilter
          ? `Showing standalone players tagged for ${sportFilter.replace(/_/g, ' ')}.`
          : 'Select individual players for this tournament.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {available.length === 0 ? (
          <div className="bg-surface-low rounded-sm py-8 text-center">
            <p className="text-ink-variant text-sm">
              {players.length === 0
                ? (sportFilter
                    ? `No standalone players are tagged for "${sportFilter.replace(/_/g, ' ')}" yet — add or edit players on the Players page and pick this sport.`
                    : 'No standalone players exist yet — add some on the Players page first.')
                : 'All matching standalone players are already registered.'}
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto -mx-1 pr-1 space-y-1">
            {available.map((p) => {
              const state = progress[p.id];
              const isChecked = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-sm border
                              transition-colors cursor-pointer
                              ${isChecked
                                ? 'border-primary-container bg-primary-container/10'
                                : 'border-outline-variant/40 hover:bg-surface-low'}
                              ${running ? 'cursor-default opacity-90' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(p.id)}
                    disabled={running}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="w-7 h-7 rounded-full bg-primary text-white flex-shrink-0
                                   flex items-center justify-center text-xs font-display">
                    {p.jersey_number != null
                      ? String(p.jersey_number).padStart(2, '0')
                      : p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-ink">{p.name}</span>
                  <span className="font-label text-label-md uppercase tracking-wider text-ink-variant">
                    {p.position ?? 'N/A'}
                  </span>
                  {state === 'pending' && (
                    <Loader2 size={16} className="animate-spin text-primary" aria-label="Registering" />
                  )}
                  {state === 'done' && (
                    <span className="text-xs font-label uppercase tracking-wider text-primary">Done</span>
                  )}
                  {state === 'failed' && (
                    <span className="text-xs font-label uppercase tracking-wider text-danger">Failed</span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {error && (
          <div className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={running} className="sc-btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={selected.size === 0 || running || available.length === 0}
            className="sc-btn-primary flex-1"
          >
            {running
              ? `Registering ${selected.size}…`
              : `Register ${selected.size || ''} ${selected.size === 1 ? 'Player' : 'Players'}`.trim()}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatTile({ label, value, accent = 'primary' }) {
  const colors = {
    primary: 'border-l-primary-container text-primary',
    secondary: 'border-l-secondary-container text-secondary',
    tertiary: 'border-l-tertiary-container text-tertiary',
  };
  return (
    <div className={`bg-white rounded-md border border-outline-variant/30 shadow-card
                     border-l-4 ${colors[accent]} px-4 py-3`}>
      <p className="font-label text-label-md uppercase tracking-wider text-ink-variant">
        {label}
      </p>
      <p className="font-display text-headline-lg leading-none mt-1">{value}</p>
    </div>
  );
}

export default function TournamentDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const {
    current, loading, error,
    fetchTournamentById, unregisterTeam, unregisterPlayer, deleteTournament,
  } = useTournamentStore();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [openMatch, setOpenMatch] = useState(null);
  const [openPlayerId, setOpenPlayerId] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [groupDrawOpen, setGroupDrawOpen] = useState(false);
  const [stageView, setStageView] = useState('group'); // group_knockout only

  const {
    matches, standings, saving: matchSaving, error: matchError,
    fetchMatches, fetchStandings, generateBracket, advanceGroups,
    subscribeToMatches, unsubscribe,
  } = useMatchStore();

  useEffect(() => { fetchTournamentById(id); }, [id, fetchTournamentById]);

  useEffect(() => {
    fetchMatches(id);
    subscribeToMatches(id);
    return () => unsubscribe();
  }, [id, fetchMatches, subscribeToMatches, unsubscribe]);

  // Re-fetch standings when matches change (round-robin / group)
  useEffect(() => {
    if (!current) return;
    const fmt = current.tournament.format;
    if (fmt === 'round_robin' || fmt === 'group_knockout') {
      fetchStandings(id);
    }
  }, [current, matches, fetchStandings, id]);

  const registeredIds = useMemo(
    () => new Set((current?.teams ?? []).map((r) => r.team.id)),
    [current],
  );
  const registeredPlayerIds = useMemo(
    () => new Set((current?.players ?? []).map((r) => r.player.id)),
    [current],
  );

  const handleUnregister = async (teamId, teamName) => {
    if (!window.confirm(`Remove "${teamName}" from this tournament?`)) return;
    await unregisterTeam(id, teamId);
  };

  const handleUnregisterPlayer = async (playerId, playerName) => {
    if (!window.confirm(`Remove "${playerName}" from this tournament?`)) return;
    await unregisterPlayer(id, playerId);
  };

  const handleDelete = async () => {
    if (!current) return;
    if (!window.confirm(`Delete tournament "${current.tournament.name}"? This removes all matches and registrations.`)) return;
    const ok = await deleteTournament(id);
    if (ok) window.history.back();
  };

  const handleAdvanceGroups = async () => {
    if (!window.confirm(
      'This will generate Semi Final matches based on current standings. Are you sure?',
    )) return;
    const ok = await advanceGroups(id);
    if (ok) setStageView('knockout');
  };

  const handleGenerate = async () => {
    if (!current) return;
    const verb = matches.length > 0 ? 'Regenerate' : 'Generate';
    if (!window.confirm(`${verb} the bracket? Any existing matches for this tournament will be replaced.`)) return;
    await generateBracket(id);
  };

  if (loading || !current) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="h-48 bg-surface-low rounded-md animate-pulse mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-white border border-outline-variant/30
                                    rounded-sm animate-pulse" />
          ))}
        </div>
        {error && (
          <p className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm mt-4">
            {error}
          </p>
        )}
      </div>
    );
  }

  const { tournament, teams } = current;
  const players = current.players ?? [];
  const isIndividual = !!tournament.is_individual;
  const isBracketFormat = tournament.format === 'single_elim' || tournament.format === 'double_elim';
  const isGroupKnockout = tournament.format === 'group_knockout';

  const groupMatches = isGroupKnockout
    ? matches.filter((m) => m.round?.startsWith('Group '))
    : [];
  const knockoutMatches = isGroupKnockout
    ? matches.filter((m) => !m.round?.startsWith('Group '))
    : [];
  const hasKnockout = knockoutMatches.length > 0;
  const groupStarted = standings.some((r) => (r.played ?? 0) > 0);
  const showAdvanceButton = isAdmin
    && isGroupKnockout
    && stageView === 'group'
    && groupMatches.length > 0
    && groupStarted
    && !hasKnockout;

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb */}
      <nav className="text-sm text-ink-variant mb-4 flex items-center gap-2">
        <Link to="/tournaments" className="hover:text-primary transition-colors">Tournaments</Link>
        <span className="text-outline">›</span>
        <span className="text-primary font-semibold">{tournament.name}</span>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-lg shadow-card p-6 sm:p-10 mb-8
                          bg-gradient-to-br from-primary to-secondary text-white">
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full
                        bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`sc-chip bg-white/20 text-white capitalize`}>
                {tournament.status}
              </span>
              <span className="sc-chip bg-white/15 text-white capitalize">
                {tournament.sport_type}
              </span>
              <span className="sc-chip bg-white/15 text-white">
                {formatLabels[tournament.format] ?? tournament.format}
              </span>
            </div>

            <h1 className="font-display text-headline-lg sm:text-display-lg mt-3 leading-tight">
              {tournament.name}
            </h1>

            <p className="mt-3 text-white/90">
              {formatDateRange(tournament.start_date, tournament.end_date)}
            </p>

            {tournament.description && (
              <p className="mt-3 text-white/80 max-w-2xl">{tournament.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Link
              to={`/tournaments/${id}/stats`}
              className="sc-btn-secondary !bg-white/15 !border-white/30 !text-white
                         hover:!bg-white/25 text-center"
            >
              <Trophy size={16} strokeWidth={2.25} />
              Stats
            </Link>
            {isAdmin && (
              <>
                <button
                  onClick={() => setExportOpen(true)}
                  className="sc-btn-secondary !bg-white/15 !border-white/30 !text-white
                             hover:!bg-white/25"
                >
                  <Share2 size={16} strokeWidth={2.25} />
                  Export
                </button>
                <button
                  onClick={() => setEditOpen(true)}
                  className="sc-btn-secondary !bg-white/15 !border-white/30 !text-white
                             hover:!bg-white/25"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="sc-btn-secondary !bg-white/10 !border-white/20 !text-white
                             hover:!bg-danger/80"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        <StatTile
          label={isIndividual ? 'Registered Players' : 'Registered Teams'}
          value={isIndividual ? players.length : teams.length}
          accent="primary"
        />
        <StatTile label="Format"
                  value={(formatLabels[tournament.format] ?? tournament.format).split(' ')[0]}
                  accent="secondary" />
        <StatTile label="Status"
                  value={tournament.status[0].toUpperCase() + tournament.status.slice(1)}
                  accent="tertiary" />
      </div>

      {/* Registered teams / players */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="font-display text-headline-lg text-ink">
          {isIndividual ? 'Registered Players' : 'Registered Teams'}
        </h2>
        {isAdmin && (
          <button onClick={() => setRegisterOpen(true)} className="sc-btn-primary !py-2 !px-4">
            {isIndividual ? (
              <>
                <UserPlus size={14} strokeWidth={2.5} />
                Register Players
              </>
            ) : (
              <>
                <Plus size={14} strokeWidth={2.5} />
                Register Teams
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-3">
          {error}
        </div>
      )}

      {isIndividual ? (
        players.length === 0 ? (
          <div className="bg-white rounded-md border border-dashed border-outline-variant
                          py-12 text-center mb-10">
            <p className="text-ink-variant">No players registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
            {players.map((r) => (
              <div key={r.id}
                   className="bg-white rounded-md border border-outline-variant/30 shadow-card
                              p-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpenPlayerId(r.player.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex-shrink-0
                                  flex items-center justify-center font-display text-lg
                                  shadow-card">
                    {r.player.jersey_number != null
                      ? String(r.player.jersey_number).padStart(2, '0')
                      : r.player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-headline-md text-ink truncate
                                  hover:text-primary transition-colors">
                      {r.player.name}
                    </p>
                    <div className="flex gap-1.5 mt-1">
                      <span className="sc-chip bg-surface-low text-ink-variant">
                        {r.player.position ?? 'N/A'}
                      </span>
                      {r.seed != null && (
                        <span className="sc-chip bg-surface-low text-ink-variant">
                          Seed #{r.seed}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleUnregisterPlayer(r.player.id, r.player.name)}
                    className="sc-btn-ghost !p-2 !text-danger hover:!bg-danger-container"
                    aria-label="Unregister"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-md border border-dashed border-outline-variant
                        py-12 text-center mb-10">
          <p className="text-ink-variant">No teams registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {teams.map((r) => (
            <div key={r.id}
                 className="bg-white rounded-md border border-outline-variant/30 shadow-card
                            p-4 flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white
                             font-display text-lg border border-outline-variant/40 shadow-card"
                  style={{
                    background: `linear-gradient(135deg, ${r.team.primary_color}, ${r.team.secondary_color})`,
                  }}
                >
                  {r.team.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/teams/${r.team.id}`}
                        className="font-display text-headline-md text-ink hover:text-primary
                                   transition-colors block truncate">
                    {r.team.name}
                  </Link>
                  <div className="flex gap-1.5 mt-1">
                    {r.seed != null && (
                      <span className="sc-chip bg-surface-low text-ink-variant">Seed #{r.seed}</span>
                    )}
                    {r.group_name && (
                      <span className="sc-chip bg-surface-low text-ink-variant">Group {r.group_name}</span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleUnregister(r.team.id, r.team.name)}
                    className="sc-btn-ghost !p-2 !text-danger hover:!bg-danger-container"
                    aria-label="Unregister"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Bracket / Standings — now works for both team and individual tournaments. */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-display text-headline-lg text-ink">
            {isBracketFormat
              ? 'Bracket'
              : (isGroupKnockout && stageView === 'knockout' ? 'Knockout' : 'Standings')}
          </h2>
          {isGroupKnockout && hasKnockout && (
            <div className="inline-flex bg-surface-low rounded-sm p-1">
              <button
                type="button"
                onClick={() => setStageView('group')}
                className={`px-3 py-1 rounded-sm text-xs font-label uppercase tracking-wider
                            transition-colors ${stageView === 'group'
                              ? 'bg-white text-primary shadow-card'
                              : 'text-ink-variant hover:text-ink'}`}
              >
                Group Stage
              </button>
              <button
                type="button"
                onClick={() => setStageView('knockout')}
                className={`px-3 py-1 rounded-sm text-xs font-label uppercase tracking-wider
                            transition-colors ${stageView === 'knockout'
                              ? 'bg-white text-primary shadow-card'
                              : 'text-ink-variant hover:text-ink'}`}
              >
                Knockout
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {showAdvanceButton && (
            <button
              onClick={handleAdvanceGroups}
              disabled={matchSaving}
              className="sc-btn-secondary !py-2 !px-4"
            >
              {matchSaving ? 'Advancing…' : 'Advance to Knockout'}
            </button>
          )}
          {isAdmin && isGroupKnockout && !hasKnockout && teams.length >= 4 && (
            <button
              onClick={() => setGroupDrawOpen(true)}
              disabled={matchSaving}
              className="sc-btn-secondary !py-2 !px-4"
            >
              Set Groups
            </button>
          )}
          {isAdmin && (isIndividual ? players.length : teams.length) >= 2 && (
            <button
              onClick={handleGenerate}
              disabled={matchSaving}
              className="sc-btn-primary !py-2 !px-4"
            >
              {matchSaving
                ? 'Generating…'
                : matches.length > 0
                  ? 'Regenerate Bracket'
                  : 'Generate Bracket'}
            </button>
          )}
        </div>
      </div>

      {matchError && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-3">
          {matchError}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="bg-white rounded-md border border-dashed border-outline-variant
                        py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-low mx-auto flex items-center
                          justify-center text-primary mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2">
              {isBracketFormat ? (
                <path d="M4 6h5v4H4zM4 14h5v4H4zM15 10h5v4h-5zM9 8h3M9 16h3M12 12h3" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </div>
          <p className="font-display text-headline-md text-ink">
            No matches yet
          </p>
          <p className="text-ink-variant mt-2 max-w-md mx-auto">
            {isAdmin
              ? `Register at least 2 ${isIndividual ? 'players' : 'teams'}, then generate the bracket.`
              : 'Matches will appear here once the admin sets up the bracket.'}
          </p>
        </div>
      ) : isBracketFormat ? (
        <Bracket
          matches={matches}
          isAdmin={isAdmin}
          onOpen={(m) => setOpenMatch(m)}
        />
      ) : isGroupKnockout && stageView === 'knockout' && hasKnockout ? (
        <Bracket
          matches={knockoutMatches}
          isAdmin={isAdmin}
          onOpen={(m) => setOpenMatch(m)}
        />
      ) : (
        <div className="space-y-8">
          {!isIndividual && <StandingsTable standings={standings} />}
          <div>
            <h3 className="font-display text-headline-md text-ink mb-3">Fixtures</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(isGroupKnockout ? groupMatches : matches).map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  isAdmin={isAdmin}
                  onOpen={() => setOpenMatch(m)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <CreateTournamentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        tournament={tournament}
      />
      {isIndividual ? (
        <RegisterPlayersModal
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          tournamentId={id}
          sportFilter={tournament.sport_type}
          registeredIds={registeredPlayerIds}
        />
      ) : (
        <RegisterTeamModal
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          tournamentId={id}
          registeredIds={registeredIds}
        />
      )}
      <MatchDetailModal
        open={!!openMatch}
        onClose={() => setOpenMatch(null)}
        match={openMatch}
        isAdmin={isAdmin}
      />
      <PlayerDetailModal
        open={!!openPlayerId}
        onClose={() => setOpenPlayerId(null)}
        playerId={openPlayerId}
      />
      <GroupDrawModal
        open={groupDrawOpen}
        onClose={() => setGroupDrawOpen(false)}
        tournamentId={id}
        teams={teams}
      />
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        tournament={tournament}
        matches={matches}
        standings={standings}
      />
    </motion.div>
  );
}
