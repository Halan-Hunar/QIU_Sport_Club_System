export default function RosterRow({ player, isCaptain, isAdmin, onEdit, onDelete, onSetCaptain, even }) {
  return (
    <div className={`flex items-center gap-4 rounded-sm px-4 py-3 transition-colors
                     ${even ? 'bg-surface-low/60' : 'bg-white'}
                     border border-outline-variant/30 hover:border-primary-container/40`}>
      {/* Jersey */}
      <div className="w-11 h-11 rounded-full bg-primary text-white
                      flex items-center justify-center flex-shrink-0 shadow-card">
        <span className="font-display text-lg leading-none tracking-wide">
          {String(player.jersey_number).padStart(2, '0')}
        </span>
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-display text-headline-md text-ink leading-none">{player.name}</p>
          {isCaptain && (
            <span className="sc-chip bg-tertiary-container/40 text-tertiary-on-container">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3 6.5 7 .8-5.3 4.8 1.5 7-6.2-3.6L5.8 21l1.5-7L2 9.3l7-.8L12 2z" />
              </svg>
              Captain
            </span>
          )}
        </div>
        <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mt-1.5">
          {player.position}
        </p>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="flex items-center gap-1">
          {!isCaptain && (
            <button onClick={onSetCaptain} title="Set as captain"
              className="px-2.5 py-1.5 rounded-full text-xs font-label font-semibold
                         text-tertiary hover:bg-tertiary-container/40 transition-colors">
              Set C
            </button>
          )}
          <button onClick={onEdit}
            className="px-2.5 py-1.5 rounded-full text-xs font-label font-semibold
                       text-ink-variant hover:bg-surface-low transition-colors">
            Edit
          </button>
          <button onClick={onDelete}
            className="w-8 h-8 rounded-full text-danger hover:bg-danger-container
                       flex items-center justify-center transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
