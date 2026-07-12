// backend/src/controllers/analytics.controller.ts
/*DKDK_ANALYTICS_DB*/
// Sessions actives : en memoire (fenetre 60s, volatilite sans consequence).
// Pages vues       : persistees dans public.page_views.
import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

interface Session {
  sessionId:  string;
  page:       string;
  country?:   string;
  userAgent?: string;
  isLoggedIn: boolean;
  lastSeen:   number;
}

const sessions = new Map<string, Session>();

// Nettoyage des sessions expirees toutes les 30s
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastSeen > 60_000) sessions.delete(id);
  }
}, 30_000);

// --- Heartbeat : ping depuis le frontend --------------------------
export async function heartbeat(req: Request, res: Response) {
  try {
    const { sessionId, page = '/', isLoggedIn = false } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const country = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? null;
    const userAgent = req.headers['user-agent'] ?? '';

    const existante = sessions.get(sessionId);

    // On enregistre une page vue UNIQUEMENT si :
    //   - la session est nouvelle, OU
    //   - elle a change de page
    // Sinon un visiteur immobile creerait 2 lignes par minute.
    const nouvelleVue = !existante || existante.page !== page;

    sessions.set(sessionId, {
      sessionId, page,
      country: country ?? undefined,
      userAgent,
      isLoggedIn: !!isLoggedIn,
      lastSeen: Date.now(),
    });

    if (nouvelleVue) {
      // Ecriture non bloquante : une erreur analytics ne doit jamais
      // casser la navigation de l'utilisateur.
      supabase.from('page_views').insert({
        session_id:   String(sessionId),
        page:         String(page),
        is_logged_in: !!isLoggedIn,
        country:      country,
      }).then(function (r: any) {
        if (r && r.error) console.error('[ANALYTICS] insert echoue :', r.error.message);
      });
    }

    return res.json({ ok: true, active: sessions.size });
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' });
  }
}

// --- Visiteurs actifs (memoire) -----------------------------------
export async function getActiveVisitors(_req: Request, res: Response) {
  const now = Date.now();
  const actifs = Array.from(sessions.values()).filter(s => now - s.lastSeen < 60_000);

  const compteur: Record<string, number> = {};
  for (const s of actifs) compteur[s.page] = (compteur[s.page] ?? 0) + 1;

  const topPages = Object.entries(compteur)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([page, count]) => ({ page, count }));

  return res.json({
    total:     actifs.length,
    logged_in: actifs.filter(s => s.isLoggedIn).length,
    visitors:  actifs.filter(s => !s.isLoggedIn).length,
    top_pages: topPages,
    sessions:  actifs.map(s => ({ page: s.page, isLoggedIn: s.isLoggedIn, lastSeen: s.lastSeen })),
  });
}

// --- Resume analytique (lu depuis la base) -------------------------
export async function getSummary(_req: Request, res: Response) {
  try {
    const maintenant = new Date();

    const debutJour = new Date(maintenant);
    debutJour.setHours(0, 0, 0, 0);

    const ilYaUneHeure = new Date(maintenant.getTime() - 3600_000);

    // Toutes les vues du jour (on les compte et on les repartit par heure)
    const { data: vues, error } = await supabase
      .from('page_views')
      .select('created_at')
      .gte('created_at', debutJour.toISOString());

    if (error) {
      console.error('[ANALYTICS] lecture echouee :', error.message);
      return res.status(500).json({ error: 'Lecture analytics echouee' });
    }

    const lignes = vues || [];

    // Repartition horaire du JOUR (remise a zero chaque jour, contrairement
    // a l'ancien compteur en memoire qui cumulait indefiniment).
    const parHeure: number[] = new Array(24).fill(0);
    let vuesDerniereHeure = 0;

    for (const l of lignes) {
      const d = new Date(l.created_at);
      parHeure[d.getHours()]++;
      if (d >= ilYaUneHeure) vuesDerniereHeure++;
    }

    const pic       = Math.max.apply(null, parHeure);
    const heurePic  = parHeure.indexOf(pic);

    return res.json({
      views_today:   lignes.length,
      views_hour:    vuesDerniereHeure,
      active_now:    sessions.size,
      peak_hour:     heurePic + 'h00-' + (heurePic + 1) + 'h00',
      peak_visits:   pic,
      hourly_visits: parHeure,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' });
  }
}
