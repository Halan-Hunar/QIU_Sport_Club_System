import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { createDisplayLogin } from '../utils/displayLogin.js';
import { supabase, supabaseAdmin } from '../utils/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// A request-scoped auth client prevents one admin session becoming shared state.
const createAuth = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}).auth;
router.post('/login', createDisplayLogin({ db: supabaseAdmin, createAuth, log: logger }));

// ─── POST /api/auth/refresh ───────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body ?? {};
  if (typeof refresh_token !== 'string' || refresh_token.trim().length === 0) {
    return res.status(400).json({ error: 'refresh_token required' });
  }

  const { data, error } = await createAuth().refreshSession({ refresh_token });

  if (error || !data.session) {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role,display_name')
    .eq('id', data.user.id)
    .single();

  res.json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: profile?.role,
      display_name: profile?.display_name,
    },
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];

  // Sign out using the user's token
  const { error } = await supabase.auth.admin?.signOut(token)
    ?? await supabase.auth.signOut();

  if (error) {
    logger.warn(`Logout error: ${error.message}`);
  }

  logger.info(`Logout: ${req.user.email}`);
  res.json({ message: 'Logged out successfully' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    display_name: req.user.display_name,
  });
});

export default router;
