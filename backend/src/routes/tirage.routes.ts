// backend/src/routes/tirage.routes.ts
// DKDK_TIRAGE — Fidélité « Les Échos » PHASE 5 : tirages (cadeaux). ADMIN only.
// Cadeaux MATERIELS, JAMAIS du cash. Tirage provably-fair (commit/reveal).
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import {
  getFondsPots, listGiftCatalog, upsertGiftCatalog, deleteGiftCatalog,
  prepareTirage, executeTirage, runDrawAllStatuts, listTirages, getTirageDetail, setRemiseStatus,
  isVitrineActive, setVitrineActive, isVitrineMontants, setVitrineMontants,
} from '../services/gamification.service';

const tirageRouter = Router();
tirageRouter.use(requireAuth, requireAdmin);

// Tableau de bord : pots Fonds Cadeaux + catalogue + liste des tirages.
tirageRouter.get('/dashboard', async (_req, res) => {
  try {
    const [pots, catalogue, tirages, vitrineActive, vitrineMontants] = await Promise.all([getFondsPots(), listGiftCatalog(), listTirages(), isVitrineActive(), isVitrineMontants()]);
    return res.json({ success: true, data: { pots, catalogue, tirages, vitrineActive, vitrineMontants } });
  } catch { return res.status(500).json({ success: false, error: 'TIRAGE_DASHBOARD_FAILED' }); }
});

// Catalogue des cadeaux (create/update)
tirageRouter.post('/catalog', async (req, res) => {
  try { const data = await upsertGiftCatalog(req.body || {}); return res.json({ success: true, data }); }
  catch { return res.status(500).json({ success: false, error: 'CATALOG_WRITE_FAILED' }); }
});
tirageRouter.delete('/catalog/:id', async (req, res) => {
  try { await deleteGiftCatalog(req.params.id); return res.json({ success: true }); }
  catch { return res.status(500).json({ success: false, error: 'CATALOG_DELETE_FAILED' }); }
});

// Preparer un tirage (commit : publie graine_hash + fige le pool). Ne tire RIEN encore.
tirageRouter.post('/prepare', async (req: any, res) => {
  try { const data = await prepareTirage({ ...(req.body || {}), adminId: req.user?.userId }); return res.json({ success: true, data }); }
  catch (e: any) { return res.status(400).json({ success: false, error: e?.message || 'PREPARE_FAILED' }); }
});

// Tirage SIMULTANE sur tous les statuts, en une seule action (une seule graine).
// Chaque statut recoit les cadeaux locaux qui lui sont rattaches. Provably-fair.
tirageRouter.post('/run-all-statuts', async (req: any, res) => {
  try { const data = await runDrawAllStatuts({ saison: String(req.body?.saison || ''), adminId: req.user?.userId, note: req.body?.note, mode: req.body?.mode, lettre: req.body?.lettre }); return res.json({ success: true, data }); }
  catch (e: any) { return res.status(400).json({ success: false, error: e?.message || 'DRAW_ALL_FAILED' }); }
});

// Executer un tirage (reveal : revele la graine + designe les gagnants de façon verifiable).
tirageRouter.post('/:id/execute', async (req, res) => {
  try { const data = await executeTirage(req.params.id, Array.isArray(req.body?.catalogIds) ? req.body.catalogIds : []); return res.json({ success: true, data }); }
  catch (e: any) { return res.status(400).json({ success: false, error: e?.message || 'EXECUTE_FAILED' }); }
});

// Detail d'un tirage (+ gagnants)
tirageRouter.get('/:id', async (req, res) => {
  try { const data = await getTirageDetail(req.params.id); return res.json({ success: true, data }); }
  catch { return res.status(500).json({ success: false, error: 'TIRAGE_DETAIL_FAILED' }); }
});

// Statut de remise d'un cadeau (a_remettre | remis | annule) — JAMAIS du cash.
tirageRouter.post('/gagnant/:id/remise', async (req, res) => {
  try { await setRemiseStatus(req.params.id, String(req.body?.statut || '')); return res.json({ success: true }); }
  catch { return res.status(500).json({ success: false, error: 'REMISE_FAILED' }); }
});

// Interrupteur de la vitrine publique des cadeaux (ON/OFF). Cache par defaut (verrou juridique).
tirageRouter.post('/vitrine', async (req, res) => {
  try { const active = await setVitrineActive(req.body?.active === true || req.body?.active === '1'); return res.json({ success: true, data: { vitrineActive: active } }); }
  catch { return res.status(500).json({ success: false, error: 'VITRINE_TOGGLE_FAILED' }); }
});
tirageRouter.post('/vitrine-montants', async (req, res) => {
  try { const on = await setVitrineMontants(req.body?.active === true || req.body?.active === '1'); return res.json({ success: true, data: { vitrineMontants: on } }); }
  catch { return res.status(500).json({ success: false, error: 'VITRINE_MONTANTS_FAILED' }); }
});

export default tirageRouter;
