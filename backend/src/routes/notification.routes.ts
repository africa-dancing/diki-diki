import { Router, Response } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { supabase } from '../../config/supabase';
import { runNotificationJobs } from '../services/notification.service';

export const notificationRouter = Router();

// GET /v1/notifications — Mes notifications
notificationRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user!.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  const unread = (data || []).filter(n => !n.read).length;
  res.json({ notifications: data || [], unread });
});

// PUT /v1/notifications/:id/read — Marquer comme lu
notificationRouter.put('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user!.userId);
  res.json({ success: true });
});

// PUT /v1/notifications/read-all — Tout marquer comme lu
notificationRouter.put('/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', req.user!.userId)
    .eq('read', false);
  res.json({ success: true });
});

// POST /v1/notifications/run-jobs — Déclencher les jobs manuellement (admin)
notificationRouter.post('/run-jobs', requireAuth, requireAdmin, async (_req, res) => {
  await runNotificationJobs();
  res.json({ success: true, message: 'Jobs exécutés.' });
});

// ── Cron job : lancer toutes les heures ──────────────────
export function startNotificationCron(): void {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 heure
  console.log('🔔 Cron notifications démarré — toutes les heures');

  setInterval(async () => {
    try {
      console.log(`[${new Date().toLocaleTimeString('fr-FR')}] Exécution des jobs de notification...`);
      await runNotificationJobs();
    } catch (err) {
      console.error('Erreur jobs notifications:', err);
    }
  }, INTERVAL_MS);

  // Exécuter immédiatement au démarrage
  // setTimeout(async () => { try { await runNotificationJobs(); } catch (err) { console.error('Init jobs error:', err); } }, 5000);
}
