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

// Validation d'entree paiement (zod) — presence + types uniquement. AUCUNE borne ici :
// les limites metier (montant 100..100000, min/MAX retrait, devises) restent dans le controleur.
const validate = (schema: z.ZodTypeAny) => (req: Request, res: Response, next: any) => {
  const r = schema.safeParse(req.body);
  if (!r.success) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: r.error.issues.map(i => ({ champ: i.path.join('.'), message: i.message })) });
  next();
};
const _rechargeSchema = z.object({ amount: z.coerce.number().positive(), phone: z.string().min(1).max(30), operator: z.string().min(1).max(40), country: z.string().max(4).nullish() });
const _votePaySchema  = z.object({ participant_id: z.string().min(1).max(64), vote_type: z.string().min(1).max(20), phone: z.string().min(1).max(30), qty: z.coerce.number().int().positive().nullish(), country: z.string().max(4).nullish() });

const paymentRouter = PaymentRouter();
paymentRouter.post('/initiate', requireAuth, requireVerified, validate(_rechargeSchema), paymentCtrl.initiate);
paymentRouter.post('/vote', requireAuth, requireVerified, validate(_votePaySchema), paymentCtrl.initiateVotePayment); /*DKDK_VOTE_PAY_ROUTE*/
paymentRouter.post('/withdraw', requireAuth, requireVerified, validate(_rechargeSchema), paymentCtrl.withdraw); /*DKDK_WITHDRAW_ROUTE*/
paymentRouter.post('/webhook',  paymentCtrl.webhook);
paymentRouter.post('/pawapay-callback', paymentCtrl.pawapayCallback); /*DKDK_PAWAPAY_CALLBACK*/
paymentRouter.post('/pawapay-test', requireAuth, requireAdmin, paymentCtrl.pawapayTest); /*DKDK_PAWAPAY_TEST (admin, sandbox)*/
paymentRouter.post('/pawapay-deposit-test', requireAuth, requireAdmin, paymentCtrl.pawapayDepositTest); /*DKDK_PAWAPAY_DEPOSIT_TEST (admin, sandbox)*/
paymentRouter.get('/pawapay-deposit-test/:depositId', requireAuth, requireAdmin, paymentCtrl.pawapayDepositTestStatus); /*DKDK_PAWAPAY_DEPOSIT_STATUS (admin, sandbox)*/
export { paymentRouter };

// ─── Wallet ──────────────────────────────────────────────────
const makeRouter = () => Router();
export const walletRouter = makeRouter();

// ─── Users (Admin) ───────────────────────────────────────────
import { Router as UserRouter } from 'express';
const userRouter = UserRouter();
userRouter.get('/', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    // On tente avec 'status' ; si la colonne n'existe pas encore, repli sans elle.
    let data: any = null;
    let error: any = null;
    ({ data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, wallet, created_at, status')
      .order('created_at', { ascending: false }));
    if (error) {
      ({ data, error } = await supabase
        .from('users')
        .select('id, name, email, phone, role, wallet, created_at')
        .order('created_at', { ascending: false }));
    }
    if (error) throw error;
    res.json(data || []);
  } catch { res.status(500).json({ error: 'USERS_FETCH_FAILED' }); }
});

/*DKDK_USER_SOFT_DELETE — suppression REVERSIBLE (bannissement) d'un utilisateur.
   Admin/modo uniquement. Garde-fous : jamais un admin, jamais soi-meme,
   jamais si portefeuille>0 ni solde retirable>0, jamais si candidat dans un
   challenge en cours. Reversible via PATCH /:id/reactiver. Aucun argent deplace. */
const _ACTIVE_BRACKET = ['appel', 'in_progress', 'active', 'waiting_candidates', 'closing', 'open'];

