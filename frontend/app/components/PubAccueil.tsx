'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

interface Annonce {
  id: string; annonceur: string; titre?: string; description?: string;
  media_url?: string; media_type?: string; lien_url?: string;
}

/* Encart publicitaire affiché sur l'accueil / le Mur des appels.
   Ne s'affiche que si le réglage `pub_accueil_active` = '1' ET qu'il existe des pubs actives.
   Emplacement « en attendant les vidéos » : l'admin le coupe quand les challenges démarrent. */
export default function PubAccueil() {
  const [ann, setAnn]   = useState<Annonce[]>([]);
  const [idx, setIdx]   = useState(0);
  const [on, setOn]     = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${API}/settings`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/annonces/actives`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, a]) => {
      if (!alive) return;
      const actif = (s?.data || []).find((x: any) => x.key === 'pub_accueil_active')?.value;
      setOn(String(actif).trim() === '1' || String(actif).trim() === 'true');
      setAnn(a?.data || []);
    });
    return () => { alive = false; };
  }, []);

  // Rotation si plusieurs pubs
  useEffect(() => {
    if (ann.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % ann.length), 9000);
    return () => clearInterval(t);
  }, [ann.length]);

  // Comptage d'impression à chaque pub affichée
  useEffect(() => {
    if (!on || ann.length === 0) return;
    const cur = ann[idx];
    if (!cur) return;
    fetch(`${API}/annonces/${cur.id}/impression`, { method: 'POST' }).catch(() => {});
  }, [on, idx, ann]);

  if (!on || ann.length === 0) return null;
  const a = ann[idx];
  if (!a) return null;

  const clic = () => {
    fetch(`${API}/annonces/${a.id}/clic`, { method: 'POST' }).catch(() => {});
    if (a.lien_url) window.open(a.lien_url, '_blank', 'noopener,noreferrer');
  };

  const estImage = (a.media_type || '').startsWith('image');

  return (
    <div style={{ padding: '4px 16px 8px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 680, background: '#12121a', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px -12px rgba(0,0,0,.55)' }}>
        <span style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 6 }}>PUBLICITÉ</span>

        {a.media_url && estImage && (
          <img src={a.media_url} alt={a.annonceur} style={{ width: '100%', height: 'auto', display: 'block' }} />
        )}
        {a.media_url && !estImage && (
          <video src={a.media_url} autoPlay muted loop playsInline controls style={{ width: '100%', height: 'auto', maxHeight: '80vh', background: '#000', display: 'block' }} />
        )}
        {!a.media_url && (
          <div style={{ padding: 28, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff' }}>{a.titre || a.annonceur}</div>
            {a.description && <div style={{ fontSize: 13, color: '#b9b9c8', marginTop: 6 }}>{a.description}</div>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', background: 'rgba(0,0,0,0.35)', borderTop: '1px solid #26263a' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titre || a.annonceur}</div>
            <div style={{ fontSize: 11.5, color: '#7a7a8c' }}>Sponsorisé · {a.annonceur}</div>
          </div>
          {a.lien_url && (
            <button onClick={clic} style={{ flexShrink: 0, background: '#fff', color: '#000', fontWeight: 700, fontSize: 12.5, padding: '8px 14px', borderRadius: 18, border: 'none', cursor: 'pointer' }}>En savoir plus ▸</button>
          )}
        </div>
      </div>
    </div>
  );
}
