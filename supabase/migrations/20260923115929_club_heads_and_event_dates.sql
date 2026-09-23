begin;
-- Unknown historical event dates stay unknown, rather than inventing dates.
alter table public.club_news add column event_date date;
create index club_news_event_date_idx on public.club_news(event_date desc nulls last, published_at desc, id)
  where status = 'published';

create table public.club_heads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 100),
  major text not null check (length(trim(major)) between 1 and 120),
  accent_color text not null check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  is_current boolean not null default false,
  cover_path text,
  cover_alt text not null default '' check (length(cover_alt) <= 240),
  body text not null default '' check (length(body) <= 60000),
  excerpt text not null default '' check (length(excerpt) <= 200),
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or (length(trim(body)) > 0 and published_at is not null))
);
alter table public.club_heads enable row level security;
revoke all on public.club_heads from public, anon, authenticated;
grant select, insert, update on public.club_heads to service_role;
create unique index club_heads_one_current on public.club_heads(is_current)
  where is_current and status = 'published';
create index club_heads_public_idx on public.club_heads(is_current desc, published_at desc, id)
  where status = 'published';
create trigger club_heads_stamp before insert or update on public.club_heads
  for each row execute function public.club_news_stamp();
notify pgrst, 'reload schema';
commit;
