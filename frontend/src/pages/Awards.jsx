import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, CircleDot, Award as AwardIcon, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAwardStore } from '../store/awardStore';
import { useTournamentStore } from '../store/tournamentStore';
import { useTeamStore } from '../store/teamStore';
import Modal from '../components/Modal';

const awardMeta = {
  top_scorer:  { label: 'Top Scorer',  Icon: CircleDot,   kind: 'player', accent: 'primary',   tone: 'text-primary' },
  best_player: { label: 'Best Player', Icon: AwardIcon,   kind: 'player', accent: 'tertiary',  tone: 'text-tertiary' },
  winner:      { label: 'Champion',    Icon: Trophy,      kind: 'team',   accent: 'primary',   tone: 'text-primary' },
  clean_sheet: { label: 'Clean Sheet', Icon: ShieldCheck, kind: 'team',   accent: 'secondary', tone: 'text-secondary' },
};

const awardOrder = ['winner', 'top_scorer', 'best_player', 'clean_sheet'];

function AwardCard({ type, award, isAdmin, suggestion, onEdit, onClear }) {
  const meta = awardMeta[type];
  const subject = meta.kind === 'player' ? award?.player : award?.team;
  const Icon = meta.Icon;

  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card
                    p-5 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-12 h-12 rounded-full bg-surface-low flex items-center
                        justify-center ${meta.tone}`}>
          <Icon size={22} strokeWidth={2} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-label text-label-md uppercase tracking-wider text-ink-variant">
            {meta.label}
          </p>
        </div>
      </div>

      {subject ? (
        <div className="flex-1">
          <p className="font-display text-headline-md text-ink leading-tight">
            {subject.name}
          </p>
          {meta.kind === 'player' && award?.player?.jersey_number != null && (
            <p className="text-sm text-ink-variant mt-1">#{award.player.jersey_number}</p>
          )}
        </div>
      ) : (
        <div className="flex-1 text-ink-variant text-sm">
          {suggestion ? (
            <>
              <p className="italic">Suggested: <span className="text-ink not-italic">{suggestion}</span></p>
              <p className="text-xs mt-1">No award assigned yet.</p>
            </>
          ) : (
            <p className="italic">Not yet awarded.</p>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-outline-variant/30">
          <button onClick={onEdit} className="sc-btn-ghost flex-1 !bg-surface-low">
            {award ? 'Change' : 'Assign'}
          </button>
          {award && (
            <button onClick={onClear}
                    className="sc-btn-ghost flex-1 !text-danger hover:!bg-danger-container">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AssignAwardModal({ open, onClose, type, tournamentId, teams, topScorers }) {
  const { saveAward, saving, error, clearError } = useAwardStore();
  const fetchRoster = useTeamStore((s) => s.fetchRoster);
  const [teamId, setTeamId] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [players, setPlayers] = useState([]);
  const meta = awardMeta[type] ?? null;

  useEffect(() => {
    if (!open) return;
    setTeamId(teams[0]?.team.id ?? '');
    setPlayerId('');
    clearError();
  }, [open, teams, clearError]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!teamId) { setPlayers([]); return; }
      const roster = await fetchRoster(teamId);
      if (active) setPlayers(roster);
    })();
    return () => { active = false; };
  }, [teamId, fetchRoster]);

  if (!meta) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      tournament_id: tournamentId,
      award_type: type,
      team_id: teamId || null,
      player_id: meta.kind === 'player' ? (playerId || null) : null,
    };
    const result = await saveAward(payload);
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assign ${meta.label}`}
      subtitle={meta.kind === 'player'
        ? 'Pick the player to receive this award.'
        : 'Pick the team to receive this award.'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="sc-label">Team</label>
          <select
            required
            value={teamId}
            onChange={(e) => { setTeamId(e.target.value); setPlayerId(''); }}
            className="sc-input"
          >
            <option value="">Select a team…</option>
            {teams.map((r) => (
              <option key={r.team.id} value={r.team.id}>{r.team.name}</option>
            ))}
          </select>
        </div>

        {meta.kind === 'player' && (
          <div>
            <label className="sc-label">Player</label>
            <select
              required
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className="sc-input"
            >
              <option value="">Select a player…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.jersey_number ?? '–'} {p.name}
                </option>
              ))}
            </select>
            {type === 'top_scorer' && topScorers.length > 0 && (
              <p className="text-xs text-ink-variant mt-1">
                Top from event log: {topScorers[0].player?.name}
                {' '}({topScorers[0].goals} {topScorers[0].goals === 1 ? 'goal' : 'goals'})
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="sc-btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="sc-btn-primary flex-1">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Awards() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const { awards, topScorers, loading, error, fetchAwards, fetchTopScorers, deleteAward } = useAwardStore();
  const { current, fetchTournamentById } = useTournamentStore();
  const [assignType, setAssignType] = useState(null);

  useEffect(() => {
    fetchAwards(id);
    fetchTopScorers(id);
    fetchTournamentById(id);
  }, [id, fetchAwards, fetchTopScorers, fetchTournamentById]);

  const awardsByType = useMemo(() => {
    const map = {};
    for (const a of awards) map[a.award_type] = a;
    return map;
  }, [awards]);

  const handleClear = async (a) => {
    if (!window.confirm('Remove this award?')) return;
    await deleteAward(a.id);
  };

  const tournament = current?.tournament;
  const teams = current?.teams ?? [];

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <nav className="text-sm text-ink-variant mb-4 flex items-center gap-2">
        <Link to="/tournaments" className="hover:text-primary transition-colors">Tournaments</Link>
        <span className="text-outline">›</span>
        {tournament && (
          <>
            <Link to={`/tournaments/${id}`} className="hover:text-primary transition-colors">
              {tournament.name}
            </Link>
            <span className="text-outline">›</span>
          </>
        )}
        <span className="text-primary font-semibold">Awards</span>
      </nav>

      <div className="mb-8">
        <h1 className="font-display text-headline-lg sm:text-display-lg text-ink leading-tight">
          Awards
        </h1>
        {tournament && (
          <p className="text-ink-variant mt-2">{tournament.name}</p>
        )}
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {loading && awards.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-md border border-outline-variant/30
                                    shadow-card p-5 h-44 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {awardOrder.map((type) => {
            const award = awardsByType[type];
            const suggestion = type === 'top_scorer' && !award && topScorers[0]
              ? `${topScorers[0].player?.name} (${topScorers[0].goals} goals)`
              : null;
            return (
              <AwardCard
                key={type}
                type={type}
                award={award}
                isAdmin={isAdmin}
                suggestion={suggestion}
                onEdit={() => setAssignType(type)}
                onClear={() => handleClear(award)}
              />
            );
          })}
        </div>
      )}

      {/* Goal-scoring leaderboard */}
      <h2 className="font-display text-headline-md text-ink mb-3">Goal-Scoring Leaderboard</h2>
      {topScorers.length === 0 ? (
        <div className="bg-white rounded-md border border-dashed border-outline-variant
                        py-12 text-center">
          <p className="text-ink-variant">
            No goals logged yet — top scorers will be auto-calculated from match events.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-md border border-outline-variant/30 shadow-card
                        overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-variant border-b border-outline-variant/30">
                <th className="px-4 py-2 font-label text-label-md uppercase tracking-wider">#</th>
                <th className="px-4 py-2 font-label text-label-md uppercase tracking-wider">Player</th>
                <th className="px-4 py-2 font-label text-label-md uppercase tracking-wider">Team</th>
                <th className="px-4 py-2 text-right font-label text-label-md uppercase tracking-wider text-primary">
                  Goals
                </th>
              </tr>
            </thead>
            <tbody>
              {topScorers.map((s, idx) => (
                <tr key={s.player?.id ?? idx}
                    className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-low/50">
                  <td className="px-4 py-3 text-ink-variant tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {s.player?.name ?? '—'}
                    {s.player?.jersey_number != null && (
                      <span className="text-ink-variant ml-1">#{s.player.jersey_number}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-variant">
                    {s.team ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-5 rounded-full"
                          style={{ background: s.team.primary_color }}
                        />
                        {s.team.name}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-display text-headline-md
                                 text-primary tabular-nums">
                    {s.goals}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssignAwardModal
        open={!!assignType}
        onClose={() => setAssignType(null)}
        type={assignType}
        tournamentId={id}
        teams={teams}
        topScorers={topScorers}
      />
    </motion.div>
  );
}
