'use client';
// frontend/app/components/AnalyticsTracker.tsx
// DKDK_ANALYTICS_GLOBAL — Tracking monté UNE fois dans le layout : couvre toutes
// les pages (présentes et futures). À chaque changement de route :
//   1) heartbeat interne -> /analytics/heartbeat (mesure d'audience maison) ;
//   2) PageView renvoyé aux pixels TikTok/Meta (si consentement donné).
// Le tout premier PageView est déjà émis par ConsentPixels au chargement des pixels :
// on ne le re-émet donc qu'à partir de la 2e route pour éviter un doublon.
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getSessionId } from '../hooks/useAnalytics';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const page = pathname || window.location.pathname;
    // Pages internes admin : pas de tracking (ni audience, ni pixels).
    if (page.startsWith('/admin')) return;
    const sessionId = getSessionId();

    const ping = () => {
      try {
        const isLoggedIn = !!localStorage.getItem('dkdk_token');
        fetch(API + '/analytics/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, page, isLoggedIn }),
        }).catch(() => {});
      } catch { /* noop */ }
    };

    // 1) Heartbeat interne : sur chaque page, puis toutes les 30 s
    ping();
    const interval = setInterval(ping, 30_000);

    // 2) Pixels marketing : nouveau PageView à chaque route (sauf le 1er, déjà émis)
    try {
      const w = window as any;
      if (first.current) { first.current = false; }
      else { w.ttq?.page?.(); w.fbq?.('track', 'PageView'); }
    } catch { /* noop */ }

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
