// backend/src/routes/gamification.routes.ts
// DKDK_GAMIFICATION — Réglages Gamification (source de vérité). ADMIN only. PHASE 1.
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';
import { getGamificationSettings, updateGamificationSettings, getMyGamification, getPublicGamification, getLeaderboard } from '../services/gamification.service';

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

// Vue fidélité du votant connecté (statut + solde d'Échos + badges). Lecture seule.
gamificationRouter.get('/me', requireAuth, async (req: any, res) => {
  try {
    const data = await getMyGamification(req.user.userId);
    return res.json({ success: true, data });
  } catch {
    return res.status(500).json({ success: false, error: 'GAMIF_ME_FAILED' });
  }
});

// Barème public (lecture seule, non sensible) — alimente la page /les-echos.
gamificationRouter.get('/public', async (_req, res) => {
  try {
    const data = await getPublicGamification();
    return res.json({ success: true, data });
  } catch {
    return res.json({ success: true, data: null }); // la page tombe sur ses valeurs par défaut
  }
});

// Classement AU PSEUDO (public, lecture seule). ?window=semaine|mois|saison|all
gamificationRouter.get('/leaderboard', async (req, res) => {
  try {
    const w = String((req.query.window as string) || 'mois');
    const windowKey = ['semaine', 'mois', 'saison', 'all'].indexOf(w) >= 0 ? w : 'mois';
    const data = await getLeaderboard(windowKey, 50);
    return res.json({ success: true, data });
  } catch {
    return res.json({ success: true, data: { actif: true, rows: [] } });
  }
});

export default gamificationRouter;
