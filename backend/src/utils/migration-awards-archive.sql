-- ============================================================
-- QIU Sports Club — Migration: manual awards, champion end-stamp,
-- and team soft-delete.
-- Safe to run multiple times (idempotent). Paste the whole file into
-- the Supabase SQL editor and run it once.
-- ============================================================

-- ─── Manual individual awards on the tournament row ──────────
-- Best Player (may already exist), plus Best Defender / Playmaker / Goalkeeper.
-- Each award = a free-text name + the team the player represented.
alter table public.tournaments
  add column if not exists best_player_name text;
alter table public.tournaments
  add column if not exists best_player_team_id uuid
  references public.teams(id) on delete set null;

alter table public.tournaments
  add column if not exists best_defender_name text;
alter table public.tournaments
  add column if not exists best_defender_team_id uuid
  references public.teams(id) on delete set null;

alter table public.tournaments
  add column if not exists best_playmaker_name text;
alter table public.tournaments
  add column if not exists best_playmaker_team_id uuid
  references public.teams(id) on delete set null;

alter table public.tournaments
  add column if not exists best_goalkeeper_name text;
alter table public.tournaments
  add column if not exists best_goalkeeper_team_id uuid
  references public.teams(id) on delete set null;

-- ─── End Tournament ──────────────────────────────────────────
-- Timestamp set when an admin ends a tournament. The tournament and all of
-- its data are kept permanently afterwards.
alter table public.tournaments
  add column if not exists ended_at timestamptz;

-- ─── Soft-delete for teams ───────────────────────────────────
-- Deleting a team now sets deleted_at instead of removing the row, so the
-- team's record survives inside every tournament / match / stat it was part
-- of. Players already use this pattern; this line just guarantees it's present.
alter table public.teams
  add column if not exists deleted_at timestamptz;
alter table public.players
  add column if not exists deleted_at timestamptz;

-- Optional: quicker filtering of the "live" (non-deleted) team pool.
create index if not exists teams_not_deleted_idx
  on public.teams (deleted_at)
  where deleted_at is null;

-- ─── Standings view: exclude knockout matches ────────────────
-- Fix: the group / league table was adding points for Semi Final and Final
-- results. Standings now only count round-robin "Round N" games and
-- group-stage "Group …" games; knockout fixtures never touch the table.
create or replace view public.tournament_standings as
select
  tt.tournament_id,
  tt.team_id,
  t.name as team_name,
  t.primary_color,
  tt.group_name,
  count(m.id) as played,
  count(case
    when (m.home_team_id = tt.team_id and m.home_score > m.away_score)
      or (m.away_team_id = tt.team_id and m.away_score > m.home_score)
    then 1 end) as won,
  count(case
    when m.home_score = m.away_score then 1 end) as drawn,
  count(case
    when (m.home_team_id = tt.team_id and m.home_score < m.away_score)
      or (m.away_team_id = tt.team_id and m.away_score < m.home_score)
    then 1 end) as lost,
  coalesce(sum(case when m.home_team_id = tt.team_id then m.home_score
                    when m.away_team_id = tt.team_id then m.away_score
                    else 0 end), 0) as goals_for,
  coalesce(sum(case when m.home_team_id = tt.team_id then m.away_score
                    when m.away_team_id = tt.team_id then m.home_score
                    else 0 end), 0) as goals_against,
  coalesce(sum(case when m.home_team_id = tt.team_id then m.home_score - m.away_score
                    when m.away_team_id = tt.team_id then m.away_score - m.home_score
                    else 0 end), 0) as goal_diff,
  (count(case
    when (m.home_team_id = tt.team_id and m.home_score > m.away_score)
      or (m.away_team_id = tt.team_id and m.away_score > m.home_score)
    then 1 end) * 3
  + count(case when m.home_score = m.away_score then 1 end)) as points
from public.tournament_teams tt
join public.teams t on t.id = tt.team_id
left join public.matches m on m.tournament_id = tt.tournament_id
  and m.status = 'completed'
  and (m.home_team_id = tt.team_id or m.away_team_id = tt.team_id)
  and (
    m.round like 'Group %'
    or (m.round like 'Round %' and m.round not like 'Round of %')
  )
group by tt.tournament_id, tt.team_id, t.name, t.primary_color, tt.group_name;
