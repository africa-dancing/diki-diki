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
function decodeToken(t: string) {
  try { return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); } catch { return null; }
}

const COUNTRIES = [
  // Afrique de l'Ouest
  {code:'BJ',flag:'🇧🇯',name:'Bénin'},
  {code:'BF',flag:'🇧🇫',name:'Burkina Faso'},
  {code:'CV',flag:'🇨🇻',name:'Cap-Vert'},
  {code:'CI',flag:'🇨🇮',name:"Côte d'Ivoire"},
  {code:'GM',flag:'🇬🇲',name:'Gambie'},
  {code:'GH',flag:'🇬🇭',name:'Ghana'},
  {code:'GN',flag:'🇬🇳',name:'Guinée'},
  {code:'GW',flag:'🇬🇼',name:'Guinée-Bissau'},
  {code:'LR',flag:'🇱🇷',name:'Libéria'},
  {code:'ML',flag:'🇲🇱',name:'Mali'},
  {code:'MR',flag:'🇲🇷',name:'Mauritanie'},
  {code:'NE',flag:'🇳🇪',name:'Niger'},
  {code:'NG',flag:'🇳🇬',name:'Nigeria'},
  {code:'SN',flag:'🇸🇳',name:'Sénégal'},
  {code:'SL',flag:'🇸🇱',name:'Sierra Leone'},
  {code:'TG',flag:'🇹🇬',name:'Togo'},
  // Afrique Centrale
  {code:'CM',flag:'🇨🇲',name:'Cameroun'},
  {code:'CF',flag:'🇨🇫',name:'Centrafrique'},
  {code:'TD',flag:'🇹🇩',name:'Tchad'},
  {code:'CG',flag:'🇨🇬',name:'Congo-Brazzaville'},
  {code:'CD',flag:'🇨🇩',name:'Congo-Kinshasa (RDC)'},
  {code:'GQ',flag:'🇬🇶',name:'Guinée équatoriale'},
  {code:'GA',flag:'🇬🇦',name:'Gabon'},
  {code:'ST',flag:'🇸🇹',name:'São Tomé-et-Príncipe'},
  // Afrique de l'Est
  {code:'BI',flag:'🇧🇮',name:'Burundi'},
  {code:'KM',flag:'🇰🇲',name:'Comores'},
  {code:'DJ',flag:'🇩🇯',name:'Djibouti'},
  {code:'ER',flag:'🇪🇷',name:'Érythrée'},
  {code:'ET',flag:'🇪🇹',name:'Éthiopie'},
  {code:'KE',flag:'🇰🇪',name:'Kenya'},
  {code:'MG',flag:'🇲🇬',name:'Madagascar'},
  {code:'MW',flag:'🇲🇼',name:'Malawi'},
  {code:'MU',flag:'🇲🇺',name:'Maurice'},
  {code:'MZ',flag:'🇲🇿',name:'Mozambique'},
  {code:'RW',flag:'🇷🇼',name:'Rwanda'},
  {code:'SC',flag:'🇸🇨',name:'Seychelles'},
  {code:'SO',flag:'🇸🇴',name:'Somalie'},
  {code:'SS',flag:'🇸🇸',name:'Soudan du Sud'},
  {code:'TZ',flag:'🇹🇿',name:'Tanzanie'},
  {code:'UG',flag:'🇺🇬',name:'Ouganda'},
  {code:'ZM',flag:'🇿🇲',name:'Zambie'},
  {code:'ZW',flag:'🇿🇼',name:'Zimbabwe'},
  // Afrique du Nord
  {code:'DZ',flag:'🇩🇿',name:'Algérie'},
  {code:'EG',flag:'🇪🇬',name:'Égypte'},
  {code:'LY',flag:'🇱🇾',name:'Libye'},
  {code:'MA',flag:'🇲🇦',name:'Maroc'},
  {code:'SD',flag:'🇸🇩',name:'Soudan'},
  {code:'TN',flag:'🇹🇳',name:'Tunisie'},
  // Afrique Australe
  {code:'AO',flag:'🇦🇴',name:'Angola'},
  {code:'BW',flag:'🇧🇼',name:'Botswana'},
  {code:'LS',flag:'🇱🇸',name:'Lesotho'},
  {code:'NA',flag:'🇳🇦',name:'Namibie'},
  {code:'ZA',flag:'🇿🇦',name:'Afrique du Sud'},
  {code:'SZ',flag:'🇸🇿',name:'Eswatini'},
  // Europe
  {code:'BE',flag:'🇧🇪',name:'Belgique'},
  {code:'FR',flag:'🇫🇷',name:'France'},
  {code:'DE',flag:'🇩🇪',name:'Allemagne'},
  {code:'IT',flag:'🇮🇹',name:'Italie'},
  {code:'LU',flag:'🇱🇺',name:'Luxembourg'},
  {code:'NL',flag:'🇳🇱',name:'Pays-Bas'},
  {code:'PT',flag:'🇵🇹',name:'Portugal'},
  {code:'ES',flag:'🇪🇸',name:'Espagne'},
  {code:'CH',flag:'🇨🇭',name:'Suisse'},
  {code:'GB',flag:'🇬🇧',name:'Royaume-Uni'},
  // Amériques
  {code:'CA',flag:'🇨🇦',name:'Canada'},
  {code:'US',flag:'🇺🇸',name:'États-Unis'},
  {code:'BR',flag:'🇧🇷',name:'Brésil'},
  {code:'HT',flag:'🇭🇹',name:'Haïti'},
  {code:'GF',flag:'🇬🇫',name:'Guyane française'},
  {code:'MQ',flag:'🇲🇶',name:'Martinique'},
  {code:'GP',flag:'🇬🇵',name:'Guadeloupe'},
  // Océan Indien / DOM-TOM
  {code:'RE',flag:'🇷🇪',name:'Réunion'},
  {code:'YT',flag:'🇾🇹',name:'Mayotte'},
  // Autres
  {code:'AU',flag:'🇦🇺',name:'Australie'},
  {code:'CN',flag:'🇨🇳',name:'Chine'},
  {code:'IN',flag:'🇮🇳',name:'Inde'},
  {code:'JP',flag:'🇯🇵',name:'Japon'},
  {code:'AE',flag:'🇦🇪',name:'Émirats arabes unis'},
];

