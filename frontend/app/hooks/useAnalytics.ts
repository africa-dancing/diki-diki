// frontend/app/hooks/useAnalytics.ts
/*DKDK_SID_STORAGE*/
'use client';
import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

// Le sessionId vit dans sessionStorage : il survit a la navigation ET au F5,
// et disparait a la fermeture de l'onglet. C'est la definition d'une session.
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let sid = sessionStorage.getItem('dkdk_sid');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('dkdk_sid', sid);
    }
    return sid;
  } catch {
    return 'anon';
  }
}

export function useAnalytics(page?: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessionId   = getSessionId();
    const isLoggedIn  = !!localStorage.getItem('dkdk_token');
    const currentPage = page ?? window.location.pathname;

    const ping = () => {
      fetch(API + '/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, page: currentPage, isLoggedIn }),
      }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, 30_000);
    return () => clearInterval(interval);
  }, [page]);
}
