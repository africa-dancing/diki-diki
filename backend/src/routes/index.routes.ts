// ============================================================
// Diki-Diki — Toutes les routes backend
// ============================================================
import { Router, Request, Response } from 'express';
import { supabase }  from '../../config/supabase';
import { requireAuth, requireAdmin, AuthRequest, requireVerified } from '../middleware/auth.middleware';
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
paymentRouter.post('/initiate', requireAuth, requireVerified, paymentCtrl.initiate);
paymentRouter.post('/vote', requireAuth, requireVerified, paymentCtrl.initiateVotePayment); /*DKDK_VOTE_PAY_ROUTE*/
paymentRouter.post('/withdraw', requireAuth, requireVerified, paymentCtrl.withdraw); /*DKDK_WITHDRAW_ROUTE*/
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
usersPublicRouter.get('/balance',  requireAuth, usersCtrl.getBalance); /*DKDK_BALANCE_ROUTE*/
usersPublicRouter.get('/privacy',  requireAuth, usersCtrl.getPrivacy);
usersPublicRouter.put('/privacy',  requireAuth, usersCtrl.updatePrivacy);
usersPublicRouter.put('/email',    requireAuth, usersCtrl.updateEmail);    /*DKDK_ACCOUNT_ROUTES*/
usersPublicRouter.put('/password', requireAuth, usersCtrl.updatePassword);
usersPublicRouter.put('/security', requireAuth, usersCtrl.updateSecurity);

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
tickerRouter.put('/:id',    requireAuth, tickerCtrl.updateTicker);
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

categoryRouter.post('/disciplines', requireAuth, requireAdmin, /*DKDK_CATEG_ADMIN*/ async (req: any, res) => {
  try {
    const { data, error } = await supabase.from('disciplines').insert(req.body).select();
    if (error) throw error;
    res.json(data[0]);
  } catch { res.status(500).json({ error: 'DISCIPLINE_CREATE_FAILED' }); }
});

categoryRouter.delete('/disciplines/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await supabase.from('disciplines').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'DISCIPLINE_DELETE_FAILED' }); }
});

categoryRouter.post('/disciplines/subjects', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { data, error } = await supabase.from('subjects').insert(req.body).select();
    if (error) throw error;
    res.json(data[0]);
  } catch { res.status(500).json({ error: 'SUBJECT_CREATE_FAILED' }); }
});

categoryRouter.delete('/disciplines/subjects/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await supabase.from('subjects').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'SUBJECT_DELETE_FAILED' }); }
});

/*DKDK_TAXO_ROUTES*/
// --- Categories : creation et suppression (admin) ---
categoryRouter.post('/', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { data, error } = await supabase.from('categories').insert({
      name: req.body.name, emoji: req.body.emoji ?? null,
      description: req.body.description ?? null, ordre: req.body.ordre ?? 0,
    }).select();
    if (error) throw error;
    res.json(data[0]);
  } catch { res.status(500).json({ error: 'CATEGORY_CREATE_FAILED' }); }
});
categoryRouter.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await supabase.from('categories').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'CATEGORY_DELETE_FAILED' }); }
});

// --- Champs dynamiques d'une discipline ---
categoryRouter.get('/disciplines/:id/champs', async (req, res) => {
  try {
    let q = supabase.from('discipline_champs').select('*').eq('discipline_id', req.params.id); /*DKDK_SOFT_DELETE*/
    if (req.query.all !== '1') q = q.eq('actif', true);
    const { data, error } = await q.order('ordre');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'CHAMPS_FETCH_FAILED' }); }
});
// --- Champs par slug de discipline (public, pour /submit) --- /*DKDK_CHAMPS_BY_SLUG*/
categoryRouter.get('/disciplines/by-slug/:slug/champs', async (req, res) => {
  try {
    const { data: discs, error: dErr } = await supabase.from('disciplines').select('id').eq('slug', req.params.slug).limit(1);
    if (dErr) throw dErr;
    if (!discs || discs.length === 0) return res.json([]);
    const { data, error } = await supabase.from('discipline_champs').select('*').eq('discipline_id', discs[0].id).eq('actif', true).order('ordre');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'CHAMPS_BY_SLUG_FETCH_FAILED' }); }
});
categoryRouter.post('/disciplines/:id/champs', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { data, error } = await supabase.from('discipline_champs').insert({
      discipline_id: req.params.id, ordre: req.body.ordre, titre: req.body.titre,
      type: req.body.type, obligatoire: req.body.obligatoire ?? false,
    }).select();
    if (error) throw error;
    res.json(data[0]);
  } catch { res.status(500).json({ error: 'CHAMP_CREATE_FAILED' }); }
});
categoryRouter.delete('/champs/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await supabase.from('discipline_champs').update({ actif: false }).eq('id', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'CHAMP_DELETE_FAILED' }); }
});

