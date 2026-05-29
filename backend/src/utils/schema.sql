-- ============================================================
-- Sport Club Management System — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────
create type user_role as enum ('admin', 'user');
create type tournament_format as enum ('single_elim', 'double_elim', 'round_robin', 'group_knockout');
create type tournament_status as enum ('upcoming', 'active', 'completed');
create type match_status as enum ('scheduled', 'live', 'completed', 'postponed');
create type event_type as enum ('goal', 'own_goal', 'yellow_card', 'red_card', 'substitution');
create type award_type as enum ('top_scorer', 'best_player', 'winner', 'clean_sheet');

-- ─── USERS ───────────────────────────────────────────────────
-- Extends Supabase Auth (auth.users) with our own role info
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role user_role not null default 'user',
  created_at timestamptz not null default now()
);

-- ─── TEAMS ───────────────────────────────────────────────────
create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  primary_color text not null default '#ffffff',
  secondary_color text not null default '#000000',
  created_at timestamptz not null default now()
);

-- ─── PLAYERS ─────────────────────────────────────────────────
-- team_id is nullable so standalone (individual-sport) players can exist
-- without being on a club team. Solo events register via tournament_players.
create table public.players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  jersey_number int,
  position text,
  photo_url text,
  notes text,                          -- free-form (rank, faculty, …) for standalone players
  sports text[] not null default '{}', -- sports this player is eligible for (chess, table_tennis, …)
  created_at timestamptz not null default now()
);

-- ─── TOURNAMENTS ─────────────────────────────────────────────
create table public.tournaments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sport_type text not null default 'football',
  format tournament_format not null default 'single_elim',
  status tournament_status not null default 'upcoming',
  start_date date,
  end_date date,
  description text,
  is_individual boolean not null default false,  -- true for chess, ping pong, etc.
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- ─── TOURNAMENT TEAMS ────────────────────────────────────────
-- Teams registered in a specific tournament
create table public.tournament_teams (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed int,                  -- assigned when tournament starts
  group_name text,           -- e.g. "A", "B" for group stage format
  unique(tournament_id, team_id)
);

-- ─── TOURNAMENT PLAYERS ──────────────────────────────────────
-- Individual-player registrations (chess, table tennis, etc.) — used when
-- tournaments.is_individual is true.
create table public.tournament_players (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  seed int,
  unique(tournament_id, player_id)
);

-- ─── TEAM CAPTAINS ───────────────────────────────────────────
create table public.team_captains (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete cascade,
  unique(team_id, tournament_id)
);

-- ─── MATCHES ─────────────────────────────────────────────────
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round text,                -- e.g. "Quarter Final", "Group Stage"
  match_number int,          -- order within round
  home_team_id   uuid references public.teams(id),    -- team competitor (null for individual sports)
  away_team_id   uuid references public.teams(id),
  home_player_id uuid references public.players(id),  -- individual-sport competitor
  away_player_id uuid references public.players(id),
  home_score int not null default 0,
  away_score int not null default 0,
  status match_status not null default 'scheduled',
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  location text,
  winner_id        uuid references public.teams(id),   -- winning team
  winner_player_id uuid references public.players(id), -- or winning player
  next_match_id uuid references public.matches(id),    -- bracket progression
  created_at timestamptz not null default now()
);

-- ─── MATCH EVENTS ────────────────────────────────────────────
create table public.match_events (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  event_type event_type not null,
  team_id uuid references public.teams(id),
  player_id uuid references public.players(id),
  minute int,
  notes text,
  created_at timestamptz not null default now()
);

-- ─── AWARDS ──────────────────────────────────────────────────
create table public.awards (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  award_type award_type not null,
  player_id uuid references public.players(id),
  team_id uuid references public.teams(id),
  created_at timestamptz not null default now()
);

-- ─── STANDINGS VIEW ──────────────────────────────────────────
-- Computed standings for round robin / group stage
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
group by tt.tournament_id, tt.team_id, t.name, t.primary_color, tt.group_name;

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.team_captains enable row level security;
alter table public.matches enable row level security;
alter table public.match_events enable row level security;
alter table public.awards enable row level security;
alter table public.tournament_players enable row level security;

-- Helper function: check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- TEAMS: public read, admin write
create policy "teams_public_read" on public.teams for select using (true);
create policy "teams_admin_insert" on public.teams for insert with check (public.is_admin());
create policy "teams_admin_update" on public.teams for update using (public.is_admin());
create policy "teams_admin_delete" on public.teams for delete using (public.is_admin());

