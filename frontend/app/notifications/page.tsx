'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TickerBand from '../components/TickerBand';
import TranslateWidget from '../components/TranslateWidget';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';
const OR2 = '#FF6B00';

function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

// ── Types ──────────────────────────────────────────────────────────
interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  meta?: { video_id?: string; contest_id?: string; user_id?: string; amount?: number };
}

// ── Config par type ────────────────────────────────────────────────
const NOTIF_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  vote:        { icon:'⭐', color:'#FFAA00', bg:'rgba(255,170,0,0.08)',  border:'rgba(255,170,0,0.2)'   },
  like:        { icon:'❤️', color:'#ff6b6b', bg:'rgba(255,80,80,0.08)',  border:'rgba(255,80,80,0.2)'   },
  comment:     { icon:'💬', color:'#60a5fa', bg:'rgba(96,165,250,0.08)', border:'rgba(96,165,250,0.2)'  },
  follow:      { icon:'🔔', color:'#a78bfa', bg:'rgba(167,139,250,0.08)',border:'rgba(167,139,250,0.2)' },
  win:         { icon:'🏆', color:'#4ade80', bg:'rgba(74,222,128,0.08)', border:'rgba(74,222,128,0.2)'  },
  approved:    { icon:'✅', color:'#4ade80', bg:'rgba(74,222,128,0.08)', border:'rgba(74,222,128,0.2)'  },
  rejected:    { icon:'❌', color:'#f87171', bg:'rgba(248,113,113,0.08)',border:'rgba(248,113,113,0.2)' },
  payment:     { icon:'💰', color:'#FFAA00', bg:'rgba(255,170,0,0.08)',  border:'rgba(255,170,0,0.2)'   },
  challenge:   { icon:'⚡', color:'#fb923c', bg:'rgba(251,146,60,0.08)', border:'rgba(251,146,60,0.2)'  },
  system:      { icon:'📢', color:'rgba(255,255,255,0.6)', bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.1)' },
  default:     { icon:'🔔', color:'rgba(255,255,255,0.6)', bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.1)' },
};

