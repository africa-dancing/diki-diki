'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';
const CATEGORIES = ['Arts de la scene', 'Musique', 'Arts de la parole'];
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

interface Video { id: string; title?: string; status: string; }

export default function CreerChallengePage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categorie, setCategorie] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [style, setStyle] = useState('');
  const [videoId, setVideoId] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) { router.push('/auth/login'); return; }
    fetch(`${API}/videos/my`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then((d: any) => {
        const all: Video[] = d.videos ?? [];
        const approved = all.filter(v => v.status === 'approved');
        setVideos(approved);
        if (approved[0]) setVideoId(approved[0].id);
      })
      .catch(() => {});
  }, [router]);

  const submit = async () => {
    setMsg('');
    if (!categorie || !discipline.trim() || !style.trim() || !videoId) {
      setMsg('Remplis tous les champs et choisis une video.'); return;
    }
    setSubmitting(true);
    try {
      const t = getToken();
      const res = await fetch(`${API}/brackets/arena/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ video_id: videoId, categorie, discipline: discipline.trim(), style: style.trim() }),
      });
      const data = await res.json();
      if (!data.success) { setMsg(data.error || 'Erreur.'); setSubmitting(false); return; }
      router.push(`/challenges/${data.data.bracket_id}`);
    } catch {
      setMsg('Erreur reseau. Reessaie.'); setSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, marginBottom: 16 } as const;
  const labelStyle = { fontSize: 13, fontWeight: 700, color: OR, marginBottom: 6, display: 'block' } as const;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f0', fontFamily: 'DM Sans,sans-serif', paddingBottom: 80 }}>
      <Navbar />
      <div style={{ padding: '16px 24px 10px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(0.75rem,3vw,1.9rem)', lineHeight: 1.1, whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Podium Challenges <span style={{ background: 'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Arena</span>
        </h1>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: '#fefefe' }}>Créer un challenge</h1>
        </div>

        <label style={labelStyle}>Catégorie</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategorie(c)} style={{ flex: 1, minWidth: 120, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: categorie === c ? `1px solid ${OR}` : '1px solid rgba(255,255,255,0.15)', background: categorie === c ? `linear-gradient(135deg,#FF6B00,#FFD700)` : 'rgba(255,255,255,0.05)', color: categorie === c ? '#000' : 'rgba(255,255,255,0.6)' }}>{c}</button>
          ))}
        </div>

        <label style={labelStyle}>Discipline</label>
        <input style={inputStyle} value={discipline} onChange={e => setDiscipline(e.target.value)} placeholder='Ex : Danse, Chant, Slam...' />

        <label style={labelStyle}>Style</label>
        <input style={inputStyle} value={style} onChange={e => setStyle(e.target.value)} placeholder='Ex : Ndombolo, Afrobeats...' />

        <label style={labelStyle}>Ta vidéo (approuvée)</label>
        {videos.length === 0 ? (
          <div style={{ ...inputStyle, color: 'rgba(255,255,255,0.4)' }}>Aucune vidéo approuvée. Soumets et fais approuver une vidéo d'abord.</div>
        ) : (
          <select style={inputStyle} value={videoId} onChange={e => setVideoId(e.target.value)}>
            {videos.map(v => <option key={v.id} value={v.id} style={{ background: '#1a1a1f' }}>{v.title || v.id.slice(0, 8)}</option>)}
          </select>
        )}

        {msg && <div style={{ color: '#FF6B6B', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{msg}</div>}

        <button onClick={submit} disabled={submitting} style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 800, fontFamily: 'Syne,sans-serif', cursor: submitting ? 'wait' : 'pointer', border: 'none', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Création...' : 'Lancer le challenge'}
        </button>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 16, lineHeight: 1.6, textAlign: 'center' }}>
          Conditions : compte vérifié · au moins une vidéo approuvée · avoir rechargé 1000 unités au moins une fois. Tu deviens le 1er inscrit.
        </div>
      </div>
    </div>
  );
}
