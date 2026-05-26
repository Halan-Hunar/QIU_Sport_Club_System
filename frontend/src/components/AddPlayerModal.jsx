import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useTeamStore } from '../store/teamStore';

const positions = [
  { value: 'Goalkeeper',  short: 'GK' },
  { value: 'Defender',    short: 'DF' },
  { value: 'Midfielder',  short: 'MF' },
  { value: 'Forward',     short: 'FW' },
  { value: 'N/A',         short: '–'  },
];

const defaults = { name: '', jersey_number: '', position: 'N/A' };

export default function AddPlayerModal({ open, onClose, teamId, player = null }) {
  const { addPlayer, updatePlayer, saving, error, clearError } = useTeamStore();
  const [form, setForm] = useState(defaults);

  useEffect(() => {
    if (player) {
      setForm({
        name: player.name ?? '',
        jersey_number: String(player.jersey_number ?? ''),
        position: player.position ?? 'N/A',
      });
    } else {
      setForm(defaults);
    }
    clearError();
  }, [player, open, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      jersey_number: Number(form.jersey_number),
      position: form.position,
    };
    const result = player
      ? await updatePlayer(player.id, payload)
      : await addPlayer(teamId, payload);
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={player ? 'Edit Player' : 'Add Player'}
      subtitle={player ? 'Update player details.' : 'Add a new athlete to the roster.'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Preview chip */}
        <div className="flex items-center gap-4 bg-surface-low rounded-md px-4 py-3
                        border border-outline-variant/40">
          <div className="w-12 h-12 rounded-full bg-primary text-white
                          flex items-center justify-center shadow-card">
            <span className="font-display text-lg leading-none tracking-wide">
              {form.jersey_number ? String(form.jersey_number).padStart(2, '0') : '##'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-headline-md text-ink leading-none truncate">
              {form.name || 'Player name'}
            </p>
            <p className="font-label text-label-md uppercase tracking-wider text-ink-variant mt-1.5">
              {form.position}
            </p>
          </div>
        </div>

        <div>
          <label className="qiu-label">Full name</label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="qiu-input"
            placeholder="e.g. Marcus Rivera"
          />
        </div>

        <div>
          <label className="qiu-label">Jersey number</label>
          <input
            type="number"
            required
            min={0}
            max={999}
            value={form.jersey_number}
            onChange={(e) => setForm({ ...form, jersey_number: e.target.value })}
            className="qiu-input"
            placeholder="10"
          />
        </div>

        <div>
          <label className="qiu-label">Position</label>
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

        {error && (
          <div className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="qiu-btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="qiu-btn-primary flex-1">
            {saving ? 'Saving…' : player ? 'Save changes' : 'Add player'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