const FILTERS = [
  { id:'all',      label:'Toutes'        },
  { id:'vote',     label:'⭐ Votes'      },
  { id:'like',     label:'❤️ Likes'     },
  { id:'comment',  label:'💬 Commentaires' },
  { id:'follow',   label:'🔔 Abonnés'   },
  { id:'approved', label:'✅ Vidéos'    },
  { id:'payment',  label:'💰 Paiements' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);
  if (min < 1)  return 'À l\'instant';
  if (min < 60) return `il y a ${min} min`;
  if (h   < 24) return `il y a ${h}h`;
  if (d   < 7)  return `il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
}

// ── Notification card ──────────────────────────────────────────────
function NotifCard({ notif, onRead, onDelete }: { notif: Notif; onRead: (id:string)=>void; onDelete: (id:string)=>void }) {
  const cfg = NOTIF_CONFIG[notif.type] ?? NOTIF_CONFIG.default;
  const router = useRouter();

  const handleClick = () => {
    if (!notif.read) onRead(notif.id);
    if (notif.meta?.video_id)   router.push(`/watch/${notif.meta.video_id}`);
    if (notif.meta?.contest_id) router.push(`/challenges`);
  };

  return (
    <div style={{ display:'flex', gap:12, padding:'14px 16px', background: notif.read ? 'rgba(255,255,255,0.02)' : cfg.bg, border:`1px solid ${notif.read ? 'rgba(255,255,255,0.06)' : cfg.border}`, borderRadius:14, marginBottom:8, cursor:'pointer', transition:'all .2s', position:'relative' as const }}
      onClick={handleClick}
      onMouseEnter={e=>(e.currentTarget.style.opacity='0.85')}
      onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>

      {/* Icône */}
      <div style={{ width:40, height:40, borderRadius:12, background: notif.read ? 'rgba(255,255,255,0.05)' : cfg.bg, border:`1px solid ${cfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
        {cfg.icon}
      </div>

      {/* Contenu */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
          <div style={{ fontSize:13, fontWeight: notif.read ? 500 : 700, color: notif.read ? 'rgba(255,255,255,0.6)' : '#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
            {notif.title}
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', flexShrink:0, marginLeft:8 }}>{timeAgo(notif.created_at)}</div>
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>{notif.message}</div>
        {notif.meta?.amount && (
          <div style={{ marginTop:5, fontSize:11, fontWeight:700, color:cfg.color }}>{notif.meta.amount.toLocaleString('fr-FR')} F CFA</div>
        )}
      </div>

      {/* Point non lu */}
      {!notif.read && (
        <div style={{ position:'absolute' as const, top:10, right:10, width:8, height:8, borderRadius:'50%', background:cfg.color }}/>
      )}

      {/* Bouton supprimer */}
      <button onClick={e=>{e.stopPropagation();onDelete(notif.id);}}
        style={{ position:'absolute' as const, bottom:8, right:10, background:'none', border:'none', fontSize:11, color:'rgba(255,255,255,0.2)', cursor:'pointer', padding:'2px 6px', borderRadius:6 }}
        onMouseEnter={e=>(e.currentTarget.style.color='#f87171')}
        onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.2)')}>
        ✕
      </button>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────
export default function NotificationsPage() {
  const router = useRouter();
  const [notifs,  setNotifs]  = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }
    fetch(`${API}/notifications`, { headers: { Authorization:`Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const list = data?.notifications ?? data ?? [];
        setNotifs(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        // Données démo si API indisponible
        setNotifs([
          { id:'1', type:'vote',     title:'Nouveau vote reçu !',         message:'Quelqu\'un a voté ⭐ pour ta vidéo "Test DkDk"',          read:false, created_at: new Date(Date.now()-300_000).toISOString(),   meta:{amount:10} },
          { id:'2', type:'like',     title:'Quelqu\'un a aimé ta vidéo', message:'Ta prestation reçoit de l\'amour ❤️',                     read:false, created_at: new Date(Date.now()-3_600_000).toISOString()   },
          { id:'3', type:'comment',  title:'Nouveau commentaire',          message:'"Super prestation, continue comme ça !"',                 read:false, created_at: new Date(Date.now()-7_200_000).toISOString(),  meta:{video_id:'demo'} },
          { id:'4', type:'approved', title:'Vidéo approuvée ✅',           message:'Ta vidéo "Test DkDk" est maintenant visible sur la plateforme.', read:true, created_at: new Date(Date.now()-86_400_000).toISOString() },
          { id:'5', type:'follow',   title:'Nouveau follower',             message:'Un utilisateur suit maintenant ton profil',               read:true, created_at: new Date(Date.now()-172_800_000).toISOString()  },
          { id:'6', type:'system',   title:'Bienvenue sur Diki-Diki Vision !', message:'Ta plateforme de talents africains est prête. Soumets ta première vidéo !', read:true, created_at: new Date(Date.now()-604_800_000).toISOString() },
        ]);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const markAllRead = async () => {
    const token = getToken(); if (!token) return;
    setMarking(true);
    try {
      await fetch(`${API}/notifications/read-all`, { method:'PUT', headers:{ Authorization:`Bearer ${token}` } });
    } catch {}
    setNotifs(n => n.map(x => ({ ...x, read:true })));
    setMarking(false);
  };

  const markRead = async (id: string) => {
    const token = getToken(); if (!token) return;
    try { await fetch(`${API}/notifications/${id}/read`, { method:'PUT', headers:{ Authorization:`Bearer ${token}` } }); } catch {}
    setNotifs(n => n.map(x => x.id===id ? {...x, read:true} : x));
  };

  const deleteNotif = async (id: string) => {
    const token = getToken(); if (!token) return;
    try { await fetch(`${API}/notifications/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } }); } catch {}
    setNotifs(n => n.filter(x => x.id!==id));
  };

  const filtered = filter==='all' ? notifs : notifs.filter(n => n.type===filter);
  const unread   = notifs.filter(n => !n.read).length;

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f0', fontFamily:'DM Sans,sans-serif', paddingBottom:80 }}>

      {/* Topbar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(8,8,15,0.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,170,0,0.1)', padding:'0 20px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/home" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.05rem' }}>
            <LogoDikiDiki width={180} />
          </span>
          <span style={{ fontSize:'.42rem', fontWeight:700, color:'#fff', border:'1px solid rgba(255,255,255,.6)', borderRadius:3, padding:'1px 4px', letterSpacing:'.08em' }}>VISION</span>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <TranslateWidget />
          <Link href="/compte" style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B00,#FFD700)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, textDecoration:'none' }}>
            👤
          </Link>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'#fff' }}>🔔 Notifications</h1>
              {unread > 0 && (
                <span style={{ background:`linear-gradient(135deg,${OR},${OR2})`, color:'#000', fontSize:11, fontWeight:800, padding:'2px 8px', borderRadius:20 }}>
                  {unread} non lue{unread>1?'s':''}
                </span>
              )}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{notifs.length} notification{notifs.length!==1?'s':''} au total</div>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} disabled={marking}
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'7px 14px', fontSize:12, color:'rgba(255,255,255,0.6)', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
              {marking ? '⏳…' : '✓ Tout marquer comme lu'}
            </button>
          )}
        </div>

        {/* Filtres — une seule ligne compacte */}
        <div style={{ display:'flex', gap:5, flexWrap:'nowrap', marginBottom:20, justifyContent:'space-between' }}>
          {FILTERS.map(f => {
            const unreadCount = f.id==='all' ? notifs.filter(n=>!n.read).length : notifs.filter(n=>n.type===f.id&&!n.read).length;
            return (
              <button key={f.id} onClick={()=>setFilter(f.id)}
                style={{ padding:'5px 8px', borderRadius:50, fontSize:10, fontWeight:600, cursor:'pointer', flexShrink:0, border:`1px solid ${filter===f.id?OR:'rgba(255,255,255,0.1)'}`, background:filter===f.id?`linear-gradient(135deg,${OR},${OR2})`:'rgba(255,255,255,0.04)', color:filter===f.id?'#000':'rgba(255,255,255,0.5)', display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap' as const }}>
                {f.label}
                {unreadCount > 0 && (
                  <span style={{ background: filter===f.id ? 'rgba(0,0,0,0.25)' : OR, color: filter===f.id?'#000':'#000', borderRadius:10, padding:'0 5px', fontSize:10, fontWeight:800 }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenu */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)' }}>⏳ Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ fontSize:48, marginBottom:14 }}>🔕</div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:'#fff', marginBottom:8 }}>Aucune notification</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)' }}>
              {filter==='all' ? 'Tu recevras des notifications quand quelqu\'un interagira avec tes vidéos.' : 'Aucune notification dans cette catégorie.'}
            </div>
          </div>
        ) : (
          <>
            {/* Non lues */}
            {filtered.some(n=>!n.read) && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase' as const, letterSpacing:'.5px', marginBottom:10 }}>
                  🔴 Non lues ({filtered.filter(n=>!n.read).length})
                </div>
                {filtered.filter(n=>!n.read).map(n=>(
                  <NotifCard key={n.id} notif={n} onRead={markRead} onDelete={deleteNotif}/>
                ))}
              </div>
            )}

            {/* Lues */}
            {filtered.some(n=>n.read) && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase' as const, letterSpacing:'.5px', marginBottom:10 }}>
                  ✓ Lues ({filtered.filter(n=>n.read).length})
                </div>
                {filtered.filter(n=>n.read).map(n=>(
                  <NotifCard key={n.id} notif={n} onRead={markRead} onDelete={deleteNotif}/>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}>
        <TickerBand />
      </div>
    </div>
  );
}
