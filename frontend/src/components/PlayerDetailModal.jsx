import { useEffect } from 'react';
import { Trophy, CircleDot, User } from 'lucide-react';
import Modal from './Modal';
import { usePlayerStore } from '../store/playerStore';
import { sportLabel } from '../constants/sports';

function StatTile({ label, value, Icon, tone = 'text-primary' }) {
  return (
    <div className="bg-surface-low rounded-md px-4 py-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center ${tone}`}>
        <Icon size={20} strokeWidth={2} aria-hidden />
      </div>
      <div>
        <p className="font-label text-label-md uppercase tracking-wider text-ink-variant">
          {label}
        </p>
        <p className="font-display text-headline-md text-ink tabular-nums leading-none mt-1">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function PlayerDetailModal({ open, onClose, playerId }) {
  const { detail, loading, error, fetchPlayerDetail, clearDetail } = usePlayerStore();

  useEffect(() => {
    if (open && playerId) fetchPlayerDetail(playerId);
    if (!open) clearDetail();
  }, [open, playerId, fetchPlayerDetail, clearDetail]);

  const player = detail?.player;
  const stats = detail?.stats;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={player?.name ?? 'Player'}
      subtitle={player?.position ?? undefined}
    >
      {loading || !detail ? (
        <div className="space-y-3">
          <div className="h-20 bg-surface-low rounded-md animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-16 bg-surface-low rounded-md animate-pulse" />
            <div className="h-16 bg-surface-low rounded-md animate-pulse" />
          </div>
          {error && (
            <p className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-surface-low rounded-md px-4 py-3">
            <div className="w-14 h-14 rounded-full bg-primary text-white
                            flex items-center justify-center shadow-card">
              <span className="font-display text-lg leading-none tracking-wide">
                {player.jersey_number != null
                  ? String(player.jersey_number).padStart(2, '0')
                  : player.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-headline-md text-ink leading-tight truncate">
                {player.name}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="sc-chip bg-white text-ink-variant border border-outline-variant/40">
                  {player.position ?? 'N/A'}
                </span>
                {player.team ? (
                  <span
                    className="sc-chip text-white"
                    style={{ background: player.team.primary_color }}
                  >
                    {player.team.name}
                  </span>
                ) : (
                  <span className="sc-chip bg-white text-ink-variant
                                   border border-outline-variant/40">
                    Standalone
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Tournaments"
              value={stats?.tournaments_played ?? 0}
              Icon={Trophy}
              tone="text-tertiary"
            />
            <StatTile
              label="Goals"
              value={stats?.goals ?? 0}
              Icon={CircleDot}
              tone="text-primary"
            />
          </div>

          {(player.sports ?? []).length > 0 && (
            <div>
              <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mb-2">
                Sports
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(player.sports ?? []).map((s) => (
                  <span key={s} className="sc-chip bg-surface-low text-ink-variant">
                    {sportLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {player.notes && (
            <div>
              <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mb-2">
                Notes
              </p>
              <p className="text-sm text-ink whitespace-pre-wrap">{player.notes}</p>
            </div>
          )}

          {!stats?.tournaments_played && !stats?.goals && (
            <div className="bg-surface-low rounded-sm px-4 py-3 flex items-center gap-2
                            text-sm text-ink-variant">
              <User size={16} strokeWidth={2} aria-hidden />
              No tournament history yet.
            </div>
          )}

          <button onClick={onClose} className="sc-btn-secondary w-full">
            Close
          </button>
        </div>
      )}
    </Modal>
  );
}
