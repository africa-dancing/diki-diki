'use client';
import Navbar from '../components/Navbar';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const OR  = '#FFAA00';
const OR2 = '#FF6B00';
const BG  = '#0a0a0f';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Matiere {
  id: string;
  nom: string;
  emoji: string;
  description: string;
  ordre: number;
}

export default function EducationPage() {
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    fetch(`${API}/v1/education/matieres`)
      .then(r => r.json())
      .then(d => { setMatieres(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = matieres.filter(m =>
    m.nom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#e8e0d0' }}>

      {/* Navbar globale */}
      <Navbar />

      {/* Badge catégorie */}
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Link href="/home" style={{ color: 'rgba(255,170,0,0.6)', fontSize: 12, textDecoration: 'none', padding: '5px 12px', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 20 }}>
          🎭 Loisirs & Divertissement
        </Link>
        <span style={{ color: OR, fontSize: 12, padding: '5px 12px', border: `1px solid ${OR}`, borderRadius: 20, fontWeight: 600 }}>
          📚 Education & Savoirs
        </span>
      </div>

      {/* ── Hero ── */}
      <div style={{
        padding: '20px 16px 16px',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)',
        textAlign: 'center'
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFAA00', display: 'inline-block', verticalAlign: 'middle' }} />
        <span style={{ fontSize: '0.72rem', color: '#FFAA00', fontWeight: 700, letterSpacing: '0.06em' }}>
          {' '}TABLE DES MATIERES EN COURS
        </span>

        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 'clamp(1.4rem, 5vw, 2.5rem)',
          color: '#fff',
          margin: '12px 0',
          lineHeight: 1.15
        }}>
          Savoirs du monde, ici <span style={{ color: OR }}> 100% gratuits.</span>
        </h1>

        <p style={{
          fontSize: 14,
          color: 'rgb(255, 255, 255)',
          maxWidth: 900,
          lineHeight: 1.4,
          margin: '0 auto 16px',
          textAlign: 'center',
        }}>
          Partagez, Likez et Soutenez vos Enseignants !{' '}
          <span style={{ color: OR }}>Chaque enseignant enrichit et valorise notre patrimoine commun.</span>
        </p>

        {/* Stats compactes mobile-friendly */}
        <div style={{
          padding: '16px 0',
          display: 'flex',
          gap: 16,
          marginBottom: 24,
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          {[
            { v: '21', l: 'Matières' },
            { v: <span style={{ color: '#FF0000' }}>👍 10F</span>, l: 'par Like' },
            { v: <span style={{ color: '#FF0000' }}>★ 20F</span>, l: 'par Étoile' },
          ].map(({ v, l }, i) => (
            <div key={i} style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: OR }}>{v}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Barre de recherche */}
        <input
          type="text"
          placeholder="🔍 Rechercher une matière..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,170,0,0.2)', borderRadius: 10,
            color: '#fff', fontSize: 14, padding: '11px 14px', outline: 'none',
            fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Grille des matières */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>
            Chargement des matières...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {filtered.map((m, i) => (
              <Link key={m.id} href={`/education/${m.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,170,0,0.1)',
                  borderRadius: 14, padding: '18px 16px',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1px solid rgb(255, 0, 0)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255, 0, 0, 0.05)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,170,0,0.1)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{m.emoji}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 6 }}>
                    {m.nom}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 12 }}>
                    {m.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: OR, fontWeight: 600 }}>Voir les chapitres →</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 10 }}>
                      #{m.ordre}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>
            Aucune matière trouvée pour "{search}"
          </div>
        )}

        {/* CTA Créateur */}
        <div style={{
          marginTop: 36, background: 'linear-gradient(135deg, hsl(339, 98%, 49%), hsl(330, 90%, 38%))',
          border: '1px solid rgba(255,170,0,0.15)', borderRadius: 14, padding: '24px 18px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16,
        }}>
          <div style={{ flex: '1 1 220px' }}>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: '#fff', margin: '0 0 4px' }}>
              🎓 Vous avez du savoir à partager ?
            </p>
            <p style={{ fontSize: 13, color: 'rgb(255, 255, 255)', margin: 0 }}>
              Créez vos chapitres gratuitement. Recevez 50% des soutiens.
            </p>
          </div>
          <Link href="/education/creer" style={{
            background: `linear-gradient(90deg,${OR},${OR2})`, color: BG,
            fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 8,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            + Créer un chapitre
          </Link>
        </div>
      </div>
    </div>
  );
}
