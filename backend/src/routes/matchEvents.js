import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

const eventTypes = ['goal', 'own_goal', 'yellow_card', 'red_card', 'substitution'];

const createEventSchema = z.object({
  match_id: z.string().uuid(),
  event_type: z.enum(eventTypes),
  team_id: z.string().uuid().optional().nullable(),
  player_id: z.string().uuid().optional().nullable(),
  minute: z.number().int().min(0).max(200).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

const sendValidationError = (res, parsed) =>
  res.status(400).json({ error: parsed.error.errors[0].message });

// ─── GET /api/match-events/stats ──────────────────────────────
// Aggregate counts for Home page. Uses head:true count queries so we never
// pull row payloads. Note: in supabase-js v2 you must call .select() before
// any filter methods (.eq, etc.) — .from() alone returns a query builder
// that doesn't expose filters yet.
router.get('/stats', async (_req, res) => {
  const headCount = (table, filters = {}) => {
    let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    return q;
  };

  const [teamsRes, completedRes, goalsRes, activeRes, upcomingRes] = await Promise.all([
    headCount('teams'),
    headCount('matches', { status: 'completed' }),
    headCount('match_events', { event_type: 'goal' }),
    headCount('tournaments', { status: 'active' }),
    headCount('tournaments', { status: 'upcoming' }),
  ]);

  const firstError = [teamsRes, completedRes, goalsRes, activeRes, upcomingRes]
    .find((r) => r.error)?.error;
  if (firstError) {
    logger.error(`Stats query failed: ${firstError.message}`);
    return res.status(500).json({ error: 'Failed to load stats' });
  }

  res.json({
    total_teams: teamsRes.count ?? 0,
    total_matches: completedRes.count ?? 0,
    total_goals: goalsRes.count ?? 0,
    active_tournaments: (activeRes.count ?? 0) + (upcomingRes.count ?? 0),
  });
});

// ─── GET /api/match-events?match_id=… ─────────────────────────
router.get('/', async (req, res) => {
  const matchId = req.query.match_id;
  if (!matchId) {
    return res.status(400).json({ error: 'match_id query param is required' });
  }

  const { data, error } = await supabaseAdmin
    .from('match_events')
    .select(`
      id, match_id, event_type, minute, notes, created_at,
      player:players(id, name, jersey_number),
      team:teams(id, name, primary_color, secondary_color)
    `)
    .eq('match_id', matchId)
    .order('minute', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true });

  if (error) {
    logger.error(`List match events failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }

  res.json({ events: data ?? [] });
});

// ─── POST /api/match-events ───────────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed);

  const { data, error } = await supabaseAdmin
    .from('match_events')
    .insert(parsed.data)
    .select(`
      id, match_id, event_type, minute, notes, created_at,
      player:players(id, name, jersey_number),
      team:teams(id, name, primary_color, secondary_color)
    `)
    .single();

  if (error) {
    logger.error(`Log event failed: ${error.message}`);
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Match, team, or player not found' });
    }
    return res.status(500).json({ error: 'Failed to log event' });
  }

  // If it's a goal, bump the scoring side's score on the match
  if (parsed.data.event_type === 'goal' || parsed.data.event_type === 'own_goal') {
    const { data: match } = await supabaseAdmin
      .from('matches')
      .select('id, home_team_id, away_team_id, home_score, away_score')
      .eq('id', parsed.data.match_id)
      .single();

    if (match && parsed.data.team_id) {
      // For 'goal', the scoring team's score goes up.
      // For 'own_goal', the OPPONENT scores — the team_id field stores the
      // team credited with the own-goal, so the *other* team gets the point.
      let scoringTeam = parsed.data.team_id;
      if (parsed.data.event_type === 'own_goal') {
        scoringTeam = parsed.data.team_id === match.home_team_id
          ? match.away_team_id
          : match.home_team_id;
      }
      const upd = scoringTeam === match.home_team_id
        ? { home_score: (match.home_score ?? 0) + 1 }
        : scoringTeam === match.away_team_id
          ? { away_score: (match.away_score ?? 0) + 1 }
          : null;
      if (upd) {
        await supabaseAdmin.from('matches').update(upd).eq('id', match.id);
      }
    }
  }

  logger.info(`Event logged: ${data.event_type} match ${parsed.data.match_id} by ${req.user.email}`);
  res.status(201).json({ event: data });
});

// ─── DELETE /api/match-events/:id ─────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('match_events')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    logger.error(`Delete event failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to delete event' });
  }

  logger.info(`Event deleted: ${req.params.id} by ${req.user.email}`);
  res.json({ success: true });
});

export default router;
