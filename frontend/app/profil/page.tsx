'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

const DISC_EMOJI: Record<string,string> = { danse:'💃',chant:'🎤',instrument:'🎸',acapella:'🎙️',humour:'😂',poesie:'📜',conte:'📖',musique:'🎵' };
const DISC_FR:    Record<string,string> = { danse:'Danse',chant:'Chant',instrument:'Instrument',acapella:'A cappella',humour:'Humour',poesie:'Poésie',conte:'Conte',musique:'Musique' };
const COUNTRIES:  Record<string,{flag:string;name:string}> = {
  BJ:{flag:'🇧🇯',name:'Bénin'},CI:{flag:'🇨🇮',name:"Côte d'Ivoire"},SN:{flag:'🇸🇳',name:'Sénégal'},
  ML:{flag:'🇲🇱',name:'Mali'},BF:{flag:'🇧🇫',name:'Burkina Faso'},GN:{flag:'🇬🇳',name:'Guinée'},
  TG:{flag:'🇹🇬',name:'Togo'},CM:{flag:'🇨🇲',name:'Cameroun'},NG:{flag:'🇳🇬',name:'Nigeria'},
  GH:{flag:'🇬🇭',name:'Ghana'},FR:{flag:'🇫🇷',name:'France'},BE:{flag:'🇧🇪',name:'Belgique'},
  CA:{flag:'🇨🇦',name:'Canada'},US:{flag:'🇺🇸',name:'États-Unis'},
};

interface UserProfile { id:string;name:string;email?:string;country?:string;photo_url?:string;bio?:string;total_earned?:number;total_votes_received?:number;score_visible?:boolean; }
interface UserVideo   { id:string;title:string;discipline?:string;status:string;views?:number;vote_count?:number;created_at:string; }

function fmt(n:number){ return n.toLocaleString('fr-FR'); }
function timeAgo(d:string){ const m=Math.floor((Date.now()-new Date(d).getTime())/60000); if(m<1)return"à l'instant"; if(m<60)return`${m}min`; const h=Math.floor(m/60); if(h<24)return`${h}h`; return`${Math.floor(h/24)}j`; }

