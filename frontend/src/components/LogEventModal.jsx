import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Check } from 'lucide-react';
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
  const addPlayer = useTeamStore((s) => s.addPlayer);

  const [form, setForm] = useState({
    event_type: 'goal',
    team_id: '',
    player_id: '',
    minute: '',
    notes: '',
  });
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);

  // Quick Add state — local to the player listbox.
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddError, setQuickAddError] = useState(null);
  const quickAddInputRef = useRef(null);

  useEffect(() => {
    if (!open || !match) return;
    setForm({
      event_type: 'goal',
      team_id: match.home_team_id ?? '',
      player_id: '',
      minute: '',
      notes: '',
    });
    setQuickAddOpen(false);
    setNewPlayerName('');
    setQuickAddError(null);
    clearError();

    const load = async (teamId, setter) => {
      if (!teamId) { setter([]); return; }
      const players = await fetchRoster(teamId);
      setter(players);
    };
    load(match.home_team_id, setHomePlayers);
    load(match.away_team_id, setAwayPlayers);
  }, [open, match, clearError, fetchRoster]);

  // Auto-focus the Quick Add input the moment it opens.
  useEffect(() => {
    if (quickAddOpen) quickAddInputRef.current?.focus();
  }, [quickAddOpen]);

  const availablePlayers = useMemo(() => {
    if (!match) return [];
    if (form.team_id === match.home_team_id) return homePlayers;
    if (form.team_id === match.away_team_id) return awayPlayers;
    return [];
  }, [form.team_id, match, homePlayers, awayPlayers]);

  if (!match) return null;

  // Individual-sport matches (chess, table tennis, …) have no team to add to,
  // so the Quick Add affordance is hidden in that mode.
  const isIndividual = !match.home_team_id && !match.away_team_id;

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

  const handleQuickAdd = async () => {
    const name = newPlayerName.trim();
    if (!name || quickAddSaving) return;
    if (!form.team_id) {
      setQuickAddError('Select a team first.');
      return;
    }
    setQuickAddSaving(true);
    setQuickAddError(null);
    const created = await addPlayer(form.team_id, { name });
    if (!created) {
      setQuickAddSaving(false);
      setQuickAddError('Failed to add player.');
      return;
    }
    // Refresh roster from server so the listbox shows the new player with
    // whatever server-side defaults it picked up.
    const refreshed = await fetchRoster(form.team_id);
    if (form.team_id === match.home_team_id) setHomePlayers(refreshed);
    else if (form.team_id === match.away_team_id) setAwayPlayers(refreshed);

    setForm((f) => ({ ...f, player_id: created.id }));
    setQuickAddSaving(false);
    setNewPlayerName('');
    setQuickAddOpen(false);
  };

  const cancelQuickAdd = () => {
    setQuickAddOpen(false);
    setNewPlayerName('');
    setQuickAddError(null);
  };

  const selectPlayer = (id) => {
    setForm({ ...form, player_id: id });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log Match Event"
      subtitle={`${match.home_team?.name ?? match.home_player?.name ?? 'TBD'} vs ${match.away_team?.name ?? match.away_player?.name ?? 'TBD'}`}
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
              onChange={(e) => {
                setForm({ ...form, team_id: e.target.value, player_id: '' });
                cancelQuickAdd();
              }}
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

          {quickAddOpen ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  ref={quickAddInputRef}
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAdd();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelQuickAdd();
                    }
                  }}
                  className="sc-input flex-1 !py-2"
                  placeholder="Player name"
                  required
                />
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  disabled={!newPlayerName.trim() || quickAddSaving}
                  className="sc-btn-primary !py-1.5 !px-4 text-sm"
                >
                  {quickAddSaving ? 'Adding…' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={cancelQuickAdd}
                  className="text-ink-variant hover:text-primary text-sm transition-colors px-2"
                >
                  Cancel
                </button>
              </div>
              {quickAddError && (
                <p className="text-danger text-sm">{quickAddError}</p>
              )}
            </div>
          ) : (
            <div
              role="listbox"
              aria-label="Player"
              className="bg-white border border-outline-variant rounded
                         max-h-48 overflow-y-auto divide-y divide-outline-variant/30"
            >
              <PlayerOption
                label="— None —"
                selected={form.player_id === ''}
                muted
                onClick={() => selectPlayer('')}
              />
              {availablePlayers.map((p) => (
                <PlayerOption
                  key={p.id}
                  label={
                    <>
                      <span className="text-ink-variant mr-2">
                        #{p.jersey_number ?? '–'}
                      </span>
                      {p.name}
                    </>
                  }
                  selected={form.player_id === p.id}
                  onClick={() => selectPlayer(p.id)}
                />
              ))}
              {!isIndividual && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddError(null);
                    setNewPlayerName('');
                    setQuickAddOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2
                             text-primary font-semibold hover:bg-surface-low
                             transition-colors text-sm"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add new player
                </button>
              )}
            </div>
          )}
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

function PlayerOption({ label, selected, muted, onClick }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2
                  text-sm transition-colors
                  ${selected
                    ? 'bg-primary-container/15 text-primary font-semibold'
                    : muted
                      ? 'text-ink-variant hover:bg-surface-low'
                      : 'text-ink hover:bg-surface-low'}`}
    >
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {selected && <Check size={14} strokeWidth={2.5} className="text-primary flex-shrink-0" />}
    </button>
  );
}
