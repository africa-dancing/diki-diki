'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CountrySelector, { Country } from '../components/CountrySelector';
import TickerBand from '../components/TickerBand';
import TranslateWidget from '../components/TranslateWidget';
import './home.css';
import LogoDikiDiki from '../components/LogoDikiDiki';

// ✅ Étoile rouge — identique au logo
const StarRed = () => <span style={{ color: '#FF0000' }}>★</span>;

interface Video {
  id: string; title: string; description?: string; storage_url?: string;
  discipline?: string; track_title?: string; track_artist?: string; track_genre?: string;
  views?: number; vote_count?: number; created_at: string;
  user?: { name?: string; id?: string };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

const NAV_LINKS = [
  { href: '/education', label: 'Éducation & Savoirs' },
  { href: '/auth/register', label: "S'inscrire" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Danse: '#FF6B00', Chant: '#f90505', Musique: '#06B6D4', Comédie: '#22C55E',
  Poésie: '#F59E0B', Mode: '#EC4899', Sport: '#EF4444', default: '#6B7280',
};
function badgeColor(discipline?: string) {
  return CATEGORY_COLORS[discipline ?? ''] ?? CATEGORY_COLORS.default;
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
      style={{ cursor:'pointer', borderRadius:'16px', overflow:'hidden', background:'#141414',
        border: hovered ? '1.5px solid #FF6B00' : '1.5px solid #222',
        transform: hovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
        transition:'all 0.28s cubic-bezier(.4,0,.2,1)', animationDelay:`${index*60}ms`,
        animation:'fadeUp 0.5s ease both',
        boxShadow: hovered ? '0 16px 40px rgba(255,107,0,0.18)' : '0 2px 12px rgba(0,0,0,0.4)' }}>
      <div style={{ position:'relative', aspectRatio:'9/16', background:'#0a0a0a', overflow:'hidden' }}>
        {video.storage_url ? (
          <video ref={videoRef} src={video.storage_url} muted loop playsInline preload="metadata"
            style={{ width:'100%', height:'100%', objectFit:'cover', opacity:hovered?1:0.85, transition:'opacity 0.3s' }}/>
        ) : (
          <div style={{ width:'100%', height:'100%', background:'linear-gradient(135deg,#1a1a1a,#2a2a2a)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:'2.5rem', opacity:0.3 }}>🎬</span>
          </div>
        )}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'50%', background:'linear-gradient(to top,rgba(0,0,0,0.95),transparent)' }}/>
        {video.discipline && (
          <div style={{ position:'absolute', top:10, left:10, background:badgeColor(video.discipline), color:'#fff', fontSize:'0.62rem', fontWeight:700, padding:'3px 8px', borderRadius:'20px', letterSpacing:'0.05em', textTransform:'uppercase' }}>
            {video.discipline}
          </div>
        )}
        <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)', color:'#ccc', fontSize:'0.65rem', padding:'3px 7px', borderRadius:'12px', display:'flex', alignItems:'center', gap:'4px' }}>
          👁 {(video.views??0).toLocaleString('fr-FR')}
        </div>
        {/* ✅ ⭐ → ★ rouge */}
        {(video.vote_count??0) > 0 && (
          <div style={{ position:'absolute', bottom:10, right:10, color:'#FF6B00', fontSize:'0.75rem', fontWeight:700, display:'flex', alignItems:'center', gap:'3px' }}>
            <StarRed /> {video.vote_count}
          </div>
        )}
      </div>
      <div style={{ padding:'12px 14px 14px' }}>
        <p style={{ margin:0, fontWeight:700, fontSize:'0.88rem', color:'#f0f0f0', lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {video.title || video.track_title || 'Sans titre'}
        </p>
        {video.track_artist && <p style={{ margin:'3px 0 0', fontSize:'0.75rem', color:'#888' }}>{video.track_artist}</p>}
        {video.user?.name && <p style={{ margin:'6px 0 0', fontSize:'0.7rem', color:'#555' }}>par {video.user.name}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ borderRadius:'16px', overflow:'hidden', background:'#141414', border:'1.5px solid #1e1e1e' }}>
      <div style={{ aspectRatio:'9/16', background:'linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }}/>
      <div style={{ padding:'12px 14px 14px' }}>
        <div style={{ height:14, width:'70%', background:'#222', borderRadius:4, marginBottom:8, animation:'shimmer 1.4s infinite' }}/>
        <div style={{ height:11, width:'45%', background:'#1a1a1a', borderRadius:4, animation:'shimmer 1.4s infinite' }}/>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [videos, setVideos]   = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [filter, setFilter]   = useState('Tous');
  const [search, setSearch]   = useState('');
  const [token, setToken]     = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRegles, setShowRegles] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('dkdk_token');
    setToken(t);
    if (t) { try { const p = JSON.parse(atob(t.split('.')[1])); setIsAdmin(p.role==='admin'); } catch {} }
    const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const ping = () => fetch('http://localhost:4000/v1/analytics/heartbeat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ sessionId, page:'/home', isLoggedIn:!!localStorage.getItem('dkdk_token') }),
    }).catch(()=>{});
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

  const disciplines = ['Tous', ...Array.from(new Set(videos.map(v => v.discipline).filter(Boolean) as string[]))];
  const filtered = videos.filter(v => {
    const matchDiscipline = filter==='Tous' || v.discipline===filter;
    const matchCountry = !selectedCountry || (v.user as any)?.country===selectedCountry.code;
    const q = search.toLowerCase();
    const matchSearch = !q || (v.title??'').toLowerCase().includes(q) || (v.track_artist??'').toLowerCase().includes(q) || (v.user?.name??'').toLowerCase().includes(q);
    return matchDiscipline && matchSearch && matchCountry;
  });

  return (
    <>
      {/* ── Navigation ── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgb(6,0,0)', backdropFilter:'blur(16px)', borderBottom:'1px solid #fcfafa', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/home" style={{ textDecoration:'none', flexShrink:0 }}>
          <LogoDikiDiki width={200} />
        </Link>
        <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', display:'flex', alignItems:'center', gap:4 }}>
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} style={{ background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'7px 16px', fontSize:'0.82rem', fontWeight:700, color:'#000', textDecoration:'none', cursor:'pointer' }}>
              {l.label}
            </Link>
          ))}
          <button onClick={() => setShowRegles(true)} style={{ background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', cursor:'pointer', fontFamily:'DM Sans,sans-serif', fontSize:'0.82rem', fontWeight:700, color:'#000', padding:'7px 16px', borderRadius:50 }}>
            ❓ Comment ça marche
          </button>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
          <TranslateWidget />
          {isAdmin && (
            <Link href="/admin/moderation" style={{ background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'7px 16px', fontSize:'0.82rem', fontWeight:700, color:'#000', textDecoration:'none', cursor:'pointer' }}>
              ⚙️ Admin
            </Link>
          )}
          {token ? (
            <Link href="/compte">
              <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B00,#FFD700)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', cursor:'pointer' }}>👤</div>
            </Link>
          ) : (
            <button onClick={() => router.push('/auth/login')} style={{ background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'7px 16px', fontSize:'0.82rem', fontWeight:700, color:'#000', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
              Connexion
            </button>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ padding:'20px 24px 12px', background:'radial-gradient(ellipse 80% 60% at 50% -10%,rgb(247, 6, 6) 0%,transparent 70%)', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,170,0,0.1)', border:'1px solid rgba(255,170,0,0.3)', borderRadius:50, padding:'5px 14px', marginBottom:10 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'#FFAA00', animation:'pulse-dot 1.5s ease-in-out infinite', display:'inline-block' }}/>
          <span style={{ fontSize:'0.72rem', color:'#FFAA00', fontWeight:700, letterSpacing:'0.06em' }}>COMPÉTITIONS EN COURS</span>
        </div>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(1.8rem,4vw,3rem)', lineHeight:1.1, marginBottom:6, whiteSpace:'nowrap', background:'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Votez pour vos candidats{' '}
          <span style={{ background:'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>préférés</span>
        </h1>
        <p style={{ color:'#FFAA00', fontSize:'0.95rem', fontWeight:600, maxWidth:460, margin:'0 auto' }}>
        </p>
      </div>

      {/* ── Éducation & Savoirs ── */}
      <div style={{ margin:'8px 24px 4px', borderRadius:20, background:'linear-gradient(135deg,rgba(9, 0, 0, 0),rgba(11, 0, 11, 0))', border:'1px solid rgba(11, 0, 0, 0.19)', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:46, height:46, borderRadius:14, background:'rgba(255,170,0,0.1)', border:'1px solid rgb(6, 4, 0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0 }}>📚</div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
              <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'#fb0404' }}>Éducation & Savoirs</span>
              <span style={{ background:'rgb(251, 248, 248)', border:'1px solid rgba(6, 4, 0, 0.47)', color:'#ff0000', fontSize:'0.5rem', fontWeight:700, padding:'2px 7px', borderRadius:20, letterSpacing:'0.06em' }}>GRATUIT</span>
            </div>
            <div style={{ fontSize:'0.85rem', color:'rgb(12, 12, 12)', lineHeight:1.4, marginBottom:6 }}>
              Explorez les 21 matières sans inscription sur la plateforme accessibles au public et 100% gratuites...  
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          {!token && (
            <span style={{ fontSize:'0.62rem', color:'rgba(255,170,0,0.6)', fontWeight:600, textAlign:'right', lineHeight:1.4 }}>
              Inscris-toi pour<br/>publier du contenu
            </span>
          )}
          <Link href="/education" style={{ background:'linear-gradient(135deg,#FF0000,#FF0000)', border:'none', borderRadius:50, padding:'8px 18px', fontSize:'0.82rem', fontWeight:700, color:'#f6f4f4', textDecoration:'none', display:'inline-block', whiteSpace:'nowrap' }}>
            Explorer →
          </Link>
        </div>
      </div>

      {/* ── Filtres + Recherche ── */}
      <div style={{ padding:'8px 24px', display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {disciplines.map(d => (
            <button key={d} className="pill" onClick={() => setFilter(d)}
              style={{ background:filter===d?'#FF6B00':'#060000', color:filter===d?'#fff':'#888', border:filter===d?'none':'1px solid #2a2a2a' }}>
              {d}
            </button>
          ))}
          <CountrySelector selected={selectedCountry} onSelect={setSelectedCountry} />
        </div>
        <div style={{ position:'relative' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="search-input" type="text" placeholder="Candidat, titre..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ── Contenu ── */}
      <div style={{ padding:'0 24px 60px' }}>
        {!loading && !error && (
          <p style={{ color:'#444', fontSize:'0.78rem', marginBottom:16 }}>
            {filtered.length} vidéo{filtered.length!==1?'s':''}
            {filter!=='Tous'?` · ${filter}`:''}
            {selectedCountry?` · ${selectedCountry.name}`:''}
            {search?` · "${search}"`:''}
          </p>
        )}
        {loading && <div className="video-grid">{Array.from({length:12}).map((_,i)=><SkeletonCard key={i}/>)}</div>}
        {error && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#555' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:16 }}>⚠️</div>
            <p style={{ fontWeight:600, color:'#888', marginBottom:8 }}>Impossible de charger les vidéos</p>
            <p style={{ fontSize:'0.8rem', color:'#444', marginBottom:20 }}>{error}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>Réessayer</button>
          </div>
        )}
        {!loading && !error && filtered.length===0 && (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#555' }}>
            <div style={{ fontSize:'3rem', marginBottom:16 }}>🎬</div>
            <p style={{ fontWeight:600, color:'#888', marginBottom:8 }}>{videos.length===0?'Aucune vidéo disponible':'Aucun résultat'}</p>
            <p style={{ fontSize:'0.8rem', color:'#444' }}>{videos.length===0?'Les premières vidéos approuvées apparaîtront ici.':'Essayez un autre filtre ou effacez la recherche.'}</p>
            {videos.length===0 && <button className="btn-primary" style={{ marginTop:20 }} onClick={() => router.push('/submit')}>Être le premier à soumettre</button>}
          </div>
        )}
        {!loading && !error && filtered.length>0 && (
          <div className="video-grid">{filtered.map((v,i) => <VideoCard key={v.id} video={v} index={i}/>)}</div>
        )}
      </div>

      {/* ── Ticker ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}><TickerBand /></div>

      {/* ── Modal "Comment ça marche" ── */}
      {showRegles && (
        <div onClick={() => setShowRegles(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#12121e', border:'1px solid rgba(255,170,0,0.25)', borderRadius:20, width:'100%', maxWidth:540, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' }}>

            <div style={{ background:'linear-gradient(135deg,rgba(255,170,0,0.1),rgba(255,107,0,0.06))', borderBottom:'1px solid rgba(255,170,0,0.15)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div>
                <div style={{ fontSize:9, color:'#FFAA00', fontWeight:700, letterSpacing:'.1em', marginBottom:3 }}>COMMENT ÇA MARCHE</div>
                <div style={{ fontSize:18, fontWeight:800, color:'#fff', fontFamily:'Syne,sans-serif' }}>
                  Principes d&apos;utilisation <span style={{ color:'#FFAA00' }}>Diki-Diki</span>
                </div>
              </div>
              <button onClick={() => setShowRegles(false)} style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>

            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10, overflowY:'auto' }}>

              {/* Étoiles et Cœurs */}
              <div style={{ background:'rgba(255,170,0,0.04)', border:'1px solid rgba(255,170,0,0.2)', borderRadius:14, padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,170,0,0.12)', border:'1px solid rgba(255,170,0,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                  <StarRed />
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#FFAA00', marginBottom:4 }}>Étoiles <StarRed /> et Cœurs ❤️</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.6, marginBottom:8 }}>
                    La recharge crédite des <strong style={{ color:'#FFAA00' }}>unités</strong> sur ton Compte Soutenir.
                    Chaque unité vaut <strong style={{ color:'#FFAA00' }}>10 F CFA</strong> et peut devenir une <StarRed /> étoile (pour voter) ou un ❤️ cœur (pour liker) — tu répartis librement.
                  </div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const }}>
                    <span style={{ background:'rgba(255,170,0,0.1)', border:'1px solid rgba(255,170,0,0.25)', color:'#FFAA00', borderRadius:20, padding:'3px 10px', fontSize:12 }}><StarRed /> 1 étoile = 1 unité = 10 F</span>
                    <span style={{ background:'rgba(255,80,80,0.1)', border:'1px solid rgba(255,80,80,0.25)', color:'#ff6b6b', borderRadius:20, padding:'3px 10px', fontSize:12 }}>❤️ 1 cœur = 1 unité = 10 F</span>
                  </div>
                </div>
              </div>

              {/* Publier une vidéo */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,170,0,0.12)', border:'1px solid rgba(255,170,0,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🎬</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:4 }}>Publier une vidéo</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.6 }}>Tout le monde peut soumettre une ou plusieurs vidéos en remplissant un formulaire de soumission.</div>
                </div>
              </div>

              {/* Accès libre */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(100,200,100,0.1)', border:'1px solid rgba(100,200,100,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>👁️</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:4 }}>Accès libre — sans inscription</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.6, marginBottom:8 }}>Regarder · Suivre · Commenter · Remixer · Partager — sans créer de compte.</div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const }}>
                    {['▶ Regarder','🔔 Suivre','💬 Commenter','🔁 Remixer','📤 Partager'].map(t => (
                      <span key={t} style={{ background:'rgba(100,200,100,0.1)', border:'1px solid rgba(100,200,100,0.2)', color:'rgba(100,220,100,0.8)', borderRadius:20, padding:'3px 10px', fontSize:12 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compte requis */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'rgba(100,100,255,0.1)', border:'1px solid rgba(100,100,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🔒</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:4 }}>Compte requis pour</div>
                  <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.6, marginBottom:8 }}>
                    Un compte est obligatoire pour voter (<StarRed />) et liker (❤️). Ces actions utilisent des unités achetées depuis ton Compte Initial.
                  </div>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' as const, marginBottom:10 }}>
                    <span style={{ background:'rgba(100,100,255,0.1)', border:'1px solid rgba(100,100,255,0.2)', color:'rgba(150,150,255,0.8)', borderRadius:20, padding:'3px 10px', fontSize:12 }}>🗳️ Voter (<StarRed /> étoiles)</span>
                    <span style={{ background:'rgba(100,100,255,0.1)', border:'1px solid rgba(100,100,255,0.2)', color:'rgba(150,150,255,0.8)', borderRadius:20, padding:'3px 10px', fontSize:12 }}>❤️ Liker (cœurs)</span>
                  </div>
                  <div style={{ background:'rgba(255,170,0,0.05)', border:'1px solid rgba(255,170,0,0.15)', borderRadius:10, padding:'10px 12px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,170,0,0.9)', marginBottom:6 }}>Système à 2 comptes :</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', lineHeight:1.8 }}>
                      <strong style={{ color:'rgba(255,255,255,0.7)' }}>Compte Initial</strong> — dépôts · retraits · gains reçus en F CFA<br/>
                      <strong style={{ color:'rgba(255,255,255,0.7)' }}>Compte Soutenir</strong> — unités pour voter <StarRed /> et liker ❤️ · pas de retrait<br/>
                      <span style={{ color:'rgba(255,170,0,0.7)' }}>1 unité = 10 F CFA · tu répartis librement entre étoiles et cœurs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Participer */}
              <div style={{ background:'rgba(255,170,0,0.04)', border:'1px solid rgba(255,170,0,0.2)', borderRadius:14, padding:'12px 14px' }}>
                <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,170,0,0.12)', border:'1px solid rgba(255,170,0,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🏆</div>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#FFAA00', marginBottom:4 }}>Participer à une compétition</div>
                    <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.6 }}>4 critères obligatoires avant de compétir :</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column' as const, gap:6 }}>
                  {[
                    { n:'01', icon:'✍️', t:"S'inscrire sur Diki-Diki Vision" },
                    { n:'02', icon:'📋', t:'Remplir le formulaire de candidature' },
                    { n:'03', icon:null, t:'Acheter des unités (étoiles et cœurs)' },
                    { n:'04', icon:'✅', t:"Accepter les conditions d'utilisation" },
                  ].map(c => (
                    <div key={c.n} style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <span style={{ fontSize:11, fontWeight:800, color:'#FFAA00', minWidth:20 }}>{c.n}</span>
                      <span style={{ fontSize:13, color:'rgba(255,255,255,0.7)' }}>
                        {c.icon ? c.icon : <StarRed />} {c.t}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:10, justifyContent:'flex-end', flexShrink:0 }}>
              <button onClick={() => setShowRegles(false)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:50, padding:'8px 18px', fontSize:13, color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>Fermer</button>
              <button onClick={() => { setShowRegles(false); router.push('/auth/register'); }} style={{ background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'8px 20px', fontSize:13, fontWeight:700, color:'#fff', cursor:'pointer' }}>
                S&apos;inscrire gratuitement →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}