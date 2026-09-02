// backend/src/services/bracket.service.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const ROUND_DAYS: Record<number, number> = { 1:7, 2:7, 3:14, 4:7 };
const OVERTIME_DAYS = 5;
const COMMISSION_PCT = 0.5;

// ── Utilitaires ────────────────────────────────────────────────────
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Nombre de rounds d'un format = nb d'etapes. Pour l'instant deduit de N par la meme regle
// que les formats definis (N/R entier). Le vrai nb_etapes vient de challenge_formats et sera
// injecte par l'appelant ; ici on garde une table de secours coherente avec les 6 formats.
function totalRoundsFor(N: number): number {
  const R: Record<number, number> = { 2: 1, 4: 2, 6: 3, 8: 4, 12: 4, 16: 4 };
  return R[N] ?? 0;
}

// Nombre de laureats (payes) selon le nombre de candidats.
export function nbLaureats(N: number): number {
  if (N < 4) return 1;
  if (N <= 8) return 2;
  return 3;
}

// ── 2. Fermer le bracket et démarrer les duels ─────────────────────
async function closeBracketAndStart(bracket: any) {
  // Fermer le bracket
  await supabase.from('brackets').update({ status:'active', started_at: new Date().toISOString() }).eq('id', bracket.id);

  // Récupérer les participants
  const { data: participants } = await supabase
    .from('bracket_participants')
    .select('*')
    .eq('bracket_id', bracket.id);

  if (!participants) return;

  // Tirage au sort des paires
  const shuffled = shuffle(participants);
  const duels = [];
  const now = new Date();
  const endsAt = addDays(now, ROUND_DAYS[1]);

  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      duels.push({
        bracket_id:     bracket.id,
        round:          1,
        participant_a:  shuffled[i].id,
        participant_b:  shuffled[i + 1].id,
        votes_a:        0,
        votes_b:        0,
        status:         'active',
        started_at:     now.toISOString(),
        ends_at:        endsAt.toISOString(),
      });
    }
  }

  await supabase.from('bracket_duels').insert(duels);

  // Notifier les participants
  for (const p of participants) {
    await supabase.from('notifications').insert({
      user_id:    p.user_id,
      type:       'challenge',
      title:      '⚡ Ton bracket commence !',
      message:    `Le bracket "${bracket.title}" est complet. Le Huitième de finale vient de démarrer !`,
      read:       false,
      created_at: new Date().toISOString(),
    });
  }
}

// ── 3. Ouvrir un nouveau bracket sur le même morceau ───────────────
async function openNewBracket(track_id: string, previousBracket: any) {
  // Vérifier qu'il n'y a pas déjà un bracket ouvert sur ce morceau
  const { data: existing } = await supabase
    .from('brackets')
    .select('id')
    .eq('track_id', track_id)
    .eq('status', 'open')
    .single();

  if (existing) return; // Déjà un bracket ouvert

  await supabase.from('brackets').insert({
    track_id,
    title:            previousBracket.title,
    discipline:       previousBracket.discipline,
    type:             previousBracket.type,
    max_participants: previousBracket.max_participants,
    status:           'open',
    current_round:    0,
    total_cagnotte:   0,
    commission_pct:   COMMISSION_PCT,
    created_at:       new Date().toISOString(),
  });
}

// ── 4. Vérifier et avancer les tours (appelé par le cron) ──────────
let _avancementEnCours = false; /*DKDK_ADVANCE_LOCK — un seul avancement/fermeture a la fois (empeche tout double-versement de cagnotte)*/
export async function checkAndAdvanceRounds() {
  // Verrou : si un avancement tourne deja (cron OU declenchement par un vote), on ne relance pas en parallele.
  if (_avancementEnCours) return;
  _avancementEnCours = true;
  try { await _avancerToursInterne(); }
  finally { _avancementEnCours = false; }
}

