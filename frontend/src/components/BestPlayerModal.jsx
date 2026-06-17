import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from './Modal';
import { apiFetch } from '../lib/api';
import { useTournamentStatsStore } from '../store/tournamentStatsStore';

const API = import.meta.env.VITE_API_URL;

// Admin-only modal: pick a team registered in this tournament, then either
// pick a player from that team's roster or free-text a name. We don't store
// player_id — best player is a curated label, not a join.
export default function BestPlayerModal({ open, onClose, tournamentId }) {
  const setBestPlayer = useTournamentStatsStore((s) => s.setBestPlayer);
  const saving = useTournamentStatsStore((s) => s.saving);

  const [teams, setTeams] = useState([]);          // [{ id, name, primary_color, secondary_color }]
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamId, setTeamId] = useState('');

  const [roster, setRoster] = useState([]);        // [{ id, name, jersey_number }]
  const [rosterLoading, setRosterLoading] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const [freeFormOpen, setFreeFormOpen] = useState(false);
  const [freeForm, setFreeForm] = useState('');
  const freeFormRef = useRef(null);

  const [localError, setLocalError] = useState(null);

  // Load registered teams whenever the modal opens.
  useEffect(() => {
    if (!open || !tournamentId) return;
    setTeamId('');
    setPlayerName('');
    setFreeFormOpen(false);
    setFreeForm('');
    setLocalError(null);
    setRoster([]);

    let cancelled = false;
    (async () => {
      setTeamsLoading(true);
      try {
        const res = await apiFetch(`${API}/api/tournaments/${tournamentId}`);
        const body = await res.json();
        if (cancelled) return;
        if (res.ok) {
          const registered = (body.teams ?? [])
            .map((r) => r.team)
            .filter(Boolean)
            // De-duplicate just in case the API returns repeats.
            .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
          setTeams(registered);
        } else {
          setLocalError(body.error || 'Failed to load teams');
        }
      } catch {
        if (!cancelled) setLocalError('Connection failed.');
      } finally {
        if (!cancelled) setTeamsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, tournamentId]);

  // Load the chosen team's roster.
  useEffect(() => {
    if (!teamId) { setRoster([]); return; }
    let cancelled = false;
    (async () => {
      setRosterLoading(true);
      try {
        const res = await apiFetch(`${API}/api/teams/${teamId}`);
        const body = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setRoster((body.players ?? []).filter((p) => !p.deleted_at));
        }
      } catch {
        // Roster load failure is non-fatal — admin can still free-text a name.
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [teamId]);

  useEffect(() => {
    if (freeFormOpen) freeFormRef.current?.focus();
  }, [freeFormOpen]);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === teamId) || null,
    [teams, teamId],
  );

  const handleSave = async (e) => {
    e?.preventDefault?.();
    const name = (freeFormOpen ? freeForm : playerName).trim();
    if (!name) {
      setLocalError('Pick or enter a player name.');
      return;
    }
    if (!teamId) {
      setLocalError('Pick a team.');
      return;
    }
    const ok = await setBestPlayer(tournamentId, {
      name,
      teamId,
      teamName: selectedTeam?.name ?? null,
      teamColor: selectedTeam?.primary_color ?? null,
    });
    if (ok) onClose();
  };

  const handleClear = async () => {
    const ok = await setBestPlayer(tournamentId, { name: null, teamId: null });
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set Best Player"
      subtitle="Pick the tournament's standout — saved as a manual award."
    >
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="sc-label">Team</label>
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setPlayerName('');
              setFreeFormOpen(false);
              setFreeForm('');
            }}
            disabled={teamsLoading}
            className="sc-input"
            required
          >
            <option value="">{teamsLoading ? 'Loading…' : '— Select a team —'}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="sc-label">Player</label>
          {teamId ? (
            freeFormOpen ? (
              <div className="space-y-2">
                <input
                  ref={freeFormRef}
                  type="text"
                  value={freeForm}
                  onChange={(e) => setFreeForm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setFreeFormOpen(false);
                      setFreeForm('');
                    }
                  }}
                  className="sc-input"
                  placeholder="Player name"
                />
                <button
                  type="button"
                  onClick={() => { setFreeFormOpen(false); setFreeForm(''); }}
                  className="text-ink-variant hover:text-primary text-sm transition-colors"
                >
                  Choose from roster instead
                </button>
              </div>
            ) : (
              <>
                <select
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={rosterLoading}
                  className="sc-input"
                >
                  <option value="">
                    {rosterLoading ? 'Loading roster…' : '— Select a player —'}
                  </option>
                  {roster.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.jersey_number != null ? `#${p.jersey_number} ` : ''}{p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setFreeFormOpen(true)}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold
                             text-primary hover:underline"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Add Player
                </button>
              </>
            )
          ) : (
            <p className="text-sm text-ink-variant italic">Pick a team first.</p>
          )}
        </div>

        {localError && (
          <div className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
            {localError}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={onClose} className="sc-btn-secondary flex-1">
            Cancel
          </button>
          <button type="button" onClick={handleClear}
                  disabled={saving}
                  className="sc-btn-ghost !text-danger hover:!bg-danger-container">
            Clear
          </button>
          <button type="submit" disabled={saving} className="sc-btn-primary flex-1">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
