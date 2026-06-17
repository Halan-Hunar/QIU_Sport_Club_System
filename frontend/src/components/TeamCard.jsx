import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';

// Darken a hex colour by a percentage so single-colour teams still get a
// usable gradient stop on the bottom-right of the card.
function darken(hex, amount = 0.35) {
  if (!hex || typeof hex !== 'string') return '#0a2a3a';
  const m = hex.replace('#', '').match(/^([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (!m) return hex;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export default function TeamCard({ team, isAdmin, isAuthenticated, onEdit, onDelete }) {
  const primary   = team.primary_color   || '#0a2a3a';
  const secondary = team.secondary_color || darken(primary);
  const gradient  = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;
  const initial   = team.name?.charAt(0)?.toUpperCase() ?? '?';
  const players   = team.player_count ?? 0;
  const wins      = team.wins   ?? 0;
  const losses    = team.losses ?? 0;

  // Visitors (unauthenticated): non-clickable. Otherwise the whole card and
  // the corner arrow both navigate to the detail page.
  const Wrapper = isAuthenticated ? Link : 'div';
  const wrapperProps = isAuthenticated
    ? { to: `/teams/${team.id}`, className: 'block group' }
    : { className: 'block cursor-default select-none' };

  return (
    <div className="relative rounded-lg shadow-card hover:shadow-card-hover transition-shadow
                    overflow-hidden flex flex-col">
      <Wrapper {...wrapperProps}>
        <div
          className="relative p-3.5 sm:p-6 pb-4 sm:pb-7"
          style={{ background: gradient }}
        >
          {/* Top row: logo badge + (admin-only) player pill */}
          <div className="flex items-start justify-between gap-2">
            <div
              className="w-9 h-9 sm:w-14 sm:h-14 rounded-md sm:rounded-lg bg-white shadow-md
                         flex items-center justify-center font-display text-base sm:text-2xl"
              style={{ color: primary }}
              aria-hidden
            >
              {initial}
            </div>
            {isAuthenticated && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-white/20
                               backdrop-blur-sm border border-white/30 rounded-full
                               px-2 sm:px-3 py-0.5 sm:py-1
                               text-[10px] sm:text-xs font-label uppercase tracking-wider text-white">
                <Users size={10} strokeWidth={2.25} className="hidden sm:inline" />
                <span className="sm:hidden">{players}</span>
                <span className="hidden sm:inline">{players} {players === 1 ? 'Player' : 'Players'}</span>
              </span>
            )}
          </div>

          {/* Title block */}
          <div className="mt-6 sm:mt-12">
            <h3 className="font-display text-base sm:text-headline-md text-white leading-tight">
              {team.name}
            </h3>
          </div>
        </div>

        {/* Bottom strip — admins/auth see team colours + arrow; visitors see W/D/L pills */}
        <div className="bg-white border-t border-outline-variant/30 px-3 sm:px-5 py-3
                        flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <span className="font-label text-label-md uppercase tracking-wider text-ink-variant">
                Team colors
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full border border-outline-variant/40"
                  style={{ background: primary }}
                />
                <span
                  className="w-3 h-3 rounded-full border border-outline-variant/40"
                  style={{ background: secondary }}
                />
              </div>
              <span
                className="ml-auto w-9 h-9 rounded-full bg-white shadow border
                           border-outline-variant/40 flex items-center justify-center
                           flex-shrink-0 text-primary
                           group-hover:translate-x-0.5 transition-transform"
                aria-hidden
              >
                <ArrowRight size={16} strokeWidth={2.5} />
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50
                               text-emerald-700 rounded-full px-2.5 py-1
                               font-label text-label-md uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {wins} W
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white
                               text-ink-variant border border-outline-variant/40
                               rounded-full px-2.5 py-1
                               font-label text-label-md uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-variant/50" />
                {team.draws ?? 0} D
              </span>
              <span className="inline-flex items-center gap-1.5 bg-rose-50
                               text-rose-700 rounded-full px-2.5 py-1
                               font-label text-label-md uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {losses} L
              </span>
            </div>
          )}
        </div>
      </Wrapper>

      {isAdmin && (
        <div className="flex gap-2 px-4 sm:px-5 pb-5 pt-3 bg-white">
          <button onClick={onEdit}
                  className="sc-btn-ghost flex-1 !bg-surface-low">
            Edit
          </button>
          <button onClick={onDelete}
                  className="sc-btn-ghost flex-1 !text-danger hover:!bg-danger-container">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
