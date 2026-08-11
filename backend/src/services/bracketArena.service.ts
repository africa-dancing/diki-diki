// backend/src/services/bracketArena.service.ts
// Service v2 - PODIUM CHALLENGE ARENA (cahier des charges v2)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getSetting(key: string, fallback: number): Promise<number> {
  const { data } = await supabase.from('settings').select('value').eq('key', key).single();
  const n = data ? parseInt(data.value, 10) : NaN;
  return isNaN(n) ? fallback : n;
}

// 1. Inscription directe a un bracket (nouveau modele)
export async function inscribeToArena(params: {
  bracket_id: string; user_id: string; video_id: string;
  paiement_confirme?: boolean; /*DKDK_INSCRIPTION_PAYANTE*/
}) {
  const { bracket_id, user_id, video_id, paiement_confirme } = params;

  const { data: bracket, error: bErr } = await supabase
    .from('brackets').select('*').eq('id', bracket_id)
    .in('status', ['open', 'waiting_candidates']).single();
  if (bErr || !bracket) throw new Error('Ce challenge n est pas ouvert aux inscriptions.');

  const { count: before } = await supabase
    .from('bracket_participants').select('*', { count: 'exact', head: true })
    .eq('bracket_id', bracket_id);
  if ((before ?? 0) >= bracket.max_participants) throw new Error('Ce challenge est complet.');

  const { data: existing } = await supabase
    .from('bracket_participants').select('id')
    .eq('bracket_id', bracket_id).eq('user_id', user_id).single();
  if (existing) throw new Error('Tu es deja inscrit a ce challenge.');

  /*DKDK_INSCRIPTION_PAYANTE — la video est-elle deja engagee ailleurs ? si oui, payant*/
  let fraisPreleves = 0;
  const { count: dejaEngagee } = await supabase
    .from('bracket_participants').select('*', { count: 'exact', head: true })
    .eq('video_id', video_id);
  if ((dejaEngagee ?? 0) > 0) {
    const { data: setting } = await supabase
      .from('settings').select('value').eq('key', 'inscription_multiple_amount').maybeSingle();
    const montant = parseInt(setting?.value ?? '0', 10) || 0;
    if (montant > 0) {
      if (!paiement_confirme) throw new Error('PAIEMENT_REQUIS:' + montant);
      // Lire le solde (meme mecanique que les votes : colonne balance)
      const { data: wal, error: walErr } = await supabase
        .from('wallets').select('balance, total_spent').eq('user_id', user_id).single();
      if (walErr || !wal) throw new Error('Portefeuille introuvable.');
      if ((wal.balance ?? 0) < montant) throw new Error('Solde insuffisant pour l inscription payante. Recharge ton compte.');
      // Debiter (regle d'or : debit d'abord, remboursement si l'inscription echoue plus bas)
      const { error: debErr } = await supabase
        .from('wallets')
        .update({ balance: wal.balance - montant, total_spent: (wal.total_spent ?? 0) + montant, updated_at: new Date().toISOString() })
        .eq('user_id', user_id);
      if (debErr) throw new Error('Echec du debit pour l inscription.');
      // Tracer en RECETTE plateforme (type dedie, PAS la cagnotte)
      await supabase.from('transactions').insert({
        user_id, type: 'inscription_fee', amount: montant, net_amount: montant,
        status: 'completed', metadata: { bracket_id, video_id },
      });
      fraisPreleves = montant;
    }
  }

  const { error: insErr } = await supabase.from('bracket_participants').insert({
    bracket_id, user_id, video_id, registered_at: new Date().toISOString(),
  });
  if (insErr) {
    /*DKDK_INSCRIPTION_PAYANTE — remboursement si l'inscription echoue apres debit*/
    if (fraisPreleves > 0) {
      const { data: w2 } = await supabase.from('wallets').select('balance, total_spent').eq('user_id', user_id).single();
      if (w2) {
        await supabase.from('wallets')
          .update({ balance: (w2.balance ?? 0) + fraisPreleves, total_spent: Math.max(0, (w2.total_spent ?? 0) - fraisPreleves), updated_at: new Date().toISOString() })
          .eq('user_id', user_id);
      }
      await supabase.from('transactions').insert({
        user_id, type: 'inscription_fee_refund', amount: fraisPreleves, net_amount: fraisPreleves,
        status: 'completed', metadata: { bracket_id, video_id, raison: 'inscription_echouee' },
      });
    }
    throw new Error('Erreur lors de l inscription.');
  }

  const { count } = await supabase
    .from('bracket_participants').select('*', { count: 'exact', head: true })
    .eq('bracket_id', bracket_id);

  if (count && count >= bracket.max_participants) {
    await launchBracket(bracket);
  }
  return { bracket_id, participants: count };
}