const DISC_EMOJI: Record<string,string> = {
  danse:'💃', chant:'🎤', instrument:'🎸', acapella:'🎙️',
  humour:'😂', poesie:'📜', conte:'📖', musique:'🎵', theatre:'🎭',
};

interface Profile {
  id: string; name: string; email: string;
  country?: string; photo_url?: string; bio?: string;
  stage_name?: string; discipline?: string;
}
interface Video {
  id: string; title: string; discipline?: string;
  status: string; views?: number; vote_count?: number; created_at: string;
}
interface Privacy {
  name_visible: boolean; photo_visible: boolean;
  phone_visible: boolean; email_visible: boolean;
  score_visible: boolean; location_visible: boolean;
}

const defaultPrivacy: Privacy = {
  name_visible: true, photo_visible: true,
  phone_visible: false, email_visible: false,
  score_visible: true, location_visible: true,
};

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width:44, height:24, borderRadius:12, background:on?OR:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', padding:2, cursor:'pointer', flexShrink:0, transition:'background .25s' }}>
      <div style={{ width:20, height:20, borderRadius:'50%', background:on?'#fff':'rgba(255,255,255,0.4)', marginLeft:on?'auto':0, transition:'margin .25s' }}/>
    </div>
  );
}

type Tab = 'profil'|'videos'|'commentaires'|'confidentialite'|'apercu';
const TABS: {id:Tab;emoji:string;label:string}[] = [
  {id:'profil',         emoji:'✏️', label:'Mon profil'},
  {id:'videos',         emoji:'🎬', label:'Mes vidéos'},
  {id:'commentaires',   emoji:'💬', label:'Commentaires reçus'},
  {id:'confidentialite',emoji:'🔒', label:'Confidentialité'},
  {id:'apercu',         emoji:'👁', label:'Aperçu public'},
];

