import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { eventSchema, pageIdentity, reportRange } from '../utils/analytics.js';

export function createAnalyticsRouter({ db, authenticate, authorize, origins, log = console }) {
  const router = Router();
  router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  router.post('/collect', rateLimit({ windowMs: 60000, max: 90, standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many analytics requests.' } }), express.json({ limit: '2kb' }), async (req, res) => {
    // Origin is an abuse filter, not authentication. Metrics remain estimates.
    if (!origins.includes(req.get('origin'))) return res.sendStatus(403);
    if (/bot|crawler|spider|headless|preview/i.test(req.get('user-agent') || '') || req.get('DNT') === '1' || req.get('Sec-GPC') === '1') return res.sendStatus(204);
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid analytics event.' });
    try {
      const { error } = await db.rpc('record_club_view', { payload: { ...parsed.data, ...pageIdentity(parsed.data.path) } });
      if (error) throw error;
      res.sendStatus(204);
    } catch (error) {
      log.error(`Analytics collection failed: ${error.code || 'unavailable'}`);
      res.status(503).json({ error: 'Analytics is temporarily unavailable.' });
    }
  });
  router.use(authenticate, authorize);
  router.get('/report', async (req, res) => {
    const range = reportRange(req.query);
    if (!range) return res.status(400).json({ error: 'Choose up to 90 days within the last 90 days, ending no later than today.' });
    try {
      const { data, error } = await db.rpc('club_analytics_report', { date_from: range.from, date_to: range.to });
      if (error) throw error;
      res.json({ ...data, range, timezone: 'Asia/Baghdad', generated_at: new Date().toISOString() });
    } catch (error) {
      log.error(`Analytics report failed: ${error.code || 'unavailable'}`);
      res.status(503).json({ error: 'Analytics could not load. Check that the analytics database migration has been applied, then retry.' });
    }
  });
  router.get('/articles', async (req, res) => {
    const ids = typeof req.query.ids === 'string' ? req.query.ids.split(',') : [];
    if (!ids.length || ids.length > 24 || ids.some((id) => !pageIdentity(`/events/${id}`))) return res.status(400).json({ error: 'Invalid articles.' });
    try {
      const { data, error } = await db.rpc('club_article_views', { article_ids: ids });
      if (error) throw error;
      res.json({ views: data, days: 180 });
    } catch { res.status(503).json({ error: 'Article views are unavailable.' }); }
  });
  return router;
}
