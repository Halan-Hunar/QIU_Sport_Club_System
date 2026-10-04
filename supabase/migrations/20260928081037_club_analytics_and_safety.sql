begin;
-- Backend-only analytics. Never grant collection or reports to browser roles.
create table public.club_page_views (
  event_id uuid primary key,
  session_id uuid not null,
  path text not null check (length(path) <= 150),
  kind text not null check (kind in ('page','article','tournament','match','head')),
  resource_id uuid,
  source text not null check (source in ('Direct / unknown','Google','Instagram','Facebook','Bing','Other websites')),
  device text not null check (device in ('Mobile','Desktop','Tablet')),
  active_seconds integer not null default 0 check (active_seconds between 0 and 1800),
  scroll_depth integer not null default 0 check (scroll_depth between 0 and 100),
  recorded_at timestamptz not null default now()
);
create index club_page_views_recorded on public.club_page_views(recorded_at);
create index club_page_views_article on public.club_page_views(resource_id, recorded_at) where kind = 'article';
alter table public.club_page_views enable row level security;
revoke all on public.club_page_views from public, anon, authenticated;
grant select, insert, update, delete on public.club_page_views to service_role;

create function public.record_club_view(payload jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare resource uuid := (payload->>'resource_id')::uuid; category text := payload->>'kind';
begin
  if category = 'article' and not exists (select 1 from public.club_news where id=resource and status='published') then return; end if;
  if category = 'head' and not exists (select 1 from public.club_heads where id=resource and status='published') then return; end if;
  if category = 'tournament' and not exists (select 1 from public.tournaments where id=resource) then return; end if;
  if category = 'match' and not exists (select 1 from public.matches where id=resource) then return; end if;
  insert into public.club_page_views(event_id,session_id,path,kind,resource_id,source,device,active_seconds,scroll_depth)
  values ((payload->>'event_id')::uuid,(payload->>'session_id')::uuid,payload->>'path',category,resource,payload->>'source',payload->>'device',(payload->>'active_seconds')::int,(payload->>'scroll_depth')::int)
  on conflict(event_id) do update set
    active_seconds = greatest(club_page_views.active_seconds, least(excluded.active_seconds, extract(epoch from now()-club_page_views.recorded_at)::int + 15)),
    scroll_depth = greatest(club_page_views.scroll_depth, excluded.scroll_depth)
  where club_page_views.session_id = excluded.session_id and club_page_views.path = excluded.path
    and club_page_views.recorded_at > now() - interval '2 hours';
end $$;
revoke all on function public.record_club_view(jsonb) from public, anon, authenticated;
grant execute on function public.record_club_view(jsonb) to service_role;

create function public.club_analytics_report(date_from date, date_to date) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if date_to < date_from or date_to - date_from > 89 then raise exception 'Invalid date range'; end if;
  with bounds as (
    select date_from::timestamp at time zone 'Asia/Baghdad' as start_at,
      (date_to+1)::timestamp at time zone 'Asia/Baghdad' as end_at,
      (date_from-(date_to-date_from+1))::timestamp at time zone 'Asia/Baghdad' as previous_at
  ), all_rows as materialized (
    select v.*, (v.recorded_at at time zone 'Asia/Baghdad') as local_at, v.recorded_at >= b.start_at as current_period
    from public.club_page_views v cross join bounds b where v.recorded_at >= b.previous_at and v.recorded_at < b.end_at
  ), current_rows as (select * from all_rows where current_period),
  totals as (
    select current_period, count(*) filter(where kind <> 'match') as views,
      count(distinct session_id) filter(where kind <> 'match') as visits,
      count(*) filter(where kind='article') as article_views,
      count(*) filter(where kind='match') as match_opens,
      coalesce(round(avg(active_seconds) filter(where kind='article'),1),0) as reading_seconds,
      coalesce(round(avg(scroll_depth) filter(where kind='article'),1),0) as scroll_depth,
      coalesce(round(100.0 * count(*) filter(where kind='article' and scroll_depth>=90) / nullif(count(*) filter(where kind='article'),0),1),0) as completion_rate
    from all_rows group by current_period
  ), daily as (
    select day::date as date, count(v.event_id) filter(where v.kind<>'match') as views,
      count(distinct v.session_id) filter(where v.kind<>'match') as visits
    from generate_series(date_from::timestamp,date_to::timestamp,interval '1 day') day
    left join current_rows v on v.local_at::date=day::date group by day order by day
  ), rankings as (
    select kind, resource_id, path, count(*) as views, round(avg(active_seconds),1) as reading_seconds,
      round(avg(scroll_depth),1) as scroll_depth,
      round(100.0*count(*) filter(where scroll_depth>=90)/count(*),1) as completion_rate
    from current_rows group by kind,resource_id,path
  ), titled as (
    select r.*, coalesce(n.title,t.name,h.title,
      case when r.kind='match' then coalesce(ht.name,hp.name,'TBD') || ' vs ' || coalesce(at.name,ap.name,'TBD') end,
      case r.path when '/' then 'Home' when '/events' then 'Club Events' when '/tournaments' then 'Tournaments'
      when '/teams' then 'Teams' when '/stats' then 'Sports statistics' when '/club/heads' then 'Heads of the Club' else r.path end) as title,
      m.tournament_id as match_tournament_id
    from rankings r
    left join public.club_news n on r.kind='article' and n.id=r.resource_id
    left join public.tournaments t on r.kind='tournament' and t.id=r.resource_id
    left join public.club_heads h on r.kind='head' and h.id=r.resource_id
    left join public.matches m on r.kind='match' and m.id=r.resource_id
    left join public.teams ht on ht.id=m.home_team_id left join public.teams at on at.id=m.away_team_id
    left join public.players hp on hp.id=m.home_player_id left join public.players ap on ap.id=m.away_player_id
  ), tournament_ranks as (
    select resource_id, min(title) as title, '/tournaments/'||resource_id as path, sum(views) as views
    from titled where kind='tournament' group by resource_id order by sum(views) desc, resource_id limit 10
  )
  select jsonb_build_object(
    'current', coalesce((select to_jsonb(totals)-'current_period' from totals where current_period),'{}'::jsonb),
    'previous', coalesce((select to_jsonb(totals)-'current_period' from totals where not current_period),'{}'::jsonb),
    'daily', (select jsonb_agg(to_jsonb(daily)) from daily),
    'pages', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from titled where kind<>'match' order by views desc,path limit 10) x),'[]'::jsonb),
    'articles', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from titled where kind='article' order by views desc,path limit 20) x),'[]'::jsonb),
    'tournaments', coalesce((select jsonb_agg(to_jsonb(x)) from tournament_ranks x),'[]'::jsonb),
    'matches', coalesce((select jsonb_agg(to_jsonb(x)) from (select * from titled where kind='match' order by views desc,path limit 10) x),'[]'::jsonb),
    'sources', coalesce((select jsonb_agg(to_jsonb(x)) from (select source as label,count(*) as views from current_rows where kind<>'match' group by source order by count(*) desc,source) x),'[]'::jsonb),
    'devices', coalesce((select jsonb_agg(to_jsonb(x)) from (select device as label,count(*) as views from current_rows where kind<>'match' group by device order by count(*) desc,device) x),'[]'::jsonb),
    'heatmap', coalesce((select jsonb_agg(to_jsonb(x)) from (select extract(isodow from local_at)::int as day,extract(hour from local_at)::int as hour,count(*) as views from current_rows where kind<>'match' group by 1,2) x),'[]'::jsonb),
    'first_recorded_at', (select min(recorded_at) from public.club_page_views)
  ) into result;
  return result;
