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

/*DKDK_STAGECONFIG*/
// ── Configuration des étapes par type (5 types de challenges) ──────
// Discriminant = max_participants (2/4/8/12/16). NON branché pour l'instant.
// keep = nb gardés ; isFinale = champion/2e ; isBronzeMatch = match 3e place (C16) ; freezeThird = 3e figé auto (C12).
export interface StageConfig {
  keep: number;
  isFinale: boolean;
  isBronzeMatch: boolean;
  freezeThird: boolean;
  totalRounds: number;
}

export function getStageConfig(maxParticipants: number, round: number): StageConfig | null {
  // Tables de progression par type. La valeur = nb gardés à l'issue du round.
  // isFinale quand le round produit le champion. isBronzeMatch = round special (C16 R4).
  const M: Record<number, {
    totalRounds: number;
    keep: Record<number, number>;
    finaleRound: number;
    bronzeMatchRound?: number;
    freezeThirdRound?: number;
  }> = {
    2:  { totalRounds: 1, keep: {},                 finaleRound: 1 },
    4:  { totalRounds: 2, keep: { 1: 2 },           finaleRound: 2 },
    8:  { totalRounds: 3, keep: { 1: 4, 2: 2 },     finaleRound: 3 },
    12: { totalRounds: 4, keep: { 1: 6, 2: 3, 3: 2 }, finaleRound: 4, freezeThirdRound: 3 },
    16: { totalRounds: 5, keep: { 1: 8, 2: 4, 3: 2 }, finaleRound: 5, bronzeMatchRound: 4 },
  };

  const cfg = M[maxParticipants];
  if (!cfg) return null;
  if (round < 1 || round > cfg.totalRounds) return null;

  return {
    keep: cfg.keep[round] ?? 0,
    isFinale: round === cfg.finaleRound,
    isBronzeMatch: round === cfg.bronzeMatchRound,
    freezeThird: round === cfg.freezeThirdRound,
    totalRounds: cfg.totalRounds,
  };
}