// ── CommentItem avec réponse inline ────────────────────────────────
function CommentItem({ c, token, apiBase, accentColor }: { c: any; token: string; apiBase: string; accentColor: string }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending,   setSending]   = useState(false);
  const [replies,   setReplies]   = useState<any[]>(c.replies ?? []);
  const [sent,      setSent]      = useState(false);
  const [reaction,  setReaction]  = useState<'like'|'dislike'|null>(c.my_reaction ?? null);
  const [likes,     setLikes]     = useState<number>(c.likes ?? 0);
  const [dislikes,  setDislikes]  = useState<number>(c.dislikes ?? 0);

  const react = async (type: 'like'|'dislike') => {
    const next = reaction === type ? null : type;
    // Optimistic update
    setReaction(next);
    if (type === 'like') {
      setLikes(n => reaction === 'like' ? n-1 : n+1);
      if (reaction === 'dislike') setDislikes(n => n-1);
    } else {
      setDislikes(n => reaction === 'dislike' ? n-1 : n+1);
      if (reaction === 'like') setLikes(n => n-1);
    }
    try {
      await fetch(`${apiBase}/comments/${c.id}/react`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ type: next }),
      });
    } catch {}
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${apiBase}/comments/${c.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      const data = await res.json();
      setReplies(r => [...r, data.reply ?? { id: Date.now(), content: replyText.trim(), user:{ name:'Moi' }, created_at: new Date().toISOString() }]);
      setReplyText(''); setShowReply(false); setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch {} finally { setSending(false); }
  };

  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'14px 16px', marginBottom:10 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,170,0,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:accentColor, flexShrink:0 }}>
            {(c.user?.name??'?')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#fff' }}>{c.user?.name ?? 'Utilisateur'}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>
              {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR', {day:'numeric',month:'short',year:'numeric'}) : ''}
            </div>
          </div>
        </div>
        {c.video_title && <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.05)', borderRadius:20, padding:'2px 10px', whiteSpace:'nowrap' as const }}>🎬 {c.video_title}</div>}
      </div>

      {/* Contenu */}
      <div style={{ fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:1.6, marginBottom:12 }}>{c.content ?? c.text ?? c.message}</div>

      {/* Réponses existantes */}
      {replies.length > 0 && (
        <div style={{ borderLeft:`2px solid rgba(255,170,0,0.2)`, marginLeft:16, paddingLeft:12, marginBottom:12 }}>
          {replies.map((r:any, i:number) => (
            <div key={r.id??i} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:`linear-gradient(135deg,${accentColor},#FF6B00)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#000' }}>
                  {(r.user?.name??'M')[0].toUpperCase()}
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:accentColor }}>{r.user?.name ?? 'Moi'}</span>
                <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : ''}</span>
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.5, paddingLeft:28 }}>{r.content ?? r.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions — 👍 👎 💬 */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' as const }}>

        {/* 👍 Liker */}
        <button onClick={() => react('like')}
          style={{ display:'flex', alignItems:'center', gap:4, background: reaction==='like' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)', border:`1px solid ${reaction==='like' ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, color: reaction==='like' ? '#4ade80' : 'rgba(255,255,255,0.45)', cursor:'pointer', transition:'all .2s' }}>
          👍 {likes > 0 && <span>{likes}</span>}
        </button>

        {/* 👎 Détester */}
        <button onClick={() => react('dislike')}
          style={{ display:'flex', alignItems:'center', gap:4, background: reaction==='dislike' ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.05)', border:`1px solid ${reaction==='dislike' ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, color: reaction==='dislike' ? '#f87171' : 'rgba(255,255,255,0.45)', cursor:'pointer', transition:'all .2s' }}>
          👎 {dislikes > 0 && <span>{dislikes}</span>}
        </button>

        {/* 💬 Répondre */}
        <button onClick={() => setShowReply(s=>!s)}
          style={{ display:'flex', alignItems:'center', gap:4, background: showReply ? `rgba(255,170,0,0.1)` : 'rgba(255,255,255,0.05)', border:`1px solid ${showReply ? accentColor : 'rgba(255,255,255,0.1)'}`, borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:600, color: showReply ? accentColor : 'rgba(255,255,255,0.45)', cursor:'pointer', transition:'all .2s' }}>
          💬 {showReply ? 'Annuler' : 'Répondre'}
        </button>

        {sent && <span style={{ fontSize:11, color:'#4ade80', fontWeight:600 }}>✓ Réponse envoyée</span>}
      </div>

      {/* Zone de réponse */}
      {showReply && (
        <div style={{ marginTop:10, display:'flex', gap:8, alignItems:'flex-start' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg,${accentColor},#FF6B00)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'#000', flexShrink:0, marginTop:2 }}>✍️</div>
          <div style={{ flex:1 }}>
            <textarea placeholder={`Répondre à ${c.user?.name ?? 'ce commentaire'}…`} value={replyText} onChange={e=>setReplyText(e.target.value)} rows={2}
              style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:`1px solid rgba(255,170,0,0.25)`, borderRadius:10, padding:'8px 12px', fontSize:12, color:'#fff', outline:'none', resize:'vertical', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box' as const }}/>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6 }}>
              <button onClick={sendReply} disabled={sending || !replyText.trim()}
                style={{ background:!replyText.trim()?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${accentColor},#FF6B00)`, border:'none', borderRadius:20, padding:'6px 16px', fontSize:12, fontWeight:700, color:!replyText.trim()?'rgba(255,255,255,0.3)':'#000', cursor:!replyText.trim()?'not-allowed':'pointer' }}>
                {sending ? '⏳…' : '↩ Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentsList({ comments, token, apiBase }: { comments: any[]; token: string; apiBase: string }) {
  const color = '#FFAA00';
  return (
    <div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:16 }}>
        {comments.length} commentaire{comments.length!==1?'s':''} reçu{comments.length!==1?'s':''}
      </div>
      {comments.length === 0 ? (
        <div style={{ textAlign:'center' as const, padding:'60px 20px', color:'rgba(255,255,255,0.3)' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
          <p>Aucun commentaire reçu pour l'instant</p>
          <p style={{ fontSize:12, marginTop:8, color:'rgba(255,255,255,0.2)' }}>Les commentaires laissés sur tes vidéos apparaîtront ici</p>
        </div>
      ) : comments.map((c:any, i:number) => (
        <CommentItem key={c.id??i} c={c} token={token} apiBase={apiBase} accentColor={color}/>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [tab,      setTab]      = useState<Tab>('profil');
  const [profile,  setProfile]  = useState<Profile|null>(null);
  const [videos,   setVideos]   = useState<Video[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [privacy,  setPrivacy]  = useState<Privacy>(defaultPrivacy);
  const [form,     setForm]     = useState({ name:'', bio:'', country:'', photo_url:'', stage_name:'', discipline:'' });
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }
    const dec = decodeToken(token);
    if (!dec?.userId) { router.push('/auth/login'); return; }
    const uid = dec.userId;

    Promise.all([
      fetch(`${API}/users/${uid}/profile`,  { headers: { Authorization:`Bearer ${token}` } }).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch(`${API}/users/${uid}/videos`,   { headers: { Authorization:`Bearer ${token}` } }).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch(`${API}/users/privacy`,          { headers: { Authorization:`Bearer ${token}` } }).then(r=>r.ok?r.json():null).catch(()=>null),
      fetch(`${API}/users/${uid}/comments`, { headers: { Authorization:`Bearer ${token}` } }).then(r=>r.ok?r.json():null).catch(()=>null),
    ]).then(([pData, vData, privData, commData]) => {
      const p = pData?.profile ?? pData;
      if (p) {
        setProfile(p);
        setForm({ name:p.name??'', bio:p.bio??'', country:p.country??'', photo_url:p.photo_url??'', stage_name:p.stage_name??'', discipline:p.discipline??'' });
      }
      setVideos(vData?.videos ?? vData ?? []);
      if (privData) setPrivacy(prev => ({ ...prev, ...privData }));
      setComments(commData?.comments ?? commData ?? []);
    }).finally(() => setLoading(false));
  }, [router]);

  const handleSaveProfile = async () => {
    const token = getToken(); if (!token || !profile) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/users/${profile.id}/profile`, {
        method: 'PUT', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ name:form.name.trim(), bio:form.bio, country:form.country, photo_url:form.photo_url, stage_name:form.stage_name, discipline:form.discipline }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Erreur');
      setProfile(p => p ? { ...p, ...form } : p);
      setSaved(true); setTimeout(()=>setSaved(false), 3000);
    } catch(e:any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleSavePrivacy = async () => {
    const token = getToken(); if (!token) return;
    setSaving(true);
    try {
      await fetch(`${API}/users/privacy`, { method:'PUT', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify(privacy) });
      setSaved(true); setTimeout(()=>setSaved(false),3000);
    } catch {} finally { setSaving(false); }
  };

  const inp: React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#fff', outline:'none', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box' };
  const lbl: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:'.5px' };
  const card: React.CSSProperties = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'18px 20px', marginBottom:14 };

  const country = COUNTRIES.find(c=>c.code===form.country);
  const initials = form.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?';
  const approvedVideos = videos.filter(v=>v.status==='approved');

  if (loading) return (
    <div style={{ height:'100vh', background:'#0a0a0f', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)', fontFamily:'DM Sans,sans-serif' }}>
      ⏳ Chargement…
    </div>
  );

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
          <Link href="/compte" style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B00,#FFD700)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, textDecoration:'none', flexShrink:0 }}>
            👤
          </Link>
        </div>
      </div>

      {/* Header profil */}
      <div style={{ background:'linear-gradient(180deg,rgba(255,170,0,0.06) 0%,transparent 100%)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'24px 20px' }}>
        <div style={{ maxWidth:700, margin:'0 auto', display:'flex', alignItems:'center', gap:18 }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            {form.photo_url ? (
              <img src={form.photo_url} alt="avatar" style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', border:`2px solid ${OR}` }}/>
            ) : (
              <div style={{ width:72, height:72, borderRadius:'50%', background:`linear-gradient(135deg,rgba(255,170,0,0.2),rgba(255,107,0,0.1))`, border:`2px solid ${OR}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:700, color:OR, fontFamily:'Syne,sans-serif' }}>
                {initials}
              </div>
            )}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:2 }}>{form.name || '—'}</div>
            {form.stage_name && <div style={{ fontSize:13, color:OR, marginBottom:3 }}>🎭 {form.stage_name}</div>}
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', display:'flex', gap:12 }}>
              {country && <span>{country.flag} {country.name}</span>}
              <span>🎬 {approvedVideos.length} vidéo{approvedVideos.length!==1?'s':''}</span>
              <span>⭐ {videos.reduce((s,v)=>s+(v.vote_count??0),0)} votes</span>
            </div>
          </div>
          {profile && (
            <Link href={`/profil/${profile.id}`} target="_blank"
              style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'7px 14px', fontSize:12, color:'rgba(255,255,255,0.6)', textDecoration:'none', whiteSpace:'nowrap' as const }}>
              👁 Voir mon profil public ↗
            </Link>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ background:'rgba(8,8,15,0.8)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'0 20px', display:'flex', gap:2, overflowX:'auto', scrollbarWidth:'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'14px 16px', background:'none', border:'none', borderBottom:`2px solid ${tab===t.id?OR:'transparent'}`, color:tab===t.id?OR:'rgba(255,255,255,0.4)', fontSize:13, fontWeight:tab===t.id?700:400, cursor:'pointer', whiteSpace:'nowrap' as const, fontFamily:'DM Sans,sans-serif' }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'24px 20px' }}>

        {/* ── Onglet PROFIL ── */}
        {tab==='profil' && (
          <div style={{ display:'flex', flexDirection:'column' as const, gap:14 }}>
            <div style={card}>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:16, fontFamily:'Syne,sans-serif' }}>👤 Informations publiques</div>
              <div style={{ display:'flex', gap:12, marginBottom:12 }}>
                <div style={{ flex:1 }}>
                  <label style={lbl}>Nom affiché *</label>
                  <input style={inp} type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ton nom complet"/>
                </div>
                <div style={{ flex:1 }}>
                  <label style={lbl}>Nom de scène</label>
                  <input style={inp} type="text" value={form.stage_name} onChange={e=>setForm(f=>({...f,stage_name:e.target.value}))} placeholder="MC Kossi, DJ Ama…"/>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={lbl}>Photo de profil (URL)</label>
                <input style={inp} type="url" value={form.photo_url} onChange={e=>setForm(f=>({...f,photo_url:e.target.value}))} placeholder="https://…"/>
              </div>
              <div style={{ display:'flex', gap:12, marginBottom:12 }}>
                <div style={{ flex:1 }}>
                  <label style={lbl}>Pays</label>
                  <select style={{...inp, cursor:'pointer', background:'linear-gradient(135deg,#FFAA00,#FF6B00)', color:'#000', fontWeight:700, border:'none'}} value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))}>
                    <option value="" style={{background:'#fff', color:'#111', fontWeight:400}}>— Sélectionner —</option>
                    {COUNTRIES.map(c=><option key={c.code} value={c.code} style={{background:'#fff', color:'#111', fontWeight:400}}>{c.flag} {c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <label style={lbl}>Discipline principale</label>
                  <select style={{...inp, cursor:'pointer', background:'linear-gradient(135deg,#FFAA00,#FF6B00)', color:'#000', fontWeight:700, border:'none'}} value={form.discipline} onChange={e=>setForm(f=>({...f,discipline:e.target.value}))}>
                    <option value="" style={{background:'#fff', color:'#111', fontWeight:400}}>— Sélectionner —</option>
                    {Object.entries(DISC_EMOJI).map(([k,v])=><option key={k} value={k} style={{background:'#fff', color:'#111', fontWeight:400}}>{v} {k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Bio <span style={{textTransform:'none' as const, fontWeight:400, color:'rgba(255,255,255,0.25)'}}>({form.bio.length}/200)</span></label>
                <textarea style={{...inp, resize:'vertical', minHeight:80}} value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} maxLength={200} placeholder="Quelques mots sur toi, ton style, ta passion…"/>
              </div>
            </div>
            {error && <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#f87171' }}>⚠️ {error}</div>}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:12 }}>
              {saved && <span style={{ fontSize:12, color:'#4ade80', fontWeight:600 }}>✓ Profil enregistré</span>}
              <button onClick={handleSaveProfile} disabled={saving}
                style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'10px 24px', fontSize:13, fontWeight:700, color:'#000', cursor:'pointer', opacity:saving?0.6:1 }}>
                {saving?'⏳…':'💾 Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* ── Onglet VIDEOS ── */}
        {tab==='videos' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>{videos.length} vidéo{videos.length!==1?'s':''}</div>
              <button onClick={()=>router.push('/submit')} style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'8px 18px', fontSize:12, fontWeight:700, color:'#000', cursor:'pointer' }}>
                🎬 + Ajouter
              </button>
            </div>
            {videos.length===0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'rgba(255,255,255,0.3)' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎬</div>
                <p style={{ marginBottom:16 }}>Aucune vidéo soumise</p>
                <button onClick={()=>router.push('/submit')} style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'10px 22px', fontSize:13, fontWeight:700, color:'#000', cursor:'pointer' }}>
                  Soumettre ma première vidéo
                </button>
              </div>
            ) : videos.map(v => {
              const cfg = {
                approved: {bg:'rgba(74,222,128,0.1)', color:'#4ade80', border:'rgba(74,222,128,0.25)', label:'✓ Approuvée'},
                pending:  {bg:'rgba(255,170,0,0.08)', color:OR,        border:'rgba(255,170,0,0.2)',    label:'⏳ En attente'},
                draft:    {bg:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.4)',border:'rgba(255,255,255,0.1)',label:'📝 Brouillon'},
                rejected: {bg:'rgba(248,113,113,0.08)',color:'#f87171',border:'rgba(248,113,113,0.2)', label:'✕ Rejetée'},
              }[v.status as any] ?? {bg:'rgba(255,255,255,0.04)',color:'#fff',border:'rgba(255,255,255,0.08)',label:v.status};
              return (
                <div key={v.id} style={{ ...{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'14px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:12 } }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {DISC_EMOJI[v.discipline?.toLowerCase()??'']??'🎬'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{v.title}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:3 }}>
                      {v.views!==undefined?`👁 ${v.views.toLocaleString('fr-FR')} ·`:''}
                      {v.vote_count!==undefined?` ⭐ ${v.vote_count}`:''}
                    </div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, whiteSpace:'nowrap' as const }}>
                    {cfg.label}
                  </span>
                  {v.status==='approved' && (
                    <button onClick={()=>router.push(`/watch/${v.id}`)} style={{ background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:20, padding:'5px 12px', fontSize:11, color:'rgba(255,255,255,0.5)', cursor:'pointer' }}>▶</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Onglet COMMENTAIRES ── */}
        {tab==='commentaires' && (
          <CommentsList comments={comments} token={getToken()??''} apiBase={API} />
        )}

        {/* ── Onglet CONFIDENTIALITÉ ── */}
        {tab==='confidentialite' && (
          <div>
            <div style={{ background:'rgba(255,170,0,0.04)', border:'1px solid rgba(255,170,0,0.15)', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:12, color:'rgba(255,170,0,0.7)', lineHeight:1.6 }}>
              ℹ️ Ces paramètres contrôlent ce que les autres utilisateurs voient sur ton profil public.
            </div>
            {([
              {key:'name_visible',     icon:'👤', label:'Nom affiché',         desc:'Ton nom visible sur ton profil public'},
              {key:'photo_visible',    icon:'🖼️', label:'Photo de profil',     desc:'Ton avatar visible par tous les visiteurs'},
              {key:'score_visible',    icon:'⭐', label:'Score de votes',      desc:'Nombre de votes reçus visible sur ton profil'},
              {key:'location_visible', icon:'📍', label:'Localisation',        desc:'Ton pays/ville visible sur ton profil'},
              {key:'phone_visible',    icon:'📞', label:'Téléphone',           desc:'Permettre aux fans de te contacter'},
              {key:'email_visible',    icon:'📧', label:'Email',               desc:'Ton adresse email visible sur ton profil'},
            ] as {key:keyof Privacy;icon:string;label:string;desc:string}[]).map(row => (
              <div key={row.key} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, flex:1 }}>
                  <span style={{ fontSize:18 }}>{row.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:2 }}>{row.label}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{row.desc}</div>
                  </div>
                </div>
                <Toggle on={privacy[row.key]} onToggle={()=>setPrivacy(p=>({...p,[row.key]:!p[row.key]}))}/>
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:12, marginTop:16 }}>
              {saved && <span style={{ fontSize:12, color:'#4ade80', fontWeight:600 }}>✓ Préférences enregistrées</span>}
              <button onClick={handleSavePrivacy} disabled={saving}
                style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'10px 24px', fontSize:13, fontWeight:700, color:'#000', cursor:'pointer', opacity:saving?0.6:1 }}>
                {saving?'⏳…':'💾 Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* ── Onglet APERÇU PUBLIC ── */}
        {tab==='apercu' && (
          <div>
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, overflow:'hidden' }}>
              {/* Banner */}
              <div style={{ height:80, background:`linear-gradient(135deg,rgba(255,170,0,0.2),rgba(255,107,0,0.1))`, position:'relative' }}/>
              <div style={{ padding:'0 20px 20px' }}>
                <div style={{ marginTop:-32, marginBottom:12 }}>
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="avatar" style={{ width:64, height:64, borderRadius:'50%', objectFit:'cover', border:`3px solid #0a0a0f` }}/>
                  ) : (
                    <div style={{ width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg,rgba(255,170,0,0.3),rgba(255,107,0,0.2))`, border:`3px solid #0a0a0f`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:OR }}>
                      {initials}
                    </div>
                  )}
                </div>
                {privacy.name_visible && <div style={{ fontSize:18, fontWeight:800, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:3 }}>{form.name||'—'}</div>}
                {form.stage_name && <div style={{ fontSize:13, color:OR, marginBottom:6 }}>🎭 {form.stage_name}</div>}
                {form.bio && <div style={{ fontSize:13, color:'rgba(255,255,255,0.55)', lineHeight:1.6, marginBottom:10 }}>{form.bio}</div>}
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' as const, marginBottom:14 }}>
                  {privacy.location_visible && form.country && (
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{COUNTRIES.find(c=>c.code===form.country)?.flag} {COUNTRIES.find(c=>c.code===form.country)?.name}</span>
                  )}
                  {form.discipline && <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{DISC_EMOJI[form.discipline]} {form.discipline.charAt(0).toUpperCase()+form.discipline.slice(1)}</span>}
                </div>
                <div style={{ display:'flex', gap:16 }}>
                  {privacy.score_visible && <div style={{ textAlign:'center' as const }}><div style={{ fontSize:18, fontWeight:800, color:OR }}>{videos.reduce((s,v)=>s+(v.vote_count??0),0)}</div><div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Votes reçus</div></div>}
                  <div style={{ textAlign:'center' as const }}><div style={{ fontSize:18, fontWeight:800, color:'#fff' }}>{approvedVideos.length}</div><div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Vidéos</div></div>
                </div>
              </div>
            </div>
            <div style={{ marginTop:14, textAlign:'center' as const }}>
              {profile && (
                <Link href={`/profil/${profile.id}`} target="_blank"
                  style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'10px 24px', fontSize:13, fontWeight:700, color:'#000', textDecoration:'none', display:'inline-block' }}>
                  Voir mon profil public complet ↗
                </Link>
              )}
            </div>
          </div>
        )}

      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}>
        <TickerBand />
      </div>
    </div>
  );
}
