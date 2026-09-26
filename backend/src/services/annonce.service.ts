// Régie publicitaire — spots diffusés entre deux prestations.
// STRICTEMENT séparé de l'argent des votes/cagnotte : ce sont des recettes plateforme.
import { supabase } from '../../config/supabase';
import { r2, R2_BUCKET } from '../../config/r2';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 100;
const SIGN_EXPIRES = 604800; // 7 jours

export interface CreateAnnonceParams {
  annonceur: string;
  titre?: string;
  description?: string;
  lien_url?: string;
  pays_cibles?: string;      // "BJ,TG" — vide = tous les pays
  frequence?: number;        // pub toutes les N vidéos
  date_debut?: string | null;
  date_fin?: string | null;
  plafond_impressions?: number | null;
  ordre?: number;
  media_url?: string;        // si pub fournie par URL (sans upload)
  media_type?: string;       // 'video' | 'image'
  // upload direct :
  fileBuffer?: Buffer;
  fileName?: string;
  mimeType?: string;
  fileSizeMb?: number;
}

async function signer(storagePath: string): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }), { expiresIn: SIGN_EXPIRES });
}

export async function createAnnonce(p: CreateAnnonceParams) {
  let storagePath: string | null = null;
  let mediaUrl = p.media_url || null;
  let mediaType = p.media_type || 'video';

  if (p.fileBuffer && p.fileName) {
    if (!ALLOWED_TYPES.includes(p.mimeType || '')) throw new Error('INVALID_FORMAT');
    if ((p.fileSizeMb || 0) > MAX_SIZE_MB) throw new Error('FILE_TOO_LARGE');
    const ext = p.fileName.split('.').pop();
    storagePath = `annonces/${Date.now()}_spot.${ext}`;
    try {
      await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: storagePath, Body: p.fileBuffer, ContentType: p.mimeType }));
    } catch (e: any) {
      console.error('[R2] upload annonce echoue :', e?.message ?? e);
      throw new Error('UPLOAD_FAILED');
    }
    mediaUrl = await signer(storagePath);
    mediaType = (p.mimeType || '').startsWith('image/') ? 'image' : 'video';
  }

  const { data, error } = await supabase.from('annonces').insert({
    annonceur: p.annonceur,
    titre: p.titre || null,
    description: p.description || null,
    media_url: mediaUrl,
    storage_path: storagePath,
    media_type: mediaType,
    lien_url: p.lien_url || null,
    pays_cibles: p.pays_cibles || null,
    frequence: p.frequence ?? 5,
    date_debut: p.date_debut || null,
    date_fin: p.date_fin || null,
    plafond_impressions: p.plafond_impressions ?? null,
    ordre: p.ordre ?? 0,
    actif: true,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function listAnnoncesAdmin() {
  const { data, error } = await supabase.from('annonces').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Pubs actives à diffuser (côté spectateur). Filtre dates + plafond + pays, rafraîchit l'URL signée.
export async function listAnnoncesActives(pays?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.from('annonces').select('*').eq('actif', true).order('ordre', { ascending: true });
  if (error) throw error;
  const rows = (data || []).filter((a: any) => {
    if (a.date_debut && a.date_debut > today) return false;
    if (a.date_fin && a.date_fin < today) return false;
    if (a.plafond_impressions != null && (a.impressions || 0) >= a.plafond_impressions) return false;
    if (a.pays_cibles && pays) {
      const cibles = String(a.pays_cibles).split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
      if (cibles.length && !cibles.includes(String(pays).toUpperCase())) return false;
    }
    return true;
  });
  // rafraîchir les URLs signées R2 (expirent au bout de 7 j)
  for (const a of rows) {
    if (a.storage_path) {
      try { a.media_url = await signer(a.storage_path); } catch { /* on garde l'ancienne */ }
    }
  }
  return rows;
}

export async function updateAnnonce(id: string, patch: Record<string, any>) {
  const autorises = ['annonceur','titre','description','lien_url','pays_cibles','frequence','date_debut','date_fin','plafond_impressions','ordre','actif','media_url','media_type'];
  const clean: Record<string, any> = {};
  for (const k of autorises) if (k in patch) clean[k] = patch[k];
  clean.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('annonces').update(clean).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAnnonce(id: string) {
  const { data: a } = await supabase.from('annonces').select('storage_path').eq('id', id).single();
  if (a?.storage_path) {
    try { await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: a.storage_path })); }
    catch (e: any) { console.error('[R2] suppression annonce (non bloquant) :', e?.message ?? e); }
  }
  const { error } = await supabase.from('annonces').delete().eq('id', id);
  if (error) throw error;
  return { ok: true };
}

// Comptage via RPC atomique (increment côté base). type = 'impression' | 'clic'.
export async function compterAnnonce(id: string, type: 'impression' | 'clic' = 'impression') {
  const { error } = await supabase.rpc('compter_annonce', { p_id: id, p_type: type });
  if (error) throw error;
  return { ok: true };
}
