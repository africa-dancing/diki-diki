// backend/src/routes/votelink.routes.ts
// DKDK_VOTE_LINK — Rail n°1 « vote sans friction » (spec DIKI-spec-vote-sans-friction.md).
//  * GET /v1/vote-link/mine        (requireAuth) : mes liens de vote (un par participation).
//  * GET /v1/vote-link/:code       (public)      : résout un code public -> candidat, vidéo,
//                                                  challenge, étape active, prix ★/❤️, et
//                                                  journalise le clic (KPI conversion).
// Lecture seule. N'entre dans AUCUN calcul d'argent (cagnotte, commission, distribution).
import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const votelinkRouter = Router();

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
}

// ── Mes liens de vote (candidat) ── doit rester AVANT /:code ──────────────────
votelinkRouter.get('/mine', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const supabase = getSupabase();
    const userId = req.user!.userId;
    const { data, error } = await supabase
      .from('bracket_participants')
      .select('id, public_code, bracket_id, eliminated_at, video_id, registered_at, brackets!bracket_participants_bracket_id_fkey(id, title, status)')
      .eq('user_id', userId)
      .order('registered_at', { ascending: false });
    if (error) throw error;
    const liens = (data || []).map((p: any) => ({
      participant_id: p.id,
      code:           p.public_code,
      bracket_id:     p.bracket_id,
      bracket_title:  p.brackets ? p.brackets.title : null,
      status:         p.brackets ? p.brackets.status : null,
      eliminated:     !!p.eliminated_at,
    }));
    return res.json({ success: true, data: liens });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Résolution d'un code public (page /v/<code>) ─────────────────────────────
votelinkRouter.get('/:code', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    const code = String(req.params.code || '').trim().toLowerCase();
    if (!code) return res.status(400).json({ success: false, error: 'MISSING_CODE' });

    const { data: part } = await supabase
      .from('bracket_participants')
      .select('id, bracket_id, video_id, user_id, eliminated_at, suspended_at, score, stars_count, hearts_count, users(name, avatar_url)')
      .eq('public_code', code)
      .maybeSingle();
    if (!part) return res.status(404).json({ success: false, error: 'CODE_NOT_FOUND' });

    // Journaliser le clic (fire-and-forget ; purement statistique).
    // noclick=1 : retour post-vote (écran de fin) -> ne pas re-compter un clic (KPI propre).
    const ref     = (req.query.ref   ? String(req.query.ref)   : '').slice(0, 64) || null;
    const canal   = (req.query.canal ? String(req.query.canal) : '').slice(0, 32) || null;
    const noClick = String(req.query.noclick || '') === '1';
    if (!noClick) {
      supabase.from('vote_link_clicks')
        .insert({ code, participant_id: (part as any).id, ambassadeur_code: ref, canal })
        .then(() => {}, () => {});
    }

    const { data: bracket } = await supabase
      .from('brackets')
      .select('id, title, discipline, status, current_round, total_cagnotte, type')
      .eq('id', (part as any).bracket_id)
      .maybeSingle();

    const { data: rounds } = await supabase
      .from('bracket_rounds')
      .select('round, objectif_montant, montant_collecte, status')
      .eq('bracket_id', (part as any).bracket_id)
      .in('status', ['active', 'in_progress'])
      .order('round', { ascending: false })
      .limit(1);
    const activeRound = (rounds && rounds[0]) || null;

    let video: any = null;
    if ((part as any).video_id) {
      const { data: v } = await supabase
        .from('videos')
        .select('id, title, storage_url')
        .eq('id', (part as any).video_id)
        .maybeSingle();
      video = v || null;
    }

    // Prix ★/❤️ (réglages) — pour les présélections, inchangés.
    let etoile = 100, coeur = 200;
    try {
      const { data: stx } = await supabase
        .from('settings').select('key, value')
        .in('key', ['bracket_vote_amount', 'bracket_heart_amount']);
      for (const s of (stx || []) as any[]) {
        const n = Number(s.value);
        if (s.key === 'bracket_vote_amount'  && Number.isFinite(n) && n > 0) etoile = n;
        if (s.key === 'bracket_heart_amount' && Number.isFinite(n) && n > 0) coeur  = n;
      }
    } catch {}

    const bStatut = bracket ? String((bracket as any).status || '') : '';
    const ouvert  = !!bracket
      && (bStatut === 'active' || bStatut === 'in_progress')
      && !(part as any).eliminated_at
      && !(part as any).suspended_at;

    const u: any = (part as any).users || null;
    return res.json({
      success: true,
      data: {
        participant: {
          id:          (part as any).id,
          name:        u ? u.name : null,
          avatar_url:  u ? u.avatar_url : null,
          video_id:    (part as any).video_id,
          eliminated:  !!(part as any).eliminated_at,
          suspended:   !!(part as any).suspended_at,
          score:       (part as any).score ?? 0,
          stars_count: (part as any).stars_count ?? 0,
          hearts_count:(part as any).hearts_count ?? 0,
        },
        bracket: bracket ? {
          id: (bracket as any).id, title: (bracket as any).title,
          discipline: (bracket as any).discipline, status: (bracket as any).status,
          type: (bracket as any).type,
        } : null,
        active_round: activeRound,
        video,
        prix: { etoile, coeur },
        ouvert,
        ref, canal,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default votelinkRouter;
