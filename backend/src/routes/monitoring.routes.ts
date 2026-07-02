/*DKDK_MONITORING*/
import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const monitoringRouter = Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY! || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET /v1/monitoring/stats - voyants admin (stockage, bande passante, revenus...)
monitoringRouter.get('/stats', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase().rpc('get_monitoring_stats');
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default monitoringRouter;

