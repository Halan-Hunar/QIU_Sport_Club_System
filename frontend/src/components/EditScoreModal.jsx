import { useEffect, useState } from 'react';
import { Plus, Minus, Pencil, Check } from 'lucide-react';
import Modal from './Modal';
import { useMatchStore } from '../store/matchStore';


function Stepper({ value, onChange, disabled }) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(999, value + 1));
  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= 0}
        aria-label="Decrement score"
        className="sc-btn-secondary !w-10 !h-10 !p-0 !rounded-full"
      >
        <Minus size={16} strokeWidth={2.5} />
      </button>
      <span className="font-display text-4xl text-ink min-w-[3ch] text-center tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        aria-label="Increment score"
        className="sc-btn-secondary !w-10 !h-10 !p-0 !rounded-full"
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// Status and winner moved to MatchDetailModal (Fix 7). This modal now only
// edits the two scores and the scheduled kickoff time. Winner is auto-derived
// on the backend when status becomes 'completed'.
export default function EditScoreModal({ open, onClose, match }) {
  const { updateMatch, saving, error, clearError } = useMatchStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    home_score: 0,
    away_score: 0,
  });

  useEffect(() => {
    if (match) {
      setForm({
        home_score: match.home_score ?? 0,
        away_score: match.away_score ?? 0,
      });
    }
    setEditing(false);
    clearError();
  }, [match, open, clearError]);

  if (!match) return null;

  // Use either a team or player join as the competitor — same shape downstream.
  const home = match.home_team ?? match.home_player ?? null;
  const away = match.away_team ?? match.away_player ?? null;
  const homeWins = match.status === 'completed' && (
    (match.winner_id && match.winner_id === match.home_team_id) ||
    (match.winner_player_id && match.winner_player_id === match.home_player_id)
  );
  const awayWins = match.status === 'completed' && (
    (match.winner_id && match.winner_id === match.away_team_id) ||
    (match.winner_player_id && match.winner_player_id === match.away_player_id)
  );

  const handleConfirm = async () => {
    const payload = {
      home_score: Number(form.home_score),
      away_score: Number(form.away_score),
    };
    const result = await updateMatch(match.id, payload);
    if (result) setEditing(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Match Score"
      subtitle={`${match.round}${match.match_number ? ` · Match #${match.match_number}` : ''}`}
    >
      <div className="space-y-5">
        {/* Scoreboard — locked display or stepper edit */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3
                        bg-surface-low rounded-md p-4">
          <div className="text-center min-w-0">
            <p className={`font-display text-headline-md truncate
                          ${homeWins ? 'text-ink' : 'text-ink-variant'}`}>
              {home?.name ?? 'TBD'}
            </p>
            {editing ? (
              <Stepper
                value={form.home_score}
                onChange={(v) => setForm({ ...form, home_score: v })}
                disabled={!home}
              />
            ) : (
              <p className="font-display text-4xl text-ink mt-2 tabular-nums">
                {form.home_score}
              </p>
            )}
          </div>

          <span className="font-display text-headline-md text-ink-variant">vs</span>

          <div className="text-center min-w-0">
            <p className={`font-display text-headline-md truncate
                          ${awayWins ? 'text-ink' : 'text-ink-variant'}`}>
              {away?.name ?? 'TBD'}
            </p>
            {editing ? (
              <Stepper
                value={form.away_score}
                onChange={(v) => setForm({ ...form, away_score: v })}
                disabled={!away}
              />
            ) : (
              <p className="font-display text-4xl text-ink mt-2 tabular-nums">
                {form.away_score}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-danger-container text-danger-on-container rounded-sm px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="sc-btn-secondary flex-1">
            Close
          </button>
          {editing ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="sc-btn-primary flex-1"
            >
              <Check size={16} strokeWidth={2.5} />
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="sc-btn-primary flex-1"
            >
              <Pencil size={16} strokeWidth={2.5} />
              Edit Score
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
