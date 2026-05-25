import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../utils/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ─── Validation Schemas ───────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ─── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const { email, password } = parsed.data;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Never expose the real error to the client
    logger.warn(`Failed login attempt for ${email}`);
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check they are actually an admin
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single();

  logger.info(`Login: ${email} [${profile?.role}]`);

  res.json({
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      role: profile?.role,
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
  });
});

export default router;
