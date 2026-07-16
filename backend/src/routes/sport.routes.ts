/*DKDK_SPORT_ROUTES*/
import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

const sportRouter = Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /v1/sport/epreuves - epreuves ACTIVES (public, pour la page /submit)
sportRouter.get('/epreuves', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('sport_epreuves')
      .select('*')
      .eq('actif', true)
      .order('ordre', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /v1/sport/admin/epreuves - TOUTES les epreuves (admin, meme inactives)
sportRouter.get('/admin/epreuves', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('sport_epreuves')
      .select('*')
      .order('ordre', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /v1/sport/admin/epreuves/:id - modifier une epreuve (admin)
// Champs modifiables : sport, sport_slug, epreuve, niveau, libelle, regle, emoji, ordre, actif
sportRouter.put('/admin/epreuves/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    // On ne met a jour que les champs fournis (patch partiel)
    const patch: any = {};
    if (b.sport      !== undefined) patch.sport      = b.sport;
    if (b.sport_slug !== undefined) patch.sport_slug = b.sport_slug;
    if (b.epreuve    !== undefined) patch.epreuve    = b.epreuve;
    if (b.niveau     !== undefined) patch.niveau     = b.niveau;
    if (b.libelle    !== undefined) patch.libelle    = b.libelle;
    if (b.regle      !== undefined) patch.regle      = b.regle;
    if (b.emoji      !== undefined) patch.emoji      = b.emoji;
    if (b.ordre      !== undefined) patch.ordre      = b.ordre;
    if (b.actif      !== undefined) patch.actif      = b.actif;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ a modifier.' });
    }
    const { data, error } = await getSupabase()
      .from('sport_epreuves')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /v1/sport/admin/epreuves/:id - supprimer une epreuve (admin)
sportRouter.delete('/admin/epreuves/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await getSupabase()
      .from('sport_epreuves')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default sportRouter;
