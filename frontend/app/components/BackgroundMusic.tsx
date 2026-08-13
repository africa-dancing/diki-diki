'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1'; /*DKDK_MUSIC_SETTINGS*/

export default function BackgroundMusic() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tabVisible, setTabVisible] = useState(true); /*DKDK_TABVIS_FIX*/
  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const [audioUrl, setAudioUrl] = useState('/ambiance.mp3');
  const [active, setActive] = useState(true);
  const [pagesExclues, setPagesExclues] = useState<string[]>([]);

  const [muted, setMuted]       = useState(false);   // coupé par l'utilisateur
  const [playing, setPlaying]   = useState(false);   // en lecture
  const [volume, setVolume]     = useState(0.4);     // 0..1
  const [open, setOpen]         = useState(false);   // mini-panneau ouvert
  const [banner, setBanner]     = useState(false);   // bandeau visible
  const [videoActive, setVideoActive] = useState(false); // une vidéo joue

  // Position déplaçable du bouton, mémorisée par visiteur /*DKDK_MUSIC_DRAG*/
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef({ on: false, moved: false, offX: 0, offY: 0, sx: 0, sy: 0 });
  const BTN = 44;

  const bannerCount = useRef(0);
  const startedOnce = useRef(false);
  const mutedRef = useRef(false); /*DKDK_MUTEDREF_FIX*/
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Page silencieuse ? (liste pilotée par settings à l'étape 2)
  const pageSilencieuse = pagesExclues.some(p => pathname?.startsWith(p));

  // Restaure volume + état coupé (mémorisés)
  useEffect(() => {
    try {
      const v = localStorage.getItem('dkdk_music_vol');
      const m = localStorage.getItem('dkdk_music_muted');
      if (v !== null) setVolume(Number(v));
      if (m === '1') setMuted(true);
    } catch {}
  }, []);

  // Restaure la position mémorisée du bouton
  useEffect(() => {
    try {
      const p = localStorage.getItem('dkdk_music_pos');
      if (p) {
        const o = JSON.parse(p);
        if (typeof o?.x === 'number' && typeof o?.y === 'number') setPos(o);
      }
    } catch {}
  }, []);

  // Mémorise la position du bouton
  useEffect(() => {
    if (pos) { try { localStorage.setItem('dkdk_music_pos', JSON.stringify(pos)); } catch {} }
  }, [pos]);

  // Charge la config musique depuis settings (pilote par /admin)
  useEffect(() => {
    fetch(`${API}/settings`)
      .then(r => r.json())
      .then(res => {
        const rows = res?.data || [];
        const url = rows.find((s: any) => s.key === 'ambiance_audio_url');
        const act = rows.find((s: any) => s.key === 'ambiance_active');
        const exc = rows.find((s: any) => s.key === 'ambiance_pages_exclues');
        if (url?.value) setAudioUrl(url.value);
        if (act) setActive(act.value === '1' || act.value === 'true');
        if (exc?.value) setPagesExclues(String(exc.value).split(',').map((p: string) => p.trim()).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  // Applique le volume à l'élément audio
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    try { localStorage.setItem('dkdk_music_vol', String(volume)); } catch {}
  }, [volume]);

  // Mémorise l'état coupé
  useEffect(() => {
    try { localStorage.setItem('dkdk_music_muted', muted ? '1' : '0'); } catch {}
  }, [muted]);

  // Démarrage au premier clic de l'utilisateur (exigence navigateur)
  useEffect(() => {
    const tryStart = () => {
      if (startedOnce.current) return;
      startedOnce.current = true;
      attemptPlay();
      window.removeEventListener('click', tryStart);
    };
    window.addEventListener('click', tryStart);
    return () => window.removeEventListener('click', tryStart);
  }, []);

  // Bandeau : 3 apparitions (T0, +30min, +1h), réinitialisé par visite
  useEffect(() => {
    const show = () => {
      bannerCount.current += 1;
      setBanner(true);
    };
    const t0 = setTimeout(show, 1500);              // ~immédiat
    const t1 = setTimeout(show, 30 * 60 * 1000);    // +30 min
    const t2 = setTimeout(show, 60 * 60 * 1000);    // +1 h
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Coupure auto quand une vidéo joue (écoute globale play/pause)
  useEffect(() => {
    const onPlay = (e: Event) => {
      /*DKDK_COUPURE_WATCH*/ // ne couper que sur la vraie page de visionnage
      if (!pathname?.startsWith('/watch')) return;
      if ((e.target as HTMLElement)?.tagName === 'VIDEO') setVideoActive(true);
    };
    const onPause = (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === 'VIDEO') setVideoActive(false);
    };
    document.addEventListener('play', onPlay, true);
    document.addEventListener('pause', onPause, true);
    document.addEventListener('ended', onPause, true);
    return () => {
      document.removeEventListener('play', onPlay, true);
      document.removeEventListener('pause', onPause, true);
      document.removeEventListener('ended', onPause, true);
    };
  }, [pathname]);

  // Décide si la musique doit jouer ou non
  useEffect(() => {
    const shouldPlay = !muted && !pageSilencieuse && !videoActive && tabVisible;
    if (shouldPlay) attemptPlay();
    else pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, pageSilencieuse, videoActive, tabVisible]);

  const attemptPlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (mutedRef.current) { a.pause(); setPlaying(false); return; } /*DKDK_MUTEDREF_GUARD*/
    a.volume = volume;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const pause = () => {
    const a = audioRef.current;
    if (a) { a.pause(); setPlaying(false); }
  };

  const togglePlay = () => {
    if (playing) { setMuted(true); }
    else { setMuted(false); attemptPlay(); }
  };

  // ── Glisser-déposer du bouton (le visiteur le place où il veut) ──────────
  const onDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    drag.current = { on: true, moved: false, offX: e.clientX - r.left, offY: e.clientY - r.top, sx: e.clientX, sy: e.clientY };
    try { el.setPointerCapture(e.pointerId); } catch {}
  };
  const onDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.on) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return; // seuil : évite de bouger sur un simple clic
    d.moved = true;
    let nx = e.clientX - d.offX;
    let ny = e.clientY - d.offY;
    nx = Math.max(4, Math.min(window.innerWidth  - BTN - 4, nx));
    ny = Math.max(4, Math.min(window.innerHeight - BTN - 4, ny));
    setPos({ x: nx, y: ny });
  };
  const onDragEnd = () => { drag.current.on = false; };

  const onButtonClick = () => {
    if (drag.current.moved) { drag.current.moved = false; return; } // c'était un déplacement, pas un clic
    setOpen(o => !o);
  };

  if (!active) return null;

  // Placement du mini-panneau selon la position du bouton (pour ne jamais sortir de l'écran)
  const openUp   = pos ? pos.y > (typeof window !== 'undefined' ? window.innerHeight / 2 : 400) : true;
  const alignRight = pos ? pos.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 400) : true;
  const panelPos: React.CSSProperties = {
    position: 'absolute',
    width: 180,
    ...(openUp ? { bottom: 56 } : { top: 56 }),
    ...(alignRight ? { right: 0 } : { left: 0 }),
  };

  return (
    <>
      <audio ref={audioRef} src={audioUrl} loop preload="auto" />

      {/* Bandeau d'avertissement */}
      {banner && (
        <div style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 9999,
          background: 'linear-gradient(135deg,rgba(126,3,128,0.92),rgb(237,7,15))',
          color: '#fff', padding: '10px 14px', borderRadius: 12, maxWidth: 260,
          fontSize: 12, fontFamily: 'DM Sans, sans-serif', boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}>
          🎵 Musique d'ambiance — vous pouvez la couper, régler le volume, ou déplacer le bouton en le faisant glisser.
          <button onClick={() => setBanner(false)} style={{
            display: 'block', marginTop: 6, marginLeft: 'auto', background: 'rgba(255,255,255,0.2)',
            border: 'none', color: '#fff', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11
          }}>Fermer</button>
        </div>
      )}

      {/* Bouton flottant (déplaçable) + mini-panneau */}
      <div style={{
        position: 'fixed', zIndex: 9999, fontFamily: 'DM Sans, sans-serif',
        ...(pos ? { left: pos.x, top: pos.y } : { bottom: 16, right: 16 })
      }}>
        {open && (
          <div style={{
            ...panelPos,
            background: '#0a0a0f', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 12,
            padding: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
          }}>
            <div style={{ fontSize: 11, color: '#FFAA00', fontWeight: 700, marginBottom: 8 }}>MUSIQUE D'AMBIANCE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12 }}>🔉</span>
              <input type="range" min={0} max={1} step={0.05} value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#7e0380' }} />
            </div>
            <button onClick={togglePlay} style={{
              width: '100%', padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: playing ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#7e0380,#ed070f)',
              color: '#fff', fontSize: 12, fontWeight: 700
            }}>
              {playing ? '⏸ Mettre en pause' : '▶ Lancer la musique'}
            </button>
          </div>
        )}
        <button
          onClick={onButtonClick}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          aria-label="Musique d'ambiance (glisser pour déplacer)"
          title="Cliquer pour ouvrir · glisser pour déplacer"
          style={{
            width: BTN, height: BTN, borderRadius: '50%', border: 'none', cursor: 'grab',
            touchAction: 'none', userSelect: 'none',
            background: playing ? 'linear-gradient(135deg,#FF6B00,#FFAA00)' : '#0a0a0f',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)', fontSize: 20, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          🎵
        </button>
      </div>
    </>
  );
}
