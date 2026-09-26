'use client';
import { useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

/* Lit le reglage logo_star_effect et pilote l animation de l etoile rouge du logo
   via l attribut data-star sur <html>. Valeurs: blink (defaut) | glow | off. */
export default function StarEffect() {
  useEffect(() => {
    let alive = true;
    fetch(`${API}/settings`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!alive || !d?.data) return;
        const row = d.data.find((x: any) => x.key === 'logo_star_effect');
        const v = (row?.value || 'blink').trim();
        document.documentElement.dataset.star = ['blink', 'glow', 'off'].includes(v) ? v : 'blink';
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return null;
}