// --- Choix d'un champ de type liste ---
categoryRouter.get('/champs/:id/choix', async (req, res) => {
  try {
    let q = supabase.from('discipline_choix').select('*').eq('champ_id', req.params.id);
    if (req.query.all !== '1') q = q.eq('actif', true);
    const { data, error } = await q.order('ordre');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'CHOIX_FETCH_FAILED' }); }
});
categoryRouter.post('/champs/:id/choix', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { data, error } = await supabase.from('discipline_choix').insert({
      champ_id: req.params.id, valeur: req.body.valeur, ordre: req.body.ordre ?? 0,
    }).select();
    if (error) throw error;
    res.json(data[0]);
  } catch { res.status(500).json({ error: 'CHOIX_CREATE_FAILED' }); }
});
// Chercher un choix existant (casse/accents ignores) ou le creer (propose par un candidat) /*DKDK_CHOIX_OU_EXISTANT*/
categoryRouter.post('/champs/:id/choix-ou-existant', requireAuth, async (req: any, res) => {
  try {
    const brut = String(req.body.valeur || '').trim();
    if (!brut) return res.status(400).json({ error: 'VALEUR_VIDE' });
    const norm = (v) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const cible = norm(brut);
    const { data: existants } = await supabase
      .from('discipline_choix').select('id, valeur')
      .eq('champ_id', req.params.id).eq('actif', true);
    const match = (existants || []).find((c) => norm(c.valeur) === cible);
    if (match) return res.json({ id: match.id, valeur: match.valeur, created: false });
    const { data: cree, error } = await supabase.from('discipline_choix').insert({
      champ_id: req.params.id, valeur: brut, ordre: 999, origine: 'candidat',
    }).select();
    if (error) throw error;
    res.json({ id: cree[0].id, valeur: cree[0].valeur, created: true });
  } catch { res.status(500).json({ error: 'CHOIX_OU_EXISTANT_FAILED' }); }
});

categoryRouter.delete('/choix/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await supabase.from('discipline_choix').update({ actif: false }).eq('id', req.params.id);
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'CHOIX_DELETE_FAILED' }); }
});

