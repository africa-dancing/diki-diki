// backend/src/routes/vitrine.routes.ts
// DKDK_VITRINE — Catalogue PUBLIC des cadeaux (lecture seule), pilote par l'interrupteur
// `cadeaux_vitrine_active`. Cache par defaut (mode apercu). Aucune promesse : valeurs indicatives.
import { Router } from 'express';
import { getVitrine } from '../services/gamification.service';

const vitrineRouter = Router();

vitrineRouter.get('/', async (_req, res) => {
  try { const data = await getVitrine(); res.set('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120'); return res.json({ success: true, data }); }
  catch { return res.status(500).json({ success: false, error: 'VITRINE_FAILED' }); }
});

export default vitrineRouter;
