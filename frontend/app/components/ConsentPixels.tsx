'use client';
// frontend/app/components/ConsentPixels.tsx
// Bandeau de consentement (RGPD/APDP) + chargement des pixels marketing
// (TikTok + Meta) UNIQUEMENT après acceptation. Piloté par variables d'env :
//   NEXT_PUBLIC_TIKTOK_PIXEL_ID   (ex. C4XXXXXXXXXXXXXX)
//   NEXT_PUBLIC_META_PIXEL_ID     (ex. 123456789012345)
// Si un identifiant est absent, le pixel correspondant n'est pas chargé.
// Expose window.dkdkTrack(event, params) — voir lib/track.ts.
import { useEffect, useState } from 'react';

const TIKTOK_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '';
const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const KEY = 'dkdk_consent'; // 'all' | 'necessary'

// Correspondance événement générique -> événements standards TikTok / Meta
function fire(event: string, params: Record<string, any>) {
  const w = window as any;
  const ttq = w.ttq, fbq = w.fbq;
  const val = params?.value;
  const cur = params?.currency || 'XOF';
  try {
    switch (event) {
      case 'register':
        ttq?.track?.('CompleteRegistration'); fbq?.('track', 'CompleteRegistration'); break;
      case 'vote':
        ttq?.track?.('Vote', params); fbq?.('trackCustom', 'Vote', params); break;
      case 'purchase':
        ttq?.track?.('CompletePayment', { value: val, currency: cur });
        fbq?.('track', 'Purchase', { value: val, currency: cur }); break;
      case 'view_content':
        ttq?.track?.('ViewContent', params); fbq?.('track', 'ViewContent', params); break;
      case 'initiate_checkout':
        ttq?.track?.('InitiateCheckout', params); fbq?.('track', 'InitiateCheckout', params); break;
      default:
        ttq?.track?.(event, params); fbq?.('trackCustom', event, params);
    }
  } catch { /* silencieux */ }
}

function loadTikTok(id: string) {
  const w = window as any;
  if (w.ttq || !id) return;
  /* eslint-disable */
  (function (w: any, d: any, t: string) {
    w.TiktokAnalyticsObject = t; const ttq = (w[t] = w[t] || []);
    ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];
    ttq.setAndDefer = function (t: any, e: string) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.load = function (e: string, n?: any) {
      const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i;
      ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = n || {};
      const o = d.createElement('script'); o.type = 'text/javascript'; o.async = true; o.src = i + '?sdkid=' + e + '&lib=' + t;
      const a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a);
    };
    ttq.load(id); ttq.page();
  })(w, document, 'ttq');
  /* eslint-enable */
}

function loadMeta(id: string) {
  const w = window as any;
  if (w.fbq || !id) return;
  /* eslint-disable */
  (function (f: any, b: any, e: string, v: string) {
    if (f.fbq) return; const n: any = (f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); });
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const t = b.createElement(e); t.async = true; t.src = v;
    const s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  })(w, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  (w as any).fbq('init', id); (w as any).fbq('track', 'PageView');
  /* eslint-enable */
}

function loadPixels() {
  if (TIKTOK_ID) loadTikTok(TIKTOK_ID);
  if (META_ID) loadMeta(META_ID);
}

export default function ConsentPixels() {
  const [choice, setChoice] = useState<string | null>(null); // null = pas encore choisi
  const [ready, setReady] = useState(false);

  // dkdkTrack disponible tout de suite (no-op tant que les pixels ne sont pas chargés)
  useEffect(() => {
    (window as any).dkdkTrack = (event: string, params?: Record<string, any>) => fire(event, params || {});
  }, []);

  // Lecture du choix mémorisé
  useEffect(() => {
    let c: string | null = null;
    try { c = localStorage.getItem(KEY); } catch {}
    setChoice(c);
    if (c === 'all') loadPixels();
    setReady(true);
  }, []);

  const accept = () => {
    try { localStorage.setItem(KEY, 'all'); } catch {}
    setChoice('all'); loadPixels();
  };
  const refuse = () => {
    try { localStorage.setItem(KEY, 'necessary'); } catch {}
    setChoice('necessary');
  };

  if (!ready || choice) return null; // rien si choix déjà fait

  return (
    <div style={{
      position: 'fixed', left: 12, right: 12, bottom: 12, zIndex: 10000,
      maxWidth: 720, margin: '0 auto',
      background: '#0a0a0f', color: '#e8e0d0',
      border: '1px solid rgba(255,170,0,0.35)', borderRadius: 14,
      padding: '16px 18px', boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
      fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, lineHeight: 1.6,
    }}>
      <div style={{ marginBottom: 12 }}>
        🍪 Nous utilisons des cookies nécessaires au fonctionnement du site, et — avec ton accord —
        des cookies de <strong>mesure d'audience et de publicité</strong> (TikTok, Meta) pour améliorer
        Diki-Diki. Détails dans notre <a href="/cgu" style={{ color: '#FFAA00', textDecoration: 'underline' }}>politique de confidentialité</a>.
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={accept} style={{
          flex: 1, minWidth: 140, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
          fontWeight: 800, fontSize: 13.5, color: '#150c00',
          background: 'linear-gradient(135deg,#FF6B00,#FFD700)',
        }}>Tout accepter</button>
        <button onClick={refuse} style={{
          flex: 1, minWidth: 140, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
          fontWeight: 700, fontSize: 13.5, color: '#e8e0d0',
          background: 'transparent', border: '1px solid rgba(255,255,255,0.25)',
        }}>Refuser</button>
      </div>
    </div>
  );
}
