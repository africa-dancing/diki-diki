'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
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

      {/* Header */}
      <header style={{ borderBottom: '1px solid rgb(246, 245, 242)', padding: '18px 24px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <Link href="/home" style={{ textDecoration: 'none' }}>
          <LogoDikiDiki width={200} />
        </Link>
        <div style={{ display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: BG, fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 14px', borderRadius: 4, textTransform: 'uppercase' }}>
          Education & Savoirs
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Link href="/home" style={{ color: 'rgba(255,170,0,0.6)', fontSize: 13, textDecoration: 'none', padding: '6px 14px', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 20 }}>
            🎭 Loisirs & Divertissement
          </Link>
          <span style={{ color: OR, fontSize: 13, padding: '6px 14px', border: `1px solid ${OR}`, borderRadius: 20, fontWeight: 600 }}>
            📚 Education & Savoirs
          </span>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{
        padding: '20px 24px 12px',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgb(247, 6, 6) 0%, transparent 70%)', textAlign: 'center',}}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFAA00', animation: 'pulse-dot 1.5s ease-in-out infinite', display: 'inline-block' }} />
        <span style={{ fontSize: '0.72rem', color: '#FFAA00', fontWeight: 700, letterSpacing: '0.06em' }}>
          {' '}TABLE DES MATIERES EN COURS
        </span>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 42, color: '#fff', margin: '0 0 12px', lineHeight: 1.15 }}>
          Savoirs du monde, ici <span style={{ color: OR }}> 100% gratuits.</span>
        </h1>

        {/* ✅ Paragraphe centré */}
        <p style={{
          fontSize: 16,
          color: 'rgb(255, 255, 255)',
          maxWidth: 900,
          lineHeight: 1.15,
          margin: '0 auto 12px',
          textAlign: 'center',
        }}>
          Partagez, Liker et Soutenez vos Enseignants !{' '}
          <span style={{ color: OR }}>Chaque enseignant, enrichit et valorise notre patrimoine commun.</span>
        </p>

        {/* ✅ Stats centrées */}
        <div style={{
          padding: '20px 0',
          display: 'flex',
          gap: 32,
          marginBottom: 40,
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}>
          {[
            { v: '21', l: 'Matières' },
            { v: <span style={{ color: '#FF0000' }}>👍 10F</span>, l: 'par Like' },
            { v: <span style={{ color: '#FF0000' }}>★ 20F</span>, l: 'par Étoile' },
          ].map(({ v, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: OR }}>{v}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{l}</div>
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
            color: '#fff', fontSize: 15, padding: '12px 16px', outline: 'none',
            fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Grille des matières */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.3)' }}>
            Chargement des matières...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map((m, i) => (
              <Link key={m.id} href={`/education/${m.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,170,0,0.1)',
                  borderRadius: 16, padding: '24px 20px',
                  cursor: 'pointer', transition: 'all 0.2s',
                  animationDelay: `${i * 50}ms`,
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1px solid rgb(255, 0, 0)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255, 0, 0, 0.05)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,170,0,0.1)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>{m.emoji}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8 }}>
                    {m.nom}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 16 }}>
                    {m.description}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: OR, fontWeight: 600 }}>Voir les chapitres →</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 10 }}>
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
          marginTop: 48, background: 'linear-gradient(135deg, rgb(255, 4, 0), rgb(255, 0, 0))',
          border: '1px solid rgba(255,170,0,0.15)', borderRadius: 16, padding: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: '#fff', margin: '0 0 6px' }}>
              🎓 Vous avez du savoir à partager ?
            </p>
            <p style={{ fontSize: 14, color: 'rgb(255, 255, 255)', margin: 0 }}>
              Créez vos chapitres et leçons gratuitement. Recevez 50% des soutiens du public.
            </p>
          </div>
          <Link href="/education/creer" style={{
            background: `linear-gradient(90deg,${OR},${OR2})`, color: BG,
            fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 8,
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            + Créer un chapitre
          </Link>
        </div>
      </div>
    </div>
  );
}