// --- Renommer et deplacer (admin) --- /*DKDK_TAXO_MOVE*/
categoryRouter.patch('/champs/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const maj: any = {};
    if (typeof req.body.titre === 'string') maj.titre = req.body.titre.trim();
    if (typeof req.body.obligatoire === 'boolean') maj.obligatoire = req.body.obligatoire;
    if (Object.keys(maj).length === 0) return res.status(400).json({ error: 'RIEN_A_MODIFIER' });
    const { error } = await supabase.from('discipline_champs').update(maj).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'CHAMP_UPDATE_FAILED' }); }
});
categoryRouter.patch('/choix/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    if (typeof req.body.valeur !== 'string' || !req.body.valeur.trim()) return res.status(400).json({ error: 'VALEUR_REQUISE' });
    const { error } = await supabase.from('discipline_choix').update({ valeur: req.body.valeur.trim() }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'CHOIX_UPDATE_FAILED' }); }
});
categoryRouter.post('/champs/:id/move', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const haut = req.body.direction === 'up';
    const { data: cur, error: e1 } = await supabase.from('discipline_champs').select('id, discipline_id, ordre').eq('id', req.params.id).single();
    if (e1 || !cur) throw new Error('NOT_FOUND');
    const base = supabase.from('discipline_champs').select('id, ordre').eq('discipline_id', cur.discipline_id);
    const { data: vois, error: e2 } = haut
      ? await base.lt('ordre', cur.ordre).order('ordre', { ascending: false }).limit(1)
      : await base.gt('ordre', cur.ordre).order('ordre', { ascending: true }).limit(1);
    if (e2) throw e2;
    if (!vois || vois.length === 0) return res.json({ success: true, moved: false });
    const v: any = vois[0];
    await supabase.from('discipline_champs').update({ ordre: 9 }).eq('id', cur.id);
    await supabase.from('discipline_champs').update({ ordre: cur.ordre }).eq('id', v.id);
    await supabase.from('discipline_champs').update({ ordre: v.ordre }).eq('id', cur.id);
    res.json({ success: true, moved: true });
  } catch { res.status(500).json({ error: 'CHAMP_MOVE_FAILED' }); }
});
categoryRouter.post('/choix/:id/move', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const haut = req.body.direction === 'up';
    const { data: cur, error: e1 } = await supabase.from('discipline_choix').select('id, champ_id, ordre').eq('id', req.params.id).single();
    if (e1 || !cur) throw new Error('NOT_FOUND');
    const base = supabase.from('discipline_choix').select('id, ordre').eq('champ_id', cur.champ_id);
    const { data: vois, error: e2 } = haut
      ? await base.lt('ordre', cur.ordre).order('ordre', { ascending: false }).limit(1)
      : await base.gt('ordre', cur.ordre).order('ordre', { ascending: true }).limit(1);
    if (e2) throw e2;
    if (!vois || vois.length === 0) return res.json({ success: true, moved: false });
    const v: any = vois[0];
    await supabase.from('discipline_choix').update({ ordre: cur.ordre }).eq('id', v.id);
    await supabase.from('discipline_choix').update({ ordre: v.ordre }).eq('id', cur.id);
    res.json({ success: true, moved: true });
  } catch { res.status(500).json({ error: 'CHOIX_MOVE_FAILED' }); }
});

// --- Restaurer un element desactive (admin) ---
categoryRouter.post('/champs/:id/restore', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('discipline_champs').update({ actif: true }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'CHAMP_RESTORE_FAILED' }); }
});
categoryRouter.post('/choix/:id/restore', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase.from('discipline_choix').update({ actif: true }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'CHOIX_RESTORE_FAILED' }); }
});

// --- Formats de challenge (admin) --- /*DKDK_FORMATS_ROUTES*/
const formatRouter = CatRouter();

formatRouter.get('/', async (req, res) => {
  try {
    let q = supabase.from('challenge_formats').select('*');
    if (req.query.all !== '1') q = q.eq('actif', true);
    const { data, error } = await q.order('ordre');
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'FORMATS_FETCH_FAILED' }); }
});

formatRouter.patch('/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const patch: any = {};
    if (req.body.libelle !== undefined)        patch.libelle = req.body.libelle;
    if (req.body.objectif_etape !== undefined) patch.objectif_etape = req.body.objectif_etape;
    if (req.body.actif !== undefined)          patch.actif = req.body.actif;
    const { data, error } = await supabase.from('challenge_formats').update(patch).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch { res.status(500).json({ error: 'FORMAT_UPDATE_FAILED' }); }
});


const blocObjectifsRouter = CatRouter();
blocObjectifsRouter.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('bloc_objectifs').select('*');
    if (error) throw error;
    const ordonne = (data || []).sort((x: any, y: any) => (parseInt(x.format_code.replace('C',''),10) - parseInt(y.format_code.replace('C',''),10)) || (x.niveau - y.niveau));
    res.json(ordonne);
  } catch { res.status(500).json({ error: 'BLOC_OBJECTIFS_FETCH_FAILED' }); }
});
blocObjectifsRouter.patch('/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const patch: any = {};
    if (req.body.objectif !== undefined)    patch.objectif = req.body.objectif;
    if (req.body.nb_gagnants !== undefined) patch.nb_gagnants = req.body.nb_gagnants;
    const { data, error } = await supabase.from('bloc_objectifs').update(patch).eq('id', req.params.id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch { res.status(500).json({ error: 'BLOC_OBJECTIF_UPDATE_FAILED' }); }
});
export { blocObjectifsRouter };

export { formatRouter };

export { categoryRouter };
export { statsRouter };