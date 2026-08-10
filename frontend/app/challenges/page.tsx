'use client';
import Navbar from '../components/Navbar';
import TickerBand from '../components/TickerBand';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

interface BracketItem {
  id: string; code: string | null; title: string;
  discipline: string; categorie: string | null; style: string | null;
  status: string; current_round: number; total_cagnotte: number;
  max_participants: number;
  bracket_participants: { count: number }[];
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open:               { label: '\u{1F4DD} Inscriptions ouvertes', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  waiting_candidates: { label: '\u{1F4DD} Inscriptions ouvertes', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  in_progress:        { label: '\u2694\uFE0F En cours',          color: OR,        bg: 'rgba(255,170,0,0.1)' },
};

export default function ChallengesListPage() {
  const [brackets, setBrackets] = useState<BracketItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);

  useEffect(() => {
    fetch(`${API}/brackets`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setBrackets(d.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f0', fontFamily:'DM Sans,sans-serif', paddingBottom:80 }}>
      <Navbar />

      {/*DKDK_MAGENTA_HERO — halo magenta colle a la top-bar (comme /challenges/creer)*/}
      <div style={{ background:'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', paddingTop:8 }}>
        <div style={{ maxWidth:700, margin:'0 auto', padding:'24px 16px 4px' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border:'1px solid rgb(10,0,0)', borderRadius:16, padding:'20px', textAlign:'center' as const, boxShadow:'0 8px 40px rgba(225,29,143,0.35)' }}>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:'#fefefe', marginBottom:6 }}>
            Les Challenges
          </h1>
          <div style={{ fontSize:12, color:'#fff', lineHeight:1.6 }}>
            {/*DKDK_BANDEAU*/}Podium Challenges {'\u00B7'} Parcours d{'\u2019'}{'\u00E9'}tapes ({'\u00E9'}limination progressive) ou Bloc group{'\u00E9'} (classement final) {'\u00B7'} 6 formats et 4 niveaux de difficult{'\u00E9'} {'\u00B7'} Toute participation m{'\u00E9'}rite un encouragement
          </div>
        </div>
        </div>
      </div>
      <div style={{ maxWidth:700, margin:'0 auto', padding:'8px 16px 0' }}>

        {/* Bouton creer un challenge */}
        <Link href="/challenges/creer" style={{ display:'block', textAlign:'center' as const, background:'linear-gradient(135deg,#FF6B00,#FFD700)', color:'#000', fontWeight:800, fontFamily:'Syne,sans-serif', fontSize:15, padding:'14px', borderRadius:14, textDecoration:'none', marginBottom:20 }}>
          {'\u{1F3A4}'} Créer un challenge
        </Link>

        {loading && (
          <div style={{ textAlign:'center' as const, padding:'60px 0', color:'rgba(255,255,255,0.3)' }}>{'\u23F3'} Chargement{'\u2026'}</div>
        )}

        {!loading && error && (
          <div style={{ textAlign:'center' as const, padding:'60px 0', color:'rgba(255,255,255,0.4)', fontSize:13 }}>
            {'\u26A0\uFE0F'} Impossible de charger les challenges.<br/>R{'\u00E9'}essaie dans un instant.
          </div>
        )}

        {!loading && !error && brackets.length === 0 && (
          <div style={{ textAlign:'center' as const, padding:'60px 20px', background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.15)', borderRadius:16 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>{'\u{1F3C6}'}</div>
            <div style={{ fontSize:15, fontWeight:700, fontFamily:'Syne,sans-serif', marginBottom:6 }}>Aucun challenge ouvert pour le moment</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Reviens bient{'\u00F4'}t, de nouveaux tournois arrivent !</div>
          </div>
        )}

        {!loading && !error && brackets.map(b => {
          const st = STATUS_CFG[b.status] ?? { label: b.status, color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' };
          const count = b.bracket_participants?.[0]?.count ?? 0;
          const tags = [b.discipline, b.categorie, b.style].filter(Boolean);
          return (
            <Link key={b.id} href={`/challenges/${b.id}`} style={{ textDecoration:'none', color:'inherit' }}>
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,170,0,0.2)', borderRadius:16, padding:'16px', marginBottom:12, cursor:'pointer' }}>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                  {b.code
                    ? <span style={{ fontSize:10, color:OR, fontWeight:700, letterSpacing:'.05em' }}>{b.code}</span>
                    : <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{'\u2014'}</span>}
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:st.bg, color:st.color }}>{st.label}</span>
                </div>

                <div style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800, color:'#fff', marginBottom:8 }}>{b.title}</div>

                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                  {tags.map(t => (
                    <span key={t as string} style={{ fontSize:10, padding:'3px 10px', borderRadius:20, background:'#FF0000', border:'none', color:'#fff', textTransform:'capitalize' as const }}>{t}</span>
                  ))}
                </div>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>
                    {'\u{1F465}'} <strong style={{ color:'#fff' }}>{count}</strong> / {b.max_participants} candidats
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#f7c205', fontFamily:'Syne,sans-serif' }}>
                    {'\u{1F3C6}'} {Number(b.total_cagnotte).toLocaleString('fr-FR')} F
                  </div>
                </div>

              </div>
            </Link>
          );
        })}

      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}>
        <TickerBand />
      </div>
    </div>
  );
}