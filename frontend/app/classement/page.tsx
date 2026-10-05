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

interface Row { rang: number; pseudo: string; echos: number; }

const INK = 'var(--ink, #e8e0d0)';
const OR = 'var(--or, #FFAA00)';
const LINE = 'var(--line, #26262f)';

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
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: INK }}>{r.pseudo}</span>
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
