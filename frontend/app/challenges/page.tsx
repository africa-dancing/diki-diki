'use client';
import Navbar from '../components/Navbar';
import TickerBand from '../components/TickerBand';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = 'var(--or)';
const GRADS = ['linear-gradient(135deg,#7b2ff7,#f107a3)','linear-gradient(135deg,#f7971e,#ffd200)','linear-gradient(135deg,#11998e,#38ef7d)','linear-gradient(135deg,#fc4a1a,#f7b733)','linear-gradient(135deg,#4568dc,#b06ab3)','linear-gradient(135deg,#e53935,#e35d5b)','linear-gradient(135deg,#00c6ff,#0072ff)','linear-gradient(135deg,#f953c6,#b91d73)'];

interface BracketItem {
  id: string; code: string | null; title: string;
  discipline: string; categorie: string | null; style: string | null;
  status: string; current_round: number; total_cagnotte: number;
  max_participants: number;
  bracket_participants: { count: number }[];
  candidats?: { user_id: string; name: string | null; avatar_url: string | null; video_id: string | null }[];
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  open:               { label: '\u{1F4DD} Inscriptions ouvertes', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  waiting_candidates: { label: '\u{1F4DD} Inscriptions ouvertes', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  in_progress:        { label: '\u2694\uFE0F En cours',          color: OR,        bg: 'rgba(255,170,0,0.1)' },
  active:             { label: '\u2694\uFE0F En cours',          color: OR,        bg: 'rgba(255,170,0,0.1)' },
};

export default function ChallengesListPage() {
  const router = useRouter();
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
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--ink)', fontFamily:'DM Sans,sans-serif', paddingBottom:80 }}>
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

        {/* Rejoindre un appel — Le Mur des appels */}
        <Link href="/challenges/appels" style={{ display:'block', textAlign:'center' as const, background:'var(--surface2)', border:'1px solid var(--or)', color:'var(--or)', fontWeight:800, fontFamily:'Syne,sans-serif', fontSize:15, padding:'13px', borderRadius:14, textDecoration:'none', marginBottom:10 }}>
          {'\u{1F3A7}'} Rejoindre un appel
        </Link>

        {/* Bouton creer un challenge */}
        <Link href="/challenges/creer" style={{ display:'block', textAlign:'center' as const, background:'linear-gradient(135deg,#FF6B00,#FFD700)', color:'#000', fontWeight:800, fontFamily:'Syne,sans-serif', fontSize:15, padding:'14px', borderRadius:14, textDecoration:'none', marginBottom:20 }}>
          {'\u{1F3A4}'} Créer un challenge
        </Link>

        {loading && (
          <div style={{ textAlign:'center' as const, padding:'60px 0', color:'var(--ink-dim)' }}>{'\u23F3'} Chargement{'\u2026'}</div>
        )}

        {!loading && error && (
          <div style={{ textAlign:'center' as const, padding:'60px 0', color:'var(--ink-soft)', fontSize:13 }}>
            {'\u26A0\uFE0F'} Impossible de charger les challenges.<br/>R{'\u00E9'}essaie dans un instant.
          </div>
        )}

        {!loading && !error && brackets.length === 0 && (
          <div style={{ textAlign:'center' as const, padding:'60px 20px', background:'var(--surface)', border:'1px dashed var(--line-strong)', borderRadius:16 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>{'\u{1F3C6}'}</div>
            <div style={{ fontSize:15, fontWeight:700, fontFamily:'Syne,sans-serif', marginBottom:6 }}>Aucun challenge ouvert pour le moment</div>
            <div style={{ fontSize:12, color:'var(--ink-soft)' }}>Reviens bient{'\u00F4'}t, de nouveaux tournois arrivent !</div>
          </div>
        )}

        {!loading && !error && brackets.length > 0 && (
        <div className="dkdk-cards dkdk-challenges-cards">
        {brackets.map(b => {
          const st = STATUS_CFG[b.status] ?? { label: b.status, color: 'var(--ink-soft)', bg: 'var(--surface)' };
          const count = b.bracket_participants?.[0]?.count ?? 0;
          const tags = [b.discipline, b.categorie, b.style].filter(Boolean);
          return (
            <Link key={b.id} href={`/challenges/${b.id}`} style={{ textDecoration:'none', color:'inherit' }}>
              <div style={{ background:'var(--surface)', border:'1px solid rgba(255,170,0,0.2)', borderRadius:16, padding:'16px', marginBottom:12, cursor:'pointer' }}>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                  {/*DKDK_FIX_CODE_UNIQUE \u2014 badge = code genere si lance, sinon le format derive du nombre de candidats*/}
                  <span style={{ fontSize:10, color:OR, fontWeight:700, letterSpacing:'.05em' }}>{b.code ? b.code : ('C' + b.max_participants)}</span>
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:st.bg, color:st.color }}>{st.label}</span>
                </div>

                <div style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800, color:'var(--ink)', marginBottom:8 }}>{b.title}</div>

                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                  {tags.map(t => (
                    <span key={t as string} style={{ fontSize:10, padding:'3px 10px', borderRadius:20, background:'#FF0000', border:'none', color:'#fff', textTransform:'capitalize' as const }}>{t}</span>
                  ))}
                </div>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                  <div style={{ fontSize:11, color:'var(--ink-soft)' }}>
                    {'\u{1F465}'} <strong style={{ color:'var(--ink)' }}>{count}</strong> / {b.max_participants} candidats
                  </div>
                  <div style={{ fontSize:13, fontWeight:800, color:'var(--or)', fontFamily:'Syne,sans-serif' }}>
                    {'\u{1F3C6}'} {Number(b.total_cagnotte).toLocaleString('fr-FR')} F
                  </div>
                </div>

                {(() => {
                  const cands = b.candidats || [];
                  const maxp = b.max_participants || 0;
                  const displayMax = Math.min(maxp, 16);
                  const empty = Math.max(0, displayMax - cands.length);
                  const restantes = Math.max(0, maxp - cands.length);
                  return (
                    <div style={{ marginTop:12 }}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase' as const, color:'var(--ink-soft)', marginBottom:8 }}>Les candidats de ce challenge ({cands.length}/{maxp})</div>
                      <div style={{ display:'flex', flexWrap:'wrap' as const, gap:6 }}>
                        {cands.slice(0,16).map((c, i) => {
                          const initials = (c.name || '').split(' ').map(w => w[0]).filter(Boolean).slice(0,2).join('').toUpperCase() || '\u2605';
                          return (
                            <div key={c.user_id || i} title={c.name || 'Candidat'} style={{ position:'relative' as const, width:34, height:34, borderRadius:'50%', border:'2px solid rgba(255,170,0,0.5)', overflow:'hidden' as const, display:'flex', alignItems:'center', justifyContent:'center', background:GRADS[i % GRADS.length], color:'#fff', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:12 }}>
                              <span>{initials}</span>
                              {c.user_id && <img src={`${API}/users/${c.user_id}/avatar-file`} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position:'absolute' as const, inset:0, width:'100%', height:'100%', objectFit:'cover' as const }} />}
                            </div>
                          );
                        })}
                        {Array.from({ length: empty }).map((_, si) => (
                          <div key={'slot' + si} style={{ width:34, height:34, borderRadius:'50%', border:'2px dashed var(--line)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-dim)', fontSize:16, background:'rgba(255,255,255,0.02)' }}>+</div>
                        ))}
                        {maxp > 16 && (
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(255,170,0,0.16)', color:'var(--or)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:12 }}>+{maxp - 16}</div>
                        )}
                      </div>
                      {restantes > 0 && (
                        <div style={{ fontSize:11, color:'var(--ink-soft)', marginTop:8 }}><b style={{ color:'var(--ink)' }}>{restantes} place{restantes > 1 ? 's' : ''} à prendre</b> — {cands.length === 0 ? 'sois le premier à relever ce défi !' : 'rejoins l’arène avant qu’elle ne soit complète !'}</div>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const vid = (b.candidats || []).map(c => c.video_id).find(Boolean);
                  if (!vid) return null;
                  return (
                    <span role="button" tabIndex={0}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/watch/${vid}`); }}
                      style={{ display:'block', textAlign:'center' as const, marginTop:12, background:'linear-gradient(135deg,#FF6B00,#FFD700)', color:'#000', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:14, padding:'11px', borderRadius:12, cursor:'pointer' }}>
                      {'\u25B6\uFE0F'} LIRE CE CHALLENGE
                    </span>
                  );
                })()}

              </div>
            </Link>
          );
        })}
        </div>
        )}

      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}>
        <TickerBand />
      </div>
    </div>
  );
}