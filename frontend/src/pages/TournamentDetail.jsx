import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useTournamentStore } from '../store/tournamentStore';
import { useTeamStore } from '../store/teamStore';
import { useMatchStore } from '../store/matchStore';
import CreateTournamentModal from '../components/CreateTournamentModal';
import Modal from '../components/Modal';
import Bracket from '../components/Bracket';
import StandingsTable from '../components/StandingsTable';
import MatchCard from '../components/MatchCard';
import MatchDetailModal from '../components/MatchDetailModal';

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
  const { registerTeam, saving, error, clearError } = useTournamentStore();
  const [teamId, setTeamId] = useState('');
  const [seed, setSeed] = useState('');
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (open) {
      fetchTeams();
      setTeamId('');
      setSeed('');
      setGroupName('');
      clearError();
    }
  }, [open, fetchTeams, clearError]);

  const available = useMemo(
    () => teams.filter((t) => !registeredIds.has(t.id)),
    [teams, registeredIds],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamId) return;
    const payload = { team_id: teamId };
    if (seed) payload.seed = Number(seed);
    if (groupName.trim()) payload.group_name = groupName.trim().toUpperCase();
    const result = await registerTeam(tournamentId, payload);
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Register Team"
      subtitle="Add a team to this tournament."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="sc-label">Team</label>
          <select
            required
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="sc-input"
          >
            <option value="">Select a team…</option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {available.length === 0 && teams.length > 0 && (
            <p className="text-sm text-ink-variant mt-1">All teams are already registered.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="sc-label">Seed (optional)</label>
            <input
              type="number"
              min={1}
              max={999}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="sc-input"
              placeholder="e.g. 1"
            />
          </div>
          <div>
            <label className="sc-label">Group (optional)</label>
            <input
              type="text"
              maxLength={10}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="sc-input uppercase"
              placeholder="e.g. A"
            />
          </div>
        </div>

        {error && (
          <div className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="sc-btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving || !teamId} className="sc-btn-primary flex-1">
            {saving ? 'Registering…' : 'Register Team'}
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
    fetchTournamentById, unregisterTeam, deleteTournament,
  } = useTournamentStore();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [openMatch, setOpenMatch] = useState(null);

  const {
    matches, standings, saving: matchSaving, error: matchError,
    fetchMatches, fetchStandings, generateBracket,
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

  const handleUnregister = async (teamId, teamName) => {
    if (!window.confirm(`Remove "${teamName}" from this tournament?`)) return;
    await unregisterTeam(id, teamId);
  };

  const handleDelete = async () => {
    if (!current) return;
    if (!window.confirm(`Delete tournament "${current.tournament.name}"? This removes all matches and registrations.`)) return;
    const ok = await deleteTournament(id);
    if (ok) window.history.back();
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
  const isBracketFormat = tournament.format === 'single_elim' || tournament.format === 'double_elim';

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
              to={`/tournaments/${id}/awards`}
              className="sc-btn-secondary !bg-white/15 !border-white/30 !text-white
                         hover:!bg-white/25 text-center"
            >
              🏆 Awards
            </Link>
            {isAdmin && (
              <>
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
        <StatTile label="Registered Teams" value={teams.length} accent="primary" />
        <StatTile label="Format"
                  value={(formatLabels[tournament.format] ?? tournament.format).split(' ')[0]}
                  accent="secondary" />
        <StatTile label="Status"
                  value={tournament.status[0].toUpperCase() + tournament.status.slice(1)}
                  accent="tertiary" />
      </div>

      {/* Registered teams */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="font-display text-headline-lg text-ink">Registered Teams</h2>
        {isAdmin && (
          <button onClick={() => setRegisterOpen(true)} className="sc-btn-primary !py-2 !px-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Register Team
          </button>
        )}
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-3">
          {error}
        </div>
      )}

      {teams.length === 0 ? (
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2.5">
                      <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Bracket / Standings */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="font-display text-headline-lg text-ink">
          {isBracketFormat ? 'Bracket' : 'Standings'}
        </h2>
        {isAdmin && teams.length >= 2 && (
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
              ? 'Register at least 2 teams, then generate the bracket.'
              : 'Matches will appear here once the admin sets up the bracket.'}
          </p>
        </div>
      ) : isBracketFormat ? (
        <Bracket
          matches={matches}
          isAdmin={isAdmin}
          onOpen={(m) => setOpenMatch(m)}
        />
      ) : (
        <div className="space-y-8">
          <StandingsTable standings={standings} />
          <div>
            <h3 className="font-display text-headline-md text-ink mb-3">Fixtures</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {matches.map((m) => (
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
      <RegisterTeamModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        tournamentId={id}
        registeredIds={registeredIds}
      />
      <MatchDetailModal
        open={!!openMatch}
        onClose={() => setOpenMatch(null)}
        match={openMatch}
        isAdmin={isAdmin}
      />
    </motion.div>
  );
}