async function _avancerToursInterne() {
  // Brackets a etapes en cours : anciens 'elimination' ET nouveaux 'parcours' (classement au score) /*DKDK_ARBITRE_PARCOURS*/
  // On elargit la selection sans toucher a l'etiquette 'type' (qui sert aussi a distinguer libre/repertoire cote musique).
  const { data: brackets } = await supabase
    .from('brackets')
    .select('*')
    .or('type.eq.elimination,modele.eq.parcours')
    .eq('status', 'in_progress');
  if (!brackets || brackets.length === 0) return;

  for (const bracket of brackets) {
    // Le round actuellement in_progress
    const { data: round } = await supabase
      .from('bracket_rounds')
      .select('*')
      .eq('bracket_id', bracket.id)
      .eq('status', 'in_progress')
      .maybeSingle();
    if (!round) continue;

    // Objectif de l etape atteint ?
    if ((round.montant_collecte || 0) >= (round.objectif_montant || 0) && (round.objectif_montant || 0) > 0) {
      await closeStage(bracket, round);
    }
  }

  // Bloc groupe : objectif unique atteint -> decompte final /*DKDK_DECLENCHEUR_BLOC*/
  const { data: blocs } = await supabase
    .from('brackets')
    .select('*')
    .eq('modele', 'bloc')
    .eq('status', 'in_progress');
  for (const b of (blocs || [])) {
    const obj = b.objectif_bloc || 0;
    if (obj > 0 && (b.total_cagnotte || 0) >= obj) {
      try { await decompteBlocGroupe(b); }
      catch (e) { console.error('[DECOMPTE BLOC] echec bracket ' + b.id, e); }
    }
  }
}

// ── 6. Vérifier si le tour est complet et avancer ─────────────────
async function checkRoundCompletion(bracketId: string) {
  const { data: bracket } = await supabase.from('brackets').select('*').eq('id', bracketId).single();
  if (!bracket) return;

  const currentRound = bracket.current_round;

  // Vérifier si tous les duels du tour actuel sont terminés
  const { data: duels } = await supabase
    .from('bracket_duels')
    .select('*')
    .eq('bracket_id', bracketId)
    .eq('round', currentRound);

  if (!duels) return;

  const allDone = duels.every((d:any) => d.status === 'done');
  if (!allDone) return;

  // Finale terminée → distribuer la cagnotte
  if (currentRound === 4) {
    await distributeCagnotte(bracket, duels[0].winner_participant, null);
    return;
  }

  // Passer au tour suivant
  const nextRound = currentRound + 1;
  const winners = duels.map((d:any) => d.winner_participant);
  const shuffledWinners = shuffle(winners);
  const now = new Date();
  const endsAt = addDays(now, ROUND_DAYS[nextRound]);

  const nextDuels = [];
  for (let i = 0; i < shuffledWinners.length; i += 2) {
    if (shuffledWinners[i + 1]) {
      nextDuels.push({
        bracket_id:    bracketId,
        round:         nextRound,
        participant_a: shuffledWinners[i],
        participant_b: shuffledWinners[i + 1],
        votes_a:       0,
        votes_b:       0,
        status:        'active',
        started_at:    now.toISOString(),
        ends_at:       endsAt.toISOString(),
      });
    }
  }

  await supabase.from('bracket_duels').insert(nextDuels);
  await supabase.from('brackets').update({ current_round: nextRound }).eq('id', bracketId);

  // Notifier tous les participants encore en lice
  const { data: participants } = await supabase
    .from('bracket_participants')
    .select('user_id')
    .eq('bracket_id', bracketId)
    .in('id', winners);

  if (participants) {
    for (const p of participants) {
      await supabase.from('notifications').insert({
        user_id:    p.user_id,
        type:       'challenge',
        title:      `🏆 ${['','Huitième','Quart','Demi','Finale'][nextRound]} de finale !`,
        message:    `Tu es qualifié pour le ${['','Huitième','Quart de finale','Demi-finale','Finale'][nextRound]} ! Nouveau duel démarré.`,
        read:       false,
        created_at: new Date().toISOString(),
      });
    }
  }
}

