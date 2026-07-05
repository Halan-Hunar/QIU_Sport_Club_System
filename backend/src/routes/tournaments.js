import { Router } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { generateSingleElim } from './matches.js';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────
const formats = ['single_elim', 'double_elim', 'round_robin', 'group_knockout'];
const statuses = ['upcoming', 'active', 'completed'];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const createTournamentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  sport_type: z.string().trim().min(2).max(40).default('football'),
  format: z.enum(formats),
  start_date: isoDate.optional().nullable(),
  end_date: isoDate.optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  is_individual: z.boolean().default(false),
});

const updateTournamentSchema = createTournamentSchema
  .partial()
  .extend({ status: z.enum(statuses).optional() });

const registerTeamSchema = z.object({
  team_id: z.string().uuid(),
  seed: z.number().int().min(1).max(999).optional().nullable(),
  group_name: z.string().trim().max(10).optional().nullable(),
});

const registerPlayerSchema = z.object({
  player_id: z.string().uuid(),
  seed: z.number().int().min(1).max(999).optional().nullable(),
});

const assignGroupsSchema = z.object({
  groups: z.record(z.string().trim().min(1).max(10), z.array(z.string().uuid())),
});

// ─── Helpers ──────────────────────────────────────────────────
const sendValidationError = (res, parsed) =>
  res.status(400).json({ error: parsed.error.errors[0].message });

// ─── GET /api/tournaments ─────────────────────────────────────
router.get('/', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .select('id, name, sport_type, format, status, start_date, end_date, description, created_at, tournament_teams(id)')
    .order('start_date', { ascending: false, nullsFirst: false });

  if (error) {
    logger.error(`List tournaments failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch tournaments' });
  }

  const tournaments = data.map((t) => ({
    id: t.id,
    name: t.name,
    sport_type: t.sport_type,
    format: t.format,
    status: t.status,
    start_date: t.start_date,
    end_date: t.end_date,
    description: t.description,
    created_at: t.created_at,
    team_count: t.tournament_teams?.length ?? 0,
  }));

  res.json({ tournaments });
});

// ─── GET /api/tournaments/:id ─────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data: tournament, error: tErr } = await supabaseAdmin
    .from('tournaments')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (tErr || !tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const { data: registrations, error: rErr } = await supabaseAdmin
    .from('tournament_teams')
    .select('id, seed, group_name, team:teams(id, name, logo_url, primary_color, secondary_color)')
    .eq('tournament_id', tournament.id)
    .order('seed', { ascending: true, nullsFirst: false });

  if (rErr) {
    logger.error(`Fetch tournament teams failed: ${rErr.message}`);
    return res.status(500).json({ error: 'Failed to fetch registered teams' });
  }

  const { data: playerRegs, error: pErr } = await supabaseAdmin
    .from('tournament_players')
    .select('id, seed, player:players(id, name, jersey_number, position, photo_url, team_id)')
    .eq('tournament_id', tournament.id)
    .order('seed', { ascending: true, nullsFirst: false });

  if (pErr) {
    logger.error(`Fetch tournament players failed: ${pErr.message}`);
    return res.status(500).json({ error: 'Failed to fetch registered players' });
  }

  res.json({
    tournament,
    teams: registrations ?? [],
    players: playerRegs ?? [],
  });
});

// ─── POST /api/tournaments ────────────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createTournamentSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .insert({ ...parsed.data, created_by: req.user.id })
    .select()
    .single();

  if (error) {
    logger.error(`Create tournament failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to create tournament' });
  }

  logger.info(`Tournament created: ${data.name} by ${req.user.email}`);
  res.status(201).json({ tournament: data });
});

// ─── PATCH /api/tournaments/:id ───────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = updateTournamentSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    logger.error(`Update tournament failed: ${error?.message ?? 'not found'}`);
    return res.status(404).json({ error: 'Tournament not found' });
  }

  logger.info(`Tournament updated: ${data.id} by ${req.user.email}`);
  res.json({ tournament: data });
});

// ─── DELETE /api/tournaments/:id ──────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('tournaments')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    logger.error(`Delete tournament failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to delete tournament' });
  }

  logger.info(`Tournament deleted: ${req.params.id} by ${req.user.email}`);
  res.json({ success: true });
});

