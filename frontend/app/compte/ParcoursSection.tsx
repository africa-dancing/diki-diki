'use client';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

interface Candidat { id: string; name: string | null; avatar_url: string | null; country: string | null; }
interface Etape { round_number: number; video_id: string; videos: { title: string | null; storage_url: string | null; status: string } | null; }
interface Challenge { id: string; bracket_id: string; score: number; brackets: { title: string | null; status: string; discipline: string | null; max_participants: number | null } | null; etapes?: Etape[]; }

const ROUND_LABEL = (r: number, max: number): string => {
  if (max === 4)  return r === 1 ? 'Demi-finale' : 'Finale';
  if (max === 8)  return r === 1 ? 'Quart de finale' : r === 2 ? 'Demi-finale' : 'Finale';
  if (max === 16) return r === 1 ? 'Huitieme de finale' : r === 2 ? 'Quart de finale' : r === 3 ? 'Demi-finale' : 'Finale';
  return 'Etape ' + r;
};
const STATUT_LABEL = (s: string): string => s === 'done' ? 'Termine' : (s === 'in_progress' || s === 'active') ? 'En cours' : 'En attente';

export default function ParcoursSection() {
  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sel, setSel] = useState<Candidat | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingP, setLoadingP] = useState(false);

  useEffect(() => {
    fetch(API + '/brackets/candidats')
      .then(r => r.json())
      .then((res: any) => { if (res.success) setCandidats(res.data || []); else setErreur(res.error || 'Erreur'); })
      .catch(() => setErreur('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const ouvrir = async (c: Candidat) => {
    setSel(c); setLoadingP(true); setChallenges([]);
    try {
      const r = await fetch(API + '/brackets/candidats/' + c.id + '/challenges');
      const res = await r.json();
      const chs: Challenge[] = (res.success ? res.data : []) || [];
      const enrichis = await Promise.all(chs.map(async (ch) => {
        try {
          const rp = await fetch(API + '/brackets/participant/' + ch.id + '/videos');
          const rpj = await rp.json();
          return { ...ch, etapes: (rpj.success ? rpj.data : []) || [] };
        } catch { return { ...ch, etapes: [] }; }
      }));
      setChallenges(enrichis);
    } catch { setChallenges([]); }
    finally { setLoadingP(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.8)' }}>Chargement...</div>;
  if (erreur)  return <div style={{ textAlign: 'center', padding: 40, color: '#f87171' }}>{erreur}</div>;

  if (sel) {
    return (
      <div>
        <button onClick={() => { setSel(null); setChallenges([]); }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer', marginBottom: 14 }}>← Retour</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,#7e0380,#ed070f)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {sel.avatar_url ? <img src={sel.avatar_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>👤</span>}
          </div>
          <div><div style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif' }}>{sel.name || 'Candidat'}</div>{sel.country && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{sel.country}</div>}</div>
        </div>
        {loadingP ? <div style={{ textAlign: 'center', padding: 30, color: 'rgba(255,255,255,0.7)' }}>Chargement du parcours...</div> : challenges.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Aucun challenge.</div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {challenges.map(ch => (
              <div key={ch.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgb(237,7,15))', padding: '12px 16px' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif' }}>{ch.brackets?.title || 'Challenge'}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>{ch.brackets?.discipline || ''} · {STATUT_LABEL(ch.brackets?.status || '')}</div>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(ch.etapes || []).length === 0 ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Aucune video.</div> : (ch.etapes || []).map(e => (
                    <div key={e.round_number} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#FFAA00', minWidth: 90 }}>{ROUND_LABEL(e.round_number, ch.brackets?.max_participants || 4)}</div>
                      <div style={{ flex: 1, fontSize: 13, color: '#fff' }}>{e.videos?.title || 'Video'}</div>
                      {e.videos?.storage_url && <a href={'/watch/' + e.video_id} style={{ fontSize: 11, color: '#FFAA00', textDecoration: 'none', fontWeight: 700 }}>Voir →</a>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgb(237,7,15))', borderRadius: 18, padding: '22px 20px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>🏆</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 6 }}>Mes challenges</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{candidats.length} candidat{candidats.length !== 1 ? 's' : ''} ayant participe</div>
      </div>
      {candidats.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Aucun candidat pour le moment.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {candidats.map(c => (
            <div key={c.id} onClick={() => ouvrir(c)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#7e0380,#ed070f)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {c.avatar_url ? <img src={c.avatar_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18 }}>👤</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.name || 'Candidat'}</div>
                {c.country && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{c.country}</div>}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}