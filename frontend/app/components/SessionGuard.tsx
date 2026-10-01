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
            // --- MOUCHARD : pourquoi la session saute ? (TOKEN_MISSING vs TOKEN_INVALID vs vraie expiration) ---
            let errCode = '';
            try { errCode = (JSON.parse(await res.clone().text()) || {}).error || ''; } catch (_) {}
            let exp = 0;
            try { const tk = localStorage.getItem('dkdk_token') || ''; exp = (JSON.parse(atob(tk.split('.')[1] || '')) || {}).exp || 0; } catch (_) {}
            const now = Math.floor(Date.now() / 1000);
            const diag = {
              at: new Date().toISOString(),
              url,
              error: errCode,                              // TOKEN_MISSING = header oublie ; TOKEN_INVALID = signature/secret
              exp,
              now,
              reallyExpired: exp > 0 && now > exp,         // true = vraie expiration ; false = secret a change ou header manquant
              minutesLeftWhenKicked: exp ? Math.round((exp - now) / 60) : null,
            };
            try { localStorage.setItem('dkdk_last_logout', JSON.stringify(diag)); } catch (_) {}
            try { console.warn('[DKDK session] deconnexion sur 401 →', diag); } catch (_) {}
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
