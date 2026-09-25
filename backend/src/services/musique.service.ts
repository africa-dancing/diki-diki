import { supabase } from '../../config/supabase';

// Correspondance pays -> continent (simplifiee, extensible)
const PAYS_CONTINENT: Record<string, string> = {
  'CD': 'Afrique', 'CI': 'Afrique', 'SN': 'Afrique', 'NG': 'Afrique', 'GH': 'Afrique',
  'BJ': 'Afrique', 'TG': 'Afrique', 'ML': 'Afrique', 'CM': 'Afrique', 'GN': 'Afrique',
  'BF': 'Afrique', 'CG': 'Afrique', 'AO': 'Afrique', 'KE': 'Afrique', 'TZ': 'Afrique',
  'ZA': 'Afrique', 'ET': 'Afrique', 'MA': 'Afrique', 'DZ': 'Afrique', 'TN': 'Afrique',
  'FR': 'Europe', 'BE': 'Europe', 'GB': 'Europe', 'DE': 'Europe', 'ES': 'Europe',
  'US': 'Amerique', 'CA': 'Amerique', 'BR': 'Amerique', 'JM': 'Amerique',
};

const UA = 'Diki-Diki/1.0 ( https://dikidiki.com )';

// Recherche un morceau sur Deezer (auto-remplissage) et renvoie les metadonnees pre-remplies.
// Deezer : gratuit, sans cle API, bonne couverture de la musique africaine/francophone, + pochette.
export async function lookupMusique(query: string) {
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`;
  let r;
  try {
    r = await fetch(url, { headers: { 'User-Agent': UA } });
  } catch (e: any) {
    console.error('[DEEZER] fetch failed:', e?.message, e?.cause);
    throw new Error('Deezer injoignable: ' + (e?.message || 'inconnu'));
  }
  if (!r.ok) {
    console.error('[DEEZER] status:', r.status);
    throw new Error('Deezer a repondu ' + r.status);
  }
  const data: any = await r.json();
  const rec = (data.data || [])[0];
  if (!rec) return null;

  const artiste = rec.artist?.name || '';
  const album = rec.album?.title || '';
  const duree_sec = rec.duration ? Number(rec.duration) : null; // Deezer renvoie deja des secondes
  const cover_url = rec.album?.cover_big || rec.album?.cover_medium || rec.album?.cover || '';

  // Deezer n'expose pas le pays d'origine de l'artiste dans la recherche.
  // On laisse pays/continent a remplir a la main (le map reste dispo si une source pays est ajoutee).
  const pays_origine = '';
  const continent = PAYS_CONTINENT[pays_origine] || '';

  return {
    titre: rec.title_short || rec.title || '',
    artiste, album, duree_sec,
    pays_origine, continent,
    cover_url,
    source: 'deezer' as const,
  };
}

// Enregistre un morceau soumis par un utilisateur (status pending)
export async function submitMusique(params: {
  user_id: string; artiste: string; titre: string; album?: string;
  duree_sec?: number; pays_origine?: string; continent?: string;
  danse?: string; style?: string; cover_url?: string; ref_url?: string; source?: string;
  auto_approve?: boolean; /*DKDK_AUTO_APPROVE*/
}) {
  const { user_id, artiste, titre } = params;
  if (!artiste?.trim() || !titre?.trim()) throw new Error('Artiste et titre obligatoires.');
  /*DKDK_MUSIQUE_DEDUP — eviter les doublons : chercher un morceau existant (casse/accents ignores)*/
  {
    const norm = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    const { data: existants } = await supabase.from('musiques').select('id, artiste, titre');
    const found = (existants || []).find((m: any) => norm(m.artiste) === norm(artiste) && norm(m.titre) === norm(titre));
    if (found) return { id: found.id };
  }
  const { data, error } = await supabase.from('musiques').insert({
    artiste: artiste.trim(), titre: titre.trim(),
    album: params.album || null, duree_sec: params.duree_sec || null,
    pays_origine: params.pays_origine || null, continent: params.continent || null,
    danse: params.danse || null, style: params.style || null,
    cover_url: params.cover_url || null,
    ref_url: params.ref_url || null,
    source: params.source === 'musicbrainz' ? 'musicbrainz' : 'manuel',
    submitted_by: user_id, status: params.auto_approve ? 'approved' : 'pending', /*DKDK_AUTO_APPROVE*/
  }).select('id').single();
  if (error) throw new Error('Erreur lors de l enregistrement du morceau.');
  return { id: data.id };
}

// Morceaux en attente d'un utilisateur (visibles par lui seul) /*DKDK_MINE*/
export async function listMyPendingMusiques(userId: string) {
  const { data, error } = await supabase.from('musiques').select('*').eq('submitted_by', userId).eq('status', 'pending').order('created_at', { ascending: false });
  if (error) throw new Error('Erreur lors de la lecture des morceaux en attente.');
  return data || [];
}

/*DKDK_SUBMIT_ADMIN*/
// Enregistre un morceau ajoute par l'admin (source=admin, status=approved directement)
export async function submitMusiqueAdmin(params: {
  admin_id: string; artiste: string; titre: string; album?: string;
  duree_sec?: number; pays_origine?: string; continent?: string;
  danse?: string; style?: string; cover_url?: string; ref_url?: string;
}) {
  const { admin_id, artiste, titre } = params;
  if (!artiste || !artiste.trim() || !titre || !titre.trim()) throw new Error('Artiste et titre obligatoires.');
  const { data, error } = await supabase.from('musiques').insert({
    artiste: artiste.trim(), titre: titre.trim(),
    album: params.album || null, duree_sec: params.duree_sec || null,
    pays_origine: params.pays_origine || null, continent: params.continent || null,
    danse: params.danse || null, style: params.style || null,
    cover_url: params.cover_url || null,
    ref_url: params.ref_url || null,
    source: 'admin', submitted_by: admin_id, status: 'approved',
  }).select('id').single();
  if (error) throw new Error('Erreur lors de l enregistrement du morceau (admin).');
  return { id: data.id };
}

// Liste des morceaux approuves (filtres optionnels)
export async function listMusiques(filters: { continent?: string; pays?: string }) {
  let q = supabase.from('musiques').select('*').eq('status', 'approved').order('created_at', { ascending: false });
  if (filters.continent) q = q.eq('continent', filters.continent);
  if (filters.pays) q = q.eq('pays_origine', filters.pays);
  const { data, error } = await q;
  if (error) throw new Error('Erreur lors du chargement.');
  return data || [];
}

/*DKDK_LIST_ADMIN*/
// Liste TOUS les morceaux (approved + pending) pour l admin
/*DKDK_USAGE_COUNT*/
export async function updateMusiqueAdmin(id: string, params: {
  artiste?: string; titre?: string; album?: string; duree_sec?: number;
  pays_origine?: string; continent?: string; danse?: string; style?: string;
  cover_url?: string; ref_url?: string;
}) {  /*DKDK_UPDATE_MUSIC — modification d'un morceau par l'admin*/
  if (!id) throw new Error('Identifiant manquant.');
  const artiste = (params.artiste || '').trim();
  const titre = (params.titre || '').trim();
  if (!artiste || !titre) throw new Error('Artiste et titre obligatoires.');
  const patch = {
    artiste, titre,
    album: params.album ?? null,
    duree_sec: params.duree_sec ?? null,
    pays_origine: params.pays_origine ?? null,
    continent: params.continent ?? null,
    danse: params.danse ?? null,
    style: params.style ?? null,
    cover_url: params.cover_url ?? null,
    ref_url: params.ref_url ?? null,
  };
  const { error } = await supabase.from('musiques').update(patch).eq('id', id);
  if (error) throw new Error('Erreur lors de la modification du morceau.');
  return { id };
}

export async function listAllMusiquesAdmin() {
  const { data, error } = await supabase.from('musiques').select('*').order('created_at', { ascending: false });
  if (error) throw new Error('Erreur lors du chargement (admin).');
  const musiques = data || [];

  // 1 seule requete: tous les brackets (track_id + status)
  const { data: brackets } = await supabase.from('brackets').select('track_id, status');
  const rows = brackets || [];

  // Comptage en memoire par track_id
  const total: Record<string, number> = {};
  const vivant: Record<string, number> = {};
  for (const b of rows) {
    const tid = b.track_id;
    if (!tid) continue;
    total[tid] = (total[tid] || 0) + 1;
    // Defensif: tout statut different de 'done' est considere comme vivant
    if (b.status !== 'done') vivant[tid] = (vivant[tid] || 0) + 1;
  }

  // Attache usage_count + usage_status a chaque musique
  return musiques.map((m: any) => {
    const n = total[m.id] || 0;
    let statut = 'jamais';
    if (n > 0) statut = (vivant[m.id] || 0) > 0 ? 'en_cours' : 'termine';
    return { ...m, usage_count: n, usage_status: statut };
  });
}

/*DKDK_DELETE_ADMIN*/
// Supprime un morceau de la mediatheque (admin uniquement)
export async function deleteMusiqueAdmin(id: string) {
  if (!id || !id.trim()) throw new Error('Identifiant manquant.');
  const { error } = await supabase.from('musiques').delete().eq('id', id);
  if (error) throw new Error('Erreur lors de la suppression.');
  return { deleted: true };
}
