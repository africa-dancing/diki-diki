import 'dotenv/config';
import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const educationRouter = Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// ── GET /v1/education/matieres ────────────────────────────────────
// Liste des 10 matières
educationRouter.get('/matieres', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('matieres')
      .select('*')
      .eq('actif', true)
      .order('ordre', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /v1/education/matieres/:id/chapitres ──────────────────────
// Chapitres d'une matière
educationRouter.get('/matieres/:id/chapitres', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('chapitres')
      .select('*, lecons(count)')
      .eq('matiere_id', req.params.id)
      .eq('actif', true)
      .order('ordre', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /v1/education/chapitres/:id/lecons ────────────────────────
// Leçons d'un chapitre
educationRouter.get('/chapitres/:id/lecons', async (req: Request, res: Response) => {
  try {
    const { data, error } = await getSupabase()
      .from('lecons')
      .select(`
        *,
        notes_lecons(note),
        soutiens(type)
      `)
      .eq('chapitre_id', req.params.id)
      .eq('actif', true)
      .order('ordre', { ascending: true });

    if (error) throw error;

    // Calculer la note moyenne pour chaque leçon
    const lecons = data?.map((l: any) => {
      const notes = l.notes_lecons?.map((n: any) => n.note) || [];
      const moyenne = notes.length
        ? (notes.reduce((a: number, b: number) => a + b, 0) / notes.length).toFixed(1)
        : null;
      const likes   = l.soutiens?.filter((s: any) => s.type === 'like').length || 0;
      const etoiles = l.soutiens?.filter((s: any) => s.type === 'etoile').length || 0;
      return { ...l, note_moyenne: moyenne, likes, etoiles };
    });

    res.json({ success: true, data: lecons });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /v1/education/lecons/:id ──────────────────────────────────
// Détail d'une leçon
educationRouter.get('/lecons/:id', async (req: Request, res: Response) => {
  try {
    // Incrémenter les vues
    await getSupabase()
      .from('lecons')
      .update({ vues: getSupabase().rpc('increment', { row_id: req.params.id }) })
      .eq('id', req.params.id);

    const { data, error } = await getSupabase()
      .from('lecons')
      .select('*, chapitres(titre, matiere_id, matieres(nom, emoji))')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /v1/education/chapitres ──────────────────────────────────
// Créer un chapitre
educationRouter.post('/chapitres', async (req: Request, res: Response) => {
  try {
    const { matiere_id, createur_id, titre, description, ordre } = req.body;

    if (!matiere_id || !createur_id || !titre) {
      return res.status(400).json({ success: false, error: 'Champs manquants.' });
    }

    const { data, error } = await getSupabase()
      .from('chapitres')
      .insert({ matiere_id, createur_id, titre, description, ordre: ordre || 0 })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST /v1/education/lecons ─────────────────────────────────────
// Créer une leçon
educationRouter.post('/lecons', async (req: Request, res: Response) => {
  try {
    const {
      chapitre_id, createur_id, titre, description,
      format, contenu_url, contenu_text, duree_min, ordre,
    } = req.body;

    if (!chapitre_id || !createur_id || !titre || !format) {
      return res.status(400).json({ success: false, error: 'Champs manquants.' });
    }

    if (!['video', 'texte_video', 'audio'].includes(format)) {
      return res.status(400).json({ success: false, error: 'Format invalide.' });
    }

    if (duree_min && (duree_min < 1 || duree_min > 60)) {
      return res.status(400).json({ success: false, error: 'Durée max : 60 minutes.' });
    }

    const { data, error } = await getSupabase()
      .from('lecons')
      .insert({
        chapitre_id, createur_id, titre, description,
        format, contenu_url, contenu_text,
        duree_min: duree_min || 0,
        ordre: ordre || 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST /v1/education/lecons/:id/noter ──────────────────────────
// Noter une leçon /20
educationRouter.post('/lecons/:id/noter', async (req: Request, res: Response) => {
  try {
    const { user_id, device_id, note } = req.body;

    if ((!user_id && !device_id) || note === undefined) {
      return res.status(400).json({ success: false, error: 'Champs manquants.' });
    }

    if (note < 0 || note > 20) {
      return res.status(400).json({ success: false, error: 'La note doit être entre 0 et 20.' });
    }

    const { data, error } = await getSupabase()
      .from('notes_lecons')
      .upsert(
        user_id
          ? { lecon_id: req.params.id, user_id, note }
          : { lecon_id: req.params.id, device_id, note },
        { onConflict: user_id ? 'lecon_id,user_id' : 'lecon_id,device_id' })
      .select()
      .single();

    if (error) throw error;

    // Recalculer la moyenne
    const { data: notes } = await getSupabase()
      .from('notes_lecons')
      .select('note')
      .eq('lecon_id', req.params.id);

    const moyenne = notes?.length
      ? (notes.reduce((a, b) => a + b.note, 0) / notes.length).toFixed(1)
      : note;

    res.json({ success: true, data, note_moyenne: moyenne });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /v1/education/lecons/:id/soutenir ────────────────────────
// Like (10 F CFA) ou Étoile (20 F CFA)
educationRouter.post('/lecons/:id/soutenir', async (req: Request, res: Response) => {
  try {
    const { user_id, createur_id, type } = req.body;

    if (!user_id || !createur_id || !type) {
      return res.status(400).json({ success: false, error: 'Champs manquants.' });
    }

    if (type !== 'etoile') {
      return res.status(400).json({ success: false, error: 'Seul le soutien par etoile est accepte.' });
    }

    const montant = 20;

    // Appel de la fonction SQL
    const { error } = await getSupabase().rpc('soutenir_lecon', {
      p_lecon_id:    req.params.id,
      p_user_id:     user_id,
      p_createur_id: createur_id,
      p_type:        type,
    });

    if (error) throw error;

    res.json({
      success: true,
      message: 'Etoile envoyee !',
      montant,
      createur_recoit: montant / 2,
      dkdk_recoit:     montant / 2,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /v1/education/createur/:id/stats ──────────────────────────
// Stats d'un créateur
educationRouter.get('/createur/:id/stats', async (req: Request, res: Response) => {
  try {
    const { data: lecons } = await getSupabase()
      .from('lecons')
      .select('id, titre, vues')
      .eq('createur_id', req.params.id);

    const { data: soutiens } = await getSupabase()
      .from('soutiens')
      .select('type, montant')
      .eq('createur_id', req.params.id);

    const { data: wallet } = await getSupabase()
      .from('portefeuilles')
      .select('solde')
      .eq('user_id', req.params.id)
      .single();

    const likes   = soutiens?.filter(s => s.type === 'like').length || 0;
    const etoiles = soutiens?.filter(s => s.type === 'etoile').length || 0;
    const gains   = soutiens?.reduce((a, s) => a + s.montant / 2, 0) || 0;
    const vues    = lecons?.reduce((a, l) => a + (l.vues || 0), 0) || 0;

    res.json({
      success: true,
      data: {
        nb_lecons: lecons?.length || 0,
        vues_total: vues,
        likes,
        etoiles,
        gains_fcfa: gains,
        solde_wallet: wallet?.solde || 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default educationRouter;