end $$;
revoke all on function public.club_analytics_report(date,date) from public, anon, authenticated;
grant execute on function public.club_analytics_report(date,date) to service_role;

create function public.club_article_views(article_ids uuid[]) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_object_agg(resource_id, views),'{}'::jsonb) from
    (select resource_id,count(*) as views from public.club_page_views where kind='article'
     and resource_id=any(article_ids) and recorded_at>=now()-interval '180 days' group by resource_id) v;
$$;
revoke all on function public.club_article_views(uuid[]) from public, anon, authenticated;
grant execute on function public.club_article_views(uuid[]) to service_role;

-- Keep public player names/results available, but never expose private notes directly.
revoke select on public.players from anon, authenticated;
grant select (id,team_id,name,jersey_number,position,photo_url,sports,created_at,deleted_at) on public.players to anon, authenticated;
alter view public.tournament_standings set (security_invoker = true);

-- Serialize event changes on the match row. Score changes and event writes now
-- commit or roll back together, including deletion and own goals.
create function public.sync_club_event_score() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare e public.match_events; m public.matches; scoring_team uuid; delta integer;
begin
  if tg_op='UPDATE' then raise exception 'Remove and re-add an event to edit it' using errcode='23514'; end if;
  if tg_op='DELETE' then e:=old; delta:=-1; else e:=new; delta:=1; end if;
  select * into m from public.matches where id=e.match_id for update;
  if not found then
    if tg_op='DELETE' then return old; end if;
    raise exception 'Match does not exist' using errcode='23503';
  end if;
  if m.status='completed' then raise exception 'Reopen the match before changing events' using errcode='23514'; end if;
  if tg_op='INSERT' then
    if e.team_id is not null and e.team_id is distinct from m.home_team_id and e.team_id is distinct from m.away_team_id then
      raise exception 'Team is not in this match' using errcode='23514';
    end if;
    if e.player_id is not null and not exists (
      select 1 from public.players p where p.id=e.player_id and
      ((e.team_id is not null and p.team_id=e.team_id) or (e.team_id is null and p.id in (m.home_player_id,m.away_player_id)))
    ) then raise exception 'Player is not on this side of the match' using errcode='23514'; end if;
  end if;
  if e.event_type in ('goal','own_goal') then
    if e.team_id is null then raise exception 'Goals require a match team' using errcode='23514'; end if;
    scoring_team:=e.team_id;
    if e.event_type='own_goal' then scoring_team:=case when e.team_id=m.home_team_id then m.away_team_id else m.home_team_id end; end if;
    update public.matches set
      home_score=greatest(0,coalesce(home_score,0)+case when scoring_team=home_team_id then delta else 0 end),
      away_score=greatest(0,coalesce(away_score,0)+case when scoring_team=away_team_id then delta else 0 end)
    where id=e.match_id;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function public.sync_club_event_score() from public, anon, authenticated;
create trigger club_event_score before insert or delete or update on public.match_events
for each row execute function public.sync_club_event_score();

commit;
