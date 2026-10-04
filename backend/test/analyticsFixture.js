import { createFixture } from './newsFixture.js';
import { readFile } from 'node:fs/promises';

export const ARTICLE = '20000000-0000-4000-8000-000000000002';
export const TOURNAMENT = '30000000-0000-4000-8000-000000000003';
export const MATCH = '40000000-0000-4000-8000-000000000004';
export const HOME = '50000000-0000-4000-8000-000000000005';
export const AWAY = '60000000-0000-4000-8000-000000000006';
export async function analyticsFixture() {
  const fixture = await createFixture();
  const { pg } = fixture;
  await pg.exec(`
    create table teams(id uuid primary key, name text);
    create table players(id uuid primary key, team_id uuid, name text, jersey_number int, position text, photo_url text, notes text, sports text[],created_at timestamptz,deleted_at timestamptz);
    create table tournaments(id uuid primary key,name text);
    create table matches(id uuid primary key,tournament_id uuid,home_team_id uuid,away_team_id uuid,home_player_id uuid,away_player_id uuid,status text default 'live',home_score int default 0,away_score int default 0);
    create table match_events(id uuid primary key default gen_random_uuid(),match_id uuid references matches(id) on delete cascade,team_id uuid,player_id uuid,event_type text,minute int,notes text);
    create view tournament_standings as select id from teams;
    insert into teams values('${HOME}','Engineering FC'),('${AWAY}','Business United');
    insert into tournaments values('${TOURNAMENT}','QIU Autumn Cup');
    insert into matches(id,tournament_id,home_team_id,away_team_id) values('${MATCH}','${TOURNAMENT}','${HOME}','${AWAY}');
    insert into club_news(id,title,author,article_date,cover_path,cover_alt,body,status) values
      ('${ARTICLE}','A final to remember','Club editor','2026-09-28','10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002.webp','Club final','A club story with enough content for publication.','published');
    grant all on all tables in schema public to service_role;
  `);
  await pg.exec(await readFile(new URL('../../supabase/migrations/20260928081037_club_analytics_and_safety.sql', import.meta.url), 'utf8'));
  fixture.db.rpc = async (name, args) => {
    const mapping = { record_club_view: ['payload'], club_analytics_report: ['date_from','date_to'], club_article_views: ['article_ids'] };
    if (!mapping[name]) throw new Error('Unexpected RPC');
    const values = mapping[name].map((key) => key === 'payload' ? JSON.stringify(args[key]) : args[key]);
    try { return { data: (await pg.query(`select public.${name}(${values.map((_,i) => `$${i+1}`).join(',')}) as value`, values)).rows[0].value, error: null }; }
    catch (error) { return { data: null, error }; }
  };
  return fixture;
}
