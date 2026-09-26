'use client';

import { useEffect, useState, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

const DEFAULT_MESSAGES: string[] = [];

export default function TickerBand() {
  const [messages, setMessages] = useState<string[]>(DEFAULT_MESSAGES);
  const [paused, setPaused]     = useState(false);   // pause via le bouton (icône)
  const trackRef  = useRef<HTMLDivElement>(null);
  const posRef    = useRef(0);
  const rafRef    = useRef(0);
  const hoverRef  = useRef(false);   // pause au survol souris
  const manualRef = useRef(false);   // pause via le bouton

  useEffect(() => {
    fetch(`${API}/ticker`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data?.length) {
          setMessages(d.data.map((m: any) => m.message ?? m));
        }
      })
      .catch(() => {});
  }, []);

  // Animation JS — aucun style tag, pas de bug d'hydratation
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const step = () => {
      if (!hoverRef.current && !manualRef.current) {
        posRef.current -= 0.6;
        if (Math.abs(posRef.current) >= track.scrollWidth / 2) {
          posRef.current = 0;
        }
        track.style.transform = `translateX(${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [messages]);

  const toggle = () => {
    setPaused(p => { const n = !p; manualRef.current = n; return n; });
  };

  const text = messages.join('   ●   ');

  return (
    <div
      style={{ background:'#FF6B00', height:34, display:'flex', alignItems:'center', overflow:'hidden', borderTop:'1px solid rgba(0,0,0,0.15)', flexShrink:0 }}
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >
      <div style={{ background:'rgba(0,0,0,0.2)', padding:'0 12px', height:'100%', display:'flex', alignItems:'center', flexShrink:0, borderRight:'1px solid rgba(0,0,0,0.15)' }}>
        <span style={{ fontSize:15 }}>📢</span>
      </div>
      <div style={{ flex:1, overflow:'hidden' }}>
        <div
          ref={trackRef}
          style={{ display:'inline-block', whiteSpace:'nowrap', fontSize:13, fontWeight:700, color:'#000', fontFamily:'DM Sans, sans-serif', willChange:'transform' }}
        >
          {`${text}   ●   ${text}   ●   `}
        </div>
      </div>
      <button
        onClick={toggle}
        aria-label={paused ? 'Reprendre le défilement' : 'Mettre en pause le défilement'}
        title={paused ? 'Reprendre' : 'Pause'}
        style={{ flexShrink:0, height:'100%', padding:'0 12px', background:'rgba(0,0,0,0.2)', border:'none', borderLeft:'1px solid rgba(0,0,0,0.15)', color:'#000', fontSize:13, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
      >
        {paused ? '▶' : '⏸'}
      </button>
    </div>
  );
}
