'use client';
import TranslateWidget from '../../components/TranslateWidget';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LogoDikiDiki from '../../components/LogoDikiDiki';
import { useAnalytics } from '../../hooks/useAnalytics'; /*DKDK_HEARTBEAT*/

// ── TickerBand inline ─────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
/*DKDK_ROUNDLABEL_MODULE*/
// Libelle d'etape adapte au type (miroir frontend de getStageConfig). 5 types.
function getRoundLabel(maxP: number, round: number): { label: string; cut: string } {
  if (maxP === 16) {
    const M: Record<number, {label:string;cut:string}> = {
      1: { label: "Huitième de finale", cut: "16 → 8" },
      2: { label: "Quart de finale",    cut: "8 → 4" },
      3: { label: "Demi-finale",        cut: "4 → 2" },
      4: { label: "Match de classement 🥉", cut: "Bronze" },
      5: { label: "Finale",             cut: "2 → 1" },
    };
    return M[round] ?? { label: "Tour " + round, cut: "" };
  }
  if (maxP === 12) {
    const M: Record<number, {label:string;cut:string}> = {
      1: { label: "Tour 1",        cut: "12 → 6" },
      2: { label: "Quart de finale", cut: "6 → 3" },
      3: { label: "Demi-finale",   cut: "3 → 2" },
      4: { label: "Finale",        cut: "2 → 1" },
    };
    return M[round] ?? { label: "Tour " + round, cut: "" };
  }
  if (maxP === 8) {
    const M: Record<number, {label:string;cut:string}> = {
      1: { label: "Quart de finale", cut: "8 → 4" },
      2: { label: "Demi-finale",   cut: "4 → 2" },
      3: { label: "Finale",        cut: "2 → 1" },
    };
    return M[round] ?? { label: "Tour " + round, cut: "" };
  }
  if (maxP === 4) {
    const M: Record<number, {label:string;cut:string}> = {
      1: { label: "Demi-finale", cut: "4 → 2" },
      2: { label: "Finale",      cut: "2 → 1" },
    };
    return M[round] ?? { label: "Tour " + round, cut: "" };
  }
  return { label: "Finale", cut: "2 → 1" };
}
/*DKDK_GETROUNDOBJ*/
// Retourne le montant objectif pour (type, round) — miroir de getStageConfig cote backend.
function getRoundObjectif(maxP: number, round: number, obj: Record<string,number>): number {
  const M: Record<number, Record<number, string>> = {
    2:  { 1: 'finale' },
    4:  { 1: 'demi', 2: 'finale' },
    8:  { 1: 'quart', 2: 'demi', 3: 'finale' },
    12: { 1: 'huitieme', 2: 'quart', 3: 'demi', 4: 'finale' },
    16: { 1: 'huitieme', 2: 'quart', 3: 'demi', 4: 'demi', 5: 'finale' },
  };
  const key = M[maxP]?.[round] ?? 'finale';
  return obj[key] ?? 0;
}

