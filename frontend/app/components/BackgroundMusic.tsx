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

  if (!active) return null;

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
          🎵 Musique d'ambiance — vous pouvez la couper ou régler le volume.
          <button onClick={() => setBanner(false)} style={{
            display: 'block', marginTop: 6, marginLeft: 'auto', background: 'rgba(255,255,255,0.2)',
            border: 'none', color: '#fff', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11
          }}>Fermer</button>
        </div>
      )}

      {/* Bouton flottant + mini-panneau */}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9999, fontFamily: 'DM Sans, sans-serif' }}>
        {open && (
          <div style={{
            position: 'absolute', bottom: 56, right: 0, width: 180,
            background: '#0a0a0f', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 12,
            padding: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
          }}>
            <div style={{ fontSize: 11, color: '#FFAA00', fontWeight: 700, marginBottom: 8 }}>MUSIQUE D'AMBIANCE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12 }}>🔉</span>
              <input type="range" min={0} max={1} step={0.05} value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#7e0380' }} /> /*DKDK_MUSIC_MAGENTA*/
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
        <button onClick={() => setOpen(o => !o)} aria-label="Musique d'ambiance" style={{
          width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: playing ? 'linear-gradient(135deg,#FF6B00,#FFAA00)' : '#0a0a0f',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)', fontSize: 20, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          🎵
        </button>
      </div>
    </>
  );
}