// 2. Lancement automatique au 16e inscrit
export async function launchBracket(bracket: any) {
  const now = new Date();

  // a) Code d identification via la fonction SQL
  const { data: codeData, error: codeErr } = await supabase.rpc('generate_bracket_code', {
    p_discipline: bracket.discipline ?? 'DIVERS',
    p_categorie: bracket.categorie,
    p_style: bracket.style,
    p_launch_date: now.toISOString(),
  });
  const code = codeErr ? null : codeData;

  // b) Tirage aleatoire -> 8 duels avec pool_label DK1..DK8
  const { data: participants } = await supabase
    .from('bracket_participants').select('*').eq('bracket_id', bracket.id);
  if (!participants || participants.length < 2) return;

  const shuffled = shuffle(participants);
  const duels: any[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      duels.push({
        bracket_id: bracket.id,
        round: 1,
        pool_label: 'DK' + (duels.length + 1),
        participant_a: shuffled[i].id,
        participant_b: shuffled[i + 1].id,
        votes_a: 0, votes_b: 0,
        status: 'active',
        started_at: now.toISOString(),
      });
    }
  }
  await supabase.from('bracket_duels').insert(duels);

  // c) Les etapes selon le FORMAT : nb_etapes x objectif_etape, lu depuis challenge_formats /*DKDK_OBJ_PAR_FORMAT*/
  //    (ex. C2 -> 1 etape a 2 500 000 ; C16 -> 4 etapes a 15 000 000 chacune)
  const { data: fmtRow } = await supabase
    .from('challenge_formats')
    .select('nb_etapes, objectif_etape')
    .eq('nb_candidats', bracket.max_participants)
    .maybeSingle();

  const nbEtapes = fmtRow?.nb_etapes ?? 0;
  const objEtape = fmtRow?.objectif_etape ?? 0;

  let rounds;
  if (nbEtapes >= 1 && objEtape > 0) {
    // Cas normal : on cree exactement nb_etapes etapes, chacune avec l'objectif du format
    rounds = Array.from({ length: nbEtapes }, (_, idx) => ({
      bracket_id: bracket.id,
      round: idx + 1,
      objectif_montant: objEtape,
      montant_collecte: 0,
      status: idx === 0 ? 'in_progress' : 'pending',
      started_at: idx === 0 ? now.toISOString() : null,
    }));
  } else {
    // Filet de securite : format introuvable -> ancien comportement (4 etapes, reglages globaux)
    const objectifs = [
      await getSetting('bracket_obj_huitieme', 1250000),
      await getSetting('bracket_obj_quart', 1250000),
      await getSetting('bracket_obj_demi', 1000000),
      await getSetting('bracket_obj_finale', 500000),
    ];
    rounds = objectifs.map((obj, idx) => ({
      bracket_id: bracket.id,
      round: idx + 1,
      objectif_montant: obj,
      montant_collecte: 0,
      status: idx === 0 ? 'in_progress' : 'pending',
      started_at: idx === 0 ? now.toISOString() : null,
    }));
  }
  await supabase.from('bracket_rounds').insert(rounds);

  // d) Bracket en cours + code
  await supabase.from('brackets').update({
    status: 'in_progress', current_round: 1, code,
    started_at: now.toISOString(),
  }).eq('id', bracket.id);

  // e) Notifications aux 16 candidats
  for (const p of participants) {
    await supabase.from('notifications').insert({
      user_id: p.user_id, type: 'challenge',
      title: 'Ton challenge commence !',
      message: 'Le challenge "' + (bracket.title ?? code ?? '') + '" est complet. Le Huitieme de finale demarre !',
      read: false, created_at: now.toISOString(),
    });
  }
}

// 3. Creation d'un challenge par un utilisateur
// Calcul unique de la cle de regroupement (chemin B) — utilise par creation ET verification /*DKDK_KEY_SHARED*/
export function computeBracketKey(
  discipline: string,
  modeVal: string,
  trackId: string | null | undefined,
  formatCode: string,
  champsValeurs?: { choix_id: string }[], modele: string = 'parcours', niveau: number = 1
): string {
  const cv = Array.isArray(champsValeurs) ? champsValeurs : [];
  const choixIds = cv.map(x => x.choix_id).filter(Boolean).sort();
  return [modele, String(niveau), discipline, modeVal, trackId || 'null', formatCode, ...choixIds].join('|');
}

