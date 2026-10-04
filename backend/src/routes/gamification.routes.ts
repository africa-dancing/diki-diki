// backend/src/routes/gamification.routes.ts
// DKDK_GAMIFICATION — Réglages Gamification (source de vérité). ADMIN only. PHASE 1.
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { getGamificationSettings, updateGamificationSettings } from '../services/gamification.service';

const gamificationRouter = Router();

gamificationRouter.get('/settings', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const data = await getGamificationSettings();
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'GAMIF_READ_FAILED' });
  }
});

gamificationRouter.put('/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = await updateGamificationSettings(req.body || {});
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'GAMIF_WRITE_FAILED' });
  }
});

export default gamificationRouter;
