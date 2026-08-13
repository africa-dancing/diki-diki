'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }
function fmt(n: number) { return n.toLocaleString('fr-FR'); }
function daysLeft(d: string) { return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000)); }

const DISC_EMOJI: Record<string,string> = { danse:'💃',chant:'🎤',humour:'😂',poesie:'📜',conte:'📖',musique:'🎵',instrument:'🎸',acapella:'🎙️' };
const DISC_FR: Record<string,string> = { danse:'Danse',chant:'Chant',humour:'Humour',poesie:'Poésie',conte:'Conte',musique:'Musique',instrument:'Instrument',acapella:'A cappella' };
const DISCIPLINES = Object.keys(DISC_EMOJI);

// ✅ Étoile rouge — identique au logo
const StarRed = () => <span style={{ color: '#FF0000' }}>★</span>;

interface Challenge {
  id: string;
  challenger: { id:string; name:string; stage_name?:string; video_id?:string };
  challenged: { id:string; name:string; stage_name?:string; video_id?:string };
  theme: string; discipline?: string;
  status: 'pending'|'accepted'|'active'|'ended'|'declined';
  ends_at?: string;
  challenger_votes?: number;
  challenged_votes?: number;
  created_at: string;
}

interface UserVideo { id:string; title:string; discipline?:string; }
interface UserSearch { id:string; name:string; stage_name?:string; }

const ST: Record<string,{label:string;color:string;bg:string;border:string}> = {
  pending:  {label:'⏳ En attente',  color:'#FFAA00', bg:'rgba(255,170,0,0.08)',   border:'rgba(255,170,0,0.25)'  },
  accepted: {label:'✓ Accepté',      color:'#4ade80', bg:'rgba(74,222,128,0.08)',  border:'rgba(74,222,128,0.25)' },
  active:   {label:'⚡ En cours',    color:'#60a5fa', bg:'rgba(96,165,250,0.08)',  border:'rgba(96,165,250,0.25)' },
  ended:    {label:'⏹ Terminé',     color:'#f87171', bg:'rgba(248,113,113,0.08)', border:'rgba(248,113,113,0.25)'},
  declined: {label:'✕ Refusé',       color:'rgba(255,255,255,0.3)', bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.1)'},
};

