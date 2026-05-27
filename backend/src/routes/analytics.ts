// backend/src/routes/analytics.ts
import { Router } from 'express';
import { heartbeat, getActiveVisitors, getSummary } from '../controllers/analytics.controller';

const router = Router();

// POST /v1/analytics/heartbeat  — ping depuis chaque page frontend
router.post('/heartbeat', heartbeat);

// GET  /v1/analytics/active     — visiteurs actifs en ce moment (admin)
router.get('/active', getActiveVisitors);

// GET  /v1/analytics/summary    — résumé du jour (admin)
router.get('/summary', getSummary);

export default router;