// ─── POST /api/tournaments/:id/teams ──────────────────────────
router.post('/:id/teams', requireAuth, requireAdmin, async (req, res) => {
  const parsed = registerTeamSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { data, error } = await supabaseAdmin
    .from('tournament_teams')
    .insert({ ...parsed.data, tournament_id: req.params.id })
    .select('id, seed, group_name, team:teams(id, name, logo_url, primary_color, secondary_color)')
    .single();

  if (error) {
    logger.error(`Register team failed: ${error.message}`);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Team is already registered' });
    }
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Tournament or team not found' });
    }
    return res.status(500).json({ error: 'Failed to register team' });
  }

  logger.info(`Team registered: ${parsed.data.team_id} → tournament ${req.params.id} by ${req.user.email}`);
  res.status(201).json({ registration: data });
});

// ─── DELETE /api/tournaments/:id/teams/:teamId ────────────────
router.delete('/:id/teams/:teamId', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('tournament_teams')
    .delete()
    .eq('tournament_id', req.params.id)
    .eq('team_id', req.params.teamId);

  if (error) {
    logger.error(`Unregister team failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to unregister team' });
  }

  logger.info(`Team unregistered: ${req.params.teamId} from tournament ${req.params.id} by ${req.user.email}`);
  res.json({ success: true });
});

// ─── POST /api/tournaments/:id/players ────────────────────────
// Individual-sport registration (chess, table tennis, etc.).
router.post('/:id/players', requireAuth, requireAdmin, async (req, res) => {
  const parsed = registerPlayerSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { data, error } = await supabaseAdmin
    .from('tournament_players')
    .insert({ ...parsed.data, tournament_id: req.params.id })
    .select('id, seed, player:players(id, name, jersey_number, position, photo_url, team_id)')
    .single();

  if (error) {
    logger.error(`Register player failed: ${error.message}`);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Player is already registered' });
    }
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Tournament or player not found' });
    }
    return res.status(500).json({ error: 'Failed to register player' });
  }

  logger.info(`Player registered: ${parsed.data.player_id} → tournament ${req.params.id} by ${req.user.email}`);
  res.status(201).json({ registration: data });
});

// ─── POST /api/tournaments/:id/assign-groups ──────────────────
// Manual group draw. Body shape: { groups: { "A": [team_uuid, …], … } }.
// Validates every team is registered to this tournament and no team appears
// in two groups, then writes `group_name` on `tournament_teams`. Teams that
// were previously assigned but aren't present in the payload get cleared
// back to null so the modal can also be used to un-draw / redraw.
router.post('/:id/assign-groups', requireAuth, requireAdmin, async (req, res) => {
  const parsed = assignGroupsSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const tournamentId = req.params.id;
  const groups = parsed.data.groups;

  // Collect every team_id in the payload, watching for duplicates across groups.
  const seen = new Set();
  const assignments = []; // [{ team_id, group_name }]
  for (const [groupName, teamIds] of Object.entries(groups)) {
    for (const teamId of teamIds) {
      if (seen.has(teamId)) {
        return res.status(400).json({ error: `Team ${teamId} is assigned to more than one group.` });
      }
      seen.add(teamId);
      assignments.push({ team_id: teamId, group_name: groupName });
    }
  }

  // Verify every payload team is actually registered in this tournament.
  const { data: registered, error: rErr } = await supabaseAdmin
    .from('tournament_teams')
    .select('team_id')
    .eq('tournament_id', tournamentId);
  if (rErr) {
    logger.error(`Assign groups – load registrations failed: ${rErr.message}`);
    return res.status(500).json({ error: 'Failed to load registrations' });
  }
  const registeredIds = new Set((registered ?? []).map((r) => r.team_id));
  for (const teamId of seen) {
    if (!registeredIds.has(teamId)) {
      return res.status(400).json({ error: `Team ${teamId} is not registered in this tournament.` });
    }
  }

  // Clear group_name for any registered team not in the payload, so a redraw
  // doesn't leave stale assignments behind.
  const toClear = [...registeredIds].filter((id) => !seen.has(id));
  if (toClear.length > 0) {
    const { error: clrErr } = await supabaseAdmin
      .from('tournament_teams')
      .update({ group_name: null })
      .eq('tournament_id', tournamentId)
      .in('team_id', toClear);
    if (clrErr) {
      logger.error(`Assign groups – clear failed: ${clrErr.message}`);
      return res.status(500).json({ error: 'Failed to clear previous group assignments' });
    }
  }

  // Apply the new assignments.
  for (const { team_id, group_name } of assignments) {
    const { error: upErr } = await supabaseAdmin
      .from('tournament_teams')
      .update({ group_name })
      .eq('tournament_id', tournamentId)
      .eq('team_id', team_id);
    if (upErr) {
      logger.error(`Assign groups – update failed: ${upErr.message}`);
      return res.status(500).json({ error: 'Failed to save group assignments' });
    }
  }

  logger.info(`Groups assigned: tournament ${tournamentId} (${assignments.length} teams) by ${req.user.email}`);
  res.json({ success: true });
});

// ─── POST /api/tournaments/:id/advance-groups ─────────────────
// Generate Semi Final matches from the current group standings: top 2 from
// each group, paired across adjacent groups (A1 vs B2, B1 vs A2, …). Does
// not require the group stage to be fully completed — admins use this to
// commit to a knockout draw based on whatever standings exist right now.
router.post('/:id/advance-groups', requireAuth, requireAdmin, async (req, res) => {
  const tournamentId = req.params.id;

  const { data: tournament, error: tErr } = await supabaseAdmin
    .from('tournaments')
    .select('id, format')
    .eq('id', tournamentId)
    .single();

  if (tErr || !tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  if (tournament.format !== 'group_knockout') {
    return res.status(400).json({ error: 'Only group + knockout tournaments support advancement.' });
  }

  const { data: standings, error: sErr } = await supabaseAdmin
    .from('tournament_standings')
    .select('*')
    .eq('tournament_id', tournamentId);

  if (sErr) {
    logger.error(`Advance groups – load standings failed: ${sErr.message}`);
    return res.status(500).json({ error: 'Failed to load standings' });
  }

  const byGroup = new Map();
  for (const row of standings ?? []) {
    if (!row.group_name) continue;
    if (!byGroup.has(row.group_name)) byGroup.set(row.group_name, []);
    byGroup.get(row.group_name).push(row);
  }
  if (byGroup.size < 2) {
    return res.status(400).json({ error: 'Need at least 2 groups to generate semi finals.' });
  }

  // Sort each group by points, GD, GF — same tie-breakers as the standings endpoint.
  const sortedGroups = [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, rows]) => ({
      name,
      teams: rows
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
          return b.goals_for - a.goals_for;
        })
        .slice(0, 2),
    }));

  if (sortedGroups.some((g) => g.teams.length < 2)) {
    return res.status(400).json({ error: 'Each group needs at least 2 teams in the standings.' });
  }

  // Seed advancers as [all 1st-places, all 2nd-places] so single-elim seeding
  // (1v8, 4v5, 2v7, 3v6 …) produces the requested A1-vs-B2 / B1-vs-A2 pattern
  // for 2 groups and a balanced bracket for larger group counts.
  const advancers = [
    ...sortedGroups.map((g) => g.teams[0]),
    ...sortedGroups.map((g) => g.teams[1]),
  ].map((row, idx) => ({ team_id: row.team_id, seed: idx + 1 }));

  // Wipe any prior non-group matches so re-runs don't pile up duplicates.
  const { error: delErr } = await supabaseAdmin
    .from('matches')
    .delete()
    .eq('tournament_id', tournamentId)
    .not('round', 'like', 'Group %');
  if (delErr) {
    logger.error(`Advance groups – wipe knockout failed: ${delErr.message}`);
    return res.status(500).json({ error: 'Failed to clear existing knockout matches' });
  }

  const result = await generateSingleElim(tournamentId, advancers, { kind: 'team' });
  if (result.error) {
    logger.error(`Advance groups – bracket gen failed: ${result.error}`);
    return res.status(400).json({ error: result.error });
  }

  const { data: inserted } = await supabaseAdmin
    .from('matches')
    .select()
    .eq('tournament_id', tournamentId)
    .not('round', 'like', 'Group %')
    .order('match_number', { ascending: true });

  logger.info(`Advanced groups: tournament ${tournamentId} → ${advancers.length} advancers by ${req.user.email}`);
  res.status(201).json({ matches: inserted ?? [] });
});

// ─── PATCH /api/tournaments/:id/awards ────────────────────────
// Admin-only: set the manually-curated individual awards for the tournament
// (Best Player, Best Defender, Best Playmaker, Best Goalkeeper). Stored
// directly on the tournaments row so the public stats endpoint can read them
// without an extra join. Free-text names (no players.id) are allowed because
// admins may want to credit a player who was never in our roster.
// Send only the keys you want to change; each award is a `<key>_name` +
// `<key>_team_id` pair. Passing a null name clears that award.
const AWARD_KEYS = ['best_player', 'best_defender', 'best_playmaker', 'best_goalkeeper'];

const awardsSchema = z
  .object(
    AWARD_KEYS.reduce((acc, key) => {
      acc[`${key}_name`] = z.string().trim().min(1).max(120).nullable().optional();
      acc[`${key}_team_id`] = z.string().uuid().nullable().optional();
      return acc;
    }, {}),
  )
  .refine((d) => Object.keys(d).length > 0, { message: 'No award fields provided' });

router.patch('/:id/awards', requireAuth, requireAdmin, async (req, res) => {
  const parsed = awardsSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  // Build the update payload from whichever award keys were supplied. When a
  // `<key>_name` is present we also normalise its team id (defaulting to null).
  const payload = {};
  for (const key of AWARD_KEYS) {
    if (`${key}_name` in parsed.data) {
      payload[`${key}_name`] = parsed.data[`${key}_name`];
      payload[`${key}_team_id`] = parsed.data[`${key}_team_id`] ?? null;
    } else if (`${key}_team_id` in parsed.data) {
      payload[`${key}_team_id`] = parsed.data[`${key}_team_id`] ?? null;
    }
  }

  const selectCols = ['id', ...AWARD_KEYS.flatMap((k) => [`${k}_name`, `${k}_team_id`])].join(', ');

  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .update(payload)
    .eq('id', req.params.id)
    .select(selectCols)
    .single();

  if (error || !data) {
    logger.error(`Update tournament awards failed: ${error?.message ?? 'not found'}`);
    return res.status(404).json({ error: 'Tournament not found' });
  }

  logger.info(`Tournament ${data.id} awards updated by ${req.user.email}`);
  res.json({ tournament: data });
});

// ─── POST /api/tournaments/:id/end ────────────────────────────
// Admin-only: permanently mark a tournament as finished. Sets status to
// 'completed' and stamps ended_at. All teams, matches, events, awards and
// derived stats remain in the database (teams/players are soft-deleted, never
// hard-deleted), so the tournament and its record live on the site forever.
router.post('/:id/end', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    logger.error(`End tournament failed: ${error?.message ?? 'not found'}`);
    return res.status(404).json({ error: 'Tournament not found' });
  }

  logger.info(`Tournament ended: ${data.id} by ${req.user.email}`);
  res.json({ tournament: data });
});

// ─── POST /api/tournaments/:id/reopen ─────────────────────────
// Admin-only: undo an accidental "end" — flips the tournament back to active
// and clears ended_at.
router.post('/:id/reopen', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .update({ status: 'active', ended_at: null })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    logger.error(`Reopen tournament failed: ${error?.message ?? 'not found'}`);
    return res.status(404).json({ error: 'Tournament not found' });
  }

  logger.info(`Tournament reopened: ${data.id} by ${req.user.email}`);
  res.json({ tournament: data });
});

// ─── DELETE /api/tournaments/:id/players/:playerId ────────────
router.delete('/:id/players/:playerId', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('tournament_players')
    .delete()
    .eq('tournament_id', req.params.id)
    .eq('player_id', req.params.playerId);

  if (error) {
    logger.error(`Unregister player failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to unregister player' });
  }

  logger.info(`Player unregistered: ${req.params.playerId} from tournament ${req.params.id} by ${req.user.email}`);
  res.json({ success: true });
});

export default router;
