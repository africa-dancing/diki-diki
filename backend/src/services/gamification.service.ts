// backend/src/services/gamification.service.ts
// DKDK_GAMIFICATION — Module Fidélité (« Les Échos »), PHASE 1 (Fondations).
// AUCUNE logique d'argent : les Échos ne sont ni argent ni vote ; table séparée.
// Interrupteur maître (gamification_settings.module_actif) : si OFF -> on n'attribue RIEN.
// Toutes les attributions sont BEST-EFFORT : elles ne doivent JAMAIS casser un vote.
import { supabase } from '../../config/supabase';
import { createHash, createHmac, randomBytes } from 'crypto';

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


// ─────────────────────────────────────────────────────────────────
// PHASE 5 — Tirages (cadeaux). Provably-fair. Cadeaux MATERIELS, JAMAIS du cash.
// Reutilise les helpers saison (_moisValidesSaison, _defiFor, _plafondPct, TIER_ORDER).
// Gated ADMIN cote routes ; aucune attribution d'argent ici.
// ─────────────────────────────────────────────────────────────────

async function _splitLocalPct(): Promise<number> {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'fonds_split_local_pct').maybeSingle();
    const n = parseInt((data as any)?.value ?? '60', 10);
    return isNaN(n) ? 60 : Math.min(100, Math.max(0, n));
  } catch { return 60; }
}
async function _settingStr(key: string, def: string): Promise<string> {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
    const v = (data as any)?.value;
    return (v === null || v === undefined || v === '') ? def : String(v);
  } catch { return def; }
}

// Pots disponibles : reserve Fonds Cadeaux repartie local/grand, moins deja utilise.
export async function getFondsPots(): Promise<any> {
  let total = 0;
  try { const { data } = await supabase.from('fonds_cadeaux_ledger').select('montant'); total = (data || []).reduce((acc: number, r: any) => acc + Number(r.montant || 0), 0); } catch { /* noop */ }
  let usedLocal = 0, usedGrand = 0;
  try {
    const { data } = await supabase.from('tirages').select('type, pot_utilise, statut').eq('statut', 'execute');
    for (const r of (data || [])) { const v = Number((r as any).pot_utilise || 0); if ((r as any).type === 'grand') usedGrand += v; else usedLocal += v; }
  } catch { /* noop */ }
  const splitLocal = await _splitLocalPct();
  const potLocalTot = Math.floor(total * splitLocal / 100);
  const potGrandTot = total - potLocalTot;
  return {
    reserve_totale: total,
    local: { alloue: potLocalTot, utilise: usedLocal, disponible: Math.max(0, potLocalTot - usedLocal) },
    grand: { alloue: potGrandTot, utilise: usedGrand, disponible: Math.max(0, potGrandTot - usedGrand) },
    split_local_pct: splitLocal,
  };
}

// Catalogue des cadeaux
export async function listGiftCatalog(): Promise<any[]> {
  try { const { data } = await supabase.from('gift_catalog').select('*').order('type').order('mois', { nullsFirst: true }).order('ordre'); return data || []; } catch { return []; }
}
export async function upsertGiftCatalog(row: any): Promise<any> {
  const type = row.type === 'grand' ? 'grand' : 'local';
  const clean: any = {
    type,
    mois: type === 'grand' ? null : (row.mois ? Number(row.mois) : null),
    libelle: String(row.libelle || '').slice(0, 200),
    valeur: Math.max(0, Math.floor(Number(row.valeur || 0))),
    statut_min: row.statut_min || null,
    lettre: (row.lettre === 'C' || row.lettre === 'B' || row.lettre === 'A') ? row.lettre : null,
    actif: row.actif !== false,
    ordre: Number(row.ordre || 0),
  };
  if (row.id) { const { data } = await supabase.from('gift_catalog').update(clean).eq('id', row.id).select('*').maybeSingle(); return data; }
  const { data } = await supabase.from('gift_catalog').insert(clean).select('*').maybeSingle(); return data;
}
export async function deleteGiftCatalog(id: string): Promise<void> {
  try { await supabase.from('gift_catalog').delete().eq('id', id); } catch { /* noop */ }
}

