import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const settingsRouter = Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /v1/settings - lire tous les reglages
settingsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('settings')
      .select('key, value, description')
      .order('key', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /v1/settings - modifier un reglage (admin uniquement)
settingsRouter.patch('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined || value === null)
      return res.status(400).json({ success: false, error: 'Champs manquants (key, value).' });
    const { data, error } = await getSupabase()
      .from('settings')
      .update({ value: String(value), updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default settingsRouter;