userRouter.delete('/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const targetId = req.params.id;
    const me = req.user?.userId;
    if (targetId === me) {
      return res.status(400).json({ error: 'SELF_DELETE_FORBIDDEN', message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const { data: target, error: tErr } = await supabase
      .from('users').select('id, name, role, wallet').eq('id', targetId).single();
    if (tErr || !target) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' });
    }

    // Garde-fou 1 : jamais un administrateur / moderateur
    if (['admin', 'moderateur', 'moderator'].includes(String(target.role || '').toLowerCase())) {
      return res.status(403).json({ error: 'ADMIN_PROTECTED', message: 'Impossible de supprimer un administrateur.' });
    }

    // Garde-fou 2 : portefeuille affiche a zero
    if (Number(target.wallet || 0) > 0) {
      return res.status(409).json({ error: 'WALLET_NOT_EMPTY', message: 'Portefeuille non vide : suppression impossible.' });
    }

    // Garde-fou 3 : solde retirable reel (transactions) a zero
    const [gainsRes, retraitsRes] = await Promise.all([
      supabase.from('transactions').select('amount').eq('user_id', targetId).in('type', ['bracket_win', 'soutien_gain']).eq('status', 'success'),
      supabase.from('transactions').select('amount').eq('user_id', targetId).eq('type', 'payout').in('status', ['pending', 'sent', 'success']),
    ]);
    const totalGains = (gainsRes.data || []).reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
    const totalRetraits = (retraitsRes.data || []).reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
    const solde = totalGains - totalRetraits;
    if (solde > 0) {
      return res.status(409).json({ error: 'BALANCE_NOT_EMPTY', message: 'Solde retirable de ' + solde + ' F : suppression impossible.' });
    }

    // Garde-fou 4 : pas candidat dans un challenge en cours.
    // Hint FK explicite (brackets a plusieurs FK vers bracket_participants) sinon embed ambigu.
    // Fail-safe : si la lecture echoue, on REFUSE la suppression (on ne prend pas le risque).
    const { data: parts, error: pErr } = await supabase
      .from('bracket_participants')
      .select('id, brackets!bracket_participants_bracket_id_fkey(status)')
      .eq('user_id', targetId);
    if (pErr) {
      return res.status(409).json({ error: 'CHECK_FAILED', message: 'Impossible de verifier les participations en cours : suppression annulee par securite.' });
    }
    const enCours = (parts || []).some((p: any) => p.brackets && _ACTIVE_BRACKET.includes(p.brackets.status));
    if (enCours) {
      return res.status(409).json({ error: 'ACTIVE_CHALLENGE', message: 'Ce candidat participe a un challenge en cours : suppression impossible.' });
    }

    // Bannissement reversible
    const { error: uErr } = await supabase
      .from('users').update({ status: 'banned' }).eq('id', targetId);
    if (uErr) {
      return res.status(500).json({ error: 'USER_DELETE_FAILED', message: 'Suppression impossible : ' + (uErr.message || 'erreur base de donnees') + (uErr.code ? ' [' + uErr.code + ']' : '') });
    }
    return res.json({ ok: true, id: targetId, status: 'banned' });
  } catch {
    return res.status(500).json({ error: 'USER_DELETE_FAILED', message: 'Echec de la suppression.' });
  }
});

