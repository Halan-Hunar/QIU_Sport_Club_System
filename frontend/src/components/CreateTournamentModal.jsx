import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useTournamentStore } from '../store/tournamentStore';

const formatOptions = [
  { value: 'single_elim',    label: 'Single Elimination' },
  { value: 'double_elim',    label: 'Double Elimination' },
  { value: 'round_robin',    label: 'Round Robin' },
  { value: 'group_knockout', label: 'Group Stage + Knockout' },
];

const sportOptions = ['football', 'basketball', 'volleyball', 'tennis', 'cricket', 'esports'];

const defaults = {
  name: '',
  sport_type: 'football',
  format: 'single_elim',
  start_date: '',
  end_date: '',
  description: '',
};

export default function CreateTournamentModal({ open, onClose, tournament = null }) {
  const { createTournament, updateTournament, saving, error, clearError } = useTournamentStore();
  const [form, setForm] = useState(defaults);

  useEffect(() => {
    if (tournament) {
      setForm({
        name: tournament.name ?? '',
        sport_type: tournament.sport_type ?? 'football',
        format: tournament.format ?? 'single_elim',
        start_date: tournament.start_date ?? '',
        end_date: tournament.end_date ?? '',
        description: tournament.description ?? '',
      });
    } else {
      setForm(defaults);
    }
    clearError();
  }, [tournament, open, clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      sport_type: form.sport_type,
      format: form.format,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description.trim() || null,
    };
    const result = tournament
      ? await updateTournament(tournament.id, payload)
      : await createTournament(payload);
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tournament ? 'Edit Tournament' : 'New Tournament'}
      subtitle={tournament
        ? 'Update tournament details and format.'
        : 'Set up a new inter-faculty championship.'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="sc-label">Tournament name</label>
          <input
            type="text"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="sc-input"
            placeholder="e.g. Spring Championship 2026"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="sc-label">Sport</label>
            <select
              value={form.sport_type}
              onChange={(e) => setForm({ ...form, sport_type: e.target.value })}
              className="sc-input"
            >
              {sportOptions.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="sc-label">Format</label>
            <select
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value })}
              className="sc-input"
            >
              {formatOptions.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="sc-label">Start date</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="sc-input"
            />
          </div>
          <div>
            <label className="sc-label">End date</label>
            <input
              type="date"
              value={form.end_date}
              min={form.start_date || undefined}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="sc-input"
            />
          </div>
        </div>

        <div>
          <label className="sc-label">Description</label>
          <textarea
            rows={3}
            maxLength={1000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="sc-input resize-none"
            placeholder="Short summary, rules, prize info…"
          />
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
            {saving ? 'Saving…' : tournament ? 'Save changes' : 'Create tournament'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
