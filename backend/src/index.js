import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger.js';

if (process.env.NODE_ENV === 'production' &&
    process.env.SUPABASE_SERVICE_ROLE_KEY === 'replace-with-your-service-role-key') {
  console.error('FATAL: SUPABASE_SERVICE_ROLE_KEY is not set. Refusing to start.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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
app.use(express.json({ limit: '10kb' })); // prevent oversized payloads

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

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/match-events', matchEventRoutes);
app.use('/api/awards', awardRoutes);
app.use('/api/stats', statsRoutes);

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
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
});