userRouter.delete('/:id/definitif', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const targetId = req.params.id;
    const me = req.user?.userId;
    if (targetId === me) {
      return res.status(400).json({ error: 'SELF_DELETE_FORBIDDEN', message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const { data: target, error: tErr } = await supabase
      .from('users').select('id, name, role, wallet, status').eq('id', targetId).single();
    if (tErr || !target) {
      return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Utilisateur introuvable.' });
    }
    // 1) Jamais un administrateur
    if (['admin', 'moderateur', 'moderator'].includes(String(target.role || '').toLowerCase())) {
      return res.status(403).json({ error: 'ADMIN_PROTECTED', message: 'Impossible de supprimer un administrateur.' });
    }
    // 2) Uniquement un compte DEJA banni
    if (target.status !== 'banned') {
      return res.status(409).json({ error: 'NOT_BANNED', message: 'Bannissez d abord ce compte avant de le supprimer definitivement.' });
    }
    // 3) Portefeuille a zero
    if (Number(target.wallet || 0) > 0) {
      return res.status(409).json({ error: 'WALLET_NOT_EMPTY', message: 'Portefeuille non vide : suppression definitive impossible.' });
    }
    // 4) Aucun historique lie (protege la comptabilite). Fail-safe : erreur de lecture => refus.
    const [txRes, voteRes, partRes] = await Promise.all([
      supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
      supabase.from('votes').select('id', { count: 'exact', head: true }).eq('voter_id', targetId),
      supabase.from('bracket_participants').select('id', { count: 'exact', head: true }).eq('user_id', targetId),
    ]);
    if (txRes.error || voteRes.error || partRes.error) {
      return res.status(409).json({ error: 'CHECK_FAILED', message: 'Impossible de verifier l historique : suppression definitive annulee par securite.' });
    }
    const nbTx = txRes.count || 0;
    const nbVote = voteRes.count || 0;
    const nbPart = partRes.count || 0;
    if (nbTx > 0 || nbVote > 0 || nbPart > 0) {
      return res.status(409).json({ error: 'HAS_HISTORY', message: 'Ce compte a de l historique (' + nbTx + ' transaction(s), ' + nbVote + ' vote(s), ' + nbPart + ' participation(s)) : gardez-le banni plutot que de le supprimer.' });
    }

    // 5) Suppression : d abord le portefeuille (solde 0), puis le compte.
    await supabase.from('wallets').delete().eq('user_id', targetId);
    const { error: dErr } = await supabase.from('users').delete().eq('id', targetId);
    if (dErr) {
      return res.status(500).json({ error: 'USER_HARD_DELETE_FAILED', message: 'Suppression definitive impossible : ' + (dErr.message || 'erreur base de donnees') + (dErr.code ? ' [' + dErr.code + ']' : '') });
    }
    return res.json({ ok: true, id: targetId, deleted: true });
  } catch {
    return res.status(500).json({ error: 'USER_HARD_DELETE_FAILED', message: 'Suppression definitive impossible.' });
  }
});

userRouter.patch('/:id/reactiver', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const { error } = await supabase
      .from('users').update({ status: 'actif' }).eq('id', req.params.id);
    if (error) {
      return res.status(500).json({ error: 'USER_REACTIVATE_FAILED', message: 'Reactivation impossible : ' + (error.message || 'erreur base de donnees') + (error.code ? ' [' + error.code + ']' : '') });
    }
    return res.json({ ok: true, id: req.params.id, status: 'actif' });
  } catch {
    return res.status(500).json({ error: 'USER_REACTIVATE_FAILED', message: 'Echec de la reactivation.' });
  }
});

export { userRouter };

// ─── Activité admin : « Qui fait quoi » (morceaux ajoutés + appels créés) ───
import { Router as ActiviteRouter } from 'express';
const activiteRouter = ActiviteRouter();

activiteRouter.get('/activite', requireAuth, requireAdmin, async (_req: any, res) => {
  try {
    const [musRes, brkRes] = await Promise.all([
      supabase.from('musiques').select('id, titre, artiste, status, created_at, submitted_by').order('created_at', { ascending: false }).limit(500),
      supabase.from('brackets').select('id, code, title, discipline, status, created_at, user_id').order('created_at', { ascending: false }).limit(500),
    ]);
    const mus = musRes.data || [];
    const brk = brkRes.data || [];
    const ids = Array.from(new Set([
      ...mus.map((m: any) => m.submitted_by).filter(Boolean),
      ...brk.map((b: any) => b.user_id).filter(Boolean),
    ]));
    const nameById: Record<string, { name: string | null; email: string | null }> = {};
    if (ids.length) {
      const { data: us } = await supabase.from('users').select('id, name, email').in('id', ids);
      for (const u of (us || [])) nameById[(u as any).id] = { name: (u as any).name, email: (u as any).email };
    }
    const morceaux = mus.map((m: any) => ({
      id: m.id, titre: m.titre, artiste: m.artiste, statut: m.status, created_at: m.created_at,
      auteur_id: m.submitted_by,
      auteur_nom: (nameById[m.submitted_by] && nameById[m.submitted_by].name) || null,
      auteur_email: (nameById[m.submitted_by] && nameById[m.submitted_by].email) || null,
    }));
    const appels = brk.map((b: any) => ({
      id: b.id, code: b.code, titre: b.title, discipline: b.discipline, statut: b.status, created_at: b.created_at,
      createur_id: b.user_id,
      createur_nom: (nameById[b.user_id] && nameById[b.user_id].name) || null,
      createur_email: (nameById[b.user_id] && nameById[b.user_id].email) || null,
    }));
    res.json({ success: true, data: { morceaux, appels } });
  } catch {
    res.status(500).json({ success: false, error: 'ACTIVITE_FETCH_FAILED' });
  }
});


