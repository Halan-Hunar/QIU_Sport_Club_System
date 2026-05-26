import { useEffect, useState } from 'react';
import Modal from './Modal';
import { useMatchStore } from '../store/matchStore';

const statuses = ['scheduled', 'live', 'completed', 'postponed'];

export default function EditScoreModal({ open, onClose, match }) {
  const { updateMatch, saving, error, clearError } = useMatchStore();
  const [form, setForm] = useState({
    home_score: 0,
    away_score: 0,
    status: 'scheduled',
    winner_id: '',
  });

  useEffect(() => {
    if (match) {
      setForm({
        home_score: match.home_score ?? 0,
        away_score: match.away_score ?? 0,
        status: match.status ?? 'scheduled',
        winner_id: match.winner_id ?? '',
      });
    }
    clearError();
  }, [match, open, clearError]);

  if (!match) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    let winner = form.winner_id || null;
    if (form.status === 'completed' && !winner) {
      if (form.home_score > form.away_score) winner = match.home_team_id;
      else if (form.away_score > form.home_score) winner = match.away_team_id;
      else winner = null; // draw
    }
    const payload = {
      home_score: Number(form.home_score),
      away_score: Number(form.away_score),
      status: form.status,
      winner_id: winner,
    };
    const result = await updateMatch(match.id, payload);
    if (result) onClose();
  };

  const homeTeam = match.home_team;
  const awayTeam = match.away_team;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Match Score"
      subtitle={`${match.round}${match.match_number ? ` · Match #${match.match_number}` : ''}`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Scoreboard */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3
                        bg-surface-low rounded-md p-4">
          <div className="text-center">
            <p className="font-display text-headline-md text-ink truncate">
              {homeTeam?.name ?? 'TBD'}
            </p>
            <input
              type="number"
              min={0}
              max={999}
              value={form.home_score}
              disabled={!homeTeam}
              onChange={(e) => setForm({ ...form, home_score: e.target.value })}
              className="sc-input mt-2 text-center !text-3xl !font-display !py-2"
            />
          </div>
          <span className="font-display text-headline-md text-ink-variant">vs</span>
          <div className="text-center">
            <p className="font-display text-headline-md text-ink truncate">
              {awayTeam?.name ?? 'TBD'}
            </p>
            <input
              type="number"
              min={0}
              max={999}
              value={form.away_score}
              disabled={!awayTeam}
              onChange={(e) => setForm({ ...form, away_score: e.target.value })}
              className="sc-input mt-2 text-center !text-3xl !font-display !py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="sc-label">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="sc-input"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="sc-label">Winner</label>
            <select
              value={form.winner_id}
              onChange={(e) => setForm({ ...form, winner_id: e.target.value })}
              className="sc-input"
            >
              <option value="">Auto / Draw</option>
              {homeTeam && <option value={homeTeam.id}>{homeTeam.name}</option>}
              {awayTeam && <option value={awayTeam.id}>{awayTeam.name}</option>}
            </select>
          </div>
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
