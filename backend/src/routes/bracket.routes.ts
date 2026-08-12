import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
/*DKDK_DEAD_ROUTES_REMOVED*/ // 3 routes non authentifiees supprimees ; checkAndAdvanceRounds reste appele par src/cron/bracket.cron.ts
import { inscribeToArena, createArenaChallenge, checkArenaChallenge } from '../services/bracketArena.service';
import { requireAuth, AuthRequest, requireVerified, requireAdmin } from '../middleware/auth.middleware';

const bracketRouter = Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );
}

// Liste des challenges (page /challenges)
bracketRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('brackets')
      .select('id, code, title, discipline, categorie, style, status, current_round, total_cagnotte, max_participants, created_at, bracket_participants!bracket_participants_bracket_id_fkey(count)')
      .in('status', ['open', 'in_progress', 'waiting_candidates'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== AGREGATION ADMIN (Dashboard + Statistiques) — lit les VRAIS challenges (brackets) /*DKDK_ADMIN_AGG*/
// Remplace l'ancienne agregation basee sur les 'contests' (systeme parallele vide).
bracketRouter.get('/admin/stats', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const supabase = getSupabase();

    // 1. Tous les challenges, tous statuts confondus (y compris 'done')
    const { data: bks, error: bErr } = await supabase
      .from('brackets')
      .select('id, code, title, discipline, categorie, style, status, modele, current_round, total_cagnotte, commission_pct, max_participants, winner_id, created_at, ended_at, bracket_participants!bracket_participants_bracket_id_fkey(count)')
      .order('created_at', { ascending: false });
    if (bErr) throw bErr;
    const brackets = bks || [];

    const isEnCours     = (s: string) => s === 'in_progress' || s === 'active';
    const isEnFormation = (s: string) => ['open', 'ouvrir', 'ouvert', 'waiting_candidates'].includes(s);
    const isTerminee    = (s: string) => s === 'done';

    let en_cours = 0, en_formation = 0, terminees = 0;
    let total_collecte = 0, platform_cut = 0;
    const challenges = brackets.map((b: any) => {
      if (isEnCours(b.status)) en_cours++;
      else if (isEnFormation(b.status)) en_formation++;
      else if (isTerminee(b.status)) terminees++;
      const cag  = b.total_cagnotte || 0;
      const comm = (b.commission_pct != null ? Number(b.commission_pct) : 0.5);
      total_collecte += cag;
      platform_cut   += Math.round(cag * comm);
      return {
        id: b.id, title: b.title, code: b.code, discipline: b.discipline,
        status: b.status, modele: b.modele, current_round: b.current_round,
        total_cagnotte: cag, max_participants: b.max_participants,
        participants: b.bracket_participants?.[0]?.count ?? 0,
        winner_id: b.winner_id, created_at: b.created_at, ended_at: b.ended_at,
      };
    });
    const net_cagnotte = total_collecte - platform_cut;

    // 2. Total des votes exprimes (une ligne = un vote)
    const { count: votesCount } = await supabase
      .from('bracket_votes').select('*', { count: 'exact', head: true });

    // 3. Videos (en attente + total)
    const { count: pendingVideos } = await supabase
      .from('videos').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: totalVideos } = await supabase
      .from('videos').select('*', { count: 'exact', head: true });

    // 4. Utilisateurs
    const { count: totalUsers } = await supabase
      .from('users').select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      data: {
        counts: { en_cours, en_formation, terminees, total: brackets.length },
        votes_total:   votesCount   || 0,
        finances:      { total_collecte, platform_cut, net_cagnotte },
        pending_videos: pendingVideos || 0,
        total_videos:   totalVideos   || 0,
        total_users:    totalUsers    || 0,
        challenges,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ROUTES ARENA v2 (cahier des charges v2) =====

// Inscription a un challenge (user extrait du token)
bracketRouter.post('/arena/inscribe', requireAuth, requireVerified, /*DKDK_INSCRIBE_VERIF*/ async (req: AuthRequest, res: Response) => {
  try {
    const { bracket_id, video_id } = req.body;
    if (!bracket_id || !video_id)
      return res.status(400).json({ success: false, error: 'Champs manquants.' });
    const result = await inscribeToArena({
      bracket_id, video_id, user_id: req.user!.userId,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Creation d'un challenge par un utilisateur (3 gardes + anti-doublon + 1er inscrit)
bracketRouter.post('/arena/create', requireAuth, requireVerified, async (req: AuthRequest, res: Response) => {
  try {
    const { video_id, categorie, discipline, style, track_id, mode, format_code, champs_valeurs, paiement_confirme, modele, niveau, video_ids, sport } = req.body; /*DKDK_ETAPE4_ROUTE*/ /*DKDK_ROUTE_B*/ /*DKDK_FIX_ROUTE_PAIEMENT*/ /*DKDK_SPORT_CREATE*/
    if (!video_id || !categorie || !discipline || !format_code)
      return res.status(400).json({ success: false, error: 'Champs manquants (video, categorie, discipline, format).' });
    const result = await createArenaChallenge({
      user_id: req.user!.userId, video_id, categorie, discipline, style, track_id, mode, format_code, champs_valeurs, paiement_confirme, modele, niveau, video_ids, sport, /*DKDK_SPORT_CREATE*/
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Supprimer un challenge NON DEMARRE (admin) /*DKDK_DELETE_BRACKET*/
bracketRouter.delete('/arena/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Reserve a l administrateur.' });
    const sb = getSupabase();
    const { data: bracket, error: bErr } = await sb
      .from('brackets').select('id, status').eq('id', req.params.id).single();
    if (bErr || !bracket) return res.status(404).json({ success: false, error: 'Challenge introuvable.' });
    // Securite : on ne supprime QUE les challenges non demarres
    if (bracket.status !== 'waiting_candidates') {
      return res.status(400).json({ success: false, error: 'Seuls les challenges non demarres (inscriptions ouvertes) peuvent etre supprimes.' });
    }
    // Les tables liees sont toutes en CASCADE : le DELETE du bracket nettoie tout
    const { error: delErr } = await sb.from('brackets').delete().eq('id', req.params.id);
    if (delErr) throw delErr;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verifier si un challenge existe deja pour la combinaison (Creer vs Rejoindre) /*DKDK_ROUTE_CHECK*/
bracketRouter.post('/arena/check', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { discipline, mode, track_id, format_code, champs_valeurs, video_id } = req.body; /*DKDK_CHECK_VIDEO*/
    const result = await checkArenaChallenge({ discipline, mode, track_id, format_code, champs_valeurs, video_id });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Vote a 100 F (RPC atomique : debit wallet + trace + compteurs + cagnottes)
bracketRouter.post('/arena/vote', requireAuth, requireVerified, async (req: AuthRequest, res: Response) => {
  try {
    const { duel_id, participant_id } = req.body;
    if (!duel_id || !participant_id)
      return res.status(400).json({ success: false, error: 'Champs manquants.' });
    /*DKDK_SUSPEND_GUARD*/
    { const { data: _sp } = await getSupabase()
        .from('bracket_participants').select('suspended_at').eq('id', participant_id).single();
      if (_sp && _sp.suspended_at) return res.status(403).json({ success: false, error: 'Ce candidat est temporairement suspendu (verification en cours). Vote impossible pour l instant.' }); }

    const { data, error } = await getSupabase().rpc('vote_bracket', {
      p_user_id: req.user!.userId,
      p_duel_id: duel_id,
      p_participant: participant_id,
    });
    if (error) throw error;
    if (!data.success) return res.status(400).json(data);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});




bracketRouter.get('/track/:track_id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('brackets')
      .select('*, bracket_participants!bracket_participants_bracket_id_fkey(count)')
      .eq('track_id', req.params.track_id)
      .in('status', ['open', 'ouvrir', 'ouvert'])
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch {
    res.status(404).json({ success: false, error: 'Aucun bracket ouvert pour ce morceau.' });
  }
});

// Liste de tous les candidats ayant participe a au moins un challenge (public) /*DKDK_LISTE_CANDIDATS*/
bracketRouter.get('/candidats', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data: parts, error: pErr } = await supabase
      .from('bracket_participants')
      .select('user_id');
    if (pErr) throw pErr;
    const ids = Array.from(new Set((parts || []).map(function(p){ return p.user_id; }).filter(Boolean)));
    if (ids.length === 0) { res.json({ success: true, data: [] }); return; }
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('id, name, avatar_url, country')
      .in('id', ids);
    if (uErr) throw uErr;
    res.json({ success: true, data: users || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Liste des challenges d un candidat (tout statut, public) /*DKDK_CANDIDAT_CHALLENGES*/
bracketRouter.get('/candidats/:userId/challenges', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data: parts, error: pErr } = await supabase
      .from('bracket_participants')
      .select('id, bracket_id, video_id, score, final_path, eliminated_at, brackets!bracket_participants_bracket_id_fkey(id, title, status, discipline, type, max_participants, current_round, winner_id, created_at, ended_at, mode)') /*DKDK_FK_FIX*/
      .eq('user_id', req.params.userId);
    if (pErr) throw pErr;
    res.json({ success: true, data: parts || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

bracketRouter.get('/:bracket_id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('brackets')
      .select('*, bracket_rounds(round, objectif_montant, montant_collecte, status), bracket_participants!bracket_participants_bracket_id_fkey(count), participants:bracket_participants!bracket_participants_bracket_id_fkey(id, suspended_at, eliminated_at, video_id, score, users(name))') /*DKDK_FIX_EMBED*//*DKDK_ADMIN_PARTS*/
      .eq('id', req.params.bracket_id)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

bracketRouter.get('/:bracket_id/duels', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('bracket_duels')
      .select('*, part_a:bracket_participants!participant_a(user_id, video_id, users(name, avatar_url)), part_b:bracket_participants!participant_b(user_id, video_id, users(name, avatar_url))')
      .eq('bracket_id', req.params.bracket_id)
      .in('status', ['active', 'overtime'])
      .order('round', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});



// ===== ROUTES POOL (chantier #1 : classement au score, sans duel) =====

// Resout video -> participant -> bracket, et renvoie le pool trie par score
bracketRouter.get('/by-video/:videoId', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data: parts, error: partErr } = await supabase
      .from('bracket_participants')
      .select('id, bracket_id, score, eliminated_at, video_id, user_id')
      .eq('video_id', req.params.videoId)
      .limit(1);
    if (partErr) throw partErr;
    const part = (parts && parts[0]) || null;
    if (!part || !part.bracket_id) {
      return res.json({ success: true, data: null });
    }
    const bracketId = part.bracket_id;

    const { data: bracket, error: bErr } = await supabase
      .from('brackets')
      .select('id, title, discipline, status, current_round, total_cagnotte, commission_pct, max_participants, type')
      .eq('id', bracketId)
      .single();
    if (bErr) throw bErr;

    const { data: rounds, error: rErr } = await supabase
      .from('bracket_rounds')
      .select('round, objectif_montant, montant_collecte, status')
      .eq('bracket_id', bracketId)
      /*DKDK_BYVIDEO_BRONZE*/
      .in('status', ['active', 'in_progress'])
      .order('round', { ascending: false })
      .limit(1);
    if (rErr) throw rErr;
    const activeRound = (rounds && rounds[0]) || null;

    const { data: pool, error: poolErr } = await supabase
      .from('bracket_participants')
      .select('id, score, stars_count, hearts_count, eliminated_at, suspended_at, registered_at, final_path, video_id, user_id, users(name, avatar_url)')
      .eq('bracket_id', bracketId)
      .order('score', { ascending: false });
    if (poolErr) throw poolErr;

    return res.json({
      success: true,
      data: {
        current_participant_id: part.id,
        bracket,
        active_round: activeRound,
        pool: (pool || []).map((p: any) => ({
          participant_id: p.id,
          score: p.score,
          stars_count: p.stars_count ?? 0,
          hearts_count: p.hearts_count ?? 0,
          eliminated_at: p.eliminated_at, suspended_at: p.suspended_at,
          registered_at: p.registered_at,
          final_path: p.final_path ?? null,
          video_id: p.video_id,
          user_id: p.user_id,
          name: p.users ? p.users.name : null,
          avatar_url: p.users ? p.users.avatar_url : null,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ROUTES VIDEOS PAR ROUND (modele une video par etape) =====
/*DKDK_VIDEO_ROUND*/

// Soumettre une video pour le round actif
bracketRouter.post('/participant/:participantId/video', requireAuth, requireVerified, async (req: AuthRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const { participantId } = req.params;
    const { video_id } = req.body;
    if (!video_id) return res.status(400).json({ success: false, error: 'video_id manquant.' });

    // Verifier que le participant appartient a l'utilisateur
    const { data: part, error: partErr } = await supabase
      .from('bracket_participants')
      .select('id, bracket_id, eliminated_at')
      .eq('id', participantId)
      .eq('user_id', req.user!.userId)
      .single();
    if (partErr || !part) return res.status(403).json({ success: false, error: 'Participant introuvable ou non autorise.' });
    if (part.eliminated_at) return res.status(400).json({ success: false, error: 'Participant elimine.' });

    // Recuperer le round actif
    const { data: rounds } = await supabase
      .from('bracket_rounds')
      .select('round')
      .eq('bracket_id', part.bracket_id)
      .eq('status', 'in_progress')
      .order('round', { ascending: false })
      .limit(1);
    const currentRound = rounds?.[0]?.round;
    if (!currentRound) return res.status(400).json({ success: false, error: 'Aucun round actif.' });

    // Verifier que la video est approuvee
    const { data: vid } = await supabase
      .from('videos')
      .select('id, status, user_id')
      .eq('id', video_id)
      .single();
    if (!vid || vid.status !== 'approved') return res.status(400).json({ success: false, error: 'Video non approuvee.' });
    if (vid.user_id !== req.user!.userId) return res.status(403).json({ success: false, error: 'Video non autorisee.' });

    // Upsert dans bracket_participant_videos (1 video par participant par round)
    const { error: uvErr } = await supabase
      .from('bracket_participant_videos')
      .upsert({
        participant_id: participantId,
        round_number: currentRound,
        video_id,
      }, { onConflict: 'participant_id,round_number' });
    if (uvErr) throw uvErr;

    // Mettre a jour le video_id actif sur bracket_participants
    await supabase
      .from('bracket_participants')
      .update({ video_id })
      .eq('id', participantId);

    res.json({ success: true, round: currentRound, video_id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lister les videos d'un participant par round
bracketRouter.get('/participant/:participantId/videos', /*DKDK_PARCOURS_PUBLIC*/ async (req: AuthRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('bracket_participant_videos')
      .select('round_number, video_id, created_at, videos(title, storage_url, status)')
      .eq('participant_id', req.params.participantId)
      .eq('videos.status', 'approved') /*DKDK_PARCOURS_APPROVED*/
      .order('round_number', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Vote pool (plusieurs etoiles possibles) -> RPC vote_bracket_pool
bracketRouter.post('/arena/vote-pool', requireAuth, requireVerified, async (req: AuthRequest, res: Response) => {
  try {
    const { participant_id, qty, type } = req.body;
    if (!participant_id)
      return res.status(400).json({ success: false, error: 'Champ participant_id manquant.' });
    const q = parseInt(qty, 10);
    /*DKDK_SUSPEND_GUARD*/
    { const { data: _sp } = await getSupabase()
        .from('bracket_participants').select('suspended_at').eq('id', participant_id).single();
      if (_sp && _sp.suspended_at) return res.status(403).json({ success: false, error: 'Ce candidat est temporairement suspendu (verification en cours). Vote impossible pour l instant.' }); }

    const { data, error } = await getSupabase().rpc('vote_bracket_pool', {
      p_user_id: req.user!.userId,
      p_participant_id: participant_id,
      p_qty: Number.isFinite(q) && q > 0 ? q : 1,
      p_type: type === 'heart' ? 'heart' : 'star',
    });
    if (error) throw error;
    if (!data.success) return res.status(400).json(data);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ROUTE SOUTENIR (hors challenge, 10F/clic, 50/50) =====
/*DKDK_SOUTENIR_ROUTE*/
/*DKDK_SUSPEND_TOGGLE*/
bracketRouter.post('/participant/:participantId/suspend', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Reserve a l administrateur.' });
    const sb = getSupabase();
    const { data: part, error: pErr } = await sb
      .from('bracket_participants').select('id, suspended_at').eq('id', req.params.participantId).single();
    if (pErr || !part) return res.status(404).json({ success: false, error: 'Participant introuvable.' });
    const nouveau = part.suspended_at ? null : new Date().toISOString();
    const { error: uErr } = await sb.from('bracket_participants').update({ suspended_at: nouveau }).eq('id', part.id);
    if (uErr) throw uErr;
    res.json({ success: true, suspended: !!nouveau, suspended_at: nouveau });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

bracketRouter.post('/video/:videoId/soutenir', requireAuth, requireVerified, async (req: AuthRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const { videoId } = req.params;

    // Recuperer la video et l'artiste
    const { data: vid, error: vidErr } = await supabase
      .from('videos')
      .select('id, user_id, status')
      .eq('id', videoId)
      .single();
    if (vidErr || !vid) return res.status(404).json({ success: false, error: 'Video introuvable.' });
    if (vid.status !== 'approved') return res.status(400).json({ success: false, error: 'Video non approuvee.' });
    if (vid.user_id === req.user!.userId) return res.status(400).json({ success: false, error: 'Vous ne pouvez pas vous soutenir vous-meme.' });

    // Appel RPC soutenir_video
    const { data, error } = await supabase.rpc('soutenir_video', {
      p_user_id:   req.user!.userId,
      p_artist_id: vid.user_id,
      p_video_id:  videoId,
    });
    if (error) {
      if (error.message.includes('INSUFFICIENT_BALANCE'))
        return res.status(400).json({ success: false, error: 'Solde insuffisant (minimum 10 F CFA).' });
      throw error;
    }
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default bracketRouter;