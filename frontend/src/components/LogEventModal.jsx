import { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';
import { useEventStore } from '../store/eventStore';
import { useTeamStore } from '../store/teamStore';

const eventTypes = [
  { value: 'goal',         label: 'Goal' },
  { value: 'own_goal',     label: 'Own Goal' },
  { value: 'yellow_card',  label: 'Yellow Card' },
  { value: 'red_card',     label: 'Red Card' },
  { value: 'substitution', label: 'Substitution' },
];

export default function LogEventModal({ open, onClose, match }) {
  const { logEvent, saving, error, clearError } = useEventStore();
  const fetchRoster = useTeamStore((s) => s.fetchRoster);
  const [form, setForm] = useState({
    event_type: 'goal',
    team_id: '',
    player_id: '',
    minute: '',
    notes: '',
  });
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);

  useEffect(() => {
    if (!open || !match) return;
    setForm({
      event_type: 'goal',
      team_id: match.home_team_id ?? '',
      player_id: '',
      minute: '',
      notes: '',
    });
    clearError();

    const load = async (teamId, setter) => {
      if (!teamId) { setter([]); return; }
      const players = await fetchRoster(teamId);
      setter(players);
    };
    load(match.home_team_id, setHomePlayers);
    load(match.away_team_id, setAwayPlayers);
  }, [open, match, clearError, fetchRoster]);

  const availablePlayers = useMemo(() => {
    if (!match) return [];
    if (form.team_id === match.home_team_id) return homePlayers;
    if (form.team_id === match.away_team_id) return awayPlayers;
    return [];
  }, [form.team_id, match, homePlayers, awayPlayers]);

  if (!match) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      match_id: match.id,
      event_type: form.event_type,
      team_id: form.team_id || null,
      player_id: form.player_id || null,
      minute: form.minute === '' ? null : Number(form.minute),
      notes: form.notes.trim() || null,
    };
    const result = await logEvent(payload);
    if (result) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log Match Event"
      subtitle={`${match.home_team?.name ?? 'TBD'} vs ${match.away_team?.name ?? 'TBD'}`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="sc-label">Event type</label>
          <select
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            className="sc-input"
          >
            {eventTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="sc-label">Team</label>
            <select
              required
              value={form.team_id}
              onChange={(e) => setForm({ ...form, team_id: e.target.value, player_id: '' })}
              className="sc-input"
            >
              {match.home_team && (
                <option value={match.home_team_id}>{match.home_team.name}</option>
              )}
              {match.away_team && (
                <option value={match.away_team_id}>{match.away_team.name}</option>
              )}
            </select>
          </div>
          <div>
            <label className="sc-label">Minute</label>
            <input
              type="number"
              min={0}
              max={200}
              value={form.minute}
              onChange={(e) => setForm({ ...form, minute: e.target.value })}
              className="sc-input"
              placeholder="e.g. 23"
            />
          </div>
        </div>

        <div>
          <label className="sc-label">Player</label>
          <select
            value={form.player_id}
            onChange={(e) => setForm({ ...form, player_id: e.target.value })}
            className="sc-input"
          >
            <option value="">— None —</option>
            {availablePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.jersey_number ?? '–'} {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="sc-label">Notes (optional)</label>
          <input
            type="text"
            maxLength={500}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="sc-input"
            placeholder="Free-kick, penalty, etc."
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
            {saving ? 'Logging…' : 'Log Event'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
