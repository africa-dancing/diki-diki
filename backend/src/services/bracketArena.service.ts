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
}) {
  const { bracket_id, user_id, video_id } = params;

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

  const { error: insErr } = await supabase.from('bracket_participants').insert({
    bracket_id, user_id, video_id, registered_at: new Date().toISOString(),
  });
  if (insErr) throw new Error('Erreur lors de l inscription.');

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

  // c) Les 4 rounds avec objectifs depuis settings
  const objectifs = [
    await getSetting('bracket_obj_huitieme', 1250000),
    await getSetting('bracket_obj_quart', 1250000),
    await getSetting('bracket_obj_demi', 1000000),
    await getSetting('bracket_obj_finale', 500000),
  ];
  const rounds = objectifs.map((obj, idx) => ({
    bracket_id: bracket.id,
    round: idx + 1,
    objectif_montant: obj,
    montant_collecte: 0,
    status: idx === 0 ? 'in_progress' : 'pending',
    started_at: idx === 0 ? now.toISOString() : null,
  }));
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
export async function createArenaChallenge(params: {
  user_id: string; video_id: string;
  categorie: string; discipline: string; style: string;
  track_id?: string; mode?: string; /*DKDK_TRACK_MODE*/
}) {
  const { user_id, video_id, categorie, discipline, style, track_id, mode } = params;
  const modeVal = mode || 'normal';

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
    .eq('categorie', categorie).eq('discipline', discipline).eq('style', style)
    .eq('mode', modeVal)
    .in('status', ['open', 'waiting_candidates'])
    .limit(1).maybeSingle();

  let bracketId: string;
  if (dup) {
    bracketId = dup.id;
  } else {
    const { data: created, error: cErr } = await supabase
      .from('brackets').insert({
        title: style + ' - ' + discipline,
        categorie, discipline, style,
        track_id: track_id || null, mode: modeVal,
        type: 'libre', status: 'waiting_candidates',
        max_participants: 16, current_round: 1,
        total_cagnotte: 0, commission_pct: 0.5,
        created_at: new Date().toISOString(),
      }).select('id').single();
    if (cErr || !created) throw new Error('Erreur lors de la creation du challenge.');
    bracketId = created.id;
  }

  const result = await inscribeToArena({ bracket_id: bracketId, user_id, video_id });
  return { created: !dup, bracket_id: bracketId, participants: result.participants };
}