// ── 7. Distribuer la cagnotte ──────────────────────────────────────
async function distributeCagnotte(bracket: any, championId: string, secondId: string | null, forceLaureats?: number) {
  const bracketId = bracket.id;
  const totalCag  = bracket.total_cagnotte || 0;

  /*DKDK_VERROU_VERSEMENT — securite paiement : on « reserve » le bracket de facon atomique.
    Seul l'appel qui reussit a passer le statut de 'in_progress' a 'closing' continue ; tout autre
    appel simultane (0 ligne modifiee) s'arrete ici => aucune cagnotte versee deux fois.*/
  {
    const { data: reserve } = await supabase
      .from('brackets')
      .update({ status: 'closing' })
      .eq('id', bracketId)
      .eq('status', 'in_progress')
      .select('id');
    if (!reserve || reserve.length === 0) {
      console.log('[DISTRIB] Bracket ' + bracketId + ' deja en cours de cloture — versement ignore (anti-double).');
      return;
    }
  }

  /*DKDK_DISTRIB_BYTYPE*/
  // Lire tous les pourcentages depuis settings (modifiables sans toucher au code)
  const { data: rows } = await supabase.from('settings').select('key, value')
    .in('key', ['bracket_commission_pct', 'bracket_champion_pct', 'bracket_second_pct', 'bracket_troisieme_pct', 'bracket_c8_champion_pct', 'bracket_c8_second_pct', 'bracket_c4_champion_pct', 'bracket_vote_amount', 'bracket_heart_amount', 'bracket_elimine_pct']);
  const cfg: Record<string, number> = {};
  (rows || []).forEach((r: any) => { cfg[r.key] = parseInt(r.value, 10); });
  const commissionPct = (cfg.bracket_commission_pct ?? 50) / 100;

  /*DKDK_DISTRIB_V2 — plateforme 50%, primes eliminees (20% de leur montant capte), podium sur le reste*/
  const maxP = bracket.max_participants ?? 16;
  const laureats = (forceLaureats && forceLaureats >= 1 && forceLaureats <= 3) ? forceLaureats : nbLaureats(maxP); /*DKDK_FORCE_LAUREATS*/

  let champPct: number, secondPct: number, troisiemePct: number;
  if (laureats === 1) { champPct = 1; secondPct = 0; troisiemePct = 0; }
  else if (laureats === 2) {
    champPct  = (cfg.bracket_c8_champion_pct ?? 65) / 100;
    secondPct = (cfg.bracket_c8_second_pct ?? 35) / 100;
    troisiemePct = 0;
  } else {
    champPct     = (cfg.bracket_champion_pct ?? 60) / 100;
    secondPct    = (cfg.bracket_second_pct ?? 25) / 100;
    troisiemePct = (cfg.bracket_troisieme_pct ?? 15) / 100;
  }

  const voteAmount  = cfg.bracket_vote_amount  ?? 100;
  const heartAmount = cfg.bracket_heart_amount ?? 200;
  const elimPct     = (cfg.bracket_elimine_pct ?? 20) / 100;

  const net = Math.floor(totalCag * (1 - commissionPct));
  const gainChampion  = Math.floor(net * champPct);
  const gainSecond    = Math.floor(net * secondPct);
  const gainTroisieme = Math.floor(net * troisiemePct);

  const { data: bRow } = await supabase.from('brackets').select('third_id').eq('id', bracketId).single();
  const thirdId = bRow?.third_id ?? null;

  const podiumIds = new Set([championId, secondId, thirdId].filter(Boolean));

  const payer = async (participantId: string | null, gain: number, rang: string) => {
    if (!participantId || gain <= 0) return;
    const { data: p } = await supabase.from('bracket_participants').select('user_id').eq('id', participantId).single();
    if (!p) return;
    await supabase.rpc('credit_wallet', { p_user_id: p.user_id, p_amount: gain });
    const { error: txErr } = await supabase.from('transactions').insert({
      user_id: p.user_id,
      type: 'bracket_win',
      amount: gain,
      net_amount: gain,
      status: 'success',
      metadata: { bracket_id: bracketId, rang, total_cagnotte: totalCag },
      created_at: new Date().toISOString(),
    });
    if (txErr) console.error('[DISTRIB] Echec trace transaction pour', p.user_id, ':', txErr.message);
    await supabase.from('notifications').insert({
      user_id: p.user_id,
      type: 'win',
      title: `${rang} !`,
      message: `Felicitations ! Tu remportes ${gain.toLocaleString('fr-FR')} F CFA (${rang}).`,
      read: false,
      created_at: new Date().toISOString(),
    });
  };

  await payer(championId, gainChampion, '1ere place');
  await payer(secondId, gainSecond, '2e place');
  await payer(thirdId, gainTroisieme, '3e place');

  const { data: elimines } = await supabase
    .from('bracket_participants')
    .select('id, stars_count, hearts_count')
    .eq('bracket_id', bracketId)
    .not('eliminated_at', 'is', null);
  let totalPrimes = 0;
  for (const e of (elimines || [])) {
    if (podiumIds.has(e.id)) continue;
    const capte = (e.stars_count ?? 0) * voteAmount + (e.hearts_count ?? 0) * heartAmount;
    const prime = Math.floor(capte * elimPct);
    if (prime > 0) { await payer(e.id, prime, 'Prime de participation'); totalPrimes += prime; }
  }

  console.log(`[DISTRIB] Bracket ${bracketId} : net=${net}, champ=${gainChampion}, 2e=${gainSecond}, 3e=${gainTroisieme}, primes=${totalPrimes}`);

  /*DKDK_NOTIF_TOUS — message in-app detaille (chiffres clairs) a TOUS les candidats du challenge*/
  try {
    const { data: partsAll } = await supabase
      .from('bracket_participants')
      .select('id, user_id, users(name)')
      .eq('bracket_id', bracketId);
    const nom = (pid: string | null) => {
      const p = (partsAll || []).find((x: any) => x.id === pid) as any;
      return (p && p.users && p.users.name) ? p.users.name : 'Candidat';
    };
    const F = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' F';
    let recap = 'Champion : ' + nom(championId) + ' (' + F(gainChampion) + ')';
    if (secondId && gainSecond > 0)     recap += ' | 2e : ' + nom(secondId) + ' (' + F(gainSecond) + ')';
    if (thirdId && gainTroisieme > 0)   recap += ' | 3e : ' + nom(thirdId) + ' (' + F(gainTroisieme) + ')';
    const commPct = Math.round(commissionPct * 100);
    const message =
      'Le challenge est termine ! ' + recap +
      '. Cagnotte totale : ' + F(totalCag) +
      ' (commission plateforme ' + commPct + '% = ' + F(totalCag * commissionPct) +
      ', a partager : ' + F(net) + ').' +
      (totalPrimes > 0 ? ' Primes de participation reversees aux elimines : ' + F(totalPrimes) + '.' : '') +
      ' Merci d avoir participe !';
    for (const p of (partsAll || [])) {
      await supabase.from('notifications').insert({
        user_id: p.user_id, type: 'challenge',
        title: 'Resultats du challenge',
        message, read: false, created_at: new Date().toISOString(),
      });
    }
  } catch (e) { console.error('[NOTIF TOUS] echec bracket ' + bracketId, e); }

  // Fermer le bracket (podium en participant_id, convention unifiee)
  await supabase.from('brackets').update({
    status: 'done',
    winner_id: championId,
    second_id: secondId,
    ended_at: new Date().toISOString(),
  }).eq('id', bracketId);

  console.log(`[DISTRIB] Bracket ${bracketId} : net=${net}, champ=${gainChampion}, 2e=${gainSecond}, 3e=${gainTroisieme}`);
}

