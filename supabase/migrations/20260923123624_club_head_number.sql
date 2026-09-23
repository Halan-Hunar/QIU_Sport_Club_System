begin;
alter table public.club_heads add column head_number integer
  check (head_number between 1 and 999);
notify pgrst, 'reload schema';
commit;
