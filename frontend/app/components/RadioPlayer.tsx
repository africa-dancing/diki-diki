'use client';
// frontend/app/components/RadioPlayer.tsx
// DKDK_RADIO — Lecteur continu (radio) pour la Médiathèque.
// S'appuie sur le lecteur YouTube officiel (API IFrame) : c'est YouTube qui diffuse
// et gère les droits -> aucun fichier audio hébergé, aucune nouvelle licence.
// Modes : lecture continue (auto-enchaînement) + aléatoire + répéter tout + répéter le morceau.
// Limite connue : lecteur vidéo visible (règle YouTube) ; sur mobile la lecture s'arrête
// si l'écran se verrouille / l'onglet passe en arrière-plan.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

export type RadioTrack = { id: string; titre: string; artiste?: string; ytId: string; cover_url?: string | null };

let _ytApiPromise: Promise<any> | null = null;
function loadYTApi(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('ssr'));
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (_ytApiPromise) return _ytApiPromise;
  _ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { if (typeof prev === 'function') { try { prev(); } catch { /*noop*/ } } resolve(w.YT); };
    if (!document.getElementById('dkdk-yt-api')) {
      const s = document.createElement('script');
      s.id = 'dkdk-yt-api';
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  });
  return _ytApiPromise;
}

const OR = '#FFAA00';
const btn = (on = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  border: on ? `1px solid ${OR}` : '1px solid var(--line)', background: on ? 'rgba(255,170,0,0.15)' : 'var(--surface)',
  color: on ? OR : 'var(--ink)', borderRadius: 10, padding: '8px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
});

export default function RadioPlayer({ playlist }: { playlist: RadioTrack[] }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [curId, setCurId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'all' | 'one'>('all');

  // Ordre de lecture : indices de la playlist (mélangés si "aléatoire").
  const order = useMemo(() => {
    const idxs = playlist.map((_, i) => i);
    if (!shuffle) return idxs;
    for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
    return idxs;
  }, [playlist, shuffle]);

  const curPos = useMemo(() => {
    if (!curId) return -1;
    return order.findIndex(i => playlist[i]?.id === curId);
  }, [order, curId, playlist]);

  const playId = useCallback((id: string) => {
    const t = playlist.find(p => p.id === id); if (!t) return;
    setCurId(id);
    const p = playerRef.current;
    if (p && p.loadVideoById) { try { p.loadVideoById(t.ytId); setPlaying(true); try { window.dispatchEvent(new Event('dkdk-radio-play')); } catch { /*noop*/ } } catch { /*noop*/ } }
  }, [playlist]);

  const playAt = useCallback((pos: number) => {
    if (order.length === 0) return;
    const wrapped = ((pos % order.length) + order.length) % order.length;
    const t = playlist[order[wrapped]];
    if (t) playId(t.id);
  }, [order, playlist, playId]);

  // Avance en fin de morceau, selon le mode. Via une ref pour rester à jour dans les callbacks YouTube.
  const advanceRef = useRef<() => void>(() => { /*noop*/ });
  advanceRef.current = () => {
    if (repeat === 'one' && curId) { playId(curId); return; }
    if (curPos < 0) { playAt(0); return; }
    const nextPos = curPos + 1;
    if (nextPos >= order.length) { if (repeat === 'all') playAt(0); else setPlaying(false); }
    else playAt(nextPos);
  };

  useEffect(() => {
    let cancelled = false;
    loadYTApi().then((YT) => {
      if (cancelled || !holderRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(holderRef.current, {
        height: '100%', width: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: any) => {
            if (e.data === 1) setPlaying(true);
            else if (e.data === 2) setPlaying(false);
            else if (e.data === 0) advanceRef.current();
          },
          onError: () => { advanceRef.current(); },
        },
      });
    }).catch(() => { /*noop*/ });
    return () => { cancelled = true; };
  }, []);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!curId) { playAt(0); return; }
    if (!p) return;
    if (playing) { try { p.pauseVideo?.(); } catch { /*noop*/ } } else { try { p.playVideo?.(); } catch { /*noop*/ } }
  };
  const next = () => (curPos < 0 ? playAt(0) : playAt(curPos + 1));
  const prev = () => (curPos < 0 ? playAt(0) : playAt(curPos - 1));
  const cycleRepeat = () => setRepeat(r => (r === 'none' ? 'all' : r === 'all' ? 'one' : 'none'));

  const cur = curId ? playlist.find(p => p.id === curId) : null;
  const repeatLabel = repeat === 'one' ? '🔂 Le morceau' : repeat === 'all' ? '🔁 Toute la liste' : '🔁 Sans répétition';
  const vide = playlist.length === 0;

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${OR}`, borderRadius: 16, padding: 14, marginBottom: 18, boxShadow: '0 0 18px -6px rgba(255,170,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>📻</span>
        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--ink)' }}>Radio Diki-Diki</span>
        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginLeft: 'auto' }}>{vide ? 'aucun morceau lisible' : `${playlist.length} morceaux`}</span>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Lecteur vidéo YouTube (doit rester visible — règle YouTube) */}
        <div style={{ width: 150, maxWidth: '40vw', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', background: '#000', flexShrink: 0 }}>
          <div ref={holderRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Infos + contrôles */}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'Syne,sans-serif', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cur ? cur.titre : (vide ? '—' : 'Prêt à diffuser')}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cur ? (cur.artiste || '') : 'Appuie sur ▶ pour lancer la lecture continue'}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={prev} disabled={vide || !ready} style={btn()} title="Précédent">⏮</button>
            <button onClick={togglePlay} disabled={vide || !ready} style={{ ...btn(), background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', border: 'none', padding: '8px 14px' }} title={playing ? 'Pause' : 'Lecture'}>{playing ? '⏸' : '▶'}</button>
            <button onClick={next} disabled={vide || !ready} style={btn()} title="Suivant">⏭</button>
            <button onClick={() => setShuffle(s => !s)} style={btn(shuffle)} title="Lecture aléatoire">🔀 Aléatoire</button>
            <button onClick={cycleRepeat} style={btn(repeat !== 'none')} title="Mode de répétition">{repeatLabel}</button>
          </div>
        </div>
      </div>
      {!ready && !vide && <div style={{ fontSize: 11.5, color: 'var(--ink-dim)', marginTop: 8 }}>Chargement du lecteur…</div>}
    </div>
  );
}
