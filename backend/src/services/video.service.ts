import { supabase } from '../../config/supabase';
/*DKDK_R2*/
import { r2, R2_BUCKET } from '../../config/r2';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// const BUCKET = 'pac-videos';  /*DKDK_R2*/ ancien bucket Supabase, conserve pour memoire
const MAX_SIZE_MB = 500;
const MAX_DURATION = 600;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime'];
export type Discipline = 'danse' | 'chant' | 'instrument' | 'acapella' | 'humour' | 'poesie' | 'conte' | 'sport'; /*DKDK_DISC_TYPE*/
export interface UploadVideoParams { userId: string; discipline: Discipline; trackTitle?: string; trackArtist?: string; trackGenre?: string; title?: string; description?: string; fileBuffer: Buffer; fileName: string; mimeType: string; fileSizeMb: number; challengeType?: string; bracketKey?: string; /*DKDK_BRACKET_KEY*/ }

export async function uploadVideo(params: UploadVideoParams) {
  const { userId, discipline, trackTitle, trackArtist, trackGenre, title, description, fileBuffer, fileName, mimeType, fileSizeMb, challengeType, bracketKey } = params;
  if (!ALLOWED_TYPES.includes(mimeType)) throw new Error('INVALID_FORMAT');
  if (fileSizeMb > MAX_SIZE_MB) throw new Error('FILE_TOO_LARGE');
  const ext = fileName.split('.').pop();
  const storagePath = `${userId}/${Date.now()}_prestation.${ext}`;
  /*DKDK_R2*/ // Envoi vers Cloudflare R2 (egress gratuit)
  try {
    await r2.send(new PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         storagePath,
      Body:        fileBuffer,
      ContentType: mimeType,
    }));
  } catch (e: any) {
    console.error('[R2] upload echoue :', e?.message ?? e);
    throw new Error('UPLOAD_FAILED');
  }

  // URL signee valable 7 jours (meme duree qu'avant).
  const urlSignee = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }),
    { expiresIn: 604800 }
  );
  const signedUrl = { signedUrl: urlSignee };
  const { data: video, error: dbErr } = await supabase.from('videos').insert({ user_id: userId, discipline, track_title: trackTitle, track_artist: trackArtist, track_genre: trackGenre, title, description, storage_path: storagePath, storage_url: signedUrl?.signedUrl, file_size_mb: fileSizeMb, format: ext, status: 'pending', challenge_type: challengeType || 'C16', bracket_key: bracketKey || null /*DKDK_BRACKET_KEY*/ }).select().single();
  if (dbErr) throw dbErr;
  await notifyModerators(video.id, userId, discipline);
  return video;
}

// Pre-marquage par la moderation : orange = pose probleme, bleu = bonne, null = efface /*DKDK_PREMARQUE*/
export async function preMarquerVideo(videoId: string, couleur: string | null) {
  const { data, error } = await supabase.from('videos').update({ pre_marque: couleur }).eq('id', videoId).select('id, pre_marque').single();
  if (error) throw error;
  return data;
}

export async function moderateVideo(videoId: string, moderatorId: string, decision: 'approved' | 'rejected', reason?: string) {
  const { data: video, error } = await supabase.from('videos').update({ status: decision, reviewed_by: moderatorId, reviewed_at: new Date().toISOString(), rejection_reason: reason || null, updated_at: new Date().toISOString() }).eq('id', videoId).select('*').single();
  if (error) throw error;
  await supabase.from('notifications').insert({ user_id: video.user_id, type: `video_${decision}`, title: decision === 'approved' ? 'Video validee' : 'Video refusee', message: decision === 'approved' ? 'Votre video a ete validee' : `Refusee: ${reason}`, data: { video_id: videoId, decision, reason } });
  return video;
}

export async function getVideosByStatus(status?: string) {
  let query = supabase.from('videos').select('*').order('created_at', { ascending: false });
  if (status && ['pending','approved','rejected'].includes(status)) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return await signerVideos(data || []); /*DKDK_SIGN_READ*/
}

