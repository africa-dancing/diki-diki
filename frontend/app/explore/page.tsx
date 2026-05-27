'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TickerBand from '../components/TickerBand';
import TranslateWidget from '../components/TranslateWidget';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';
const OR2 = '#FF6B00';

function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

// ── Types ──────────────────────────────────────────────────────────
interface Video {
  id: string; title: string; discipline?: string; storage_url?: string;
  thumbnail_url?: string; views?: number; vote_count?: number;
  track_artist?: string; created_at: string;
  user?: { name?: string; id?: string; country?: string };
}
interface Contest {
  id: string; title: string; discipline: string; status: string;
  ends_at: string; candidates: any[];
}

// ── Constants ──────────────────────────────────────────────────────
const DISC_EMOJI: Record<string,string> = {
  danse:'💃', chant:'🎤', instrument:'🎸', acapella:'🎙️',
  humour:'😂', poesie:'📜', conte:'📖', musique:'🎵', theatre:'🎭',
};
const DISC_FR: Record<string,string> = {
  danse:'Danse', chant:'Chant', instrument:'Instrument', acapella:'A cappella',
  humour:'Humour', poesie:'Poésie', conte:'Conte', musique:'Musique', theatre:'Théâtre',
};
const SORT_OPTIONS = [
  { id:'votes', label:'⭐ Plus votés'  },
  { id:'views', label:'👁 Plus vus'   },
  { id:'new',   label:'🆕 Récents'    },
];
const DISCIPLINES = ['Tous','danse','chant','humour','musique','poesie','instrument','acapella','conte'];

// ── VideoCard ──────────────────────────────────────────────────────
function VideoCard({ v, rank }: { v: Video; rank?: number }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const disc = v.discipline?.toLowerCase() ?? '';
  return (
    <div onClick={() => router.push(`/watch/${v.id}`)}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ cursor:'pointer', borderRadius:16, overflow:'hidden', background:'#111', border:`1.5px solid ${hovered?OR:'#1e1e1e'}`, transform:hovered?'translateY(-4px) scale(1.01)':'none', transition:'all .25s', boxShadow:hovered?`0 12px 32px rgba(255,170,0,0.15)`:undefined, position:'relative' }}>
      {rank && rank <= 3 && (
        <div style={{ position:'absolute', top:8, left:8, zIndex:10, width:26, height:26, borderRadius:'50%', background:rank===1?'#FFD700':rank===2?'#C0C0C0':'#CD7F32', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800 }}>
          {rank===1?'🥇':rank===2?'🥈':'🥉'}
        </div>
      )}
      <div style={{ aspectRatio:'9/16', background:'#0a0a0a', overflow:'hidden', position:'relative' }}>
        {v.storage_url ? (
          <video src={v.storage_url} muted loop playsInline preload="metadata"
            style={{ width:'100%', height:'100%', objectFit:'cover', opacity: hovered?1:0.8, transition:'opacity .3s' }} />
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#1a1a1a', fontSize:40 }}>
            {DISC_EMOJI[disc] ?? '🎬'}
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.9) 0%, transparent 60%)' }}/>
        {v.discipline && (
          <div style={{ position:'absolute', top:8, right:8, background:OR, color:'#000', fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:20, textTransform:'uppercase' as const }}>
            {DISC_FR[disc] ?? v.discipline}
          </div>
        )}
        <div style={{ position:'absolute', bottom:8, left:8, right:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#fff', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
            {v.title || v.track_artist || 'Sans titre'}
          </div>
          <div style={{ display:'flex', gap:8, fontSize:10, color:'rgba(255,255,255,0.5)' }}>
            {v.vote_count ? <span>⭐ {v.vote_count}</span> : null}
            {v.views ? <span>👁 {v.views.toLocaleString('fr-FR')}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ContestCard ────────────────────────────────────────────────────
function ContestCard({ c }: { c: Contest }) {
  const router = useRouter();
  const days = Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86_400_000));
  const disc = c.discipline?.toLowerCase() ?? '';
  const totalVotes = c.candidates.reduce((s: number, cd: any) => s + (cd.votes ?? 0), 0);
  return (
    <div onClick={() => router.push(`/contests`)} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:16, cursor:'pointer', transition:'all .2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(255,170,0,0.4)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(255,255,255,0.08)')}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:22 }}>{DISC_EMOJI[disc] ?? '🏆'}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{c.title}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{DISC_FR[disc] ?? c.discipline}</div>
          </div>
        </div>
        <div style={{ textAlign:'right' as const }}>
          <div style={{ fontSize:10, color:OR, fontWeight:700 }}>⏳ {days}j</div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)' }}>restants</div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
        <span style={{ color:'rgba(255,255,255,0.4)' }}>{c.candidates.length} candidat{c.candidates.length!==1?'s':''}</span>
        <span style={{ color:OR, fontWeight:700 }}>⭐ {totalVotes.toLocaleString('fr-FR')} votes</span>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────
