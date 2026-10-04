begin;
-- The editor already exposes Founder, but the column was missing from migrations.
alter table public.club_heads add column if not exists is_founder boolean not null default false;

commit;
