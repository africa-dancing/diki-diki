// src/controllers/users.controller.ts
import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { z } from 'zod';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthRequest extends Request {
  user?: { userId: string; role?: string };
}

// ─── GET /v1/users/:id/profile — Profil public ───────────────────────────────
export const getPublicProfile = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id?.match(/^[0-9a-f-]{36}$/i)) {
    return res.status(400).json({ success: false, error: 'ID invalide' });
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      avatar_url,
      bio,
      country,
      is_verified,
      is_public,
      total_likes,
      total_videos,
      followers_count,
      created_at
    `)
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (error || !profile) {
    return res.status(404).json({ success: false, error: 'Profil introuvable ou privé.' });
  }

  // 6 dernières vidéos approuvées
  const { data: videos } = await supabase
    .from('videos')
    .select('id, titre, thumbnail_url, vues, statut, created_at')
    .eq('user_id', id)
    .eq('statut', 'approuvé')
    .order('created_at', { ascending: false })
    .limit(6);

  return res.status(200).json({
    success: true,
    data: { ...profile, recent_videos: videos ?? [] },
  });
};

// ─── GET /v1/users/:id/videos — Vidéos publiques d'un utilisateur ─────────────
export const getPublicVideos = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id?.match(/^[0-9a-f-]{36}$/i)) {
    return res.status(400).json({ success: false, error: 'ID invalide' });
  }

  const page       = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit      = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
  const discipline = req.query.discipline as string | undefined;
  const from       = (page - 1) * limit;
  const to         = from + limit - 1;

  let query = supabase
    .from('videos')
    .select(`
      id,
      titre,
      description,
      discipline,
      titre_piste,
      track_artist,
      track_genre,
      thumbnail_url,
      storage_url,
      durée_sec,
      vues,
      statut,
      created_at
    `, { count: 'exact' })
    .eq('user_id', id)
    .eq('statut', 'approuvé')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (discipline) query = query.eq('discipline', discipline);

  const { data: videos, error, count } = await query;

  if (error) {
    return res.status(500).json({ success: false, error: 'Erreur récupération vidéos.' });
  }

  return res.status(200).json({
    success: true,
    data: videos ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  });
};

// ─── GET /v1/users/earnings — Montant encaissé ────────────────────────────────
export const getEarnings = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Non authentifie.' });
  /*DKDK_EARNINGS_V2*/
  // Total gagne en tout : somme des gains reels (bracket_win success),
  // montant deja net de commission. On NE lit PLUS wallets (argent de vote).
  const { data: gains, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'bracket_win')
    .eq('status', 'success');
  if (error) {
    return res.status(500).json({ success: false, error: 'Erreur lecture gains.' });
  }
  const totalEarned = (gains || []).reduce(function (s, t) { return s + (t.amount || 0); }, 0);
  // total_earned a la racine (le frontend lit d.total_earned) + copie dans data
  return res.status(200).json({ success: true, total_earned: totalEarned, data: { total_earned: totalEarned } });
};

// GET /v1/users/balance - Solde retirable (calcule depuis transactions) /*DKDK_BALANCE_HDR*/
export const getBalance = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Non authentifie.' });
  /*DKDK_BALANCE*/
  // Gains reels gagnes en competition (bracket_win + success)
  const { data: gains, error: gErr } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'bracket_win')
    .eq('status', 'success');
  if (gErr) {
    return res.status(500).json({ success: false, error: 'Erreur lecture gains.' });
  }
  // Retraits deja partis (payout : sent ou success)
  const { data: retraits, error: rErr } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'payout')
    .in('status', ['pending', 'sent', 'success']); /*DKDK_BALANCE_PENDING*/
  if (rErr) {
    return res.status(500).json({ success: false, error: 'Erreur lecture retraits.' });
  }
  const totalGains = (gains || []).reduce(function (s, t) { return s + (t.amount || 0); }, 0);
  const totalRetraits = (retraits || []).reduce(function (s, t) { return s + (t.amount || 0); }, 0);
  const soldeRetirable = totalGains - totalRetraits;
  return res.status(200).json({
    success: true,
    data: {
      solde_retirable: soldeRetirable,
      total_gagne: totalGains,
      total_retire: totalRetraits,
    },
  });
};

// ─── GET /v1/users/privacy — Lire les préférences de confidentialité ──────────
export const getPrivacy = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Non authentifié.' });

  const { data, error } = await supabase
    .from('profiles')
    .select('is_public, show_earnings, show_votes')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return res.status(404).json({ success: false, error: 'Profil introuvable.' });
  }

  return res.status(200).json({ success: true, data });
};

// ─── PUT /v1/users/privacy — Sauvegarder confidentialité ─────────────────────
const PrivacySchema = z.object({
  is_public:     z.boolean().optional(),
  show_earnings: z.boolean().optional(),
  show_votes:    z.boolean().optional(),
});

export const updatePrivacy = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Non authentifié.' });

  const parsed = PrivacySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour.' });
  }

  const { error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', userId);

  if (error) {
    return res.status(500).json({ success: false, error: 'Mise à jour échouée.' });
  }

  return res.status(200).json({ success: true, message: 'Confidentialité mise à jour.' });
};