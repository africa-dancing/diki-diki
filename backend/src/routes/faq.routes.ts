// backend/src/routes/faq.routes.ts
// DKDK_FAQ — FAQ pilotable depuis l'Admin.
//  * GET  /v1/faq                      (public)  : catégories + questions ACTIVES, triées.
//  * GET  /v1/faq/admin/all            (admin)   : tout (y compris inactifs) pour l'écran Admin.
//  * CRUD catégories : POST/PUT/DELETE /v1/faq/admin/categories[/:id]
//  * CRUD questions   : POST/PUT/DELETE /v1/faq/admin/items[/:id]
//  * Réordonnancement : PUT /v1/faq/admin/reorder/:kind  (kind = categories | items)
// Contenu éditorial uniquement — aucune logique d'argent.
import 'dotenv/config';
import { Router, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.middleware';

const faqRouter = Router();
function sb() { return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!); }

// ── PUBLIC : ce que voient les visiteurs ─────────────────────────────────────
faqRouter.get('/', async (_req, res: Response) => {
  try {
    const db = sb();
    const { data: cats } = await db.from('faq_categories').select('id, libelle, ordre').eq('actif', true).order('ordre');
    const { data: items } = await db.from('faq_items').select('id, categorie_id, type, question, reponse, ordre').eq('actif', true).order('ordre');
    const data = (cats || []).map((c: any) => ({
      id: c.id,
      libelle: c.libelle,
      items: (items || []).filter((i: any) => i.categorie_id === c.id)
        .map((i: any) => ({ id: i.id, type: i.type, question: i.question, reponse: i.reponse })),
    }));
    return res.json({ success: true, data });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
});

// ── ADMIN : tout, y compris les éléments désactivés ──────────────────────────
faqRouter.get('/admin/all', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const db = sb();
    const { data: categories } = await db.from('faq_categories').select('*').order('ordre');
    const { data: items } = await db.from('faq_items').select('*').order('ordre');
    return res.json({ success: true, data: { categories: categories || [], items: items || [] } });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
});

// ── Catégories ───────────────────────────────────────────────────────────────
faqRouter.post('/admin/categories', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { libelle, ordre } = req.body || {};
    if (!libelle || !String(libelle).trim()) return res.status(400).json({ success: false, error: 'LIBELLE_REQUIS' });
    const { data, error } = await sb().from('faq_categories')
      .insert({ libelle: String(libelle).slice(0, 120), ordre: Number.isFinite(ordre) ? ordre : 999 })
      .select().single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
});

faqRouter.put('/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const patch: any = {};
    for (const k of ['libelle', 'ordre', 'actif']) if (k in (req.body || {})) patch[k] = req.body[k];
    const { data, error } = await sb().from('faq_categories').update(patch).eq('id', req.params.id).select().single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
});

faqRouter.delete('/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await sb().from('faq_categories').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
});

// ── Questions (items) ────────────────────────────────────────────────────────
faqRouter.post('/admin/items', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { categorie_id, type, question, reponse, ordre } = req.body || {};
    if (!categorie_id || !question || !String(question).trim()) return res.status(400).json({ success: false, error: 'CHAMPS_REQUIS' });
    const t = type === 'formats' ? 'formats' : 'texte';
    const { data, error } = await sb().from('faq_items')
      .insert({ categorie_id, type: t, question: String(question), reponse: reponse != null ? String(reponse) : '', ordre: Number.isFinite(ordre) ? ordre : 999 })
      .select().single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
});

faqRouter.put('/admin/items/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const patch: any = { updated_at: new Date().toISOString() };
    for (const k of ['categorie_id', 'type', 'question', 'reponse', 'ordre', 'actif']) if (k in (req.body || {})) patch[k] = req.body[k];
    if ('type' in patch && patch.type !== 'formats') patch.type = 'texte';
    const { data, error } = await sb().from('faq_items').update(patch).eq('id', req.params.id).select().single();
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
});

faqRouter.delete('/admin/items/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { error } = await sb().from('faq_items').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
});

// ── Réordonnancement groupé : body { items: [{id, ordre}, ...] } ─────────────
faqRouter.put('/admin/reorder/:kind', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const table = req.params.kind === 'categories' ? 'faq_categories' : 'faq_items';
    const list = Array.isArray(req.body?.items) ? req.body.items : [];
    const db = sb();
    for (const it of list) {
      if (it && it.id != null) await db.from(table).update({ ordre: Number(it.ordre) || 0 }).eq('id', it.id);
    }
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
});

export default faqRouter;
