// src/controllers/users.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
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
    .in('type', ['bracket_win', 'soutien_gain'])
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
    .in('type', ['bracket_win', 'soutien_gain'])
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

// ─── Gestion du compte utilisateur (email / password / security) /*DKDK_ACCOUNT*/ ───

// PUT /v1/users/email — Modifier l'adresse email
export const updateEmail = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Non authentifie.' });
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email || !email.includes('@') || email.length < 5) {
    return res.status(400).json({ success: false, error: 'Email invalide.' });
  }
  // Verifier que l'email n'est pas deja pris par un autre compte
  const { data: existing } = await supabase
    .from('users').select('id').eq('email', email).maybeSingle();
  if (existing && existing.id !== userId) {
    return res.status(409).json({ success: false, error: 'Cet email est deja utilise.' });
  }
  const { error } = await supabase.from('users').update({ email }).eq('id', userId);
  if (error) return res.status(500).json({ success: false, error: 'Mise a jour echouee.' });
  return res.json({ success: true, email });
};

// PUT /v1/users/password — Changer le mot de passe (verifie l'ancien)
export const updatePassword = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Non authentifie.' });
  const oldPassword = req.body?.old_password || '';
  const newPassword = req.body?.new_password || '';
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Ancien et nouveau mot de passe requis.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, error: 'Le nouveau mot de passe doit faire au moins 8 caracteres.' });
  }
  // Recuperer le hash actuel
  const { data: user, error: uErr } = await supabase
    .from('users').select('password').eq('id', userId).single();
  if (uErr || !user) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  // Verifier l'ancien mot de passe
  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) return res.status(403).json({ success: false, error: 'Mot de passe actuel incorrect.' });
  // Hasher et enregistrer le nouveau
  const hashed = await bcrypt.hash(newPassword, 12);
  const { error } = await supabase.from('users').update({ password: hashed }).eq('id', userId);
  if (error) return res.status(500).json({ success: false, error: 'Mise a jour echouee.' });
  return res.json({ success: true });
};

// PUT /v1/users/security — Mettre a jour le telephone (et prefs si colonnes presentes)
export const updateSecurity = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, error: 'Non authentifie.' });
  const phone = (req.body?.phone || '').trim();
  const patch: any = {};
  if (phone) patch.phone = phone;
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ success: false, error: 'Aucune donnee a mettre a jour.' });
  }
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) return res.status(500).json({ success: false, error: 'Mise a jour echouee.' });
  return res.json({ success: true });
};

