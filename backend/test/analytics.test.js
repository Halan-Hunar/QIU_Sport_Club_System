import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { analyticsFixture, ARTICLE, MATCH, HOME, AWAY } from './analyticsFixture.js';
import { createAnalyticsRouter } from '../src/routes/analytics.js';
import { pageIdentity, reportRange } from '../src/utils/analytics.js';
import { trafficSource } from '../../frontend/src/lib/analytics.js';
import { asyncRouter } from '../src/middleware/asyncRouter.js';
import { publicReadCache } from '../src/middleware/publicReadCache.js';

let fixture, server, base;
const session = randomUUID();
const event = (path = '/') => ({ event_id: randomUUID(), session_id: session, path, source: 'Instagram', device: 'Mobile', active_seconds: 0, scroll_depth: 0 });
before(async () => {
  fixture = await analyticsFixture();
  const app = express();
  app.use('/api/analytics', asyncRouter(createAnalyticsRouter({ ...fixture, origins: ['http://localhost:5173'], log: { error() {} } })));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ error: 'Invalid request' }));
  server = app.listen(0,'127.0.0.1'); await new Promise((resolve) => server.once('listening',resolve));
  base = `http://127.0.0.1:${server.address().port}/api/analytics`;
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); if (fixture) await fixture.pg.close(); });
async function collect(body, headers = {}) {
  return fetch(`${base}/collect`, { method:'POST', headers: { Origin:'http://localhost:5173','Content-Type':'application/json',...headers }, body:JSON.stringify(body) });
}
test('canonical paths exclude private areas, query strings and malformed resource identifiers', () => {
  assert.equal(pageIdentity(`/news/${ARTICLE}`).path, `/events/${ARTICLE}`);
  for (const path of ['/admin', '/login','/?token=secret','/events/nope',`/events/${ARTICLE}/stats`]) assert.equal(pageIdentity(path),null);
  assert.equal(reportRange({ from:'2026-02-30', to:'2026-03-01' }),null);
  assert.equal(reportRange({ from:'2026-09-29',to:'2026-09-29' },new Date('2026-09-28T12:00Z')),null);
  assert.equal(reportRange({ from:'2026-09-01',to:'2026-09-28' },new Date('2026-09-28T12:00Z')).days,28);
  assert.equal(trafficSource('https://l.instagram.com/?secret=test','https://qiusports.club'),'Instagram');
  assert.equal(trafficSource('https://instagram.com.evil.test','https://qiusports.club'),'Other websites');
});
test('reports and article counts reject visitors and non-admins', async () => {
  for (const path of ['/report','/articles']) {
    assert.equal((await fetch(base+path)).status,401);
    assert.equal((await fetch(base+path,{ headers:{ Authorization:'Bearer test-user' } })).status,403);
  }
});
test('collector rejects hostile origins, oversize data and private metadata; respects privacy signals', async () => {
  assert.equal((await collect(event(),{ Origin:'https://evil.test' })).status,403);
  assert.equal((await collect({ ...event(), raw_ip:'1.2.3.4' })).status,400);
  assert.equal((await collect({ ...event(), active_seconds:1801 })).status,400);
  assert.equal((await collect({ ...event(), path:'x'.repeat(3000) })).status,413);
  const ignored = event(); assert.equal((await collect(ignored,{ DNT:'1' })).status,204);
  assert.equal((await fixture.pg.query('select count(*)::int as n from club_page_views where event_id=$1',[ignored.event_id])).rows[0].n,0);
});
test('retries and out-of-order heartbeats count once; nonexistent articles are not counted', async () => {
  const body=event(`/events/${ARTICLE}`);
  assert.equal((await collect(body)).status,204);
  assert.equal((await collect({ ...body, active_seconds:12,scroll_depth:95 })).status,204);
  await collect({ ...body, active_seconds:2,scroll_depth:20 });
  const rows=(await fixture.pg.query('select * from club_page_views where event_id=$1',[body.event_id])).rows;
  assert.equal(rows.length,1); assert.equal(rows[0].active_seconds,12); assert.equal(rows[0].scroll_depth,95);
  const missing=event(`/events/${randomUUID()}`); await collect(missing);
  assert.equal((await fixture.pg.query('select count(*)::int as n from club_page_views where event_id=$1',[missing.event_id])).rows[0].n,0);
});
test('database aggregates beyond 1000 rows with local day boundaries and separate match opens', async () => {
  await fixture.pg.exec('delete from club_page_views');
  await fixture.pg.exec(`insert into club_page_views(event_id,session_id,path,kind,resource_id,source,device,active_seconds,scroll_depth,recorded_at)
    select gen_random_uuid(),'${session}','/events/${ARTICLE}','article','${ARTICLE}','Instagram','Mobile',60,100,'2026-09-27T21:00:00Z'::timestamptz from generate_series(1,1100);
    insert into club_page_views(event_id,session_id,path,kind,source,device,recorded_at) values(gen_random_uuid(),'${session}','/','page','Google','Desktop','2026-09-27T20:59:59Z');
    insert into club_page_views(event_id,session_id,path,kind,resource_id,source,device,recorded_at) values(gen_random_uuid(),'${session}','/matches/${MATCH}','match','${MATCH}','Instagram','Mobile','2026-09-28T00:00:00Z');`);
  const { data, error }=await fixture.db.rpc('club_analytics_report',{ date_from:'2026-09-28',date_to:'2026-09-28' });
  assert.equal(error,null); assert.equal(data.current.views,1100); assert.equal(data.current.visits,1); assert.equal(data.previous.views,1);
  assert.equal(data.current.match_opens,1); assert.equal(data.current.reading_seconds,60); assert.equal(data.current.completion_rate,100);
  assert.equal(data.articles[0].title,'A final to remember'); assert.equal(data.daily[0].views,1100); assert.equal(data.heatmap[0].hour,0);
  assert.equal(data.matches[0].title,'Engineering FC vs Business United');
  const empty=await fixture.db.rpc('club_analytics_report',{ date_from:'2026-08-01',date_to:'2026-08-03' });
  assert.equal(empty.data.daily.length,3); assert.equal(empty.data.daily[0].views,0); assert.deepEqual(empty.data.articles,[]);
});
test('browser database roles cannot read or write analytics, execute RPCs, or read player notes', async () => {
  for (const role of ['anon','authenticated']) {
    await fixture.pg.exec(`set role ${role}`);
    try {
      for (const query of ['select * from club_page_views',"select record_club_view('{}')","select club_analytics_report('2026-09-01','2026-09-28')", "select club_article_views('{}')",'select notes from players']) await assert.rejects(fixture.pg.exec(query),/permission denied/);
      await fixture.pg.exec('select id,name from players');
    } finally { await fixture.pg.exec('reset role'); }
  }
});
test('match event goals and deletion change scores atomically, with team validation and completed-match protection', async () => {
  const goal=randomUUID(), own=randomUUID();
  await fixture.pg.query('insert into match_events(id,match_id,team_id,event_type) values($1,$2,$3,$4)',[goal,MATCH,HOME,'goal']);
  await fixture.pg.query('insert into match_events(id,match_id,team_id,event_type) values($1,$2,$3,$4)',[own,MATCH,AWAY,'own_goal']);
  assert.equal((await fixture.pg.query('select home_score from matches where id=$1',[MATCH])).rows[0].home_score,2);
  await fixture.pg.query('delete from match_events where id=$1',[goal]);
  assert.equal((await fixture.pg.query('select home_score from matches where id=$1',[MATCH])).rows[0].home_score,1);
  await assert.rejects(fixture.pg.query("insert into match_events(match_id,team_id,event_type) values($1,$2,'goal')",[MATCH,randomUUID()]),/Team is not in this match/);
  await fixture.pg.query("update matches set status='completed' where id=$1",[MATCH]);
  await assert.rejects(fixture.pg.query('delete from match_events where id=$1',[own]),/Reopen the match/);
});
test('Express async rejection is forwarded and public cache is invalidated after mutations', async () => {
  const router=express.Router(); router.get('/',async () => { throw new Error('expected'); }); asyncRouter(router);
  await new Promise((resolve,reject) => router.handle({ method:'GET',url:'/' },{},(error) => { try { assert.equal(error.message,'expected'); resolve(); } catch(e) { reject(e); } }));
  let clock=0, calls=0, finish;
  const cache=publicReadCache({ now:() => clock });
  const get=() => { let result; const res={ statusCode:200,set(){},json(body){ result=body; } }; cache({ method:'GET',path:'/api/stats',query:{} },res,() => { calls++; res.json({ calls }); }); return result; };
  assert.deepEqual(get(),{ calls:1 }); assert.deepEqual(get(),{ calls:1 });
  cache({ method:'POST', path:'/api/tournaments' },{ statusCode:201,on(event,fn){ finish=fn; } },()=>{}); finish(); assert.deepEqual(get(),{ calls:2 });
  clock=11000; assert.deepEqual(get(),{ calls:3 });
});
