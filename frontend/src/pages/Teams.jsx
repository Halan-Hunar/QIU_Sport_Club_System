import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useTeamStore } from '../store/teamStore';
import CreateTeamModal from '../components/CreateTeamModal';
import TeamCard from '../components/TeamCard';

function CardSkeleton() {
  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-surface-low" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surface-low rounded w-2/3" />
          <div className="h-3 bg-surface-low rounded w-1/3" />
        </div>
      </div>
      <div className="mt-4 h-12 bg-surface-low rounded-sm" />
    </div>
  );
}

export default function Teams() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { teams, loading, error, fetchTeams, deleteTeam } = useTeamStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  useEffect(() => {
    if (isAdmin && searchParams.get('new') === '1') {
      setEditing(null);
      setModalOpen(true);
    }
  }, [isAdmin, searchParams]);

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    if (searchParams.get('new')) {
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleDelete = async (team) => {
    if (!window.confirm(`Delete team "${team.name}"? This removes all its players.`)) return;
    await deleteTeam(team.id);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return teams;
    const q = query.toLowerCase();
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, query]);

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg sm:text-display-lg text-ink leading-tight">
            University Teams
          </h1>
          <p className="text-ink-variant mt-2 max-w-xl">
            Browse the competitive athletic teams across the club —
            from varsity football to academic sports clubs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-variant">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams..."
              className="sc-input pl-10 !py-2.5 min-w-[240px]"
            />
          </div>
          {isAdmin && (
            <button onClick={() => { setEditing(null); setModalOpen(true); }}
                    className="sc-btn-primary !py-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              New Team
            </button>
          )}
        </div>
      </div>

      {/* Stat strip */}
      {!loading && teams.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total Teams', value: teams.length },
            {
              label: 'Total Players',
              value: teams.reduce((s, t) => s + (t.player_count || 0), 0),
            },
            { label: 'Disciplines', value: 'All' },
            { label: 'Status', value: 'Active' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-md border border-outline-variant/30
                                          shadow-card px-4 py-3">
              <p className="font-label text-label-md uppercase tracking-wider text-ink-variant">
                {s.label}
              </p>
              <p className="font-display text-stats text-primary mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-md border border-dashed border-outline-variant
                        py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-low mx-auto flex items-center
                          justify-center text-primary mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="font-display text-headline-md text-ink">
            {query ? 'No teams match your search.' : 'No teams yet.'}
          </p>
          {isAdmin && !query && (
            <button onClick={() => setModalOpen(true)}
                    className="sc-btn-primary mt-4">
              Create the first one
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isAdmin={isAdmin}
              onEdit={() => { setEditing(team); setModalOpen(true); }}
              onDelete={() => handleDelete(team)}
            />
          ))}
        </div>
      )}

      <CreateTeamModal open={modalOpen} onClose={closeModal} team={editing} />
    </motion.div>
  );
}
