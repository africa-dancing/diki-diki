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
    ensureTierStatus(params.userId).catch(() => {}); /*DKDK_P2 — crée/rafraîchit le statut (best-effort)*/
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


// ───────────────────────── PHASE 2 : statuts & badges ─────────────────────────
// Crée la ligne de statut au niveau « Le Messager » à la 1re activité, rafraîchit
// la dernière activité. Best-effort ; n'écrit que si le module est actif (appelé via awardEchos).
export async function ensureTierStatus(userId: string): Promise<void> {
  try {
    if (!userId) return;
    await supabase.from('user_tier_status').upsert(
      { user_id: userId, derniere_activite: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch {
    // best-effort
  }
}

// Vue « fidélité » d'un votant (lecture seule). Renvoie { actif:false } si l'interrupteur est OFF.
export async function getMyGamification(userId: string): Promise<any> {
  const s = await _settings();
  if (!s.actif) return { actif: false };
  let echos = 0;
  try {
    const { data: b } = await supabase.from('engagement_balance').select('echos').eq('user_id', userId).maybeSingle();
    echos = Number((b as any)?.echos ?? 0);
  } catch { /* noop */ }
  let statut = { code: 'messager', nom: 'Le Messager' };
  try {
    const { data: st } = await supabase.from('user_tier_status').select('tier_code').eq('user_id', userId).maybeSingle();
    const code = (st as any)?.tier_code || 'messager';
    const { data: t } = await supabase.from('tiers').select('code, nom').eq('code', code).maybeSingle();
    if (t) statut = { code: (t as any).code, nom: (t as any).nom };
  } catch { /* noop */ }
  let badges: any[] = [];
  try {
    const { data: ub } = await supabase.from('user_badges').select('badge_code').eq('user_id', userId);
    const codes = (ub || []).map((x: any) => x.badge_code);
    if (codes.length) {
      const { data: bd } = await supabase.from('badges').select('code, nom, icone').in('code', codes as string[]);
      badges = bd || [];
    }
  } catch { /* noop */ }
  return { actif: true, echos, statut, badges };
}


// Vue PUBLIQUE (non sensible) pour la page /les-echos : barème + statuts (tiers).
// Lecture seule, best-effort. Ne renvoie jamais de données sensibles.
export async function getPublicGamification(): Promise<any> {
  let s: any = null;
  try { s = await getGamificationSettings(); } catch { /* noop */ }
  const bareme = {
    module_actif: !!(s && s.module_actif),
    echo_par_vote: Number(s?.echo_par_vote ?? 1),
    echo_parrainage: Number(s?.echo_parrainage ?? 3),
    echo_partage: Number(s?.echo_partage ?? 2),
    echo_commentaire: Number(s?.echo_commentaire ?? 1),
    plafond_coup_pouce_pct: Number(s?.plafond_coup_pouce_pct ?? 20),
  };
  let tiers: any[] = [];
  try {
    const { data } = await supabase.from('tiers').select('code, nom, ordre, defi_mensuel').order('ordre');
    tiers = data || [];
  } catch { /* table absente -> la page garde ses valeurs par défaut */ }
  return { bareme, tiers };
}
