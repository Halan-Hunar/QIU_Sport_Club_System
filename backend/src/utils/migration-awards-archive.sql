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
