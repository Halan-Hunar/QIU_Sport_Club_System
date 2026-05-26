import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

const awardTypes = ['top_scorer', 'best_player', 'winner', 'clean_sheet'];

const createAwardSchema = z.object({
  tournament_id: z.string().uuid(),
  award_type: z.enum(awardTypes),
  player_id: z.string().uuid().optional().nullable(),
  team_id: z.string().uuid().optional().nullable(),
});

const sendValidationError = (res, parsed) =>
  res.status(400).json({ error: parsed.error.errors[0].message });

// ─── GET /api/awards?tournament_id=… ──────────────────────────
router.get('/', async (req, res) => {
  const tournamentId = req.query.tournament_id;
  if (!tournamentId) {
    return res.status(400).json({ error: 'tournament_id query param is required' });
  }

  const { data, error } = await supabaseAdmin
    .from('awards')
    .select(`
      id, award_type, created_at,
      player:players(id, name, jersey_number, team_id),
      team:teams(id, name, primary_color, secondary_color)
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error(`List awards failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch awards' });
  }

  res.json({ awards: data ?? [] });
});

// ─── GET /api/awards/top-scorers?tournament_id=… ──────────────
// Aggregates goal events across all matches in the tournament.
router.get('/top-scorers', async (req, res) => {
  const tournamentId = req.query.tournament_id;
  if (!tournamentId) {
    return res.status(400).json({ error: 'tournament_id query param is required' });
  }

  const { data: matches, error: mErr } = await supabaseAdmin
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId);

  if (mErr) {
    logger.error(`Top scorers: load matches failed: ${mErr.message}`);
    return res.status(500).json({ error: 'Failed to load matches' });
  }

  const matchIds = (matches ?? []).map((m) => m.id);
  if (matchIds.length === 0) return res.json({ scorers: [] });

  const { data: events, error: eErr } = await supabaseAdmin
    .from('match_events')
    .select(`
      player_id, event_type,
      player:players(id, name, jersey_number, team_id),
      team:teams(id, name, primary_color, secondary_color)
    `)
    .in('match_id', matchIds)
    .eq('event_type', 'goal');

  if (eErr) {
    logger.error(`Top scorers: load events failed: ${eErr.message}`);
    return res.status(500).json({ error: 'Failed to load events' });
  }

  const byPlayer = new Map();
  for (const ev of events ?? []) {
    if (!ev.player_id) continue;
    const cur = byPlayer.get(ev.player_id) ?? {
      player: ev.player,
      team: ev.team,
      goals: 0,
    };
    cur.goals += 1;
    byPlayer.set(ev.player_id, cur);
  }

  const scorers = [...byPlayer.values()]
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 20);

  res.json({ scorers });
});

// ─── POST /api/awards ─────────────────────────────────────────
// Upserts: if an award of the same type already exists for the tournament,
// it's replaced — one trophy per category.
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createAwardSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  if (!parsed.data.player_id && !parsed.data.team_id) {
    return res.status(400).json({ error: 'Award must reference a player or a team' });
  }

  // Remove any existing award of this type for the tournament
  const { error: delErr } = await supabaseAdmin
    .from('awards')
    .delete()
    .eq('tournament_id', parsed.data.tournament_id)
    .eq('award_type', parsed.data.award_type);

  if (delErr) {
    logger.error(`Replace award failed: ${delErr.message}`);
    return res.status(500).json({ error: 'Failed to replace existing award' });
  }

  const { data, error } = await supabaseAdmin
    .from('awards')
    .insert(parsed.data)
    .select(`
      id, award_type, created_at,
      player:players(id, name, jersey_number, team_id),
      team:teams(id, name, primary_color, secondary_color)
    `)
    .single();

  if (error) {
    logger.error(`Create award failed: ${error.message}`);
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Tournament, team, or player not found' });
    }
    return res.status(500).json({ error: 'Failed to create award' });
  }

  logger.info(`Award created: ${data.award_type} in tournament ${parsed.data.tournament_id} by ${req.user.email}`);
  res.status(201).json({ award: data });
});

// ─── DELETE /api/awards/:id ───────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('awards')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    logger.error(`Delete award failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to delete award' });
  }

  logger.info(`Award deleted: ${req.params.id} by ${req.user.email}`);
  res.json({ success: true });
});

export default router;
