import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';

const router = Router();

const headCount = (table, filters = {}) => {
  let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  return q;
};

// ─── GET /api/stats ───────────────────────────────────────────
// Aggregate metrics for the public Stats page + Admin dashboard.
router.get('/', async (_req, res) => {
  // ── Top scorers ────────────────────────────────────────────
  // Fetch all goal events with joined player + team; aggregate in JS.
  // Tournament size is small enough that pulling rows is fine; if this ever
  // becomes hot we can move it into a Postgres function or materialised view.
  const { data: goalRows, error: goalsErr } = await supabaseAdmin
    .from('match_events')
    .select(`
      player_id,
      player:players(id, name, jersey_number, team_id),
      team:teams(id, name, primary_color, secondary_color)
    `)
    .eq('event_type', 'goal');

  if (goalsErr) {
    logger.error(`Stats goals failed: ${goalsErr.message}`);
    return res.status(500).json({ error: 'Failed to load stats' });
  }

  const scorerMap = new Map();
  for (const row of goalRows ?? []) {
    if (!row.player_id) continue;
    const cur = scorerMap.get(row.player_id) ?? {
      player_id: row.player_id,
      player_name: row.player?.name ?? null,
      jersey_number: row.player?.jersey_number ?? null,
      team_id: row.team?.id ?? row.player?.team_id ?? null,
      team_name: row.team?.name ?? null,
      team_color: row.team?.primary_color ?? null,
      goal_count: 0,
    };
    cur.goal_count += 1;
    scorerMap.set(row.player_id, cur);
  }
  const top_scorers = [...scorerMap.values()]
    .sort((a, b) => b.goal_count - a.goal_count)
    .slice(0, 10);

  // ── Most wins ──────────────────────────────────────────────
  const { data: winnerRows, error: winsErr } = await supabaseAdmin
    .from('matches')
    .select('winner_id, winner:teams!matches_winner_id_fkey(id, name, primary_color)')
    .eq('status', 'completed')
    .not('winner_id', 'is', null);

  if (winsErr) {
    logger.error(`Stats wins failed: ${winsErr.message}`);
    return res.status(500).json({ error: 'Failed to load stats' });
  }

  const winMap = new Map();
  for (const row of winnerRows ?? []) {
    if (!row.winner_id) continue;
    const cur = winMap.get(row.winner_id) ?? {
      team_id: row.winner_id,
      team_name: row.winner?.name ?? null,
      team_color: row.winner?.primary_color ?? null,
      win_count: 0,
    };
    cur.win_count += 1;
    winMap.set(row.winner_id, cur);
  }
  const most_wins = [...winMap.values()]
    .sort((a, b) => b.win_count - a.win_count)
    .slice(0, 10);

  // ── Recent results ─────────────────────────────────────────
  const { data: recentMatches, error: recentErr } = await supabaseAdmin
    .from('matches')
    .select(`
      id, home_score, away_score, winner_id, ended_at,
      tournament:tournaments(id, name),
      home_team:teams!matches_home_team_id_fkey(id, name, primary_color),
      away_team:teams!matches_away_team_id_fkey(id, name, primary_color)
    `)
    .eq('status', 'completed')
    .order('ended_at', { ascending: false, nullsFirst: false })
    .limit(10);

  if (recentErr) {
    logger.error(`Stats recent failed: ${recentErr.message}`);
    return res.status(500).json({ error: 'Failed to load stats' });
  }

  const recent_results = (recentMatches ?? []).map((m) => ({
    match_id: m.id,
    tournament_id: m.tournament?.id ?? null,
    tournament_name: m.tournament?.name ?? null,
    home_team: m.home_team,
    away_team: m.away_team,
    home_score: m.home_score,
    away_score: m.away_score,
    winner_id: m.winner_id,
    ended_at: m.ended_at,
  }));

  // ── Recent activity (admin dashboard feed) ─────────────────
  const { data: activityRows, error: actErr } = await supabaseAdmin
    .from('match_events')
    .select(`
      id, event_type, minute, created_at,
      player:players(id, name),
      team:teams(id, name, primary_color),
      match:matches(
        id, round,
        tournament:tournaments(id, name)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(15);

  if (actErr) {
    logger.error(`Stats activity failed: ${actErr.message}`);
    return res.status(500).json({ error: 'Failed to load stats' });
  }

  const recent_activity = (activityRows ?? []).map((a) => ({
    id: a.id,
    event_type: a.event_type,
    minute: a.minute,
    created_at: a.created_at,
    player_name: a.player?.name ?? null,
    team_name: a.team?.name ?? null,
    team_color: a.team?.primary_color ?? null,
    match_round: a.match?.round ?? null,
    tournament_id: a.match?.tournament?.id ?? null,
    tournament_name: a.match?.tournament?.name ?? null,
  }));

  // ── Totals + admin KPIs ────────────────────────────────────
  const [teamsRes, playersRes, tournamentsRes, matchesRes,
         goalsTotalRes, activeTournRes, liveMatchesRes] = await Promise.all([
    headCount('teams'),
    headCount('players'),
    headCount('tournaments'),
    headCount('matches'),
    headCount('match_events', { event_type: 'goal' }),
    headCount('tournaments', { status: 'active' }),
    headCount('matches', { status: 'live' }),
  ]);

  const totals = {
    teams: teamsRes.count ?? 0,
    players: playersRes.count ?? 0,
    tournaments: tournamentsRes.count ?? 0,
    matches: matchesRes.count ?? 0,
    goals: goalsTotalRes.count ?? 0,
    active_tournaments: activeTournRes.count ?? 0,
    live_matches: liveMatchesRes.count ?? 0,
  };

  res.json({ top_scorers, most_wins, recent_results, recent_activity, totals });
});

export default router;
