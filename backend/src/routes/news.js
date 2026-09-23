import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { articleSchema, headSchema, mediaPaths, excerpt } from '../utils/newsValidation.js';

const BUCKET = 'club-news';
const SUMMARY = 'id,title,author,organiser,co_organiser,article_date,event_date,cover_path,cover_alt,excerpt,status,published_at,updated_at';
const uuid = z.string().uuid();
const paging = z.object({
  role: z.enum(['all', 'current', 'former']).default('all'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  sort: z.enum(['event_date', 'article_date']).default('event_date'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

// Dependencies are explicit so authorization and publication filtering can be
// tested without touching the real Supabase project.
export function createNewsRouter({ db, authenticate, authorize, log = console, heads = false }) {
  const table = heads ? 'club_heads' : 'club_news';
  const schema = heads ? headSchema : articleSchema;
  const summary = heads ? 'id,title,major,accent_color,is_current,head_number,cover_path,cover_alt,excerpt,status,published_at,updated_at' : SUMMARY;
  function headListing(query, options) {
    if (options.role !== 'all') query = query.eq('is_current', options.role === 'current');
    return query.order('head_number', { ascending: options.direction === 'asc', nullsFirst: false });
  }
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });
  const run = (handler) => async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
      log.error(`Club Events: ${error.message}`);
      res.status(500).json({ error: 'Could not load or save Club Events. Please try again.' });
    }
  };
  async function decorate(rows) {
    const paths = [...new Set(rows.flatMap(mediaPaths))];
    let signed = [];
    if (paths.length) {
      const result = await db.storage.from(BUCKET).createSignedUrls(paths, 300);
      if (result.error) throw result.error;
      signed = result.data ?? [];
    }
    const urls = Object.fromEntries(signed.filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]));
    return rows.map((row) => ({ ...row,
      cover_url: urls[row.cover_path] ?? null,
      media: Object.fromEntries(mediaPaths(row).map((path) => [path, urls[path] ?? null])),
    }));
  }

  // Every admin route, including read/preview/upload, checks the club users role.
  router.use('/admin', authenticate, authorize);
  router.post('/admin/media', rateLimit({ windowMs: 15 * 60 * 1000, max: 40,
    message: { error: 'Too many uploads. Please try again later.' } }),
  express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '6mb' }), run(async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ error: 'Choose a JPEG, PNG, or WebP image under 6 MB.' });
    }
    let buffer;
    try {
      const image = sharp(req.body, { limitInputPixels: 25000000, animated: false });
      const meta = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(meta.format) || (meta.pages ?? 1) > 1) throw new Error('Unsupported image');
      buffer = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 }).toBuffer();
    } catch {
      return res.status(400).json({ error: 'That image could not be read. Use a still JPEG, PNG, or WebP under 25 megapixels.' });
    }
    const path = `${req.user.id}/${randomUUID()}.webp`;
    const { error } = await db.storage.from(BUCKET).upload(path, buffer, { contentType: 'image/webp', upsert: false, cacheControl: '300' });
    if (error) {
      log.error(`Event image upload failed: ${error.message}`);
      const missingBucket = /bucket.*not found/i.test(error.message || '');
      return res.status(503).json({ error: missingBucket
        ? 'Event image storage is not configured. Ask the site administrator to run the storage setup.'
        : 'Image upload failed. Please try again shortly.' });
    }
    const [media] = await decorate([{ cover_path: path }]);
    res.status(201).json({ path, url: media.cover_url });
  }));

  router.get('/admin', run(async (req, res) => {
    const parsed = paging.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid page.' });
    const { page, limit } = parsed.data;
    let query = db.from(table).select(summary, { count: 'exact' });
    if (heads) query = headListing(query, parsed.data);
    const { data, count, error } = await query.order('updated_at', { ascending: false }).order('id').range((page - 1) * limit, page * limit - 1);
    if (error) throw error;
    res.json({ articles: await decorate(data), total: count });
  }));
  router.get('/admin/:id', run(async (req, res) => {
    if (!uuid.safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid article.' });
    const { data, error } = await db.from(table).select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Article not found.' });
    res.json({ article: (await decorate([data]))[0] });
  }));

  router.use('/admin', express.json({ limit: '120kb' }));
  router.post('/admin/preview', run(async (req, res) => {
    const parsed = schema.safeParse({ ...req.body, status: 'draft' });
    if (!parsed.success || mediaPaths(parsed.data).length > 30) {
      return res.status(400).json({ error: 'Check the article fields and use at most 30 images.' });
    }
    res.json({ article: (await decorate([parsed.data]))[0] });
  }));
  async function save(req, res, update) {
    const { expected_updated_at, ...input } = req.body ?? {};
    const parsed = schema.safeParse(input);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    if (update && (!uuid.safeParse(req.params.id).success ||
      !z.string().datetime({ offset: true }).safeParse(expected_updated_at).success)) {
      return res.status(400).json({ error: 'Reload the article before saving.' });
    }
    if (mediaPaths(parsed.data).length > 30) return res.status(400).json({ error: 'Use at most 30 images per article.' });
    // All image references must exist in our private bucket. Signing validates
    // existence; no external URLs or raw HTML are rendered as article images.
    const preview = (await decorate([parsed.data]))[0];
    if (mediaPaths(parsed.data).some((path) => !preview.media[path])) {
      return res.status(400).json({ error: 'An image is missing. Please upload it again.' });
    }
    // Description entry is optional; the title provides a fallback for the
    // existing database publication constraint and screen readers.
    const row = { ...parsed.data, cover_alt: parsed.data.cover_alt || parsed.data.title,
      excerpt: excerpt(parsed.data.body), updated_by: req.user.id };
    let query;
    if (update) {
      query = db.from(table).update(row).eq('id', req.params.id).eq('updated_at', expected_updated_at);
    } else {
      query = db.from(table).insert({ ...row, created_by: req.user.id });
    }
    const { data, error } = await query.select('*').maybeSingle();
    if (error?.code === '23505' && heads) return res.status(409).json({ error: 'A current head is already published. Mark that profile as former before publishing another current head.' });
    if (error) throw error;
    if (!data) return res.status(409).json({ error: 'This article changed in another session. Reload it before saving.' });
    res.status(update ? 200 : 201).json({ article: (await decorate([data]))[0] });
  }
  router.post('/admin', run((req, res) => save(req, res, false)));
  router.put('/admin/:id', run((req, res) => save(req, res, true)));

  router.get('/', run(async (req, res) => {
    const parsed = paging.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid page.' });
    const { page, limit } = parsed.data;
    let query = db.from(table).select(summary, { count: 'exact' }).eq('status', 'published');
    query = heads ? headListing(query, parsed.data) : query.order(parsed.data.sort, { ascending: parsed.data.direction === 'asc', nullsFirst: false });
    const { data, count, error } = await query.order('published_at', { ascending: false }).order('id').range((page - 1) * limit, page * limit - 1);
    if (error) throw error;
    res.json({ articles: await decorate(data), total: count });
  }));
  router.get('/:id', run(async (req, res) => {
    if (!uuid.safeParse(req.params.id).success) return res.status(404).json({ error: 'Article not found.' });
    const { data, error } = await db.from(table).select(`${summary},body`)
      .eq('id', req.params.id).eq('status', 'published').maybeSingle();
    if (error) throw error;
    // Drafts and nonexistent IDs deliberately have the same response.
    if (!data) return res.status(404).json({ error: 'Article not found.' });
    res.json({ article: (await decorate([data]))[0] });
  }));
  router.use((err, _req, res, _next) => {
    res.status(err.status === 413 ? 413 : 400).json({ error: err.status === 413 ? 'The upload or article is too large.' : 'Invalid request.' });
  });
  return router;
}
