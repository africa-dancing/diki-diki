'use client';
// frontend/app/cadeaux/page.tsx
// DKDK_VITRINE — Page publique « Cadeaux à gagner » (lecture seule).
// Pilotee par l'interrupteur `cadeaux_vitrine_active` : si OFF, on affiche
// un message prudent « en préparation » et AUCUN cadeau. Valeurs indicatives,
// jamais promises (verrou juridique §7.8).
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import EchoIcon, { StatutEcho } from '../components/EchoIcon';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

// Degrades — memes vraies teintes que l'admin (vert #1FB673, jaune #FFC233, rouge logo #FE0000)
const GRAD = {
  vert: 'linear-gradient(135deg,#1FB673,#12935C)',
  jaune: 'linear-gradient(135deg,#FFC233,#E6A200)',
  rouge: 'linear-gradient(135deg,#FE0000,#C80000)',
  heraut: 'linear-gradient(135deg,#3B9BFF,#1557C8)',
  grand: 'linear-gradient(135deg,#FFC24D,#E08A00)',
};
const STATUT_GRAD: Record<string, string> = { messager: GRAD.vert, porteparole: GRAD.jaune, ambassadeur: GRAD.rouge, heraut: GRAD.heraut };
const LETTRE_GRAD: Record<string, string> = { C: GRAD.vert, B: GRAD.jaune, A: GRAD.rouge };
const encreStatut = (c?: string | null) => (c === 'ambassadeur' || c === 'heraut' ? '#fff' : '#140a02');
const encreLettre = (l?: string | null) => (l === 'A' ? '#fff' : '#140a02');
const SHADOW = '0 1px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)';

const STATUTS: { code: string; nom: string }[] = [
  { code: 'messager', nom: 'Le Messager' },
  { code: 'porteparole', nom: 'Le Porte-parole' },
  { code: 'ambassadeur', nom: "L'Ambassadeur" },
  { code: 'heraut', nom: 'Le Héraut' },
  { code: '', nom: 'Tous les membres' },
];

const NIVEAUX: { code: string; label: string }[] = [
  { code: 'C', label: 'Niveau C (1er mois)' },
  { code: 'B', label: 'Niveau B (2e mois)' },
  { code: 'A', label: 'Niveau A (3e mois)' },
  { code: '', label: 'Autres cadeaux' },
];
type Lot = { statut: string | null; lettre: string | null; mois: number | null; libelle: string };
type Grand = { statut: string | null; libelle: string };

export default function CadeauxPage() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [locaux, setLocaux] = useState<Lot[]>([]);
  const [grands, setGrands] = useState<Grand[]>([]);

  useEffect(() => {
    fetch(`${API}/vitrine`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data?.active) { setActive(true); setLocaux(d.data.locaux || []); setGrands(d.data.grands || []); }
        else setActive(false);
      })
      .catch(() => setActive(false))
      .finally(() => setLoading(false));
  }, []);

  const OR = 'var(--or)';
  const INK = 'var(--ink)';
  const SOFT = 'var(--ink-soft)';
  const card: React.CSSProperties = { background: 'var(--surface,#15151c)', border: '1px solid var(--line,rgba(255,255,255,0.1))', borderRadius: 14, padding: 16, marginBottom: 16 };
  const chip = (bg: string, ink: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999, background: bg, color: ink, boxShadow: SHADOW, whiteSpace: 'nowrap' });

  const groupes = STATUTS
    .map(st => ({ st, items: locaux.filter(l => (l.statut || '') === st.code) }))
    .filter(g => g.items.length > 0);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: INK, fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <Navbar />

      <div style={{ padding: '36px 24px 20px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: `linear-gradient(90deg, var(--or), var(--or2))`, color: 'var(--on-accent)', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, marginBottom: 14, textTransform: 'uppercase' }}>Les Échos</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: 'var(--red)', margin: '6px 0 8px', textTransform: 'uppercase' }}>🎁 Cadeaux à gagner</h1>
        <p style={{ color: SOFT, fontSize: 15, maxWidth: 620, margin: '0 auto' }}>Les membres fidèles peuvent être tirés au sort pour recevoir des cadeaux <b>matériels</b> — jamais de l&apos;argent.</p>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 20px' }}>

        {loading ? (
          <p style={{ opacity: 0.6, textAlign: 'center' }}>Chargement…</p>
        ) : !active ? (
          <div style={{ ...card, textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🎁</div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, color: OR, margin: '0 0 8px' }}>Programme de récompenses en préparation</h2>
            <p style={{ color: SOFT, fontSize: 14, margin: 0 }}>
              Un programme de cadeaux pour les membres les plus fidèles arrive bientôt. Il sera dévoilé dès qu&apos;il sera prêt — reste actif pour en faire partie !
              <br /><em>(Aucun cadeau garanti ni promis à ce stade.)</em>
            </p>
          </div>
        ) : (
          <>
            {/* Bandeau prudence */}
            <div style={{ ...card, background: 'rgba(255,170,0,0.08)', borderColor: 'rgba(255,170,0,0.3)', fontSize: 13, color: SOFT }}>
              Liste donnée à titre indicatif, <b>sans les montants</b> ; elle peut évoluer. Rien n&apos;est garanti ni promis : les cadeaux sont attribués par <b>tirage au sort parmi les membres méritants</b>. Diki-Diki ne verse jamais d&apos;argent — uniquement des cadeaux.
            </div>

            {groupes.map(({ st, items }) => {
              const parNiveau = NIVEAUX.map(n => ({ n, lots: items.filter(l => (l.lettre || '') === n.code) })).filter(g => g.lots.length > 0);
              return (
                <div key={st.code || 'tous'} style={card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {st.code ? <EchoIcon statut={st.code as StatutEcho} size={22} /> : <span style={{ fontSize: 20 }}>⭐</span>}
                    <span style={chip(st.code ? STATUT_GRAD[st.code] : 'rgba(255,255,255,0.1)', st.code ? encreStatut(st.code) : INK)}>{st.nom}</span>
                  </div>
                  {parNiveau.map(({ n, lots }) => (
                    <div key={n.code || 'autres'} style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        {n.code && <span style={chip(LETTRE_GRAD[n.code], encreLettre(n.code))}>{n.code}</span>}
                        <span style={{ fontSize: 12, fontWeight: 700, color: SOFT, letterSpacing: 0.3 }}>{n.label}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {lots.map((l, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 13.5 }}>
                            <span style={{ color: OR, fontWeight: 800 }}>•</span>
                            <span style={{ flex: 1 }}>{l.libelle}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {grands.length > 0 && (
              <div style={{ ...card, borderColor: 'rgba(255,194,51,0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>🏆</span>
                  <span style={chip(GRAD.grand, '#140a02')}>Grands lots</span>
                  <span style={{ fontSize: 12, color: SOFT }}>pour les plus hauts statuts</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {grands.map((g, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 13.5 }}>
                      <span style={{ color: OR, fontWeight: 800 }}>•</span>
                      <span style={{ flex: 1 }}>{g.libelle}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groupes.length === 0 && grands.length === 0 && (
              <p style={{ opacity: 0.6, textAlign: 'center' }}>Les cadeaux seront bientôt annoncés.</p>
            )}

            <p style={{ fontSize: 12, color: SOFT, textAlign: 'center', marginTop: 16 }}>
              Comment en profiter ? Reste actif, valide ton défi mensuel et grimpe les statuts — chaque saison validée te fait participer au tirage. 💫
            </p>
          </>
        )}
      </div>
    </div>
  );
}
