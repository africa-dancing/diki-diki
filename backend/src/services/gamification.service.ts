// backend/src/services/gamification.service.ts
// DKDK_GAMIFICATION — Module Fidélité (« Les Échos »), PHASE 1 (Fondations).
// AUCUNE logique d'argent : les Échos ne sont ni argent ni vote ; table séparée.
// Interrupteur maître (gamification_settings.module_actif) : si OFF -> on n'attribue RIEN.
// Toutes les attributions sont BEST-EFFORT : elles ne doivent JAMAIS casser un vote.
import { supabase } from '../../config/supabase';

let _cache: { actif: boolean; echoParVote: number; at: number } | null = null;
const TTL_MS = 30_000;

async function _settings(): Promise<{ actif: boolean; echoParVote: number; at: number }> {
  const now = Date.now();
  if (_cache && now - _cache.at < TTL_MS) return _cache;
  try {
    const { data } = await supabase
      .from('gamification_settings')
      .select('module_actif, echo_par_vote')
      .eq('id', 1)
      .maybeSingle();
    _cache = { actif: !!(data as any)?.module_actif, echoParVote: Number((data as any)?.echo_par_vote ?? 1), at: now };
  } catch {
    _cache = { actif: false, echoParVote: 1, at: now };
  }
  return _cache;
}

// Attribution générique. Silencieuse si le module est inactif. Ne jette JAMAIS.
export async function awardEchos(params: { userId: string; action: string; echos: number; ref?: string }): Promise<void> {
  try {
    const s = await _settings();
    if (!s.actif) return;                 // interrupteur maître OFF -> rien
    if (!params.userId || !params.echos) return;
    await supabase.from('engagement_ledger').insert({
      user_id: params.userId,
      action:  params.action,
      echos:   params.echos,
      ref:     params.ref ?? null,
    });
  } catch {
    // best-effort : jamais bloquant
  }
}

// Vote payant -> Échos = unités payées (étoile=1, cœur=2) x echo_par_vote. Best-effort.
export async function awardVote(userId: string, unites: number, ref?: string): Promise<void> {
  try {
    const s = await _settings();
    if (!s.actif) return;
    const n = Math.max(0, Math.floor(unites || 0)) * (s.echoParVote || 1);
    if (n <= 0) return;
    await awardEchos({ userId, action: 'vote', echos: n, ref });
  } catch {
    // best-effort
  }
}

// --- Lecture / écriture des réglages (ADMIN) ---
export async function getGamificationSettings(): Promise<any> {
  const { data } = await supabase.from('gamification_settings').select('*').eq('id', 1).maybeSingle();
  return data || null;
}

export async function updateGamificationSettings(patch: any): Promise<any> {
  const allowed = ['module_actif', 'echo_par_vote', 'echo_parrainage', 'echo_partage', 'echo_commentaire', 'plafond_coup_pouce_pct', 'fuseau'];
  const clean: any = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (patch && k in patch) clean[k] = patch[k];
  const { data, error } = await supabase.from('gamification_settings').update(clean).eq('id', 1).select('*').maybeSingle();
  if (error) throw error;
  _cache = null; // invalide le cache de l'interrupteur
  return data;
}
