'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

interface Candidat { id: string; name: string | null; avatar_url: string | null; country: string | null; }

export default function ParcoursSection() {
  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    fetch(API + '/brackets/candidats')
      .then(r => r.json())
      .then((res: any) => { if (res.success) setCandidats(res.data || []); else setErreur(res.error || 'Erreur'); })
      .catch(() => setErreur('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.8)' }}>Chargement...</div>;
  if (erreur)  return <div style={{ textAlign: 'center', padding: 40, color: '#f87171' }}>{erreur}</div>;

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgb(237,7,15))', borderRadius: 18, padding: '22px 20px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>🏆</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 6 }}>Mes challenges</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{candidats.length} candidat{candidats.length !== 1 ? 's' : ''} ayant participé</div>
      </div>
      {candidats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Aucun candidat pour le moment.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {candidats.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#7e0380,#ed070f)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {c.avatar_url ? <img src={c.avatar_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>👤</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.name || 'Candidat'}</div>
                {c.country && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{c.country}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}