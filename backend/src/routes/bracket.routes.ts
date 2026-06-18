import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  inscribeCandidatToBracket,
  checkAndAdvanceRounds,
  addVoteToCagnotte,
} from '../services/bracket.service';
import { inscribeToArena, createArenaChallenge } from '../services/bracketArena.service';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const bracketRouter = Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Liste des challenges (page /challenges)
bracketRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('brackets')
      .select('id, code, title, discipline, categorie, style, status, current_round, total_cagnotte, max_participants, created_at, bracket_participants(count)')
      .in('status', ['open', 'in_progress', 'waiting_candidates'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== ROUTES ARENA v2 (cahier des charges v2) =====

// Inscription a un challenge (user extrait du token)
bracketRouter.post('/arena/inscribe', requireAuth, async (req: AuthRequest, res: Response) => {
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
bracketRouter.post('/arena/create', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { video_id, categorie, discipline, style } = req.body;
    if (!video_id || !categorie || !discipline || !style)
      return res.status(400).json({ success: false, error: 'Champs manquants (video, categorie, discipline, style).' });
    const result = await createArenaChallenge({
      user_id: req.user!.userId, video_id, categorie, discipline, style,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Vote a 100 F (RPC atomique : debit wallet + trace + compteurs + cagnottes)
bracketRouter.post('/arena/vote', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { duel_id, participant_id } = req.body;
    if (!duel_id || !participant_id)
      return res.status(400).json({ success: false, error: 'Champs manquants.' });
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


bracketRouter.post('/inscribe', async (req: Request, res: Response) => {
  try {
    const { track_id, user_id, video_id, track_choice } = req.body;
    if (!track_id || !user_id || !video_id || !track_choice)
      return res.status(400).json({ success: false, error: 'Champs manquants.' });
    const result = await inscribeCandidatToBracket({ track_id, user_id, video_id, track_choice });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

bracketRouter.post('/advance', async (req: Request, res: Response) => {
  try {
    if (req.headers['x-admin-token'] !== process.env.ADMIN_SECRET)
      return res.status(403).json({ success: false, error: 'Non autorisé.' });
    await checkAndAdvanceRounds();
    res.json({ success: true, message: 'Avancement forcé effectué.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

bracketRouter.get('/track/:track_id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('brackets')
      .select('*, bracket_participants(count)')
      .eq('track_id', req.params.track_id)
      .in('status', ['open', 'ouvrir', 'ouvert'])
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch {
    res.status(404).json({ success: false, error: 'Aucun bracket ouvert pour ce morceau.' });
  }
});

bracketRouter.get('/:bracket_id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('brackets')
      .select('*, bracket_rounds(round, objectif_montant, montant_collecte, status), bracket_participants(count)')
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

bracketRouter.post('/:bracket_id/vote', async (req: Request, res: Response) => {
  try {
    const { duel_id, participant_side, amount_fcfa } = req.body;
    if (!duel_id || !participant_side || !amount_fcfa)
      return res.status(400).json({ success: false, error: 'Champs manquants.' });
    const column = participant_side === 'a' ? 'votes_a' : 'votes_b';
    const { error } = await getSupabase().rpc('increment_bracket_vote', { p_duel_id: duel_id, p_column: column });
    if (error) throw error;
    await addVoteToCagnotte(req.params.bracket_id, amount_fcfa);
    res.json({ success: true, message: 'Vote enregistré.' });
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
      .select('id, title, discipline, status, current_round, total_cagnotte, commission_pct')
      .eq('id', bracketId)
      .single();
    if (bErr) throw bErr;

    const { data: rounds, error: rErr } = await supabase
      .from('bracket_rounds')
      .select('round, objectif_montant, montant_collecte, status')
      .eq('bracket_id', bracketId)
      .eq('status', 'active')
      .order('round', { ascending: false })
      .limit(1);
    if (rErr) throw rErr;
    const activeRound = (rounds && rounds[0]) || null;

    const { data: pool, error: poolErr } = await supabase
      .from('bracket_participants')
      .select('id, score, stars_count, hearts_count, eliminated_at, video_id, user_id, users(name, avatar_url)')
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
          eliminated_at: p.eliminated_at,
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

// Vote pool (plusieurs etoiles possibles) -> RPC vote_bracket_pool
bracketRouter.post('/arena/vote-pool', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { participant_id, qty, type } = req.body;
    if (!participant_id)
      return res.status(400).json({ success: false, error: 'Champ participant_id manquant.' });
    const q = parseInt(qty, 10);
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

export default bracketRouter;