import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import sharp from 'sharp';
import { createNewsRouter } from '../src/routes/news.js';
import { createFixture, ADMIN } from './newsFixture.js';
import { articleSchema, excerpt } from '../src/utils/newsValidation.js';
import { championFromFinal } from '../src/utils/champion.js';
import { cachedPublicJson, clearPublicCache } from '../../frontend/src/lib/publicCache.js';

let fixture, server, base, cover;
const draft = () => ({ title: 'Club report', author: '', article_date: '2026-09-21', cover_path: null, cover_alt: '', body: '', status: 'draft' });
async function request(path = '', { token, body, ...init } = {}) {
  const response = await fetch(base + path, { ...init,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, headers: response.headers, data: await response.json() };
}
before(async () => {
  fixture = await createFixture();
  const app = express();
  app.use('/api/news', createNewsRouter({ ...fixture, log: { error() {} } }));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/news`;
  cover = `${ADMIN}/20000000-0000-4000-8000-000000000002.webp`;
  fixture.files.set(cover, { buffer: Buffer.alloc(0) });
});
after(async () => { await new Promise((resolve) => server.close(resolve)); await fixture.pg.close(); });

test('all draft/editor/upload endpoints reject visitors and ordinary users', async () => {
  for (const [path, method] of [['/admin','GET'],['/admin','POST'],['/admin/media','POST'],['/admin/preview','POST'],[`/admin/${ADMIN}`,'GET'],[`/admin/${ADMIN}`,'PUT']]) {
    assert.equal((await request(path, { method })).status, 401);
    assert.equal((await request(path, { method, token: 'test-user' })).status, 403);
  }
});
test('draft → publish → edit → unpublish remains private, with optimistic locking', async () => {
  const created = await request('/admin', { token: 'test-admin', method: 'POST', body: draft() });
  assert.equal(created.status, 201);
  let article = created.data.article;
  const id = article.id;
  assert.equal((await request(`/${id}`)).status, 404);
  assert.equal((await request('?status=draft')).data.articles.length, 0);
  const ready = { ...draft(), author: 'Club editor', cover_path: cover, cover_alt: '', body: 'A **great** final.', status: 'published' };
  const published = await request(`/admin/${id}`, { token: 'test-admin', method: 'PUT', body: { ...ready, expected_updated_at: article.updated_at } });
  assert.equal(published.status, 200); assert.ok(published.data.article.published_at);
  assert.equal(published.data.article.cover_alt, ready.title);
  const listing = await request('?limit=3');
  assert.equal(listing.data.articles.length, 1); assert.equal(listing.data.articles[0].body, undefined);
  assert.equal(listing.headers.get('cache-control'), 'private, no-store');
  assert.equal((await request(`/${id}`)).data.article.body, ready.body);
  const stale = await request(`/admin/${id}`, { token: 'test-admin', method: 'PUT', body: { ...ready, expected_updated_at: article.updated_at } });
  assert.equal(stale.status, 409);
  article = published.data.article;
  const unpublished = await request(`/admin/${id}`, { token: 'test-admin', method: 'PUT', body: { ...ready, status: 'draft', expected_updated_at: article.updated_at } });
  assert.equal(unpublished.status, 200); assert.equal(unpublished.data.article.published_at, null);
  assert.equal((await request(`/${id}`)).status, 404);
  assert.equal((await request()).data.articles.length, 0);
  assert.equal((await request(`/admin/${id}`, { token: 'test-admin' })).status, 200);
});
test('publication rejects missing fields, invalid dates and missing storage images', async () => {
  assert.equal(articleSchema.safeParse({ ...draft(), organiser: 'invented-admin' }).success, false);
  assert.equal(articleSchema.safeParse({ ...draft(), organiser: 'musa', co_organiser: 'halan', article_date: '2022-01-01' }).success, true);
  assert.equal((await request('/admin', { token: 'test-admin', method: 'POST', body: { ...draft(), status: 'published' } })).status, 400);
  assert.equal(articleSchema.safeParse({ ...draft(), article_date: '2026-02-30' }).success, false);
  const missing = `${ADMIN}/30000000-0000-4000-8000-000000000003.webp`;
  assert.equal((await request('/admin', { token: 'test-admin', method: 'POST', body: { ...draft(), cover_path: missing } })).status, 400);
  assert.equal((await request('?limit=999')).status, 400);
  assert.equal(excerpt('## Result\n**Win** ![photo](/news-media/a) [Details](https://example.org)'), 'Result Win Details');
});
test('display names are normalized uniquely without changing account roles', async () => {
  await fixture.pg.query('update users set display_name=$1 where id=$2', ['Halan   Hunar', ADMIN]);
  const rows = (await fixture.pg.query('select display_name,login_name,role from users where id=$1', [ADMIN])).rows;
  assert.equal(rows[0].login_name, 'halan hunar');
  assert.equal(rows[0].role, 'admin');
  await assert.rejects(fixture.pg.query('insert into users(id,role,display_name) values($1,$2,$3)', ['20000000-0000-4000-8000-000000000002','user',' HALAN HUNAR ']), /duplicate key/);
});
test('preview does not create an article or publish a draft', async () => {
  const beforeCount = (await fixture.pg.query('select count(*) from club_news')).rows[0].count;
  const preview = await request('/admin/preview', { token: 'test-admin', method: 'POST', body: { ...draft(), cover_path: cover } });
  assert.equal(preview.status, 200); assert.ok(preview.data.article.cover_url);
  assert.equal((await fixture.pg.query('select count(*) from club_news')).rows[0].count, beforeCount);
});
test('uploads reject disguised markup, re-encode pixels and keep storage private', async () => {
  const invalid = await fetch(`${base}/admin/media`, { method: 'POST', headers: { Authorization: 'Bearer test-admin', 'Content-Type': 'image/png' }, body: '<svg onload="alert(1)"></svg>' });
  assert.equal(invalid.status, 400);
  const png = await sharp({ create: { width: 80, height: 50, channels: 3, background: '#00668a' } }).png().toBuffer();
  const valid = await fetch(`${base}/admin/media`, { method: 'POST', headers: { Authorization: 'Bearer test-admin', 'Content-Type': 'image/png' }, body: png });
  assert.equal(valid.status, 201);
  const result = await valid.json();
  const stored = fixture.files.get(result.path);
  assert.equal((await sharp(stored.buffer).metadata()).format, 'webp');
  assert.equal(stored.options.upsert, false);
});
test('database grants deny direct anon/authenticated access to draft rows', async () => {
  for (const role of ['anon', 'authenticated']) {
    await fixture.pg.exec(`set role ${role}`);
    await assert.rejects(fixture.pg.query('select * from public.club_news'), /permission denied/);
    await assert.rejects(fixture.pg.query("update public.club_news set status='published'"), /permission denied/);
    await fixture.pg.exec('reset role');
  }
  const state = await fixture.pg.query("select relrowsecurity from pg_class where relname='club_news'");
  assert.equal(state.rows[0].relrowsecurity, true);
});
test('champions require a completed final and support individual winners', () => {
  const final = { status: 'completed', round: 'Final', tournament: { id: 't', name: 'Cup', status: 'completed' }, winner_team: { name: 'Milan' } };
  assert.equal(championFromFinal(final).name, 'Milan');
  assert.equal(championFromFinal({ ...final, round: 'Semi Final' }), null);
  assert.equal(championFromFinal({ ...final, winner_team: null }), null);
  assert.equal(championFromFinal({ ...final, winner_team: null, winner_player: { name: 'Player' } }).kind, 'player');
});
test('public cache deduplicates reads and invalidates after changes', async () => {
  clearPublicCache(); let calls = 0;
  const fetcher = async () => ++calls;
  assert.deepEqual(await Promise.all([cachedPublicJson('x', fetcher), cachedPublicJson('x', fetcher)]), [1, 1]);
  clearPublicCache(); assert.equal(await cachedPublicJson('x', fetcher), 2);
  clearPublicCache();
  await assert.rejects(cachedPublicJson('error', async () => { throw new Error('Offline'); }));
  assert.equal(await cachedPublicJson('error', async () => 'recovered'), 'recovered');
});
