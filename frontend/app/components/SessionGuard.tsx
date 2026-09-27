'use client';
/*DKDK_SESSION_GUARD — deconnecte proprement quand le jeton a expire (401 sur notre API)*/
import { useEffect } from 'react';

export default function SessionGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as any;
    if (w.__dkdkFetchPatched) return;
    w.__dkdkFetchPatched = true;
    const orig = w.fetch.bind(w);
    w.fetch = async (...args: any[]) => {
      const res = await orig(...args);
      try {
        if (res && res.status === 401) {
          const a0 = args[0];
          const url = typeof a0 === 'string' ? a0 : (a0 && a0.url) || '';
          const isApi = /\/v1\//.test(url) || /diki-diki-production/.test(url) || url.startsWith('/api/');
          const isAuthCall = /\/auth\//.test(url);            // login/social/otp : ne pas boucler
          const hasToken = !!localStorage.getItem('dkdk_token');
          const path = location.pathname;
          const onAuthOrAdmin = path.startsWith('/auth/') || path.startsWith('/admin');
          if (isApi && hasToken && !isAuthCall && !onAuthOrAdmin) {
            localStorage.removeItem('dkdk_token');
            localStorage.removeItem('dkdk_user');
            location.href = '/auth/login?expired=1';
          }
        }
      } catch (_) { /* jamais casser un fetch */ }
      return res;
    };
  }, []);
  return null;
}
