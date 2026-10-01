'use client';
// Vidéo de bienvenue — se joue UNE SEULE FOIS au 1er accès à l'accueil (utilisateur connecté).
// Inerte tant que NEXT_PUBLIC_WELCOME_VIDEO_URL n'est pas défini : rien ne s'affiche.
// Compatible YouTube (lien) OU fichier MP4. À la fin -> redirection vers /faq (« Comment ça marche ? »).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const ENV_URL  = process.env.NEXT_PUBLIC_WELCOME_VIDEO_URL || '';
const API       = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const SEEN_KEY  = 'dkdk_welcome_seen';

function ytId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export default function WelcomeVideo() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    // Gérée depuis l'admin (Réglages → welcome_video_url). Vide = désactivée.
    let token: string | null = null, seen: string | null = null;
    try { token = localStorage.getItem('dkdk_token'); seen = localStorage.getItem(SEEN_KEY); } catch {}
    if (!token || seen) return; // uniquement connecté + jamais vue
    (async () => {
      let url = ENV_URL; // repli si le réglage n'existe pas encore en base
      try {
        const r = await fetch(`${API}/settings`, { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          const row = (d?.data || []).find((x: any) => x.key === 'welcome_video_url');
          if (row) url = row.value || ''; // clé présente = source autoritaire (vide = off)
        }
      } catch {}
      if (url) { setVideoUrl(url); setShow(true); }
    })();
  }, []);

  const marquerVu = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch {} };
  const terminer  = () => { marquerVu(); setShow(false); router.push('/faq'); };
  const passer    = () => { marquerVu(); setShow(false); };

  if (!show) return null;
  const yt = ytId(videoUrl);

  return (
    <div
      role="dialog"
      aria-label="Vidéo de bienvenue"
      style={{ position: 'fixed', inset: 0, zIndex: 4000, background: 'rgba(5,5,10,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ width: '100%', maxWidth: 780, background: '#0d0d14', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 16, padding: 18, boxShadow: '0 24px 70px -20px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: '#fff' }}>
            Akwaba ! Bienvenue dans l&apos;Arène Diki-Diki 👋
          </div>
          <button onClick={passer} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#b8b2a4', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>
            Passer ✕
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          {yt ? (
            <iframe
              src={`https://www.youtube.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title="Vidéo de bienvenue Diki-Diki"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <video
              src={videoUrl}
              autoPlay
              controls
              playsInline
              onEnded={terminer}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          )}
        </div>

        <button
          onClick={terminer}
          style={{ width: '100%', marginTop: 14, padding: '13px', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#150c00', border: 'none', borderRadius: 12, fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
        >
          Continuer vers « Comment ça marche ? » →
        </button>
      </div>
    </div>
  );
}
