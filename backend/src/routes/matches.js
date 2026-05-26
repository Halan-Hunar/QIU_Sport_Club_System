import { Router } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ─── Validation ───────────────────────────────────────────────
const matchStatuses = ['scheduled', 'live', 'completed', 'postponed'];

const updateMatchSchema = z
  .object({
    home_score: z.number().int().min(0).max(999).optional(),
    away_score: z.number().int().min(0).max(999).optional(),
    status: z.enum(matchStatuses).optional(),
    winner_id: z.string().uuid().optional().nullable(),
    scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
    location: z.string().trim().max(120).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

const sendValidationError = (res, parsed) =>
  res.status(400).json({ error: parsed.error.errors[0].message });

// ─── Bracket helpers ──────────────────────────────────────────
function bracketSeedOrder(n) {
  let arr = [1];
  while (arr.length < n) {
    const total = arr.length * 2;
    const next = [];
    for (const seed of arr) {
      next.push(seed);
      next.push(total + 1 - seed);
    }
    arr = next;
  }
  return arr;
}

function elimRoundName(totalRounds, roundIndex) {
  const fromFinal = totalRounds - roundIndex; // 0 = final
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semi Final';
  if (fromFinal === 2) return 'Quarter Final';
  const size = 2 ** (fromFinal + 1);
  return `Round of ${size}`;
}

function roundRobinSchedule(teams) {
  const arr = teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const total = arr.length;
  const rounds = [];
  for (let r = 0; r < total - 1; r++) {
    const round = [];
    for (let i = 0; i < total / 2; i++) {
      const home = arr[i];
      const away = arr[total - 1 - i];
      if (home && away) round.push({ home, away });
    }
    rounds.push(round);
    // rotate: fix index 0, rotate rest clockwise
    const last = arr[total - 1];
    for (let i = total - 1; i > 1; i--) arr[i] = arr[i - 1];
    arr[1] = last;
  }
  return rounds;
}

// Insert single-elim bracket. Returns the inserted rows in order.
async function generateSingleElim(tournamentId, registrations) {
  if (registrations.length < 2) {
    return { error: 'At least 2 teams must be registered.' };
  }

  const sorted = [...registrations].sort((a, b) => {
    const sa = a.seed ?? Number.POSITIVE_INFINITY;
    const sb = b.seed ?? Number.POSITIVE_INFINITY;
    return sa - sb;
  });

  let bracketSize = 1;
  while (bracketSize < sorted.length) bracketSize *= 2;
  const totalRounds = Math.log2(bracketSize);
  const order = bracketSeedOrder(bracketSize);
  const slots = order.map((pos) => sorted[pos - 1] ?? null);

  // Build matches per round (in memory, with temp keys)
  const rounds = []; // rounds[i] = array of match objects (no DB id yet)
  // Round 1
  const r1 = [];
  let pairIdx = 0;
  for (let i = 0; i < slots.length; i += 2) {
    const home = slots[i];
    const away = slots[i + 1];
    const hasBye = !home || !away;
    r1.push({
      home_team_id: home?.team_id ?? null,
      away_team_id: away?.team_id ?? null,
      status: hasBye ? 'completed' : 'scheduled',
      winner_id: hasBye ? (home?.team_id ?? away?.team_id ?? null) : null,
      _pairIdx: Math.floor(pairIdx / 2),
      _matchIdx: pairIdx,
    });
    pairIdx += 1;
  }
  rounds.push(r1);

  // Subsequent rounds: empty placeholders
  for (let r = 2; r <= totalRounds; r++) {
    const prev = rounds[r - 2];
    const cur = [];
    for (let i = 0; i < prev.length / 2; i++) {
      cur.push({
        home_team_id: null,
        away_team_id: null,
        status: 'scheduled',
        winner_id: null,
      });
    }
    rounds.push(cur);
  }

  // Insert from final back to round 1, so we can wire next_match_id
  let matchNumberCounter = (rounds.flat()).length; // descend
  const insertedByRound = new Array(rounds.length); // ids per round

  for (let r = rounds.length - 1; r >= 0; r--) {
    const isLast = r === rounds.length - 1;
    const round = rounds[r];
    const rows = round.map((m, idx) => ({
      tournament_id: tournamentId,
      round: elimRoundName(totalRounds, r + 1),
      match_number: matchNumberCounter - (round.length - 1 - idx),
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      home_score: 0,
      away_score: 0,
      status: m.status,
      winner_id: m.winner_id,
      next_match_id: isLast ? null : insertedByRound[r + 1][Math.floor(idx / 2)],
    }));
    matchNumberCounter -= round.length;

    const { data, error } = await supabaseAdmin
      .from('matches')
      .insert(rows)
      .select('id');

    if (error) return { error: error.message };
    insertedByRound[r] = data.map((d) => d.id);
  }

  // Propagate any auto-advancing BYE winners into round 2
  if (rounds.length > 1) {
    for (let i = 0; i < rounds[0].length; i++) {
      const m = rounds[0][i];
      if (m.status !== 'completed' || !m.winner_id) continue;
      const nextMatchId = insertedByRound[1][Math.floor(i / 2)];
      const slotIsHome = i % 2 === 0;
      const upd = slotIsHome
        ? { home_team_id: m.winner_id }
        : { away_team_id: m.winner_id };
      const { error } = await supabaseAdmin
        .from('matches')
        .update(upd)
        .eq('id', nextMatchId);
      if (error) return { error: error.message };
    }
  }

  return { ok: true };
}

async function generateRoundRobin(tournamentId, registrations) {
  if (registrations.length < 2) {
    return { error: 'At least 2 teams must be registered.' };
  }
  const schedule = roundRobinSchedule(registrations);
  const rows = [];
  let matchNum = 1;
  schedule.forEach((round, rIdx) => {
    round.forEach((pair) => {
      rows.push({
        tournament_id: tournamentId,
        round: `Round ${rIdx + 1}`,
        match_number: matchNum++,
        home_team_id: pair.home.team_id,
        away_team_id: pair.away.team_id,
        home_score: 0,
        away_score: 0,
        status: 'scheduled',
      });
    });
  });

  const { error } = await supabaseAdmin.from('matches').insert(rows);
  if (error) return { error: error.message };
  return { ok: true };
}

// ─── GET /api/matches?tournament_id=… ─────────────────────────
router.get('/', async (req, res) => {
  const tournamentId = req.query.tournament_id;
  if (!tournamentId) {
    return res.status(400).json({ error: 'tournament_id query param is required' });
  }

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, tournament_id, round, match_number,
      home_team_id, away_team_id, home_score, away_score,
      status, scheduled_at, started_at, ended_at, location,
      winner_id, next_match_id, created_at,
      home_team:teams!matches_home_team_id_fkey(id, name, primary_color, secondary_color),
      away_team:teams!matches_away_team_id_fkey(id, name, primary_color, secondary_color)
    `)
    .eq('tournament_id', tournamentId)
    .order('match_number', { ascending: true });

  if (error) {
    logger.error(`List matches failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }

  res.json({ matches: data ?? [] });
});

// ─── GET /api/matches/standings?tournament_id=… ───────────────
router.get('/standings', async (req, res) => {
  const tournamentId = req.query.tournament_id;
  if (!tournamentId) {
    return res.status(400).json({ error: 'tournament_id query param is required' });
  }

  const { data, error } = await supabase
    .from('tournament_standings')
    .select('*')
    .eq('tournament_id', tournamentId);

  if (error) {
    logger.error(`Fetch standings failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch standings' });
  }

  const standings = (data ?? []).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
    return b.goals_for - a.goals_for;
  });

  res.json({ standings });
});

// ─── POST /api/matches/generate ───────────────────────────────
router.post('/generate', requireAuth, requireAdmin, async (req, res) => {
  const { tournament_id } = req.body ?? {};
  if (!tournament_id) {
    return res.status(400).json({ error: 'tournament_id is required' });
  }

  const { data: tournament, error: tErr } = await supabaseAdmin
    .from('tournaments')
    .select('id, format')
    .eq('id', tournament_id)
    .single();

  if (tErr || !tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const { data: registrations, error: rErr } = await supabaseAdmin
    .from('tournament_teams')
    .select('team_id, seed, group_name')
    .eq('tournament_id', tournament_id);

  if (rErr) {
    return res.status(500).json({ error: 'Failed to load registrations' });
  }

  // Wipe existing matches first
  const { error: delErr } = await supabaseAdmin
    .from('matches')
    .delete()
    .eq('tournament_id', tournament_id);
  if (delErr) {
    logger.error(`Wipe matches failed: ${delErr.message}`);
    return res.status(500).json({ error: 'Failed to reset existing matches' });
  }

  let result;
  if (tournament.format === 'single_elim' || tournament.format === 'double_elim') {
    // Double-elim falls back to single-elim shape for now (loser bracket TBD).
    result = await generateSingleElim(tournament_id, registrations ?? []);
  } else if (tournament.format === 'round_robin') {
    result = await generateRoundRobin(tournament_id, registrations ?? []);
  } else {
    return res.status(501).json({
      error: 'Bracket generation for this format is not yet implemented.',
    });
  }

  if (result.error) {
    logger.error(`Generate bracket failed: ${result.error}`);
    return res.status(400).json({ error: result.error });
  }

  // Flip tournament to active
  await supabaseAdmin
    .from('tournaments')
    .update({ status: 'active' })
    .eq('id', tournament_id);

  logger.info(`Bracket generated: tournament ${tournament_id} (${tournament.format}) by ${req.user.email}`);
  res.status(201).json({ success: true });
});

// ─── PATCH /api/matches/:id ───────────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = updateMatchSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { data: existing, error: exErr } = await supabaseAdmin
    .from('matches')
    .select('id, home_team_id, away_team_id, next_match_id, match_number, tournament_id, status, winner_id')
    .eq('id', req.params.id)
    .single();

  if (exErr || !existing) {
    return res.status(404).json({ error: 'Match not found' });
  }

  const updates = { ...parsed.data };

  // Validate winner_id, if provided, belongs to this match
  if (updates.winner_id) {
    const valid = [existing.home_team_id, existing.away_team_id].includes(updates.winner_id);
    if (!valid) {
      return res.status(400).json({ error: 'winner_id must be the home or away team' });
    }
  }

  // If status becomes 'live' and started_at is unset, stamp it
  if (updates.status === 'live') {
    updates.started_at = new Date().toISOString();
  }
  if (updates.status === 'completed') {
    updates.ended_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    logger.error(`Update match failed: ${error?.message ?? 'not found'}`);
    return res.status(500).json({ error: 'Failed to update match' });
  }

  // Propagate winner into the next bracket match
  if (data.status === 'completed' && data.winner_id && data.next_match_id) {
    const { data: siblings, error: sibErr } = await supabaseAdmin
      .from('matches')
      .select('id, match_number')
      .eq('next_match_id', data.next_match_id)
      .order('match_number', { ascending: true });

    if (!sibErr && siblings?.length) {
      const isHomeFeeder = siblings[0].id === data.id;
      const slot = isHomeFeeder
        ? { home_team_id: data.winner_id }
        : { away_team_id: data.winner_id };
      await supabaseAdmin.from('matches').update(slot).eq('id', data.next_match_id);
    }
  }

  logger.info(`Match updated: ${data.id} by ${req.user.email}`);
  res.json({ match: data });
});

export default router;
