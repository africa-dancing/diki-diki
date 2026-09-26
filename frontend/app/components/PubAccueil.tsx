'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

interface Annonce {
  id: string; annonceur: string; titre?: string; description?: string;
  media_url?: string; media_type?: string; lien_url?: string;
}

/* Galerie d'affiches (accueil uniquement). Grille de vignettes :
   - au SURVOL de la souris (PC) → l'affiche s'ouvre en grand (aperçu), et se referme quand la souris part ;
   - au CLIC / TOUCHER → agrandissement verrouillé (avec ✕ et « En savoir plus »), utile sur mobile.
   Ne s'affiche que si le réglage `pub_accueil_active` = '1' ET qu'il existe des pubs actives. */
export default function PubAccueil() {
  const [ann, setAnn]   = useState<Annonce[]>([]);
  const [on, setOn]     = useState(false);
  const [sel, setSel]   = useState<Annonce | null>(null);   // clic (verrouillé, interactif)
  const [hover, setHov] = useState<Annonce | null>(null);   // survol (aperçu, non bloquant)

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

  useEffect(() => {
    if (!on || ann.length === 0) return;
    ann.forEach(a => { fetch(`${API}/annonces/${a.id}/impression`, { method: 'POST' }).catch(() => {}); });
  }, [on, ann]);

  if (!on || ann.length === 0) return null;

  const estImage = (a: Annonce) => (a.media_type || '').startsWith('image');
  const ouvrirLien = (a: Annonce) => {
    fetch(`${API}/annonces/${a.id}/clic`, { method: 'POST' }).catch(() => {});
    if (a.lien_url) window.open(a.lien_url, '_blank', 'noopener,noreferrer');
  };

  const shown = sel || hover;        // ce qu'on affiche en grand
  const locked = !!sel;              // clic = verrouillé (interactif), survol = aperçu

  return (
    <div style={{ padding: '4px 16px 10px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720, background: '#12121a', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 16, padding: 12 }}>
        <span style={{ display: 'inline-block', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 6, marginBottom: 10 }}>PUBLICITÉ · À LA UNE</span>

        <div className="dkdk-pub-grid">
          {ann.map(a => (
            <button key={a.id}
              onClick={() => setSel(a)}
              onMouseEnter={() => setHov(a)}
              onMouseLeave={() => setHov(h => (h === a ? null : h))}
              title={a.titre || a.annonceur}
              style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 10, overflow: 'hidden', border: '1px solid #26263a', cursor: 'pointer', padding: 0, background: '#0a0a0f' }}>
              {a.media_url && estImage(a) && (
                <img src={a.media_url} alt={a.annonceur} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
              {a.media_url && !estImage(a) && (
                <video src={a.media_url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }} />
              )}
              {!a.media_url && (
                <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 12, padding: 6, textAlign: 'center' }}>{a.titre || a.annonceur}</span>
              )}
              <span style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>⤢</span>
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top,rgba(0,0,0,.82),transparent)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '14px 5px 5px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titre || a.annonceur}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8, textAlign: 'center' }}>Survole une affiche pour l&apos;agrandir · clique pour la garder ouverte.</div>
      </div>

      {/* Agrandissement : survol (aperçu, non bloquant) OU clic (verrouillé, interactif) */}
      {shown && (
        <div
          onClick={() => setSel(null)}
          style={{ position: 'fixed', inset: 0, background: locked ? 'rgba(5,5,10,0.9)' : 'transparent', backdropFilter: locked ? 'blur(4px)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, zIndex: 4000, pointerEvents: locked ? 'auto' : 'none' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 440, width: '100%', background: '#12121a', border: '1px solid rgba(255,170,0,0.4)', borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: '0 24px 70px -18px rgba(0,0,0,0.85)' }}>
            {locked && (
              <button onClick={() => setSel(null)} aria-label="Fermer" style={{ position: 'absolute', top: 8, right: 10, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 16, cursor: 'pointer', zIndex: 2 }}>✕</button>
            )}
            <div style={{ background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '70vh', overflow: 'hidden' }}>
              {shown!.media_url && estImage(shown!) && (
                <img src={shown!.media_url} alt={shown!.annonceur} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }} />
              )}
              {shown!.media_url && !estImage(shown!) && (
                <video src={shown!.media_url} autoPlay muted loop playsInline controls={locked} style={{ maxWidth: '100%', maxHeight: '70vh', display: 'block', background: '#000' }} />
              )}
            </div>
            <div style={{ padding: '12px 14px', borderTop: '1px solid #26263a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: '#fff' }}>{shown!.titre || shown!.annonceur}</div>
                {shown!.description && <div style={{ fontSize: 12, color: '#b9b9c8', marginTop: 3 }}>{shown!.description}</div>}
                <div style={{ fontSize: 11, color: '#7a7a8c', marginTop: 3 }}>Sponsorisé · {shown!.annonceur}</div>
              </div>
              {locked && shown!.lien_url && (
                <button onClick={() => ouvrirLien(shown!)} style={{ flexShrink: 0, background: '#fff', color: '#000', fontWeight: 700, fontSize: 12.5, padding: '8px 14px', borderRadius: 18, border: 'none', cursor: 'pointer' }}>En savoir plus ▸</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