export async function getPendingVideos() {
  const { data, error } = await supabase.from('videos').select('*').eq('status', 'pending').order('created_at', { ascending: true });
  if (error) throw error;
  return await signerVideos(data || []); /*DKDK_SIGN_READ*/
}

export async function getUserVideos(userId: string) {
  const { data, error } = await supabase.from('videos').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return await signerVideos(data || []); /*DKDK_SIGN_READ*/
}

export async function refreshVideoUrl(storagePath: string): Promise<string> {
  /*DKDK_R2*/
  try {
    return await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }),
      { expiresIn: 604800 }
    );
  } catch (e: any) {
    console.error('[R2] refresh echoue :', e?.message ?? e);
    throw new Error('URL_REFRESH_FAILED');
  }
}

export async function deleteVideo(videoId: string, userId: string, isAdmin = false) {
  const { data: video } = await supabase.from('videos').select('storage_path, user_id').eq('id', videoId).single();
  if (!video) throw new Error('VIDEO_NOT_FOUND');
  if (!isAdmin && video.user_id !== userId) throw new Error('FORBIDDEN');
  /*DKDK_R2*/ // Suppression dans R2. Non bloquante : si le fichier
  // n'existe plus, la ligne en base doit quand meme partir.
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: video.storage_path }));
  } catch (e: any) {
    console.error('[R2] suppression echouee (non bloquant) :', e?.message ?? e);
  }
  await supabase.from('videos').delete().eq('id', videoId);
  return { success: true };
}

export interface CreateVideoFromUrlParams { userId: string; discipline: string; trackTitle?: string; trackArtist?: string; trackGenre?: string; title?: string; description?: string; videoUrl: string; challengeType?: string; bracketKey?: string; /*DKDK_BRACKET_KEY*/ }

export async function createVideoFromUrl(params: CreateVideoFromUrlParams) {
  const { userId, discipline, trackTitle, trackArtist, trackGenre, title, description, videoUrl, challengeType, bracketKey } = params;
  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) throw new Error('INVALID_URL');
  const { data: video, error: dbErr } = await supabase.from('videos').insert({
    user_id: userId, discipline, track_title: trackTitle, track_artist: trackArtist, track_genre: trackGenre,
    title, description, storage_url: videoUrl, storage_path: videoUrl, status: 'pending', challenge_type: challengeType || 'C16', bracket_key: bracketKey || null /*DKDK_BRACKET_KEY*/
  }).select().single();
  if (dbErr) { console.log('[createVideoFromUrl] ERREUR INSERT', JSON.stringify(dbErr)); throw dbErr; }
  try { await notifyModerators(video.id, userId, discipline as Discipline); } catch (e) { console.log('[createVideoFromUrl] notifyModerators a echoue (non bloquant):', e.message); }
  return video;
}

async function notifyModerators(videoId: string, userId: string, discipline: Discipline) {
  const { data: mods } = await supabase.from('users').select('id').in('role', ['admin', 'moderator']);
  if (!mods?.length) return;
  await supabase.from('notifications').insert(mods.map(mod => ({ user_id: mod.id, type: 'video_pending', title: 'Nouvelle video', message: `Video de ${discipline} en attente`, data: { video_id: videoId, submitter_id: userId, discipline } })));
}

/*DKDK_SIGN_READ*/
// --- Signature a la lecture ---------------------------------------
// Une URL signee R2 expire au bout de 7 jours. Plutot que de la stocker
// et d'esperer qu'un cron la renouvelle, on en fabrique une NEUVE a
// chaque lecture. Une URL ne peut donc jamais etre perimee.

// Signe UNE video. Ne touche pas aux videos sans storage_path.
export async function signerVideo(video: any): Promise<any> {
  if (!video || !video.storage_path) return video;

  // Securite : si storage_path est une URL (ancien mode 'lien externe'),
  // on la laisse telle quelle : ce n'est pas un fichier R2.
  if (/^https?:\/\//i.test(video.storage_path)) return video;

  try {
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: video.storage_path }),
      { expiresIn: 604800 }
    );
    return Object.assign({}, video, { storage_url: url });
  } catch (e: any) {
    // Une signature ratee ne doit pas faire disparaitre la video :
    // on renvoie l'objet tel quel plutot que de casser toute la page.
    console.error('[R2] signature echouee pour ' + video.storage_path + ' :', e?.message ?? e);
    return video;
  }
}

