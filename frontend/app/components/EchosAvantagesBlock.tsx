/* app/components/EchosAvantagesBlock.tsx
   DKDK_FAQ — Reproduit à l'identique le bloc « Tes avantages, statut par statut »
   de la page Les Échos (4 cartes de statut colorées + cadeaux par niveau au survol
   + panneau récompenses). Utilisé dans la FAQ pour les items de type « avantages ».
   Les cadeaux viennent en direct de la vitrine (/vitrine). Aucun montant promis. */
'use client';
import { useEffect, useState } from 'react';
import EchoIcon, { StatutEcho } from './EchoIcon';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = 'var(--or)';
const OR2 = 'var(--or2)';

const AVANTAGES: { statut: StatutEcho; s: string; v: string }[] = [
  { statut: 'messager',    s: 'Dès Le Messager',     v: 'Badge sur ton profil' },
  { statut: 'porteparole', s: 'Dès Le Porte-parole', v: 'Badge à côté de tes soutiens' },
  { statut: 'ambassadeur', s: "Dès L'Ambassadeur",   v: 'Commentaires mis en avant + accès anticipé' },
  { statut: 'heraut',      s: 'Le Héraut',           v: 'Titre honorifique + couleur de pseudo' },
];
const LETTRE_GRAD: Record<string, string> = { C: 'linear-gradient(135deg,#1FB673,#12935C)', B: 'linear-gradient(135deg,#FFC233,#E6A200)', A: 'linear-gradient(135deg,#FE0000,#C80000)' };
const NIV_ORDRE: { code: string; label: string }[] = [ { code: 'C', label: 'Niveau C' }, { code: 'B', label: 'Niveau B' }, { code: 'A', label: 'Niveau A' }, { code: 'autres', label: 'Autres' } ];

const st: Record<string, React.CSSProperties> = {
  h2:       { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: OR, marginTop: 8, marginBottom: 10 },
  p:        { fontSize: 14.5, lineHeight: 1.8, color: 'var(--ink-soft)', margin: '0 0 8px' },
  grid4:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 4 },
  stCard:   { background: 'var(--nav-surface, rgba(255,255,255,0.03))', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 10px', textAlign: 'center' as const },
  stName:   { fontWeight: 800, fontSize: 13.5, marginTop: 10 },
  stMeta:   { color: 'var(--ink-soft)', fontSize: 11.5, marginTop: 2 },
  recomp:   { background: 'linear-gradient(135deg, rgba(126, 3, 128, 0.30), rgba(237,7,15,0.28))', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px', marginTop: 20 },
  liStrong: { fontWeight: 700, color: 'var(--ink)' },
};

export default function EchosAvantagesBlock() {
  const [openAv, setOpenAv] = useState<string | null>(null);
  const [cadeaux, setCadeaux] = useState<Record<string, { C: string[]; B: string[]; A: string[]; autres: string[]; grand: string[] }>>({});

  useEffect(() => {
    fetch(`${API}/vitrine`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.data?.active) return;
        const by: Record<string, any> = {};
        const ens = (s: string) => (by[s] = by[s] || { C: [], B: [], A: [], autres: [], grand: [] });
        (d.data.locaux || []).forEach((l: any) => { if (!l.statut) return; const g = ens(l.statut); const k = (l.lettre === 'C' || l.lettre === 'B' || l.lettre === 'A') ? l.lettre : 'autres'; g[k].push(l.libelle); });
        (d.data.grands || []).forEach((g: any) => { if (!g.statut) return; ens(g.statut).grand.push(g.libelle); });
        setCadeaux(by);
      })
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={st.h2}>Tes avantages, statut par statut</h2>
      <div style={st.grid4} className="dkdk-echo-grid4">
        {AVANTAGES.map((a) => {
          const c = cadeaux[a.statut];
          const open = openAv === a.statut;
          return (
            <div key={a.s} style={{ ...st.stCard, position: 'relative', cursor: 'pointer' }}
              onMouseEnter={() => setOpenAv(a.statut)} onMouseLeave={() => setOpenAv((v) => (v === a.statut ? null : v))}
              onClick={() => setOpenAv((v) => (v === a.statut ? null : a.statut))}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <EchoIcon statut={a.statut} size={42} />
              </div>
              <div style={st.stName}>{a.s}</div>
              <div style={st.stMeta}>{a.v}</div>
              <div style={{ fontSize: 10.5, marginTop: 6, color: 'var(--or)', fontWeight: 700 }}>🎁 Cadeaux de ce niveau</div>
              {open && (
                <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8, width: 240, maxWidth: '86vw', background: 'var(--nav-panel,#15151c)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px', textAlign: 'left', zIndex: 50, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }}>
                  {(() => {
                    const blocs = NIV_ORDRE.map((n) => ({ n, items: (c?.[n.code as 'C'] || []) as string[] })).filter((b) => b.items.length > 0);
                    const grand = (c?.grand || []) as string[];
                    if (!blocs.length && !grand.length) return <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>🎁 Cadeaux bientôt dévoilés.</div>;
                    return (<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {blocs.map((b) => (
                        <div key={b.n.code}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            {b.n.code !== 'autres' && <span style={{ fontSize: 10, fontWeight: 800, color: b.n.code === 'A' ? '#fff' : '#140a02', background: LETTRE_GRAD[b.n.code], padding: '1px 7px', borderRadius: 999 }}>{b.n.code}</span>}
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>{b.n.label}</span>
                          </div>
                          {b.items.map((it, i) => <div key={i} style={{ fontSize: 12.5, padding: '2px 0 2px 8px' }}>• {it}</div>)}
                        </div>
                      ))}
                      {grand.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--or)', marginBottom: 4 }}>🏆 Grands lots</div>
                          {grand.map((it, i) => <div key={i} style={{ fontSize: 12.5, padding: '2px 0 2px 8px' }}>• {it}</div>)}
                        </div>
                      )}
                    </div>);
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={st.recomp}>
        <h2 style={{ ...st.h2, marginTop: 0 }}>Et des récompenses ?</h2>
        <p style={st.p}>
          Les <strong style={st.liStrong}>cadeaux à gagner</strong> sont présentés, classés par statut et par niveau, sur la page « Cadeaux à gagner ». <em>(Valeurs indicatives ; aucun cadeau garanti ni promis, et les Échos ne se convertissent jamais en argent.)</em>
        </p>
        <Link href="/cadeaux" style={{ display: 'inline-block', marginTop: 4, background: `linear-gradient(90deg,${OR},${OR2})`, color: 'var(--on-accent)', fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>🎁 Voir les cadeaux à gagner</Link>
      </div>
    </div>
  );
}