function LoginPopup({message,onLogin,onClose}:{message:string;onLogin:()=>void;onClose:()=>void}) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#12121e',border:'1px solid rgba(255,170,0,0.3)',borderRadius:20,padding:'28px 24px',maxWidth:320,width:'90%',textAlign:'center'}}>
        <div style={{fontSize:36,marginBottom:12}}>🔒</div>
        <h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'1rem',color:'#fff',marginBottom:8}}>Connexion requise</h3>
        <p style={{fontSize:'0.82rem',color:'rgba(255,255,255,0.45)',lineHeight:1.6,marginBottom:20}}>{message}</p>
        <div style={{display:'flex',gap:10,justifyContent:'center'}}>
          <button onClick={onLogin} style={{background:'linear-gradient(135deg,#FFAA00,#FF6B00)',border:'none',borderRadius:50,padding:'9px 20px',fontSize:'0.8rem',fontWeight:700,color:'#fff',cursor:'pointer'}}>Se connecter</button>
          <button onClick={onClose} style={{background:'transparent',border:'1px solid rgba(255,255,255,0.15)',borderRadius:50,padding:'9px 16px',fontSize:'0.8rem',color:'rgba(255,255,255,0.5)',cursor:'pointer'}}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const OR      = '#FFAA00';

  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [videos,  setVideos]          = useState<UserVideo[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error,   setError]           = useState('');
  const [subscribed,  setSubscribed]  = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);
  const [loginMsg,    setLoginMsg]    = useState('');
  const loggedIn = !!getToken();

  const requireLogin = (msg:string) => { setLoginMsg(msg); setShowLogin(true); };

  useEffect(() => {
    setLoading(true);
    const token   = getToken();
    const headers: Record<string,string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    Promise.all([
      fetch(`${API}/users/${id}/profile`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/users/${id}/videos`,  { headers }).then(r => r.ok ? r.json() : null),
    ]).then(([prof, vids]) => {
      if (prof) setProfile(prof.profile ?? prof);
      if (vids) setVideos((vids.videos ?? vids ?? []).filter((v:UserVideo) => v.status === 'approved'));
    }).catch(() => setError('Profil introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubscribe = async () => {
    if (!loggedIn) { requireLogin('Connectez-vous pour suivre ce candidat et ne rien manquer.'); return; }
    if (subscribing) return;
    setSubscribing(true);
    const next = !subscribed;
    setSubscribed(next);
    try {
      await fetch(`${API}/users/${id}/follow`, { method: next ? 'POST' : 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    } catch { setSubscribed(!next); }
    finally { setSubscribing(false); }
  };

  const handleVote = () => {
    if (!loggedIn) { requireLogin('Connectez-vous pour voter et envoyer des étoiles à ce candidat.'); return; }
    if (videos[0]) router.push(`/watch/${videos[0].id}`);
  };

  const card: React.CSSProperties = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:'16px 18px', marginBottom:12 };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0a0a0f',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.2rem'}}><span style={{color:OR}}>Diki</span><span style={{color:'#fff',margin:'0 3px'}}>-</span><span style={{color:OR}}>Diki</span></div>
    </div>
  );

  if (error || !profile) return (
    <div style={{minHeight:'100vh',background:'#0a0a0f',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <div style={{fontSize:44}}>😕</div>
      <p style={{color:'#ff6b6b',fontFamily:'Syne,sans-serif'}}>{error || 'Profil introuvable'}</p>
      <button onClick={()=>router.back()} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:50,padding:'8px 18px',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:13}}>← Retour</button>
    </div>
  );

  const initials = profile.name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) ?? '?';
  const country  = profile.country ? COUNTRIES[profile.country] : null;

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f',color:'#f0f0f0',fontFamily:'DM Sans, sans-serif',paddingBottom:60}}>

      {showLogin && <LoginPopup message={loginMsg} onLogin={()=>{setShowLogin(false);router.push('/auth/login');}} onClose={()=>setShowLogin(false)}/>}

      {/* ── Topbar ── */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(8,8,15,0.97)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,170,0,0.12)',padding:'0 20px',height:56,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Link href="/home" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:7}}>
          <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:'1.15rem'}}><span style={{color:OR}}>Diki</span><span style={{color:'#fff',margin:'0 3px'}}>-</span><span style={{color:OR}}>Diki</span></span>
          <span style={{fontSize:'.48rem',fontWeight:700,color:'#fff',border:'1px solid rgba(255,255,255,.6)',borderRadius:3,padding:'1px 4px',letterSpacing:'.08em'}}>VISION</span>
        </Link>
        <button onClick={()=>router.back()} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'6px 14px',color:'rgba(255,255,255,0.5)',fontSize:12,cursor:'pointer'}}>← Retour</button>
      </div>

      <div style={{maxWidth:600,margin:'0 auto',padding:'24px 16px'}}>

        {/* ── Carte profil ── */}
        <div style={{...card,background:'linear-gradient(135deg,rgba(255,170,0,0.04),rgba(255,107,0,0.02))',border:'1px solid rgba(255,170,0,0.15)',padding:'20px'}}>

          {/* Avatar + infos */}
          <div style={{display:'flex',alignItems:'flex-start',gap:16,marginBottom:18}}>
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={profile.name} style={{width:68,height:68,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(255,170,0,0.35)',flexShrink:0}}/>
            ) : (
              <div style={{width:68,height:68,borderRadius:'50%',background:'linear-gradient(135deg,rgba(255,170,0,0.2),rgba(255,107,0,0.1))',border:'2px solid rgba(255,170,0,0.35)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,color:OR,fontFamily:'Syne,sans-serif',flexShrink:0}}>
                {initials}
              </div>
            )}
            <div style={{flex:1}}>
              <div style={{fontSize:20,fontWeight:800,color:'#fff',fontFamily:'Syne,sans-serif',marginBottom:4}}>{profile.name}</div>
              {country && <div style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginBottom:4}}>{country.flag} {country.name}</div>}
              {profile.bio && <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.6,marginBottom:8}}>{profile.bio}</div>}
              {/* Badges disciplines */}
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[...new Set(videos.map(v=>v.discipline).filter(Boolean))].map(d=>(
                  <span key={d} style={{background:'rgba(255,170,0,0.1)',border:'1px solid rgba(255,170,0,0.25)',color:OR,borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600}}>
                    {DISC_EMOJI[d??'']??'🎭'} {DISC_FR[d??'']??d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18}}>
            {[
              {val:videos.length,                                                              label:'Vidéos',       color:'#f0f0f0'},
              {val:profile.score_visible!==false?fmt(profile.total_votes_received??0):'—',    label:'Votes reçus',  color:OR},
              {val:`${fmt(profile.total_earned??0)} F`,                                        label:'Gains totaux', color:OR},
            ].map(s=>(
              <div key={s.label} style={{background:'rgba(255,255,255,0.05)',borderRadius:12,padding:'12px 8px',textAlign:'center'}}>
                <div style={{fontSize:17,fontWeight:800,color:s.color,fontFamily:'Syne,sans-serif',lineHeight:1}}>{s.val}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Boutons Suivre + Voter */}
          <div style={{display:'flex',gap:10}}>
            <button onClick={handleSubscribe} disabled={subscribing}
              style={{flex:1,padding:'11px',border:`1px solid ${subscribed?OR:'rgba(255,255,255,0.2)'}`,borderRadius:50,background:subscribed?'rgba(255,170,0,0.12)':'transparent',color:subscribed?OR:'rgba(255,255,255,0.6)',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'DM Sans,sans-serif',transition:'all .2s',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              {subscribed ? '🔔 Abonné' : '🔔 Suivre'}
            </button>
            <button onClick={handleVote} disabled={videos.length===0}
              style={{flex:1,padding:'11px',border:'none',borderRadius:50,background:videos.length===0?'rgba(255,255,255,0.06)':'linear-gradient(135deg,#FFAA00,#FF6B00)',color:videos.length===0?'rgba(255,255,255,0.3)':'#000',fontSize:13,fontWeight:700,cursor:videos.length===0?'not-allowed':'pointer',fontFamily:'DM Sans,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              ⭐ Voter
            </button>
          </div>

          {videos.length === 0 && (
            <div style={{textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:8}}>
              Vote disponible dès qu'une vidéo est approuvée
            </div>
          )}
        </div>

        {/* ── Liste des vidéos ── */}
        <div style={{marginTop:8}}>
          <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:12}}>
            🎬 Ses vidéos ({videos.length})
          </div>

          {videos.length === 0 ? (
            <div style={{...card,textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:36,marginBottom:12}}>🎬</div>
              <p style={{color:'rgba(255,255,255,0.4)',fontSize:13}}>Aucune vidéo approuvée pour l'instant.</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {videos.map((v,i)=>(
                <div key={v.id} onClick={()=>router.push(`/watch/${v.id}`)}
                  style={{...card,cursor:'pointer',display:'flex',gap:14,alignItems:'center',marginBottom:0,transition:'border-color .2s',
                    border:`1px solid ${i===0?'rgba(255,170,0,0.25)':'rgba(255,255,255,0.08)'}`}}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(255,170,0,0.4)')}
                  onMouseLeave={e=>(e.currentTarget.style.borderColor=i===0?'rgba(255,170,0,0.25)':'rgba(255,255,255,0.08)')}>

                  {/* Miniature */}
                  <div style={{width:52,height:70,borderRadius:10,background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,position:'relative'}}>
                    {DISC_EMOJI[v.discipline??'']??'🎬'}
                    {i===0&&(
                      <div style={{position:'absolute',top:-7,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#FFAA00,#FF6B00)',borderRadius:20,padding:'1px 7px',fontSize:8,fontWeight:700,color:'#000',whiteSpace:'nowrap'}}>
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:4}}>
                      {DISC_FR[v.discipline??'']??v.discipline}
                      {v.views!==undefined&&` · 👁 ${fmt(v.views)}`}
                      {(v.vote_count??0)>0&&` · ⭐ ${fmt(v.vote_count!)}`}
                    </div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>Il y a {timeAgo(v.created_at)}</div>
                  </div>

                  {/* CTA */}
                  <div style={{display:'flex',flexDirection:'column',gap:6,flexShrink:0}}>
                    <button onClick={e=>{e.stopPropagation();router.push(`/watch/${v.id}`);}}
                      style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:'5px 12px',fontSize:11,color:'rgba(255,255,255,0.6)',cursor:'pointer'}}>
                      ▶ Voir
                    </button>
                    <button onClick={e=>{e.stopPropagation();if(!loggedIn){requireLogin('Connectez-vous pour voter pour ce candidat.');}else{router.push(`/watch/${v.id}`);}}}
                      style={{background:'rgba(255,170,0,0.1)',border:'1px solid rgba(255,170,0,0.25)',borderRadius:20,padding:'5px 12px',fontSize:11,fontWeight:700,color:OR,cursor:'pointer'}}>
                      ⭐ Voter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{textAlign:'center',marginTop:24,fontSize:11,color:'rgba(255,255,255,0.2)'}}>
          Profil public · <Link href="/home" style={{color:'rgba(255,170,0,0.4)',textDecoration:'none'}}>Diki-Diki Vision</Link>
        </div>
      </div>
    </div>
  );
}
