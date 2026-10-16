import { Router, Request, Response } from 'express';
import { awardComment } from '../services/gamification.service'; /*DKDK_COMMENT_ECHOS*/
import { z } from 'zod';
import { requireAuth, requireAdmin, AuthRequest, requireVerified } from '../middleware/auth.middleware';
import {
  uploadVideo, moderateVideo, getPendingVideos, getVideosByStatus,
  getUserVideos, deleteVideo, VIDEO_CONSTRAINTS,
  getVideoById, getApprovedVideos,
  addComment, getCommentsByVideoId,
  getCandidatesByVideoId,
  preMarquerVideo,
  getVideoStats,
  presignUpload, confirmUpload, /*DKDK_R2_DIRECT*/
} from '../services/video.service';

export const videoRouter = Router();

// Schéma d'entrée du dépôt de vidéo — reflète les règles métier déjà en place.
const DISCIPLINES     = ['danse','chant','instrument','acapella','humour','poesie','conte','sport'] as const;
const CHALLENGE_TYPES = ['C2','C4','C6','C8','C12','C16'] as const;
const MIME_TYPES      = ['video/mp4','video/quicktime'] as const;
const optStr = (max: number) => z.string().max(max).nullish();

const uploadVideoSchema = z.object({
  discipline:     z.enum(DISCIPLINES),
  file_base64:    z.string().min(1).nullish(), /*DKDK_R2_DIRECT — optionnel : upload direct via storage_path*/
  storage_path:   optStr(512),
  size_mb:        z.number().positive().nullish(),
  mime_type:      z.enum(MIME_TYPES).nullish(),
  file_name:      optStr(255),
  title:          optStr(200),
  description:    optStr(4000),
  track_title:    optStr(200),
  track_artist:   optStr(200),
  track_genre:    optStr(100),
  challenge_type: z.enum(CHALLENGE_TYPES).nullish(),
  bracket_key:    optStr(100),
});


// ─── Routes statiques ─────────────────────────────────────────────────────────

videoRouter.get('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const videos = await getVideosByStatus(status);
    res.json({ videos, count: videos.length });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

videoRouter.get('/approved', async (_req: Request, res: Response) => {
  const videos = await getApprovedVideos();
  res.json({ videos, count: videos.length });
});

videoRouter.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const videos = await getUserVideos(req.user!.userId);
  res.json({ videos });
});

videoRouter.get('/pending', requireAuth, requireAdmin, async (_req, res) => {
  const videos = await getPendingVideos();
  res.json({ videos, count: videos.length });
});

videoRouter.get('/constraints', (_req: Request, res: Response) => {
  res.json(VIDEO_CONSTRAINTS);
});

/*DKDK_R2_DIRECT — 1) obtenir une URL signee pour envoyer le fichier DIRECTEMENT sur R2*/
const presignSchema = z.object({
  file_name: z.string().min(1).max(255),
  mime_type: z.enum(MIME_TYPES),
  size_mb:   z.number().positive(),
});
videoRouter.post('/presign', requireAuth, requireVerified, async (req: AuthRequest, res: Response) => {
  const parsed = presignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.issues.map(i => ({ champ: i.path.join('.'), message: i.message })) });
  }
  try {
    const { uploadUrl, storagePath } = await presignUpload({ userId: req.user!.userId, mimeType: parsed.data.mime_type, fileName: parsed.data.file_name, sizeMb: parsed.data.size_mb });
    return res.json({ success: true, uploadUrl, storagePath });
  } catch (e: any) {
    const msg = e?.message || 'PRESIGN_FAILED';
    return res.status(msg === 'FILE_TOO_LARGE' ? 413 : 400).json({ error: msg });
  }
});