// Decompte final unique du Bloc groupe : classement -> podium -> primes, une passe /*DKDK_DECOMPTE_BLOC*/
export async function decompteBlocGroupe(bracket: any) {
  const bracketId = bracket.id;
  // 1) Classer les participants par score total (le plus haut d'abord)
  const { data: parts } = await supabase.from('bracket_participants')
    .select('id, score, stars_count, hearts_count')
    .eq('bracket_id', bracketId)
    .order('score', { ascending: false });
  if (!parts || parts.length === 0) { console.log('[DECOMPTE BLOC] aucun participant, bracket ' + bracketId); return; }
  const championId = parts[0].id;
  const secondId   = parts[1]?.id ?? null;
  const troisiemeId = parts[2]?.id ?? null;
  // 2) Podium sur le bracket
  await supabase.from('brackets').update({ winner_id: championId, second_id: secondId, third_id: troisiemeId }).eq('id', bracketId);
  // 3) Marquer tous les autres comme elimines (pour leur prime) sauf le podium reel
  const podium = [championId, secondId, troisiemeId].filter(Boolean);
  const nowIso = new Date().toISOString();
  for (const p of parts) {
    if (!podium.includes(p.id)) {
      await supabase.from('bracket_participants').update({ eliminated_at: nowIso }).eq('id', p.id);
    }
  }
  // 4) Passer le bracket en in_progress pour que distributeCagnotte paie, puis repartir
  await supabase.from('brackets').update({ status: 'in_progress' }).eq('id', bracketId);
  const { data: bfull } = await supabase.from('brackets').select('*').eq('id', bracketId).single();
  // 5) Nombre de gagnants regle dans l'admin (bloc_objectifs), selon format x niveau
  const { data: bo } = await supabase.from('bloc_objectifs').select('nb_gagnants')
    .eq('format_code', bfull.code).eq('niveau', bfull.niveau || 1).maybeSingle();
  const forceLaureats = bo?.nb_gagnants || undefined;
  await distributeCagnotte(bfull, championId, secondId, forceLaureats);
  console.log('[DECOMPTE BLOC] bracket ' + bracketId + ' cloture, ' + parts.length + ' participants, gagnants=' + (forceLaureats ?? 'auto'));
}