export default function ChallengesPage() {
  const router  = useRouter();
  const OR      = '#FFAA00';
  const loggedIn = !!getToken();

  const [challenges,    setChallenges]    = useState<Challenge[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [message,       setMessage]       = useState('');
  const [msgType,       setMsgType]       = useState<'success'|'error'>('success');
  const [filter,        setFilter]        = useState<'all'|'active'|'ended'|'pending'>('all');

  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<UserSearch[]>([]);
  const [searching,     setSearching]     = useState(false);
  const [challenged,    setChallenged]    = useState<UserSearch | null>(null);
  const [theme,         setTheme]         = useState('');
  const [discipline,    setDiscipline]    = useState('danse');
  const [duration,      setDuration]      = useState(30);
  const [videoChoice,   setVideoChoice]   = useState<'existing'|'new'>('existing');
  const [myVideos,      setMyVideos]      = useState<UserVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState('');

  function showMsg(t:string, type:'success'|'error'='success') {
    setMessage(t); setMsgType(type);
    setTimeout(()=>setMessage(''), 4000);
  }

  useEffect(() => {
    fetch(`${API}/challenges`, { headers: getToken() ? { Authorization:`Bearer ${getToken()}` } : {} })
      .then(r => r.ok ? r.json() : null)
      .then(d => setChallenges(d?.challenges ?? d?.data ?? d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loggedIn || !showForm) return;
    const stored = localStorage.getItem('dkdk_user');
    if (!stored) return;
    try {
      const user = JSON.parse(stored);
      fetch(`${API}/users/${user.id}/videos`, { headers: { Authorization:`Bearer ${getToken()}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => setMyVideos((d?.videos ?? d ?? []).filter((v:any) => v.status === 'approved')))
        .catch(() => {});
    } catch {}
  }, [showForm, loggedIn]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      setSearching(true);
      fetch(`${API}/users/search?q=${encodeURIComponent(searchQuery)}`, { headers: { Authorization:`Bearer ${getToken()}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => setSearchResults(d?.users ?? d ?? []))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  async function launchChallenge() {
    if (!challenged) { showMsg('Choisis un candidat à défier.', 'error'); return; }
    if (!theme.trim()) { showMsg('Décris le thème du défi.', 'error'); return; }
    if (videoChoice === 'existing' && !selectedVideo) { showMsg('Choisis une vidéo existante.', 'error'); return; }
    setSubmitting(true);
    try {
      const body: any = { challenged_id: challenged.id, theme: theme.trim(), discipline, duration_days: duration };
      if (videoChoice === 'existing') body.challenger_video_id = selectedVideo;
      const res = await fetch(`${API}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erreur');
      setChallenges(prev => [data.challenge ?? data, ...prev]);
      setShowForm(false);
      setChallenged(null); setTheme(''); setSelectedVideo('');
      showMsg(`✓ Défi lancé à ${challenged.stage_name ?? challenged.name} !`);
      if (videoChoice === 'new') router.push('/submit');
    } catch (e:any) { showMsg(e.message, 'error'); }
    finally { setSubmitting(false); }
  }

  const handleVote = (videoId?: string) => {
    if (!loggedIn) { router.push('/auth/login'); return; }
    if (videoId) router.push(`/watch/${videoId}`);
  };

  const displayed = challenges.filter(c => filter === 'all' ? true : c.status === filter);

  const inp: React.CSSProperties = { width:'100%', padding:'10px 13px', fontSize:13, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, color:'#fff', fontFamily:'DM Sans,sans-serif', outline:'none', boxSizing:'border-box' as const };
  const lbl: React.CSSProperties = { display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'.5px' };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f0', fontFamily:'DM Sans,sans-serif', paddingBottom:60 }}>

      {/* Topbar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(8,8,15,0.97)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,170,0,0.12)', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/home" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.15rem' }}>
            <span style={{ color:OR }}>Diki</span><span style={{ color:'#fff', margin:'0 3px' }}>-</span><span style={{ color:OR }}>Diki</span>
          </span>
          <span style={{ fontSize:'.48rem', fontWeight:700, color:'#fff', border:'1px solid rgba(255,255,255,.6)', borderRadius:3, padding:'1px 4px', letterSpacing:'.08em' }}>VISION</span>
        </Link>
        <div style={{ display:'flex', gap:10 }}>
          <Link href="/challenges" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:50, padding:'6px 14px', fontSize:12, color:'rgba(255,255,255,0.6)', textDecoration:'none' }}>
            🏆 Compétitions
          </Link>
          {loggedIn && (
            <button onClick={() => setShowForm(!showForm)}
              style={{ background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'6px 16px', fontSize:12, fontWeight:700, color:'#000', cursor:'pointer' }}>
              {showForm ? '✕ Annuler' : '⚡ Lancer un défi'}
            </button>
          )}
          {!loggedIn && (
            <button onClick={() => router.push('/auth/login')}
              style={{ background:'rgba(255,170,0,0.1)', border:'1px solid rgba(255,170,0,0.25)', borderRadius:50, padding:'6px 16px', fontSize:12, fontWeight:700, color:OR, cursor:'pointer' }}>
              🔒 Se connecter pour défier
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth:860, margin:'0 auto', padding:'28px 16px' }}>

        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'clamp(1.6rem,4vw,2.4rem)', color:'#fff', marginBottom:8 }}>
            ⚡ <span style={{ color:OR }}>Challenges</span>
          </h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.4)', maxWidth:480, margin:'0 auto' }}>
            Les candidats se défient entre eux. Le public vote. Le gagnant remporte la cagnotte après prélèvement des commissions (50%).
          </p>
        </div>

        {/* Message */}
        {message && (
          <div style={{ background:msgType==='success'?'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)', border:`1px solid ${msgType==='success'?'rgba(74,222,128,0.25)':'rgba(248,113,113,0.25)'}`, borderRadius:12, padding:'12px 16px', fontSize:13, color:msgType==='success'?'#4ade80':'#f87171', marginBottom:16 }}>
            {message}
          </div>
        )}

        {/* Formulaire */}
        {showForm && loggedIn && (
          <div style={{ background:'rgba(255,170,0,0.04)', border:'1px solid rgba(255,170,0,0.2)', borderRadius:18, padding:'22px', marginBottom:24 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:18 }}>⚡ Lancer un défi</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Candidat à défier *</label>
                {challenged ? (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:12, padding:'10px 14px' }}>
                    <span style={{ fontSize:13, color:'#4ade80', fontWeight:700 }}>✓ {challenged.stage_name ?? challenged.name}</span>
                    <button onClick={() => { setChallenged(null); setSearchQuery(''); }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:16 }}>✕</button>
                  </div>
                ) : (
                  <div style={{ position:'relative' }}>
                    <input style={inp} type="text" placeholder="Rechercher un candidat par son nom…"
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    {searching && <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Recherche…</div>}
                    {searchResults.length > 0 && (
                      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#1a1a2e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, zIndex:50, overflow:'hidden', marginTop:4 }}>
                        {searchResults.map(u => (
                          <button key={u.id} onClick={() => { setChallenged(u); setSearchQuery(''); setSearchResults([]); }}
                            style={{ width:'100%', padding:'10px 14px', background:'none', border:'none', borderBottom:'1px solid rgba(255,255,255,0.05)', color:'#fff', fontSize:13, cursor:'pointer', textAlign:'left', fontFamily:'DM Sans,sans-serif' }}>
                            {u.stage_name ?? u.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Thème du défi *</label>
                <input style={inp} type="text" placeholder="Ex : Reprendre un classique africain en 2 min…"
                  value={theme} onChange={e => setTheme(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Discipline</label>
                <select style={{...inp, cursor:'pointer'}} value={discipline} onChange={e => setDiscipline(e.target.value)}>
                  {DISCIPLINES.map(d => <option key={d} value={d}>{DISC_EMOJI[d]} {DISC_FR[d]}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Durée du vote</label>
                <select style={{...inp, cursor:'pointer'}} value={duration} onChange={e => setDuration(Number(e.target.value))}>
                  {[30,60,90,120,150,180,210,240,270,300,330,360].map(d => <option key={d} value={d}>{d} jours</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Ma prestation pour ce défi</label>
                <div style={{ display:'flex', gap:10, marginBottom:10 }}>
                  {[{ key:'existing', label:'Utiliser une vidéo existante' },{ key:'new', label:'Soumettre une nouvelle vidéo' }].map(opt => (
                    <button key={opt.key} onClick={() => setVideoChoice(opt.key as any)}
                      style={{ flex:1, padding:'9px', fontSize:12, fontWeight:600, borderRadius:10, cursor:'pointer', border:`1px solid ${videoChoice===opt.key?OR:'rgba(255,255,255,0.1)'}`, background:videoChoice===opt.key?'rgba(255,170,0,0.1)':'transparent', color:videoChoice===opt.key?OR:'rgba(255,255,255,0.4)', fontFamily:'DM Sans,sans-serif' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {videoChoice === 'existing' && (
                  myVideos.length > 0 ? (
                    <select style={{...inp, cursor:'pointer'}} value={selectedVideo} onChange={e => setSelectedVideo(e.target.value)}>
                      <option value="">-- Choisir une vidéo --</option>
                      {myVideos.map(v => <option key={v.id} value={v.id}>{DISC_EMOJI[v.discipline??'']??'🎬'} {v.title}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', padding:'10px', background:'rgba(255,255,255,0.03)', borderRadius:10 }}>
                      Aucune vidéo approuvée. Soumets d'abord une vidéo ou choisis "Nouvelle vidéo".
                    </div>
                  )
                )}
                {videoChoice === 'new' && (
                  <div style={{ fontSize:12, color:'rgba(255,170,0,0.7)', padding:'10px', background:'rgba(255,170,0,0.04)', border:'1px solid rgba(255,170,0,0.15)', borderRadius:10 }}>
                    ℹ️ Tu seras redirigé vers le formulaire de soumission après avoir lancé le défi.
                  </div>
                )}
              </div>
            </div>
            <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'12px 14px', margin:'16px 0', fontSize:11, color:'rgba(255,255,255,0.35)', lineHeight:1.8 }}>
              📋 <strong style={{ color:'rgba(255,255,255,0.5)' }}>Règles du challenge :</strong><br/>
              Le candidat ciblé a <strong>48h</strong> pour accepter ou refuser.<br/>
              Si accepté, le vote public dure <strong>{duration} jours</strong>.<br/>
              Le gagnant remporte <strong style={{ color:'#4ade80' }}>la cagnotte accumulée par les votes</strong> après prélèvement des commissions de la plateforme qui est de l'ordre de <strong style={{ color:OR }}>50%</strong>.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:50, padding:'10px 20px', fontSize:13, color:'rgba(255,255,255,0.4)', cursor:'pointer' }}>Annuler</button>
              <button onClick={launchChallenge} disabled={submitting}
                style={{ background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'10px 24px', fontSize:13, fontWeight:700, color:'#000', cursor:'pointer', opacity:submitting?0.6:1 }}>
                {submitting ? '⏳ Envoi…' : '⚡ Lancer le défi'}
              </button>
            </div>
          </div>
        )}

        {/* Non connecté */}
        {!loggedIn && (
          <div style={{ background:'rgba(255,170,0,0.04)', border:'1px solid rgba(255,170,0,0.15)', borderRadius:14, padding:'16px 20px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>
              🔒 <strong style={{ color:'#fff' }}>Tu veux lancer un défi ?</strong> Connecte-toi pour défier un candidat.
            </div>
            <button onClick={() => router.push('/auth/login')} style={{ background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'8px 18px', fontSize:12, fontWeight:700, color:'#000', cursor:'pointer', whiteSpace:'nowrap' }}>
              Se connecter →
            </button>
          </div>
        )}

        {/* Filtres */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
          {[
            { key:'all',     label:`Tous (${challenges.length})` },
            { key:'active',  label:`En cours (${challenges.filter(c=>c.status==='active').length})` },
            { key:'pending', label:`En attente (${challenges.filter(c=>c.status==='pending').length})` },
            { key:'ended',   label:`Terminés (${challenges.filter(c=>c.status==='ended').length})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              style={{ padding:'6px 14px', borderRadius:50, fontSize:12, fontWeight:600, cursor:'pointer', border:`1px solid ${filter===f.key?OR:'rgba(255,255,255,0.1)'}`, background:filter===f.key?'rgba(255,170,0,0.1)':'transparent', color:filter===f.key?OR:'rgba(255,255,255,0.4)' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.2)' }}>⏳ Chargement…</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>⚡</div>
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14 }}>Aucun challenge pour l'instant.</p>
            {loggedIn && <p style={{ color:'rgba(255,170,0,0.5)', fontSize:13, marginTop:6 }}>Sois le premier à lancer un défi !</p>}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {displayed.map(c => {
              const st   = ST[c.status] ?? ST.pending;
              const totC = c.challenger_votes ?? 0;
              const totD = c.challenged_votes ?? 0;
              const total = totC + totD;
              const net   = total * 100 * 0.5;
              const isActive = c.status === 'active';
              const isEnded  = c.status === 'ended';
              const winner   = isEnded ? (totC >= totD ? c.challenger : c.challenged) : null;

              return (
                <div key={c.id} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, overflow:'hidden' }}>

                  {/* Header */}
                  <div style={{ padding:'16px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4 }}>
                        {DISC_EMOJI[c.discipline??'']??'⚡'} {c.theme}
                      </div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>
                        {DISC_FR[c.discipline??'']??'Challenge'}
                        {c.ends_at && isActive && ` · ${daysLeft(c.ends_at)}j restants`}
                        {isEnded && ' · Terminé'}
                        {c.status==='pending' && ' · En attente d\'acceptation (48h)'}
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                      {/* ✅ ⭐ → ★ rouge */}
                      {total > 0 && (
                        <span style={{ fontSize:12, fontWeight:700, color:OR }}>
                          <StarRed /> {fmt(total)} votes
                        </span>
                      )}
                      <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:st.bg, color:st.color, border:`1px solid ${st.border}` }}>{st.label}</span>
                    </div>
                  </div>

                  {/* Battle */}
                  <div style={{ padding:'16px 18px' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, alignItems:'center', marginBottom: (isActive||isEnded) && total>0 ? 14 : 0 }}>

                      {/* Challenger */}
                      <div style={{ background: winner?.id===c.challenger.id?'rgba(255,170,0,0.08)':'rgba(255,255,255,0.03)', border:`1px solid ${winner?.id===c.challenger.id?'rgba(255,170,0,0.3)':'rgba(255,255,255,0.07)'}`, borderRadius:12, padding:'12px', textAlign:'center' }}>
                        {winner?.id===c.challenger.id && <div style={{ fontSize:16, marginBottom:4 }}>🏆</div>}
                        <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:2 }}>{c.challenger.stage_name ?? c.challenger.name}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:6 }}>Challenger</div>
                        {/* ✅ ⭐ → ★ rouge */}
                        {(isActive||isEnded) && (
                          <div style={{ fontSize:14, fontWeight:800, color:OR, fontFamily:'Syne,sans-serif' }}>
                            <StarRed /> {fmt(totC)}
                          </div>
                        )}
                        {isActive && c.challenger.video_id && (
                          <button onClick={() => handleVote(c.challenger.video_id)}
                            style={{ marginTop:8, background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:20, padding:'5px 14px', fontSize:11, fontWeight:700, color:'#000', cursor:'pointer' }}>
                            {/* ✅ ⭐ → ★ rouge */}
                            <StarRed /> Voter
                          </button>
                        )}
                        {isEnded && winner?.id===c.challenger.id && net>0 && (
                          <div style={{ fontSize:12, color:'#4ade80', marginTop:6, fontWeight:700 }}>🏆 +{fmt(Math.round(net))} F CFA gagnés</div>
                        )}
                      </div>

                      {/* VS */}
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontFamily:'Syne,sans-serif', fontWeight:900, fontSize:18, color:'rgba(255,255,255,0.2)' }}>VS</div>
                      </div>

                      {/* Challenged */}
                      <div style={{ background:winner?.id===c.challenged.id?'rgba(255,170,0,0.08)':'rgba(255,255,255,0.03)', border:`1px solid ${winner?.id===c.challenged.id?'rgba(255,170,0,0.3)':'rgba(255,255,255,0.07)'}`, borderRadius:12, padding:'12px', textAlign:'center' }}>
                        {winner?.id===c.challenged.id && <div style={{ fontSize:16, marginBottom:4 }}>🏆</div>}
                        <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:2 }}>{c.challenged.stage_name ?? c.challenged.name}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:6 }}>
                          {c.status==='pending'?'Invité':'Challengé'}
                        </div>
                        {/* ✅ ⭐ → ★ rouge */}
                        {(isActive||isEnded) && (
                          <div style={{ fontSize:14, fontWeight:800, color:'#60a5fa', fontFamily:'Syne,sans-serif' }}>
                            <StarRed /> {fmt(totD)}
                          </div>
                        )}
                        {isActive && c.challenged.video_id && (
                          <button onClick={() => handleVote(c.challenged.video_id)}
                            style={{ marginTop:8, background:'rgba(96,165,250,0.2)', border:'1px solid rgba(96,165,250,0.4)', borderRadius:20, padding:'5px 14px', fontSize:11, fontWeight:700, color:'#60a5fa', cursor:'pointer' }}>
                            {/* ✅ ⭐ → ★ rouge */}
                            <StarRed /> Voter
                          </button>
                        )}
                        {isEnded && winner?.id===c.challenged.id && net>0 && (
                          <div style={{ fontSize:12, color:'#4ade80', marginTop:6, fontWeight:700 }}>🏆 +{fmt(Math.round(net))} F CFA gagnés</div>
                        )}
                      </div>
                    </div>

                    {/* Barre progression */}
                    {(isActive||isEnded) && total > 0 && (
                      <div>
                        <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.06)', overflow:'hidden', display:'flex' }}>
                          <div style={{ height:'100%', background:OR, width:`${Math.round((totC/total)*100)}%`, transition:'width .5s', borderRadius:'3px 0 0 3px' }} />
                          <div style={{ height:'100%', background:'#60a5fa', flex:1, borderRadius:'0 3px 3px 0' }} />
                        </div>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:4 }}>
                          <span>{Math.round((totC/total)*100)}%</span>
                          <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>Prix du vainqueur : {fmt(Math.round(net))} F</span>
                          <span>{Math.round((totD/total)*100)}%</span>
                        </div>
                      </div>
                    )}

                    {c.status === 'pending' && (
                      <div style={{ fontSize:11, color:'rgba(255,170,0,0.6)', textAlign:'center', padding:'8px', background:'rgba(255,170,0,0.04)', borderRadius:8, marginTop:8 }}>
                        ⏳ En attente que <strong>{c.challenged.stage_name ?? c.challenged.name}</strong> accepte le défi
                      </div>
                    )}
                    {c.status === 'declined' && (
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', textAlign:'center', padding:'8px', marginTop:8 }}>
                        ✕ Défi refusé par {c.challenged.stage_name ?? c.challenged.name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}