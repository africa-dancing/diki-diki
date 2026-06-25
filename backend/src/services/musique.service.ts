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

// Recherche un morceau sur MusicBrainz et renvoie les metadonnees pre-remplies
export async function lookupMusique(query: string) {
  const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
  let r;
  try {
    r = await fetch(url, { headers: { 'User-Agent': UA } });
  } catch (e: any) {
    console.error('[MUSICBRAINZ] fetch failed:', e?.message, e?.cause);
    throw new Error('MusicBrainz injoignable: ' + (e?.message || 'inconnu'));
  }
  if (!r.ok) {
    console.error('[MUSICBRAINZ] status:', r.status);
    throw new Error('MusicBrainz a repondu ' + r.status);
  }
  const data: any = await r.json();
  const rec = (data.recordings || [])[0];
  if (!rec) return null;

  const artisteCredit = (rec['artist-credit'] || [])[0];
  const artiste = artisteCredit?.name || rec['artist-credit']?.[0]?.artist?.name || '';
  const artistId = artisteCredit?.artist?.id;
  const release = (rec.releases || [])[0];
  const album = release?.title || '';
  const duree_sec = rec.length ? Math.round(rec.length / 1000) : null;

  // Pays d'origine via l'artiste
  let pays_origine = '';
  let continent = '';
  if (artistId) {
    try {
      const ar = await fetch(`https://musicbrainz.org/ws/2/artist/${artistId}?fmt=json`, { headers: { 'User-Agent': UA } });
      if (ar.ok) {
        const ad: any = await ar.json();
        pays_origine = ad.country || ad.area?.name || '';
        const code = ad.country || '';
        continent = PAYS_CONTINENT[code] || '';
      }
    } catch {}
  }

  return {
    titre: rec.title || '',
    artiste, album, duree_sec,
    pays_origine, continent,
    cover_url: '',
    source: 'musicbrainz' as const,
  };
}

// Enregistre un morceau soumis par un utilisateur (status pending)
export async function submitMusique(params: {
  user_id: string; artiste: string; titre: string; album?: string;
  duree_sec?: number; pays_origine?: string; continent?: string;
  danse?: string; style?: string; cover_url?: string; source?: string;
}) {
  const { user_id, artiste, titre } = params;
  if (!artiste?.trim() || !titre?.trim()) throw new Error('Artiste et titre obligatoires.');
  const { data, error } = await supabase.from('musiques').insert({
    artiste: artiste.trim(), titre: titre.trim(),
    album: params.album || null, duree_sec: params.duree_sec || null,
    pays_origine: params.pays_origine || null, continent: params.continent || null,
    danse: params.danse || null, style: params.style || null,
    cover_url: params.cover_url || null,
    source: params.source === 'musicbrainz' ? 'musicbrainz' : 'manuel',
    submitted_by: user_id, status: 'pending',
  }).select('id').single();
  if (error) throw new Error('Erreur lors de l enregistrement du morceau.');
  return { id: data.id };
}

/*DKDK_SUBMIT_ADMIN*/
// Enregistre un morceau ajoute par l'admin (source=admin, status=approved directement)
export async function submitMusiqueAdmin(params: {
  admin_id: string; artiste: string; titre: string; album?: string;
  duree_sec?: number; pays_origine?: string; continent?: string;
  danse?: string; style?: string; cover_url?: string;
}) {
  const { admin_id, artiste, titre } = params;
  if (!artiste || !artiste.trim() || !titre || !titre.trim()) throw new Error('Artiste et titre obligatoires.');
  const { data, error } = await supabase.from('musiques').insert({
    artiste: artiste.trim(), titre: titre.trim(),
    album: params.album || null, duree_sec: params.duree_sec || null,
    pays_origine: params.pays_origine || null, continent: params.continent || null,
    danse: params.danse || null, style: params.style || null,
    cover_url: params.cover_url || null,
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
