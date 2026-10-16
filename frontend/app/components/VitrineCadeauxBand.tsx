'use client';
// frontend/app/components/VitrineCadeauxBand.tsx
// DKDK_VITRINE_BAND — Bande défilante des cadeaux sur l'accueil (Mur des appels).
// Pour chaque statut : le cadeau du MOIS EN COURS + sa LETTRE (C/B/A), avec sa photo.
// Les GRANDS LOTS sont affichés TOUTE L'ANNÉE (rappel du défi annuel).
// Pilotée par l'interrupteur `cadeaux_vitrine_active` : si OFF, la bande disparaît.
// Lecture seule, aucun montant affiché (teaser) — renvoie vers /cadeaux.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import EchoIcon, { StatutEcho } from './EchoIcon';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

const GRAD = {
  vert: 'linear-gradient(135deg,#1FB673,#12935C)',
  jaune: 'linear-gradient(135deg,#FFEB4D,#FFDE00)',
  rouge: 'linear-gradient(135deg,#FE0000,#C80000)',
  heraut: 'linear-gradient(135deg,#3B9BFF,#1557C8)',
  grand: 'linear-gradient(135deg,#FFC24D,#E08A00)',
};
const STATUT_GRAD: Record<string, string> = { messager: GRAD.vert, porteparole: GRAD.jaune, ambassadeur: GRAD.rouge, heraut: GRAD.heraut };
const STATUT_NOM: Record<string, string> = { messager: 'Le Messager', porteparole: 'Le Porte-parole', ambassadeur: "L'Ambassadeur", heraut: 'Le Héraut' };
const LETTRE_GRAD: Record<string, string> = { C: GRAD.vert, B: GRAD.jaune, A: GRAD.rouge };
const encreStatut = (c?: string | null) => (c === 'ambassadeur' || c === 'heraut' ? '#fff' : '#140a02');
const encreLettre = (l?: string | null) => (l === 'A' ? '#fff' : '#140a02');
const SHADOW = '0 1px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)';
const ORDRE_STATUT: Record<string, number> = { messager: 0, porteparole: 1, ambassadeur: 2, heraut: 3, '': 9 };
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

type Lot = { statut: string | null; lettre: string | null; mois: number | null; libelle: string; image_url?: string | null };
type Grand = { statut: string | null; libelle: string; image_url?: string | null };
type Carte = { key: string; img: string; nom: string; statutCode: string; lettre: string; annuel: boolean; libelle: string };

