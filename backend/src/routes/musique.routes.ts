import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { lookupMusique, submitMusique, submitMusiqueAdmin, listMusiques, listAllMusiquesAdmin, deleteMusiqueAdmin } from '../services/musique.service';

const musiqueRouter = Router();

// Recherche MusicBrainz (auto-remplissage) - statique AVANT tout param
musiqueRouter.get('/lookup', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ success: false, error: 'Requete vide.' });
    const result = await lookupMusique(q);
    if (!result) return res.json({ success: true, data: null });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Soumission d'un morceau
musiqueRouter.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { artiste, titre, album, duree_sec, pays_origine, continent, danse, style, cover_url, source } = req.body;
    const result = await submitMusique({
      user_id: req.user!.userId,
      artiste, titre, album, duree_sec, pays_origine, continent, danse, style, cover_url, source,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/*DKDK_ADMIN_MUSIC_ROUTE*/
// Ajout d'un morceau par l'admin (source=admin, status=approved force serveur)
musiqueRouter.post('/admin', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { artiste, titre, album, duree_sec, pays_origine, continent, danse, style, cover_url } = req.body;
    const result = await submitMusiqueAdmin({
      admin_id: req.user!.userId,
      artiste, titre, album, duree_sec, pays_origine, continent, danse, style, cover_url,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Liste des morceaux approuves (filtres continent / pays optionnels)
musiqueRouter.get('/', async (req: Request, res: Response) => {
  try {
    const continent = req.query.continent ? String(req.query.continent) : undefined;
    const pays = req.query.pays ? String(req.query.pays) : undefined;
    const data = await listMusiques({ continent, pays });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});


/*DKDK_LIST_ADMIN_ROUTE*/
// Liste TOUS les morceaux (approved + pending) - admin seulement
musiqueRouter.get('/admin/list', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = await listAllMusiquesAdmin();
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});


/*DKDK_DELETE_ADMIN_ROUTE*/
// Suppression d un morceau - admin seulement
musiqueRouter.delete('/admin/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await deleteMusiqueAdmin(req.params.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default musiqueRouter;