-- PLAYERS: public read, admin write
create policy "players_public_read" on public.players for select using (true);
create policy "players_admin_insert" on public.players for insert with check (public.is_admin());
create policy "players_admin_update" on public.players for update using (public.is_admin());
create policy "players_admin_delete" on public.players for delete using (public.is_admin());

-- TOURNAMENTS: public read, admin write
create policy "tournaments_public_read" on public.tournaments for select using (true);
create policy "tournaments_admin_insert" on public.tournaments for insert with check (public.is_admin());
create policy "tournaments_admin_update" on public.tournaments for update using (public.is_admin());
create policy "tournaments_admin_delete" on public.tournaments for delete using (public.is_admin());

-- TOURNAMENT_TEAMS: public read, admin write
create policy "tournament_teams_public_read" on public.tournament_teams for select using (true);
create policy "tournament_teams_admin_insert" on public.tournament_teams for insert with check (public.is_admin());
create policy "tournament_teams_admin_update" on public.tournament_teams for update using (public.is_admin());
create policy "tournament_teams_admin_delete" on public.tournament_teams for delete using (public.is_admin());

-- TOURNAMENT_PLAYERS: public read, admin write
create policy "tournament_players_public_read" on public.tournament_players for select using (true);
create policy "tournament_players_admin_insert" on public.tournament_players for insert with check (public.is_admin());
create policy "tournament_players_admin_update" on public.tournament_players for update using (public.is_admin());
create policy "tournament_players_admin_delete" on public.tournament_players for delete using (public.is_admin());

grant all    on public.tournament_players to service_role;
grant select on public.tournament_players to anon, authenticated;

-- TEAM_CAPTAINS: public read, admin write
create policy "team_captains_public_read" on public.team_captains for select using (true);
create policy "team_captains_admin_insert" on public.team_captains for insert with check (public.is_admin());
create policy "team_captains_admin_update" on public.team_captains for update using (public.is_admin());
create policy "team_captains_admin_delete" on public.team_captains for delete using (public.is_admin());

-- MATCHES: public read, admin write
create policy "matches_public_read" on public.matches for select using (true);
create policy "matches_admin_insert" on public.matches for insert with check (public.is_admin());
create policy "matches_admin_update" on public.matches for update using (public.is_admin());
create policy "matches_admin_delete" on public.matches for delete using (public.is_admin());

-- MATCH_EVENTS: public read, admin write
create policy "match_events_public_read" on public.match_events for select using (true);
create policy "match_events_admin_insert" on public.match_events for insert with check (public.is_admin());
create policy "match_events_admin_update" on public.match_events for update using (public.is_admin());
create policy "match_events_admin_delete" on public.match_events for delete using (public.is_admin());

-- AWARDS: public read, admin write
create policy "awards_public_read" on public.awards for select using (true);
create policy "awards_admin_insert" on public.awards for insert with check (public.is_admin());
create policy "awards_admin_update" on public.awards for update using (public.is_admin());
create policy "awards_admin_delete" on public.awards for delete using (public.is_admin());

-- USERS: users can read their own row, admins can read all
create policy "users_read_own" on public.users for select using (auth.uid() = id or public.is_admin());
create policy "users_admin_update" on public.users for update using (public.is_admin());

-- ─── AUTO-CREATE USER ROW ON SIGNUP ──────────────────────────
-- When someone signs up via Supabase Auth, insert a row in our users table
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── MIGRATIONS (idempotent — safe to re-run on an existing DB) ───────────────
-- These mirror the schema changes above for databases that were created from
-- an older version of this file. Run the whole block in the SQL editor.

alter table public.players alter column team_id drop not null;
alter table public.players add column if not exists notes text;
alter table public.players add column if not exists sports text[] not null default '{}';

alter table public.matches add column if not exists home_player_id   uuid references public.players(id);
alter table public.matches add column if not exists away_player_id   uuid references public.players(id);
alter table public.matches add column if not exists winner_player_id uuid references public.players(id);

alter table public.tournaments
  add column if not exists is_individual boolean not null default false;

create table if not exists public.tournament_players (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  seed int,
  unique(tournament_id, player_id)
);
alter table public.tournament_players enable row level security;

do $$ begin
  create policy "tournament_players_public_read" on public.tournament_players for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tournament_players_admin_insert" on public.tournament_players for insert with check (public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tournament_players_admin_update" on public.tournament_players for update using (public.is_admin());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "tournament_players_admin_delete" on public.tournament_players for delete using (public.is_admin());
exception when duplicate_object then null; end $$;

grant all    on public.tournament_players to service_role;
grant select on public.tournament_players to anon, authenticated;
grant all    on public.tournaments        to service_role;
