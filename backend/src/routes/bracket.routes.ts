import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  inscribeCandidatToBracket,
  checkAndAdvanceRounds,
  addVoteToCagnotte,
} from '../services/bracket.service';

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
      .select('*, bracket_duels(id, round, status, votes_a, votes_b, ends_at, participant_a, participant_b)')
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
      .select('*, part_a:bracket_participants!participant_a(user_id, video_id, track_choice), part_b:bracket_participants!participant_b(user_id, video_id, track_choice)')
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

export default bracketRouter;