export default function ExplorePage() {
  const router = useRouter();
  const [videos,   setVideos]   = useState<Video[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [disc,     setDisc]     = useState('Tous');
  const [sort,     setSort]     = useState('votes');
  const [token,    setToken]    = useState<string|null>(null);

  useEffect(() => {
    setToken(getToken());
    // Analytics heartbeat
    const sid = Math.random().toString(36).slice(2);
    const ping = () => fetch(`${API}/analytics/heartbeat`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sessionId:sid, page:'/explore', isLoggedIn:!!getToken()}) }).catch(()=>{});
    ping(); const iv = setInterval(ping,30_000); return ()=>clearInterval(iv);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/videos/approved`).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch(`${API}/contests`).then(r=>r.ok?r.json():null).catch(()=>null),
    ]).then(([vData, cData]) => {
      setVideos(Array.isArray(vData)?vData:(vData?.videos??vData?.data??[]));
      const raw = cData?.contests??cData?.data??cData??[];
      setContests(Array.isArray(raw)?raw.filter((c:any)=>c.status==='active'):[]);
    }).finally(()=>setLoading(false));
  }, []);

  // Filtrer + trier
  const filtered = videos
    .filter(v => {
      const matchDisc  = disc==='Tous' || v.discipline?.toLowerCase()===disc;
      const q = search.toLowerCase();
      const matchSearch = !q || (v.title??'').toLowerCase().includes(q) || (v.track_artist??'').toLowerCase().includes(q);
      return matchDisc && matchSearch;
    })
    .sort((a,b) => {
      if (sort==='votes') return (b.vote_count??0)-(a.vote_count??0);
      if (sort==='views') return (b.views??0)-(a.views??0);
      return new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
    });

  const trending = [...videos].sort((a,b)=>(b.vote_count??0)-(a.vote_count??0)).slice(0,6);
  const recent   = [...videos].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,6);

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f0', fontFamily:'DM Sans,sans-serif', paddingBottom:80 }}>

      {/* ── Topbar ── */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(8,8,15,0.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,170,0,0.1)', padding:'0 20px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/home" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.1rem' }}>
            <LogoDikiDiki width={180} />
          </span>
          <span style={{ fontSize:'.42rem', fontWeight:700, color:'#fff', border:'1px solid rgba(255,255,255,.6)', borderRadius:3, padding:'1px 4px', letterSpacing:'.08em' }}>VISION</span>
        </Link>
        <div style={{ flex:1, maxWidth:400, margin:'0 20px' }}>
          <input type="text" placeholder="🔍 Rechercher un talent, un titre…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:50, padding:'8px 16px', fontSize:13, color:'#fff', outline:'none', fontFamily:'DM Sans,sans-serif' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <TranslateWidget />
          {token ? (
            <Link href="/compte">
              <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${OR2},#FFD700)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>👤</div>
            </Link>
          ) : (
            <button onClick={()=>router.push('/auth/login')} style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'7px 16px', fontSize:12, fontWeight:700, color:'#000', cursor:'pointer' }}>Connexion</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 20px' }}>

        {/* ── Hero ── */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,170,0,0.08)', border:'1px solid rgba(255,170,0,0.2)', borderRadius:50, padding:'4px 14px', marginBottom:12 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:OR, display:'inline-block' }}/>
            <span style={{ fontSize:11, color:OR, fontWeight:700, letterSpacing:'.06em' }}>EXPLORE LES TALENTS</span>
          </div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(1.6rem,3vw,2.4rem)', marginBottom:8 }}>
            Découvre les <span style={{ background:`linear-gradient(90deg,${OR},${OR2})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>meilleurs de chaque discipline !</span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>Parcours, soutiens et vote pour tes artistes préférés</p>
        </div>

        {/* ── Filtres ── */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:24, alignItems:'center' }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', flex:1 }}>
            {DISCIPLINES.map(d => (
              <button key={d} onClick={()=>setDisc(d)}
                style={{ padding:'6px 14px', borderRadius:50, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${disc===d?OR:'rgba(255,255,255,0.1)'}`, background:disc===d?'rgba(255,170,0,0.1)':'rgba(255,255,255,0.04)', color:disc===d?OR:'rgba(255,255,255,0.5)' }}>
                {d==='Tous'?'🌍 Tous':`${DISC_EMOJI[d]??'🎬'} ${DISC_FR[d]??d}`}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {SORT_OPTIONS.map(s => (
              <button key={s.id} onClick={()=>setSort(s.id)}
                style={{ padding:'6px 12px', borderRadius:50, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${sort===s.id?OR:'rgba(255,255,255,0.1)'}`, background:sort===s.id?`linear-gradient(135deg,${OR},${OR2})`:'rgba(255,255,255,0.04)', color:sort===s.id?'#000':'rgba(255,255,255,0.5)' }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>⏳ Chargement…</div>
        ) : (
          <>
            {/* ── Tendances ── */}
            {trending.length > 0 && !search && disc==='Tous' && (
              <section style={{ marginBottom:40 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'#fff' }}>🔥 Tendances</h2>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>Vidéos les plus votées</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                  {trending.map((v,i)=><VideoCard key={v.id} v={v} rank={i+1}/>)}
                </div>
              </section>
            )}

            {/* ── Compétitions en vedette ── */}
            {contests.length > 0 && !search && disc==='Tous' && (
              <section style={{ marginBottom:40 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'#fff' }}>🏆 Compétitions en cours</h2>
                  <Link href="/contests" style={{ fontSize:12, color:OR, textDecoration:'none', fontWeight:600 }}>Voir tout →</Link>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                  {contests.slice(0,4).map(c=><ContestCard key={c.id} c={c}/>)}
                </div>
              </section>
            )}

            {/* ── Nouvelles arrivées ── */}
            {recent.length > 0 && !search && disc==='Tous' && (
              <section style={{ marginBottom:40 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'#fff' }}>🆕 Nouvelles arrivées</h2>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>Dernières vidéos approuvées</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                  {recent.map(v=><VideoCard key={v.id} v={v}/>)}
                </div>
              </section>
            )}

            {/* ── Résultats filtrés ── */}
            {(search || disc!=='Tous') && (
              <section>
                <div style={{ marginBottom:16, fontSize:13, color:'rgba(255,255,255,0.4)' }}>
                  {filtered.length} résultat{filtered.length!==1?'s':''}
                  {disc!=='Tous'?` · ${DISC_FR[disc]??disc}`:''}
                  {search?` · "${search}"` : ''}
                </div>
                {filtered.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px 20px' }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
                    <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14 }}>Aucun résultat trouvé</p>
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                    {filtered.map(v=><VideoCard key={v.id} v={v}/>)}
                  </div>
                )}
              </section>
            )}

            {/* ── Toutes les vidéos (défaut sans filtre) ── */}
            {!search && disc==='Tous' && filtered.length > 0 && (
              <section>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                  <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:800, color:'#fff' }}>🎬 Toutes les vidéos</h2>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>{filtered.length} vidéo{filtered.length!==1?'s':''}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                  {filtered.map(v=><VideoCard key={v.id} v={v}/>)}
                </div>
              </section>
            )}

            {/* ── CTA si pas de vidéos ── */}
            {videos.length === 0 && (
              <div style={{ textAlign:'center', padding:'80px 20px' }}>
                <div style={{ fontSize:56, marginBottom:16 }}>🎭</div>
                <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:800, color:'#fff', marginBottom:8 }}>Sois le premier talent !</h2>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginBottom:24 }}>Aucune vidéo n'a encore été approuvée. Soumets la tienne.</p>
                <button onClick={()=>router.push('/submit')} style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'12px 28px', fontSize:14, fontWeight:700, color:'#000', cursor:'pointer' }}>
                  🎬 Soumettre ma vidéo
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Ticker ── */}
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}>
        <TickerBand />
      </div>
    </div>
  );
}
