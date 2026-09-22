-- QIU SPORT CLUB ONLY: frraifjjwbleiztpebzw.
-- Additive migration: does not replace is_admin/handle_new_user or touch sports data.
begin;

create table public.club_news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 180),
  author text not null default '' check (length(author) <= 100),
  article_date date not null default current_date,
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
  constraint club_news_publish_ready check (status = 'draft' or
    (length(trim(author)) > 0 and cover_path is not null and length(trim(cover_alt)) > 0
      and length(trim(body)) > 0 and published_at is not null))
);

-- All reads/writes go through the backend, which checks the existing club role.
-- No public/authenticated table policies: draft contents cannot leak via REST.
alter table public.club_news enable row level security;
revoke all on public.club_news from public, anon, authenticated;
grant select, insert, update on public.club_news to service_role;

create index club_news_published_date_idx
  on public.club_news(article_date desc, published_at desc, id)
  where status = 'published';
create index club_news_updated_idx on public.club_news(updated_at desc, id);

create function public.club_news_stamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  if new.status = 'published' then
    if TG_OP = 'INSERT' then
      new.published_at := clock_timestamp();
    elsif old.status <> 'published' then
      new.published_at := clock_timestamp();
    else
      new.published_at := old.published_at;
    end if;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;
revoke all on function public.club_news_stamp() from public, anon, authenticated;
create trigger club_news_stamp before insert or update on public.club_news
  for each row execute function public.club_news_stamp();

notify pgrst, 'reload schema';
commit;
