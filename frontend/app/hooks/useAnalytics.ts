// frontend/app/hooks/useAnalytics.ts
'use client';
import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

let SESSION_ID = '';
function getSessionId() {
  if (!SESSION_ID) {
    SESSION_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  return SESSION_ID;
}

export function useAnalytics(page?: string) {
  useEffect(() => {
    const sessionId  = getSessionId();
    const isLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('dkdk_token');
    const currentPage = page ?? (typeof window !== 'undefined' ? window.location.pathname : '/');

    const ping = () => {
      fetch(`${API}/analytics/heartbeat`, {
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