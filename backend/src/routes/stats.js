import { Router } from 'express';
import { supabaseAdmin } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';

const router = Router();

const headCount = (table, filters = {}) => {
  let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  return q;
};

// Which stat cards apply to a given sport / format.
function applicableStats(sportType, isIndividual) {
  const stats = ['champion', 'most_wins'];
  if (!isIndividual) {
    if (['football', 'basketball', 'volleyball', 'handball'].includes(sportType)) {
      stats.push('top_scorer');
    }
    if (sportType === 'football') {
      stats.push('clean_sheet');
    }
  }
  return stats;
}

// ─── GET /api/stats ───────────────────────────────────────────
// Cross-tournament rollup used by the public Stats overview and admin dash.
router.get('/', async (_req, res) => {
  // Top scorers across all tournaments.
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

  // Most wins across all tournaments.
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

  // Recent results.
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

  // Recent activity for admin dashboard.
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

// ─── GET /api/stats/tournament/:id ────────────────────────────
// Auto-computed per-tournament stats. No manual award storage — everything
// is derived from match + match_event rows in real time.
router.get('/tournament/:id', async (req, res) => {
  const tournamentId = req.params.id;

  const { data: tournament, error: tErr } = await supabaseAdmin
    .from('tournaments')
    .select('id, name, sport_type, is_individual, format, status, start_date, end_date')
    .eq('id', tournamentId)
    .single();
  if (tErr || !tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const applicable = applicableStats(tournament.sport_type, tournament.is_individual);
  const out = {
    tournament,
    applicable,
    champion: null,
    champion_stats: null,
    top_scorers: [],
    clean_sheets: [],
    most_wins: [],
    best_player: null,
    best_defender: null,
    best_playmaker: null,
    best_goalkeeper: null,
    summary: {
      total_goals: 0,
      matches_completed: 0,
      goals_per_match: 0,
      total_clean_sheets: 0,
      biggest_win: null,    // { home, away, home_score, away_score, margin }
    },
  };

  // ── Summary (total goals, biggest win, clean sheet count) ──
  {
    const { data: completed } = await supabaseAdmin
      .from('matches')
      .select(`
        home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(id, name, primary_color),
        away_team:teams!matches_away_team_id_fkey(id, name, primary_color),
        home_player:players!matches_home_player_id_fkey(id, name),
        away_player:players!matches_away_player_id_fkey(id, name)
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed');

    let totalGoals = 0;
    let cleanSheets = 0;
    let biggest = null;
    for (const m of completed ?? []) {
      const hs = m.home_score ?? 0;
      const as = m.away_score ?? 0;
      totalGoals += hs + as;
      if (hs === 0 || as === 0) cleanSheets += (hs === 0 ? 1 : 0) + (as === 0 ? 1 : 0);
      const margin = Math.abs(hs - as);
      if (!biggest || margin > biggest.margin
          || (margin === biggest.margin && hs + as > biggest.home_score + biggest.away_score)) {
        biggest = {
          home_name: m.home_team?.name ?? m.home_player?.name ?? 'TBD',
          away_name: m.away_team?.name ?? m.away_player?.name ?? 'TBD',
          home_color: m.home_team?.primary_color ?? null,
          away_color: m.away_team?.primary_color ?? null,
          home_score: hs,
          away_score: as,
          margin,
        };
      }
    }
    const played = completed?.length ?? 0;
    out.summary.total_goals = totalGoals;
    out.summary.matches_completed = played;
    out.summary.goals_per_match = played > 0
      ? Math.round((totalGoals / played) * 10) / 10
      : 0;
    out.summary.total_clean_sheets = cleanSheets;
    out.summary.biggest_win = biggest && biggest.margin > 0 ? biggest : null;
  }

  // ── Champion ───────────────────────────────────────────────
  // Strictly derived from a completed match in the 'Final' round. We do not
  // infer the champion from standings or any other source. If no such match
  // exists, `out.champion` stays null and the frontend shows TBD / hides the card.
  let championTeamId = null;
  if (applicable.includes('champion')) {
    const { data: finals } = await supabaseAdmin
      .from('matches')
      .select(`
        match_number, winner_id, winner_player_id,
        winner_team:teams!matches_winner_id_fkey(id, name, primary_color),
        winner_player:players!matches_winner_player_id_fkey(id, name, jersey_number)
      `)
      .eq('tournament_id', tournamentId)
      .eq('round', 'Final')
      .eq('status', 'completed')
      .order('match_number', { ascending: false })
      .limit(1);
    const final = finals?.[0];
    if (final?.winner_team) {
      championTeamId = final.winner_team.id;
      out.champion = { kind: 'team', name: final.winner_team.name, color: final.winner_team.primary_color };
    } else if (final?.winner_player) {
      out.champion = { kind: 'player', name: final.winner_player.name, jersey_number: final.winner_player.jersey_number };
    }
  }

  // ── Champion stats ─────────────────────────────────────────
  // The champion team's run through this tournament: matches played, won,
  // drawn, lost, goals for/against and clean sheets. Only computed for team
  // champions (individual-sport winners don't have a goals-based profile).
  if (championTeamId) {
    const { data: cm } = await supabaseAdmin
      .from('matches')
      .select('home_team_id, away_team_id, home_score, away_score, winner_id')
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed')
      .or(`home_team_id.eq.${championTeamId},away_team_id.eq.${championTeamId}`);

    let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, cs = 0;
    for (const m of cm ?? []) {
      const isHome = m.home_team_id === championTeamId;
      const forGoals = (isHome ? m.home_score : m.away_score) ?? 0;
      const agGoals = (isHome ? m.away_score : m.home_score) ?? 0;
      played += 1;
      gf += forGoals;
      ga += agGoals;
      if (agGoals === 0) cs += 1;
      // winner_id is authoritative; fall back to score comparison.
      const isWin = m.winner_id ? m.winner_id === championTeamId : forGoals > agGoals;
      const isLoss = m.winner_id ? m.winner_id !== championTeamId && forGoals !== agGoals
                                 : forGoals < agGoals;
      if (forGoals === agGoals) drawn += 1;
      else if (isWin) won += 1;
      else if (isLoss) lost += 1;
    }

    out.champion_stats = {
      team_name: out.champion?.name ?? null,
      team_color: out.champion?.color ?? null,
      played, won, drawn, lost,
      goals_for: gf,
      goals_against: ga,
      goal_diff: gf - ga,
      clean_sheets: cs,
    };
    applicable.push('champion_stats');
  }

  // ── Top scorers ────────────────────────────────────────────
  if (applicable.includes('top_scorer')) {
    const { data: matchIds } = await supabaseAdmin
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId);
    const ids = (matchIds ?? []).map((m) => m.id);
    if (ids.length > 0) {
      const { data: goals } = await supabaseAdmin
        .from('match_events')
        .select(`
          player_id,
          player:players(id, name, jersey_number),
          team:teams(id, name, primary_color)
        `)
        .in('match_id', ids)
        .eq('event_type', 'goal');
      const map = new Map();
      for (const g of goals ?? []) {
        if (!g.player_id) continue;
        const cur = map.get(g.player_id) ?? {
          player_id: g.player_id,
          player_name: g.player?.name ?? null,
          jersey_number: g.player?.jersey_number ?? null,
          team_id: g.team?.id ?? null,
          team_name: g.team?.name ?? null,
          team_color: g.team?.primary_color ?? null,
          goal_count: 0,
        };
        cur.goal_count += 1;
        map.set(g.player_id, cur);
      }
      out.top_scorers = [...map.values()].sort((a, b) => b.goal_count - a.goal_count);
    }
  }

  // ── Clean sheets ───────────────────────────────────────────
  if (applicable.includes('clean_sheet')) {
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select(`
        home_team_id, away_team_id, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(id, name, primary_color),
        away_team:teams!matches_away_team_id_fkey(id, name, primary_color)
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed');
    const map = new Map();
    for (const m of matches ?? []) {
      if (m.away_score === 0 && m.home_team) {
        const cur = map.get(m.home_team.id) ?? {
          team_id: m.home_team.id,
          team_name: m.home_team.name,
          team_color: m.home_team.primary_color,
          clean_sheet_count: 0,
        };
        cur.clean_sheet_count += 1;
        map.set(m.home_team.id, cur);
      }
      if (m.home_score === 0 && m.away_team) {
        const cur = map.get(m.away_team.id) ?? {
          team_id: m.away_team.id,
          team_name: m.away_team.name,
          team_color: m.away_team.primary_color,
          clean_sheet_count: 0,
        };
        cur.clean_sheet_count += 1;
        map.set(m.away_team.id, cur);
      }
    }
    out.clean_sheets = [...map.values()].sort((a, b) => b.clean_sheet_count - a.clean_sheet_count);
  }

  // ── Most wins ──────────────────────────────────────────────
  if (applicable.includes('most_wins')) {
    if (tournament.is_individual) {
      const { data: m } = await supabaseAdmin
        .from('matches')
        .select(`
          winner_player_id,
          winner_player:players!matches_winner_player_id_fkey(id, name, jersey_number)
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed')
        .not('winner_player_id', 'is', null);
      const map = new Map();
      for (const row of m ?? []) {
        const id = row.winner_player_id;
        const cur = map.get(id) ?? {
          kind: 'player',
          id,
          name: row.winner_player?.name ?? null,
          jersey_number: row.winner_player?.jersey_number ?? null,
          win_count: 0,
        };
        cur.win_count += 1;
        map.set(id, cur);
      }
      out.most_wins = [...map.values()].sort((a, b) => b.win_count - a.win_count);
    } else {
      const { data: m } = await supabaseAdmin
        .from('matches')
        .select(`
          winner_id,
          winner_team:teams!matches_winner_id_fkey(id, name, primary_color)
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed')
        .not('winner_id', 'is', null);
      const map = new Map();
      for (const row of m ?? []) {
        const id = row.winner_id;
        const cur = map.get(id) ?? {
          kind: 'team',
          id,
          name: row.winner_team?.name ?? null,
          color: row.winner_team?.primary_color ?? null,
          win_count: 0,
        };
        cur.win_count += 1;
        map.set(id, cur);
      }
      out.most_wins = [...map.values()].sort((a, b) => b.win_count - a.win_count);
    }
  }

  // ── Individual awards (admin-selected, manual) ─────────────
  // Best Player / Defender / Playmaker / Goalkeeper are stored directly on the
  // tournaments row as `<key>_name` + `<key>_team_id`. Public visitors see TBD
  // until an admin sets them. Applies to team-sport tournaments with scorers.
  if (!tournament.is_individual && applicable.includes('top_scorer')) {
    applicable.push('best_player', 'best_defender', 'best_playmaker', 'best_goalkeeper');

    const { data: aw } = await supabaseAdmin
      .from('tournaments')
      .select(`
        best_player_name,
        best_player_team:teams!tournaments_best_player_team_id_fkey(id, name, primary_color),
        best_defender_name,
        best_defender_team:teams!tournaments_best_defender_team_id_fkey(id, name, primary_color),
        best_playmaker_name,
        best_playmaker_team:teams!tournaments_best_playmaker_team_id_fkey(id, name, primary_color),
        best_goalkeeper_name,
        best_goalkeeper_team:teams!tournaments_best_goalkeeper_team_id_fkey(id, name, primary_color)
      `)
      .eq('id', tournamentId)
      .single();

    const buildAward = (name, team) =>
      name
        ? {
            player_name: name,
            player_id: null,
            team_name: team?.name ?? null,
            team_color: team?.primary_color ?? null,
            team_id: team?.id ?? null,
          }
        : null;

    out.best_player = buildAward(aw?.best_player_name, aw?.best_player_team);
    out.best_defender = buildAward(aw?.best_defender_name, aw?.best_defender_team);
    out.best_playmaker = buildAward(aw?.best_playmaker_name, aw?.best_playmaker_team);
    out.best_goalkeeper = buildAward(aw?.best_goalkeeper_name, aw?.best_goalkeeper_team);
  }

  res.json(out);
});

export default router;
