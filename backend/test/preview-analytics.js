// Isolated sample data only. Never imports production credentials or writes Supabase.
import express from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';
import { analyticsFixture, ARTICLE, MATCH, TOURNAMENT } from './analyticsFixture.js';
import { ADMIN } from './newsFixture.js';
import { createAnalyticsRouter } from '../src/routes/analytics.js';
import { createNewsRouter } from '../src/routes/news.js';

const fixture=await analyticsFixture();
await fixture.pg.exec(`insert into club_page_views(event_id,session_id,path,kind,resource_id,source,device,active_seconds,scroll_depth,recorded_at)
  select gen_random_uuid(),md5((g/3)::text)::uuid,
    case g%5 when 0 then '/events/${ARTICLE}' when 1 then '/tournaments/${TOURNAMENT}' when 2 then '/matches/${MATCH}' when 3 then '/events' else '/' end,
    case g%5 when 0 then 'article' when 1 then 'tournament' when 2 then 'match' else 'page' end,
    case g%5 when 0 then '${ARTICLE}'::uuid when 1 then '${TOURNAMENT}'::uuid when 2 then '${MATCH}'::uuid else null end,
    (array['Instagram','Google','Direct / unknown','Facebook','Other websites'])[(g%5)+1],
    case when g%8=0 then 'Tablet' when g%4=0 then 'Desktop' else 'Mobile' end,
    10+g%240,20+g%81,now()-((g%60)||' days')::interval-((g%24)||' hours')::interval
  from generate_series(1,7600) g;`);
const app=express();
app.use(cors({ origin:'http://127.0.0.1:5176' }));
app.use('/api/analytics',createAnalyticsRouter({ ...fixture,origins:['http://127.0.0.1:5176'] }));
app.use('/api/news',createNewsRouter(fixture));
app.use(express.json());
const user={ id:ADMIN,email:'preview@example.test',display_name:'Preview admin',role:'admin' };
app.post('/api/auth/login',(_req,res)=>res.json({ token:'test-admin',refresh_token:'test-only',user }));
app.get('/api/auth/me',fixture.authenticate,(_req,res)=>res.json(user));
app.post('/api/auth/logout',(_req,res)=>res.json({ ok:true }));
app.get('/api/match-events/stats',(_req,res)=>res.json({ total_teams:8,total_matches:15,total_goals:89 }));
app.get('/api/stats/latest-champion',(_req,res)=>res.json({ champion:null }));
app.get('/api/tournaments',(_req,res)=>res.json({ tournaments:[] }));
app.get('/api/teams',(_req,res)=>res.json({ teams:[] }));
app.get('/api/matches',(_req,res)=>res.json({ matches:[] }));
app.use((_req,res)=>res.status(404).json({ error:'Not included in the analytics sample preview.' }));
const api=app.listen(4175,'127.0.0.1');
const root=resolve('../frontend'); process.chdir(root);
const vite=await createServer({ root,define:{ 'import.meta.env.VITE_API_URL':JSON.stringify('http://127.0.0.1:4175') },server:{ host:'127.0.0.1',port:5176,strictPort:true } });
await vite.listen();
console.log('Sample analytics preview: http://127.0.0.1:5176/login');
console.log('Use any test name and 6+ character password, then Profile > Analytics. All counts are fictional.');
async function stop(){await vite.close();api.close();await fixture.pg.close();process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