const DEFAULT_MSGS = [
  '📢 Bienvenue sur Diki-Diki Vision — La scène des talents africains !',
  '💰 Rechargez votre compte pour voter et soutenir vos candidats',
  '🎬 Soumettez votre vidéo et participez aux prochaines challenges',
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

/*DKDK_COMPACT*/
/*DKDK_ALIGN*/
/*DKDK_LISIBLE*/
/*DKDK_COULEURS*/
/*DKDK_CARTES*/
/*DKDK_STYLE5*/
/*DKDK_STYLE4B*/
/*DKDK_CARTE_PANNEAU*/
/*DKDK_LABELS*/
/*DKDK_LABELS_BLANC*/
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

interface Video {
  id: string; title: string; description?: string; storage_url: string;
  status: string; created_at: string; discipline?: string;
  track_title?: string; track_artist?: string; track_genre?: string; views?: number;
  contest_id?: string; suspended?: boolean; /*DKDK_SUSPEND_TYPE*/
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
      <span style={{ fontSize: 11, color: locked ? 'rgba(255,80,80,0.5)' : '#fff', textAlign: 'center' as const, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' as const }}>{label}</span>
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
  useAnalytics(); /*DKDK_HEARTBEAT*/
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [video, setVideo]                   = useState<Video | null>(null);
  const [isMobile, setIsMobile] = useState(false); /*DKDK_ISMOBILE*/
  useEffect(() => { /*DKDK_ISMOBILE_EFFECT*/
    const _ck = () => setIsMobile(window.innerWidth <= 640);
    _ck();
    window.addEventListener('resize', _ck);
    return () => window.removeEventListener('resize', _ck);
  }, []);
  const [competitionVideos, setCompetitionVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentVideo, setCurrentVideo]     = useState<Video | null>(null);
  const [candidates, setCandidates]         = useState<Candidate[]>([]);
  const [otherCandidates, setOtherCandidates] = useState<Candidate[]>([]);
  const [comments, setComments]             = useState<Comment[]>([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  // ── Donnees bracket (chantier #1 : pool au score + cagnotte) ──
  const [bracketData, setBracketData] = useState<any>(null);
  const [poolLoading, setPoolLoading] = useState(true);

  // ── Compte Voter & Soutenir (unités) ──
  const [wallet, setWallet]                 = useState<number | null>(null); // en F CFA
  const [rechargeUnits, setRechargeUnits]   = useState(0);                   // en unités (wallet / 100)
  const [voteCount, setVoteCount]           = useState<number | null>(null);
  const [inviteFerme, setInviteFerme] = useState(false); /*DKDK_INVITE_FERME*/

  // ── Claviers étoiles / cœurs ──
  const [starsQty, setStarsQty]             = useState(1);
  const [heartsQty, setHeartsQty]           = useState(1);
  // Montants pilotés depuis la page Réglages (table settings)
  const [voteAmount, setVoteAmount]   = useState(100); // prix étoile = valeur d'1 unité (F CFA)
  const [heartAmount, setHeartAmount] = useState(200); // prix cœur (F CFA)
  /*DKDK_SOUTENIR_AMT*/ const [soutenirAmount, setSoutenirAmount] = useState(10); // prix soutien (F CFA)
  // Objectifs NETS par etape (1..4) + commission, pilotes depuis /admin/reglages
  const [objSettings, setObjSettings] = useState<Record<string,number>>({huitieme:0,quart:0,demi:0,finale:0});
  const [commission, setCommission] = useState(0.5);
  const [activeTab, setActiveTab]           = useState<'stars'|'hearts'>('stars');

  const [myVotesOnVideo, setMyVotesOnVideo] = useState(0);  // nb étoiles envoyées
  const [likeCount, setLikeCount]           = useState(0);   // nb cœurs envoyés
  const [liked, setLiked]                   = useState(false);

  const [soutenirLoading, setSoutenirLoading] = useState(false);
  const [soutenirSuccess, setSoutenirSuccess] = useState(false);
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
  /*DKDK_ONETAP_STATE*/
  const [showOneTap, setShowOneTap]         = useState(false);
  const [oneTapPhone, setOneTapPhone]       = useState('');
  const [oneTapOtp, setOneTapOtp]           = useState('');
  const [oneTapStep, setOneTapStep]         = useState('phone');
  const [oneTapLoading, setOneTapLoading]   = useState(false);
  const [oneTapError, setOneTapError]       = useState('');
  const [oneTapAction, setOneTapAction]     = useState('stars');
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
  const bandTrackRef  = useRef<HTMLDivElement>(null); /*DKDK_BANDTRACKREF*/
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  // DKDK_AUTOSCROLL : defilement auto permanent de la bande (pause au survol via onMouseEnter)
  useEffect(() => { return; /*DKDK_MARQUEE_NOJS*/
    const start = () => {
      if (scrollTimer.current) clearInterval(scrollTimer.current);
      scrollTimer.current = setInterval(() => {
        const b = bandRef.current; if (!b) return;
        if (b.scrollLeft >= b.scrollWidth - b.clientWidth - 2) b.scrollLeft = 0;
        else b.scrollLeft += 1.2;
      }, 20);
    };
    const t = setTimeout(start, 600);
    return () => {
      clearTimeout(t);
      if (scrollTimer.current) clearInterval(scrollTimer.current);
    };
  }, [bracketData]);
  // Charge les montants depuis la table settings (pilotés par /admin/reglages)
  useEffect(() => {
    fetch(`${API}/settings`)
      .then(r => r.json())
      .then(res => {
        const rows = res?.data || [];
        const vote  = rows.find((s: any) => s.key === 'bracket_vote_amount');
        const heart = rows.find((s: any) => s.key === 'bracket_heart_amount');
        if (vote?.value)  setVoteAmount(Number(vote.value));
        if (heart?.value) setHeartAmount(Number(heart.value));
        /*DKDK_SOUTENIR_READ*/
        const sout = rows.find((s: any) => s.key === 'soutenir_amount');
        if (sout?.value) setSoutenirAmount(Number(sout.value));
        const oh = rows.find((s: any) => s.key === 'bracket_obj_huitieme');
        const oq = rows.find((s: any) => s.key === 'bracket_obj_quart');
        const od = rows.find((s: any) => s.key === 'bracket_obj_demi');
        const of = rows.find((s: any) => s.key === 'bracket_obj_finale');
        setObjSettings({
          huitieme: oh?.value ? Number(oh.value) : 0,
          quart:    oq?.value ? Number(oq.value) : 0,
          demi:     od?.value ? Number(od.value) : 0,
          finale:   of?.value ? Number(of.value) : 0,
        });
        const cp = rows.find((s: any) => s.key === 'bracket_commission_pct');
        if (cp?.value) setCommission(Number(cp.value) / 100);
      })
      .catch(() => { /* garde les valeurs par défaut */ });
  }, []);

  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  const isLoggedIn = () => !!getToken();

  // DKDK_BODY_NOSCROLL : pas de scrollbar sur watch (retabli en quittant)
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);


  const requireLogin = (msg: string) => {
    setLoginPopupMsg(msg);
    setShowLoginPopup(true);
  };
  /*DKDK_ONETAP_OPEN*/
  const openOneTap = (action: string) => {
    setOneTapAction(action);
    setOneTapStep('phone');
    setOneTapPhone('');
    setOneTapOtp('');
    setOneTapError('');
    setShowOneTap(true);
  };
  const handleOneTapSend = async () => {
    if (!oneTapPhone.trim()) { setOneTapError('Entrez votre numero.'); return; }
    setOneTapLoading(true); setOneTapError('');
    try {
      const res = await fetch(API + '/auth/one-tap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: oneTapPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      setOneTapStep('otp');
    } catch (e: any) { setOneTapError(e.message); }
    finally { setOneTapLoading(false); }
  };
  const handleOneTapVerify = async () => {
    if (oneTapOtp.length !== 6) { setOneTapError('Code a 6 chiffres.'); return; }
    setOneTapLoading(true); setOneTapError('');
    try {
      const res = await fetch(API + '/auth/one-tap/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: oneTapPhone, otp: oneTapOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      localStorage.setItem('dkdk_token', data.token);
      localStorage.setItem('dkdk_user', JSON.stringify(data.user));
      setShowOneTap(false);
      setRechargeUnits(Math.floor((data.user.wallet ?? 0) / voteAmount));
      setWallet(data.user.wallet ?? 0);
      /*DKDK_VISITEUR_PAY*/
      const vType = oneTapAction === 'stars' ? 'star' : 'heart';
      const vQty  = oneTapAction === 'stars' ? starsQty : heartsQty;
      try {
        const payRes = await fetch(API + '/payment/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
          body: JSON.stringify({ participant_id: bracketData?.current_participant_id, vote_type: vType, qty: vQty, phone: oneTapPhone }),
        });
        const payData = await payRes.json();
        if (!payRes.ok || !payData.paymentUrl) throw new Error(payData.error || 'Erreur paiement');
        window.location.href = payData.paymentUrl;
      } catch (e: any) { setOneTapError(e.message); }
    } catch (e: any) { setOneTapError(e.message); }
    finally { setOneTapLoading(false); }
  };

  useEffect(() => {
    const t = setInterval(() => setAdIndex(i => (i + 1) % ADS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { /*DKDK_MQ_JS_LOOP*/
    const band = bandRef.current; const track = bandTrackRef.current;
    if (!band || !track) return;
    let pos = band.clientWidth;
    let raf = 0;
    let paused = false;
    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };
    band.addEventListener('mouseenter', onEnter);
    band.addEventListener('mouseleave', onLeave);
    const step = () => {
      if (!paused) {
        pos -= 1.5;
        if (track.scrollWidth > 0 && pos <= -track.scrollWidth) pos = band.clientWidth; /*DKDK_MQ_GUARD*/
        track.style.transform = 'translateX(' + pos + 'px)';
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      band.removeEventListener('mouseenter', onEnter);
      band.removeEventListener('mouseleave', onLeave);
    };
  }, [otherCandidates, bracketData]);

  // ── Charger Compte Voter & Soutenir ──
  useEffect(() => {
    const token = getToken(); if (!token) return;
    fetch(`${API}/votes/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          const bal = d.wallet ?? d.balance ?? 0;
          setWallet(bal);
          setRechargeUnits(Math.floor(bal / voteAmount));
          setVoteCount(d.votes_count ?? d.voteCount ?? null);
        }
      })
      .catch(() => {});
  }, []);

  /*DKDK_REJEU_VOTE*/
  useEffect(() => {
    let pv: any = null;
    try {
      const raw = localStorage.getItem('dkdk_pending_vote');
      if (!raw) return;
      pv = JSON.parse(raw);
    } catch { return; }
    if (!pv || !pv.participant_id || !pv.ts || Date.now() - pv.ts > 600000) {
      try { localStorage.removeItem('dkdk_pending_vote'); } catch {}
      return;
    }
    const token = getToken();
    if (!token) return;
    const needUnits = pv.type === 'heart' ? pv.qty * 2 : pv.qty;
    let cancelled = false;
    let tries = 0;
    const MAX = 15;
    const tick = async () => {
      if (cancelled) return;
      tries++;
      let units = 0, bal = 0;
      try {
        const r = await fetch(`${API}/votes/balance`, { headers: { Authorization: `Bearer ${token}` } });
        const d = r.ok ? await r.json() : null;
        bal = d ? (d.wallet ?? d.balance ?? 0) : 0;
        units = Math.floor(bal / voteAmount);
        setWallet(bal);
        setRechargeUnits(units);
      } catch {}
      if (units >= needUnits) {
        try { localStorage.removeItem('dkdk_pending_vote'); } catch {}
        try {
          await fetch(`${API}/brackets/arena/vote-pool`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ participant_id: pv.participant_id, qty: pv.qty, type: pv.type }),
          });
          setRechargeUnits(units - needUnits);
          setWallet(bal - needUnits * voteAmount);
          setVoteSuccess(true);
          setTimeout(() => setVoteSuccess(false), 1500);
          refreshPool();
        } catch {}
        return;
      }
      if (tries >= MAX) {
        try { localStorage.removeItem('dkdk_pending_vote'); } catch {}
        setVoteError('Ta recharge est bien reçue. Clique sur Envoyer pour lancer ton vote.');
        setTimeout(() => setVoteError(null), 6000);
        return;
      }
      if (!cancelled) setTimeout(tick, 2000);
    };
    tick();
    return () => { cancelled = true; };
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
  // Recupere bracket + round + pool trie par score, via la video courante
  useEffect(() => {
    let alive = true;
    setPoolLoading(true);
    fetch(`${API}/brackets/by-video/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (!alive) return;
        const data = res && res.success ? res.data : null;
        setBracketData(data);
        console.log("[DKDK by-video] ->", data);
      })
      .catch(() => { if (alive) setBracketData(null); })
      .finally(() => { if (alive) setPoolLoading(false); });
    return () => { alive = false; };
  }, [id]);

  // DKDK_C2_VOTE : rafraichit le pool (scores/compteurs) apres un vote
  const refreshPool = async () => {
    try {
      const r = await fetch(`${API}/brackets/by-video/${id}`);
      if (!r.ok) return;
      const res = await r.json();
      if (res && res.success) setBracketData(res.data);
    } catch {}
  };

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
    /*DKDK_VOTE_STATE_GUARD_STARS*/
    if (!estEnCours) { setVoteError('Le vote n est pas encore ouvert pour ce challenge.'); setTimeout(() => setVoteError(null), 4000); return; }
    if (!isLoggedIn()) { openOneTap('stars'); return; }
    /*DKDK_BRONZE_VOTEGUARD*/
    {
      const estRoundBronze = bracketData?.bracket?.max_participants === 16 && bracketData?.active_round?.round === 4;
      const enLecture = bracketData?.pool?.find((pp: any) => pp.participant_id === bracketData?.current_participant_id);
      if (estRoundBronze && enLecture && enLecture.final_path !== 'bronze') {
        setVoteError("Ce candidat est qualifie pour la finale. Pendant le match pour la 3e place, seuls les 2 candidats du bronze peuvent recevoir des votes.");
        setTimeout(() => setVoteError(null), 5000);
        return;
      }
    }
    if (starsQty < 1) return;
    if (rechargeUnits < starsQty) {
      /*DKDK_AIGUILLAGE_STAR*/
      const manque = (starsQty - rechargeUnits) * voteAmount;
      try { localStorage.setItem("dkdk_pending_vote", JSON.stringify({ participant_id: bracketData?.current_participant_id, type: "star", qty: starsQty, ts: Date.now() })); } catch {}
      router.push(`/recharge?montant=${manque}&retour=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (voteLoading) return;
    const vidId = currentVideo?.id ?? id;
    setVoteLoading(true);
    try {
      const res = await fetch(`${API}/brackets/arena/vote-pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ participant_id: bracketData?.current_participant_id, qty: starsQty, type: 'star' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erreur');
      setMyVotesOnVideo(v => v + starsQty);
      setRechargeUnits(u => u - starsQty);
      setWallet(w => w !== null ? w - starsQty * 100 : w);
      setVoteSuccess(true);
      setTimeout(() => setVoteSuccess(false), 1500);
      refreshPool();
    } catch (e: unknown) {
      setVoteError((e as Error).message);
      setTimeout(() => setVoteError(null), 4000);
    } finally { setVoteLoading(false); }
  };

  // ── LIKER — envoyer des ❤️ cœurs (connectés uniquement) ──────────
  const handleSendHearts = async () => {
    /*DKDK_VOTE_STATE_GUARD_HEARTS*/
    if (!estEnCours) { setVoteError('Le vote n est pas encore ouvert pour ce challenge.'); setTimeout(() => setVoteError(null), 4000); return; }
    if (!isLoggedIn()) { openOneTap('hearts'); return; }
    /*DKDK_BRONZE_VOTEGUARD*/
    {
      const estRoundBronze = bracketData?.bracket?.max_participants === 16 && bracketData?.active_round?.round === 4;
      const enLecture = bracketData?.pool?.find((pp: any) => pp.participant_id === bracketData?.current_participant_id);
      if (estRoundBronze && enLecture && enLecture.final_path !== 'bronze') {
        setVoteError("Ce candidat est qualifie pour la finale. Pendant le match pour la 3e place, seuls les 2 candidats du bronze peuvent recevoir des votes.");
        setTimeout(() => setVoteError(null), 5000);
        return;
      }
    }
    if (heartsQty < 1) return;
    if (rechargeUnits < heartsQty * 2) {
      /*DKDK_AIGUILLAGE_HEART*/
      const manque = (heartsQty * 2 - rechargeUnits) * voteAmount;
      try { localStorage.setItem("dkdk_pending_vote", JSON.stringify({ participant_id: bracketData?.current_participant_id, type: "heart", qty: heartsQty, ts: Date.now() })); } catch {}
      router.push(`/recharge?montant=${manque}&retour=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (likeLoading) return;
    const vidId = currentVideo?.id ?? id;
    setLikeLoading(true);
    try {
      await fetch(`${API}/brackets/arena/vote-pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ participant_id: bracketData?.current_participant_id, qty: heartsQty, type: 'heart' }),
      });
      setLiked(true);
      setLikeCount(c => c + heartsQty);
      setRechargeUnits(u => u - heartsQty * 2);
      setWallet(w => w !== null ? w - heartsQty * 200 : w);
      refreshPool();
    } catch {
      // rollback silencieux
    } finally { setLikeLoading(false); }
  };

  // ── SOUTENIR (hors challenge, 10F/clic) ──────────────────────────
  /*DKDK_HANDLE_SOUTENIR*/
  const handleSoutenir = async () => {
    if (!isLoggedIn()) { requireLogin('Connectez-vous pour soutenir ce candidat.'); return; }
    if (soutenirLoading) return;
    if ((wallet ?? 0) < 10) {
      setVoteError(/*DKDK_SOUTENIR_DISPLAY*/ 'Solde insuffisant. Minimum ' + soutenirAmount + ' F CFA pour soutenir.');
      setTimeout(() => setVoteError(null), 3000);
      return;
    }
    setSoutenirLoading(true);
    try {
      const vidId = currentVideo?.id ?? id;
      const res = await fetch(`${API}/brackets/video/${vidId}/soutenir`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      setWallet(w => w !== null ? w - 10 : w);
      setSoutenirSuccess(true);
      setTimeout(() => setSoutenirSuccess(false), 2000);
    } catch (e: unknown) {
      setVoteError((e as Error).message);
      setTimeout(() => setVoteError(null), 3000);
    } finally { setSoutenirLoading(false); }
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

  const playerH      = `calc(100vh - ${PLAYER_TOP}px - ${FOOTER_H}px - 5px)`;
  const playerLeft   = expanded ? '8px' : (isMobile ? '50%' : `calc((50% + ${PLAYER_MAX_W / 2 + BTN_COL_W / 2 + 4}px) / 2)`);
  const playerTransf = expanded ? 'none' : 'translateX(-50%)';
  const playerW      = expanded ? BTN_COL_LEFT : (isMobile ? '98vw' : '100%'); /*DKDK_PLAYER_W_MOBILE*/
  const playerMaxW   = expanded ? 'none' : (isMobile ? 'none' : `${PLAYER_MAX_W}px`); /*DKDK_PLAYER_MAXW_MOBILE*/
  const playerRadius = expanded ? '0px' : '16px';

  const displayVideo = currentVideo ?? video;
  const totalInComp  = competitionVideos.length;
  const hasPrev      = currentVideoIndex > 0;
  const hasNext      = currentVideoIndex < totalInComp - 1;
  const loggedIn     = isLoggedIn();
  /*DKDK_ETAT_GLOBAL*/ // Variables d'etat accessibles dans tout le panneau (hors IIFE)
  const _bk = bracketData?.bracket;
  const challengeEnCours = _bk?.status === 'in_progress' || _bk?.status === 'active'; /*DKDK_ENCOURS_ACTIVE_GLOBAL*/
  /*DKDK_ETATS_3*/ // 3 etats normalises de la spec home/watch
  const _st = _bk?.status;
  const estEnAttente = _st === 'open' || _st === 'waiting_candidates' || _st === 'ouvert' || _st === 'ouvrir';
  const estEnCours   = _st === 'in_progress' || _st === 'active';
  const estTermine   = _st === 'done';
  const candidatsInscrits = bracketData?.pool?.length ?? 0;
  const capaciteMax = _bk?.max_participants ?? 16;
  const placesRestantes = Math.max(0, capaciteMax - candidatsInscrits);

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
    <div style={ isMobile ? { ...s.page, paddingTop: HEADER_H, paddingBottom: 24, height: 'auto', minHeight: 'auto', maxHeight: 'none', overflow: 'visible', overflowY: 'visible', position: 'static' } : { ...s.page, paddingTop: HEADER_H, paddingBottom: FOOTER_H } } onClick={closeAll} /*DKDK_PAGE_SCROLL_MOBILE*/>

      {showLoginPopup && (
        <LoginPopup
          message={loginPopupMsg}
          onLogin={() => { setShowLoginPopup(false); router.push('/auth/login'); }}
          onClose={() => setShowLoginPopup(false)}
        />
      )}

      {/*DKDK_ONETAP_POPUP*/}
      {showOneTap && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:400 }} onClick={() => setShowOneTap(false)}>
          <div style={{ background:'#12121e', border:'1px solid rgba(255,170,0,0.3)', borderRadius:20, padding:'28px 24px', maxWidth:320, width:'90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>{oneTapAction === 'stars' ? '⭐' : '❤️'}</div>
            <h3 style={{ fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:'1rem', color:'#fff', textAlign:'center', marginBottom:6 }}>
              {oneTapStep === 'phone' ? 'Voter en 1 tap' : 'Code de confirmation'}
            </h3>
            <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.45)', textAlign:'center', marginBottom:16, lineHeight:1.5 }}>
              {oneTapStep === 'phone'
                ? 'Entrez votre numero — on cree votre compte automatiquement.'
                : 'Code envoye au ' + oneTapPhone}
            </p>
            {oneTapError && <div style={{ background:'rgba(255,0,0,0.12)', border:'1px solid rgba(255,0,0,0.3)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#f87171', marginBottom:10, textAlign:'center' }}>{oneTapError}</div>}
            {oneTapStep === 'phone' ? (
              <>
                <input
                  type="tel" placeholder="+225 07 00 00 00 00"
                  value={oneTapPhone} onChange={e => setOneTapPhone(e.target.value)}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'DM Sans, sans-serif', boxSizing:'border-box' as const, marginBottom:12 }}
                />
                <button onClick={handleOneTapSend} disabled={oneTapLoading}
                  style={{ width:'100%', background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'10px', fontSize:14, fontWeight:700, color:'#000', cursor:'pointer', fontFamily:'DM Sans, sans-serif', opacity:oneTapLoading ? 0.6 : 1 }}>
                  {oneTapLoading ? '⏳…' : 'Recevoir le code →'}
                </button>
              </>
            ) : (
              <>
                <input
                  type="text" placeholder="123456" maxLength={6}
                  value={oneTapOtp} onChange={e => setOneTapOtp(e.target.value.replace(/D/g,''))}
                  style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 14px', fontSize:18, color:'#fff', outline:'none', fontFamily:'DM Sans, sans-serif', boxSizing:'border-box' as const, marginBottom:12, textAlign:'center' as const, letterSpacing:8 }}
                />
                <button onClick={handleOneTapVerify} disabled={oneTapLoading}
                  style={{ width:'100%', background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'10px', fontSize:14, fontWeight:700, color:'#000', cursor:'pointer', fontFamily:'DM Sans, sans-serif', opacity:oneTapLoading ? 0.6 : 1 }}>
                  {oneTapLoading ? '⏳…' : (oneTapAction === 'stars' ? 'Voter ⭐' : 'Liker ❤️')}
                </button>
                <button onClick={() => setOneTapStep('phone')} style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,0.35)', fontSize:12, cursor:'pointer', marginTop:8, fontFamily:'DM Sans, sans-serif' }}>← Changer de numero</button>
              </>
            )}
            <button onClick={() => { setShowOneTap(false); router.push('/auth/login'); }} style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,0.25)', fontSize:11, cursor:'pointer', marginTop:10, fontFamily:'DM Sans, sans-serif' }}>J ai deja un compte →</button>
          </div>
        </div>
      )}

      {/* ── TOPBAR ── */}
      <div style={{ ...s.fixedHeader, height: HEADER_H }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}><LogoDikiDiki width={130} /></Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TranslateWidget />
          {/*DKDK_TOPBAR_VISITEUR*/}
          {!loggedIn && (
            <button onClick={() => router.push('/auth/register')} style={{ background:'linear-gradient(135deg,#FF6B00,#FFAA00)', color:'#fff', border:'none', borderRadius:20, padding:'7px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'DM Sans, sans-serif', whiteSpace:'nowrap', flexShrink:0 }}>
              S'inscrire
            </button>
          )}
          {loggedIn && (
            <button onClick={() => router.push('/compte')} style={{ width:60, height:60, borderRadius:'50%', background:'#7e0380', border:'3px solid #FF8A00', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', lineHeight:1, cursor:'pointer', flexShrink:0 }} /*DKDK_TOPBAR_UNITES*/>
              <span style={{ fontSize:20, fontWeight:700, color:'#fff', fontFamily:'Syne, sans-serif' }}>{rechargeUnits}</span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.85)', fontFamily:'DM Sans, sans-serif', marginTop:2 }}>unites</span>
            </button>
          )}
        </div>
      </div>

      {/* ── LECTEUR ── */}
      <div
        style={ isMobile
          ? { position: 'relative', width: 'auto', maxWidth: '98vw', height: '60vh', aspectRatio: '9 / 16', margin: '8px auto 0', borderRadius: playerRadius, overflow: 'hidden', background: '#000', cursor: 'pointer', zIndex: 1 } /*DKDK_PLAYER_STATIC_MOBILE*/
          : { position: 'fixed', top: PLAYER_TOP, left: playerLeft, transform: playerTransf, width: playerW, maxWidth: playerMaxW, height: playerH, borderRadius: playerRadius, overflow: 'hidden', background: '#000', cursor: 'pointer', zIndex: 50, transition: 'all 0.35s cubic-bezier(.4,0,.2,1)' } }
        onMouseMove={resetTimer} onClick={estEnAttente ? undefined : togglePlay}
      >
        {/*DKDK_WAITING_OVERLAY*/}
        {estEnAttente && (
          <div style={{ position:'absolute', inset:0, zIndex:30, background:'rgba(10,10,15,0.82)', backdropFilter:'blur(3px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:'0 24px', textAlign:'center', cursor:'default' }}>
            <div style={{ fontSize:34 }}>⏳</div>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:16, fontWeight:800, color:'#fff' }}>Challenge en formation</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', lineHeight:1.5, maxWidth:300 }}>Le vote ouvrira quand le groupe sera complet.</div>
          </div>
        )}
        {displayVideo.suspended && ( /*DKDK_SUSPEND_PLACEHOLDER*/
          <div style={{ position:'absolute', inset:0, zIndex:40, background:'rgba(10,10,15,0.97)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:'0 24px', textAlign:'center' }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:17, fontWeight:800, color:'#fff' }}>Candidat suspendu</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.78)', lineHeight:1.5, maxWidth:300 }}>Cette prestation est temporairement indisponible, en cours de vérification.</div>
          </div>
        )}
        <video ref={videoRef} src={displayVideo.storage_url} style={s.video}
          onTimeUpdate={() => { const v = videoRef.current; if (v) setProgress(v.currentTime); }}
          onLoadedMetadata={() => { const v = videoRef.current; if (v) setDuration(v.duration); }}
          onEnded={() => { setPlaying(false); if (hasNext) goTo(currentVideoIndex + 1); }}
          playsInline
        />
        {estEnCours && !inviteFerme && (!isLoggedIn() || voteCount === 0) && ( /*DKDK_INVITE_BANNER*/
          <div onClick={e => e.stopPropagation()} style={{ position:"absolute", left:0, right:0, bottom:0, zIndex:20, padding:"14px 14px 16px", background:"rgba(10,10,15,0.88)", borderTop:"2px solid #7e0380", borderLeft:"1px solid rgba(126,3,128,0.6)", borderRight:"1px solid rgba(126,3,128,0.6)", cursor:"default" }}>
            <div onClick={() => setInviteFerme(true)} style={{ position:"absolute", top:8, right:10, color:"rgba(255,255,255,0.5)", fontSize:16, cursor:"pointer", lineHeight:1 }}>{"\u2715"}</div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:14, marginBottom:5, paddingRight:18 }}>{"\uD83C\uDFC6 Cette prestation m\u00e9rite votre voix ?"}</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:12, lineHeight:1.45, marginBottom:12 }}>Soutenez votre candidat et faites-le monter sur le podium.</div>
            <div onClick={() => { setInviteFerme(true); if (typeof window !== "undefined") window.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior:"smooth" }); }} style={{ textAlign:"center", background:"#FF8A00", color:"#201400", fontWeight:800, fontSize:14, padding:"11px", borderRadius:10, cursor:"pointer" }}>Voter</div>
          </div>
        )}
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
        style={ isMobile
          ? { position: 'relative', width: '98vw', margin: '6px auto 0', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8, zIndex: 2, background: 'transparent', padding: '4px 6px', flexWrap: 'wrap' } /*DKDK_BTNCOL_MOBILE*/
          : { position: 'fixed', top: PLAYER_TOP, left: BTN_COL_LEFT, width: BTN_COL_W, height: playerH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 55, background: 'rgba(8,8,20,0.65)', borderLeft: '1px solid rgba(255,255,255,0.04)', padding: '0 6px' } }
        onClick={e => e.stopPropagation()}
      >
        {/* S'ABONNER — visiteurs */}
        {!loggedIn && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <button onClick={handleSubscribe} style={{ width: 34, height: 34, borderRadius: '50%', background: subscribed ? 'rgba(255,170,0,0.2)' : 'rgba(15,15,25,0.9)', border: `1.5px solid ${subscribed ? '#FFAA00' : 'rgba(255,255,255,0.18)'}`, color: subscribed ? '#FFAA00' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SubscribeIcon active={subscribed} />
            </button>
            <span style={{ fontSize: 11, color: subscribed ? '#FFAA00' : '#fff', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
              {subscribed ? 'Abonné' : "S'abonner"}
            </span>
          </div>
        )}

        {/* VOTER ⭐ — connectés uniquement (indicateur, action dans le panel droit) */}
        {loggedIn && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ position: 'relative' }}>
              <button onClick={handleSendStars} /*DKDK_VOTER_GRISE*/ style={{ width: 34, height: 34, borderRadius: '50%', background: myVotesOnVideo > 0 ? 'rgba(255,170,0,0.2)' : 'rgba(15,15,25,0.9)', border: `1.5px solid ${myVotesOnVideo > 0 ? '#FFAA00' : 'rgba(255,255,255,0.18)'}`, color: '#fff', cursor: (!estEnCours || voteLoading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !estEnCours ? 0.4 : (voteLoading ? 0.6 : 1) }}>
                {voteLoading ? <SpinIcon /> : <VoteIcon active={myVotesOnVideo > 0} />}
              </button>
              {myVotesOnVideo > 0 && (
                <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: '#FFAA00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#000', padding: '0 3px' }}>{myVotesOnVideo}</div>
              )}
            </div>
            <span style={{ fontSize: 11, color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>Voter</span>
          </div>
        )}

        {/* LIKER ❤️ — connectés uniquement (visiteurs voient popup connexion) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                handleSendHearts();
              }}
              /*DKDK_LIKER_GRISE*/ style={{ width: 34, height: 34, borderRadius: '50%', background: liked ? 'rgba(255,80,80,0.2)' : 'rgba(15,15,25,0.9)', border: `1.5px solid ${liked ? '#ff4444' : 'rgba(255,255,255,0.18)'}`, color: '#fff', cursor: (!estEnCours || likeLoading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !estEnCours ? 0.4 : (likeLoading ? 0.6 : 1) }}>
              {likeLoading ? <SpinIcon /> : <LikeIcon liked={liked} />}
            </button>
            {likeCount > 0 && (
              <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', padding: '0 3px' }}>{likeCount}</div>
            )}
          </div>
          <span style={{ fontSize: 11, color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>Liker</span>
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
        style={ isMobile
          ? { position: 'static', width: '100%', maxWidth: 480, margin: '12px auto 0', height: 'auto', zIndex: 49, padding: '10px 12px', display: 'flex', flexDirection: 'column', background: '#0a0a0f', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' } /*DKDK_PANEL_MOBILE*/
          : { position: 'fixed', top: PLAYER_TOP, left: HERO_LEFT, right: 8, height: `calc(${playerH} - 18px)`, overflowY: 'hidden', zIndex: 49, /*DKDK_PANEL_H*/ padding: '8px 10px', display: 'flex', flexDirection: 'column', background: '#0a0a0f', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' } }
        onClick={e => e.stopPropagation()}
      >
        {loggedIn ? (
        <>
            {/* DKDK_CAGNOTTE_BLOCK — chantier #1 : transparence cagnotte */}
{bracketData && bracketData.bracket && (() => {
  const b = bracketData.bracket;
  const r = bracketData.active_round;
  /*DKDK_ETAT_VARS*/ // Sous-etape 1 : variables d'etat du challenge (verif console, pas encore d'affichage)
  const candidatsInscrits = bracketData.pool?.length ?? 0;
  const capaciteMax = b?.max_participants ?? 16;
  const placesRestantes = Math.max(0, capaciteMax - candidatsInscrits);
  const challengeEnCours = b?.status === 'in_progress' || b?.status === 'active'; /*DKDK_ENCOURS_ACTIVE*/
  const ROUND_LABELS: Record<number,string> = {1:"Huitième de finale",2:"Quart de finale",3:"Demi-finale",4:"Finale"};
  const ROUND_CUT: Record<number,string> = {1:"16 → 8",2:"8 → 4",3:"4 → 3",4:"2 → 1"};

  const obj = getRoundObjectif(b.max_participants ?? 16, b.current_round, objSettings); /*DKDK_OBJ_NET*/
  const col = r ? Math.round(r.montant_collecte * (1 - commission)) : 0;
  const pct = obj > 0 ? Math.min(100, Math.round(col / obj * 100)) : 0;
  const total = b.total_cagnotte || 0;
  const comm = b.commission_pct != null ? b.commission_pct : 0.5;
  const net = Math.round(total * (1 - comm));
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  /*DKDK_ROUNDLABEL_USE1*/
  const rl = getRoundLabel(b.max_participants ?? 16, b.current_round);
  return (
    <div style={{ background:"linear-gradient(135deg,rgba(126,3,128,0.52),rgb(237,7,15))", borderRadius:12, padding:"8px 11px", marginBottom:7, boxShadow:"0 4px 14px rgba(237,7,15,0.18)" }}>
      {/*DKDK_ENCART_FORMATION*/}
      {!challengeEnCours && (
        <div style={{ background:"rgba(0,0,0,0.25)", borderRadius:10, padding:"12px 14px", marginBottom:9, textAlign:"center" }}>
          <div style={{ fontFamily:"Syne, sans-serif", fontSize:15, fontWeight:800, color:"#fff", marginBottom:6 }}>⏳ Challenge en formation</div>
          <div style={{ fontSize:22, fontWeight:800, color:"#FFD700", fontFamily:"Syne, sans-serif", lineHeight:1.1 }}>{candidatsInscrits} / {capaciteMax}</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.85)", marginBottom:8 }}>candidats inscrits</div>
          <div style={{ display:"inline-block", background:"rgba(255,170,0,0.18)", border:"1px solid rgba(255,170,0,0.4)", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700, color:"#FFD700" }}>{placesRestantes} place{placesRestantes > 1 ? "s" : ""} restante{placesRestantes > 1 ? "s" : ""}</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", marginTop:8, lineHeight:1.5 }}>Le vote ouvrira quand le groupe sera complet.</div>
        </div>
      )}
      {/*DKDK_WRAP_ENCOURS*/}
      {challengeEnCours && (<>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:9 }}>
        <div>
          <div style={{ fontSize:8, fontWeight:800, letterSpacing:".12em", color:"#fff" }}>ÉTAPE EN COURS</div>
          <div style={{ fontFamily:"Syne, sans-serif", fontSize:15, fontWeight:800, color:"#fff" }}>{rl.label}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:10, color:"#fff" }}>{rl.cut} {rl.cut === "Bronze" ? "" : "candidats"}</div>
          <div style={{ fontSize:11, fontWeight:700, color:"#FFD700" }}>⏱ se clôt à l’objectif</div>
        </div>
      </div>
      <div style={{ fontSize:11, color:"#fff", display:"flex", justifyContent:"space-between", marginBottom:4 }}>
        <span>Objectif de l’étape</span>
        <span><b style={{ color:"#fff" }}>{fmt(col)}</b> / {fmt(obj)} F</span>
      </div>
      <div style={{ height:10, borderRadius:6, background:"rgba(0,0,0,0.28)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:pct + "%", background:"linear-gradient(90deg,#FFAA00,#FFD700)", borderRadius:6, transition:"width .5s" }} />
      </div>
      <div style={{ textAlign:"right", fontSize:11, fontWeight:800, color:"#FFD700", marginTop:3 }}>{pct} %</div>
      <div style={{ background:"rgba(0,0,0,0.45)", borderRadius:9, padding:"8px 11px", marginTop:10 }} /*DKDK_CAGNOTTE_NET*/>
        <div style={{ fontSize:10, color:"#fff", fontWeight:700, whiteSpace:"nowrap", letterSpacing:"0.01em" }}>🏆 CAGNOTTE DES PRIX À PARTAGER (Net après commission Plateforme {Math.round(comm*100)} %)</div>
        <div style={{ fontFamily:"Syne, sans-serif", fontSize:18, fontWeight:800, color:"#4ade80", lineHeight:1.1 }}>{fmt(net)} F</div>
      </div>
      <div style={{ fontSize:10, color:"#fff", marginTop:6, textAlign:"center" }}>{(function DKDK_PODIUM_LABEL(){var n = (b && b.max_participants) || 16;if (n <= 4) return "Champion 100 %";if (n <= 8) return "Champion 65 % \u00b7 2\u1d49 35 %";return "Champion 60 % \u00b7 2\u1d49 25 % \u00b7 3\u1d49 15 %";})()}</div>
      </>)}
    </div>
  );
})()}

              {/*DKDK_WRAP_VOTE*/}
              {challengeEnCours && (<>
              {/* Mon Solde */}
            <div style={{ background: '#13131a', border: '1px solid rgba(255,170,0,0.22)', borderRadius: 9, padding: '5px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, color: 'rgb(252, 219, 32)', fontWeight: 700, letterSpacing: '.08em', marginBottom: 2 }}>MON SOLDE</div>
                <div style={{ fontSize: 11, color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 1 }}><span>Crédit disponible :</span><b style={{ color: '#FFAA00', fontFamily: 'Syne, sans-serif' }}>{wallet ?? 0} F CFA</b></div>
                <div style={{ fontSize: 11, color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 1 }}><span>Disponible en ★ :</span><b style={{ color: '#FF0000' }}>{Math.floor((wallet ?? 0) / voteAmount)} étoile{Math.floor((wallet ?? 0) / voteAmount) > 1 ? 's' : ''}</b></div>
                <div style={{ fontSize: 11, color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>Disponible en ♥ :</span><b style={{ color: '#FF1493' }}>{Math.floor((wallet ?? 0) / heartAmount)} cœur{Math.floor((wallet ?? 0) / heartAmount) > 1 ? 's' : ''}</b></div>
              </div>
              <span style={{ fontSize: 18 }}>🏅</span>
            </div>

            {/* Messages erreur / succès */}
            {voteError && <div style={{ background: 'rgba(255,0,0,0.15)', border: '1.5px solid rgba(255,0,0,0.6)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontWeight: 700, color: '#FF0000', marginBottom: 8 }}>⚠️ {voteError}</div>}
            {voteSuccess && <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#4ade80', marginBottom: 8 }}>⭐ {starsQty} étoile{starsQty > 1 ? 's' : ''} envoyée{starsQty > 1 ? 's' : ''} !</div>}

            {/* Clavier unique — onglets ⭐ / ❤️ */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '6px 8px' }}>

              {/* Onglets */}
              {/*DKDK_FUSION_LIGNE*/}
              {/*DKDK_PALIERS_MOBILE : Passe 1 — affiche aussi sur PC (remplace l'ancien pave numerique)*/}
              {(() => {
                const paliers = [1, 2, 5, 10];
                const isStar = activeTab === 'stars';
                const onSend = isStar ? handleSendStars : handleSendHearts;
                const setQty = isStar ? setStarsQty : setHeartsQty;
                const votePalier = (u) => { setQty(u); setTimeout(() => onSend(), 0); };
                return (
                  <div style={{ background:'#FF0000', borderRadius:12, padding:11, marginBottom:6 }}>
                    <div style={{ display:'flex', gap:5, marginBottom:9 }}>
                      <button onClick={() => setActiveTab('stars')} style={{ flex:1, background: isStar ? '#FF8A00' : '#2b2b2b', color: isStar ? '#000' : '#fff', fontSize:12, textAlign:'center', borderRadius:6, padding:'7px 0', fontWeight:700, border:'none', cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>&#9733; Voter</button>
                      <button onClick={() => setActiveTab('hearts')} style={{ flex:1, background: !isStar ? '#FF8A00' : '#2b2b2b', color: !isStar ? '#000' : '#fff', fontSize:12, textAlign:'center', borderRadius:6, padding:'7px 0', fontWeight:700, border:'none', cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>&#9829; Liker</button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      {paliers.map(u => (
                        <button key={u} onClick={() => votePalier(u)} disabled={voteLoading || likeLoading} style={{ background:'#2b2b2b', border:'none', borderRadius:8, padding:'9px 4px', textAlign:'center', cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>
                          <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{u * (isStar ? voteAmount : heartAmount)} F</div>
                          <div style={{ fontSize:9, color:'#fff' }}>{u} unit&eacute;{u > 1 ? 's' : ''}</div>
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop:9, background:'#fff', borderRadius:8, padding:'9px 10px' }}>
                      <div style={{ fontSize:9, color:'#000', marginBottom:5, fontWeight:600 }}>Ou choisis ta propre quantit&eacute; :</div>
                      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                        <input type="number" min={1} value={isStar ? starsQty : heartsQty} onChange={e => { const n = parseInt(e.target.value); setQty(!isNaN(n) && n > 0 ? n : 1); }} style={{ flex:1, background:'#f0f0f0', border:'1px solid #ccc', borderRadius:6, padding:6, color:'#000', fontSize:12, minWidth:0 }} />
                        <button onClick={() => onSend()} disabled={voteLoading || likeLoading} style={{ background:'#FF0000', color:'#fff', fontSize:11, borderRadius:6, padding:'7px 14px', fontWeight:600, border:'none', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'DM Sans, sans-serif' }}>Envoyer</button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Saisie ± — ancien pave numerique : mobile uniquement (retire du PC en Passe 1) */}
              {isMobile && (() => {
                const isStar  = activeTab === 'stars';
                const qty     = isStar ? starsQty : heartsQty;
                const setQty  = isStar ? setStarsQty : setHeartsQty;
                const color   = isStar ? '#FFAA00' : '#ff6b6b';
                const bgVal   = isStar ? 'rgba(255,170,0,0.06)'  : 'rgba(255,80,80,0.06)';
                const border  = isStar ? 'rgba(255,170,0,0.2)'   : 'rgba(255,80,80,0.2)';
                const loading = isStar ? voteLoading : likeLoading;
                const overBal = qty > rechargeUnits;
                const btnBg   = overBal ? 'rgba(255,255,255,0.14)' : (isStar ? '#FAEEDA' : 'linear-gradient(135deg,rgba(126,3,128,0.85),rgb(237,7,15))');
                const btnCol  = overBal ? 'rgba(255,255,255,0.75)' : (isStar ? '#633806' : '#ffffff');
                const onSend  = isStar ? handleSendStars : handleSendHearts;
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <button onClick={() => setActiveTab('stars')} style={{ flex: 1, minWidth: 64, padding: '6px 2px', borderRadius: 7, border: `1px solid ${isStar ? 'rgba(255,170,0,0.5)' : 'rgba(255,255,255,0.08)'}`, background: isStar ? 'linear-gradient(135deg,#FF6B00,#FFAA00)' : 'transparent', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, flexShrink: 0 }}><span style={{ color: '#FF0000', fontSize: 14 }}>★</span>Voter</button>
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 24, height: 28, borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', fontSize: 15, color: '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
                      <div style={{ width: 70, textAlign: 'center', fontSize: 18, fontWeight: 800, color, fontFamily: 'Syne, sans-serif', background: '#000', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '4px 0', flexShrink: 0 }} /*DKDK_EQUILIBRE*/>{qty}</div>
                      <button onClick={() => setQty(q => Math.min(rechargeUnits, q + 1))} style={{ width: 24, height: 28, borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', fontSize: 15, color: '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
                      <button onClick={() => setActiveTab('hearts')} style={{ flex: 1, minWidth: 64, padding: '6px 2px', borderRadius: 7, border: `1px solid ${!isStar ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.08)'}`, background: !isStar ? 'linear-gradient(135deg,#FF6B00,#FFAA00)' : 'transparent', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, flexShrink: 0 }}><span style={{ color: '#FF1493', fontSize: 14 }}>♥</span>Liker</button>
                    </div>

                    {/* Pavé */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, marginBottom: 4 }}>
                      {['1','2','3','4','5','6','7','8','9','0','⌫'].map(k => (
                        <button key={k} onClick={() => {
                          if (k === '⌫') {
                            const s = String(qty).slice(0, -1);
                            setQty(Math.max(1, parseInt(s) || 1));
                          } else {
                            const s = String(qty === 1 ? '' : qty) + k;
                            const n = parseInt(s);
                            if (!isNaN(n) && n > 0) setQty(Math.min(n, rechargeUnits || 9999));
                          }
                        }}
                          style={{ gridColumn: k === '0' ? '1/3' : 'auto', padding: '4px 2px', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 6, background: 'rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 500, color: k === '⌫' ? '#f87171' : '#f0f0f0', cursor: 'pointer', textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
                          {k}
                        </button>
                      ))}
                    </div>

                    {/* Récap + Bouton */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>
                      <span>{isStar ? qty : qty * 2} unité{(isStar ? qty : qty * 2) > 1 ? 's' : ''} · {isStar ? qty * voteAmount : qty * heartAmount} F</span>
                      <span>Reste : {Math.max(0, rechargeUnits - (isStar ? qty : qty * 2))}</span>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 4, lineHeight: 1.3 }} /*DKDK_C3_MENTION*/>{isStar ? `1 Étoile = 1 Unité = ${voteAmount} F CFA` : `1 Cœur (Compte Double) = 2 Unités = ${heartAmount} F CFA`}</div>
                    <button onClick={onSend} disabled={loading || overBal || qty < 1}
                      style={{ width: '100%', padding: '7px', background: btnBg, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, marginTop: 'auto', color: btnCol, cursor: overBal ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      {loading ? '⏳…' : (<><span style={{ color: isStar ? '#FF0000' : '#FF1493', fontSize: 18, marginRight: 4 }}>{isStar ? '★' : '♥'}</span>{`Envoyer ${qty} ${isStar ? `étoile${qty > 1 ? 's' : ''}` : `cœur${qty > 1 ? 's' : ''}`}`}</>)}
                    </button>
                  </>
                );              })()}
            </div>
          </>)}
          {/*DKDK_SOUTENIR_BLOCK*/}
          {/*DKDK_SOUTENIR_COND_FIX*/}
          {loggedIn && estTermine && bracketData?.current_participant_id && (
            <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'10px 12px', marginTop:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', letterSpacing:'.08em', marginBottom:8 }}>SOUTENIR CE CANDIDAT</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', marginBottom:10, lineHeight:1.5 }}>
                {/*DKDK_SOUTENIR_TEXTE_FIN*/}{/*DKDK_SOUTENIR_NO50*/}Ce challenge est terminé. Vous pouvez encore soutenir ce candidat avec <b style={{ color:'#FFAA00' }}>{soutenirAmount} F CFA</b>.
              </div>
              {voteError && <div style={{ background:'rgba(255,0,0,0.15)', border:'1.5px solid rgba(255,0,0,0.6)', borderRadius:8, padding:'8px 10px', fontSize:12, fontWeight:700, color:'#FF0000', marginBottom:8 }}>⚠️ {voteError}</div>}
              {soutenirSuccess && <div style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:8, padding:'8px 10px', fontSize:11, color:'#4ade80', marginBottom:8 }}>💚 Soutien envoyé !</div>}
              <button onClick={handleSoutenir} disabled={soutenirLoading}
                style={{ width:'100%', padding:'9px', background:'linear-gradient(135deg,rgba(126,3,128,0.85),rgb(237,7,15))', border:'none', borderRadius:9, fontSize:13, fontWeight:700, color:'#fff', cursor:soutenirLoading ? 'not-allowed' : 'pointer', fontFamily:'DM Sans, sans-serif', opacity:soutenirLoading ? 0.6 : 1 }}>
                {soutenirLoading ? '⏳…' : `💚 Soutenir — ${soutenirAmount} F CFA`}
              </button>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', textAlign:'center', marginTop:6 }}>Solde : {wallet ?? 0} F CFA</div>
            </div>
          )}
          </>
        ) : (
          /* ── Visiteur — info challenge + invite a se connecter ── */
          <>
          {/*DKDK_VISITEUR_INFO*/}
          {bracketData && bracketData.bracket && (
            challengeEnCours ? (
              <div style={{ background:"linear-gradient(135deg,rgba(126,3,128,0.52),rgb(237,7,15))", borderRadius:12, padding:"10px 12px", marginBottom:8 }}>
                <div style={{ fontSize:8, fontWeight:800, letterSpacing:".12em", color:"#fff" }}>ÉTAPE EN COURS</div>
                <div style={{ fontFamily:"Syne, sans-serif", fontSize:15, fontWeight:800, color:"#fff" }} /*DKDK_ROUNDLABEL_USE_VISITEUR*/>{getRoundLabel(bracketData.bracket.max_participants ?? 16, bracketData.bracket.current_round).label}</div>
              </div>
            ) : (
              <div style={{ background:"linear-gradient(135deg,rgba(126,3,128,0.52),rgb(237,7,15))", borderRadius:12, padding:"12px 14px", marginBottom:8, textAlign:"center" }}>
                <div style={{ fontFamily:"Syne, sans-serif", fontSize:15, fontWeight:800, color:"#fff", marginBottom:6 }}>⏳ Challenge en formation</div>
                <div style={{ fontSize:22, fontWeight:800, color:"#FFD700", fontFamily:"Syne, sans-serif", lineHeight:1.1 }}>{candidatsInscrits} / {capaciteMax}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.85)", marginBottom:8 }}>candidats inscrits</div>
                <div style={{ display:"inline-block", background:"rgba(255,170,0,0.18)", border:"1px solid rgba(255,170,0,0.4)", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700, color:"#FFD700" }}>{placesRestantes} place{placesRestantes > 1 ? "s" : ""} restante{placesRestantes > 1 ? "s" : ""}</div>
              </div>
            )
          )}
          {/*DKDK_VISITEUR_VOTE*/}
          {challengeEnCours ? (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <button onClick={() => setActiveTab('stars')} style={{ flex: 1, padding: '7px 2px', borderRadius: 7, border: '1px solid rgba(255,170,0,0.4)', background: activeTab === 'stars' ? 'linear-gradient(135deg,#FF6B00,#FFAA00)' : 'transparent', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><span style={{ color: '#FF0000' }}>★</span> Voter</button>
                <button onClick={() => setActiveTab('hearts')} style={{ flex: 1, padding: '7px 2px', borderRadius: 7, border: '1px solid rgba(255,80,80,0.4)', background: activeTab === 'hearts' ? 'linear-gradient(135deg,#FF6B00,#FFAA00)' : 'transparent', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}><span style={{ color: '#FF1493' }}>♥</span> Liker</button>
              </div>
              {(() => {
                var isStar = activeTab === 'stars';
                var qty = isStar ? starsQty : heartsQty;
                var setQty = isStar ? setStarsQty : setHeartsQty;
                var unitF = isStar ? voteAmount : heartAmount;
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                      <button onClick={() => setQty(function(q){ return Math.max(1, q - 1); })} style={{ width: 30, height: 30, borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', fontSize: 16, color: '#f0f0f0', cursor: 'pointer' }}>−</button>
                      <div style={{ width: 70, textAlign: 'center', fontSize: 20, fontWeight: 800, color: isStar ? '#FFAA00' : '#ff6b6b', fontFamily: 'Syne, sans-serif', background: '#000', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '4px 0' }}>{qty}</div>
                      <button onClick={() => setQty(function(q){ return q + 1; })} style={{ width: 30, height: 30, borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', fontSize: 16, color: '#f0f0f0', cursor: 'pointer' }}>+</button>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 8 }}>{qty} {isStar ? '★' : '♥'} = <b style={{ color: '#FFAA00' }}>{qty * unitF} F</b></div>
                    <button onClick={isStar ? handleSendStars : handleSendHearts} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg,rgba(126,3,128,0.85),rgb(237,7,15))', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>{isStar ? '★ Voter' : '♥ Liker'}</button>
                  </>
                );
              })()}
              <div style={{ fontSize: 11, color: '#4ade80', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>✓ Pas besoin de compte — votez directement, paiement securise par Mobile Money.</div>
              <div onClick={() => router.push('/auth/register')} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 6, cursor: 'pointer', textDecoration: 'underline' }}>ou creez un compte gratuit</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '20px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 32 }}>🔒</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Challenge en formation</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>Le vote ouvrira quand le groupe sera complet.</div>
            </div>
          )}
          </>
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
      <div style={ isMobile ? { ...s.fixedFooter, position: 'static', height: 'auto', width: '100%' } : { ...s.fixedFooter, height: FOOTER_H } } /*DKDK_FOOTER_STATIC_MOBILE*/>
        <div style={{ height: BAND_H, overflow: 'hidden' }}>
        {/*DKDK_SIEGES_CALC*/}
        {(() => {
          const inscrits = [...(bracketData?.pool ?? [])].sort((a, b) => String(a.registered_at ?? '').localeCompare(String(b.registered_at ?? '')));
          const N = bracketData?.bracket?.max_participants ?? 16;
          const sieges = Array.from({ length: N }, (_, i) => inscrits[i] ?? null);
          const parScore = [...inscrits].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          const rangScore = {};
          parScore.forEach((c, idx) => { if (c) rangScore[c.participant_id] = idx + 1; });
          return null;
        })()}
          <style>{`@keyframes dkdkMarquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } } .dkdk-marquee-track:hover { animation-play-state: paused; }`}</style>
          <div ref={bandRef} style={ isMobile ? { ...s.band, overflowX: 'auto', maxWidth: '100vw', padding: '0 8px' } : { ...s.band, overflowX: 'hidden' } } /*DKDK_MARQUEE_WRAP DKDK_BAND_MOBILE*/>
            <div ref={bandTrackRef} className={isMobile ? '' : 'dkdk-marquee-track'} style={{ display: 'flex', alignItems: 'center', gap: 10, width: 'max-content', willChange: 'transform' }} /*DKDK_TRACK_JS*/>
            <span style={{ fontSize: 14, flexShrink: 0, marginRight: 4 }}>🏆</span>
            {/* DKDK_BANDE_EXCLURE — cartes verticales, sans le candidat en lecture */}
            {(() => {
              const _ins = [...(bracketData?.pool ?? [])].sort((a: any, b: any) => String(a.registered_at ?? '').localeCompare(String(b.registered_at ?? '')));
              const _N = bracketData?.bracket?.max_participants ?? 16;
              const _siegesArr = Array.from({ length: _N }, (_, i) => _ins[i] ?? null);
              const _parScore = [..._ins].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
              const _rangScore: Record<string, number> = {};
              _parScore.forEach((p: any, idx: number) => { if (p) _rangScore[p.participant_id] = idx + 1; });
              return _siegesArr.map((c: any, i: number) => {
                if (!c) { /*DKDK_SIEGE_PARTICIPER*/ const _libre = (<div key={'libre-'+i} onClick={!challengeEnCours ? (() => router.push('/challenges/' + (bracketData?.bracket?.id || ''))) : undefined} style={{ ...s.candidateCard, opacity: challengeEnCours ? 0.35 : 0.9, justifyContent:'center', cursor: challengeEnCours ? 'default' : 'pointer', border: challengeEnCours ? undefined : '1px dashed rgba(255,170,0,0.5)' }}><span style={{ fontSize:10, fontWeight:800, color: challengeEnCours ? 'rgba(255,255,255,0.4)' : '#FFAA00', fontStyle: challengeEnCours ? 'italic' : 'normal', textAlign:'center', padding:'0 4px', lineHeight:1.2 }}>{challengeEnCours ? 'Siege ' + (i+1) + ' - libre' : 'Siege libre, cliquez ici pour PARTICIPER !'}</span></div>); return _libre; }
                const enLecture = c.participant_id === bracketData?.current_participant_id;
                const elimine = !!c.eliminated_at;
                const rank = _rangScore[c.participant_id] ?? 99;
                const isPodium = rank <= 3;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ('#' + rank);
                const rankBg = rank === 1 ? '#FFAA00' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#3a3a44';
                const initial = (c.name ?? '?')[0].toUpperCase();
                /*DKDK_SIEGE_BRONZE_STATUT*/
                const _estRoundBronze = bracketData?.bracket?.max_participants === 16 && bracketData?.active_round?.round === 4;
                const _estBronze = c.final_path === 'bronze';
                const _estFinaliste = c.final_path === 'finale';
                const _attente = _estRoundBronze && _estFinaliste;
                /*DKDK_MEDAILLE_BRONZE*/
                const _estApresBronze = bracketData?.bracket?.max_participants === 16 && (bracketData?.active_round?.round === 5 || bracketData?.bracket?.status === 'done');
                const _estTroisieme = _estApresBronze && bracketData?.bracket?.third_id === c.participant_id;
                if (enLecture) return (<div key={c.participant_id} style={{ ...s.candidateCard, background: 'linear-gradient(135deg,rgb(74,4,76),rgb(120,10,20))', border:'2px solid #FFAA00', justifyContent:'center', cursor:'default' }}><div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}><span style={{ fontSize:9, fontWeight:800, letterSpacing:'.08em', color:'#FFAA00' }}>{c.suspended_at ? 'SUSPENDU' : 'CANDIDAT EN LECTURE'}</span><span style={s.candidateName}>{c.suspended_at ? 'Suspendu' : (c.name ?? 'Candidat')}</span></div></div>);
                return (
                  <button key={c.participant_id}
                    style={{ ...s.candidateCard, background: 'linear-gradient(135deg,rgb(74,4,76),rgb(120,10,20))', border: rank === 1 ? '2px solid #FFAA00' : s.candidateCard.border, opacity: elimine ? 0.4 : (_attente ? 0.5 : 1), cursor: elimine ? 'default' : 'pointer' }} /*DKDK_ELIM*/
                    onClick={() => { if (!elimine && c.video_id) router.push(`/watch/${c.video_id}`); }}>
                    {!_estRoundBronze && !_estTroisieme && (<span style={{ position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: '50%', background: rankBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isPodium ? 13 : 11, fontWeight: 800, color: '#0a0a0f' }}>{medal}</span>)}
                    {_estTroisieme && (<span style={{ position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: '50%', background: '#cd7f32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#0a0a0f' }}>🥉</span>)}
                    {_estRoundBronze && (_estBronze || _estFinaliste) && (
                      <span style={{ position: 'absolute', bottom: 6, left: 6, right: 6, fontSize: 8, fontWeight: 800, textAlign: 'center', lineHeight: 1.2, color: _estBronze ? '#cd7f32' : '#fff' }}>
                        {_estBronze ? 'QUALIFIE POUR LA 3eme PLACE' : 'QUALIFIE POUR LA FINALE'}
                      </span>
                    )}
                    {_estTroisieme && (<span style={{ position: 'absolute', bottom: 6, left: 6, right: 6, fontSize: 8, fontWeight: 800, textAlign: 'center', lineHeight: 1.2, color: '#cd7f32' }}>🥉 3ème PLACE</span>)}
                    <div style={s.candidateAvatar}>
                      {c.avatar_url ? <img src={c.avatar_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : initial}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                      <div style={s.candidateName}>{c.suspended_at ? 'Suspendu' : elimine ? 'Éliminé' : (c.name ?? 'Candidat')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                        <span style={{ color: '#FF0000' }}>★ <span style={{ color: '#fff' }}>{c.stars_count ?? 0}</span></span>
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                        <span style={{ color: '#FF1493' }}>♥ <span style={{ color: '#fff' }}>{c.hearts_count ?? 0}</span></span>
                      </div>
                    </div>
                  </button>
                );
              });
            })()/*DKDK_SIEGES_IIFE_CLOSE*/}
            {(!bracketData?.pool || bracketData.pool.length === 0) && <span style={{ color: 'rgba(255,154,0,0.5)', fontSize: 12, fontStyle: 'italic', fontFamily: 'DM Sans, sans-serif' }}>Autres challenges à venir</span>}
            </div>{/*DKDK_MARQUEE_END*/}
          </div>
        </div>

        <TickerBand />

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#ffffff', color: '#f0f0f0', /*DKDK_NOSCROLL*/ fontFamily: 'DM Sans, sans-serif', position: 'relative', overflow: 'hidden', height: '100vh' },
  fixedHeader: { position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,170,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0 0 0', zIndex: 100 },
  logoInline: { display: 'inline-flex', alignItems: 'center' },
  logoDiki: { color: '#FFAA00', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20 },
  logoDash: { color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 300, fontSize: 20, margin: '0 2px' },
  scrollContent: { paddingTop: 8, paddingLeft: 16, paddingRight: 16 },
  video: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
  videoOverlay: { position: 'absolute', bottom: 36, left: 0, right: 0, padding: '36px 12px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', pointerEvents: 'none' },
  disciplineBadge: { display: 'inline-block', background: 'linear-gradient(135deg,rgba(126,3,128,0.85),rgb(237,7,15))', border: '1px solid rgba(237,7,15,0.5)', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, marginBottom: 3 },
  overlayTitle: { margin: '0 0 2px', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' },
  overlayTrack: { margin: '0 0 2px', fontSize: 11, color: '#ddd', fontStyle: 'italic' },
  overlayMeta: { margin: 0, fontSize: 10, color: '#aaa' },
  progressOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px 7px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', transition: 'opacity 0.3s' },
  progressRow: { display: 'flex', alignItems: 'center', gap: 5 },
  timeText: { color: '#ddd', fontSize: 9, minWidth: 24, fontVariantNumeric: 'tabular-nums' },
  progressBar: { flex: 1, height: 2, cursor: 'pointer', accentColor: '#FF0000' },
  ctrlBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center', minWidth: 22, justifyContent: 'center' },
  playOverlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  /*DKDK_BADGE_PLAY*/ playBubble: { width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(126,3,128,0.85),rgb(237,7,15))', display: 'flex', alignItems: 'center', justifyContent: 'center' },
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
  band: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, overflowX: 'auto', overflowY: 'hidden' as const, scrollbarWidth: 'none' as const, height: '100%', background: '#ffffff', padding: '0 12px', borderTop: '2px solid #FF8C00', borderBottom: '1px solid rgba(255,154,0,0.3)' },
  candidateCard: { display: 'flex', flexDirection: 'row' as const, alignItems: 'center', gap: 8, width: 'auto', height: 76, background: 'linear-gradient(180deg,#16161f,#0c0c12)' /*DKDK_CARTES_CENTRE*/, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '8px 14px 8px 10px', cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Sans, sans-serif', position: 'relative' as const } /*DKDK_C1B*/,
  candidateAvatar: { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 18, overflow: 'hidden' as const, flexShrink: 0 },
  candidateName: { color: '#fff', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' as const, maxWidth: 110, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, textAlign: 'left' as const },
  candidateNum: { color: '#FFD480', fontSize: 8, fontWeight: 700 },
  navBtn: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', flex: 1, height: '100%' },
  navIconBox: { width: 40, height: 40, borderRadius: 12, background: '#7e0380', border: '0.5px solid rgba(255,170,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFAA00' } /*DKDK_ICONBOX_AJOUTER*/,
  navLabel: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 0.4, fontFamily: 'DM Sans, sans-serif', color: '#FFAA00' } /*DKDK_LABELS_JAUNE*/,
};

function PlayIcon()    { return <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>; }
function BigPlay()     { return <svg width={22} height={22} viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>; }
function PauseIcon()   { return <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>; }
function VolumeIcon()  { return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /></svg>; }
function MuteIcon()    { return <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>; }
function FsIcon()      { return <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>; }
function ExitFsIcon()  { return <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#FFAA00" strokeWidth={2.5}><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>; }
function LikeIcon({ liked }: { liked: boolean }) { return <svg width={20} height={20} viewBox="0 0 24 24" fill={liked ? '#ff6b6b' : 'none'} stroke={liked ? '#ff6b6b' : '#fff'} strokeWidth={2}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>; }
function VoteIcon({ active }: { active: boolean }) { return <svg width={20} height={20} viewBox="0 0 24 24" fill={active ? '#FF0000' : 'none'} stroke={active ? '#FF0000' : '#fff'} strokeWidth={2}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>; }
function SubscribeIcon({ active }: { active: boolean }) { return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={active ? '#FFAA00' : '#fff'} strokeWidth={2} strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>; }
function RemixIcon()   { return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>; }
function ShareIcon()   { return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>; }
function DownloadIcon(){ return <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function SpinIcon()    { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M21 12a9 9 0 0 0-9-9" /></svg>; }
function UserIcon()    { return <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round'><circle cx='12' cy='8' r='4'/><path d='M4 21v-1a6 6 0 0 1 12 0v1'/></svg>; }
  function HomeIcon()    { return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>; }
function RechargeIcon(){ return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>; }
function BilletIcon()  { return <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="22" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M1 10h2M21 10h2M1 14h2M21 14h2"/></svg>; }
function LiveIcon()    { return <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>; }
function WaIcon()      { return <svg width={15} height={15} viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>; }
function FbIcon()      { return <svg width={15} height={15} viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>; }
function LinkIcon()    { return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>; }
