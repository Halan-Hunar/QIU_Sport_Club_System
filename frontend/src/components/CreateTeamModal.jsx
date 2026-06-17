import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useTeamStore } from '../store/teamStore';

const defaults = {
  name: '',
  primary_color: '#00bdfe',
  secondary_color: '#00668a',
};

const presets = [
  { name: 'Electric',  primary: '#00bdfe', secondary: '#00668a' },
  { name: 'Indigo',    primary: '#4f52ba', secondary: '#a7a9ff' },
  { name: 'Sunset',    primary: '#ff8a3d', secondary: '#ba1a1a' },
  { name: 'Forest',    primary: '#0d8a5a', secondary: '#06334e' },
  { name: 'Crimson',   primary: '#dc2626', secondary: '#7f1d1d' },
  { name: 'Royal',     primary: '#1d4ed8', secondary: '#1e1b4b' },
  { name: 'Emerald',   primary: '#10b981', secondary: '#064e3b' },
  { name: 'Amber',     primary: '#f59e0b', secondary: '#78350f' },
  { name: 'Violet',    primary: '#8b5cf6', secondary: '#4c1d95' },
  { name: 'Rose',      primary: '#ec4899', secondary: '#831843' },
  { name: 'Teal',      primary: '#14b8a6', secondary: '#134e4a' },
  { name: 'Slate',     primary: '#475569', secondary: '#0f172a' },
  { name: 'Lime',      primary: '#84cc16', secondary: '#365314' },
  { name: 'Cyan',      primary: '#06b6d4', secondary: '#164e63' },
  { name: 'Gold',      primary: '#eab308', secondary: '#713f12' },
  { name: 'Magenta',   primary: '#d946ef', secondary: '#6b21a8' },
  { name: 'Mint',      primary: '#34d399', secondary: '#065f46' },
  { name: 'Ruby',      primary: '#e11d48', secondary: '#4c0519' },
  { name: 'Sapphire',  primary: '#3b82f6', secondary: '#172554' },
  { name: 'Charcoal',  primary: '#374151', secondary: '#030712' },
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
          <label className="sc-label">Team name</label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="sc-input"
            placeholder="e.g. Engineering FC"
          />
        </div>

        {/* Color presets */}
        <div>
          <label className="sc-label">Color presets</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto
                          pr-1 -mr-1">
            {presets.map((p) => {
              const active = form.primary_color === p.primary
                          && form.secondary_color === p.secondary;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setForm({ ...form, primary_color: p.primary, secondary_color: p.secondary })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full border
                              transition-colors text-left
                              ${active
                                ? 'border-primary bg-primary-container/15'
                                : 'border-outline-variant/40 hover:border-primary'}`}
                >
                  <span className="flex flex-shrink-0">
                    <span className="w-3.5 h-3.5 rounded-full border border-white shadow"
                          style={{ background: p.primary }} />
                    <span className="w-3.5 h-3.5 rounded-full border border-white shadow -ml-1.5"
                          style={{ background: p.secondary }} />
                  </span>
                  <span className="font-label text-label-md uppercase tracking-wider
                                   text-ink-variant truncate">
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'primary_color', label: 'Primary' },
            { key: 'secondary_color', label: 'Secondary' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="sc-label">{label}</label>
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
          <button type="button" onClick={onClose} className="sc-btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="sc-btn-primary flex-1">
            {saving ? 'Saving…' : team ? 'Save changes' : 'Create team'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
