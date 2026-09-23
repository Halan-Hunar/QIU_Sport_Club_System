// Local fixture preview only. Never imports backend .env or contacts Supabase.
import express from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';
import { createFixture, ADMIN } from './newsFixture.js';
import { createNewsRouter } from '../src/routes/news.js';

const fixture = await createFixture();
const app = express();
app.use(cors({ origin: 'http://127.0.0.1:5174' }));
app.use('/api/heads', createNewsRouter({ ...fixture, heads: true, log: console }));
app.use('/api/news', createNewsRouter({ ...fixture, log: console }));
app.use(express.json());
const user = { id: ADMIN, email: 'editor@example.test', display_name: 'Halan Hunar', role: 'admin' };
app.post('/api/auth/login', (_req, res) => res.json({ token: 'test-admin', refresh_token: 'test-only', user }));
app.get('/api/auth/me', (_req, res) => res.json(user));
app.post('/api/auth/logout', (_req, res) => res.json({ ok: true }));
app.get('/api/match-events/stats', (_req, res) => res.json({ total_teams: 8, total_matches: 15, total_goals: 89 }));
app.get('/api/tournaments', (_req, res) => res.json({ tournaments: [] }));
app.get('/api/teams', (_req, res) => res.json({ teams: [] }));
app.get('/api/matches', (_req, res) => res.json({ matches: [] }));
app.get('/api/stats/latest-champion', (_req, res) => res.json({ champion: { name: 'Milan FC', tournament_name: 'QIU Football Cup', tournament_id: 'test-cup' } }));
app.get('/test-media/:owner/:file', (req, res) => {
  const file = fixture.files.get(`${req.params.owner}/${req.params.file}`);
  if (!file) return res.sendStatus(404);
  res.type('webp').send(file.buffer);
});
const path = `${ADMIN}/20000000-0000-4000-8000-000000000002.webp`;
fixture.files.set(path, { buffer: await readFile(resolve('../frontend/public/club-logo-large.webp')) });
await fixture.db.from('club_news').insert({ title: 'A season to remember', author: 'QIU Sports Club', organiser: 'dyako', co_organiser: 'halan', article_date: '2026-09-21',
  cover_path: path, cover_alt: 'QIU Sports Club emblem', body: '## The final whistle\n\nA **remarkable finish** to the football cup.\n\n> Every match brought the club together.\n\n![Club emblem](/news-media/' + path + ')',
  excerpt: 'A remarkable finish to the football cup.', status: 'published', created_by: ADMIN, updated_by: ADMIN }).select('*');
await fixture.db.from('club_heads').insert({ title: 'Example Club Head', major: 'Software Engineering', accent_color: '#864538', is_current: true, cover_path: null, cover_alt: '', body: '## Leading the club\n\nBringing students together through **sport**.\n\n> A place for every player.', excerpt: 'Bringing students together through sport.', status: 'published', created_by: ADMIN, updated_by: ADMIN }).select('*');
app.listen(4173, '127.0.0.1', () => console.log('Fixture API: http://127.0.0.1:4173 (in-memory data only)'));
const frontendRoot = resolve('../frontend');
process.chdir(frontendRoot); // Tailwind resolves its configuration from cwd.
const vite = await createServer({ root: frontendRoot, define: { 'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4173') },
  server: { host: '127.0.0.1', port: 5174, strictPort: true } });
await vite.listen();
console.log('Preview: http://127.0.0.1:5174 — sign in with any test email/password (6+ characters).');
