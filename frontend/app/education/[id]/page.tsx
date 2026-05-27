'use client';
import LogoDikiDiki from '../../components/LogoDikiDiki';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const OR  = '#FFAA00';
const OR2 = '#FF6B00';
const BG  = '#0a0a0f';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Chapitre {
  id: string; titre: string; description: string;
  createur_id: string; lecons: { count: number }[];
}
interface Matiere { id: string; nom: string; emoji: string; description: string; }

export default function MatiereDetailPage() {
  const { id }                        = useParams();
  const [matiere, setMatiere]         = useState<Matiere | null>(null);
  const [chapitres, setChapitres]     = useState<Chapitre[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    fetch(`${API}/v1/education/matieres`)
      .then(r => r.json())
      .then(d => setMatiere(d.data?.find((m: Matiere) => m.id === id) || null));
    fetch(`${API}/v1/education/matieres/${id}/chapitres`)
      .then(r => r.json())
      .then(d => { setChapitres(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#e8e0d0' }}>
      <header style={{ borderBottom: '1px solid rgba(255,170,0,0.12)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/home" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: OR, textDecoration: 'none' }}>
          <LogoDikiDiki width={200} />
        </Link>
        <Link href="/education" style={{ color: 'rgba(255,170,0,0.6)', fontSize: 13, textDecoration: 'none' }}>← Toutes les matières</Link>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>
          <Link href="/education" style={{ color: OR, textDecoration: 'none' }}>Éducation</Link>{' → '}
          <span>{matiere?.nom || '...'}</span>
        </div>

        {matiere && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>{matiere.emoji}</div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 36, color: '#fff', margin: '0 0 10px' }}>{matiere.nom}</h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', maxWidth: 520, lineHeight: 1.7 }}>{matiere.description}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 24, marginBottom: 40, padding: '20px 24px', background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.1)', borderRadius: 12 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: OR }}>{chapitres.length}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Chapitres</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: OR }}>
              {chapitres.reduce((a, c) => a + (c.lecons?.[0]?.count || 0), 0)}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Leçons</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: OR }}>100%</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Gratuit</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: '#fff', margin: 0 }}>Chapitres disponibles</h2>
          <Link href={`/education/creer?matiere=${id}`} style={{ background: `linear-gradient(90deg,${OR},${OR2})`, color: BG, fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
            + Ajouter un chapitre
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
        ) : chapitres.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,170,0,0.2)', borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 8 }}>Aucun chapitre encore</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', marginBottom: 24 }}>Soyez le premier à partager votre savoir !</p>
            <Link href={`/education/creer?matiere=${id}`} style={{ background: `linear-gradient(90deg,${OR},${OR2})`, color: BG, fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 8, textDecoration: 'none' }}>
              Créer le premier chapitre
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chapitres.map((c, i) => (
              <Link key={c.id} href={`/education/chapitre/${c.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,170,0,0.1)', borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,170,0,0.35)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,170,0,0.1)'; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${OR},${OR2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: BG, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4 }}>{c.titre}</div>
                    {c.description && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{c.description}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, color: OR, fontWeight: 600 }}>{c.lecons?.[0]?.count || 0} leçon{(c.lecons?.[0]?.count || 0) > 1 ? 's' : ''}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
