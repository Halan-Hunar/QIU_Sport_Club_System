import { Router } from 'express';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

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
});

const updateTournamentSchema = createTournamentSchema
  .partial()
  .extend({ status: z.enum(statuses).optional() });

const registerTeamSchema = z.object({
  team_id: z.string().uuid(),
  seed: z.number().int().min(1).max(999).optional().nullable(),
  group_name: z.string().trim().max(10).optional().nullable(),
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

  res.json({ tournament, teams: registrations ?? [] });
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

export default router;