export default function VitrineCadeauxBand() {
  const [active, setActive] = useState(false);
  const [locaux, setLocaux] = useState<Lot[]>([]);
  const [grands, setGrands] = useState<Grand[]>([]);
  const [apercu, setApercu] = useState<{ url: string; libelle: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/vitrine`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data?.active) { setActive(true); setLocaux(d.data.locaux || []); setGrands(d.data.grands || []); }
        else setActive(false);
      })
      .catch(() => setActive(false));
  }, []);

  const moisEnCours = new Date().getMonth() + 1;

  // Cadeaux locaux du MOIS EN COURS, triés par statut (Messager → Héraut)
  const cartesMois: Carte[] = locaux
    .filter(l => (l.mois || 0) === moisEnCours)
    .sort((a, b) => (ORDRE_STATUT[a.statut || ''] ?? 9) - (ORDRE_STATUT[b.statut || ''] ?? 9))
    .map((l, i) => ({
      key: `m${i}`, img: l.image_url || '', statutCode: l.statut || '',
      nom: STATUT_NOM[l.statut || ''] || 'Tous les membres',
      lettre: (l.lettre === 'C' || l.lettre === 'B' || l.lettre === 'A') ? l.lettre : '',
      annuel: false, libelle: l.libelle,
    }));

  // Grands lots : TOUTE L'ANNÉE
  const cartesGrands: Carte[] = [...grands]
    .sort((a, b) => (ORDRE_STATUT[a.statut || ''] ?? 9) - (ORDRE_STATUT[b.statut || ''] ?? 9))
    .map((g, i) => ({
      key: `g${i}`, img: g.image_url || '', statutCode: g.statut || '',
      nom: STATUT_NOM[g.statut || ''] || '', lettre: '', annuel: true, libelle: g.libelle,
    }));

  const cartes = [...cartesMois, ...cartesGrands];
  if (!active || cartes.length === 0) return null;

  // Boucle fluide : on duplique la piste ; durée proportionnelle au nombre de cartes.
  const piste = [...cartes, ...cartes];
  const duree = Math.max(22, cartes.length * 7);
  const chip = (bg: string, ink: string): React.CSSProperties => ({ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: bg, color: ink, boxShadow: SHADOW, whiteSpace: 'nowrap' });

  const carte = (c: Carte, dup: string) => {
    const img = c.img;
    return (
      <Link
        key={dup + c.key}
        href="/cadeaux"
        onMouseEnter={img ? () => setApercu({ url: img, libelle: c.libelle }) : undefined}
        onMouseLeave={img ? () => setApercu(null) : undefined}
        style={{
          flex: '0 0 auto', width: 168, textDecoration: 'none', color: 'var(--ink)',
          background: 'var(--surface,#15151c)', border: '1px solid var(--line,rgba(255,255,255,0.1))',
          borderRadius: 14, overflow: 'hidden', display: 'block',
        }}
      >
        <div style={{ width: '100%', height: 110, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {img
            ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 34, opacity: 0.8 }}>{c.annuel ? '🏆' : '🎁'}</span>}
        </div>
        <div style={{ padding: '9px 10px 11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            {c.statutCode && <EchoIcon statut={c.statutCode as StatutEcho} size={16} />}
            {c.statutCode
              ? <span style={chip(STATUT_GRAD[c.statutCode], encreStatut(c.statutCode))}>{c.nom}</span>
              : <span style={chip('rgba(255,255,255,0.1)', 'var(--ink)')}>Tous</span>}
            {!c.annuel && c.lettre && <span style={chip(LETTRE_GRAD[c.lettre], encreLettre(c.lettre))}>{c.lettre}</span>}
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.libelle}</div>
          {c.annuel && <div style={{ marginTop: 8 }}><span style={chip(GRAD.grand, '#140a02')}>🏆 Grand Prix Annuel</span></div>}
        </div>
      </Link>
    );
  };

  return (
    <div style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 120%,rgba(255,194,51,0.10) 0%,transparent 70%)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '14px 16px 4px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16 }}>🎁 Cadeaux du mois — <span style={{ color: 'var(--or)', textTransform: 'capitalize' }}>{MOIS_FR[moisEnCours - 1]}</span></div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>Les grands lots annuels sont attribués en fin d&apos;année par tirage au sort dans chaque catégorie.</div>
        <div style={{ marginTop: 6 }}>
          <Link href="/cadeaux" style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--or)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Tout voir →</Link>
        </div>
      </div>

      <style>{`
        .dkdk-vcb-mask { overflow: hidden; position: relative;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent); }
        .dkdk-vcb-track { display: flex; gap: 12px; width: max-content; padding: 4px 16px 12px;
          animation: dkdkVcbScroll var(--dkdk-vcb-dur,40s) linear infinite; }
        .dkdk-vcb-mask:hover .dkdk-vcb-track { animation-play-state: paused; }
        @keyframes dkdkVcbScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .dkdk-vcb-track { animation: none; } .dkdk-vcb-mask { overflow-x: auto; } }
      `}</style>

      <div className="dkdk-vcb-mask">
        <div className="dkdk-vcb-track" style={{ ['--dkdk-vcb-dur' as any]: `${duree}s` }}>
          {piste.map((c, i) => carte(c, i < cartes.length ? 'a' : 'b'))}
        </div>
      </div>

      {apercu && (
        <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 9999, pointerEvents: 'none', background: 'var(--surface,#15151c)', border: '1px solid var(--or)', borderRadius: 14, padding: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.55)', maxWidth: 'min(300px,90vw)', textAlign: 'center' }}>
          <img src={apercu.url} alt={apercu.libelle} style={{ width: '100%', maxWidth: 280, maxHeight: 280, objectFit: 'contain', borderRadius: 8, display: 'block' }} />
          <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--ink)', fontWeight: 700 }}>{apercu.libelle}</div>
        </div>
      )}
    </div>
  );
}
