import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, UserPlus, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import AddPlayerModal from '../components/AddPlayerModal';
import PlayerDetailModal from '../components/PlayerDetailModal';
import { sportLabel } from '../constants/sports';

function CardSkeleton() {
  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card p-4
                    flex items-center gap-3 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-surface-low flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-low rounded w-2/3" />
        <div className="h-3 bg-surface-low rounded w-1/3" />
      </div>
    </div>
  );
}

function PlayerCard({ player, isAdmin, onOpen, onEdit, onDelete }) {
  const initials = player.name?.charAt(0).toUpperCase() ?? '?';
  const jersey = player.jersey_number != null
    ? String(player.jersey_number).padStart(2, '0')
    : '–';
  const sports = player.sports ?? [];

  return (
    <div className="bg-white rounded-md border border-outline-variant/30 shadow-card
                    hover:shadow-card-hover transition-all p-4">
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-start gap-3 text-left"
      >
        <div className="w-12 h-12 rounded-full bg-primary text-white flex-shrink-0
                        flex items-center justify-center shadow-card">
          <span className="font-display text-base leading-none tracking-wide">
            {jersey === '–' ? initials : jersey}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-headline-md text-ink leading-tight truncate
                        group-hover:text-primary transition-colors">
            {player.name}
          </p>
          {sports.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {sports.slice(0, 3).map((s) => (
                <span key={s} className="sc-chip bg-surface-low text-ink-variant">
                  {sportLabel(s)}
                </span>
              ))}
              {sports.length > 3 && (
                <span className="sc-chip bg-surface-low text-ink-variant">
                  +{sports.length - 3}
                </span>
              )}
            </div>
          ) : (
            <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mt-1.5">
              No sports tagged
            </p>
          )}
        </div>
      </button>

      {isAdmin && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-outline-variant/30">
          <button
            onClick={onEdit}
            className="sc-btn-ghost flex-1 !bg-surface-low gap-1.5"
          >
            <Pencil size={12} strokeWidth={2.5} />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="sc-btn-ghost flex-1 !text-danger hover:!bg-danger-container gap-1.5"
          >
            <Trash2 size={12} strokeWidth={2.5} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function Players() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const { players, loading, error, fetchPlayers, deletePlayer } = usePlayerStore();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchPlayers({ standalone: true });
  }, [fetchPlayers]);

  const filtered = useMemo(() => {
    if (!query.trim()) return players;
    const q = query.toLowerCase();
    return players.filter((p) => p.name.toLowerCase().includes(q));
  }, [players, query]);

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete player "${p.name}"?`)) return;
    await deletePlayer(p.id);
  };

  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-8 sm:py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-headline-lg sm:text-display-lg text-ink leading-tight">
            Individual Players
          </h1>
          <p className="text-ink-variant mt-2 max-w-xl">
            Standalone athletes available for individual-sport tournaments —
            chess, table tennis, swimming, athletics, and more.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-variant">
              <Search size={18} strokeWidth={2} aria-hidden />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players..."
              className="sc-input pl-10 !py-2.5 min-w-[240px]"
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => { setEditing(null); setAddOpen(true); }}
              className="sc-btn-primary !py-2.5"
            >
              <UserPlus size={16} strokeWidth={2.25} />
              Add Player
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-danger-container text-danger-on-container rounded-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-md border border-dashed border-outline-variant
                        py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-low mx-auto flex items-center
                          justify-center text-primary mb-3">
            <User size={24} strokeWidth={2} aria-hidden />
          </div>
          <p className="font-display text-headline-md text-ink">
            {query ? 'No players match your search.' : 'No individual players yet.'}
          </p>
          {isAdmin && !query && (
            <button
              onClick={() => { setEditing(null); setAddOpen(true); }}
              className="sc-btn-primary mt-4"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add the first one
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              isAdmin={isAdmin}
              onOpen={() => setOpenId(p.id)}
              onEdit={() => { setEditing(p); setAddOpen(true); }}
              onDelete={() => handleDelete(p)}
            />
          ))}
        </div>
      )}

      <AddPlayerModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        player={editing}
      />
      <PlayerDetailModal
        open={!!openId}
        onClose={() => setOpenId(null)}
        playerId={openId}
      />
    </motion.div>
  );
}
