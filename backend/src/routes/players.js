import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../utils/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

const playerPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'N/A'];

const updatePlayerSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    jersey_number: z.number().int().min(0).max(999).optional(),
    position: z.enum(playerPositions).optional(),
    photo_url: z.string().url().optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

// ─── PATCH /api/players/:id ───────────────────────────────────
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const parsed = updatePlayerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const { data, error } = await supabaseAdmin
    .from('players')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) {
    logger.error(`Update player failed: ${error?.message ?? 'not found'}`);
    return res.status(404).json({ error: 'Player not found' });
  }

  logger.info(`Player updated: ${data.id} by ${req.user.email}`);
  res.json({ player: data });
});

// ─── DELETE /api/players/:id ──────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('players')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    logger.error(`Delete player failed: ${error.message}`);
    return res.status(500).json({ error: 'Failed to delete player' });
  }

  logger.info(`Player deleted: ${req.params.id} by ${req.user.email}`);
  res.json({ success: true });
});

export default router;
