'use client';

import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import EchoIcon from '../components/EchoIcon';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

type Fenetre = 'semaine' | 'mois' | 'saison' | 'all';
const FENETRES: { key: Fenetre; label: string }[] = [
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois', label: 'Mois' },
  { key: 'saison', label: 'Saison' },
  { key: 'all', label: 'Depuis le début' },
];

interface Row { rang: number; pseudo: string; statut?: string; echos: number; }

const INK = 'var(--ink, #e8e0d0)';
const OR = 'var(--or, #FFAA00)';
const LINE = 'var(--line, #26262f)';
// Degrades statuts (memes vraies teintes Diki)
const GRAD = {
  vert: 'linear-gradient(135deg,#1FB673,#12935C)',
  jaune: 'linear-gradient(135deg,#FFC233,#E6A200)',
  rouge: 'linear-gradient(135deg,#FE0000,#C80000)',
  heraut: 'linear-gradient(to top right,#FF3B23,#FF9F1C,#FFD21E,#1FB673,#2B8CFF,#A24BFF)',
};
const STATUT_GRAD: Record<string, string> = { messager: GRAD.vert, porteparole: GRAD.jaune, ambassadeur: GRAD.rouge, heraut: GRAD.heraut };
const STATUT_NOM: Record<string, string> = { messager: 'Messager', porteparole: 'Porte-parole', ambassadeur: 'Ambassadeur', heraut: 'Héraut' };
const encreStatut = (c?: string) => (c === 'ambassadeur' ? '#fff' : '#140a02');

export default function ClassementPage() {
  const [fenetre, setFenetre] = useState<Fenetre>('mois');
  const [rows, setRows] = useState<Row[]>([]);
  const [actif, setActif] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/gamification/leaderboard?window=${fenetre}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const data = d?.data;
        setActif(data?.actif !== false);
        setRows(Array.isArray(data?.rows) ? data.rows : []);
      })
      .catch(() => { setRows([]); })
      .finally(() => setLoading(false));
  }, [fenetre]);

  const medaille = (rang: number) => (rang === 1 ? '🥇' : rang === 2 ? '🥈' : rang === 3 ? '🥉' : null);

  return (
    <div style={{ background: 'var(--bg, #0a0a0f)', minHeight: '100vh', color: INK, fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' }}>
      <Navbar />

      {/* HERO */}
      <div style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', paddingTop: 8 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 4px' }}>
          <section style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '22px 20px', textAlign: 'center', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><EchoIcon statut="heraut" size={46} /></div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, margin: '6px 0 6px', textTransform: 'uppercase' }}>Classement des votants</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13.5, maxWidth: '48ch', margin: '0 auto' }}>Les voix qui portent le plus les talents de l'Arène. Au pseudo uniquement — la vie privée d'abord.</p>
          </section>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '18px 16px 0' }}>
        {/* Onglets fenêtre */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {FENETRES.map((f) => (
            <button key={f.key} onClick={() => setFenetre(f.key)}
              style={{
                border: `1px solid ${fenetre === f.key ? OR : LINE}`,
                background: fenetre === f.key ? 'rgba(255,170,0,0.12)' : 'transparent',
                color: fenetre === f.key ? OR : INK,
                borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>{f.label}</button>
          ))}
        </div>

        {/*DKDK_GUIDE — guide intégré « Ton guide Diki-Diki » (Classement)*/}
        <details style={{ background: 'var(--nav-surface, rgba(255,255,255,0.03))', border: '1px solid rgba(255,170,0,0.28)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <summary style={{ cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13.5, color: OR }}>🧭 Ton guide Diki-Diki — le classement</summary>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, lineHeight: 1.6, color: INK }}>
            <div><b>📊 C’est quoi ?</b> Les votants classés par <b>Échos</b> — 1 vote payant = 1 Écho. Plus tu soutiens de talents, plus tu montes.</div>
            <div><b>⏱️ Les périodes :</b> Semaine · Mois · Saison · Depuis le début. Change d’onglet pour voir chaque classement.</div>
            <div><b>🏅 Les couleurs :</b> le badge coloré indique le <b>statut</b> du votant — <span style={{ color: '#4bd99a' }}>Le Messager</span> → <span style={{ color: '#ffd266' }}>Le Porte-parole</span> → <span style={{ color: '#ff7a6a' }}>L’Ambassadeur</span> → <b>Le Héraut</b> (arc-en-ciel).</div>
            <div><b>🔒 Vie privée :</b> au <b>pseudo uniquement</b> — jamais ton vrai nom ni les montants dépensés.</div>
            <div><b>💡 Monter :</b> vote, valide ton défi mensuel et grimpe les statuts, saison après saison. 💫</div>
          </div>
        </details>

        {!actif ? (
          <p style={{ opacity: 0.7, fontSize: 14 }}>Le programme de fidélité n'est pas actif pour le moment.</p>
        ) : loading ? (
          <p style={{ opacity: 0.6, fontSize: 14 }}>Chargement…</p>
        ) : rows.length === 0 ? (
          <p style={{ opacity: 0.7, fontSize: 14 }}>Personne au classement sur cette période — sois le premier à faire résonner les talents !</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map((r) => (
              <div key={r.rang}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: r.rang <= 3 ? 'rgba(255,170,0,0.06)' : 'var(--nav-surface, rgba(255,255,255,0.03))',
                  border: `1px solid ${r.rang <= 3 ? 'rgba(255,170,0,0.25)' : LINE}`,
                  borderRadius: 12, padding: '10px 14px',
                }}>
                <span style={{ width: 34, textAlign: 'center', fontWeight: 800, fontSize: 15, color: r.rang <= 3 ? OR : INK }}>
                  {medaille(r.rang) || r.rang}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <EchoIcon statut={(r.statut || 'messager') as any} size={18} />
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.pseudo}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                    background: STATUT_GRAD[r.statut || 'messager'], color: encreStatut(r.statut), boxShadow: '0 1px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' }}>{STATUT_NOM[r.statut || 'messager']}</span>
                </span>
                <span style={{ fontWeight: 800, color: OR, fontSize: 15 }}>{r.echos}</span>
                <span style={{ fontSize: 11.5, opacity: 0.6 }}>Échos</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