// Verifie si un challenge ouvert existe deja pour cette combinaison (chemin B) /*DKDK_CHECK_FN*/
export async function checkArenaChallenge(params: {
  discipline: string; mode?: string; track_id?: string; format_code: string;
  champs_valeurs?: { choix_id: string }[];
  video_id?: string; /*DKDK_CHECK_PAIEMENT*/
}): Promise<{ exists: boolean; bracket_id: string | null; paiement_requis: boolean; montant: number }> {
  const { discipline, mode, track_id, format_code, champs_valeurs, video_id } = params;
  if (!discipline || !format_code) return { exists: false, bracket_id: null, paiement_requis: false, montant: 0 };
  const modeVal = mode || 'normal';
  const bracketKey = computeBracketKey(discipline, modeVal, track_id, format_code, champs_valeurs);
  const { data } = await supabase
    .from('brackets').select('id')
    .eq('bracket_key', bracketKey)
    .in('status', ['open', 'waiting_candidates'])
    .limit(1).maybeSingle();

  /*DKDK_CHECK_PAIEMENT — la video est-elle deja engagee dans un autre challenge ?*/
  let paiement_requis = false;
  let montant = 0;
  if (video_id) {
    const { count: dejaEngagee } = await supabase
      .from('bracket_participants').select('*', { count: 'exact', head: true })
      .eq('video_id', video_id);
    if ((dejaEngagee ?? 0) > 0) {
      const { data: setting } = await supabase
        .from('settings').select('value').eq('key', 'inscription_multiple_amount').maybeSingle();
      montant = parseInt(setting?.value ?? '0', 10) || 0;
      paiement_requis = montant > 0;
    }
  }
  return { exists: !!data, bracket_id: data?.id ?? null, paiement_requis, montant };
}

