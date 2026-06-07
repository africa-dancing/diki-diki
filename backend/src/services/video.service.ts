import { supabase } from '../../config/supabase';
const BUCKET = 'dkdk-videos';
const MAX_SIZE_MB = 500;
const MAX_DURATION = 180;
const ALLOWED_TYPES = ['video/mp4', 'video/quicktime'];
export type Discipline = 'danse' | 'chant' | 'instrument' | 'acapella' | 'humour' | 'poesie';
export interface UploadVideoParams { userId: string; discipline: Discipline; trackTitle?: string; trackArtist?: string; trackGenre?: string; title?: string; description?: string; fileBuffer: Buffer; fileName: string; mimeType: string; fileSizeMb: number; }

export async function uploadVideo(params: UploadVideoParams) {
  const { userId, discipline, trackTitle, trackArtist, trackGenre, title, description, fileBuffer, fileName, mimeType, fileSizeMb } = params;
  if (!ALLOWED_TYPES.includes(mimeType)) throw new Error('INVALID_FORMAT');
  if (fileSizeMb > MAX_SIZE_MB) throw new Error('FILE_TOO_LARGE');
  const ext = fileName.split('.').pop();
  const storagePath = `${userId}/${Date.now()}_prestation.${ext}`;
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });
  if (uploadErr) throw new Error('UPLOAD_FAILED');
  const { data: signedUrl } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 604800);
  const { data: video, error: dbErr } = await supabase.from('videos').insert({ user_id: userId, discipline, track_title: trackTitle, track_artist: trackArtist, track_genre: trackGenre, title, description, storage_path: storagePath, storage_url: signedUrl?.signedUrl, file_size_mb: fileSizeMb, format: ext, status: 'pending' }).select().single();
  if (dbErr) throw dbErr;
  await notifyModerators(video.id, userId, discipline);
  return video;
}

export async function moderateVideo(videoId: string, moderatorId: string, decision: 'approved' | 'rejected', reason?: string) {
  const { data: video, error } = await supabase.from('videos').update({ status: decision, reviewed_by: moderatorId, reviewed_at: new Date().toISOString(), rejection_reason: reason || null, updated_at: new Date().toISOString() }).eq('id', videoId).select('*').single();
  if (error) throw error;
  await supabase.from('notifications').insert({ user_id: video.user_id, type: `video_${decision}`, title: decision === 'approved' ? 'Video validee' : 'Video refusee', message: decision === 'approved' ? 'Votre video a ete validee' : `Refusee: ${reason}`, data: { video_id: videoId, decision, reason } });
  return video;
}

export async function getPendingVideos() {
  const { data, error } = await supabase.from('videos').select('*').eq('status', 'pending').order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getUserVideos(userId: string) {
  const { data, error } = await supabase.from('videos').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function refreshVideoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 604800);
  if (error || !data) throw new Error('URL_REFRESH_FAILED');
  return data.signedUrl;
}

export async function deleteVideo(videoId: string, userId: string) {
  const { data: video } = await supabase.from('videos').select('storage_path, user_id').eq('id', videoId).single();
  if (!video) throw new Error('VIDEO_NOT_FOUND');
  if (video.user_id !== userId) throw new Error('FORBIDDEN');
  await supabase.storage.from(BUCKET).remove([video.storage_path]);
  await supabase.from('videos').delete().eq('id', videoId);
  return { success: true };
}

export interface CreateVideoFromUrlParams { userId: string; discipline: string; trackTitle?: string; trackArtist?: string; trackGenre?: string; title?: string; description?: string; videoUrl: string; }

export async function createVideoFromUrl(params: CreateVideoFromUrlParams) {
  const { userId, discipline, trackTitle, trackArtist, trackGenre, title, description, videoUrl } = params;
  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) throw new Error('INVALID_URL');
  const { data: video, error: dbErr } = await supabase.from('videos').insert({
    user_id: userId, discipline, track_title: trackTitle, track_artist: trackArtist, track_genre: trackGenre,
    title, description, storage_url: videoUrl, storage_path: videoUrl, status: 'pending'
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

export const VIDEO_CONSTRAINTS = { maxSizeMb: MAX_SIZE_MB, maxDuration: MAX_DURATION, allowedTypes: ALLOWED_TYPES, allowedFormats: ['MP4', 'MOV'], minResolution: '480p' };

// ── Récupérer une vidéo par ID (sans filtre statut — le RLS gère) ──
export async function getVideoById(videoId: string) {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single();
  if (error || !data) throw new Error('VIDEO_NOT_FOUND');
  return data;
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
  const { data, error } = await supabase.from('videos').select('*').eq('status', 'approved').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
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