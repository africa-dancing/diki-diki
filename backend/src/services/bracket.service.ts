// backend/src/services/bracket.service.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  const now = new Date();

  // Récupérer tous les duels actifs expirés
  const { data: expiredDuels } = await supabase
    .from('bracket_duels')
    .select('*')
    .eq('status', 'active')
    .lt('ends_at', now.toISOString());

  if (!expiredDuels || expiredDuels.length === 0) return;

  for (const duel of expiredDuels) {
    await resolveDuel(duel);
  }

  // Vérifier si tous les duels d'un tour sont terminés → avancer
  const bracketIds = [...new Set(expiredDuels.map((d:any) => d.bracket_id))];
  for (const bracketId of bracketIds) {
    await checkRoundCompletion(bracketId);
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
async function distributeCagnotte(bracket: any, finalDuel: any) {
  const winnerId    = finalDuel.winner_participant;
  const totalCag    = bracket.total_cagnotte;
  const champGains  = Math.floor(totalCag * (1 - COMMISSION_PCT));
  const dikiGains   = totalCag - champGains;

  // Récupérer le user_id du champion
  const { data: winner } = await supabase
    .from('bracket_participants')
    .select('user_id')
    .eq('id', winnerId)
    .single();

  if (!winner) return;

  // Créditer le champion
  await supabase.rpc('credit_wallet', { p_user_id: winner.user_id, p_amount: champGains });

  // Enregistrer la transaction
  await supabase.from('transactions').insert({
    user_id:    winner.user_id,
    type:       'bracket_win',
    amount:     champGains,
    status:     'completed',
    metadata:   { bracket_id: bracket.id, total_cagnotte: totalCag, commission: dikiGains },
    created_at: new Date().toISOString(),
  });

  // Fermer le bracket
  await supabase.from('brackets').update({
    status:     'done',
    winner_id:  winner.user_id,
    ended_at:   new Date().toISOString(),
  }).eq('id', bracket.id);

  // Notifier le champion
  await supabase.from('notifications').insert({
    user_id:    winner.user_id,
    type:       'win',
    title:      '🏆 Tu es Champion !',
    message:    `Félicitations ! Tu remportes ${champGains.toLocaleString('fr-FR')} F CFA après déduction des commissions Diki-Diki.`,
    read:       false,
    created_at: new Date().toISOString(),
  });
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

// ── 9. Ajouter les votes à la cagnotte ─────────────────────────────
export async function addVoteToCagnotte(bracketId: string, amount: number) {
  await supabase.rpc('increment_bracket_cagnotte', { p_bracket_id: bracketId, p_amount: amount });
}
