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
  try { await rolloverUser(userId); } catch { /* best-effort */ }
  try { await evaluateBadges(userId); } catch { /* best-effort */ }
  let echos = 0;
  try {
    const { data: b } = await supabase.from('engagement_balance').select('echos').eq('user_id', userId).maybeSingle();
    echos = Number((b as any)?.echos ?? 0);
  } catch { /* noop */ }
  let statut = { code: 'messager', nom: 'Le Messager' };
  let consecutives = 0;
  try {
    const { data: st } = await supabase.from('user_tier_status').select('tier_code, saisons_validees_consecutives').eq('user_id', userId).maybeSingle();
    const code = (st as any)?.tier_code || 'messager';
    consecutives = Number((st as any)?.saisons_validees_consecutives || 0);
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
  let sources: any[] = [];
  try {
    const { data: src } = await supabase.from('engagement_by_action').select('action, echos, n').eq('user_id', userId);
    sources = (src || [])
      .map((x: any) => ({ action: x.action as string, echos: Number(x.echos || 0), n: Number(x.n || 0) }))
      .filter((x: any) => x.echos > 0)
      .sort((a: any, b: any) => b.echos - a.echos);
  } catch { /* vue absente -> pas d'historique, non bloquant */ }
  let progression: any = null;
  try { const plaf = await _plafondPct(); progression = await getProgression(userId, statut.code, plaf); } catch { /* noop */ }
  return { actif: true, echos, statut, badges, sources, progression, consecutives };
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


// Crédite les Échos « partage vérifié » (barème `echo_partage`) pour une affiche VALIDE,
// UNE SEULE FOIS par (utilisateur × challenge) — déduplication sur le ledger (anti-farm).
// Best-effort, gated par l'interrupteur. Ne jette jamais.
export async function awardAfficheValide(userId: string, bracketId: string): Promise<void> {
  try {
    if (!userId || !bracketId) return;
    const s: any = await getGamificationSettings();
    if (!s || !s.module_actif) return; // interrupteur maître OFF -> rien
    const n = Math.max(0, Math.floor(Number(s.echo_partage ?? 2)));
    if (n <= 0) return;
    const ref = 'affiche:' + bracketId;
    const { data: existing } = await supabase.from('engagement_ledger')
      .select('id').eq('user_id', userId).eq('action', 'affiche').eq('ref', ref).limit(1).maybeSingle();
    if (existing) return; // déjà crédité pour ce challenge -> idempotent
    await supabase.from('engagement_ledger').insert({ user_id: userId, action: 'affiche', echos: n, ref });
    ensureTierStatus(userId).catch(() => {});
  } catch {
    // best-effort : jamais bloquant pour la génération d'affiche
  }
}


// ═══════════════════════ PHASE 3 : saisons, lettres, classement, badges ═══════════════════════
// Fuseau WAT (UTC+1), trimestres calendaires. Rattrapage SOUPLE (3 mois validés / saison).
// AUCUN argent. Tout best-effort, gated par module_actif.

const WAT_OFFSET_MS = 60 * 60 * 1000;
const TIER_ORDER = ['messager', 'porteparole', 'ambassadeur', 'heraut'];

function _watParts(d: Date) {
  const w = new Date(d.getTime() + WAT_OFFSET_MS);
  return { y: w.getUTCFullYear(), m: w.getUTCMonth() + 1 };
}
function _monthRangeUTC(y: number, m: number) {
  const start = Date.UTC(y, m - 1, 1) - WAT_OFFSET_MS;
  const end = Date.UTC(y, m, 1) - WAT_OFFSET_MS;
  return { startISO: new Date(start).toISOString(), endISO: new Date(end).toISOString() };
}
function _seasonOf(y: number, m: number) {
  const q = Math.floor((m - 1) / 3);
  return { key: y + '-S' + (q + 1), q, firstMonth: q * 3 + 1, idx: (m - 1) % 3 };
}
function _seasonMonths(key: string): { y: number; m: number }[] {
  const parts = key.split('-S');
  const y = Number(parts[0]);
  const q = Number(parts[1]) - 1;
  return [0, 1, 2].map((i) => ({ y, m: q * 3 + 1 + i }));
}
function _prevSeasonKey(key: string): string {
  const parts = key.split('-S');
  let y = Number(parts[0]);
  let s = Number(parts[1]) - 1;
  if (s === 0) { y -= 1; s = 3; } else { s -= 1; }
  return y + '-S' + (s + 1);
}
function _tierNom(code: string): string {
  const map: any = { messager: 'Le Messager', porteparole: 'Le Porte-parole', ambassadeur: "L'Ambassadeur", heraut: 'Le Héraut' };
  return map[code] || code;
}

async function _plafondPct(): Promise<number> {
  try { const g: any = await getGamificationSettings(); return Number(g?.plafond_coup_pouce_pct ?? 20); } catch { return 20; }
}
async function _defiFor(tierCode: string): Promise<number> {
  try { const { data } = await supabase.from('tiers').select('defi_mensuel').eq('code', tierCode).maybeSingle(); return Number((data as any)?.defi_mensuel ?? 15); } catch { return 15; }
}
async function _firstActivity(userId: string): Promise<number | null> {
  try { const { data } = await supabase.from('engagement_ledger').select('created_at').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle(); const t = (data as any)?.created_at; return t ? new Date(t).getTime() : null; } catch { return null; }
}
async function _awardBadge(userId: string, code: string): Promise<void> {
  try { await supabase.from('user_badges').upsert({ user_id: userId, badge_code: code }, { onConflict: 'user_id,badge_code', ignoreDuplicates: true }); } catch { /* noop */ }
}
async function _notify(userId: string, title: string, body: string): Promise<void> {
  try { await supabase.from('notifications').insert({ user_id: userId, type: 'fidelite', title, body }); } catch { /* table/colonnes variables -> non bloquant */ }
}
async function _sumKind(userId: string, startISO: string, endISO: string): Promise<{ payant: number; gratuit: number }> {
  try {
    const { data } = await supabase.from('engagement_ledger').select('action, echos').eq('user_id', userId).gte('created_at', startISO).lt('created_at', endISO);
    let payant = 0, gratuit = 0;
    for (const r of (data || [])) { const e = Number((r as any).echos || 0); if ((r as any).action === 'vote') payant += e; else gratuit += e; }
    return { payant, gratuit };
  } catch { return { payant: 0, gratuit: 0 }; }
}
function _progMois(payant: number, gratuit: number, defi: number, plafondPct: number) {
  const capG = Math.floor((plafondPct / 100) * defi);
  const total = payant + Math.min(gratuit, capG);
  return { total, valide: total >= defi, capG };
}
async function _moisValidesSaison(userId: string, seasonKey: string, defi: number, plafondPct: number, upTo?: { y: number; m: number }): Promise<number> {
  let n = 0;
  for (const mm of _seasonMonths(seasonKey)) {
    if (upTo && (mm.y > upTo.y || (mm.y === upTo.y && mm.m > upTo.m))) continue;
    const { startISO, endISO } = _monthRangeUTC(mm.y, mm.m);
    const { payant, gratuit } = await _sumKind(userId, startISO, endISO);
    if (_progMois(payant, gratuit, defi, plafondPct).valide) n++;
  }
  return n;
}

// Progression du mois + saison en cours (lecture seule).
export async function getProgression(userId: string, tierCode: string, plafondPct: number): Promise<any> {
  const now = _watParts(new Date());
  const season = _seasonOf(now.y, now.m);
  const defi = await _defiFor(tierCode);
  const { startISO, endISO } = _monthRangeUTC(now.y, now.m);
  const { payant, gratuit } = await _sumKind(userId, startISO, endISO);
  const pm = _progMois(payant, gratuit, defi, plafondPct);
  const moisValides = await _moisValidesSaison(userId, season.key, defi, plafondPct, { y: now.y, m: now.m });
  const lettre = ['—', 'C', 'B', 'A'][Math.min(3, moisValides)];
  return {
    saison: season.key,
    defi,
    mois: {
      payant,
      gratuit: Math.min(gratuit, pm.capG),
      total: pm.total,
      valide: pm.valide,
      manque: Math.max(0, defi - pm.total),
      plafondGratuit: pm.capG,
    },
    moisValidesSaison: moisValides,
    lettre,
  };
}

// Montée / régression aux frontières de saison. Idempotent (last_season_processed).
export async function rolloverUser(userId: string): Promise<void> {
  try {
    const set = await _settings();
    if (!set.actif) return;
    const plafondPct = await _plafondPct();
    const { data: st } = await supabase.from('user_tier_status').select('tier_code, last_season_processed, saisons_validees_consecutives').eq('user_id', userId).maybeSingle();
    if (!st) return;
    let tier = (st as any).tier_code || 'messager';
    let processed = (st as any).last_season_processed || null;
    let consec = Number((st as any).saisons_validees_consecutives || 0);
    const now = _watParts(new Date());
    const curSeason = _seasonOf(now.y, now.m).key;
    // Saisons terminées non encore traitées (du plus ancien au plus récent), bornées.
    const stack: string[] = [];
    let k = _prevSeasonKey(curSeason);
    let guard = 0;
    while (k && k !== processed && guard < 8) { stack.push(k); k = _prevSeasonKey(k); guard++; }
    const seasons = stack.reverse();
    if (seasons.length === 0) return;
    const premiere = await _firstActivity(userId);
    for (const S of seasons) {
      const defi = await _defiFor(tier);
      const mv = await _moisValidesSaison(userId, S, defi, plafondPct);
      if (mv >= 3) {
        const i = TIER_ORDER.indexOf(tier);
        const next = i >= 0 && i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : tier;
        consec += 1;
        if (next !== tier) {
          tier = next;
          await _notify(userId, 'Montée de statut', 'Bravo, saison validée : tu passes ' + _tierNom(tier) + '. Continue de porter les talents de l Arène.');
          if (tier === 'ambassadeur' && premiere && (Date.now() - premiere) <= 365 * 24 * 3600 * 1000) { await _awardBadge(userId, 'ascension'); }
        }
        if (consec >= 4) { await _awardBadge(userId, 'fidele'); }
      } else if (mv === 0) {
        const i = TIER_ORDER.indexOf(tier);
        const prev = i > 0 ? TIER_ORDER[i - 1] : tier;
        consec = 0;
        if (prev !== tier) { tier = prev; await _notify(userId, 'Statut ajuste', 'Ta saison est passee : ton statut redescend d un cran, en douceur. Rien n est perdu, tu remontes des que tu reatteins l objectif.'); }
      } else {
        consec = 0;
      }
      processed = S;
    }
    await supabase.from('user_tier_status').update({ tier_code: tier, last_season_processed: processed, saisons_validees_consecutives: consec, updated_at: new Date().toISOString() }).eq('user_id', userId);
  } catch { /* best-effort */ }
}

// Badges automatiques réalisables aujourd'hui (Porte-voix, Explorateur ; Fidèle/Ascension via rollover).
export async function evaluateBadges(userId: string): Promise<void> {
  try {
    const { data: ea } = await supabase.from('engagement_by_action').select('n').eq('user_id', userId).eq('action', 'affiche').maybeSingle();
    if (Number((ea as any)?.n || 0) >= 10) { await _awardBadge(userId, 'portevoix'); }
  } catch { /* noop */ }
  try {
    const { data: votes } = await supabase.from('engagement_ledger').select('ref').eq('user_id', userId).eq('action', 'vote').limit(2000);
    const pids = Array.from(new Set((votes || []).map((r: any) => (typeof r.ref === 'string' && r.ref.indexOf('vote:') === 0) ? r.ref.slice(5) : null).filter(Boolean)));
    if (pids.length) {
      const { data: parts } = await supabase.from('bracket_participants').select('bracket_id').in('id', pids as string[]);
      const bids = Array.from(new Set((parts || []).map((x: any) => x.bracket_id).filter(Boolean)));
      if (bids.length) {
        const { data: brs } = await supabase.from('brackets').select('discipline').in('id', bids as string[]);
        const disc = new Set((brs || []).map((b: any) => b.discipline).filter(Boolean));
        if (disc.size >= 3) { await _awardBadge(userId, 'explorateur'); }
      }
    }
  } catch { /* noop */ }
}

// Classement (leaderboard) AU PSEUDO uniquement (jamais le vrai nom). window: semaine|mois|saison|all.
export async function getLeaderboard(windowKey: string, limit = 50): Promise<any> {
  const set = await _settings();
  if (!set.actif) return { actif: false, rows: [] };
  try {
    let rows: { user_id: string; echos: number }[] = [];
    if (windowKey === 'all') {
      const { data } = await supabase.from('engagement_balance').select('user_id, echos').order('echos', { ascending: false }).limit(limit);
      rows = (data || []).map((r: any) => ({ user_id: r.user_id, echos: Number(r.echos || 0) }));
    } else {
      const now = _watParts(new Date());
      let startISO: string;
      if (windowKey === 'mois') { startISO = _monthRangeUTC(now.y, now.m).startISO; }
      else if (windowKey === 'saison') { const sea = _seasonOf(now.y, now.m); startISO = _monthRangeUTC(now.y, sea.firstMonth).startISO; }
      else { startISO = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(); }
      const { data } = await supabase.from('engagement_ledger').select('user_id, echos').gte('created_at', startISO).limit(20000);
      const agg: Record<string, number> = {};
      for (const r of (data || [])) { const u = (r as any).user_id; if (!u) continue; agg[u] = (agg[u] || 0) + Number((r as any).echos || 0); }
      rows = Object.entries(agg).map(([user_id, e]) => ({ user_id, echos: e as number })).sort((a, b) => b.echos - a.echos).slice(0, limit);
    }
    const ids = rows.map((r) => r.user_id);
    const nameMap: Record<string, string> = {};
    if (ids.length) {
      const { data: us } = await supabase.from('users').select('id, username').in('id', ids);
      for (const u of (us || [])) { nameMap[(u as any).id] = (u as any).username ? '@' + (u as any).username : 'Anonyme'; }
    }
    return { actif: true, window: windowKey, rows: rows.filter((r) => r.echos > 0).map((r, i) => ({ rang: i + 1, pseudo: nameMap[r.user_id] || 'Anonyme', echos: r.echos })) };
  } catch { return { actif: true, window: windowKey, rows: [] }; }
}

// Crédit « commentaire vérifié » : 1 fois par vidéo distincte (dédup ledger). Best-effort, gated.
export async function awardComment(userId: string, videoId: string): Promise<void> {
  try {
    const g: any = await getGamificationSettings();
    if (!g || !g.module_actif) return;
    const n = Math.max(0, Math.floor(Number(g.echo_commentaire ?? 1)));
    if (n <= 0 || !userId || !videoId) return;
    const ref = 'comment:' + videoId;
    const { data: ex } = await supabase.from('engagement_ledger').select('id').eq('user_id', userId).eq('action', 'commentaire').eq('ref', ref).limit(1).maybeSingle();
    if (ex) return;
    await supabase.from('engagement_ledger').insert({ user_id: userId, action: 'commentaire', echos: n, ref });
    ensureTierStatus(userId).catch(() => {});
  } catch { /* best-effort */ }
}
