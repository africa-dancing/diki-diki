import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import {
  uploadVideo, createVideoFromUrl, moderateVideo, getPendingVideos,
  getUserVideos, deleteVideo, VIDEO_CONSTRAINTS,
  getVideoById, getApprovedVideos,
  addComment, getCommentsByVideoId,
  getCandidatesByVideoId,
  getVideoStats,
} from '../services/video.service';

export const videoRouter = Router();

// ─── Routes statiques ─────────────────────────────────────────────────────────

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

videoRouter.post('/', requireAuth, async (req, res) => {
  try {
    const { discipline, track_title, track_artist, track_genre, title, description, video_url } = req.body;
    if (!discipline) return res.status(400).json({ error: 'DISCIPLINE_REQUIRED' });
    if (video_url) {
      const video = await createVideoFromUrl({
        userId: req.user.userId, discipline,
        trackTitle: track_title, trackArtist: track_artist, trackGenre: track_genre,
        title, description, videoUrl: video_url,
      });
      return res.status(201).json({ success: true, video, message: 'Video soumise avec succes. Validation sous 24-48h.' });
    }
    if (req.body.file_base64) {
      const fileBuffer = Buffer.from(req.body.file_base64, 'base64');
      const fileSizeMb = fileBuffer.length / (1024 * 1024);
      const mimeType = req.body.mime_type || 'video/mp4';
      const fileName = req.body.file_name || 'prestation.mp4';
      const video = await uploadVideo({
        userId: req.user.userId, discipline,
        trackTitle: track_title, trackArtist: track_artist, trackGenre: track_genre,
        title, description, fileBuffer, fileName, mimeType, fileSizeMb,
      });
      return res.status(201).json({ success: true, video, message: 'Video soumise avec succes. Validation sous 24-48h.' });
    }
    return res.status(400).json({ error: 'VIDEO_URL_OR_FILE_REQUIRED' });
  } catch (e) {
    return res.status(500).json({ error: (e && e.message) ? e.message : 'SUBMIT_FAILED' });
  }
});

videoRouter.post('/upload', requireAuth, async (req: AuthRequest, res: Response) => {
  const { discipline, track_title, track_artist, track_genre, title, description } = req.body;
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
    res.status(201).json({ success: true, comment });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const status = msg === 'VIDEO_NOT_FOUND' ? 404 : msg === 'CONTENT_TOO_LONG' ? 400 : 500;
    res.status(status).json({ error: msg });
  }
});

videoRouter.put('/:id/moderate', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const { decision, reason } = req.body;
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'INVALID_DECISION' });
  if (decision === 'rejected' && !reason) return res.status(400).json({ error: 'REJECTION_REASON_REQUIRED' });
  const video = await moderateVideo(req.params.id, req.user!.userId, decision, reason);
  res.json({ success: true, video });
});

videoRouter.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await deleteVideo(req.params.id, req.user!.userId);
  res.json(result);
});
