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
    winner_player_id: z.string().uuid().optional().nullable(),
    scheduled_at: z.string().datetime({ offset: true }).optional().nullable(),
    location: z.string().trim().max(120).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

const sendValidationError = (res, parsed) =>
  res.status(400).json({ error: parsed.error.errors[0].message });

// Column-name helper. `kind` is 'team' (default) or 'player'.
const cols = (kind) => kind === 'player'
  ? { id: 'player_id', home: 'home_player_id', away: 'away_player_id', winner: 'winner_player_id' }
  : { id: 'team_id',   home: 'home_team_id',   away: 'away_team_id',   winner: 'winner_id' };

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

function roundRobinSchedule(competitors) {
  const arr = competitors.length % 2 === 0 ? [...competitors] : [...competitors, null];
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
    const last = arr[total - 1];
    for (let i = total - 1; i > 1; i--) arr[i] = arr[i - 1];
    arr[1] = last;
  }
  return rounds;
}

async function generateSingleElim(tournamentId, registrations, opts = {}) {
  const c = cols(opts.kind);
  if (registrations.length < 2) {
    return { error: `At least 2 ${opts.kind === 'player' ? 'players' : 'teams'} must be registered.` };
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

  const rounds = [];
  const r1 = [];
  for (let i = 0; i < slots.length; i += 2) {
    const home = slots[i];
    const away = slots[i + 1];
    const hasBye = !home || !away;
    r1.push({
      [c.home]: home?.[c.id] ?? null,
      [c.away]: away?.[c.id] ?? null,
      status: hasBye ? 'completed' : 'scheduled',
      [c.winner]: hasBye ? (home?.[c.id] ?? away?.[c.id] ?? null) : null,
    });
  }
  rounds.push(r1);

  for (let r = 2; r <= totalRounds; r++) {
    const prev = rounds[r - 2];
    const cur = [];
    for (let i = 0; i < prev.length / 2; i++) {
      cur.push({
        [c.home]: null,
        [c.away]: null,
        status: 'scheduled',
        [c.winner]: null,
      });
    }
    rounds.push(cur);
  }

  let matchNumberCounter = rounds.flat().length;
  const insertedByRound = new Array(rounds.length);

  for (let r = rounds.length - 1; r >= 0; r--) {
    const isLast = r === rounds.length - 1;
    const round = rounds[r];
    const rows = round.map((m, idx) => ({
      tournament_id: tournamentId,
      round: elimRoundName(totalRounds, r + 1),
      match_number: matchNumberCounter - (round.length - 1 - idx),
      [c.home]: m[c.home],
      [c.away]: m[c.away],
      home_score: 0,
      away_score: 0,
      status: m.status,
      [c.winner]: m[c.winner],
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

  // Propagate BYE winners into round 2.
  if (rounds.length > 1) {
    for (let i = 0; i < rounds[0].length; i++) {
      const m = rounds[0][i];
      if (m.status !== 'completed' || !m[c.winner]) continue;
      const nextMatchId = insertedByRound[1][Math.floor(i / 2)];
      const slotIsHome = i % 2 === 0;
      const upd = slotIsHome ? { [c.home]: m[c.winner] } : { [c.away]: m[c.winner] };
      const { error } = await supabaseAdmin
        .from('matches')
        .update(upd)
        .eq('id', nextMatchId);
      if (error) return { error: error.message };
    }
  }

  return { ok: true };
}

async function generateRoundRobin(tournamentId, registrations, opts = {}) {
  const c = cols(opts.kind);
  if (registrations.length < 2) {
    return { error: `At least 2 ${opts.kind === 'player' ? 'players' : 'teams'} must be registered.` };
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
        [c.home]: pair.home[c.id],
        [c.away]: pair.away[c.id],
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

// Group stage (team tournaments only for now).
async function generateGroupStage(tournamentId, registrations) {
  if (registrations.length < 4) {
    return { error: 'At least 4 teams are required for a group stage.' };
  }
  const preassigned = registrations.filter((r) => r.group_name);
  let groups;
  if (preassigned.length === registrations.length) {
    const byName = new Map();
    for (const r of registrations) {
      if (!byName.has(r.group_name)) byName.set(r.group_name, []);
      byName.get(r.group_name).push(r);
    }
    groups = [...byName.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, list]) => ({ name, teams: list }));
  } else {
    const sorted = [...registrations].sort((a, b) => {
      const sa = a.seed ?? Number.POSITIVE_INFINITY;
      const sb = b.seed ?? Number.POSITIVE_INFINITY;
      return sa - sb;
    });
    const groupCount = Math.max(2, Math.round(sorted.length / 4));
    const sizes = new Array(groupCount).fill(0);
    sorted.forEach((_, i) => { sizes[i % groupCount] += 1; });
    if (sizes.some((s) => s < 2)) {
      return { error: 'Could not divide teams evenly: each group needs at least 2 teams.' };
    }
    groups = sizes.map((_, i) => ({
      name: String.fromCharCode(65 + i),
      teams: [],
    }));
    sorted.forEach((reg, i) => {
      const gIdx = i % groupCount;
      groups[gIdx].teams.push({ ...reg, group_name: groups[gIdx].name });
    });
  }
  for (const g of groups) {
    for (const reg of g.teams) {
      const { error } = await supabaseAdmin
        .from('tournament_teams')
        .update({ group_name: g.name })
        .eq('tournament_id', tournamentId)
        .eq('team_id', reg.team_id);
      if (error) return { error: error.message };
    }
  }
  const rows = [];
  let matchNum = 1;
  for (const g of groups) {
    const schedule = roundRobinSchedule(g.teams);
    schedule.forEach((round, rIdx) => {
      round.forEach((pair) => {
        rows.push({
          tournament_id: tournamentId,
          round: `Group ${g.name} · Round ${rIdx + 1}`,
          match_number: matchNum++,
          home_team_id: pair.home.team_id,
          away_team_id: pair.away.team_id,
          home_score: 0,
          away_score: 0,
          status: 'scheduled',
        });
      });
    });
  }
  if (rows.length === 0) {
    return { error: 'Group schedule produced no matches.' };
  }
  const { error } = await supabaseAdmin.from('matches').insert(rows);
  if (error) return { error: error.message };
  return { ok: true, groupCount: groups.length };
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
      home_team_id, away_team_id, home_player_id, away_player_id,
      home_score, away_score,
      status, scheduled_at, started_at, ended_at, location,
      winner_id, winner_player_id, next_match_id, created_at,
      home_team:teams!matches_home_team_id_fkey(id, name, primary_color, secondary_color),
      away_team:teams!matches_away_team_id_fkey(id, name, primary_color, secondary_color),
      home_player:players!matches_home_player_id_fkey(id, name, jersey_number),
      away_player:players!matches_away_player_id_fkey(id, name, jersey_number)
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
    .select('id, format, is_individual')
    .eq('id', tournament_id)
    .single();

  if (tErr || !tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const isIndividual = !!tournament.is_individual;

  // Load competitor registrations.
  let registrations;
  if (isIndividual) {
    const { data, error } = await supabaseAdmin
      .from('tournament_players')
      .select('player_id, seed')
      .eq('tournament_id', tournament_id);
    if (error) return res.status(500).json({ error: 'Failed to load player registrations' });
    registrations = data ?? [];
  } else {
    const { data, error } = await supabaseAdmin
      .from('tournament_teams')
      .select('team_id, seed, group_name')
      .eq('tournament_id', tournament_id);
    if (error) return res.status(500).json({ error: 'Failed to load team registrations' });
    registrations = data ?? [];
  }

  // Wipe existing matches first.
  const { error: delErr } = await supabaseAdmin
    .from('matches')
    .delete()
    .eq('tournament_id', tournament_id);
  if (delErr) {
    logger.error(`Wipe matches failed: ${delErr.message}`);
    return res.status(500).json({ error: 'Failed to reset existing matches' });
  }

  const opts = { kind: isIndividual ? 'player' : 'team' };
  let result;

  if (tournament.format === 'single_elim' || tournament.format === 'double_elim') {
    result = await generateSingleElim(tournament_id, registrations, opts);
  } else if (tournament.format === 'round_robin') {
    result = await generateRoundRobin(tournament_id, registrations, opts);
  } else if (tournament.format === 'group_knockout') {
    if (isIndividual) {
      return res.status(501).json({
        error: 'Group + Knockout for individual sports isn\'t supported yet — use single elimination or round robin.',
      });
    }
    result = await generateGroupStage(tournament_id, registrations);
  } else {
    return res.status(501).json({
      error: 'Bracket generation for this format is not yet implemented.',
    });
  }

  if (result.error) {
    logger.error(`Generate bracket failed: ${result.error}`);
    return res.status(400).json({ error: result.error });
  }

  await supabaseAdmin
    .from('tournaments')
    .update({ status: 'active' })
    .eq('id', tournament_id);

  logger.info(`Bracket generated: tournament ${tournament_id} (${tournament.format}, ${opts.kind}) by ${req.user.email}`);
  res.status(201).json({ success: true });
});

// ─── POST /api/matches/generate-knockout ──────────────────────
// Promote top finishers from a completed group stage into single-elim.
router.post('/generate-knockout', requireAuth, requireAdmin, async (req, res) => {
  const { tournament_id, advance_per_group = 2 } = req.body ?? {};
  if (!tournament_id) {
    return res.status(400).json({ error: 'tournament_id is required' });
  }

  const { data: groupMatches, error: gmErr } = await supabaseAdmin
    .from('matches')
    .select('id, status, round')
    .eq('tournament_id', tournament_id)
    .like('round', 'Group %');

  if (gmErr) return res.status(500).json({ error: 'Failed to load matches' });
  if (!groupMatches || groupMatches.length === 0) {
    return res.status(400).json({ error: 'No group-stage matches found.' });
  }
  if (groupMatches.some((m) => m.status !== 'completed')) {
    return res.status(400).json({ error: 'Finish all group-stage matches before generating knockout.' });
  }

  const { data: standings, error: sErr } = await supabaseAdmin
    .from('tournament_standings')
    .select('*')
    .eq('tournament_id', tournament_id);

  if (sErr) return res.status(500).json({ error: 'Failed to load standings' });

  const byGroup = new Map();
  for (const row of standings ?? []) {
    if (!row.group_name) continue;
    if (!byGroup.has(row.group_name)) byGroup.set(row.group_name, []);
    byGroup.get(row.group_name).push(row);
  }

  const advancers = [];
  let seed = 1;
  for (const [, rows] of [...byGroup.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sorted = rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
      return b.goals_for - a.goals_for;
    });
    for (const row of sorted.slice(0, advance_per_group)) {
      advancers.push({ team_id: row.team_id, seed: seed++ });
    }
  }

  if (advancers.length < 2) {
    return res.status(400).json({ error: 'Not enough advancers for a knockout stage.' });
  }

  await supabaseAdmin
    .from('matches')
    .delete()
    .eq('tournament_id', tournament_id)
    .not('round', 'like', 'Group %');

  const result = await generateSingleElim(tournament_id, advancers, { kind: 'team' });
  if (result.error) {
    logger.error(`Knockout generation failed: ${result.error}`);
    return res.status(400).json({ error: result.error });
  }

  logger.info(`Knockout generated: tournament ${tournament_id} with ${advancers.length} advancers by ${req.user.email}`);
  res.status(201).json({ success: true, advancers: advancers.length });
});

// ─── PATCH /api/matches/:id ───────────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = updateMatchSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { data: existing, error: exErr } = await supabaseAdmin
    .from('matches')
    .select('id, tournament_id, match_number, status, next_match_id, home_score, away_score, home_team_id, away_team_id, winner_id, home_player_id, away_player_id, winner_player_id')
    .eq('id', req.params.id)
    .single();

  if (exErr || !existing) {
    return res.status(404).json({ error: 'Match not found' });
  }

  const updates = { ...parsed.data };
  const isPlayerMatch = !!existing.home_player_id || !!existing.away_player_id;

  // Winner validation.
  if (updates.winner_id) {
    const valid = [existing.home_team_id, existing.away_team_id].includes(updates.winner_id);
    if (!valid) return res.status(400).json({ error: 'winner_id must be the home or away team' });
  }
  if (updates.winner_player_id) {
    const valid = [existing.home_player_id, existing.away_player_id].includes(updates.winner_player_id);
    if (!valid) return res.status(400).json({ error: 'winner_player_id must be the home or away player' });
  }

  if (updates.status === 'live') updates.started_at = new Date().toISOString();

  // Re-derive winner from scores whenever the match is (or is becoming)
  // completed. Previously we only did this when status flipped to 'completed'
  // in this PATCH — which meant editing scores on an already-completed match
  // never recomputed the winner, leaving the bracket pointing at a stale
  // (or null) winner. We still respect an explicit winner_id in the body.
  const effectiveStatus = updates.status ?? existing.status;
  if (updates.status === 'completed') {
    updates.ended_at = new Date().toISOString();
  }
  if (effectiveStatus === 'completed') {
    const hs = updates.home_score ?? existing.home_score ?? 0;
    const as = updates.away_score ?? existing.away_score ?? 0;
    const scoresChanged =
      updates.home_score !== undefined || updates.away_score !== undefined;
    const statusJustCompleted = updates.status === 'completed';

    const deriveTeam = () => hs > as ? existing.home_team_id
                          : as > hs ? existing.away_team_id : null;
    const derivePlayer = () => hs > as ? existing.home_player_id
                            : as > hs ? existing.away_player_id : null;

    if (isPlayerMatch) {
      if (updates.winner_player_id === undefined) {
        if (existing.winner_player_id == null || scoresChanged || statusJustCompleted) {
          updates.winner_player_id = derivePlayer();
        }
      }
    } else {
      if (updates.winner_id === undefined) {
        if (existing.winner_id == null || scoresChanged || statusJustCompleted) {
          updates.winner_id = deriveTeam();
        }
      }
    }
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

  // Propagate winner into the next bracket match (handles both team & player).
  if (data.status === 'completed' && data.next_match_id) {
    const winnerTeam   = data.winner_id;
    const winnerPlayer = data.winner_player_id;
    if (winnerTeam || winnerPlayer) {
      const { data: siblings, error: sibErr } = await supabaseAdmin
        .from('matches')
        .select('id, match_number')
        .eq('next_match_id', data.next_match_id)
        .order('match_number', { ascending: true });

      if (!sibErr && siblings?.length) {
        const isHomeFeeder = siblings[0].id === data.id;
        const slot = winnerPlayer
          ? (isHomeFeeder ? { home_player_id: winnerPlayer } : { away_player_id: winnerPlayer })
          : (isHomeFeeder ? { home_team_id:   winnerTeam   } : { away_team_id:   winnerTeam   });
        await supabaseAdmin.from('matches').update(slot).eq('id', data.next_match_id);
      }
    }
  }

  logger.info(`Match updated: ${data.id} by ${req.user.email}`);
  res.json({ match: data });
});

export default router;