// Pool eligible : votants ayant valide la saison (>=3 mois). 'des Le Messager'.
// statutMin optionnel (grand tirage). Exclut les comptes non actifs (bannis/suspendus).
async function _poolEligible(saison: string, statutMin?: string): Promise<string[]> {
  const plafondPct = await _plafondPct();
  const { data: sts } = await supabase.from('user_tier_status').select('user_id, tier_code').limit(100000);
  let candidats = ((sts || []) as any[]);
  if (statutMin) {
    const minIdx = TIER_ORDER.indexOf(statutMin);
    candidats = candidats.filter((r) => TIER_ORDER.indexOf(r.tier_code || 'messager') >= (minIdx < 0 ? 0 : minIdx));
  }
  const ids = candidats.map((r) => r.user_id);
  const nonActifs = new Set<string>();
  if (ids.length) {
    const { data: us } = await supabase.from('users').select('id, status').in('id', ids);
    for (const u of (us || [])) { const st = (u as any).status; if (st && st !== 'actif') nonActifs.add((u as any).id); }
  }
  const eligibles: string[] = [];
  for (const r of candidats) {
    if (nonActifs.has(r.user_id)) continue;
    const defi = await _defiFor(r.tier_code || 'messager');
    const mv = await _moisValidesSaison(r.user_id, saison, defi, plafondPct);
    if (mv >= 3) eligibles.push(r.user_id);
  }
  return eligibles.sort();
}

// Preparer un tirage : commit (publie graine_hash), snapshot du pool. Ne tire RIEN.
export async function prepareTirage(params: { type: string; saison: string; adminId?: string; note?: string }): Promise<any> {
  const type = params.type === 'grand' ? 'grand' : 'local';
  const saison = String(params.saison || '').trim();
  if (!saison) throw new Error('SAISON_REQUISE');
  const statutMin = type === 'grand' ? await _settingStr('tirage_grand_statut_min', 'ambassadeur') : undefined;
  const pool = await _poolEligible(saison, statutMin);
  const pots = await getFondsPots();
  const potDispo = type === 'grand' ? pots.grand.disponible : pots.local.disponible;
  const graine = randomBytes(32).toString('hex');
  const graineHash = createHash('sha256').update(graine).digest('hex');
  const { data: t } = await supabase.from('tirages').insert({
    type, saison, statut: 'prepare', graine, graine_hash: graineHash,
    pool_taille: pool.length, pot_disponible: potDispo, created_by: params.adminId || null, note: params.note || null,
  }).select('*').maybeSingle();
  const tirageId = (t as any)?.id;
  if (tirageId && pool.length) {
    const rows = pool.map((uid, i) => ({ tirage_id: tirageId, user_id: uid, rang_tri: i }));
    for (let i = 0; i < rows.length; i += 500) { await supabase.from('tirage_participants').insert(rows.slice(i, i + 500)); }
  }
  return { id: tirageId, type, saison, pool_taille: pool.length, graine_hash: graineHash, pot_disponible: potDispo };
}

// Executer un tirage : reveal graine, selection deterministe HMAC (verifiable), attribue les lots.
export async function executeTirage(tirageId: string, catalogIds: string[]): Promise<any> {
  const { data: t } = await supabase.from('tirages').select('*').eq('id', tirageId).maybeSingle();
  if (!t) throw new Error('TIRAGE_INCONNU');
  if ((t as any).statut !== 'prepare') throw new Error('TIRAGE_DEJA_TRAITE');
  const type = (t as any).type;
  const graine = (t as any).graine as string;
  const { data: lots } = await supabase.from('gift_catalog').select('*').in('id', (catalogIds && catalogIds.length) ? catalogIds : ['00000000-0000-0000-0000-000000000000']);
  const lotList = ((lots || []) as any[]);
  if (!lotList.length) throw new Error('AUCUN_LOT');
  const totalLots = lotList.reduce((acc, l) => acc + Number(l.valeur || 0), 0);
  // INVARIANT : ne jamais attribuer plus que le pot disponible du type
  const pots = await getFondsPots();
  const potDispo = type === 'grand' ? pots.grand.disponible : pots.local.disponible;
  if (totalLots > potDispo) throw new Error('POT_INSUFFISANT');
  const { data: parts } = await supabase.from('tirage_participants').select('user_id').eq('tirage_id', tirageId).order('rang_tri');
  const pool = (parts || []).map((r: any) => r.user_id);
  if (!pool.length) throw new Error('POOL_VIDE');
  // Selection verifiable : score = HMAC_SHA256(graine, user_id) ; tri ascendant ; top N.
  const classes = pool.map((uid) => ({ uid, h: createHmac('sha256', graine).update(String(uid)).digest('hex') }))
    .sort((a, b) => (a.h < b.h ? -1 : (a.h > b.h ? 1 : 0)));
  const nb = Math.min(lotList.length, classes.length);
  const gagnants: any[] = [];
  for (let i = 0; i < nb; i++) {
    const lot = lotList[i];
    gagnants.push({ tirage_id: tirageId, user_id: classes[i].uid, catalog_id: lot.id, lot_libelle: lot.libelle, lot_valeur: Number(lot.valeur || 0), statut_remise: 'a_remettre' });
  }
  const potUtilise = gagnants.reduce((acc, g) => acc + Number(g.lot_valeur || 0), 0);
  await supabase.from('tirage_gagnants').insert(gagnants);
  await supabase.from('tirages').update({ statut: 'execute', pot_utilise: potUtilise, nb_gagnants: gagnants.length, executed_at: new Date().toISOString() }).eq('id', tirageId);
  for (const g of gagnants) { await _notify(g.user_id, 'Tu as gagne un cadeau !', 'Felicitations ! Tu remportes : ' + g.lot_libelle + '. L equipe Diki-Diki te contactera pour la remise (cadeau, pas du cash).'); }
  return { id: tirageId, type, nb_gagnants: gagnants.length, pot_utilise: potUtilise, graine, graine_hash: (t as any).graine_hash, gagnants };
}

