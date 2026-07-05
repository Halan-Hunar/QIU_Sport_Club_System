import { Router } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────
const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex like #00e5a0');

const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(60),
  logo_url: z.string().url().optional().nullable(),
  primary_color: hexColor,
  secondary_color: hexColor,
});

const updateTeamSchema = createTeamSchema.partial();

const playerPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'N/A'];

// jersey_number and position are optional so Quick Add (name-only) works
// from inline flows like the Log Event modal. Position falls back to 'N/A'.
const createPlayerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  jersey_number: z.number().int().min(0).max(999).optional().nullable(),
  position: z.enum(playerPositions).optional().default('N/A'),
  photo_url: z.string().url().optional().nullable(),
});

const setCaptainSchema = z.object({
  player_id: z.string().uuid(),
  tournament_id: z.string().uuid().optional().nullable(),
});

// ─── Helpers ──────────────────────────────────────────────────
const sendValidationError = (res, parsed) =>
  res.status(400).json({ error: parsed.error.errors[0].message });

// ─── GET /api/teams ───────────────────────────────────────────
// Returns each team with player_count + completed-match W/L counts. The
// visitor view of the Teams page swaps the team-colour strip for these
// stats, so they're computed here rather than via an extra round-trip.
router.get('/', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('id, name, logo_url, primary_color, secondary_color, created_at, players(id)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error(`List teams failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch teams' });
  }

  const { data: matches, error: mErr } = await supabaseAdmin
    .from('matches')
    .select('home_team_id, away_team_id, home_score, away_score, winner_id')
    .eq('status', 'completed');

  if (mErr) {
    logger.error(`List teams – matches load failed: ${mErr.message}`);
    return res.status(500).json({ error: 'Failed to fetch team stats' });
  }

  const wlByTeam = new Map();      // team_id → { wins, losses, draws }
  for (const m of matches ?? []) {
    const ensure = (id) => {
      if (!id) return null;
      if (!wlByTeam.has(id)) wlByTeam.set(id, { wins: 0, losses: 0, draws: 0 });
      return wlByTeam.get(id);
    };
    const home = ensure(m.home_team_id);
    const away = ensure(m.away_team_id);
    if (!home && !away) continue;
    if (m.home_score === m.away_score) {
      if (home) home.draws += 1;
      if (away) away.draws += 1;
      continue;
    }
    // winner_id wins authoritatively if set; otherwise fall back to scores.
    const homeWon = m.winner_id
      ? m.winner_id === m.home_team_id
      : m.home_score > m.away_score;
    if (homeWon) {
      if (home) home.wins   += 1;
      if (away) away.losses += 1;
    } else {
      if (away) away.wins   += 1;
      if (home) home.losses += 1;
    }
  }

  const teams = data.map((t) => {
    const wl = wlByTeam.get(t.id) ?? { wins: 0, losses: 0, draws: 0 };
    return {
      id: t.id,
      name: t.name,
      logo_url: t.logo_url,
      primary_color: t.primary_color,
      secondary_color: t.secondary_color,
      created_at: t.created_at,
      player_count: t.players?.length ?? 0,
      wins:   wl.wins,
      losses: wl.losses,
      draws:  wl.draws,
    };
  });

  res.json({ teams });
});

// ─── GET /api/teams/:id ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('id', req.params.id)
    .is('deleted_at', null)
    .single();

  if (teamErr || !team) {
    return res.status(404).json({ error: 'Team not found' });
  }

  const { data: players, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id, name, jersey_number, position, photo_url, created_at')
    .eq('team_id', team.id)
    .is('deleted_at', null)
    .order('jersey_number', { ascending: true });

  if (playerErr) {
    logger.error(`Fetch players failed: ${playerErr.message}`);
    return res.status(500).json({ error: 'Failed to fetch roster' });
  }

  const { data: captains } = await supabaseAdmin
    .from('team_captains')
    .select('player_id, tournament_id')
    .eq('team_id', team.id);

  res.json({ team, players: players ?? [], captains: captains ?? [] });
});

// ─── POST /api/teams ──────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { data, error } = await supabaseAdmin
    .from('teams')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    logger.error(`Create team failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to create team' });
  }

  logger.info(`Team created: ${data.name} by ${req.user.email}`);
  res.status(201).json({ team: data });
});

// ─── PATCH /api/teams/:id ─────────────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = updateTeamSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const { data, error } = await supabaseAdmin
    .from('teams')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    logger.error(`Update team failed: ${error?.message ?? 'not found'}`);
    return res.status(404).json({ error: 'Team not found' });
  }

  logger.info(`Team updated: ${data.id} by ${req.user.email}`);
  res.json({ team: data });
});

// ─── DELETE /api/teams/:id ────────────────────────────────────
// Soft delete: set deleted_at so the team vanishes from the public roster and
// team pool, while every historical reference (tournament registrations,
// matches, events, stats) stays intact. This is what lets a team's record live
// on inside the tournaments it played even after it's "deleted".
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('teams')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    logger.error(`Delete team failed: ${error?.message ?? 'not found'}`);
    return res.status(500).json({ error: 'Failed to delete team' });
  }

  logger.info(`Team soft-deleted: ${req.params.id} by ${req.user.email}`);
  res.json({ success: true });
});

// ─── POST /api/teams/:id/players ──────────────────────────────
router.post('/:id/players', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { data, error } = await supabaseAdmin
    .from('players')
    .insert({ ...parsed.data, team_id: req.params.id })
    .select()
    .single();

  if (error) {
    logger.error(`Create player failed: ${error.message}`);
    const msg = error.code === '23503' ? 'Team not found' : 'Failed to add player';
    return res.status(error.code === '23503' ? 404 : 500).json({ error: msg });
  }

  logger.info(`Player added: ${data.name} → team ${req.params.id} by ${req.user.email}`);
  res.status(201).json({ player: data });
});

// ─── PATCH /api/teams/:id/captain ─────────────────────────────
router.patch('/:id/captain', requireAuth, requireAdmin, async (req, res) => {
  const parsed = setCaptainSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { player_id, tournament_id = null } = parsed.data;

  // Verify the player belongs to the team
  const { data: player, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('team_id')
    .eq('id', player_id)
    .single();

  if (playerErr || !player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  if (player.team_id !== req.params.id) {
    return res.status(400).json({ error: 'Player does not belong to this team' });
  }

  // Remove any existing captain for this (team, tournament) combo
  let removeQ = supabaseAdmin
    .from('team_captains')
    .delete()
    .eq('team_id', req.params.id);
  removeQ = tournament_id
    ? removeQ.eq('tournament_id', tournament_id)
    : removeQ.is('tournament_id', null);
  await removeQ;

  const { data, error } = await supabaseAdmin
    .from('team_captains')
    .insert({ team_id: req.params.id, player_id, tournament_id })
    .select()
    .single();

  if (error) {
    logger.error(`Set captain failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to set captain' });
  }

  logger.info(`Captain set: team ${req.params.id} → player ${player_id} by ${req.user.email}`);
  res.json({ captain: data });
});

export default router;