// Signe un TABLEAU de videos, en parallele.
export async function signerVideos(videos: any[]): Promise<any[]> {
  if (!videos || videos.length === 0) return videos || [];
  return await Promise.all(videos.map(signerVideo));
}

export const VIDEO_CONSTRAINTS = { maxSizeMb: MAX_SIZE_MB, maxDuration: MAX_DURATION, allowedTypes: ALLOWED_TYPES, allowedFormats: ['MP4', 'MOV'], minResolution: '480p' };

// ── Récupérer une vidéo par ID (sans filtre statut — le RLS gère) ──
export async function getVideoById(videoId: string) {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();
  if (error || !data) throw new Error('VIDEO_NOT_FOUND');
  return await signerVideo(data); /*DKDK_SIGN_READ*/
}

export async function addComment(videoId: string, userId: string, content: string) {
  if (!content?.trim()) throw new Error('CONTENT_REQUIRED');
  if (content.length > 500) throw new Error('CONTENT_TOO_LONG');
  const { data: video } = await supabase.from('videos').select('id, user_id').eq('id', videoId).single();
  if (!video) throw new Error('VIDEO_NOT_FOUND');
  const { data: comment, error } = await supabase.from('comments').insert({ video_id: videoId, user_id: userId, content: content.trim() }).select('*').single();
  if (error) throw error;
  if (video.user_id !== userId) { await supabase.from('notifications').insert({ user_id: video.user_id, type: 'new_comment', title: 'Nouveau commentaire', message: 'Quelquun a commente votre video', data: { video_id: videoId, comment_id: comment.id } }); }
  return comment;
}

export async function getApprovedVideos() {
  /*DKDK_HOME_CHALLENGE_STATE*/
  // Home = videos rattachees a un challenge + etat normalise (waiting/live/ended)
  const { data: parts, error: pErr } = await supabase
    .from('bracket_participants')
    .select('video_id, bracket_id')
    .not('video_id', 'is', null);
  if (pErr) throw pErr;
  const partList = parts || [];
  const ids = Array.from(new Set(partList.map((p: any) => p.video_id).filter(Boolean)));
  if (ids.length === 0) return [];
  const bracketIds = Array.from(new Set(partList.map((p: any) => p.bracket_id).filter(Boolean)));
  const { data: bks, error: bErr } = await supabase
    .from('brackets')
    .select('id, status')
    .in('id', bracketIds);
  if (bErr) throw bErr;
  const norm = (st: string): string => {
    if (st === 'done') return 'ended';
    if (st === 'active' || st === 'in_progress') return 'live';
    return 'waiting';
  };
  const stateByBracket: Record<string, string> = {};
  (bks || []).forEach((b: any) => { stateByBracket[b.id] = norm(b.status); });
  const stateByVideo: Record<string, string> = {};
  partList.forEach((p: any) => { if (p.video_id && p.bracket_id) stateByVideo[p.video_id] = stateByBracket[p.bracket_id] || 'waiting'; });
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('status', 'approved')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (error) throw error;
  /*DKDK_SIGN_READ*/
  const avecEtat = (data || []).map((v: any) => ({ ...v, challenge_state: stateByVideo[v.id] || 'waiting' }));
  return await signerVideos(avecEtat);
}

export async function getCommentsByVideoId(videoId: string) {
  const { data, error } = await supabase.from('comments').select('*').eq('video_id', videoId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCandidatesByVideoId(videoId: string) {
  const { data: candidate } = await supabase
    .from('candidates')
    .select('contest_id')
    .eq('video_id', videoId)
    .single();

  if (!candidate) return [];

  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('contest_id', candidate.contest_id)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getVideoStats(videoId: string) {
  const { data, error } = await supabase
    .from('votes')
    .select('id')
    .eq('video_id', videoId);

  if (error) throw new Error(JSON.stringify(error));

  return {
    video_id: videoId,
    vote_count: data?.length ?? 0,
  };
}