// ── Message de bienvenue (notification in-app) — ciblé ou groupé, admin only ──
activiteRouter.post('/message', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const body = req.body || {};
    const ids: string[] = Array.isArray(body.user_ids) ? body.user_ids.filter((x: any) => typeof x === 'string' && x) : [];
    if (!ids.length) return res.status(400).json({ error: 'NO_RECIPIENTS', message: 'Aucun destinataire selectionne.' });
    const message = String(body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'EMPTY_MESSAGE', message: 'Le message est vide.' });
    const title = (String(body.title || '').trim() || 'Bienvenue dans l Arene Diki-Diki').slice(0, 100);
    const rows = ids.slice(0, 2000).map((id) => ({ user_id: id, type: 'welcome', title, message: message.slice(0, 2000), data: {} }));
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) throw error;
    return res.json({ ok: true, sent: rows.length });
  } catch {
    return res.status(500).json({ error: 'MESSAGE_FAILED', message: 'Envoi du message impossible.' });
  }
});
export { activiteRouter };

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
usersPublicRouter.get('/me/full',         requireAuth, usersCtrl.getMyFull);      /*DKDK_PROFILE_FULL*/
usersPublicRouter.put('/profile',         requireAuth, usersCtrl.updateProfile);  /*DKDK_PROFILE_PUT*/
usersPublicRouter.post('/avatar',         requireAuth, usersCtrl.uploadAvatar);   /*DKDK_AVATAR_UP*/
usersPublicRouter.get('/:id/avatar-file', usersCtrl.getAvatarFile);               /*DKDK_AVATAR_FILE*/
usersPublicRouter.get('/:id/profile', usersCtrl.getPublicProfile);
usersPublicRouter.get('/:id/videos',  usersCtrl.getPublicVideos);

export { usersPublicRouter };

// ─── Ticker ───────────────────────────────────────────────────
import { Router as TickerRouter } from 'express';
import * as tickerCtrl from '../controllers/ticker.controller';

const tickerRouter = TickerRouter();
tickerRouter.get('/',       tickerCtrl.getTicker);
tickerRouter.post('/',      requireAuth, requireAdmin, tickerCtrl.addTicker);   // H5
tickerRouter.delete('/:id', requireAuth, requireAdmin, tickerCtrl.removeTicker); // H5
tickerRouter.put('/:id',    requireAuth, requireAdmin, tickerCtrl.updateTicker);  // H5
export { tickerRouter };

// ─── Stats (Admin) ───────────────────────────────────────────
import { Router as StatsRouter } from 'express';
const statsRouter = StatsRouter();
statsRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const [users, votes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact' }),
      supabase.from('votes').select('id', { count: 'exact' }),
    ]);
    res.json({
      users:    users.count    || 0,
      votes:    votes.count    || 0,
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
    if (req.body.nb_etapes !== undefined)      patch.nb_etapes = req.body.nb_etapes;
    if (req.body.nb_videos !== undefined)      patch.nb_videos = req.body.nb_videos;
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