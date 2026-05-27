'use client';

import { useEffect, useState, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

const DEFAULT_MESSAGES = [
  '📢 Bienvenue sur Diki-Diki Vision — La scène des talents africains en compétition !',
  '💰 Rechargez votre compte pour voter et soutenir vos candidats préférés',
  '🎬 Soumettez votre vidéo et participez aux prochaines compétitions',
  '⭐ Envoyez des étoiles et des cœurs à vos candidats favoris !',
];

export default function TickerBand() {
  const [messages, setMessages] = useState<string[]>(DEFAULT_MESSAGES);
  const trackRef  = useRef<HTMLDivElement>(null);
  const posRef    = useRef(0);
  const rafRef    = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    fetch(`${API}/ticker`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.messages?.length) {
          setMessages(d.messages.map((m: any) => m.message ?? m));
        }
      })
      .catch(() => {});
  }, []);

  // Animation JS — aucun style tag, pas de bug d'hydratation
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const step = () => {
      if (!pausedRef.current) {
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

  const text = messages.join('   ●   ');

  return (
    <div
      style={{ background:'#FF6B00', height:34, display:'flex', alignItems:'center', overflow:'hidden', borderTop:'1px solid rgba(0,0,0,0.15)', flexShrink:0 }}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
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
    </div>
  );
}