// ── 1. Inscrire un candidat ────────────────────────────────────────
export async function inscribeCandidatToBracket(params: {
  track_id: string;
  user_id: string;
  video_id: string;
  track_choice: string;
}) {
  const { track_id, user_id, video_id, track_choice } = params;

  // Trouver le bracket ouvert pour ce morceau
  const { data: bracket, error: bErr } = await supabase
    .from('brackets')
    .select('*')
    .eq('track_id', track_id)
    .eq('status', 'open')
    .single();

  if (bErr || !bracket) throw new Error('Aucun bracket ouvert pour ce morceau.');

  // Vérifier doublon
  const { data: existing } = await supabase
    .from('bracket_participants')
    .select('id')
    .eq('bracket_id', bracket.id)
    .eq('user_id', user_id)
    .single();

  if (existing) throw new Error('Tu es déjà inscrit à ce bracket.');

  // Inscrire le candidat
  const { error: insErr } = await supabase.from('bracket_participants').insert({
    bracket_id: bracket.id, user_id, video_id,
    track_choice, registered_at: new Date().toISOString(),
  });
  if (insErr) throw new Error('Erreur lors de l\'inscription.');

  // Compter les inscrits
  const { count } = await supabase
    .from('bracket_participants')
    .select('*', { count:'exact', head:true })
    .eq('bracket_id', bracket.id);

  // Bracket complet → fermer + tirage + ouvrir nouveau
  if (count && count >= bracket.max_participants) {
    await closeBracketAndStart(bracket);
    await openNewBracket(track_id, bracket);
  }

  return { bracket_id: bracket.id, participants: count };
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
export async function checkAndAdvanceRounds() {
  // Tous les brackets elimination en cours
  const { data: brackets } = await supabase
    .from('brackets')
    .select('*')
    .eq('type', 'elimination')
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
}

// ── 5. Résoudre un duel ────────────────────────────────────────────
async function resolveDuel(duel: any) {
  // Égalité → prolongation 5 jours
  if (duel.votes_a === duel.votes_b) {
    const newEndsAt = addDays(new Date(), OVERTIME_DAYS);
    await supabase.from('bracket_duels').update({
      status:  'overtime',
      ends_at: newEndsAt.toISOString(),
    }).eq('id', duel.id);

    // Notifier les participants
    await notifyDuelParticipants(duel, '⚖️ Égalité !', `Égalité dans votre duel ! Prolongation de ${OVERTIME_DAYS} jours.`);
    return;
  }

  // Déterminer le gagnant
  const winner_participant = duel.votes_a > duel.votes_b ? duel.participant_a : duel.participant_b;
  const loser_participant  = duel.votes_a > duel.votes_b ? duel.participant_b : duel.participant_a;

  await supabase.from('bracket_duels').update({
    status:             'done',
    winner_participant,
    loser_participant,
    resolved_at:        new Date().toISOString(),
  }).eq('id', duel.id);

  // Notifier gagnant et perdant
  await notifyDuelParticipants(duel, '🏆 Duel terminé !', 'Votre duel vient de se terminer. Consultez le bracket pour voir le résultat.');
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
    await distributeCagnotte(bracket, duels[0]);
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
async function distributeCagnotte(bracket: any, championId: string, secondId: string | null) {
  const bracketId = bracket.id;
  const totalCag  = bracket.total_cagnotte || 0;

  // Lire les pourcentages depuis settings (modifiables sans toucher au code)
  const { data: rows } = await supabase.from('settings').select('key, value')
    .in('key', ['bracket_commission_pct', 'bracket_champion_pct', 'bracket_second_pct', 'bracket_troisieme_pct']);
  const cfg: Record<string, number> = {};
  (rows || []).forEach((r: any) => { cfg[r.key] = parseInt(r.value, 10); });
  const commissionPct = (cfg.bracket_commission_pct ?? 50) / 100;
  const champPct      = (cfg.bracket_champion_pct ?? 60) / 100;
  const secondPct     = (cfg.bracket_second_pct ?? 25) / 100;
  const troisiemePct  = (cfg.bracket_troisieme_pct ?? 15) / 100;

  // Cagnotte nette apres commission plateforme
  const net = Math.floor(totalCag * (1 - commissionPct));
  const gainChampion  = Math.floor(net * champPct);
  const gainSecond    = Math.floor(net * secondPct);
  const gainTroisieme = Math.floor(net * troisiemePct);

  // Recuperer le 3e fige en demi-finale
  const { data: bRow } = await supabase.from('brackets').select('third_id').eq('id', bracketId).single();
  const thirdId = bRow?.third_id ?? null;

  // Helper : crediter un participant + tracer + notifier
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
    if (txErr) console.error('🔴 [DISTRIB] Echec trace transaction pour', p.user_id, ':', txErr.message);
    await supabase.from('notifications').insert({
      user_id: p.user_id,
      type: 'win',
      title: `Podium : ${rang} !`,
      message: `Felicitations ! Tu remportes ${gain.toLocaleString('fr-FR')} F CFA (${rang}).`,
      read: false,
      created_at: new Date().toISOString(),
    });
  };

  await payer(championId, gainChampion, '1ere place');
  await payer(secondId, gainSecond, '2e place');
  await payer(thirdId, gainTroisieme, '3e place');

  // Fermer le bracket (podium en participant_id, convention unifiee)
  await supabase.from('brackets').update({
    status: 'done',
    winner_id: championId,
    second_id: secondId,
    ended_at: new Date().toISOString(),
  }).eq('id', bracketId);

  console.log(`[DISTRIB] Bracket ${bracketId} : net=${net}, champ=${gainChampion}, 2e=${gainSecond}, 3e=${gainTroisieme}`);
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
  const { data: alive } = await supabase
    .from('bracket_participants')
    .select('id, user_id, score')
    .eq('bracket_id', bracketId)
    .is('eliminated_at', null)
    .order('score', { ascending: false });
  if (!alive || alive.length === 0) return;

  // Combien on garde selon l etape : 1->8, 2->4, 3->2 (finale), 4->fin
  const keepMap: Record<number, number> = { 1: 8, 2: 4, 3: 2 };

  // ── Finale (round 4) : 1er = champion, 2e = second ──
  if (currentRound === 4) {
    // Egalite a la 1ere place -> prolongation (on ne clot pas)
    if (alive.length >= 2 && alive[0].score === alive[1].score) {
      console.log(`[CLOSE] Egalite finale bracket ${bracketId} -> prolongation`);
      return;
    }
    await distributeCagnotte(bracket, alive[0].id, alive[1]?.id ?? null);
    return;
  }

  const keep = keepMap[currentRound];
  if (!keep) return;

  // ── Gestion egalite a la place limite (entre keep-1 et keep) ──
  if (alive.length > keep) {
    const scoreLimite = alive[keep - 1].score;
    const scoreSuivant = alive[keep].score;
    if (scoreLimite === scoreSuivant) {
      console.log(`[CLOSE] Egalite place limite bracket ${bracketId} round ${currentRound} -> prolongation`);
      return; // on prolonge l etape jusqu a ce qu un score departage
    }
  }

  const qualifies = alive.slice(0, keep);
  const elimines  = alive.slice(keep);
  const now = new Date().toISOString();

  // ── Demi-finale (round 3) : figer le 3e avant d eliminer ──
  if (currentRound === 3 && alive.length >= 3) {
    const troisieme = alive[2];
    await supabase.from('brackets').update({ third_id: troisieme.id }).eq('id', bracketId);
  }

  // Eliminer les non qualifies
  const idsElimines = elimines.map((p: any) => p.id);
  if (idsElimines.length > 0) {
    await supabase.from('bracket_participants').update({ eliminated_at: now }).in('id', idsElimines);
  }

  // Reset du score des qualifies (chaque etape repart a zero)
  const idsQualifies = qualifies.map((p: any) => p.id);
  await supabase.from('bracket_participants').update({ score: 0 }).in('id', idsQualifies);

  // Cloturer le round courant, activer le suivant
  const nextRound = currentRound + 1;
  await supabase.from('bracket_rounds').update({ status: 'done', ended_at: now }).eq('bracket_id', bracketId).eq('round', currentRound);
  await supabase.from('bracket_rounds').update({ status: 'in_progress', started_at: now }).eq('bracket_id', bracketId).eq('round', nextRound);
  await supabase.from('brackets').update({ current_round: nextRound }).eq('id', bracketId);

  // Notifier les qualifies
  const labels = ['', 'Huitieme', 'Quart', 'Demi', 'Finale'];
  for (const p of qualifies) {
    await supabase.from('notifications').insert({
      user_id: p.user_id,
      type: 'challenge',
      title: `Qualifie pour le ${labels[nextRound]} !`,
      message: `Felicitations, tu passes au tour suivant. Nouvelle etape, les scores repartent a zero !`,
      read: false,
      created_at: now,
    });
  }

  console.log(`[CLOSE] Bracket ${bracketId} round ${currentRound} -> ${nextRound} : ${keep} qualifies, ${idsElimines.length} elimines`);
}

// ── 9. Ajouter les votes à la cagnotte ─────────────────────────────
export async function addVoteToCagnotte(bracketId: string, amount: number) {
  await supabase.rpc('increment_bracket_cagnotte', { p_bracket_id: bracketId, p_amount: amount });
}
