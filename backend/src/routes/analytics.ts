// backend/src/routes/analytics.ts
/*DKDK_ANALYTICS_DB*/
import { Router } from 'express';
import { heartbeat, getActiveVisitors, getSummary } from '../controllers/analytics.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// POST /v1/analytics/heartbeat  <- ping public depuis chaque page
router.post('/heartbeat', heartbeat);

// GET /v1/analytics/active   -> visiteurs actifs (ADMIN uniquement)
router.get('/active', requireAuth, requireAdmin, getActiveVisitors);

// GET /v1/analytics/summary  -> resume du jour (ADMIN uniquement)
router.get('/summary', requireAuth, requireAdmin, getSummary);

export default router;
