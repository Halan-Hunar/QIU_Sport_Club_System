import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createFixture, ADMIN } from './newsFixture.js';
import { createNewsRouter } from '../src/routes/news.js';
import { ordinal } from '../../frontend/src/lib/ordinal.js';
import { articleSchema, headSchema } from '../src/utils/newsValidation.js';

let fixture, server, base;
const profile = { title: 'Test Club Head', major: 'Software Engineering', accent_color: '#234567', is_current: true, head_number: 3, cover_path: null, cover_alt: '', body: 'A **club biography**.', status: 'published' };
async function request(path, method = 'GET', body, token) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, data: await response.json() };
}
before(async () => {
  fixture = await createFixture();
  const app = express();
  app.use('/heads', createNewsRouter({ ...fixture, heads: true, log: { error() {} } }));
  app.use('/news', createNewsRouter({ ...fixture, log: { error() {} } }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((r) => server.close(r)); await fixture.pg.close(); });

test('head administration rejects visitors and non-admins on every endpoint', async () => {
  for (const [path, method] of [['/admin','GET'], ['/admin','POST'], ['/admin/media','POST'], ['/admin/preview','POST'], [`/admin/${ADMIN}`,'GET'], [`/admin/${ADMIN}`,'PUT']]) {
    assert.equal((await request('/heads' + path, method)).status, 401);
    assert.equal((await request('/heads' + path, method, undefined, 'test-user')).status, 403);
  }
});
test('profiles publish without portraits, protect drafts, enforce one current head and reject stale edits', async () => {
  const draft = await request('/heads/admin', 'POST', { ...profile, status: 'draft' }, 'test-admin');
  assert.equal(draft.status, 201);
  assert.equal((await request(`/heads/${draft.data.article.id}`)).status, 404);
  assert.equal((await request('/heads')).data.total, 0);
  const published = await request(`/heads/admin/${draft.data.article.id}`, 'PUT', { ...profile, expected_updated_at: draft.data.article.updated_at }, 'test-admin');
  assert.equal(published.status, 200);
  assert.equal(published.data.article.cover_url, null);
  assert.equal(published.data.article.head_number, 3);
  assert.equal((await request('/heads')).data.articles[0].head_number, 3);
  assert.equal((await request('/heads')).data.total, 1);
  assert.equal((await request('/heads/admin', 'POST', profile, 'test-admin')).status, 409);
  assert.equal((await request(`/heads/admin/${draft.data.article.id}`, 'PUT', { ...profile, expected_updated_at: draft.data.article.updated_at }, 'test-admin')).status, 409);
  assert.equal((await request(`/heads/admin/${draft.data.article.id}`, 'PUT', { ...profile, status: 'draft', expected_updated_at: published.data.article.updated_at }, 'test-admin')).status, 200);
  assert.equal((await request(`/heads/${draft.data.article.id}`)).status, 404);
  for (const role of ['anon', 'authenticated']) {
    await fixture.pg.exec(`set role ${role}`);
    await assert.rejects(fixture.pg.query('select * from club_heads'), /permission denied/);
    await assert.rejects(fixture.pg.query("update club_heads set status='published'"), /permission denied/);
    await fixture.pg.exec('reset role');
  }
});
test('profile fields and calendar dates reject malformed input', () => {
  assert.equal(headSchema.safeParse({ ...profile, accent_color: 'red; display:none' }).success, false);
  assert.equal(headSchema.safeParse({ ...profile, major: '' }).success, false);
  assert.equal(headSchema.safeParse({ ...profile, body: '' }).success, false);
  const draft = { title: 'Test', author: '', article_date: '2026-09-01', cover_path: null, cover_alt: '', body: '', status: 'draft' };
  assert.equal(articleSchema.safeParse({ ...draft, event_date: '2026-02-30' }).success, false);
  assert.equal(articleSchema.safeParse({ ...draft, event_date: '2026-02-28' }).success, true);
});
test('event sorting applies before pagination and places unknown dates last', async () => {
  for (const [title, eventDate, articleDate] of [['First event', '2026-09-22', '2026-01-01'], ['First article', '2026-01-01', '2026-09-22'], ['Unknown event', null, '2026-09-23']]) {
    await fixture.pg.query("insert into club_news(title,author,event_date,article_date,cover_path,cover_alt,body,status) values($1,'Editor',$2,$3,'test','cover','report','published')", [title,eventDate,articleDate]);
  }
  assert.equal((await request('/news?limit=1')).data.articles[0].title, 'First event');
  assert.equal((await request('/news?limit=1&page=3')).data.articles[0].title, 'Unknown event');
  assert.equal((await request('/news?sort=article_date&limit=1')).data.articles[0].title, 'Unknown event');
  assert.equal((await request('/news?direction=asc&limit=1')).data.articles[0].title, 'First article');
  assert.equal((await request('/news?direction=asc&limit=1&page=3')).data.articles[0].title, 'Unknown event');
  assert.equal((await request('/news?sort=article_date&direction=asc&limit=1')).data.articles[0].title, 'First event');
  assert.equal((await request('/news?direction=invalid')).status, 400);
  assert.equal((await request('/news?sort=invalid')).status, 400);
});

test('head numbers validate and format ordinal exceptions correctly', () => {
  for (const invalid of [0, -1, 1.5, 1000, '3']) assert.equal(headSchema.safeParse({ ...profile, head_number: invalid }).success, false);
  assert.equal(headSchema.safeParse({ ...profile, head_number: null }).success, true);
  for (const [number, label] of [[1,'1st'],[2,'2nd'],[3,'3rd'],[11,'11th'],[12,'12th'],[13,'13th'],[21,'21st'],[111,'111th']]) assert.equal(ordinal(number), label);
});

test('head sorting and role filters apply before pagination and never expose drafts', async () => {
  for (const [title, number, current] of [['First',1,false],['Second',2,false],['Current',3,true],['Unnumbered',null,false]]) {
    const result = await request('/heads/admin', 'POST', { ...profile, title, head_number: number, is_current: current }, 'test-admin');
    assert.equal(result.status, 201);
  }
  assert.equal((await request('/heads?limit=1')).data.articles[0].title, 'Current');
  assert.equal((await request('/heads?direction=asc&limit=1')).data.articles[0].title, 'First');
  assert.equal((await request('/heads?direction=asc&limit=1&page=4')).data.articles[0].title, 'Unnumbered');
  const former = await request('/heads?role=former&direction=asc&limit=1&page=2');
  assert.equal(former.data.total, 3);
  assert.equal(former.data.articles[0].title, 'Second');
  const current = await request('/heads?role=current');
  assert.equal(current.data.total, 1);
  assert.equal(current.data.articles[0].title, 'Current');
  assert.equal((await request('/heads?role=invalid')).status, 400);
  const admin = await request('/heads/admin?role=former&direction=asc&limit=1', 'GET', undefined, 'test-admin');
  assert.equal(admin.data.total, 3);
  assert.equal(admin.data.articles[0].title, 'First');
});
