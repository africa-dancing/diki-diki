'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// ── TickerBand inline ─────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const DEFAULT_MSGS = [
  '📢 Bienvenue sur Diki-Diki Vision — La scène des talents africains !',
  '💰 Rechargez votre compte pour voter et soutenir vos candidats',
  '🎬 Soumettez votre vidéo et participez aux prochaines compétitions',
];
function TickerBand() {
  const [msgs, setMsgs] = useState(DEFAULT_MSGS);
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef   = useRef(0);
  const rafRef   = useRef(0);
  const pausedRef = useRef(false);
  useEffect(() => {
    fetch(`${API_URL}/ticker`).then(r=>r.ok?r.json():null).then(d=>{ if(d?.messages?.length) setMsgs(d.messages.map((m: any)=>m.message??m)); }).catch(()=>{});
  }, []);
  useEffect(() => {
    const track = trackRef.current; if (!track) return;
    const step = () => {
      if (!pausedRef.current) {
        posRef.current -= 0.6;
        if (Math.abs(posRef.current) >= track.scrollWidth / 2) posRef.current = 0;
        track.style.transform = `translateX(${posRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [msgs]);
  const text = msgs.join('   ●   ');
  return (
    <div style={{ background:'#FF6B00', height:34, display:'flex', alignItems:'center', overflow:'hidden', borderTop:'1px solid rgba(0,0,0,0.15)', flexShrink:0 }}
      onMouseEnter={()=>{pausedRef.current=true;}} onMouseLeave={()=>{pausedRef.current=false;}}>
      <div style={{ background:'rgba(0,0,0,0.2)', padding:'0 12px', height:'100%', display:'flex', alignItems:'center', flexShrink:0, borderRight:'1px solid rgba(0,0,0,0.15)' }}>
        <span style={{ fontSize:15 }}>📢</span>
      </div>
      <div style={{ flex:1, overflow:'hidden' }}>
        <div ref={trackRef} style={{ display:'inline-block', whiteSpace:'nowrap', fontSize:13, fontWeight:700, color:'#000', fontFamily:'DM Sans, sans-serif', willChange:'transform' }}>
          {`${text}   ●   ${text}   ●   `}
        </div>
      </div>
    </div>
  );
}

// ── Devise inline ─────────────────────────────────────────────────
interface CurrencyConfig { code:string; symbol:string; rate:number; locale:string; name:string; }
function detectCurrency(): CurrencyConfig {
  if (typeof window === 'undefined') return { code:'XOF', symbol:'F CFA', rate:1, locale:'fr-CI', name:'Franc CFA' };
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  if (tz.includes('Paris') || tz.includes('Europe')) return { code:'EUR', symbol:'€', rate:0.00152, locale:'fr-FR', name:'Euro' };
  if (tz.includes('London'))  return { code:'GBP', symbol:'£', rate:0.00130, locale:'en-GB', name:'Livre sterling' };
  if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles')) return { code:'USD', symbol:'$', rate:0.00164, locale:'en-US', name:'Dollar' };
  if (tz.includes('Lagos'))   return { code:'NGN', symbol:'₦', rate:2.50, locale:'en-NG', name:'Naira' };
  return { code:'XOF', symbol:'F CFA', rate:1, locale:'fr-CI', name:'Franc CFA' };
}
function formatAmount(xof: number, cur: CurrencyConfig): string {
  if (cur.rate === 1) return xof >= 1000 ? `${(xof/1000).toFixed(xof%1000===0?0:1)}k ${cur.symbol}` : `${xof} ${cur.symbol}`;
  const v = Math.round(xof * cur.rate * 10) / 10;
  return v >= 1000 ? `${cur.symbol}${(v/1000).toFixed(1)}k` : `${cur.symbol}${v}`;
}

// ── Sélecteur de langue inline ────────────────────────────────────
const LANGS = [
  { code:'fr', label:'Français', flag:'🇫🇷' }, { code:'en', label:'English', flag:'🇬🇧' },
  { code:'ar', label:'العربية',  flag:'🇸🇦' }, { code:'pt', label:'Português', flag:'🇧🇷' },
  { code:'es', label:'Español',  flag:'🇪🇸' }, { code:'ha', label:'Hausa', flag:'🇳🇬' },
  { code:'sw', label:'Kiswahili',flag:'🇰🇪' }, { code:'de', label:'Deutsch', flag:'🇩🇪' },
];
function TranslateWidget() {
  const [open, setOpen] = useState(false);
  const [cur, setCur]   = useState(LANGS[0]);
  useEffect(() => {
    const saved = localStorage.getItem('dkdk_lang');
    if (saved) { const f = LANGS.find(l => l.code === saved); if (f) setCur(f); }
  }, []);
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [open]);
  const select = (lang: typeof LANGS[0]) => {
    setCur(lang); setOpen(false); localStorage.setItem('dkdk_lang', lang.code);
    document.cookie = `googtrans=/fr/${lang.code}; path=/`;
    if (lang.code === 'fr') { document.cookie='googtrans=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/'; window.location.reload(); return; }
    if (!(window as any).google?.translate) {
      (window as any).googleTranslateElementInit = () => { new (window as any).google.translate.TranslateElement({ pageLanguage:'fr', autoDisplay:false }, 'gt-c'); };
      if (!document.getElementById('gt-s')) { const s = document.createElement('script'); s.id='gt-s'; s.src='//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; document.head.appendChild(s); }
    }
    setTimeout(() => { const sel = document.querySelector<HTMLSelectElement>('.goog-te-combo'); if (sel) { sel.value=lang.code; sel.dispatchEvent(new Event('change')); } }, 900);
  };
  return (
    <div style={{ position:'relative', flexShrink:0 }} onClick={e=>e.stopPropagation()}>
      <button onClick={()=>setOpen(o=>!o)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'5px 10px', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, fontFamily:'DM Sans, sans-serif' }}>
        <span style={{ fontSize:14 }}>{cur.flag}</span><span>{cur.label}</span><span style={{ fontSize:9, opacity:0.5 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:38, right:0, background:'#12121e', border:'1px solid rgba(255,170,0,0.2)', borderRadius:14, padding:6, zIndex:300, minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
          {LANGS.map(l => (
            <button key={l.code} onClick={()=>select(l)} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'8px 12px', background:cur.code===l.code?'rgba(255,170,0,0.1)':'none', border:'none', borderRadius:8, color:cur.code===l.code?'#FFAA00':'#f0f0f0', fontSize:13, cursor:'pointer', fontFamily:'DM Sans, sans-serif', textAlign:'left' as const }}>
              <span>{l.flag}</span><span>{l.label}</span>{cur.code===l.code&&<span style={{ marginLeft:'auto', fontSize:10 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
      <div id="gt-c" style={{ display:'none' }} />
    </div>
  );
}

// ── Pavé numérique ────────────────────────────────────────────────
function NumKeypad({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  const handleKey = (k: string) => {
    if (k === '⌫') {
      const s = String(value).slice(0, -1);
      onChange(Math.max(1, parseInt(s) || 1));
    } else {
      const current = value === 1 ? '' : String(value);
      const s = current + k;
      const n = parseInt(s);
      if (!isNaN(n) && n > 0) onChange(Math.min(n, max || 9999));
    }
  };
  const keys = ['1','2','3','4','5','6','7','8','9','0','⌫'];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:3 }}>
      {keys.map(k => (
        <button key={k} onClick={() => handleKey(k)}
          style={{ gridColumn: k === '0' ? '1/3' : 'auto', padding:'6px 4px', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:7, background:'rgba(255,255,255,0.05)', fontSize:13, fontWeight:500, color: k === '⌫' ? '#f87171' : '#f0f0f0', cursor:'pointer', textAlign:'center', fontFamily:'DM Sans, sans-serif' }}>
          {k}
        </button>
      ))}
    </div>
  );
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

interface Video {
  id: string; title: string; description?: string; storage_url: string;
  status: string; created_at: string; discipline?: string;
  track_title?: string; track_artist?: string; track_genre?: string; views?: number;
  contest_id?: string;
}
interface Candidate {
  id: string; user_id: string; name?: string; stage_name?: string;
  discipline?: string; video_id?: string; position?: number; contest_id?: string;
}
interface Comment { id: string; content: string; created_at: string; }

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('dkdk_token');
}
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
}
function pad(n: number) { return String(n).padStart(3, '0'); }

const EMOJIS = ['😂','❤️','🔥','👏','🎉','😍','💪','🏆','👑','✨','🎵','🙌'];
const ADS = [
  { emoji: '🎵', label: 'Deezer Premium', color: '#A238FF' },
  { emoji: '🛍️', label: 'Jumia Deals',    color: '#FF6B00' },
  { emoji: '📱', label: 'MTN Mobile',      color: '#FFD700' },
  { emoji: '✈️', label: 'Air CI',          color: '#006400' },
  { emoji: '🎮', label: 'PlayStation',     color: '#003087' },
  { emoji: '💄', label: 'Beauty Pro',      color: '#FF1493' },
];

const HEADER_H     = 60;
const BAND_H       = 100;
const NAV_H        = 70;
const TICKER_H     = 34;
const FOOTER_H     = BAND_H + TICKER_H + NAV_H;
const PLAYER_TOP   = HEADER_H + 8;
const PLAYER_MAX_W = 440;
const BTN_COL_W    = 80;
const BTN_COL_LEFT = `calc(50% + ${PLAYER_MAX_W / 2}px + 4px)`;
const HERO_LEFT    = `calc(50% + ${PLAYER_MAX_W / 2}px + ${BTN_COL_W + 8}px)`;

function OverlayBtn({ children, label, onClick, active = false, activeColor = 'rgba(255,255,255,0.15)', badge, locked }: {
  children: React.ReactNode; label: string; onClick: () => void;
  active?: boolean; activeColor?: string; badge?: number; locked?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ position: 'relative' }}>
        <button onClick={onClick} style={{ width: 34, height: 34, borderRadius: '50%', background: locked ? 'rgba(10,10,20,0.8)' : (active ? activeColor : 'rgba(15,15,25,0.9)'), border: locked ? '1.5px solid rgba(255,80,80,0.25)' : '1.5px solid rgba(255,255,255,0.18)', color: locked ? 'rgba(255,255,255,0.3)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' as const }}>{children}</button>
        {badge !== undefined && badge > 0 && (
          <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: '#FFAA00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#000', padding: '0 3px' }}>{badge}</div>
        )}
        {locked && (
          <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,80,80,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>🔒</div>
        )}
      </div>
      <span style={{ fontSize: 9, color: locked ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.65)', textAlign: 'center' as const, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>{label}</span>
    </div>
  );
}

function LoginPopup({ message, onLogin, onClose }: { message: string; onLogin: () => void; onClose: () => void; }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={onClose}>
      <div style={{ background: '#12121e', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 20, padding: '28px 24px', maxWidth: 320, width: '90%', textAlign: 'center' as const }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: 8 }}>Connexion requise</h3>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onLogin} style={{ background: 'linear-gradient(135deg, #FFAA00, #FF6B00)', border: 'none', borderRadius: 50, padding: '9px 20px', fontSize: '0.8rem', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Se connecter</button>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50, padding: '9px 16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [video, setVideo]                   = useState<Video | null>(null);
  const [competitionVideos, setCompetitionVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentVideo, setCurrentVideo]     = useState<Video | null>(null);
  const [candidates, setCandidates]         = useState<Candidate[]>([]);
  const [otherCandidates, setOtherCandidates] = useState<Candidate[]>([]);
  const [comments, setComments]             = useState<Comment[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  // ── Compte Soutenir (unités) ──
  const [wallet, setWallet]                 = useState<number | null>(null); // en F CFA
  const [soutenirUnits, setSoutenirUnits]   = useState(0);                   // en unités (wallet / 100)
  const [voteCount, setVoteCount]           = useState<number | null>(null);

  // ── Claviers étoiles / cœurs ──
  const [starsQty, setStarsQty]             = useState(1);
  const [heartsQty, setHeartsQty]           = useState(1);
  const [activeTab, setActiveTab]           = useState<'stars'|'hearts'>('stars');

  const [myVotesOnVideo, setMyVotesOnVideo] = useState(0);  // nb étoiles envoyées
  const [likeCount, setLikeCount]           = useState(0);   // nb cœurs envoyés
  const [liked, setLiked]                   = useState(false);

  const [voteLoading, setVoteLoading]       = useState(false);
  const [likeLoading, setLikeLoading]       = useState(false);
  const [voteSuccess, setVoteSuccess]       = useState(false);
  const [voteError, setVoteError]           = useState<string | null>(null);

  // ── S'abonner ──
  const [subscribed, setSubscribed]         = useState(false);
  const [subscribing, setSubscribing]       = useState(false);

  const [currency, setCurrency]             = useState<CurrencyConfig>({ code:'XOF', symbol:'F CFA', name:'Franc CFA', rate:1, locale:'fr-CI' });
  const [showComments, setShowComments]     = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showShareMenu, setShowShareMenu]   = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [loginPopupMsg, setLoginPopupMsg]   = useState('');
  const [newComment, setNewComment]         = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [adIndex, setAdIndex]               = useState(0);
  const [expanded, setExpanded]             = useState(false);
  const [playing, setPlaying]               = useState(false);
  const [progress, setProgress]             = useState(0);
  const [duration, setDuration]             = useState(0);
  const [muted, setMuted]                   = useState(false);
  const [showControls, setShowControls]     = useState(true);

  const videoRef      = useRef<HTMLVideoElement>(null);
  const bandRef       = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  const isLoggedIn = () => !!getToken();

  const requireLogin = (msg: string) => {
    setLoginPopupMsg(msg);
    setShowLoginPopup(true);
  };

  useEffect(() => {
    const t = setInterval(() => setAdIndex(i => (i + 1) % ADS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const band = bandRef.current; if (!band) return;
    scrollTimer.current = setInterval(() => {
      if (!band) return;
      if (band.scrollLeft >= band.scrollWidth - band.clientWidth - 2) band.scrollLeft = 0;
      else band.scrollLeft += 1.2;
    }, 20);
    return () => { if (scrollTimer.current) clearInterval(scrollTimer.current); };
  }, [otherCandidates]);

  // ── Charger solde Compte Soutenir ──
  useEffect(() => {
    const token = getToken(); if (!token) return;
    fetch(`${API}/votes/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          const bal = d.wallet ?? d.balance ?? 0;
          setWallet(bal);
          setSoutenirUnits(Math.floor(bal / 100));
          setVoteCount(d.votes_count ?? d.voteCount ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const fetchVideo = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API}/videos/${id}`, { headers });
      if (!res.ok) throw new Error('Vidéo introuvable');
      const data = await res.json();
      const v = data.video ?? data;
      setVideo(v); setCurrentVideo(v);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [id]);

  const fetchCandidates = useCallback(async () => {
    try {
      const res = await fetch(`${API}/videos/${id}/candidates`);
      if (!res.ok) return;
      const data = await res.json();
      const cands: Candidate[] = data.candidates ?? [];
      setCandidates(cands);
      const videoPromises = cands.filter(c => c.video_id).map(c =>
        fetch(`${API}/videos/${c.video_id}`).then(r => r.ok ? r.json() : null).catch(() => null)
      );
      const results = await Promise.all(videoPromises);
      const vids: Video[] = results.filter(Boolean).map(d => d.video ?? d).filter((v): v is Video => !!v?.id);
      if (vids.length > 0) {
        setCompetitionVideos(vids);
        const idx = vids.findIndex(v => v.id === id);
        setCurrentVideoIndex(idx >= 0 ? idx : 0);
      }
    } catch {}
  }, [id]);

  const fetchOtherCandidates = useCallback(async () => {
    try {
      const res = await fetch(`${API}/contests`);
      if (!res.ok) return;
      const data = await res.json();
      const contests = data.contests ?? data ?? [];
      const currentContestId = video?.contest_id;
      const others: Candidate[] = [];
      for (const contest of contests) {
        if (contest.id === currentContestId) continue;
        try {
          const r = await fetch(`${API}/contests/${contest.id}/candidates`);
          if (!r.ok) continue;
          const d = await r.json();
          const cands = (d.candidates ?? []).map((c: Candidate) => ({ ...c, contest_id: contest.id, discipline: contest.discipline }));
          others.push(...cands);
        } catch {}
      }
      setOtherCandidates(others);
    } catch {}
  }, [video?.contest_id]);

  const fetchComments = useCallback(async (vid: string) => {
    try {
      const res = await fetch(`${API}/videos/${vid}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {}
  }, []);

  useEffect(() => { fetchVideo(); }, [fetchVideo]);
  useEffect(() => { if (video) { fetchCandidates(); fetchOtherCandidates(); fetchComments(id); } }, [video, fetchCandidates, fetchOtherCandidates, fetchComments, id]);

  const goTo = (index: number) => {
    if (index < 0 || index >= competitionVideos.length) return;
    const v = competitionVideos[index];
    setCurrentVideoIndex(index); setCurrentVideo(v);
    setProgress(0); setPlaying(false); setMyVotesOnVideo(0);
    fetchComments(v.id);
    if (videoRef.current) { videoRef.current.src = v.storage_url; videoRef.current.load(); }
  };

  useEffect(() => { setCurrency(detectCurrency()); }, []);

  // ── VOTER — envoyer des ⭐ étoiles (connectés uniquement) ─────────
  const handleSendStars = async () => {
    if (!isLoggedIn()) { requireLogin('Connectez-vous pour voter et envoyer des étoiles à ce candidat.'); return; }
    if (starsQty < 1) return;
    if (soutenirUnits < starsQty) {
      setVoteError(`Solde insuffisant. Tu as ${soutenirUnits} unité${soutenirUnits > 1 ? 's' : ''} sur ton Compte Soutenir.`);
      setTimeout(() => setVoteError(null), 4000); return;
    }
    if (voteLoading) return;
    const vidId = currentVideo?.id ?? id;
    setVoteLoading(true);
    try {
      const res = await fetch(`${API}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ video_id: vidId, amount: starsQty * 100, type: 'star' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erreur');
      setMyVotesOnVideo(v => v + starsQty);
      setSoutenirUnits(u => u - starsQty);
      setWallet(w => w !== null ? w - starsQty * 100 : w);
      setVoteSuccess(true);
      setTimeout(() => setVoteSuccess(false), 1500);
    } catch (e: unknown) {
      setVoteError((e as Error).message);
      setTimeout(() => setVoteError(null), 4000);
    } finally { setVoteLoading(false); }
  };

  // ── LIKER — envoyer des ❤️ cœurs (connectés uniquement) ──────────
  const handleSendHearts = async () => {
    if (!isLoggedIn()) { requireLogin('Connectez-vous pour liker et envoyer des cœurs à ce candidat.'); return; }
    if (heartsQty < 1) return;
    if (soutenirUnits < heartsQty) {
      setVoteError(`Solde insuffisant. Tu as ${soutenirUnits} unité${soutenirUnits > 1 ? 's' : ''} sur ton Compte Soutenir.`);
      setTimeout(() => setVoteError(null), 4000); return;
    }
    if (likeLoading) return;
    const vidId = currentVideo?.id ?? id;
    setLikeLoading(true);
    try {
      await fetch(`${API}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ video_id: vidId, amount: heartsQty * 100, type: 'heart' }),
      });
      setLiked(true);
      setLikeCount(c => c + heartsQty);
      setSoutenirUnits(u => u - heartsQty);
      setWallet(w => w !== null ? w - heartsQty * 100 : w);
    } catch {
      // rollback silencieux
    } finally { setLikeLoading(false); }
  };

  // ── S'ABONNER ─────────────────────────────────────────────────────
  const handleSubscribe = async () => {
    if (!isLoggedIn()) {
      requireLogin('Créez un compte gratuit pour suivre ce candidat et ne rien manquer de ses prestations.');
      return;
    }
    if (subscribing) return;
    setSubscribing(true);
    const next = !subscribed;
    setSubscribed(next);
    try {
      const vidId = currentVideo?.id ?? id;
      await fetch(`${API}/videos/${vidId}/follow`, {
        method: next ? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      setSubscribed(!next);
    } finally { setSubscribing(false); }
  };

  // ── TÉLÉCHARGER ───────────────────────────────────────────────────
  const handleDownload = () => {
    if (!isLoggedIn()) { requireLogin('Connectez-vous pour télécharger cette vidéo dans votre espace.'); return; }
    const url = currentVideo?.storage_url ?? video?.storage_url;
    if (url) { const a = document.createElement('a'); a.href = url; a.download = currentVideo?.title ?? 'video'; a.click(); }
  };

  const handleComment = async () => {
    const token = getToken();
    if (!token) { requireLogin('Connectez-vous pour laisser un commentaire.'); return; }
    if (!newComment.trim()) return;
    const vidId = currentVideo?.id ?? id;
    setCommentLoading(true);
    try {
      const res = await fetch(`${API}/videos/${vidId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contenu: newComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erreur');
      setComments(prev => [data.comment ?? data, ...prev]);
      setNewComment('');
    } catch {} finally { setCommentLoading(false); }
  };

  const addEmoji = (emoji: string) => { setNewComment(prev => prev + emoji); setShowEmojiPicker(false); textareaRef.current?.focus(); };

  const pageUrl   = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `🎬 Regardez cette prestation sur Diki-Diki : ${currentVideo?.title ?? ''} — ${pageUrl}`;

  const handleShare = () => { setShowShareMenu(!showShareMenu); setShowComments(false); };

  const handleAjouter = () => {
    if (!isLoggedIn()) { requireLogin('Connectez-vous pour soumettre une vidéo ou un projet sur Diki-Diki Vision.'); return; }
    router.push('/submit');
  };

  const shareWhatsApp = () => { window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank'); setShowShareMenu(false); };
  const shareFacebook = () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, '_blank'); setShowShareMenu(false); };
  const copyLink = async () => { await navigator.clipboard.writeText(pageUrl); setCopied(true); setShowShareMenu(false); setTimeout(() => setCopied(false), 2000); };

  const resetTimer = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };
  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
    resetTimer();
  };
  const fmtTime = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  const closeAll = () => { setShowShareMenu(false); setShowEmojiPicker(false); };

  const playerH      = `calc(100vh - ${PLAYER_TOP}px - ${FOOTER_H}px - 16px)`;
  const playerLeft   = expanded ? '0px' : '50%';
  const playerTransf = expanded ? 'none' : 'translateX(-50%)';
  const playerW      = expanded ? BTN_COL_LEFT : '100%';
  const playerMaxW   = expanded ? 'none' : `${PLAYER_MAX_W}px`;
  const playerRadius = expanded ? '0px' : '16px';

  const displayVideo = currentVideo ?? video;
  const totalInComp  = competitionVideos.length;
  const hasPrev      = currentVideoIndex > 0;
  const hasNext      = currentVideoIndex < totalInComp - 1;
  const loggedIn     = isLoggedIn();

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={s.logoInline}><span style={s.logoDiki}>Diki</span><span style={s.logoDash}>-</span><span style={s.logoDiki}>Diki</span></div>
    </div>
  );
  if (error || !displayVideo) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={s.logoInline}><span style={s.logoDiki}>Diki</span><span style={s.logoDash}>-</span><span style={s.logoDiki}>Diki</span></div>
      <div style={{ fontSize: 44 }}>😕</div>
      <p style={{ color: '#ff6b6b', fontFamily: 'Syne, sans-serif' }}>{error ?? 'Vidéo introuvable'}</p>
    </div>
  );

  return (
    <div style={{ ...s.page, paddingTop: HEADER_H, paddingBottom: FOOTER_H }} onClick={closeAll}>

      {showLoginPopup && (
        <LoginPopup
          message={loginPopupMsg}
          onLogin={() => { setShowLoginPopup(false); router.push('/auth/login'); }}
          onClose={() => setShowLoginPopup(false)}
        />
      )}

      {/* ── TOPBAR ── */}
      <div style={{ ...s.fixedHeader, height: HEADER_H }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.25rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#FFAA00' }}>Diki</span>
            <span style={{ color: '#fff', margin: '0 3px', fontWeight: 900 }}>-</span>
            <span style={{ color: '#FFAA00' }}>Diki</span>
          </span>
          <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#fff', border: '1px solid #fff', borderRadius: 3, padding: '1px 4px', letterSpacing: '0.08em' }}>VISION</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TranslateWidget />
          {/* Affichage Compte Soutenir si connecté */}
          {loggedIn && wallet !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 20, padding: '5px 12px' }}>
              <span>🏅</span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FFAA00', fontFamily: 'Syne, sans-serif' }}>{soutenirUnits} unités</span>
                <span style={{ fontSize: 9, color: 'rgba(255,170,0,0.6)', fontFamily: 'DM Sans, sans-serif' }}>Compte Soutenir</span>
              </div>
            </div>
          )}
          <button onClick={() => router.push('/compte')} style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B00,#FFD700)', border:'none', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, cursor:'pointer', flexShrink:0 }}>
            👤
          </button>
        </div>
      </div>

      {/* ── LECTEUR ── */}
      <div
        style={{ position: 'fixed', top: PLAYER_TOP, left: playerLeft, transform: playerTransf, width: playerW, maxWidth: playerMaxW, height: playerH, borderRadius: playerRadius, overflow: 'hidden', background: '#000', cursor: 'pointer', zIndex: 50, transition: 'all 0.35s cubic-bezier(.4,0,.2,1)' }}
        onMouseMove={resetTimer} onClick={togglePlay}
      >
        <video ref={videoRef} src={displayVideo.storage_url} style={s.video}
          onTimeUpdate={() => { const v = videoRef.current; if (v) setProgress(v.currentTime); }}
          onLoadedMetadata={() => { const v = videoRef.current; if (v) setDuration(v.duration); }}
          onEnded={() => { setPlaying(false); if (hasNext) goTo(currentVideoIndex + 1); }}
          playsInline
        />
        {totalInComp > 1 && (
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, zIndex: 10 }}>
            {competitionVideos.map((_, i) => (
              <div key={i} onClick={e => { e.stopPropagation(); goTo(i); }} style={{ width: 22, height: 3, borderRadius: 2, background: i === currentVideoIndex ? '#FFAA00' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'background 0.3s' }} />
            ))}
          </div>
        )}
        {candidates.length > 0 && (
          <div style={{ position: 'absolute', top: 24, left: 10, background: 'rgba(255,170,0,0.15)', border: '1px solid rgba(255,170,0,0.35)', borderRadius: 20, padding: '3px 10px', fontSize: 8, color: '#FFAA00', fontWeight: 700, zIndex: 10 }}>
            🏆 {candidates[currentVideoIndex]?.stage_name ?? candidates[currentVideoIndex]?.name ?? ''} · {currentVideoIndex + 1}/{totalInComp}
          </div>
        )}
        {hasPrev && (
          <button onClick={e => { e.stopPropagation(); goTo(currentVideoIndex - 1); }}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        {hasNext && (
          <button onClick={e => { e.stopPropagation(); goTo(currentVideoIndex + 1); }}
            style={{ position: 'absolute', right: 56, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
        <div style={s.videoOverlay}>
          {displayVideo.discipline && <span style={s.disciplineBadge}>🎭 {displayVideo.discipline}</span>}
          <h2 style={s.overlayTitle}>{displayVideo.title}</h2>
          {displayVideo.track_title && <p style={s.overlayTrack}>🎵 {displayVideo.track_title}{displayVideo.track_artist && ` — ${displayVideo.track_artist}`}</p>}
          <p style={s.overlayMeta}>{timeAgo(displayVideo.created_at)}</p>
        </div>
        <div style={{ ...s.progressOverlay, opacity: showControls ? 1 : 0 }} onClick={e => e.stopPropagation()}>
          <div style={s.progressRow}>
            <span style={s.timeText}>{fmtTime(progress)}</span>
            <input type="range" min={0} max={duration || 1} step={0.1} value={progress}
              onChange={e => { const v = videoRef.current; if (!v) return; v.currentTime = +e.target.value; setProgress(+e.target.value); }}
              style={s.progressBar} />
            <span style={s.timeText}>{fmtTime(duration)}</span>
            <button style={s.ctrlBtn} onClick={togglePlay}>{playing ? <PauseIcon /> : <PlayIcon />}</button>
            <button style={s.ctrlBtn} onClick={() => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); }}>{muted ? <MuteIcon /> : <VolumeIcon />}</button>
            <button style={s.ctrlBtn} onClick={e => { e.stopPropagation(); setExpanded(ex => !ex); }}>{expanded ? <ExitFsIcon /> : <FsIcon />}</button>
          </div>
        </div>
        {!playing && <div style={s.playOverlay}><div style={s.playBubble}><BigPlay /></div></div>}
      </div>

      {/* ── BANDE BOUTONS FIXE ── */}
      <div
        style={{ position: 'fixed', top: PLAYER_TOP, left: BTN_COL_LEFT, width: BTN_COL_W, height: playerH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 55, background: 'rgba(8,8,20,0.65)', borderLeft: '1px solid rgba(255,255,255,0.04)', padding: '0 4px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* S'ABONNER — visiteurs */}
        {!loggedIn && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <button onClick={handleSubscribe} style={{ width: 34, height: 34, borderRadius: '50%', background: subscribed ? 'rgba(255,170,0,0.2)' : 'rgba(15,15,25,0.9)', border: `1.5px solid ${subscribed ? '#FFAA00' : 'rgba(255,255,255,0.18)'}`, color: subscribed ? '#FFAA00' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SubscribeIcon active={subscribed} />
            </button>
            <span style={{ fontSize: 9, color: subscribed ? '#FFAA00' : 'rgba(255,255,255,0.65)', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
              {subscribed ? 'Abonné' : "S'abonner"}
            </span>
          </div>
        )}

        {/* VOTER ⭐ — connectés uniquement (indicateur, action dans le panel droit) */}
        {loggedIn && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ position: 'relative' }}>
              <button onClick={handleSendStars} style={{ width: 34, height: 34, borderRadius: '50%', background: myVotesOnVideo > 0 ? 'rgba(255,170,0,0.2)' : 'rgba(15,15,25,0.9)', border: `1.5px solid ${myVotesOnVideo > 0 ? '#FFAA00' : 'rgba(255,255,255,0.18)'}`, color: '#fff', cursor: voteLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: voteLoading ? 0.6 : 1 }}>
                {voteLoading ? <SpinIcon /> : <VoteIcon active={myVotesOnVideo > 0} />}
              </button>
              {myVotesOnVideo > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: '#FFAA00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#000', padding: '0 3px' }}>{myVotesOnVideo}</div>
              )}
            </div>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: 'DM Sans, sans-serif' }}>Voter</span>
          </div>
        )}

        {/* LIKER ❤️ — connectés uniquement (visiteurs voient popup connexion) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                if (!isLoggedIn()) { requireLogin('Connectez-vous pour envoyer des cœurs à ce candidat.'); return; }
                handleSendHearts();
              }}
              style={{ width: 34, height: 34, borderRadius: '50%', background: liked ? 'rgba(255,80,80,0.2)' : 'rgba(15,15,25,0.9)', border: `1.5px solid ${liked ? '#ff4444' : 'rgba(255,255,255,0.18)'}`, color: '#fff', cursor: likeLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: likeLoading ? 0.6 : 1 }}>
              {likeLoading ? <SpinIcon /> : <LikeIcon liked={liked} />}
            </button>
            {likeCount > 0 && (
              <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', padding: '0 3px' }}>{likeCount}</div>
            )}
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: 'DM Sans, sans-serif' }}>Liker</span>
        </div>

        {/* COMMENTER */}
        <OverlayBtn label={`${comments.length}`} active={showComments} onClick={() => { setShowComments(!showComments); setShowEmojiPicker(false); setShowShareMenu(false); }} activeColor="rgba(255,154,0,0.2)">
          <span style={{ fontSize: 18 }}>💬</span>
        </OverlayBtn>

        {/* REMIX */}
        <OverlayBtn label="Remix" onClick={() => alert('Bientôt !')}><RemixIcon /></OverlayBtn>

        {/* PARTAGER */}
        <div style={{ position: 'relative' }}>
          <OverlayBtn label="Partager" active={showShareMenu} onClick={handleShare} activeColor="rgba(255,154,0,0.2)"><ShareIcon /></OverlayBtn>
          {showShareMenu && (
            <div style={s.shareMenu} onClick={e => e.stopPropagation()}>
              <button style={s.shareMenuItem} onClick={shareWhatsApp}><WaIcon /> WhatsApp</button>
              <button style={s.shareMenuItem} onClick={shareFacebook}><FbIcon /> Facebook</button>
              <button style={s.shareMenuItem} onClick={copyLink}><LinkIcon /> {copied ? '✓ Copié !' : 'Copier le lien'}</button>
            </div>
          )}
        </div>

        {/* TÉLÉCHARGER — connectés uniquement */}
        {loggedIn && (
          <OverlayBtn label="Télécharger" onClick={handleDownload}><DownloadIcon /></OverlayBtn>
        )}
      </div>

      {/* ── PANEL DROIT : CLAVIERS NUMÉRIQUES ou INVITE VISITEUR ── */}
      <div
        style={{ position: 'fixed', top: PLAYER_TOP, left: HERO_LEFT, right: 0, height: playerH, overflowY: 'hidden', zIndex: 49, padding: '8px 10px' }}
        onClick={e => e.stopPropagation()}
      >
        {loggedIn ? (
          <>
            {/* Solde Compte Soutenir */}
            <div style={{ background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.22)', borderRadius: 10, padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <div>
                <div style={{ fontSize: 8, color: 'rgba(255,170,0,0.7)', fontWeight: 700, letterSpacing: '.08em', marginBottom: 1 }}>COMPTE SOUTENIR</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#FFAA00', fontFamily: 'Syne, sans-serif' }}>{soutenirUnits} unités</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>1 unité = 10 F CFA</div>
              </div>
              <span style={{ fontSize: 18 }}>🏅</span>
            </div>

            {/* Messages erreur / succès */}
            {voteError && <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#f87171', marginBottom: 8 }}>⚠️ {voteError}</div>}
            {voteSuccess && <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#4ade80', marginBottom: 8 }}>⭐ {starsQty} étoile{starsQty > 1 ? 's' : ''} envoyée{starsQty > 1 ? 's' : ''} !</div>}

            {/* Clavier unique — onglets ⭐ / ❤️ */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 10px' }}>

              {/* Onglets */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {[
                  { key: 'stars',  icon: '⭐', label: 'Voter',  color: '#FFAA00', bg: 'rgba(255,170,0,0.12)',  border: 'rgba(255,170,0,0.4)'  },
                  { key: 'hearts', icon: '❤️', label: 'Liker',  color: '#ff6b6b', bg: 'rgba(255,80,80,0.12)',  border: 'rgba(255,80,80,0.4)'  },
                ].map(tab => {
                  const active = activeTab === tab.key;
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as 'stars'|'hearts')}
                      style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: `1px solid ${active ? tab.border : 'rgba(255,255,255,0.08)'}`, background: active ? tab.bg : 'transparent', color: active ? tab.color : 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {tab.icon} {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Saisie ± */}
              {(() => {
                const isStar  = activeTab === 'stars';
                const qty     = isStar ? starsQty : heartsQty;
                const setQty  = isStar ? setStarsQty : setHeartsQty;
                const color   = isStar ? '#FFAA00' : '#ff6b6b';
                const bgVal   = isStar ? 'rgba(255,170,0,0.06)'  : 'rgba(255,80,80,0.06)';
                const border  = isStar ? 'rgba(255,170,0,0.2)'   : 'rgba(255,80,80,0.2)';
                const loading = isStar ? voteLoading : likeLoading;
                const overBal = qty > soutenirUnits;
                const btnBg   = overBal ? 'rgba(255,255,255,0.05)' : (isStar ? '#FAEEDA' : '#FCEBEB');
                const btnCol  = overBal ? 'rgba(255,255,255,0.3)'  : (isStar ? '#633806' : '#791F1F');
                const onSend  = isStar ? handleSendStars : handleSendHearts;
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 26, height: 26, borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', fontSize: 15, color: '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                      <div style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 800, color, fontFamily: 'Syne, sans-serif', background: bgVal, border: `1px solid ${border}`, borderRadius: 7, padding: '3px 0' }}>{qty}</div>
                      <button onClick={() => setQty(q => Math.min(soutenirUnits, q + 1))} style={{ width: 26, height: 26, borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', fontSize: 15, color: '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                    </div>

                    {/* Pavé */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginBottom: 6 }}>
                      {['1','2','3','4','5','6','7','8','9','0','⌫'].map(k => (
                        <button key={k} onClick={() => {
                          if (k === '⌫') {
                            const s = String(qty).slice(0, -1);
                            setQty(Math.max(1, parseInt(s) || 1));
                          } else {
                            const s = String(qty === 1 ? '' : qty) + k;
                            const n = parseInt(s);
                            if (!isNaN(n) && n > 0) setQty(Math.min(n, soutenirUnits || 9999));
                          }
                        }}
                          style={{ gridColumn: k === '0' ? '1/3' : 'auto', padding: '7px 4px', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 7, background: 'rgba(255,255,255,0.05)', fontSize: 14, fontWeight: 500, color: k === '⌫' ? '#f87171' : '#f0f0f0', cursor: 'pointer', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
                          {k}
                        </button>
                      ))}
                    </div>

                    {/* Récap + Bouton */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                      <span>{qty} unité{qty > 1 ? 's' : ''} · {qty * 100} F</span>
                      <span>Reste : {Math.max(0, soutenirUnits - qty)}</span>
                    </div>
                    <button onClick={onSend} disabled={loading || overBal || qty < 1}
                      style={{ width: '100%', padding: '8px', background: btnBg, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: btnCol, cursor: overBal ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      {loading ? '⏳…' : `${isStar ? '⭐' : '❤️'} Envoyer ${qty} ${isStar ? `étoile${qty > 1 ? 's' : ''}` : `cœur${qty > 1 ? 's' : ''}`}`}
                    </button>
                  </>
                );
              })()}
            </div>
          </>
        ) : (
          /* ── Visiteur — invite à se connecter ── */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60%', gap: 12, padding: '20px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>🔒</div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#fff', marginBottom: 6 }}>Compte requis</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 14 }}>
                Connecte-toi pour voter (⭐) et liker (❤️) en envoyant des unités à tes candidats préférés.
              </div>
            </div>
            <button onClick={() => router.push('/auth/login')} style={{ background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', border: 'none', borderRadius: 50, padding: '9px 18px', fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer', width: '100%', fontFamily: 'DM Sans, sans-serif' }}>
              Se connecter
            </button>
            <button onClick={() => router.push('/auth/register')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 50, padding: '8px 18px', fontSize: 11, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', width: '100%', fontFamily: 'DM Sans, sans-serif' }}>
              Créer un compte gratuit
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 50, padding: '4px 12px', marginTop: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFAA00', display: 'inline-block' }}/>
              <span style={{ fontSize: 9, color: '#FFAA00', fontWeight: 700, letterSpacing: '.06em' }}>COMPÉTITIONS EN COURS</span>
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENU SCROLLABLE ── */}
      <div style={s.scrollContent}>
        {showComments && (
          <div style={s.commentsPanel} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#fff' }}>💬 Commentaires ({comments.length})</span>
              <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16 }} onClick={() => setShowComments(false)}>✕</button>
            </div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <textarea ref={textareaRef} style={s.textarea} placeholder="Laissez un commentaire…" value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                rows={2} maxLength={500} />
              <button style={s.emojiToggleBtn} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
            </div>
            {showEmojiPicker && (
              <div style={s.emojiPickerInline} onClick={e => e.stopPropagation()}>
                {EMOJIS.map(e => <button key={e} style={s.emojiBtn} onClick={() => addEmoji(e)}>{e}</button>)}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button style={s.sendBtn} onClick={handleComment} disabled={commentLoading || !newComment.trim()}>
                {commentLoading ? <SpinIcon /> : '➤ Envoyer'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto' }}>
              {comments.length === 0
                ? <div style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Soyez le premier 💬</div>
                : comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,154,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#FF9A00', fontWeight: 700, fontSize: 11 }}>?</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#e0e0e0' }}>Utilisateur</span>
                        <span style={{ fontSize: 9, color: '#666' }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#bbb', lineHeight: 1.5 }}>{c.content}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ ...s.fixedFooter, height: FOOTER_H }}>
        <div style={{ height: BAND_H, overflow: 'hidden' }}>
          <div ref={bandRef} style={s.band}
            onMouseEnter={() => { if (scrollTimer.current) clearInterval(scrollTimer.current); }}
            onMouseLeave={() => {
              const b = bandRef.current; if (!b) return;
              scrollTimer.current = setInterval(() => {
                if (b.scrollLeft >= b.scrollWidth - b.clientWidth - 2) b.scrollLeft = 0;
                else b.scrollLeft += 1.2;
              }, 20);
            }}
          >
            <span style={{ fontSize: 14, flexShrink: 0, marginRight: 4 }}>🏆</span>
            {(otherCandidates.length > 0 ? [...otherCandidates, ...otherCandidates, ...otherCandidates] : []).map((c, i) => (
              <button key={`${c.id}-${i}`} style={s.candidateCard} onClick={() => c.video_id && router.push(`/watch/${c.video_id}`)}>
                <div style={s.candidateAvatar}>{(c.stage_name ?? c.name ?? '?')[0].toUpperCase()}</div>
                <div>
                  <div style={s.candidateName}>{c.stage_name ?? c.name ?? 'Candidat'}</div>
                  <div style={s.candidateNum}>{c.discipline ?? ''} · #{pad(c.position ?? i + 1)}</div>
                </div>
              </button>
            ))}
            {otherCandidates.length === 0 && <span style={{ color: 'rgba(255,154,0,0.5)', fontSize: 12, fontStyle: 'italic', fontFamily: 'DM Sans, sans-serif' }}>Autres compétitions à venir</span>}
          </div>
        </div>

        <TickerBand />

        {/* Nav bas — connectés uniquement */}
        {loggedIn && (
          <div style={{ height: NAV_H, background: 'rgba(8,8,15,0.95)', borderTop: '1px solid rgba(255,170,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 8px' }}>
            <button onClick={() => router.push('/home')} style={s.navBtn}>
              <div style={s.navIconBox}><HomeIcon /></div>
              <span style={s.navLabel}>Accueil</span>
            </button>
            <button onClick={() => router.push('/recharge')} style={s.navBtn}>
              <div style={s.navIconBox}><RechargeIcon /></div>
              <span style={s.navLabel}>Recharger</span>
            </button>
            <button onClick={handleAjouter} style={s.navBtn}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#111', border: '2px solid #FFAA00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, color: '#FFAA00', fontWeight: 700, lineHeight: 1 }}>+</span>
              </div>
              <span style={{ ...s.navLabel, color: '#FFAA00' }}>Ajouter</span>
            </button>
            <button onClick={() => router.push('/retrait')} style={s.navBtn}>
              <div style={s.navIconBox}><BilletIcon /></div>
              <span style={s.navLabel}>Retrait</span>
            </button>
            <button onClick={() => router.push('/live')} style={s.navBtn}>
              <div style={{ ...s.navIconBox, position: 'relative' as const }}>
                <LiveIcon />
                <span style={{ position: 'absolute' as const, top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#ff3333', display: 'block' }} />
              </div>
              <span style={s.navLabel}>Live</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f0', fontFamily: 'DM Sans, sans-serif', position: 'relative', overflowX: 'hidden' },
  fixedHeader: { position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,170,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 100 },
  logoInline: { display: 'inline-flex', alignItems: 'center' },
  logoDiki: { color: '#FFAA00', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20 },
  logoDash: { color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 300, fontSize: 20, margin: '0 2px' },
  scrollContent: { paddingTop: 8, paddingLeft: 16, paddingRight: 16 },
  video: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
  videoOverlay: { position: 'absolute', bottom: 36, left: 0, right: 0, padding: '36px 12px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', pointerEvents: 'none' },
  disciplineBadge: { display: 'inline-block', background: 'rgba(255,154,0,0.25)', border: '1px solid rgba(255,154,0,0.4)', color: '#FF9A00', borderRadius: 20, padding: '2px 8px', fontSize: 10, marginBottom: 3 },
  overlayTitle: { margin: '0 0 2px', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' },
  overlayTrack: { margin: '0 0 2px', fontSize: 11, color: '#ddd', fontStyle: 'italic' },
  overlayMeta: { margin: 0, fontSize: 10, color: '#aaa' },
  progressOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px 7px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', transition: 'opacity 0.3s' },
  progressRow: { display: 'flex', alignItems: 'center', gap: 5 },
  timeText: { color: '#ddd', fontSize: 9, minWidth: 24, fontVariantNumeric: 'tabular-nums' },
  progressBar: { flex: 1, height: 2, cursor: 'pointer', accentColor: '#FF9A00' },
  ctrlBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center', minWidth: 22, justifyContent: 'center' },
  playOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  playBubble: { width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,154,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  shareMenu: { position: 'absolute', left: 50, bottom: 0, background: '#1a1a1a', border: '1px solid rgba(255,154,0,0.25)', borderRadius: 12, padding: '6px', zIndex: 200, minWidth: 155 },
  shareMenuItem: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#f0f0f0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', borderRadius: 8, textAlign: 'left' as const },
  toast: { margin: '8px 0', background: 'rgba(40,200,100,0.14)', border: '1px solid rgba(40,200,100,0.3)', color: '#4ade80', borderRadius: 10, padding: '8px 14px', fontSize: 12 },
  commentsPanel: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px', marginTop: 8 },
  textarea: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#f0f0f0', fontSize: 12, padding: '8px 36px 8px 12px', resize: 'vertical' as const, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' as const },
  sendBtn: { background: 'linear-gradient(135deg, #FF9A00, #CC5500)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
  emojiToggleBtn: { position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' },
  emojiPickerInline: { display: 'flex', flexWrap: 'wrap' as const, gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px', marginBottom: 8 },
  emojiBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: '2px 3px', borderRadius: 4 },
  fixedFooter: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0e0e0e', borderTop: '0.5px solid rgba(255,255,255,0.07)', zIndex: 100, display: 'flex', flexDirection: 'column' },
  band: { display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' as const, height: '100%', background: 'repeating-linear-gradient(60deg, #5C2400 0px, #5C2400 10px, #8B3D00 10px, #8B3D00 20px)', padding: '8px 12px', borderTop: '2px solid #FF8C00', borderBottom: '1px solid rgba(255,154,0,0.3)' },
  candidateCard: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,154,0,0.3)', borderRadius: 40, padding: '4px 10px 4px 4px', cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Sans, sans-serif' },
  candidateAvatar: { width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,154,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF9A00', fontWeight: 700, fontSize: 11 },
  candidateName: { color: '#fff', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' as const },
  candidateNum: { color: '#FFD480', fontSize: 8, fontWeight: 700 },
  navBtn: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', flex: 1, height: '100%' },
  navIconBox: { width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,140,0,0.7)' },
  navLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, fontFamily: 'DM Sans, sans-serif', color: 'rgba(255,255,255,0.4)' },
};

function PlayIcon()    { return <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>; }
function BigPlay()     { return <svg width={22} height={22} viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>; }
function PauseIcon()   { return <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>; }
function VolumeIcon()  { return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /></svg>; }
function MuteIcon()    { return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>; }
function FsIcon()      { return <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>; }
function ExitFsIcon()  { return <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFAA00" strokeWidth={2.5}><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>; }
function LikeIcon({ liked }: { liked: boolean }) { return <svg width={20} height={20} viewBox="0 0 24 24" fill={liked ? '#ff6b6b' : 'none'} stroke={liked ? '#ff6b6b' : '#fff'} strokeWidth={2}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>; }
function VoteIcon({ active }: { active: boolean }) { return <svg width={20} height={20} viewBox="0 0 24 24" fill={active ? '#FFAA00' : 'none'} stroke={active ? '#FFAA00' : '#fff'} strokeWidth={2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>; }
function SubscribeIcon({ active }: { active: boolean }) { return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? '#FFAA00' : '#fff'} strokeWidth={2} strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>; }
function RemixIcon()   { return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>; }
function ShareIcon()   { return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>; }
function DownloadIcon(){ return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function SpinIcon()    { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M21 12a9 9 0 0 0-9-9" /></svg>; }
function HomeIcon()    { return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>; }
function RechargeIcon(){ return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>; }
function BilletIcon()  { return <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="22" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M1 10h2M21 10h2M1 14h2M21 14h2"/></svg>; }
function LiveIcon()    { return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>; }
function WaIcon()      { return <svg width={15} height={15} viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>; }
function FbIcon()      { return <svg width={15} height={15} viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>; }
function LinkIcon()    { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>; }
