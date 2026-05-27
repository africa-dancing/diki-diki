// ============================================================
// Diki-Diki — Toutes les routes backend
// ============================================================
import { Router, Request, Response } from 'express';
import { supabase }  from '../../config/supabase';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { notifications } from '../services/notification.service';
import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────────
export { authRouter } from './auth.routes';

// ─── Contest ─────────────────────────────────────────────────
import contestRoutes from './contest.routes';
export const contestRouter = contestRoutes;

// ─── Vote ────────────────────────────────────────────────────
import { Router as VoteRouter } from 'express';
import * as voteCtrl from '../controllers/vote.controller';

const voteRouter = VoteRouter();
voteRouter.post('/',                requireAuth, voteCtrl.vote);
voteRouter.get('/balance',          requireAuth, voteCtrl.walletBalance);
voteRouter.get('/check/:contestId', requireAuth, voteCtrl.hasVoted);
export { voteRouter };

// ─── Payment ─────────────────────────────────────────────────
import { Router as PaymentRouter } from 'express';
import * as paymentCtrl from '../controllers/payment.controller';

const paymentRouter = PaymentRouter();
paymentRouter.post('/initiate', requireAuth, paymentCtrl.initiate);
paymentRouter.post('/webhook',  paymentCtrl.webhook);
export { paymentRouter };

// ─── Wallet ──────────────────────────────────────────────────
const makeRouter = () => Router();
export const walletRouter = makeRouter();

// ─── Users (Admin) ───────────────────────────────────────────
import { Router as UserRouter } from 'express';
const userRouter = UserRouter();
userRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, wallet, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'USERS_FETCH_FAILED' }); }
});
export { userRouter };

// ─── Users Public — Profil + Vidéos + Earnings + Privacy ─────
import { Router as UsersPublicRouter } from 'express';
import * as usersCtrl from '../controllers/users.controller';

const usersPublicRouter = UsersPublicRouter();

// ⚠️ Routes fixes AVANT les routes dynamiques /:id
usersPublicRouter.get('/earnings', requireAuth, usersCtrl.getEarnings);
usersPublicRouter.get('/privacy',  requireAuth, usersCtrl.getPrivacy);
usersPublicRouter.put('/privacy',  requireAuth, usersCtrl.updatePrivacy);

// Routes dynamiques
usersPublicRouter.get('/:id/profile', usersCtrl.getPublicProfile);
usersPublicRouter.get('/:id/videos',  usersCtrl.getPublicVideos);

export { usersPublicRouter };

// ─── Ticker ───────────────────────────────────────────────────
import { Router as TickerRouter } from 'express';
import * as tickerCtrl from '../controllers/ticker.controller';

const tickerRouter = TickerRouter();
tickerRouter.get('/',       tickerCtrl.getTicker);
tickerRouter.post('/',      requireAuth, tickerCtrl.addTicker);
tickerRouter.delete('/:id', requireAuth, tickerCtrl.removeTicker);
export { tickerRouter };

// ─── Stats (Admin) ───────────────────────────────────────────
import { Router as StatsRouter } from 'express';
const statsRouter = StatsRouter();
statsRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const [users, votes, contests] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('votes').select('id', { count: 'exact' }),
      supabase.from('contests').select('id', { count: 'exact' }).eq('status', 'active'),
    ]);
    res.json({
      users:    users.count    || 0,
      votes:    votes.count    || 0,
      contests: contests.count || 0,
      revenue:  0,
    });
  } catch { res.status(500).json({ error: 'STATS_FETCH_FAILED' }); }
});

// ─── Videos approuvées (public) ──────────────────────────────
import { Router as VideosPublicRouter } from 'express';
const videosPublicRouter = VideosPublicRouter();
videosPublicRouter.get('/approved', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('id, title, discipline, video_url, storage_url, thumbnail_url, status, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'VIDEOS_FETCH_FAILED' }); }
});
export { videosPublicRouter };

// ─── Categories / Disciplines / Subjects ─────────────────────
import { Router as CatRouter } from 'express';
const categoryRouter = CatRouter();

categoryRouter.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('categories').select('*').order('ordre');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'CATEGORIES_FETCH_FAILED' }); }
});

categoryRouter.get('/:id/disciplines', async (req, res) => {
  try {
    const { data, error } = await supabase.from('disciplines').select('*').eq('category_id', req.params.id).order('name');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'DISCIPLINES_FETCH_FAILED' }); }
});

categoryRouter.get('/disciplines/:id/subjects', async (req, res) => {
  try {
    const { data, error } = await supabase.from('subjects').select('*').eq('discipline_id', req.params.id).order('name');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'SUBJECTS_FETCH_FAILED' }); }
});

categoryRouter.post('/disciplines', requireAuth, async (req: any, res) => {
  try {
    const { data, error } = await supabase.from('disciplines').insert(req.body).select();
    if (error) throw error;
    res.json(data[0]);
  } catch { res.status(500).json({ error: 'DISCIPLINE_CREATE_FAILED' }); }
});

categoryRouter.delete('/disciplines/:id', requireAuth, async (req, res) => {
  try {
    await supabase.from('disciplines').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'DISCIPLINE_DELETE_FAILED' }); }
});

categoryRouter.post('/disciplines/subjects', requireAuth, async (req: any, res) => {
  try {
    const { data, error } = await supabase.from('subjects').insert(req.body).select();
    if (error) throw error;
    res.json(data[0]);
  } catch { res.status(500).json({ error: 'SUBJECT_CREATE_FAILED' }); }
});

categoryRouter.delete('/disciplines/subjects/:id', requireAuth, async (req, res) => {
  try {
    await supabase.from('subjects').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'SUBJECT_DELETE_FAILED' }); }
});

export { categoryRouter };
export { statsRouter };