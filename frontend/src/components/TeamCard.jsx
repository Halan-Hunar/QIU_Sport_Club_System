import { Link } from 'react-router-dom';

export default function TeamCard({ team, isAdmin, onEdit, onDelete }) {
  return (
    <div className="relative bg-white rounded-md border border-outline-variant/30
                    shadow-card hover:shadow-card-hover transition-all p-5
                    flex flex-col group">
      {/* Accent strip */}
      <span
        className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full"
        style={{ background: team.primary_color }}
      />

      <Link to={`/teams/${team.id}`} className="block flex-1 pl-2">
        <div className="flex items-start justify-between gap-3">
          <div
            className="w-14 h-14 rounded-full flex-shrink-0 border border-outline-variant/40
                       shadow-card flex items-center justify-center text-white font-display text-xl"
            style={{
              background: `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`,
            }}
          >
            {team.name?.charAt(0)?.toUpperCase()}
          </div>
          <span className="qiu-chip-primary !bg-primary-container/15">
            {team.player_count} {team.player_count === 1 ? 'Player' : 'Players'}
          </span>
        </div>

        <h3 className="font-display text-headline-md text-ink mt-4 group-hover:text-primary
                       transition-colors">
          {team.name}
        </h3>
        <p className="text-sm text-ink-variant mt-0.5">University Athletics</p>

        <div className="mt-4 pt-4 border-t border-outline-variant/30 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white shadow"
                 style={{ background: team.primary_color }} />
            <div className="w-3 h-3 rounded-full border border-white shadow -ml-2"
                 style={{ background: team.secondary_color }} />
          </div>
          <span className="font-label text-label-md uppercase tracking-wider text-ink-variant">
            Team colors
          </span>
          <span className="ml-auto text-primary group-hover:translate-x-1 transition-transform">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </Link>

      {isAdmin && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-outline-variant/30">
          <button onClick={onEdit} className="qiu-btn-ghost flex-1 !bg-surface-low">
            Edit
          </button>
          <button onClick={onDelete}
            className="qiu-btn-ghost flex-1 !text-danger hover:!bg-danger-container">
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