// ── 8. Notifier les participants d'un duel ─────────────────────────
async function notifyDuelParticipants(duel: any, title: string, message: string) {
  const { data: partA } = await supabase.from('bracket_participants').select('user_id').eq('id', duel.participant_a).single();
  const { data: partB } = await supabase.from('bracket_participants').select('user_id').eq('id', duel.participant_b).single();

  const users = [partA?.user_id, partB?.user_id].filter(Boolean);
  for (const user_id of users) {
    await supabase.from('notifications').insert({
      user_id, type:'challenge', title, message, read:false, created_at: new Date().toISOString(),
    });
  }
}

// ── Cloturer une etape (classement global au score) ───────────────
async function closeStage(bracket: any, round: any) {
  const bracketId = bracket.id;
  const currentRound = round.round;

  // Candidats encore en lice, tries par score decroissant
  /*DKDK_ALIVEALL*/
  /*DKDK_TIEBREAK_ORDER*/
  // Classement deterministe : score d'abord, puis en cas d'egalite le repli
  // (le plus d'etoiles, puis de coeurs, puis l'anciennete d'inscription).
  const { data: aliveAll } = await supabase
    .from('bracket_participants')
    .select('id, user_id, score, final_path, stars_count, hearts_count, registered_at')
    .eq('bracket_id', bracketId)
    .is('eliminated_at', null)
    .order('score', { ascending: false })
    .order('stars_count', { ascending: false })
    .order('hearts_count', { ascending: false })
    .order('registered_at', { ascending: true });
  if (!aliveAll || aliveAll.length === 0) return;
  const alive = aliveAll;

  // ── Config du format : Candidats (C), Étapes (E), Gagnants (G) + objectif d'argent /*DKDK_FORMAT_DRIVEN*/
  //    Tout vient de « Formats de challenge » : nb_candidats / nb_etapes / objectif_etape,
  //    et nb_gagnants (section « Objectifs Bloc groupe », constant par format).
  const C = bracket.max_participants;
  const { data: fmtRow } = await supabase
    .from('challenge_formats')
    .select('code, nb_etapes, objectif_etape')
    .eq('nb_candidats', C)
    .limit(1)
    .maybeSingle();
  const E = (fmtRow?.nb_etapes && fmtRow.nb_etapes >= 1) ? fmtRow.nb_etapes : totalRoundsFor(C);
  /*DKDK_FIX_OBJECTIF_ROUND*/ // L'objectif d'argent est desormais lu sur le ROUND (voir la porte plus bas), pas sur le format.

  let G = nbLaureats(C); // filet de securite si la config est absente
  if (fmtRow?.code) {
    const { data: boRow } = await supabase
      .from('bloc_objectifs')
      .select('nb_gagnants')
      .eq('format_code', fmtRow.code)
      .order('niveau', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (boRow?.nb_gagnants && boRow.nb_gagnants >= 1) G = boRow.nb_gagnants;
  }
  if (!E || E < 1) { console.log(`[CLOSE] Format inconnu pour ${C} candidats`); return; }

  // ── Gate objectif d'argent : l'etape ne se cloture pas tant que l'objectif n'est pas atteint ──
  //    On lit l'objectif du ROUND lui-meme (celui affiche a l'ecran et utilise par
  //    checkAndAdvanceRounds), et NON celui du format (challenge_formats.objectif_etape),
  //    qui n'est qu'un modele par defaut et peut differer du round. /*DKDK_FIX_OBJECTIF_ROUND*/
  {
    const { data: rnd } = await supabase
      .from('bracket_rounds')
      .select('montant_collecte, objectif_montant')
      .eq('bracket_id', bracketId)
      .eq('round', currentRound)
      .maybeSingle();
    const collecte = rnd?.montant_collecte ?? 0;
    const objectifRound = rnd?.objectif_montant ?? 0;
    if (objectifRound > 0 && collecte < objectifRound) {
      console.log(`[CLOSE] Objectif non atteint bracket ${bracketId} etape ${currentRound}/${E} : ${collecte}/${objectifRound}`);
      return;
    }
  }

  // ── Planning d'elimination derive des chiffres du format : on finit PILE sur G gagnants /*DKDK_ELIM_PLAN*/
  //    On repartit les (C - G) eliminations sur les E etapes, un peu plus tot que tard.
  const totalElim = Math.max(0, C - G);
  const base  = Math.floor(totalElim / E);
  const reste = totalElim % E;
  const elimAuTour = (r: number) => base + (r <= reste ? 1 : 0);              // r = 1..E
  const survivantsApres = (r: number) => { let s = C; for (let i = 1; i <= r; i++) s -= elimAuTour(i); return s; };
  if (currentRound < 1 || currentRound > E) { console.log(`[CLOSE] etape ${currentRound} hors plage (E=${E})`); return; }

  const isFinale = currentRound === E;
  const keep = survivantsApres(currentRound); // survivants apres cette etape (a la derniere etape = G)

  // ── Departage avec delai (DKDK_EGALITE_DELAI) ──
  //    On ne tranche pas une egalite de score immediatement, mais on ne prolonge
  //    pas non plus indefiniment. Une egalite de SCORE a une place qui paie
  //    (frontiere pour une etape normale ; chaque place payee en finale) demarre
  //    un compte a rebours. Si un vote la casse avant la fin -> fermeture normale.
  //    Si elle tient jusqu'au bout -> fermeture au classement de repli
  //    (etoiles / coeurs / anciennete), deja applique sur `alive` ci-dessus.
  const bornes: number[] = isFinale ? Array.from({ length: keep }, (_, i) => i + 1) : [keep];
  let egaliteActive = false;
  for (const b of bornes) {
    if (alive.length > b && alive[b - 1] && alive[b] && alive[b - 1].score === alive[b].score) {
      egaliteActive = true;
      break;
    }
  }
  if (egaliteActive) {
    // Delai configurable (minutes) via Reglages ; defaut 60 min (1 h).
    let delaiMin = 60;
    try {
      const { data: sDelai } = await supabase
        .from('settings').select('value').eq('key', 'finale_egalite_delai_minutes').maybeSingle();
      const v = Number(sDelai?.value);
      if (Number.isFinite(v) && v >= 0) delaiMin = v;
    } catch {}

    const { data: rndTie, error: tieErr } = await supabase
      .from('bracket_rounds').select('egalite_depuis')
      .eq('bracket_id', bracketId).eq('round', currentRound).maybeSingle();

    // Si le suivi est indisponible (ex. colonne absente), on reste prudent :
    // on ne tranche pas l'egalite (ancien comportement), sans casser le moteur.
    if (tieErr) {
      console.log(`[CLOSE] Suivi egalite indisponible (${tieErr.message}) -> prolongation prudente bracket ${bracketId}`);
      return;
    }

    const depuis = rndTie?.egalite_depuis ? new Date(rndTie.egalite_depuis).getTime() : null;
    if (!depuis) {
      // Premiere detection : on demarre le compte a rebours, on ne ferme pas encore.
      await supabase.from('bracket_rounds')
        .update({ egalite_depuis: new Date().toISOString() })
        .eq('bracket_id', bracketId).eq('round', currentRound);
      console.log(`[CLOSE] Egalite detectee bracket ${bracketId} etape ${currentRound}/${E} -> compte a rebours ${delaiMin}min`);
      return;
    }

    const ecouleMin = (Date.now() - depuis) / 60000;
    if (ecouleMin < delaiMin) {
      console.log(`[CLOSE] Egalite en cours (${ecouleMin.toFixed(1)}/${delaiMin}min) bracket ${bracketId} -> prolongation`);
      return;
    }
    // Delai ecoule et toujours a egalite : on ferme au classement de repli (on continue plus bas).
    console.log(`[CLOSE] Egalite non resolue apres ${delaiMin}min bracket ${bracketId} -> fermeture au repli (etoiles/coeurs/anciennete)`);
  } else {
    // Pas d'egalite : si un compte a rebours trainait, on le remet a zero (best effort).
    await supabase.from('bracket_rounds')
      .update({ egalite_depuis: null })
      .eq('bracket_id', bracketId).eq('round', currentRound);
  }

  const now = new Date().toISOString();
  const qualifies = alive.slice(0, keep);   // a la finale : les G gagnants, classes par score
  const elimines  = alive.slice(keep);
  const idsElimines = elimines.map((p: any) => p.id);
  if (idsElimines.length > 0) {
    await supabase.from('bracket_participants').update({ eliminated_at: now }).in('id', idsElimines);
  }

  // ══════════ FINALE : les G survivants sont le podium — on paie et on cloture ══════════
  if (isFinale) {
    if (G >= 3 && qualifies[2]) {
      await supabase.from('brackets').update({ third_id: qualifies[2].id }).eq('id', bracketId);
    }
    // distributeCagnotte paie 1er/2e/3e selon le partage des Reglages, verse les primes aux elimines,
    // envoie le recap detaille a TOUS, et cloture le bracket. forceLaureats = G (ta config).
    await distributeCagnotte(bracket, qualifies[0].id, qualifies[1]?.id ?? null, G);
    for (const p of elimines) {
      await supabase.from('notifications').insert({
        user_id: p.user_id, type: 'challenge', title: 'Fin du parcours',
        message: `Ton parcours s'arrete a la derniere etape (${currentRound}/${E}). Merci pour ta prestation ! Ta prime de participation vient de t'etre versee.`,
        read: false, created_at: now,
      });
    }
    console.log(`[CLOSE] Bracket ${bracketId} FINALE etape ${currentRound}/${E} : ${G} gagnant(s) payes, ${idsElimines.length} elimine(s)`);
    return;
  }

  // ══════════ ETAPE INTERMEDIAIRE : on qualifie les survivants et on ouvre l'etape suivante ══════════
  const idsQualifies = qualifies.map((p: any) => p.id);
  await supabase.from('bracket_participants').update({ score: 0 }).in('id', idsQualifies);

  const nextRound = currentRound + 1;
  await supabase.from('bracket_rounds').update({ status: 'done', ended_at: now }).eq('bracket_id', bracketId).eq('round', currentRound);
  await supabase.from('bracket_rounds').update({ status: 'in_progress', started_at: now }).eq('bracket_id', bracketId).eq('round', nextRound);
  await supabase.from('brackets').update({ current_round: nextRound }).eq('id', bracketId);

  /*DKDK_UPDATE_VIDEO_ROUND*/
  for (const p of qualifies) {
    const { data: nextVid } = await supabase
      .from('bracket_participant_videos')
      .select('video_id')
      .eq('participant_id', p.id)
      .eq('round_number', nextRound)
      .maybeSingle();
    if (nextVid?.video_id) {
      await supabase.from('bracket_participants').update({ video_id: nextVid.video_id }).eq('id', p.id);
    }
  }

  for (const p of qualifies) {
    await supabase.from('notifications').insert({
      user_id: p.user_id, type: 'challenge',
      title: `Qualifie pour l'etape ${nextRound}/${E} !`,
      message: `Felicitations, tu passes a l'etape suivante. Nouvelle etape, les scores repartent a zero !`,
      read: false, created_at: now,
    });
  }

  /*DKDK_NOTIF_ELIMINES*/
  for (const p of elimines) {
    await supabase.from('notifications').insert({
      user_id: p.user_id, type: 'challenge', title: 'Fin du parcours',
      message: `Ton parcours s'arrete a l'etape ${currentRound}/${E} (tu totalises ${p.score ?? 0} vote(s) sur cette etape). Merci pour ta prestation ! Ta prime de participation te sera versee a la cloture du challenge.`,
      read: false, created_at: now,
    });
  }

  console.log(`[CLOSE] Bracket ${bracketId} etape ${currentRound}/${E} -> ${nextRound} : ${keep} qualifie(s), ${idsElimines.length} elimine(s)`);
}

// ── 9. Ajouter les votes à la cagnotte ─────────────────────────────
export async function addVoteToCagnotte(bracketId: string, amount: number) {
  await supabase.rpc('increment_bracket_cagnotte', { p_bracket_id: bracketId, p_amount: amount });
}
