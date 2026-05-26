import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useTeamStore } from '../store/teamStore';

const defaults = {
  name: '',
  primary_color: '#00bdfe',
  secondary_color: '#00668a',
};

const presets = [
  { name: 'Electric', primary: '#00bdfe', secondary: '#00668a' },
  { name: 'Indigo',   primary: '#4f52ba', secondary: '#a7a9ff' },
  { name: 'Sunset',   primary: '#ff8a3d', secondary: '#ba1a1a' },
  { name: 'Forest',   primary: '#0d8a5a', secondary: '#06334e' },
];

export default function CreateTeamModal({ open, onClose, team = null }) {
  const { createTeam, updateTeam, saving, error, clearError } = useTeamStore();
  const [form, setForm] = useState(defaults);

  useEffect(() => {
    if (team) {
      setForm({
        name: team.name ?? '',
        primary_color: team.primary_color ?? '#00bdfe',
        secondary_color: team.secondary_color ?? '#00668a',
      });
    } else {
      setForm(defaults);
    }
    clearError();
  }, [team, open, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
    };
    const result = team
      ? await updateTeam(team.id, payload)
      : await createTeam(payload);
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={team ? 'Edit Team' : 'New Team'}
      subtitle={team ? 'Update team details and colors.' : 'Add a competitive team to the league.'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Preview */}
        <div className="rounded-md p-5 text-white shadow-card flex items-center gap-4"
             style={{
               background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color})`,
             }}>
          <div className="w-12 h-12 rounded-md bg-white/95 flex items-center justify-center
                          font-display text-xl"
               style={{ color: form.primary_color }}>
            {form.name?.charAt(0)?.toUpperCase() || 'Q'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-label text-label-md uppercase tracking-wider text-white/80">
              Live preview
            </p>
            <p className="font-display text-headline-md leading-none mt-1 truncate">
              {form.name || 'Team name'}
            </p>
          </div>
        </div>

        <div>
          <label className="qiu-label">Team name</label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="qiu-input"
            placeholder="e.g. Engineering FC"
          />
        </div>

        {/* Color presets */}
        <div>
          <label className="qiu-label">Color presets</label>
          <div className="flex gap-2 flex-wrap">
            {presets.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setForm({ ...form, primary_color: p.primary, secondary_color: p.secondary })}
                className="flex items-center gap-2 px-3 py-2 rounded-full border
                           border-outline-variant/40 hover:border-primary transition-colors"
              >
                <span className="flex">
                  <span className="w-3.5 h-3.5 rounded-full border border-white shadow"
                        style={{ background: p.primary }} />
                  <span className="w-3.5 h-3.5 rounded-full border border-white shadow -ml-1.5"
                        style={{ background: p.secondary }} />
                </span>
                <span className="font-label text-label-md uppercase tracking-wider text-ink-variant">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'primary_color', label: 'Primary' },
            { key: 'secondary_color', label: 'Secondary' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="qiu-label">{label}</label>
              <div className="flex items-center gap-2 bg-white border border-outline-variant
                              rounded px-3 py-2">
                <input
                  type="color"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-9 h-9 rounded-sm bg-transparent border-0 cursor-pointer p-0"
                />
                <span className="text-ink-variant text-sm font-mono uppercase">
                  {form[key]}
                </span>
              </div>
            </div>
          ))}
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
            {saving ? 'Saving…' : team ? 'Save changes' : 'Create team'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
