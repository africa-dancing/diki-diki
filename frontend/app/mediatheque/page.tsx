'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';
const CONTINENTS = ['Tous', 'Afrique', 'Europe', 'Amerique', 'Asie'];

interface Musique {
  id: string; artiste: string; titre: string; album?: string;
  duree_sec?: number; pays_origine?: string; continent?: string;
  danse?: string; style?: string; cover_url?: string;
}

function fmtDuree(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60); const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function MediathequePage() {
  const [musiques, setMusiques] = useState<Musique[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('Tous');

  useEffect(() => {
    setLoading(true);
    const url = filtre === 'Tous' ? `${API}/musiques` : `${API}/musiques?continent=${encodeURIComponent(filtre)}`;
    fetch(url)
      .then(r => r.json())
      .then((d: any) => { setMusiques(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filtre]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f0', fontFamily: 'DM Sans,sans-serif', paddingBottom: 80 }}>
      <Navbar />
      <div style={{ padding: '16px 24px 10px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(0.75rem,3vw,1.9rem)', lineHeight: 1.1, whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Mediatheque <span style={{ background: 'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diki-Diki</span>
        </h1>
      </div>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: '#fefefe', marginBottom: 6 }}>Le repertoire musical</h1>
          <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.6 }}>Decouvre les morceaux du continent, propose les tiens pour les challenges.</div>
        </div>

        <Link href='/mediatheque/ajouter' style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', fontWeight: 800, fontFamily: 'Syne,sans-serif', fontSize: 15, padding: '14px', borderRadius: 14, textDecoration: 'none', marginBottom: 20 }}>
          + Ajouter un morceau
        </Link>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {CONTINENTS.map(c => (
            <button key={c} onClick={() => setFiltre(c)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: filtre === c ? `1px solid ${OR}` : '1px solid rgba(255,255,255,0.15)', background: filtre === c ? OR : 'rgba(255,255,255,0.05)', color: filtre === c ? '#000' : 'rgba(255,255,255,0.6)' }}>{c}</button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>Chargement...</div>}

        {!loading && musiques.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u{1F3B5}'}</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Syne,sans-serif', marginBottom: 6 }}>Aucun morceau pour le moment</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Sois le premier a proposer un morceau !</div>
          </div>
        )}

        {!loading && musiques.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
            <div style={{ width: 54, height: 54, borderRadius: 10, background: m.cover_url ? `url(${m.cover_url}) center/cover` : 'linear-gradient(135deg,#FF6B00,#FFD700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'rgb(126,3,128)', flexShrink: 0 }}>{!m.cover_url && '\u266A'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Syne,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.titre}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{m.artiste}{m.album ? ` - ${m.album}` : ''}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {m.danse && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,170,0,0.15)', color: OR, fontWeight: 700 }}>{m.danse}</span>}
                {m.pays_origine && <img src={`https://flagcdn.com/${m.pays_origine.toLowerCase()}.svg`} alt={m.pays_origine} title={m.pays_origine} style={{ width: 18, height: 'auto', borderRadius: 3, objectFit: 'cover', verticalAlign: 'middle' }} />}
              </div>
            </div>
            {m.duree_sec ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{fmtDuree(m.duree_sec)}</div> : null}
          </div>
        ))}

      </div>
    </div>
  );
}
