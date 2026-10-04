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
// Aggregate counts + a "featured tournament" block for the Home page.
// The featured tournament is whichever tournament makes sense to highlight:
// the most recent active one, else the next upcoming one, else null.
router.get('/stats', async (_req, res) => {
  const headCount = (table, filters = {}, modifier) => {
    let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    if (modifier) q = modifier(q);
    return q;
  };

  // ── Cross-tournament totals ────────────────────────────────
  const [teamsRes, completedRes, goalsRes, activeRes, upcomingRes, activesRes, nextRes] = await Promise.all([
    headCount('teams'),
    headCount('matches', { status: 'completed' }),
    headCount('match_events', { event_type: 'goal' }),
    headCount('tournaments', { status: 'active' }),
    headCount('tournaments', { status: 'upcoming' }),
    supabaseAdmin.from('tournaments')
      .select('id,name,sport_type,is_individual,status,format,start_date,end_date')
      .eq('status','active').order('start_date', { ascending: false, nullsFirst: false }).limit(1),
    supabaseAdmin.from('tournaments')
      .select('id,name,sport_type,is_individual,status,format,start_date,end_date')
      .eq('status','upcoming').order('start_date', { ascending: true, nullsFirst: false }).limit(1),
  ]);

  const firstError = [teamsRes, completedRes, goalsRes, activeRes, upcomingRes, activesRes, nextRes]
    .find((r) => r.error)?.error;
  if (firstError) {
    logger.error(`Stats query failed: ${firstError.message}`);
    return res.status(500).json({ error: 'Failed to load stats' });
  }

  // ── Featured tournament: active first, then upcoming ────────
  let featured = activesRes.data?.[0] ?? nextRes.data?.[0] ?? null;

  if (featured) {
    // Per-tournament counts.
    const competitorTable = featured.is_individual ? 'tournament_players' : 'tournament_teams';
    const [matchesPlayed, matchIdsRes, competitorRes] = await Promise.all([
      headCount('matches', { tournament_id: featured.id, status: 'completed' }),
      supabaseAdmin.from('matches').select('id').eq('tournament_id', featured.id),
      headCount(competitorTable, { tournament_id: featured.id }),
    ]);

    let goalsCount = 0;
    const ids = (matchIdsRes.data ?? []).map((m) => m.id);
    if (ids.length) {
      const { count } = await supabaseAdmin
        .from('match_events')
        .select('*', { count: 'exact', head: true })
        .in('match_id', ids)
        .eq('event_type', 'goal');
      goalsCount = count ?? 0;
    }

    featured = {
      ...featured,
      competitors_count: competitorRes.count ?? 0,
      matches_played: matchesPlayed.count ?? 0,
      goals_scored: goalsCount,
    };
  }

  res.json({
    total_teams: teamsRes.count ?? 0,
    total_matches: completedRes.count ?? 0,
    total_goals: goalsRes.count ?? 0,
    active_tournaments: (activeRes.count ?? 0) + (upcomingRes.count ?? 0),
    featured_tournament: featured,
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
    if (error.code === '23514') return res.status(400).json({ error: 'Check the event team and player, and reopen completed matches before editing events.' });
    if (error.code === '23503') {
      return res.status(404).json({ error: 'Match, team, or player not found' });
    }
    return res.status(500).json({ error: 'Failed to log event' });
  }

  // The database trigger updates the score in the same transaction as the event.
  const { data: matchScore } = await supabaseAdmin.from('matches')
    .select('id, home_score, away_score').eq('id', parsed.data.match_id).single();

  logger.info(`Event logged: ${data.event_type} match ${parsed.data.match_id} by ${req.user.email}`);
  res.status(201).json({ event: data, match: matchScore });
});

// ─── DELETE /api/match-events/:id ─────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid event.' });
  const { data: event } = await supabaseAdmin.from('match_events').select('match_id').eq('id', req.params.id).maybeSingle();
  if (!event) return res.status(404).json({ error: 'Event not found.' });
  const { error } = await supabaseAdmin
    .from('match_events')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    logger.error(`Delete event failed: ${error.message}`);
    if (error.code === '23514') return res.status(400).json({ error: 'Reopen the match before removing events.' });
    return res.status(500).json({ error: 'Failed to delete event' });
  }

  logger.info(`Event deleted: ${req.params.id} by ${req.user.email}`);
  const { data: match } = await supabaseAdmin.from('matches').select('id, home_score, away_score').eq('id', event.match_id).single();
  res.json({ success: true, match });
});

export default router;
