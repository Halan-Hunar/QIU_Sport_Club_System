import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

const playerPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'N/A'];

// Standalone (individual-sport) players don't fit the team-football enum,
// so position is optional/free-form on create; team-roster paths still send
// a value from the enum.
const sportSlug = z.string().trim().min(2).max(40);

const createPlayerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  jersey_number: z.number().int().min(0).max(999).optional().nullable(),
  position: z.string().trim().max(40).optional().nullable(),
  photo_url: z.string().url().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  team_id: z.string().uuid().optional().nullable(),
  sports: z.array(sportSlug).max(20).optional(),
});

const updatePlayerSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    jersey_number: z.number().int().min(0).max(999).optional().nullable(),
    position: z.string().trim().max(40).optional().nullable(),
    photo_url: z.string().url().optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
    team_id: z.string().uuid().optional().nullable(),
    sports: z.array(sportSlug).max(20).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

const sendValidationError = (res, parsed) =>
  res.status(400).json({ error: parsed.error.errors[0].message });

// ─── GET /api/players ─────────────────────────────────────────
// Supports filters:
//   ?team_id=<uuid>   — only that team's roster
//   ?standalone=true  — only players whose team_id is null (individual sport pool)
router.get('/', async (req, res) => {
  let q = supabaseAdmin
    .from('players')
    .select('id, name, jersey_number, position, photo_url, notes, sports, team_id, created_at, team:teams(id, name, primary_color, secondary_color)')
    .order('name', { ascending: true });

  if (req.query.team_id) {
    q = q.eq('team_id', req.query.team_id);
  }
  if (req.query.standalone === 'true') {
    q = q.is('team_id', null);
  }
  if (req.query.sport) {
    // sports column is text[]; .contains matches when the array includes this value.
    q = q.contains('sports', [req.query.sport]);
  }

  const { data, error } = await q;
  if (error) {
    logger.error(`List players failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch players' });
  }
  res.json({ players: data ?? [] });
});

// ─── GET /api/players/:id ─────────────────────────────────────
// Player + aggregate stats (tournaments played, goals scored).
router.get('/:id', async (req, res) => {
  const { data: player, error: pErr } = await supabaseAdmin
    .from('players')
    .select('id, name, jersey_number, position, photo_url, notes, sports, team_id, created_at, team:teams(id, name, primary_color, secondary_color)')
    .eq('id', req.params.id)
    .single();

  if (pErr || !player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  const headCount = (table, filters = {}) => {
    let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    return q;
  };

  const [tournamentsRes, goalsRes] = await Promise.all([
    headCount('tournament_players', { player_id: player.id }),
    headCount('match_events', { player_id: player.id, event_type: 'goal' }),
  ]);

  res.json({
    player,
    stats: {
      tournaments_played: tournamentsRes.count ?? 0,
      goals: goalsRes.count ?? 0,
    },
  });
});

// ─── POST /api/players ────────────────────────────────────────
// Creates a player. team_id is optional — omit it (or pass null) for a
// standalone player intended for individual-sport tournaments.
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  // Drop undefined keys so the row gets DB defaults (e.g. position).
  const insertRow = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  const { data, error } = await supabaseAdmin
    .from('players')
    .insert(insertRow)
    .select('id, name, jersey_number, position, photo_url, notes, sports, team_id, created_at')
    .single();

  if (error) {
    logger.error(`Create player failed: ${error.message}`);
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Team not found' });
    }
    return res.status(500).json({ error: 'Failed to create player' });
  }

  logger.info(`Player created: ${data.name} (team=${data.team_id ?? 'standalone'}) by ${req.user.email}`);
  res.status(201).json({ player: data });
});

// ─── PATCH /api/players/:id ───────────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = updatePlayerSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { data, error } = await supabaseAdmin
    .from('players')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    logger.error(`Update player failed: ${error?.message ?? 'not found'}`);
    return res.status(404).json({ error: 'Player not found' });
  }

  logger.info(`Player updated: ${data.id} by ${req.user.email}`);
  res.json({ player: data });
});

// ─── DELETE /api/players/:id ──────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('players')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    logger.error(`Delete player failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to delete player' });
  }

  logger.info(`Player deleted: ${req.params.id} by ${req.user.email}`);
  res.json({ success: true });
});

export default router;
