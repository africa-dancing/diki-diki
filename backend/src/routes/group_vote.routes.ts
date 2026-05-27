// ============================================================
// group.routes.ts — Compétitions de type Groupe
// ============================================================
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import {
  createGroup, joinGroup, submitGroupVideo,
  getGroupRanking, getUserGroups,
} from '../services/group.service';

export const groupRouter = Router();

// POST /v1/groups — Créer un groupe
groupRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { contest_id, name } = req.body;
  if (!contest_id || !name) {
    return res.status(400).json({ error: 'MISSING_FIELDS' });
  }
  const group = await createGroup(contest_id, req.user!.id, name);
  res.status(201).json({ success: true, group });
});

// POST /v1/groups/:id/join — Rejoindre un groupe
groupRouter.post('/:id/join', requireAuth, async (req: AuthRequest, res: Response) => {
  const member = await joinGroup(req.params.id, req.user!.id);
  res.status(201).json({ success: true, member });
});

// PUT /v1/groups/:id/video — Soumettre la vidéo du groupe (leader)
groupRouter.put('/:id/video', requireAuth, async (req: AuthRequest, res: Response) => {
  const { video_id } = req.body;
  if (!video_id) return res.status(400).json({ error: 'VIDEO_ID_REQUIRED' });
  const group = await submitGroupVideo(req.params.id, req.user!.id, video_id);
  res.json({ success: true, group });
});

// GET /v1/groups/ranking/:contestId — Classement groupes
groupRouter.get('/ranking/:contestId', async (req, res) => {
  const ranking = await getGroupRanking(req.params.contestId);
  res.json({ contest_id: req.params.contestId, ranking });
});

// GET /v1/groups/mine — Mes groupes
groupRouter.get('/mine', requireAuth, async (req: AuthRequest, res: Response) => {
  const groups = await getUserGroups(req.user!.id);
  res.json({ groups });
});

// ============================================================
// vote.routes.ts — Votes Duo ET Groupe
// ============================================================
import { supabase } from '../../config/supabase';

export const voteRouter = Router();

// POST /v1/votes — Voter (Duo ou Groupe selon la compétition)
voteRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { contest_id, candidate_id, group_id } = req.body;
  if (!contest_id) return res.status(400).json({ error: 'CONTEST_ID_REQUIRED' });

  // Déterminer le type de compétition
  const { data: contest } = await supabase
    .from('contests')
    .select('comp_type, status')
    .eq('id', contest_id)
    .single();

  if (!contest)                   return res.status(404).json({ error: 'CONTEST_NOT_FOUND' });
  if (contest.status !== 'active') return res.status(400).json({ error: 'CONTEST_NOT_ACTIVE' });

  let result;
  if (contest.comp_type === 'duo') {
    if (!candidate_id) return res.status(400).json({ error: 'CANDIDATE_ID_REQUIRED' });
    const { data, error } = await supabase.rpc('cast_vote_duo', {
      p_voter_id:     req.user!.id,
      p_candidate_id: candidate_id,
      p_contest_id:   contest_id,
    });
    if (error) throw new Error(error.message);
    result = data;
  } else {
    if (!group_id) return res.status(400).json({ error: 'GROUP_ID_REQUIRED' });
    const { data, error } = await supabase.rpc('cast_vote_group', {
      p_voter_id:   req.user!.id,
      p_group_id:   group_id,
      p_contest_id: contest_id,
    });
    if (error) throw new Error(error.message);
    result = data;
  }

  res.status(201).json(result);
});

// GET /v1/votes/check/:contestId — A-t-il déjà voté ?
voteRouter.get('/check/:contestId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { data } = await supabase
    .from('votes')
    .select('id, candidate_id, group_id')
    .eq('voter_id', req.user!.id)
    .eq('contest_id', req.params.contestId)
    .single();
  res.json({ voted: !!data, vote: data || null });
});
