// backend/src/controllers/analytics.controller.ts
/*DKDK_ANALYTICS_DB*/
// Sessions actives : en memoire (fenetre 60s, volatilite sans consequence).
// Pages vues       : persistees dans public.page_views.
/*DKDK_GEO*/
// Géolocalisation pays : conversion IP -> code pays ISO (2 lettres) hors-ligne,
// via geoip-lite (aucun appel réseau). On ne stocke plus l'IP (RGPD),
// uniquement le pays. Si l'import ci-dessous provoque une erreur TypeScript,
// remplacer par : import * as geoip from 'geoip-lite';
import geoip from 'geoip-lite';
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

/*DKDK_GEO_HELPER*/
// Déduit le code pays ISO (2 lettres majuscules) à partir de la requête.
// Railway transmet l'IP réelle du visiteur dans x-forwarded-for (1er élément).
// Retourne null si non déterminable (IP privée/locale, lookup vide, etc.).
function paysDepuisRequete(req: Request): string | null {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
          || (req.socket && req.socket.remoteAddress) || '';
  if (!ip) return null;
  const geo = ip ? geoip.lookup(ip) : null;
  const code = geo && geo.country ? String(geo.country).toUpperCase() : '';
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

// --- Heartbeat : ping depuis le frontend --------------------------
export async function heartbeat(req: Request, res: Response) {
  try {
    const { sessionId, page = '/', isLoggedIn = false } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    /*DKDK_GEO_CAPTURE*/
    // Avant : on stockait par erreur l'IP dans "country". Désormais on stocke
    // le vrai code pays (ISO 2 lettres), déduit de l'IP, et plus jamais l'IP.
    const country = paysDepuisRequete(req);
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

  /*DKDK_GEO_ACTIVE*/
  // Répartition par pays des visiteurs actifs (temps réel).
  const parPays: Record<string, number> = {};
  for (const s of actifs) {
    if (s.country && /^[A-Z]{2}$/.test(s.country)) {
      parPays[s.country] = (parPays[s.country] ?? 0) + 1;
    }
  }
  const by_country = Object.entries(parPays)
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ code, count }));

  return res.json({
    total:     actifs.length,
    logged_in: actifs.filter(s => s.isLoggedIn).length,
    visitors:  actifs.filter(s => !s.isLoggedIn).length,
    top_pages: topPages,
    by_country,
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
    /*DKDK_GEO_SUMMARY_SELECT*/ // on lit aussi "country" pour l'agrégation par pays
    const { data: vues, error } = await supabase
      .from('page_views')
      .select('created_at, country')
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
    /*DKDK_GEO_SUMMARY_AGG*/
    const parPays: Record<string, number> = {};

    for (const l of lignes) {
      const d = new Date(l.created_at);
      parHeure[d.getHours()]++;
      if (d >= ilYaUneHeure) vuesDerniereHeure++;
      // Agrégation par pays (on ignore les valeurs qui ne sont pas un code ISO,
      // ex. anciennes lignes qui contenaient une IP).
      const _c = (l as any).country;
      if (_c && /^[A-Z]{2}$/.test(_c)) parPays[_c] = (parPays[_c] || 0) + 1;
    }

    const pic       = Math.max.apply(null, parHeure);
    const heurePic  = parHeure.indexOf(pic);

    /*DKDK_GEO_SUMMARY_OUT*/
    const by_country = Object.entries(parPays)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({ code, count }));

    return res.json({
      views_today:   lignes.length,
      views_hour:    vuesDerniereHeure,
      active_now:    sessions.size,
      peak_hour:     heurePic + 'h00-' + (heurePic + 1) + 'h00',
      peak_visits:   pic,
      hourly_visits: parHeure,
      by_country,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' });
  }
}

/*DKDK_GEO_VOTES — Cagnotte / votes par pays (LECTURE SEULE, ne touche pas l'argent).
  Agrège les transactions de type 'vote' au statut 'success' par metadata.pays :
  montant encaissé (contribution brute à la cagnotte) + nombre de votes.*/
export async function getVotesByCountry(_req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, metadata')
      .eq('type', 'vote')
      .eq('status', 'success');

    if (error) {
      console.error('[ANALYTICS] votes-by-country echoue :', error.message);
      return res.status(500).json({ error: 'Lecture echouee' });
    }

    const agg: Record<string, { amount: number; count: number }> = {};
    for (const t of (data || []) as any[]) {
      const p = t.metadata && t.metadata.pays ? String(t.metadata.pays).toUpperCase() : '';
      if (/^[A-Z]{2}$/.test(p)) {
        if (!agg[p]) agg[p] = { amount: 0, count: 0 };
        agg[p].amount += Number(t.amount) || 0;
        agg[p].count  += 1;
      }
    }

    const by_country = Object.entries(agg)
      .map(([code, v]) => ({ code, amount: v.amount, count: v.count }))
      .sort((a, b) => b.amount - a.amount);

    const total = by_country.reduce((s, c) => s + c.amount, 0);
    return res.json({ by_country, total });
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' });
  }
}