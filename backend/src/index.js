import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { publicReadCache } from './middleware/publicReadCache.js';
import { asyncRouter } from './middleware/asyncRouter.js';
import { createAnalyticsRouter } from './routes/analytics.js';
import { logger } from './utils/logger.js';

if (process.env.NODE_ENV === 'production' &&
    process.env.SUPABASE_SERVICE_ROLE_KEY === 'replace-with-your-service-role-key') {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to start.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.disable('x-powered-by');
// Render has one trusted reverse-proxy hop. Never trust arbitrary forwarded chains.
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);
app.use(helmet());
const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((v) => v.trim()).filter(Boolean);
if (origins.includes('*')) throw new Error('CORS_ORIGIN must contain exact frontend origins.');

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || origins.includes(origin)),
  credentials: true,
}));

// Global rate limiter — 1000/15min is plenty for a small two-admin deployment.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
});
app.use(globalLimiter);

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// ─── Body Parsing ──────────────────────────────────────────────────────────────
const standardJson = express.json({ limit: '10kb' });
// News applies its own bounded parsers after admin authorization (including images).
app.use((req, res, next) => (req.path.startsWith('/api/news') || req.path.startsWith('/api/heads') || req.path === '/api/analytics/collect') ? next() : standardJson(req, res, next));

// ─── Request Logging ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.js';
import teamRoutes from './routes/teams.js';
import playerRoutes from './routes/players.js';
import tournamentRoutes from './routes/tournaments.js';
import matchRoutes from './routes/matches.js';
import matchEventRoutes from './routes/matchEvents.js';
import awardRoutes from './routes/awards.js';
import statsRoutes from './routes/stats.js';
import { createNewsRouter } from './routes/news.js';
import { supabaseAdmin } from './utils/supabase.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';

app.use(publicReadCache());
app.use('/api/auth', authLimiter, asyncRouter(authRoutes));
app.use('/api/teams', asyncRouter(teamRoutes));
app.use('/api/players', asyncRouter(playerRoutes));
app.use('/api/tournaments', asyncRouter(tournamentRoutes));
app.use('/api/matches', asyncRouter(matchRoutes));
app.use('/api/match-events', asyncRouter(matchEventRoutes));
app.use('/api/awards', asyncRouter(awardRoutes));
app.use('/api/stats', asyncRouter(statsRoutes));
app.use('/api/analytics', asyncRouter(createAnalyticsRouter({ db: supabaseAdmin, authenticate: requireAuth, authorize: requireAdmin, origins, log: logger })));
app.use('/api/heads', asyncRouter(createNewsRouter({ db: supabaseAdmin, authenticate: requireAuth, authorize: requireAdmin, log: logger, heads: true })));
app.use('/api/news', asyncRouter(createNewsRouter({ db: supabaseAdmin, authenticate: requireAuth, authorize: requireAdmin, log: logger })));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  logger.error(err.stack);
  // Never expose stack traces to the client
  res.status(err.status || 500).json({
    error: err.status === 413 ? 'Request too large' : err.status === 400 ? 'Invalid request' : 'Internal server error',
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// Bounded retention. Also runs on startup after free-tier sleep/restarts.
async function cleanupAnalytics() {
  try {
    const { error } = await supabaseAdmin.from('club_page_views').delete().lt('recorded_at', new Date(Date.now() - 180 * 86400000).toISOString());
    if (error) logger.warn(`Analytics retention cleanup unavailable: ${error.code}`);
  } catch { logger.warn('Analytics retention cleanup unavailable'); }
}
cleanupAnalytics();
setInterval(cleanupAnalytics, 86400000).unref();
