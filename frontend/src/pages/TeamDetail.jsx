import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useTeamStore } from '../store/teamStore';
import AddPlayerModal from '../components/AddPlayerModal';
import CreateTeamModal from '../components/CreateTeamModal';
import RosterRow from '../components/RosterRow';
import TeamExportModal from '../components/TeamExportModal';
import { Share2 } from 'lucide-react';

const positions = ['All', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'N/A'];

function StatTile({ label, value, accent = 'primary' }) {
  const colors = {
    primary: 'border-l-primary-container text-primary',
    secondary: 'border-l-secondary-container text-secondary',
    tertiary: 'border-l-tertiary-container text-tertiary',
    danger: 'border-l-danger text-danger',
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

function RosterSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-white border border-outline-variant/30
                                rounded-sm animate-pulse" />
      ))}
    </div>
  );
}

export default function TeamDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const {
    current, loading, error,
    fetchTeamById, deletePlayer, setCaptain,
  } = useTeamStore();

  const [playerModal, setPlayerModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [editTeamOpen, setEditTeamOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [posFilter, setPosFilter] = useState('All');

  useEffect(() => { fetchTeamById(id); }, [id, fetchTeamById]);

  const handleDeletePlayer = async (p) => {
    if (!window.confirm(`Remove ${p.name} from the roster?`)) return;
    await deletePlayer(p.id);
  };

  const handleSetCaptain = async (p) => {
    await setCaptain(id, p.id, null);
  };

  const filteredPlayers = useMemo(() => {
    if (!current) return [];
    if (posFilter === 'All') return current.players;
    return current.players.filter((p) => p.position === posFilter);
  }, [current, posFilter]);

  if (loading || !current) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <div className="h-48 bg-surface-low rounded-md animate-pulse mb-6" />
        <RosterSkeleton />
        {error && (
          <p className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm mt-4">
            {error}
          </p>
        )}
      </div>
    );
  }

  const { team, players, captains } = current;
  const defaultCaptainId = captains.find((c) => !c.tournament_id)?.player_id;
  const goalkeepers = players.filter((p) => p.position === 'Goalkeeper').length;

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb */}
      <nav className="text-sm text-ink-variant mb-4 flex items-center gap-2">
        <Link to="/teams" className="hover:text-primary transition-colors">Teams</Link>
        <span className="text-outline">›</span>
        <span className="text-primary font-semibold">{team.name}</span>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-lg shadow-card text-white p-6 sm:p-10 mb-8"
        style={{
          background: `linear-gradient(135deg, ${team.primary_color} 0%, ${team.secondary_color} 100%)`,
        }}
      >
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full
                        bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-24 h-24 rounded-md bg-white/95 flex items-center justify-center
                          shadow-card flex-shrink-0">
            <span className="font-display text-4xl tracking-wide"
                  style={{ color: team.primary_color }}>
              {team.name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <span className="sc-chip bg-white/20 text-white">University Athletics</span>
            <h1 className="font-display text-headline-lg sm:text-display-lg mt-3 leading-tight">
              {team.name}
            </h1>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="sc-chip bg-white/15 text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="17" cy="9" r="2.5" />
                  <path d="M2 20c1-3 3.5-4.5 7-4.5s6 1.5 7 4.5M14 20c.5-2 2-3 4-3s3.5 1 4 3" />
                </svg>
                {players.length} Players
              </span>
              <span className="sc-chip bg-white/15 text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 6h18M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6M9 10v6M15 10v6" />
                </svg>
                {goalkeepers} Goalkeepers
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {user && (
              <button onClick={() => setExportOpen(true)}
                      className="sc-btn-secondary !bg-white/15 !border-white/30 !text-white
                                 hover:!bg-white/25">
                <Share2 size={16} strokeWidth={2.25} />
                Export Squad
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setEditTeamOpen(true)}
                      className="sc-btn-secondary !bg-white/15 !border-white/30 !text-white
                                 hover:!bg-white/25">
                Edit Team
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatTile label="Roster Size" value={players.length} accent="primary" />
        <StatTile label="Captains" value={captains.length} accent="tertiary" />
        <StatTile label="Forwards"
                  value={players.filter((p) => p.position === 'Forward').length}
                  accent="secondary" />
        <StatTile label="Defenders"
                  value={players.filter((p) => p.position === 'Defender').length}
                  accent="primary" />
      </div>

      {/* Roster header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h2 className="font-display text-headline-lg text-ink">Team Roster</h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Position filter pills */}
          <div className="flex flex-wrap gap-1.5 bg-white rounded-full border
                          border-outline-variant/40 p-1 shadow-card">
            {positions.map((p) => (
              <button
                key={p}
                onClick={() => setPosFilter(p)}
                className={`px-3 py-1.5 rounded-full text-label-md font-label font-semibold
                           uppercase tracking-wider transition-colors
                           ${posFilter === p
                             ? 'bg-primary text-white shadow-card'
                             : 'text-ink-variant hover:text-primary'}`}
              >
                {p}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button onClick={() => { setEditPlayer(null); setPlayerModal(true); }}
                    className="sc-btn-primary !py-2 !px-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add Player
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-3">
          {error}
        </div>
      )}

      {/* Roster */}
      {filteredPlayers.length === 0 ? (
        <div className="bg-white rounded-md border border-dashed border-outline-variant
                        py-12 text-center">
          <p className="text-ink-variant">
            {posFilter === 'All' ? 'No players yet.' : `No ${posFilter.toLowerCase()}s on the roster.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPlayers.map((p, idx) => (
            <RosterRow
              key={p.id}
              player={p}
              isCaptain={p.id === defaultCaptainId}
              isAdmin={isAdmin}
              even={idx % 2 === 1}
              onEdit={() => { setEditPlayer(p); setPlayerModal(true); }}
              onDelete={() => handleDeletePlayer(p)}
              onSetCaptain={() => handleSetCaptain(p)}
            />
          ))}
        </div>
      )}

      <AddPlayerModal
        open={playerModal}
        onClose={() => { setPlayerModal(false); setEditPlayer(null); }}
        teamId={team.id}
        player={editPlayer}
      />
      <CreateTeamModal
        open={editTeamOpen}
        onClose={() => setEditTeamOpen(false)}
        team={team}
      />
      <TeamExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        team={team}
        players={players}
        captains={captains}
      />
    </motion.div>
  );
}