videoRouter.post('/', requireAuth, requireVerified, async (req: AuthRequest, res: Response) => {
  const parsed = uploadVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      details: parsed.error.issues.map(i => ({ champ: i.path.join('.'), message: i.message })),
    });
  }
  try {
    const { discipline, track_title, track_artist, track_genre, title, description, bracket_key } = req.body;
    if (!discipline) return res.status(400).json({ error: 'DISCIPLINE_REQUIRED' });
    if (req.body.storage_path) { /*DKDK_R2_DIRECT — 2) fichier deja sur R2 : on verifie et on cree*/
      const video = await confirmUpload({
        userId: req.user!.userId, discipline,
        trackTitle: track_title, trackArtist: track_artist, trackGenre: track_genre,
        title, description,
        storagePath: req.body.storage_path, fileName: req.body.file_name || 'prestation.mp4', mimeType: req.body.mime_type || 'video/mp4',
        challengeType: req.body.challenge_type || 'C16', bracketKey: bracket_key,
      });
      return res.status(201).json({ success: true, video, message: 'Video soumise avec succes. Validation sous 24-48h.' });
    }
    if (req.body.file_base64) {
      const fileBuffer = Buffer.from(req.body.file_base64, 'base64');
      const fileSizeMb = fileBuffer.length / (1024 * 1024);
      const mimeType = req.body.mime_type || 'video/mp4';
      const fileName = req.body.file_name || 'prestation.mp4';
      const video = await uploadVideo({
        userId: req.user!.userId, discipline,
        trackTitle: track_title, trackArtist: track_artist, trackGenre: track_genre,
        title, description, fileBuffer, fileName, mimeType, fileSizeMb,
        challengeType: req.body.challenge_type || 'C16', bracketKey: bracket_key, /*DKDK_BRACKET_KEY*/
      });
      return res.status(201).json({ success: true, video, message: 'Video soumise avec succes. Validation sous 24-48h.' });
    }
    return res.status(400).json({ error: 'FILE_REQUIRED' });
  } catch (e) {
    return res.status(500).json({ error: (e && e.message) ? e.message : 'SUBMIT_FAILED' });
  }
});

videoRouter.post('/upload', requireAuth, requireVerified, async (req: AuthRequest, res: Response) => {
  const parsed = uploadVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      details: parsed.error.issues.map(i => ({ champ: i.path.join('.'), message: i.message })),
    });
  }
  const { discipline, track_title, track_artist, track_genre, title, description, bracket_key } = req.body;
  if (!discipline) return res.status(400).json({ error: 'DISCIPLINE_REQUIRED' });
  if (!req.body.file_base64) return res.status(400).json({ error: 'FILE_REQUIRED' });
  const fileBuffer = Buffer.from(req.body.file_base64, 'base64');
  const fileSizeMb = fileBuffer.length / (1024 * 1024);
  const mimeType = req.body.mime_type || 'video/mp4';
  const fileName = req.body.file_name || 'prestation.mp4';
  const video = await uploadVideo({
    userId: req.user!.userId, discipline,
    trackTitle: track_title, trackArtist: track_artist, trackGenre: track_genre,
    title, description, fileBuffer, fileName, mimeType, fileSizeMb,
    challengeType: req.body.challenge_type || 'C16', bracketKey: bracket_key, /*DKDK_BRACKET_KEY*/
  });
  res.status(201).json({ success: true, video, message: 'Vidéo soumise avec succès. Validation sous 24–48h.' });
});

// ─── Routes dynamiques /:id ────────────────────────────────────────────────────

videoRouter.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getVideoStats(req.params.id);
    res.json(stats);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

videoRouter.get('/:id/candidates', async (req: Request, res: Response) => {
  try {
    const candidates = await getCandidatesByVideoId(req.params.id);
    res.json({ candidates, count: candidates.length });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

videoRouter.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const comments = await getCommentsByVideoId(req.params.id);
    res.json({ comments, count: comments.length });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

videoRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const video = await getVideoById(req.params.id);
    res.json({ video });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    res.status(msg === 'VIDEO_NOT_FOUND' ? 404 : 500).json({ error: msg });
  }
});

videoRouter.post('/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  const { contenu } = req.body;
  if (!contenu?.trim()) return res.status(400).json({ error: 'CONTENT_REQUIRED' });
  try {
    const comment = await addComment(req.params.id, req.user!.userId, contenu);
    // Fidélité : commentaire vérifié -> +Échos (1x/vidéo, best-effort, gated)
    awardComment(req.user!.userId, req.params.id).catch(() => {});
    res.status(201).json({ success: true, comment });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg === 'VIDEO_NOT_FOUND' ? 404 : msg === 'CONTENT_TOO_LONG' ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

// Pre-marquage (aucune decision prise a ce stade) /*DKDK_PREMARQUE*/
videoRouter.put('/:id/premarque', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { couleur } = req.body;
    if (couleur !== null && !['orange', 'bleu'].includes(couleur)) return res.status(400).json({ error: 'INVALID_COULEUR' });
    const video = await preMarquerVideo(req.params.id, couleur);
    res.json({ success: true, video });
  } catch { res.status(500).json({ error: 'PREMARQUE_FAILED' }); }
});

videoRouter.put('/:id/moderate', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { decision, reason } = req.body;
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'INVALID_DECISION' });
  if (decision === 'rejected' && !reason) return res.status(400).json({ error: 'REJECTION_REASON_REQUIRED' });
  const video = await moderateVideo(req.params.id, req.user!.userId, decision, reason);
  res.json({ success: true, video });
});

videoRouter.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await deleteVideo(req.params.id, req.user!.userId, ['admin','moderateur'].includes(req.user!.role));
  res.json(result);
});
