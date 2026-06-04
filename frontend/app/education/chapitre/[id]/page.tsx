'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const OR  = '#FFAA00';
const OR2 = '#FF6B00';
const BG  = '#0a0a0f';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Lecon {
  id: string; titre: string; description: string;
  format: 'video' | 'texte_video' | 'audio';
  contenu_url: string; duree_min: number; vues: number;
  note_moyenne: string | null; likes: number; etoiles: number; createur_id: string;
}

export default function ChapitreDetailPage() {
  const { id } = useParams();
  const [lecons, setLecons]   = useState<Lecon[]>([]);
  const [loading, setLoading] = useState(true);
  const [soutenu, setSoutenu] = useState<Record<string, string>>({});

  const userId = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem('dkdk_token') || '{}')?.userId || '00000000-0000-0000-0000-000000000001'; } catch { return '00000000-0000-0000-0000-000000000001'; } })()
    : '00000000-0000-0000-0000-000000000001';

  useEffect(() => {
    fetch(`${API}/v1/education/chapitres/${id}/lecons`)
      .then(r => r.json())
      .then(d => { setLecons(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const deviceId = typeof window !== 'undefined'
    ? (() => { let d = localStorage.getItem('dkdk_device'); if (!d) { d = 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('dkdk_device', d); } return d; })()
    : '';

  const soutenir = async (leconId: string, createurId: string) => {
    const type = 'etoile';
    const res  = await fetch(`${API}/v1/education/lecons/${leconId}/soutenir`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, createur_id: createurId, type }),
    });
    const data = await res.json();
    if (data.success) {
      setSoutenu(prev => ({ ...prev, [leconId]: type }));
      setLecons(prev => prev.map(l => l.id === leconId ? {
        ...l,
        etoiles: l.etoiles + 1,
      } : l));
      alert(data.message);
    }
  };

  const noter = async (leconId: string, note: number) => {
    await fetch(`${API}/v1/education/lecons/${leconId}/noter`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, device_id: deviceId, note }),
    });
    setLecons(prev => prev.map(l => l.id === leconId ? { ...l, note_moyenne: String(note) } : l));
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#e8e0d0' }}>
      <header style={{ borderBottom: '1px solid rgba(255,170,0,0.12)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/home" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: OR, textDecoration: 'none' }}>
          <LogoDikiDiki width={200} />
        </Link>
        <Link href="/education" style={{ color: 'rgba(255,170,0,0.6)', fontSize: 13, textDecoration: 'none' }}>← Éducation</Link>
      </header>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 30, color: '#fff', marginBottom: 8 }}>
          📖 Leçons du chapitre
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 32 }}>
          {lecons.length} leçon{lecons.length > 1 ? 's' : ''} disponible{lecons.length > 1 ? 's' : ''}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <Link href="/education/creer" style={{ background: `linear-gradient(90deg,${OR},${OR2})`, color: BG, fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
            + Ajouter une leçon
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>
        ) : lecons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,170,0,0.2)', borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#fff', fontSize: 18, marginBottom: 8 }}>Aucune leçon encore</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginBottom: 20 }}>Partagez votre savoir !</p>
            <Link href="/education/creer" style={{ background: `linear-gradient(90deg,${OR},${OR2})`, color: BG, fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 8, textDecoration: 'none' }}>
              Créer une leçon
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {lecons.map(l => (
              <div key={l.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,170,0,0.1)', borderRadius: 16, padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                  <div>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: '#fff', margin: '0 0 6px' }}>{l.titre}</h3>
                    {l.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{l.description}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  {l.duree_min > 0 && <span>⏱ {l.duree_min} min</span>}
                  <span>👁 {l.vues} vues</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Soutenir mon action
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => soutenir(l.id, l.createur_id)} disabled={soutenu[l.id] === 'etoile'}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 8, color: '#FF2222', fontSize: 14, fontWeight: 700, padding: '10px 18px', cursor: 'pointer' }}>
                      ★ Étoile — 20 F CFA ({l.etoiles})
                    </button>
                    <select onChange={e => noter(l.id, Number(e.target.value))} defaultValue=""
                      style={{ background: '#111', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 6, color: OR, fontSize: 13, padding: '6px 10px', cursor: 'pointer' }}>
                      <option value="" disabled>Note /20</option>
                      {Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i}/20</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}