'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TickerBand from '../components/TickerBand';
import './home.css';
import Navbar from '../components/Navbar';

const StarRed = () => <span style={{ color: '#FF0000' }}>★</span>;

interface Video {
  id: string; title: string; description?: string; storage_url?: string;
  discipline?: string; track_title?: string; track_artist?: string; track_genre?: string;
  views?: number; vote_count?: number; created_at: string;
  user?: { name?: string; id?: string };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

const CATEGORY_COLORS: Record<string, string> = {
  danse: '#FF6B00', chant: '#f90505', instrument: '#06B6D4', acapella: '#8B5CF6',
  humour: '#22C55E', poesie: '#F59E0B', default: '#6B7280',
};
function badgeColor(discipline?: string) {
  return CATEGORY_COLORS[discipline?.toLowerCase() ?? ''] ?? CATEGORY_COLORS.default;
}

function VideoCard({ video, index }: { video: Video; index: number }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleHover = (on: boolean) => {
    setHovered(on);
    if (videoRef.current) { on ? videoRef.current.play().catch(() => {}) : videoRef.current.pause(); }
  };
  return (
    <div onClick={() => router.push(`/watch/${video.id}`)}
      onMouseEnter={() => handleHover(true)} onMouseLeave={() => handleHover(false)}
      style={{
        cursor: 'pointer', borderRadius: '16px', overflow: 'hidden', background: '#141414',
        border: hovered ? '1.5px solid #FF6B00' : '1.5px solid #222',
        transform: hovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
        transition: 'all 0.28s cubic-bezier(.4,0,.2,1)',
        animationDelay: `${index * 60}ms`, animation: 'fadeUp 0.5s ease both',
        boxShadow: hovered ? '0 16px 40px rgba(255,107,0,0.18)' : '0 2px 12px rgba(0,0,0,0.4)'
      }}>
      <div style={{ position: 'relative', aspectRatio: '9/16', background: '#0a0a0a', overflow: 'hidden' }}>
        {video.storage_url ? (
          <video ref={videoRef} src={video.storage_url} muted loop playsInline preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: hovered ? 1 : 0.85, transition: 'opacity 0.3s' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a1a,#2a2a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>🎬</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top,rgba(0,0,0,0.95),transparent)' }} />
        {video.discipline && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: badgeColor(video.discipline), color: '#fff', fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {video.discipline}
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: '#ccc', fontSize: '0.65rem', padding: '3px 7px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          👁 {(video.views ?? 0).toLocaleString('fr-FR')}
        </div>
        {(video.vote_count ?? 0) > 0 && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, color: '#FF6B00', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <StarRed /> {video.vote_count}
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: '#f0f0f0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {video.title || video.track_title || 'Sans titre'}
        </p>
        {video.track_artist && <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#888' }}>{video.track_artist}</p>}
        {video.user?.name && <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: '#555' }}>par {video.user.name}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#141414', border: '1.5px solid #1e1e1e' }}>
      <div style={{ aspectRatio: '9/16', background: 'linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ height: 14, width: '70%', background: '#222', borderRadius: 4, marginBottom: 8, animation: 'shimmer 1.4s infinite' }} />
        <div style={{ height: 11, width: '45%', background: '#1a1a1a', borderRadius: 4, animation: 'shimmer 1.4s infinite' }} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const ping = () => fetch(`${API}/analytics/heartbeat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, page: '/home', isLoggedIn: !!localStorage.getItem('dkdk_token') }),
    }).catch(() => {});
    ping();
    const interval = setInterval(ping, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/videos/approved`)
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { const list: Video[] = Array.isArray(data) ? data : (data.videos ?? data.data ?? []); setVideos(list); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />

      {/* Badge categorie */}
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ color: '#FFAA00', fontSize: 12, padding: '5px 12px', border: '1px solid #FFAA00', borderRadius: 20, fontWeight: 600 }}>
          🎭 Loisirs & Divertissement
        </span>
        <Link href="/education" style={{ color: 'rgba(255,170,0,0.6)', fontSize: 12, textDecoration: 'none', padding: '5px 12px', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 20 }}>
          📚 Education & Savoirs
        </Link>
      </div>

      {/* Hero */}
      <div style={{ padding: '16px 24px 10px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(0.95rem,4.5vw,3rem)', lineHeight: 1.1, marginBottom: 8, whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Podium Challenges 
          <span style={{ background: 'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Arena </span>
        </h1>
        <Link href="/challenges" style={{ background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', border: 'none', borderRadius: 50, padding: '5px 14px', fontSize: '0.78rem', fontWeight: 700, color: '#000', textDecoration: 'none', display: 'inline-block' }}>
          Explorer →
        </Link>
      </div>

      {/* Grille vidéos */}
      <div style={{ padding: '8px 16px 80px', overflowY: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' } as React.CSSProperties}>
        {loading && <div className="video-grid">{Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
        {error && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
            <p style={{ fontWeight: 600, color: '#888', marginBottom: 8 }}>Impossible de charger les vidéos</p>
            <p style={{ fontSize: '0.8rem', color: '#444', marginBottom: 20 }}>{error}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>Réessayer</button>
          </div>
        )}
        {!loading && !error && videos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎬</div>
            <p style={{ fontWeight: 600, color: '#888', marginBottom: 8 }}>Aucune vidéo disponible</p>
            <p style={{ fontSize: '0.8rem', color: '#444' }}>Les premières vidéos approuvées apparaîtront ici.</p>
            <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => router.push('/submit')}>Être le premier à soumettre</button>
          </div>
        )}
        {!loading && !error && videos.length > 0 && (
          <div className="video-grid">{videos.map((v, i) => <VideoCard key={v.id} video={v} index={i} />)}</div>
        )}
      </div>

      {/* Ticker */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}><TickerBand /></div>
    </>
  );
}

