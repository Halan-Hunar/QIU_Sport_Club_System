-- QIU ONLY: frraifjjwbleiztpebzw. Apply AFTER the club_news migration.
-- No roles/passwords/auth triggers are changed. Existing events stay unassigned.
begin;
alter table public.club_news
  add column organiser text check (organiser in ('musa', 'shad', 'dyako')),
  add column co_organiser text check (co_organiser in ('halan'));

alter table public.users
  add column display_name text check (display_name is null or length(trim(display_name)) between 2 and 80),
  add column login_name text generated always as
    (lower(regexp_replace(trim(display_name), '\s+', ' ', 'g'))) stored;
create unique index users_login_name_unique on public.users(login_name) where login_name is not null;

-- Exact existing account IDs supplied by Halan. This never creates/promotes users.
update public.users set display_name = 'Halan Hunar'
where id = 'a4ad18cc-5696-4c20-8dae-2d633e860516' and role = 'admin';
update public.users set display_name = 'Dyako Abubakr'
where id = 'cba1ff8b-eda2-41cc-ad0e-636394be9dbc' and role = 'admin';

notify pgrst, 'reload schema';
commit;