export async function createArenaChallenge(params: {
  user_id: string; video_id: string;
  categorie: string; discipline: string; style: string;
  track_id?: string; mode?: string; /*DKDK_TRACK_MODE*/
  format_code: string; /*DKDK_FORMAT_CREATION*/
  champs_valeurs?: { champ_id: string; champ_titre: string; choix_id: string; valeur: string }[]; /*DKDK_CHEMIN_B_BACK*/
  paiement_confirme?: boolean; /*DKDK_FIX_PAIEMENT_CREATE*/
  modele?: string; niveau?: number; video_ids?: string[]; /*DKDK_ETAPE4_SVC*/
  /*DKDK_SPORT_CREATE — creation explicite d'un challenge sport (art -> epreuve -> niveau de difficulte)*/
  sport?: { art: string; art_slug: string; epreuve: string; epreuve_slug: string; difficulte?: string; difficulte_slug?: string; regle?: string };
}) {
  const { user_id, video_id, categorie, discipline, style, track_id, mode, format_code, champs_valeurs, paiement_confirme, modele, niveau, video_ids, sport } = params;
  const modeVal = mode || 'normal';

  // Charger et valider le format choisi (obligatoire) /*DKDK_FORMAT_CREATION*/
  if (!format_code) throw new Error('Le format du challenge est obligatoire.');
  const { data: fmt, error: fErr } = await supabase
    .from('challenge_formats')
    .select('code, nb_candidats, actif')
    .eq('code', format_code)
    .maybeSingle();
  if (fErr || !fmt) throw new Error('Format de challenge inconnu.');
  if (!fmt.actif) throw new Error('Ce format de challenge est desactive.');
  const maxParticipants = fmt.nb_candidats;
  let objectifBloc = 0; /*DKDK_ETAPE4_OBJCALC*/
  if ((modele || 'parcours') === 'bloc') {
    const { data: bo } = await supabase.from('bloc_objectifs').select('objectif').eq('format_code', fmt.code).eq('niveau', niveau || 1).maybeSingle();
    objectifBloc = bo?.objectif || 0;
  }

  // Cle composite (chemin B) via fonction partagee /*DKDK_CHEMIN_B_BACK*/
  const cv = Array.isArray(champs_valeurs) ? champs_valeurs : [];
  /*DKDK_SPORT_CREATE — le sport a sa propre cle (art + epreuve + niveau de difficulte + format),
     toujours 1 seule video, mode 'normal', pas de piste musicale, modele parcours niveau 1.
     Le reste du parcours (validation format, wallet, inscription, moteur) reste IDENTIQUE. */
  const bracketKey = sport
    ? ['sport', fmt.code, sport.art_slug, sport.epreuve_slug, sport.difficulte_slug].filter(Boolean).join('|')
    : computeBracketKey(discipline, modeVal, track_id, fmt.code, cv);
  const discFinal   = sport ? sport.art : discipline;
  const styleFinal  = sport ? (sport.epreuve + (sport.difficulte ? ' · ' + sport.difficulte : '')) : style;
  const trackFinal  = sport ? null : (track_id || null);
  const modeFinal   = sport ? 'normal' : modeVal;
  const modeleFinal = sport ? 'parcours' : (modele || 'parcours');
  const niveauFinal = sport ? 1 : (niveau || 1);

  const { data: u, error: uErr } = await supabase
    .from('users').select('is_verified').eq('id', user_id).single();
  if (uErr || !u) throw new Error('Utilisateur introuvable.');
  if (!u.is_verified) throw new Error('Verifie ton compte avant de creer un challenge.');

  const { count: vCount } = await supabase
    .from('videos').select('*', { count: 'exact', head: true })
    .eq('user_id', user_id).eq('status', 'approved');
  if (!vCount || vCount < 1) throw new Error('Il te faut au moins une video approuvee.');

  const { data: w } = await supabase
    .from('wallets').select('total_credited').eq('user_id', user_id).maybeSingle();
  if ((w?.total_credited ?? 0) < 1000) throw new Error('Tu dois avoir recharge au moins 1000 unites au moins une fois pour creer un challenge.');

  const { data: dup } = await supabase
    .from('brackets').select('id')
    .eq('bracket_key', bracketKey) /*DKDK_CHEMIN_B_BACK*/
    .in('status', ['open', 'waiting_candidates'])
    .limit(1).maybeSingle();

  let bracketId: string;
  if (dup) {
    bracketId = dup.id;
  } else {
    const { data: created, error: cErr } = await supabase
      .from('brackets').insert({
        title: styleFinal + ' - ' + discFinal,
        categorie, discipline: discFinal, style: styleFinal,
        track_id: trackFinal, mode: modeFinal,
        type: 'libre', status: 'waiting_candidates', code: null, /*DKDK_FIX_CODE_UNIQUE — le code unique est genere au lancement ; a la creation on laisse null (evite la collision brackets_code_key)*/
        bracket_key: bracketKey, /*DKDK_CHEMIN_B_BACK*/
        modele: modeleFinal, niveau: niveauFinal, /*DKDK_ETAPE4_INSERT*/
        objectif_bloc: objectifBloc, /*DKDK_ETAPE4_OBJECTIF*/
        max_participants: maxParticipants, current_round: 1,
        total_cagnotte: 0, commission_pct: 0.5,
        created_at: new Date().toISOString(),
      }).select('id').single();
    if (cErr || !created) throw new Error('Erreur lors de la creation du challenge.');
    bracketId = created.id;
    // Enregistrer les valeurs de champs pour l'affichage propre /*DKDK_CHEMIN_B_BACK*/
    // (le sport n'utilise pas ces champs dynamiques : son libelle vit dans style/title) /*DKDK_SPORT_CREATE*/
    if (cv.length > 0 && !sport) {
      await supabase.from('bracket_champs_valeurs').insert(
        cv.map(x => ({ bracket_id: bracketId, champ_id: x.champ_id, champ_titre: x.champ_titre, choix_id: x.choix_id, valeur: x.valeur }))
      );
    }
  }

  const result = await inscribeToArena({ bracket_id: bracketId, user_id, video_id, paiement_confirme }); /*DKDK_FIX_PAIEMENT_CREATE*/
  /*DKDK_ETAPE4_BLOCVIDS — enregistrer les videos supplementaires du bloc*/
  if (Array.isArray(video_ids) && video_ids.length > 1) {
    const { data: part } = await supabase.from('bracket_participants')
      .select('id').eq('bracket_id', bracketId).eq('user_id', user_id).maybeSingle();
    if (part) {
      const extra = video_ids.filter((v, idx) => v && idx > 0).map((v, idx) => ({
        participant_id: part.id, round_number: idx + 2, video_id: v,
      }));
      if (extra.length) await supabase.from('bracket_participant_videos')
        .upsert(extra, { onConflict: 'participant_id,round_number' });
    }
  }
  return { created: !dup, bracket_id: bracketId, participants: result.participants };
}