export async function listTirages(): Promise<any[]> {
  try { const { data } = await supabase.from('tirages').select('*').order('created_at', { ascending: false }).limit(100); return data || []; } catch { return []; }
}
export async function getTirageDetail(tirageId: string): Promise<any> {
  const { data: t } = await supabase.from('tirages').select('*').eq('id', tirageId).maybeSingle();
  const { data: g } = await supabase.from('tirage_gagnants').select('*').eq('tirage_id', tirageId);
  const ids = (g || []).map((x: any) => x.user_id);
  const nameMap: Record<string, string> = {};
  if (ids.length) {
    const { data: us } = await supabase.from('users').select('id, name, username').in('id', ids);
    for (const u of (us || [])) { nameMap[(u as any).id] = (u as any).username ? '@' + (u as any).username : ((u as any).name || 'Utilisateur'); }
  }
  return { tirage: t, gagnants: (g || []).map((x: any) => ({ ...x, pseudo: nameMap[x.user_id] || 'Utilisateur' })) };
}
export async function setRemiseStatus(gagnantId: string, statut: string): Promise<void> {
  const ok = ['a_remettre', 'remis', 'annule'].includes(statut) ? statut : 'a_remettre';
  try { await supabase.from('tirage_gagnants').update({ statut_remise: ok }).eq('id', gagnantId); } catch { /* noop */ }
}


// Pool eligible detaille : votants ayant valide la saison (>=3 mois), AVEC leur statut courant.
// Sert au tirage simultane multi-statuts (chaque statut -> ses propres cadeaux).
async function _eligibleRows(saison: string): Promise<{ user_id: string; statut: string }[]> {
  const plafondPct = await _plafondPct();
  const { data: sts } = await supabase.from('user_tier_status').select('user_id, tier_code').limit(100000);
  const candidats = ((sts || []) as any[]);
  const ids = candidats.map((r) => r.user_id);
  const nonActifs = new Set<string>();
  if (ids.length) {
    const { data: us } = await supabase.from('users').select('id, status').in('id', ids);
    for (const u of (us || [])) { const st = (u as any).status; if (st && st !== 'actif') nonActifs.add((u as any).id); }
  }
  const out: { user_id: string; statut: string }[] = [];
  for (const r of candidats) {
    if (nonActifs.has(r.user_id)) continue;
    const statut = r.tier_code || 'messager';
    const defi = await _defiFor(statut);
    const mv = await _moisValidesSaison(r.user_id, saison, defi, plafondPct);
    if (mv >= 3) out.push({ user_id: r.user_id, statut });
  }
  return out.sort((a, b) => (a.user_id < b.user_id ? -1 : (a.user_id > b.user_id ? 1 : 0)));
}

