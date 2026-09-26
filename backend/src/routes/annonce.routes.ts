import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import {
  createAnnonce, listAnnoncesAdmin, listAnnoncesActives,
  updateAnnonce, deleteAnnonce, compterAnnonce,
} from '../services/annonce.service';

const annonceRouter = Router();

const optStr = (max: number) => z.string().max(max).nullish();
const annonceSchema = z.object({
  annonceur:           z.string().min(1).max(200),
  titre:               optStr(200),
  description:         optStr(500),
  lien_url:            optStr(1000),
  pays_cibles:         optStr(200),
  frequence:           z.coerce.number().int().min(1).max(50).nullish(),
  date_debut:          optStr(20),
  date_fin:            optStr(20),
  plafond_impressions: z.coerce.number().int().min(0).nullish(),
  ordre:               z.coerce.number().int().nullish(),
  media_url:           optStr(1000),
  media_type:          optStr(20),
  file_base64:         z.string().nullish(),
  file_name:           optStr(200),
  mime_type:           optStr(100),
});

// ---------- PUBLIC (côté spectateur) ----------

// Liste des pubs actives à diffuser (optionnellement ciblées par pays)
annonceRouter.get('/actives', async (req: Request, res: Response) => {
  try {
    const pays = req.query.pays ? String(req.query.pays) : undefined;
    const data = await listAnnoncesActives(pays);
    // On ne renvoie que le nécessaire à l'affichage.
    res.json({ success: true, data: (data || []).map((a: any) => ({
      id: a.id, annonceur: a.annonceur, titre: a.titre, description: a.description,
      media_url: a.media_url, media_type: a.media_type, lien_url: a.lien_url, frequence: a.frequence,
    })) });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Compter une impression (vue)
annonceRouter.post('/:id/impression', async (req: Request, res: Response) => {
  try { await compterAnnonce(req.params.id, 'impression'); res.json({ success: true }); }
  catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
});

// Compter un clic
annonceRouter.post('/:id/clic', async (req: Request, res: Response) => {
  try { await compterAnnonce(req.params.id, 'clic'); res.json({ success: true }); }
  catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
});

// ---------- ADMIN ----------

// Toutes les pubs
annonceRouter.get('/', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try { res.json({ success: true, data: await listAnnoncesAdmin() }); }
  catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
});

// Créer (upload direct via file_base64, ou media_url)
annonceRouter.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  const p = annonceSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: p.error.issues.map(i => ({ champ: i.path.join('.'), message: i.message })) });
  try {
    const b = req.body;
    let fileBuffer: Buffer | undefined;
    let fileSizeMb: number | undefined;
    if (b.file_base64) {
      fileBuffer = Buffer.from(b.file_base64, 'base64');
      fileSizeMb = fileBuffer.length / (1024 * 1024);
    }
    const data = await createAnnonce({
      annonceur: b.annonceur, titre: b.titre, description: b.description, lien_url: b.lien_url,
      pays_cibles: b.pays_cibles, frequence: b.frequence, date_debut: b.date_debut, date_fin: b.date_fin,
      plafond_impressions: b.plafond_impressions, ordre: b.ordre, media_url: b.media_url, media_type: b.media_type,
      fileBuffer, fileName: b.file_name, mimeType: b.mime_type, fileSizeMb,
    });
    res.json({ success: true, data });
  } catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
});

// Modifier (dont activer/suspendre via { actif })
annonceRouter.patch('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, data: await updateAnnonce(req.params.id, req.body) }); }
  catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
});

// Supprimer
annonceRouter.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, data: await deleteAnnonce(req.params.id) }); }
  catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
});

export default annonceRouter;
