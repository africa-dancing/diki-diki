// backend/src/controllers/analytics.ts
import { Request, Response } from 'express';

// ── Sessions actives en mémoire (TTL 60s) ──────────────────────────
interface Session {
  sessionId: string;
  page:      string;
  country?:  string;
  userAgent?: string;
  isLoggedIn: boolean;
  lastSeen:  number;
}

const sessions = new Map<string, Session>();
const pageViews: { page: string; ts: number }[] = [];
const hourlyVisits: number[] = new Array(24).fill(0);

// Nettoyer les sessions expirées toutes les 30s
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastSeen > 60_000) sessions.delete(id);
  }
}, 30_000);

// ── Heartbeat — ping depuis le frontend ────────────────────────────
export async function heartbeat(req: Request, res: Response) {
  try {
    const { sessionId, page = '/', isLoggedIn = false } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const country = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? 'Inconnu';
    const userAgent = req.headers['user-agent'] ?? '';

    sessions.set(sessionId, {
      sessionId, page, country, userAgent,
      isLoggedIn: !!isLoggedIn,
      lastSeen: Date.now(),
    });

    // Enregistrer la page vue
    pageViews.push({ page, ts: Date.now() });
    // Garder seulement les 24h
    const cutoff = Date.now() - 24 * 3600_000;
    while (pageViews.length > 0 && pageViews[0].ts < cutoff) pageViews.shift();

    // Comptage horaire
    const hour = new Date().getHours();
    hourlyVisits[hour]++;

    return res.json({ ok: true, active: sessions.size });
  } catch (e) {
    return res.status(500).json({ error: 'Internal error' });
  }
}

// ── Visiteurs actifs ────────────────────────────────────────────────
export async function getActiveVisitors(req: Request, res: Response) {
  const now = Date.now();
  const active = Array.from(sessions.values()).filter(s => now - s.lastSeen < 60_000);

  // Pages les plus visitées
  const pageCounts: Record<string, number> = {};
  for (const s of active) {
    pageCounts[s.page] = (pageCounts[s.page] ?? 0) + 1;
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([page, count]) => ({ page, count }));

  return res.json({
    total:       active.length,
    logged_in:   active.filter(s => s.isLoggedIn).length,
    visitors:    active.filter(s => !s.isLoggedIn).length,
    top_pages:   topPages,
    sessions:    active.map(s => ({ page: s.page, isLoggedIn: s.isLoggedIn, lastSeen: s.lastSeen })),
  });
}

// ── Résumé analytique ───────────────────────────────────────────────
export async function getSummary(req: Request, res: Response) {
  const now    = Date.now();
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  const viewsToday  = pageViews.filter(p => p.ts >= todayTs).length;
  const viewsHour   = pageViews.filter(p => p.ts >= now - 3600_000).length;

  // Pics horaires
  const peakHour    = hourlyVisits.indexOf(Math.max(...hourlyVisits));
  const peakLabel   = `${peakHour}h00–${peakHour + 1}h00`;

  return res.json({
    views_today:    viewsToday,
    views_hour:     viewsHour,
    active_now:     sessions.size,
    peak_hour:      peakLabel,
    peak_visits:    Math.max(...hourlyVisits),
    hourly_visits:  hourlyVisits,
  });
}