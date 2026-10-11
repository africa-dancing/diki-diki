/* app/components/EchosAvantagesBlock.tsx
   DKDK_FAQ — Bloc « Tes avantages, statut par statut » (4 cartes de statut + cadeaux
   par niveau C/B/A + grands lots). Cadeaux lus en direct de la vitrine (/vitrine).
   Dans la FAQ, les cadeaux sont affichés DIRECTEMENT sous chaque carte (pas de panneau
   flottant qui déborde). Aucun montant promis. */
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
  grid4:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 4, alignItems: 'start' },
  stCard:   { background: 'var(--nav-surface, rgba(255,255,255,0.03))', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 10px', textAlign: 'center' as const },
  stName:   { fontWeight: 800, fontSize: 13.5, marginTop: 10 },
  stMeta:   { color: 'var(--ink-soft)', fontSize: 11.5, marginTop: 2 },
  giftHead: { fontSize: 10.5, marginTop: 10, color: 'var(--or)', fontWeight: 700 },
  giftWrap: { textAlign: 'left' as const, marginTop: 6, display: 'flex', flexDirection: 'column' as const, gap: 8 },
  lettre:   { fontSize: 9.5, fontWeight: 800, padding: '1px 7px', borderRadius: 999, display: 'inline-block' },
  nivLabel: { fontSize: 10.5, fontWeight: 700, color: 'var(--ink-soft)' },
  gItem:    { fontSize: 11.5, padding: '1px 0 1px 8px', color: 'var(--ink)', lineHeight: 1.45 },
  recomp:   { background: 'linear-gradient(135deg, rgba(126, 3, 128, 0.30), rgba(237,7,15,0.28))', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px', marginTop: 20 },
  liStrong: { fontWeight: 700, color: 'var(--ink)' },
};

export default function EchosAvantagesBlock() {
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
          const blocs = NIV_ORDRE.map((n) => ({ n, items: (c?.[n.code as 'C'] || []) as string[] })).filter((b) => b.items.length > 0);
          const grand = (c?.grand || []) as string[];
          const vide = blocs.length === 0 && grand.length === 0;
          return (
            <div key={a.s} style={st.stCard}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <EchoIcon statut={a.statut} size={42} />
              </div>
              <div style={st.stName}>{a.s}</div>
              <div style={st.stMeta}>{a.v}</div>
              <div style={st.giftHead}>🎁 Cadeaux de ce niveau</div>
              <div style={st.giftWrap}>
                {vide ? (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>Bientôt dévoilés.</div>
                ) : (
                  <>
                    {blocs.map((b) => (
                      <div key={b.n.code}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                          {b.n.code !== 'autres' && (
                            <span style={{ ...st.lettre, color: b.n.code === 'A' ? '#fff' : '#140a02', background: LETTRE_GRAD[b.n.code] }}>{b.n.code}</span>
                          )}
                          <span style={st.nivLabel}>{b.n.label}</span>
                        </div>
                        {b.items.map((it, i) => <div key={i} style={st.gItem}>• {it}</div>)}
                      </div>
                    ))}
                    {grand.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--or)', marginBottom: 3 }}>🏆 Grands lots</div>
                        {grand.map((it, i) => <div key={i} style={st.gItem}>• {it}</div>)}
                      </div>
                    )}
                  </>
                )}
              </div>
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
