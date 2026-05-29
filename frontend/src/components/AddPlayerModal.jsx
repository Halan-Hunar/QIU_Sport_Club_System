import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useTeamStore } from '../store/teamStore';
import { usePlayerStore } from '../store/playerStore';
import { SPORTS } from '../constants/sports';

// Football-specific positions only apply to team-roster players. Standalone
// (individual-sport) players intentionally don't surface this selector.
const positions = [
  { value: 'Goalkeeper',  short: 'GK' },
  { value: 'Defender',    short: 'DF' },
  { value: 'Midfielder',  short: 'MF' },
  { value: 'Forward',     short: 'FW' },
  { value: 'N/A',         short: '–'  },
];

const teamDefaults = { name: '', position: 'N/A' };
const standaloneDefaults = { name: '', notes: '', sports: [] };

// teamId is optional. When omitted (and we're not editing a player that
// already has a team), the modal runs in *standalone* mode: it asks only for
// the fields that make sense for individual-sport players (chess, table
// tennis, swimming…), with no football position selector.
export default function AddPlayerModal({ open, onClose, teamId, player = null }) {
  const teamAddPlayer    = useTeamStore((s) => s.addPlayer);
  const teamUpdatePlayer = useTeamStore((s) => s.updatePlayer);
  const teamSaving       = useTeamStore((s) => s.saving);
  const teamError        = useTeamStore((s) => s.error);
  const teamClearError   = useTeamStore((s) => s.clearError);

  const standaloneCreate = usePlayerStore((s) => s.createPlayer);
  const standaloneUpdate = usePlayerStore((s) => s.updatePlayer);
  const standaloneSaving = usePlayerStore((s) => s.saving);
  const standaloneError  = usePlayerStore((s) => s.error);
  const standaloneClear  = usePlayerStore((s) => s.clearError);

  const useStandalone = !teamId && !player?.team_id;
  const saving = useStandalone ? standaloneSaving : teamSaving;
  const error  = useStandalone ? standaloneError  : teamError;

  const [form, setForm] = useState(useStandalone ? standaloneDefaults : teamDefaults);

  // Reset whenever the modal opens / target player changes / mode flips.
  useEffect(() => {
    if (player) {
      if (useStandalone) {
        setForm({
          name: player.name ?? '',
          notes: player.notes ?? '',
          sports: player.sports ?? [],
        });
      } else {
        setForm({
          name: player.name ?? '',
          position: player.position ?? 'N/A',
        });
      }
    } else {
      setForm(useStandalone ? standaloneDefaults : teamDefaults);
    }
    teamClearError();
    standaloneClear();
  }, [player, open, useStandalone, teamClearError, standaloneClear]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { name: form.name.trim() };

    if (useStandalone) {
      const notes = (form.notes ?? '').trim();
      payload.notes = notes || null;
      payload.sports = form.sports ?? [];
    } else {
      payload.position = form.position;
    }

    let result;
    if (player) {
      result = useStandalone
        ? await standaloneUpdate(player.id, payload)
        : await teamUpdatePlayer(player.id, payload);
    } else if (useStandalone) {
      result = await standaloneCreate(payload);
    } else {
      result = await teamAddPlayer(teamId, payload);
    }
    if (result) onClose();
  };

  // ── Header copy ────────────────────────────────────────────
  const title = player
    ? 'Edit Player'
    : useStandalone
      ? 'New Player'
      : 'Add Player';

  const subtitle = player
    ? 'Update player details.'
    : useStandalone
      ? 'Standalone player for individual-sport tournaments'
      : 'Add a new athlete to the roster.';

  const submitLabel = saving
    ? 'Saving…'
    : player
      ? 'Save changes'
      : useStandalone
        ? 'Add Player'
        : 'Add to Roster';

  // ── Preview header (shared) ────────────────────────────────
  const avatarLabel = useStandalone
    ? (form.name?.charAt(0).toUpperCase() || '·')
    : '##';

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Preview chip */}
        <div className="flex items-center gap-4 bg-surface-low rounded-md px-4 py-3
                        border border-outline-variant/40">
          <div className="w-12 h-12 rounded-full bg-primary text-white
                          flex items-center justify-center shadow-card">
            <span className="font-display text-lg leading-none tracking-wide">
              {avatarLabel}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-headline-md text-ink leading-none truncate">
              {form.name || 'Player name'}
            </p>
            <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mt-1.5">
              {useStandalone ? 'Individual Player' : form.position}
            </p>
          </div>
        </div>

        <div>
          <label className="sc-label">Full name</label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="sc-input"
            placeholder="e.g. Marcus Rivera"
          />
        </div>

        {useStandalone ? (
          <>
            <div>
              <label className="sc-label">
                Notes{' '}
                <span className="text-ink-variant/70 normal-case">(optional)</span>
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="sc-input resize-none"
                placeholder="Rank, skill level, faculty, contact, …"
              />
            </div>

            <div>
              <label className="sc-label">
                Sports{' '}
                <span className="text-ink-variant/70 normal-case">
                  (pick what they play — used to filter tournament registration)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((s) => {
                  const active = (form.sports ?? []).includes(s.value);
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        const cur = form.sports ?? [];
                        const next = active
                          ? cur.filter((v) => v !== s.value)
                          : [...cur, s.value];
                        setForm({ ...form, sports: next });
                      }}
                      className={`px-3 py-1.5 rounded-full font-label font-semibold uppercase
                                 tracking-wider text-xs transition-colors
                                 ${active
                                   ? 'bg-primary text-white shadow-card'
                                   : 'bg-white border border-outline-variant text-ink-variant hover:border-primary'}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {(form.sports ?? []).length === 0 && (
                <p className="text-xs text-ink-variant mt-2">
                  Leaving this empty means this player won't appear when registering for any tournament.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="sc-label">Position</label>
              <div className="grid grid-cols-5 gap-2">
                {positions.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm({ ...form, position: p.value })}
                    title={p.value}
                    className={`py-2.5 rounded-full font-label font-semibold uppercase
                               tracking-wider text-xs transition-colors
                               ${form.position === p.value
                                 ? 'bg-primary text-white shadow-card'
                                 : 'bg-white border border-outline-variant text-ink-variant hover:border-primary'}`}
                  >
                    {p.short}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-variant mt-2">{form.position}</p>
            </div>
          </>
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
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