// Tirage SIMULTANE sur tous les statuts, en une seule action et une seule graine.
// Pour chaque statut (messager -> heraut), on tire parmi les votants actuellement a
// ce statut qui ont valide la saison, et on leur attribue les cadeaux LOCAUX dont
// statut_min == ce statut. Provably-fair (commit/reveal), invariant du pot local global.
export async function runDrawAllStatuts(params: { saison: string; adminId?: string; note?: string; mode?: string; lettre?: string }): Promise<any> {
  const saison = String(params.saison || '').trim();
  if (!saison) throw new Error('SAISON_REQUISE');
  const lettre = (params.lettre === 'C' || params.lettre === 'B' || params.lettre === 'A') ? params.lettre : null;
  const parLettre = params.mode === 'lettre';
  if (parLettre && !lettre) throw new Error('LETTRE_REQUISE');
  const rows = await _eligibleRows(saison);
  if (!rows.length) throw new Error('POOL_VIDE');

  // Cadeaux locaux actifs, regroupes par statut exact (on n'utilise QUE ceux rattaches a un statut).
  let giftQuery = supabase.from('gift_catalog').select('*').eq('type', 'local').eq('actif', true);
  if (parLettre && lettre) { giftQuery = giftQuery.eq('lettre', lettre); }
  const { data: gifts } = await giftQuery;
  const giftsByStatut: Record<string, any[]> = {};
  for (const g of ((gifts || []) as any[])) {
    const code = g.statut_min || '';
    if (!code) continue;
    (giftsByStatut[code] = giftsByStatut[code] || []).push(g);
  }
  for (const code of Object.keys(giftsByStatut)) {
    giftsByStatut[code].sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
  }

  const pots = await getFondsPots();
  const potDispo = pots.local.disponible;

  // Une seule graine pour tout le tirage.
  const graine = randomBytes(32).toString('hex');
  const graineHash = createHash('sha256').update(graine).digest('hex');

  // Calcul des gagnants par statut (rien n'est ecrit tant que l'invariant n'est pas verifie).
  const gagnants: Array<{ user_id: string; catalog_id: string; lot_libelle: string; lot_valeur: number; statut: string }> = [];
  const breakdown: Array<{ statut: string; pool: number; lots: number; gagnants: number }> = [];
  for (const code of TIER_ORDER) {
    const giftsS = (giftsByStatut[code] || []);
    const poolS = rows.filter((r) => r.statut === code).map((r) => r.user_id);
    if (!giftsS.length || !poolS.length) { breakdown.push({ statut: code, pool: poolS.length, lots: giftsS.length, gagnants: 0 }); continue; }
    const classed = poolS.map((uid) => ({ uid, h: createHmac('sha256', graine).update(String(uid)).digest('hex') }))
      .sort((a, b) => (a.h < b.h ? -1 : (a.h > b.h ? 1 : 0)));
    const nb = Math.min(giftsS.length, classed.length);
    for (let i = 0; i < nb; i++) {
      const lot = giftsS[i];
      gagnants.push({ user_id: classed[i].uid, catalog_id: lot.id, lot_libelle: lot.libelle, lot_valeur: Number(lot.valeur || 0), statut: code });
    }
    breakdown.push({ statut: code, pool: poolS.length, lots: giftsS.length, gagnants: nb });
  }
  if (!gagnants.length) throw new Error('AUCUN_GAGNANT');
  const totalLots = gagnants.reduce((acc, g) => acc + Number(g.lot_valeur || 0), 0);
  // INVARIANT : ne jamais attribuer plus que le pot local disponible.
  if (totalLots > potDispo) throw new Error('POT_INSUFFISANT');

  // Ecriture : tirage execute en un bloc.
  const { data: t } = await supabase.from('tirages').insert({
    type: 'local', saison, statut: 'execute', graine, graine_hash: graineHash,
    pool_taille: rows.length, pot_disponible: potDispo, pot_utilise: totalLots,
    nb_gagnants: gagnants.length, created_by: params.adminId || null,
    lettre: parLettre ? lettre : null,
    note: params.note || (parLettre ? ('Tirage simultane tous statuts - lettre ' + lettre) : 'Tirage simultane tous statuts - saison (3 lettres)'), executed_at: new Date().toISOString(),
  }).select('*').maybeSingle();
  const tirageId = (t as any)?.id;
  if (!tirageId) throw new Error('TIRAGE_CREATION_ECHEC');

  // Snapshot du pool (avec statut) pour l'audit.
  const prows = rows.map((r, i) => ({ tirage_id: tirageId, user_id: r.user_id, rang_tri: i, statut: r.statut }));
  for (let i = 0; i < prows.length; i += 500) { await supabase.from('tirage_participants').insert(prows.slice(i, i + 500)); }

  // Gagnants (avec statut).
  const grows = gagnants.map((g) => ({ tirage_id: tirageId, user_id: g.user_id, catalog_id: g.catalog_id, lot_libelle: g.lot_libelle, lot_valeur: g.lot_valeur, statut: g.statut, statut_remise: 'a_remettre' }));
  await supabase.from('tirage_gagnants').insert(grows);

  for (const g of gagnants) { await _notify(g.user_id, 'Tu as gagne un cadeau !', 'Felicitations ! Tu remportes : ' + g.lot_libelle + '. L equipe Diki-Diki te contactera pour la remise (cadeau, pas du cash).'); }

  return { id: tirageId, saison, mode: parLettre ? 'lettre' : 'saison', lettre: parLettre ? lettre : null, nb_gagnants: gagnants.length, pot_disponible: potDispo, pot_utilise: totalLots, graine_hash: graineHash, breakdown };
}
