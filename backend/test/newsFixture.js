import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

export const ADMIN = '10000000-0000-4000-8000-000000000001';
export async function createFixture() {
  const pg = new PGlite();
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.users(id uuid primary key, role text);
    insert into public.users values ('${ADMIN}', 'admin');`);
  await pg.exec(await readFile(new URL('../../supabase/migrations/20260921181657_club_news.sql', import.meta.url), 'utf8'));
  await pg.exec(await readFile(new URL('../../supabase/migrations/20260922113555_event_organisers_and_display_names.sql', import.meta.url), 'utf8'));
  const files = new Map();
  const ident = (key) => { if (!/^[a-z_]+$/.test(key)) throw new Error('Unexpected test identifier'); return `"${key}"`; };
  const storage = { from: () => ({
    upload: async (path, buffer, options) => { files.set(path, { buffer, options }); return { error: null }; },
    createSignedUrls: async (paths) => ({ data: paths.map((path) => files.has(path)
      ? { path, signedUrl: `http://localhost:4173/test-media/${path}` } : { path, error: 'missing' }), error: null }),
  }) };
  const db = { storage, from(table) {
    if (table !== 'club_news') throw new Error('Tests only access club_news');
    const filters = [], orders = [];
    let operation = 'select', input, low = 0, high = 100, single = false, columns = '*';
    const query = {
      select(value) { columns = value; return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      order(key, options = {}) { orders.push(`${ident(key)} ${options.ascending === false ? 'desc' : 'asc'}`); return query; },
      range(a, b) { low = a; high = b; return query; },
      insert(value) { operation = 'insert'; input = value; return query; },
      update(value) { operation = 'update'; input = value; return query; },
      maybeSingle() { single = true; return query; },
      async then(resolve, reject) {
        try {
          const values = [];
          const param = (value) => { values.push(value); return `$${values.length}`; };
          const where = () => filters.length ? ` where ${filters.map(([key, value]) => `${ident(key)} = ${param(value)}`).join(' and ')}` : '';
          let sql;
          if (operation === 'insert') {
            sql = `insert into club_news (${Object.keys(input).map(ident).join(',')}) values (${Object.values(input).map(param).join(',')}) returning to_jsonb(club_news) as row`;
          } else if (operation === 'update') {
            sql = `update club_news set ${Object.entries(input).map(([key, value]) => `${ident(key)}=${param(value)}`).join(',')}${where()} returning to_jsonb(club_news) as row`;
          } else {
            sql = `select to_jsonb(t) as row from club_news t${where()}${orders.length ? ` order by ${orders.join(',')}` : ''}`;
          }
          let rows = (await pg.query(sql, values)).rows.map((row) => row.row);
          const count = rows.length;
          if (operation === 'select') rows = rows.slice(low, high + 1);
          if (columns !== '*') rows = rows.map((row) => Object.fromEntries(columns.split(',').map((key) => [key, row[key]])));
          resolve({ data: single ? rows[0] ?? null : rows, count, error: null });
        } catch (error) { resolve({ data: null, error }); }
      },
    };
    return query;
  } };
  const authenticate = (req, res, next) => {
    const token = req.get('Authorization');
    if (!['Bearer test-admin', 'Bearer test-user'].includes(token)) return res.status(401).json({ error: 'Sign in first.' });
    req.user = { id: ADMIN, role: token === 'Bearer test-admin' ? 'admin' : 'user' }; next();
  };
  const authorize = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access required.' });
  return { pg, db, files, authenticate, authorize };
}
