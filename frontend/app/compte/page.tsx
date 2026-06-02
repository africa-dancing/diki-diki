'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
import './compte.css';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TickerBand from '../components/TickerBand';
import TranslateWidget from '../components/TranslateWidget';

// ✅ Étoile rouge — identique au logo
const StarRed = () => <span style={{ color: '#FF0000' }}>★</span>;

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }
function decodeToken(token: string): { userId?: string; role?: string } | null {
  try { const p = token.split('.')[1]; return JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/'))); } catch { return null; }
}

const DISC_EMOJI: Record<string,string> = { danse:'💃',chant:'🎤',instrument:'🎸',acapella:'🎙️',humour:'😂',poesie:'📜',conte:'📖',musique:'🎵' };
const DISC_FR: Record<string,string>    = { danse:'Danse',chant:'Chant',instrument:'Instrument',acapella:'A cappella',humour:'Humour',poesie:'Poésie',poésie:'Poésie',conte:'Conte',musique:'Musique' };
const DISCS       = ['all','danse','chant','humour','poesie','conte','musique'];
const DISC_LABELS: Record<string,string> = { all:'Tous',danse:'💃 Danse',chant:'🎤 Chant',humour:'😂 Humour',poesie:'📜 Poésie',conte:'📖 Conte',musique:'🎵 Musique' };
const COUNTRIES = [
  {code:'BJ',flag:'🇧🇯',name:'Bénin'},{code:'CI',flag:'🇨🇮',name:"Côte d'Ivoire"},{code:'SN',flag:'🇸🇳',name:'Sénégal'},{code:'ML',flag:'🇲🇱',name:'Mali'},
  {code:'BF',flag:'🇧🇫',name:'Burkina Faso'},{code:'GN',flag:'🇬🇳',name:'Guinée'},{code:'TG',flag:'🇹🇬',name:'Togo'},{code:'CM',flag:'🇨🇲',name:'Cameroun'},
  {code:'NG',flag:'🇳🇬',name:'Nigeria'},{code:'GH',flag:'🇬🇭',name:'Ghana'},{code:'FR',flag:'🇫🇷',name:'France'},{code:'BE',flag:'🇧🇪',name:'Belgique'},
  {code:'CA',flag:'🇨🇦',name:'Canada'},{code:'US',flag:'🇺🇸',name:'États-Unis'},
];

// ✅ 'education' ajouté au TabId
type TabId = 'dashboard'|'videos'|'competitions'|'education'|'finances'|'settings';
interface UserProfile { id:string;name:string;email:string;country?:string;photo_url?:string;bio?:string; }
interface UserVideo   { id:string;title:string;discipline?:string;status:'draft'|'pending'|'approved'|'rejected';views?:number;vote_count?:number;created_at:string;rejection_reason?:string; }
interface Candidate   { id:string;name:string;stage_name?:string;track_title?:string;track_artist?:string;votes:number;percentage:number;video?:{id:string;storage_url?:string;thumbnail_url?:string}; }
interface Contest     { id:string;title:string;discipline:string;comp_type:'duo'|'groupe';status:string;ends_at:string;candidates:Candidate[]; }
interface VoteState   { voted:boolean;votedVideoId?:string; }
interface Privacy     { name_visible:boolean;photo_visible:boolean;phone_visible:boolean;email_visible:boolean;score_visible:boolean;location_visible:boolean; }

const TABS: {id:TabId;emoji:string;label:string}[] = [
  {id:'dashboard',   emoji:'📊', label:'Tableau de bord'},
  {id:'videos',      emoji:'🎬', label:'Mes vidéos'},
  {id:'competitions',emoji:'🏆', label:'Compétitions'},
  {id:'education',   emoji:'📚', label:'Éducation & Savoirs'},
  {id:'finances',    emoji:'💳', label:'Finances'},
  {id:'settings',    emoji:'⚙️', label:'Paramètres'},
];

const card: React.CSSProperties = { background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:18,padding:'18px 20px',marginBottom:12 };
const btnPrimary: React.CSSProperties = { background:'linear-gradient(135deg,#FFAA00,#FF6B00)',border:'none',borderRadius:50,padding:'9px 20px',fontSize:13,fontWeight:700,color:'#000',cursor:'pointer',fontFamily:'DM Sans, sans-serif' };
const btnSecondary: React.CSSProperties = { background:'transparent',border:'1px solid rgba(255,255,255,0.15)',borderRadius:50,padding:'9px 18px',fontSize:13,color:'rgba(255,255,255,0.9)',cursor:'pointer',fontFamily:'DM Sans, sans-serif' };

function StatusBadge({status}:{status:UserVideo['status']}) {
  const cfg = {
    draft:    {bg:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.9)',border:'rgba(255,255,255,0.15)',label:'📝 Brouillon'},
    approved: {bg:'rgba(74,222,128,0.12)', color:'#4ade80',             border:'rgba(74,222,128,0.25)',label:'✓ Approuvée'},
    pending:  {bg:'rgba(255,170,0,0.1)',   color:'#FFAA00',             border:'rgba(255,170,0,0.25)', label:'⏳ En attente'},
    rejected: {bg:'rgba(248,113,113,0.1)', color:'#f87171',             border:'rgba(248,113,113,0.25)',label:'✕ Rejetée'},
  }[status];
  return <span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,whiteSpace:'nowrap'as const}}>{cfg.label}</span>;
}

function Toggle({on,onToggle}:{on:boolean;onToggle:()=>void}) {
  return <div onClick={onToggle} style={{width:48,height:26,borderRadius:13,background:on?'#FFAA00':'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',padding:3,cursor:'pointer',flexShrink:0,transition:'background 0.25s'}}><div style={{width:20,height:20,borderRadius:'50%',background:on?'#fff':'rgba(255,255,255,0.45)',marginLeft:on?'auto':0,transition:'margin 0.25s'}}/></div>;
}

function SubmissionModal({video,contests,onClose,onSuccess}:{video:{id:string;title:string;discipline?:string};contests:Contest[];onClose:()=>void;onSuccess:()=>void}) {
  const [sel,setSel]=useState('');const [load,setLoad]=useState(false);const [err,setErr]=useState('');const [done,setDone]=useState(false);
  const open=contests.filter(c=>c.status==='active'||c.status==='pending');
  async function submit(){if(!sel){setErr('Choisis une compétition.');return;}setLoad(true);setErr('');try{const res=await fetch(`${API}/videos/${video.id}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({status:'pending',contest_id:sel})});const d=await res.json();if(!res.ok)throw new Error(d.message??d.error??'Erreur');setDone(true);setTimeout(()=>{onSuccess();onClose();},2000);}catch(e:any){setErr(e.message);}finally{setLoad(false);}}
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.78)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#12121e',border:'1px solid rgba(255,170,0,0.25)',borderRadius:20,width:'100%',maxWidth:460,overflow:'hidden'}}>
        <div style={{background:'linear-gradient(135deg,rgba(255,170,0,0.1),rgba(255,107,0,0.06))',borderBottom:'1px solid rgba(255,170,0,0.15)',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontSize:10,color:'#FFAA00',fontWeight:700,letterSpacing:'.1em',marginBottom:3}}>SOUMETTRE POUR VALIDATION</div><div style={{fontSize:16,fontWeight:800,color:'#fff',fontFamily:'Syne, sans-serif'}}>🏆 Choisir une compétition</div></div>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.9)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        {done?(<div style={{padding:40,textAlign:'center'}}><div style={{fontSize:44,marginBottom:12}}>🎉</div><p style={{color:'#4ade80',fontWeight:700,fontSize:15,marginBottom:6}}>Vidéo soumise pour validation !</p><p style={{color:'rgba(255,255,255,0.85)',fontSize:12,lineHeight:1.6}}>Notre équipe examinera ta vidéo sous 24 à 48h.</p></div>):(
          <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>
            <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:20}}>{DISC_EMOJI[video.discipline??'']??'🎬'}</span><div><div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{video.title}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.85)'}}>Brouillon → En attente de modération</div></div></div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Compétition * <span style={{color:'rgba(248,113,113,0.7)',fontSize:10,textTransform:'none',fontWeight:400}}>obligatoire</span></label>
              {open.length===0?(<div style={{background:'rgba(248,113,113,0.07)',border:'1px solid rgba(248,113,113,0.18)',borderRadius:12,padding:'12px 14px',fontSize:13,color:'#f87171'}}>⚠️ Aucune compétition ouverte en ce moment.</div>):(
                <div style={{display:'flex',flexDirection:'column',gap:8}}>{open.map(c=>(<div key={c.id} onClick={()=>setSel(c.id)} style={{padding:'12px 14px',borderRadius:12,border:`1px solid ${sel===c.id?'#FFAA00':'rgba(255,255,255,0.1)'}`,background:sel===c.id?'rgba(255,170,0,0.08)':'rgba(255,255,255,0.03)',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'all .2s'}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:2}}>{c.title}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.85)'}}>{DISC_FR[c.discipline]??c.discipline} · {c.status==='active'?'● En cours':'○ Bientôt'}</div></div><div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${sel===c.id?'#FFAA00':'rgba(255,255,255,0.2)'}`,background:sel===c.id?'#FFAA00':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{sel===c.id&&<div style={{width:8,height:8,borderRadius:'50%',background:'#000'}}/>}</div></div>))}</div>
              )}
            </div>
            <div style={{background:'rgba(255,170,0,0.04)',border:'1px solid rgba(255,170,0,0.15)',borderRadius:10,padding:'10px 14px',fontSize:11,color:'rgba(255,170,0,0.7)',lineHeight:1.6}}>ℹ️ Ta vidéo sera examinée et apparaîtra dans la compétition dès son approbation.</div>
            {err&&<div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#f87171'}}>⚠️ {err}</div>}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:4}}><button onClick={onClose} style={btnSecondary}>Annuler</button><button onClick={submit} disabled={load||!sel||open.length===0} style={{...btnPrimary,opacity:(!sel||open.length===0)?0.4:1}}>{load?'⏳ Soumission…':'✅ Soumettre pour validation'}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

function InscriptionModal({contests,approvedVideos,preSelectedVideoId,onClose,onSuccess}:{contests:Contest[];approvedVideos:UserVideo[];preSelectedVideoId?:string;onClose:()=>void;onSuccess:()=>void}) {
  const [selV,setSelV]=useState(preSelectedVideoId??'');const [selC,setSelC]=useState('');const [load,setLoad]=useState(false);const [err,setErr]=useState('');const [done,setDone]=useState(false);
  const open=contests.filter(c=>c.status==='active'||c.status==='pending');
  async function submit(){if(!selV||!selC){setErr('Sélectionne une vidéo et une compétition.');return;}setLoad(true);setErr('');try{const res=await fetch(`${API}/contests/${selC}/candidates`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({video_id:selV})});const d=await res.json();if(!res.ok)throw new Error(d.message??d.error??'Erreur');setDone(true);setTimeout(()=>{onSuccess();onClose();},1800);}catch(e:any){setErr(e.message);}finally{setLoad(false);}}
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#12121e',border:'1px solid rgba(255,170,0,0.25)',borderRadius:20,width:'100%',maxWidth:480,overflow:'hidden'}}>
        <div style={{background:'linear-gradient(135deg,rgba(255,170,0,0.1),rgba(255,107,0,0.06))',borderBottom:'1px solid rgba(255,170,0,0.15)',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:10,color:'#FFAA00',fontWeight:700,letterSpacing:'.1em',marginBottom:3}}>COMPÉTITION</div><div style={{fontSize:17,fontWeight:800,color:'#fff',fontFamily:'Syne, sans-serif'}}>Inscrire une vidéo 🏆</div></div><button onClick={onClose} style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.9)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>
        {done?(<div style={{padding:40,textAlign:'center'}}><div style={{fontSize:48,marginBottom:12}}>🎉</div><p style={{color:'#4ade80',fontWeight:700,fontSize:15}}>Inscription enregistrée !</p></div>):(
          <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:14}}>
            {!preSelectedVideoId&&approvedVideos.length>0&&(<div><label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Vidéo approuvée</label><div style={{display:'flex',flexDirection:'column',gap:6}}>{approvedVideos.map(v=>(<div key={v.id} onClick={()=>setSelV(v.id)} style={{padding:'10px 14px',borderRadius:12,border:`1px solid ${selV===v.id?'#FFAA00':'rgba(255,255,255,0.1)'}`,background:selV===v.id?'rgba(255,170,0,0.08)':'rgba(255,255,255,0.03)',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:20}}>{DISC_EMOJI[v.discipline??'']??'🎬'}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{v.title}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.85)'}}>{DISC_FR[v.discipline??'']??v.discipline}</div></div>{selV===v.id&&<span style={{color:'#FFAA00',fontSize:16}}>✓</span>}</div>))}</div></div>)}
            {preSelectedVideoId&&(<div style={{padding:'10px 14px',borderRadius:12,border:'1px solid rgba(255,170,0,0.3)',background:'rgba(255,170,0,0.06)'}}><div style={{fontSize:11,color:'#FFAA00',fontWeight:700,marginBottom:3}}>VIDÉO SÉLECTIONNÉE</div><div style={{fontSize:13,color:'#fff'}}>{approvedVideos.find(v=>v.id===preSelectedVideoId)?.title??preSelectedVideoId}</div></div>)}
            <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Compétition ouverte</label>{open.length===0?(<p style={{fontSize:13,color:'rgba(255,255,255,0.85)',fontStyle:'italic'}}>Aucune compétition ouverte.</p>):(<div style={{display:'flex',flexDirection:'column',gap:6}}>{open.map(c=>(<div key={c.id} onClick={()=>setSelC(c.id)} style={{padding:'10px 14px',borderRadius:12,border:`1px solid ${selC===c.id?'#FFAA00':'rgba(255,255,255,0.1)'}`,background:selC===c.id?'rgba(255,170,0,0.08)':'rgba(255,255,255,0.03)',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:20}}>{DISC_EMOJI[c.discipline]??'🏆'}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{c.title}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.85)'}}>{DISC_FR[c.discipline]??c.discipline} · {c.comp_type}</div></div>{selC===c.id&&<span style={{color:'#FFAA00',fontSize:16}}>✓</span>}</div>))}</div>)}</div>
            {err&&<div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#f87171'}}>⚠️ {err}</div>}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:4}}><button onClick={onClose} style={btnSecondary}>Annuler</button><button onClick={submit} disabled={load||!selV||!selC||approvedVideos.length===0} style={{...btnPrimary,opacity:(!selV||!selC||approvedVideos.length===0)?0.5:1}}>{load?'⏳ Inscription…':"🏆 S'inscrire"}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ✅ icon prop changé de string à React.ReactNode pour supporter <StarRed />
function PrivacyRow({icon,label,desc,on,onToggle}:{icon:React.ReactNode;label:string;desc:string;on:boolean;onToggle:()=>void}) {
  return (
    <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
      <div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
        <span style={{fontSize:20}}>{icon}</span>
        <div><div style={{fontSize:14,fontWeight:600,color:'#fff',marginBottom:2}}>{label}</div><div style={{fontSize:11,color:'rgba(255,255,255,0.35)',lineHeight:1.5}}>{desc}</div></div>
      </div>
      <Toggle on={on} onToggle={onToggle}/>
    </div>
  );
}

function ConfidentialiteSection({earnings}:{earnings:number}) {
  const [privacy,setPrivacy]=useState<Privacy>({name_visible:true,photo_visible:true,phone_visible:false,email_visible:false,score_visible:true,location_visible:true});
  const [saved,setSaved]=useState(false);const [saving,setSaving]=useState(false);
  useEffect(()=>{const t=getToken();if(!t)return;fetch(`${API}/users/privacy`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.ok?r.json():null).then(d=>{if(d)setPrivacy(p=>({...p,...d}));}).catch(()=>{});},[]);
  const toggle=(k:keyof Privacy)=>setPrivacy(p=>({...p,[k]:!p[k]}));
  const save=async()=>{const t=getToken();if(!t)return;setSaving(true);try{await fetch(`${API}/users/privacy`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify(privacy)});setSaved(true);setTimeout(()=>setSaved(false),3000);}catch{}finally{setSaving(false);}};
  return (
    <div>
      <div style={{background:'linear-gradient(135deg,rgba(255,170,0,0.1),rgba(255,107,0,0.06))',border:'1px solid rgba(255,170,0,0.3)',borderRadius:16,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,gap:16}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}><span style={{fontSize:24}}>💰</span><div><div style={{fontSize:14,fontWeight:700,color:'#FFAA00',marginBottom:2}}>Montant encaissé</div><div style={{fontSize:11,color:'rgba(255,255,255,0.85)'}}>Total des votes reçus · Visible par tous</div></div></div>
        <div style={{textAlign:'right'}}><div style={{fontSize:22,fontWeight:800,color:'#FFAA00',fontFamily:'Syne, sans-serif'}}>{earnings.toLocaleString('fr-FR')} F</div><span style={{background:'rgba(255,170,0,0.15)',border:'1px solid rgba(255,170,0,0.3)',borderRadius:20,padding:'2px 8px',fontSize:10,color:'#FFAA00',fontWeight:700}}>PUBLIC</span></div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
        <PrivacyRow icon="👤" label="Nom affiché"         desc="Ton nom sur ton profil public"            on={privacy.name_visible}     onToggle={()=>toggle('name_visible')}/>
        <PrivacyRow icon="🖼️" label="Photo de profil"    desc="Ton avatar visible par tous"              on={privacy.photo_visible}    onToggle={()=>toggle('photo_visible')}/>
        <PrivacyRow icon="📞" label="Numéro de téléphone" desc="Permettre aux fans de te contacter"      on={privacy.phone_visible}    onToggle={()=>toggle('phone_visible')}/>
        <PrivacyRow icon="📧" label="Adresse email"       desc="Ton email affiché sur ton profil"        on={privacy.email_visible}    onToggle={()=>toggle('email_visible')}/>
        {/* ✅ ⭐ → <StarRed /> */}
        <PrivacyRow icon={<StarRed />} label="Score de votes" desc="Total de votes reçus visible sur profil" on={privacy.score_visible} onToggle={()=>toggle('score_visible')}/>
        <PrivacyRow icon="📍" label="Localisation"        desc="Ta ville ou pays sur ton profil"         on={privacy.location_visible} onToggle={()=>toggle('location_visible')}/>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:12}}>
        {saved&&<span style={{fontSize:12,color:'#4ade80',fontWeight:600}}>✓ Enregistré</span>}
        <button onClick={save} disabled={saving} style={{...btnPrimary,opacity:saving?0.5:1}}>{saving?'⏳ Enregistrement…':'💾 Enregistrer'}</button>
      </div>
    </div>
  );
}

function SuivreBtn({active,onToggle,size='sm'}:{active:boolean;onToggle:()=>void;size?:'sm'|'md'}) {
  return <button onClick={onToggle} style={{background:'rgba(255,255,255,0.9)',border:'none',cursor:'pointer',padding:'3px 8px',borderRadius:20,display:'inline-flex',alignItems:'center',gap:'3px'}}><span style={{fontSize:size==='md'?'11px':'10px',fontWeight:600,color:active?'#FF0000':'#000',userSelect:'none'as const}}>{active?'Voté':'Voter'}</span><span style={{fontSize:size==='md'?'20px':'17px',lineHeight:1,color:active?'#FF0000':'#000'}}>{active?'★':'☆'}</span></button>;
}

function CandidateCard({cand,isWinner,isLoser,voteState,loading,contest,isFav,onToggleFav,onVote}:{cand:Candidate;isWinner:boolean;isLoser:boolean;voteState:VoteState;loading:boolean;contest:Contest;isFav:boolean;onToggleFav:()=>void;onVote:()=>void}) {
  const [pop,setPop]=useState(false);
  const vid=cand.video?.id;
  function handleVote(){if(voteState.voted||loading||contest.status!=='active'||!vid)return;setPop(true);setTimeout(()=>setPop(false),400);onVote();}
  const bc=isWinner?'#4ade80':isLoser?'#f87171':'rgba(255,255,255,.08)';
  const bg=isWinner?'rgba(74,222,128,.06)':isLoser?'rgba(248,113,113,.06)':'rgba(255,255,255,.03)';
  const vc=isWinner?'#4ade80':isLoser?'#f87171':'#fff';
  const bar=isWinner?'#4ade80':isLoser?'#f87171':'#FFAA00';
  return (
    <div style={{flex:1,background:bg,border:`1px solid ${bc}`,borderRadius:'16px',padding:'16px 12px',display:'flex',flexDirection:'column',alignItems:'center',gap:'12px',position:'relative'}}>
      {isWinner&&<div style={{position:'absolute',top:'-10px',left:'50%',transform:'translateX(-50%)',background:'#4ade80',color:'#000',fontSize:'10px',fontWeight:700,padding:'2px 10px',borderRadius:'20px',whiteSpace:'nowrap'}}>✓ Votre vote</div>}
      {isLoser &&<div style={{position:'absolute',top:'-10px',left:'50%',transform:'translateX(-50%)',background:'rgba(248,113,113,.2)',color:'#f87171',fontSize:'10px',fontWeight:700,padding:'2px 10px',borderRadius:'20px',border:'0.5px solid rgba(248,113,113,.3)',whiteSpace:'nowrap'}}>Non choisi</div>}
      <div onClick={()=>vid&&window.open(`/watch/${vid}`,'_blank')} style={{width:'100%',aspectRatio:'16/9',background:'rgba(255,255,255,.06)',borderRadius:'12px',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',cursor:'pointer'}}>
        {cand.video?.thumbnail_url?<img src={cand.video.thumbnail_url} alt={cand.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{fontSize:'32px'}}>{DISC_EMOJI[contest.discipline]||'🎭'}</div>}
        <div style={{position:'absolute',width:'36px',height:'36px',borderRadius:'50%',background:'rgba(0,0,0,.6)',border:'2px solid rgba(255,255,255,.8)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:0,height:0,borderTop:'6px solid transparent',borderBottom:'6px solid transparent',borderLeft:'11px solid #fff',marginLeft:'3px'}}/></div>
      </div>
      <div style={{textAlign:'center',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',marginBottom:'2px'}}><span style={{fontSize:'14px',fontWeight:700,color:'#fff',fontFamily:'Syne,sans-serif'}}>{cand.stage_name||cand.name}</span><SuivreBtn active={isFav} onToggle={onToggleFav}/></div>
        {cand.track_title&&<div style={{fontSize:'11px',color:'rgba(255,255,255,.4)'}}>🎵 {cand.track_title}{cand.track_artist&&` — ${cand.track_artist}`}</div>}
      </div>
      <div style={{width:'100%',textAlign:'center'}}>
        <div style={{fontSize:'28px',fontWeight:800,color:vc,fontFamily:'Syne,sans-serif',lineHeight:1}}>{cand.votes.toLocaleString('fr-FR')}</div>
        <div style={{fontSize:'11px',color:'#000',marginTop:'3px',fontWeight:600}}>{cand.percentage}% des votes</div>
        <div style={{width:'100%',height:'5px',background:'rgba(255,255,255,.08)',borderRadius:'3px',marginTop:'8px'}}><div style={{height:'5px',borderRadius:'3px',width:`${cand.percentage}%`,background:bar,transition:'width .6s'}}/></div>
      </div>
      <button onClick={handleVote} disabled={voteState.voted||loading||contest.status!=='active'||!vid} style={{width:'100%',padding:'11px',background:voteState.voted?(isWinner?'rgba(74,222,128,.15)':'rgba(255,255,255,.05)'):'#FFAA00',border:voteState.voted?(isWinner?'0.5px solid rgba(74,222,128,.3)':'0.5px solid rgba(255,255,255,.1)'):'none',borderRadius:'12px',fontFamily:'Syne,sans-serif',fontSize:'13px',fontWeight:700,color:voteState.voted?(isWinner?'#4ade80':'rgba(255,255,255,.3)'):'#000',cursor:voteState.voted||loading||!vid?'not-allowed':'pointer',transform:pop?'scale(1.05)':'scale(1)',transition:'all .2s'}}>
        {loading?'...':voteState.voted?(isWinner?'✓ Voté':'Non choisi'):!vid?'Pas de vidéo':'👍 Voter · 10 F CFA'}
      </button>
    </div>
  );
}

function ContestCard({contest,userBalance,onVoted,isFavContest,favCandidates,onToggleFavContest,onToggleFavCandidate}:{contest:Contest;userBalance:number;onVoted:(nb:number)=>void;isFavContest:boolean;favCandidates:string[];onToggleFavContest:()=>void;onToggleFavCandidate:(id:string)=>void}) {
  const [vs,setVs]=useState<VoteState>({voted:false});const [load,setLoad]=useState(false);const [msg,setMsg]=useState('');const [mt,setMt]=useState<'success'|'error'|'info'>('info');const [lc,setLc]=useState(contest.candidates);
  useEffect(()=>{const t=localStorage.getItem('dkdk_token');if(!t)return;Promise.all(contest.candidates.filter(c=>c.video?.id).map(c=>fetch(`${API}/votes/check/${c.video!.id}`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.json()).then((d:any)=>({videoId:c.video!.id,hasVoted:d.hasVoted??d.voted??false})).catch(()=>({videoId:c.video!.id,hasVoted:false})))).then(r=>{const f=r.find(x=>x.hasVoted);if(f)setVs({voted:true,votedVideoId:f.videoId});});},[contest.candidates]);
  async function handleVote(videoId:string,name:string){if(vs.voted){showMsg('Vous avez déjà voté.','info');return;}if(userBalance<100){showMsg('Solde insuffisant.','error');return;}setLoad(true);setVs({voted:true,votedVideoId:videoId});setLc(p=>p.map(c=>c.video?.id===videoId?{...c,votes:c.votes+1}:c));try{const res=await fetch(`${API}/votes`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('dkdk_token')}`},body:JSON.stringify({video_id:videoId})});const r=await res.json();if(!res.ok)throw new Error(r.error||r.code||'ERR');onVoted(r.new_balance??r.balance??userBalance-100);showMsg(`✓ Vote pour ${name} · -10 F CFA`,'success');}catch(e:any){setVs({voted:false});setLc(contest.candidates);const EM:Record<string,string>={INSUFFICIENT_BALANCE:'Solde insuffisant.',ALREADY_VOTED:'Déjà voté.',CONTEST_NOT_ACTIVE:'Concours terminé.',TOKEN_MISSING:'Connectez-vous.'};showMsg(EM[(e as any).message]??'Erreur.','error');}finally{setLoad(false);}  }
  function showMsg(t:string,type:'success'|'error'|'info'){setMsg(t);setMt(type);setTimeout(()=>setMsg(''),3500);}
  const total=lc.reduce((s,c)=>s+c.votes,0);
  const cands=lc.map(c=>({...c,percentage:total>0?Math.round((c.votes/total)*100):50}));
  const days=Math.max(0,Math.ceil((new Date(contest.ends_at).getTime()-Date.now())/86_400_000));
  const c0=cands[0],c1=cands[1];const isOpen=contest.status==='active';
  const bbg=vs.voted||isOpen?'#166534':'rgba(255,255,255,.05)';const bco=vs.voted||isOpen?'#fff':'rgba(255,255,255,.3)';const blb=vs.voted?'✓ Voté':isOpen?'● Vote ouvert':'Bientôt';
  return (
    <div style={{background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))',border:'none',borderRadius:'20px',overflow:'hidden',marginBottom:'16px'}}>
      <div style={{padding:'14px 16px',borderBottom:'0.5px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.02)'}}>
        <div><div style={{fontSize:'15px',fontWeight:700,color:'#fff',fontFamily:'Syne,sans-serif',marginBottom:'3px',textShadow:'0 1px 3px rgba(0,0,0,0.5)'}}>{DISC_EMOJI[contest.discipline]||'🎭'} {contest.title}</div><div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>{[DISC_FR[contest.discipline]||contest.discipline,contest.comp_type,`⏳ ${days}j restants`].map(l=><span key={l} style={{fontSize:'10px',color:'#fff',background:'rgba(0,0,0,0.3)',padding:'2px 8px',borderRadius:'20px'}}>{l}</span>)}</div></div>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}><SuivreBtn active={isFavContest} onToggle={onToggleFavContest} size="md"/><span style={{fontSize:'10px',fontWeight:700,padding:'4px 10px',borderRadius:'20px',background:bbg,color:bco,border:`0.5px solid ${bco.replace(')',',0.3)')}`}}>{blb}</span></div>
      </div>
      {msg&&<div style={{padding:'10px 16px',fontSize:'12px',fontWeight:500,background:mt==='success'?'rgba(74,222,128,.1)':mt==='error'?'rgba(248,113,113,.1)':'rgba(255,255,255,.06)',color:mt==='success'?'#4ade80':mt==='error'?'#f87171':'rgba(255,255,255,.6)',borderBottom:'0.5px solid rgba(255,255,255,.06)'}}>{msg}</div>}
      <div style={{padding:'16px'}}>
        {c0&&c1?(<div style={{display:'flex',gap:'10px',alignItems:'stretch'}}><CandidateCard cand={c0} isWinner={vs.voted&&vs.votedVideoId===c0.video?.id} isLoser={vs.voted&&vs.votedVideoId!==c0.video?.id} voteState={vs} loading={load} contest={contest} isFav={favCandidates.includes(c0.id)} onToggleFav={()=>onToggleFavCandidate(c0.id)} onVote={()=>c0.video?.id&&handleVote(c0.video.id,c0.stage_name||c0.name)}/><div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'6px',padding:'0 4px'}}><div style={{width:'1px',flex:1,background:'rgba(255,255,255,.08)'}}/><div style={{width:'36px',height:'36px',borderRadius:'50%',background:'rgba(255,170,0,.12)',border:'1px solid rgba(255,170,0,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:800,color:'#FFAA00',fontFamily:'Syne,sans-serif'}}>VS</div><div style={{width:'1px',flex:1,background:'rgba(255,255,255,.08)'}}/></div><CandidateCard cand={c1} isWinner={vs.voted&&vs.votedVideoId===c1.video?.id} isLoser={vs.voted&&vs.votedVideoId!==c1.video?.id} voteState={vs} loading={load} contest={contest} isFav={favCandidates.includes(c1.id)} onToggleFav={()=>onToggleFavCandidate(c1.id)} onVote={()=>c1.video?.id&&handleVote(c1.video.id,c1.stage_name||c1.name)}/></div>):<div style={{textAlign:'center',padding:'2rem',color:'rgba(255,255,255,0.9)',fontSize:'13px'}}>🎭 Aucun candidat inscrit pour l'instant.</div>}
      </div>
      <div style={{padding:'10px 16px',borderTop:'0.5px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'flex-end',background:'rgba(255,255,255,.02)',fontSize:'12px',color:'rgba(255,255,255,0.9)'}}>🗳️ <span style={{fontWeight:700,color:'#FFAA00',marginLeft:'4px'}}>{total.toLocaleString('fr-FR')} votes</span></div>
    </div>
  );
}

function DashboardSection({profile,balance,votesEmis,totalEarned,videoCount,onEditProfile}:{profile:UserProfile|null;balance:number;votesEmis:number;totalEarned:number;videoCount:number;onEditProfile:()=>void}) {
  const initials=profile?.name?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??';
  const country=COUNTRIES.find(c=>c.code===profile?.country);
  return (
    <div>
      <div style={{...card, background: 'linear-gradient(135deg, rgba(126, 3, 128, 0.52), rgba(237,7,15))', border: '1px solid rgba(255,0,0,0.3)'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            {profile?.photo_url?<img src={profile.photo_url} alt={profile.name} style={{width:56,height:56,borderRadius:'50%',objectFit:'cover',border:'2px solid rgb(239,239,9)'}}/>:<div style={{width:56,height:56,borderRadius:'50%',background:'rgba(0,0,0,0.45)',border:'2px solid #FFAA00',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#FFAA00',fontFamily:'Syne,sans-serif'}}>{initials}</div>}
            <div><div style={{fontSize:17,fontWeight:800,color:'#fff',fontFamily:'Syne,sans-serif',marginBottom:3}}>{profile?.name??'—'}</div><div style={{fontSize:12,color:'rgba(255,255,255,0.85)'}}>{profile?.email}</div>{country&&<div style={{fontSize:12,color:'rgba(255,255,255,0.9)',marginTop:3}}>{country.flag} {country.name}</div>}</div>
          </div>
          <button onClick={onEditProfile} style={{...btnSecondary,padding:'7px 14px',fontSize:12,color:'#fff',border:'1px solid rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.12)'}}>✏️ Modifier</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {[{val:videoCount,label:'Vidéos ajoutées',color:'#f0f0f0'},{val:votesEmis,label:'Votes émis',color:'#f0f0f0'},{val:`${totalEarned.toLocaleString('fr-FR')} F`,label:'Gains reçus',color:'#FFAA00'}].map(s=>(<div key={s.label} style={{background:'rgba(0,0,0,0.35)',borderRadius:12,padding:'14px',textAlign:'center'}}><div style={{fontSize:18,fontWeight:800,color:s.color,fontFamily:'Syne,sans-serif',lineHeight:1}}>{s.val}</div><div style={{fontSize:11,color:'#fff',fontWeight:600,marginTop:4,lineHeight:1.3}}>{s.label}</div></div>))}
        </div>
      </div>
      <div style={{...card,background:'linear-gradient(135deg, rgba(126, 3, 128, 0.52), rgba(237,7,15))',border:'none',}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontSize:11,color:'#FFD700',fontWeight:800,letterSpacing:'.1em',marginBottom:6,textShadow:'0 1px 2px rgba(0,0,0,0.5)'}}>SOLDE WALLET</div><div style={{fontSize:32,fontWeight:800,color:'#fff',fontFamily:'Syne,sans-serif',textShadow:'0 2px 6px rgba(0,0,0,0.7)'}}>{balance.toLocaleString('fr-FR')} F</div><div style={{fontSize:12,color:'rgb(255,255,255)',marginTop:3}}>{Math.floor(balance/100)} vote{Math.floor(balance/100)!==1?'s':''} disponibles</div></div>
          <span style={{fontSize:36}}>💰</span>
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({profile,onClose,onSaved}:{profile:UserProfile;onClose:()=>void;onSaved:(p:UserProfile)=>void}) {
  const [form,setForm]=useState({name:profile.name,country:profile.country??'',photo_url:profile.photo_url??'',bio:profile.bio??''});
  const [saving,setSaving]=useState(false);const [err,setErr]=useState('');const [done,setDone]=useState(false);
  const save=async()=>{if(!form.name.trim()){setErr('Le nom est requis.');return;}setSaving(true);setErr('');try{const res=await fetch(`${API}/users/${profile.id}/profile`,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${getToken()}`},body:JSON.stringify({name:form.name.trim(),country:form.country,photo_url:form.photo_url,bio:form.bio})});const d=await res.json();if(!res.ok)throw new Error(d.message??'Erreur');onSaved({...profile,...form});setDone(true);setTimeout(onClose,1200);}catch(e:any){setErr(e.message);}finally{setSaving(false);}};
  const inp:React.CSSProperties={width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'11px 14px',fontSize:14,color:'#fff',outline:'none',fontFamily:'DM Sans,sans-serif',boxSizing:'border-box'};
  const lbl:React.CSSProperties={display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.9)',marginBottom:6,textTransform:'uppercase',letterSpacing:'.5px'};
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#12121e',border:'1px solid rgba(255,170,0,0.25)',borderRadius:20,width:'100%',maxWidth:460,overflow:'hidden'}}>
        <div style={{background:'linear-gradient(135deg,rgba(255,170,0,0.1),rgba(255,107,0,0.06))',borderBottom:'1px solid rgba(255,170,0,0.15)',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{fontSize:17,fontWeight:800,color:'#fff',fontFamily:'Syne,sans-serif'}}>✏️ Modifier mon profil</div><button onClick={onClose} style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.9)',fontSize:14,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div>
        {done?(<div style={{padding:40,textAlign:'center'}}><div style={{fontSize:44,marginBottom:10}}>✅</div><p style={{color:'#4ade80',fontWeight:700}}>Profil mis à jour !</p></div>):(
          <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:4}}>{form.photo_url?<img src={form.photo_url} alt="avatar" style={{width:52,height:52,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(255,170,0,0.3)'}}/>:<div style={{width:52,height:52,borderRadius:'50%',background:'rgba(255,170,0,0.15)',border:'2px solid rgba(255,170,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#FFAA00'}}>{form.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?'}</div>}<div style={{flex:1}}><label style={lbl}>Photo (URL)</label><input style={inp} type="url" placeholder="https://…" value={form.photo_url} onChange={e=>setForm(f=>({...f,photo_url:e.target.value}))}/></div></div>
            <div><label style={lbl}>Nom affiché *</label><input style={inp} type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div><label style={lbl}>Pays</label><select style={{...inp,cursor:'pointer'}} value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))}><option value="">— Sélectionner —</option>{COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}</select></div>
            <div><label style={lbl}>Bio (facultatif)</label><textarea style={{...inp,resize:'vertical',minHeight:70}} placeholder="Quelques mots sur toi…" value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} maxLength={200}/><div style={{textAlign:'right',fontSize:10,color:'rgba(255,255,255,0.8)',marginTop:3}}>{form.bio.length}/200</div></div>
            {err&&<div style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#f87171'}}>⚠️ {err}</div>}
            <div style={{display:'flex',gap:10,justifyContent:'flex-end',paddingTop:4}}><button onClick={onClose} style={btnSecondary}>Annuler</button><button onClick={save} disabled={saving} style={{...btnPrimary,opacity:saving?0.6:1}}>{saving?'⏳ Enregistrement…':'💾 Enregistrer'}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

function MesVideosSection({videos,loading,contests,onRefresh,router}:{videos:UserVideo[];loading:boolean;contests:Contest[];onRefresh:()=>void;router:any}) {
  const [subId,setSubId]=useState<string|null>(null);const [insId,setInsId]=useState<string|null>(null);
  const approved=videos.filter(v=>v.status==='approved');const drafts=videos.filter(v=>v.status==='draft');const others=videos.filter(v=>v.status!=='draft');
  const sm=(color:string,bg:string,border:string):React.CSSProperties=>({background:bg,border:`1px solid ${border}`,borderRadius:50,padding:'5px 12px',fontSize:11,fontWeight:700,color,cursor:'pointer',fontFamily:'DM Sans,sans-serif'});
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}><div style={{fontSize:13,color:'rgba(255,255,255,0.85)'}}>{videos.length} vidéo{videos.length!==1?'s':''}</div><button onClick={()=>router.push('/submit')} style={btnPrimary}>🎬 + Ajouter une vidéo</button></div>
      {loading?(<div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.8)',fontSize:13}}>⏳ Chargement…</div>):videos.length===0?(
        <div style={{...card,textAlign:'center',padding:'40px 20px',background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))',border:'none'}}><div style={{fontSize:40,marginBottom:12}}>🎬</div><p style={{color:'rgba(255,255,255,0.9)',fontSize:14,marginBottom:16}}>Tu n'as pas encore ajouté de vidéo.</p><button onClick={()=>router.push('/submit')} style={btnPrimary}>Ajouter ma première vidéo</button></div>
      ):(
        <>
          {drafts.length>0&&(<div style={{marginBottom:8}}><div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.8)',letterSpacing:'.08em',marginBottom:8,textTransform:'uppercase'}}>📝 Brouillons — à soumettre pour validation</div>{drafts.map(v=>(<div key={v.id} style={{...card,border:'1px solid rgba(255,255,255,0.12)'}}><div style={{display:'flex',alignItems:'flex-start',gap:12}}><div style={{width:46,height:46,borderRadius:10,background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{DISC_EMOJI[v.discipline??'']??'🎬'}</div><div style={{flex:1,minWidth:0}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}><span style={{fontSize:14,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</span><StatusBadge status="draft"/></div><div style={{fontSize:11,color:'rgba(255,255,255,0.85)',marginBottom:10}}>{DISC_FR[v.discipline??'']??v.discipline} · Non soumise à la modération</div><button onClick={()=>setSubId(v.id)} style={{background:'linear-gradient(135deg,#FFAA00,#FF6B00)',border:'none',borderRadius:50,padding:'7px 16px',fontSize:12,fontWeight:700,color:'#000',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>🏆 Soumettre pour validation</button></div></div></div>))}</div>)}
          {others.map(v=>(
            <div key={v.id} style={card}>
              <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                <div style={{width:46,height:46,borderRadius:10,background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{DISC_EMOJI[v.discipline??'']??'🎬'}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}><span style={{fontSize:14,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.title}</span><StatusBadge status={v.status}/></div>
                  {/* ✅ ⭐ → <StarRed /> */}
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.85)',marginBottom:v.status==='rejected'||v.status==='approved'?8:0}}>
                    {DISC_FR[v.discipline??'']??v.discipline}
                    {v.views!==undefined&&` · 👁 ${v.views.toLocaleString('fr-FR')}`}
                    {v.vote_count!==undefined&&v.vote_count>0&&<> · <StarRed /> {v.vote_count}</>}
                  </div>
                  {v.status==='rejected'&&v.rejection_reason&&<div style={{background:'rgba(248,113,113,0.07)',border:'1px solid rgba(248,113,113,0.18)',borderRadius:8,padding:'6px 10px',fontSize:11,color:'#f87171',marginBottom:8}}>Motif : {v.rejection_reason}</div>}
                  {v.status==='approved'&&<div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button onClick={()=>router.push(`/watch/${v.id}`)} style={sm('rgba(255,255,255,0.6)','transparent','rgba(255,255,255,0.15)')}>▶ Regarder</button><button onClick={()=>setInsId(v.id)} style={sm('#FFAA00','rgba(255,170,0,0.1)','rgba(255,170,0,0.3)')}>🏆 Inscrire en compétition</button></div>}
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      {subId&&(()=>{const v=videos.find(x=>x.id===subId);if(!v)return null;return <SubmissionModal video={{id:v.id,title:v.title,discipline:v.discipline}} contests={contests} onClose={()=>setSubId(null)} onSuccess={()=>{setSubId(null);onRefresh();}}/>;})()}
      {insId&&<InscriptionModal contests={contests} approvedVideos={approved} preSelectedVideoId={insId} onClose={()=>setInsId(null)} onSuccess={onRefresh}/>}
    </div>
  );
}

function CompetitionsSection({contests,balance,approvedVideos,onVoted,favContests,favCandidates,onToggleFavContest,onToggleFavCandidate}:{contests:Contest[];balance:number;approvedVideos:UserVideo[];onVoted:(nb:number)=>void;favContests:string[];favCandidates:string[];onToggleFavContest:(id:string)=>void;onToggleFavCandidate:(id:string)=>void}) {
  const [filter,setFilter]=useState('all');const [showIns,setShowIns]=useState(false);
  const filtered=contests.filter(c=>filter==='all'||c.discipline===filter);
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}><div style={{fontSize:13,color:'rgba(255,255,255,0.85)'}}>{filtered.length} compétition{filtered.length!==1?'s':''}</div><button onClick={()=>setShowIns(true)} style={{...btnPrimary,padding:'8px 16px',fontSize:12}}>🏆 Inscrire ma vidéo dans une compétition</button></div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>{DISCS.map(d=><button key={d} onClick={()=>setFilter(d)} style={{padding:'5px 12px',borderRadius:50,fontSize:11,fontWeight:600,cursor:'pointer',background:filter===d?'#FFAA00':'#6b7280',color:'#000',border:filter===d?'none':'1px solid rgba(0,0,0,0.2)'}}>{DISC_LABELS[d]}</button>)}</div>
      {filtered.length===0?(<div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.8)',fontSize:13}}>{contests.length===0?'Aucune compétition active pour le moment.':'Aucune compétition dans cette catégorie.'}</div>):filtered.map(c=><ContestCard key={c.id} contest={c} userBalance={balance} onVoted={onVoted} isFavContest={favContests.includes(c.id)} favCandidates={favCandidates} onToggleFavContest={()=>onToggleFavContest(c.id)} onToggleFavCandidate={onToggleFavCandidate}/>)}
      {showIns&&<InscriptionModal contests={contests} approvedVideos={approvedVideos} onClose={()=>setShowIns(false)} onSuccess={()=>setShowIns(false)}/>}
    </div>
  );
}

function EducationSection({router}:{router:any}) {
  const MATIERES=['🌍 Langues du monde','📜 Histoire & Géographie','🔬 Sciences & Vie','🎨 Art & Culture du monde','🌿 Agriculture','💻 Informatique','🎵 Musique du monde','🍽️ Gastronomie du monde'];
  return (
    <div>
      <div style={{background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))',border:'none',borderRadius:18,padding:'20px',marginBottom:14,textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:10}}>📚</div>
        <div style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:18,color:'#fff',marginBottom:6}}>Éducation & Savoirs</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.85)',marginBottom:16,lineHeight:1.6}}>Explorez 21 matières.<br/>Créez et partagez du contenu éducatif.</div>
        <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={()=>router.push('/education')} style={btnPrimary}>📖 Explorer les matières</button>
          <button onClick={()=>router.push('/education/creer')} style={{...btnPrimary,background:'rgba(255,170,0,0.15)',color:'#FFAA00',border:'1px solid rgba(255,170,0,0.3)'}}>✏️ Créer du contenu</button>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
        {MATIERES.map(m=>(<div key={m} onClick={()=>router.push('/education')} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'12px 14px',fontSize:13,color:'rgba(255,255,255,0.6)',cursor:'pointer',transition:'all .2s'}} onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(255,170,0,0.3)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(255,255,255,0.07)')}>{m}</div>))}
        <div onClick={()=>router.push('/education')} style={{background:'rgba(255,170,0,0.05)',border:'1px solid rgba(255,170,0,0.15)',borderRadius:12,padding:'12px 14px',fontSize:13,color:'rgba(255,170,0,0.6)',cursor:'pointer',gridColumn:'span 2',textAlign:'center'}}>+13 autres matières →</div>
      </div>
    </div>
  );
}

function FinancesSection({balance,totalEarned,router}:{balance:number;totalEarned:number;router:any}) {
  return (
    <div>
      <div style={{...card,background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))',border:'none',marginBottom:12}}><div style={{fontSize:11,color:'rgba(255,170,0,0.6)',fontWeight:700,letterSpacing:'.08em',marginBottom:6}}>SOLDE WALLET</div><div style={{fontSize:32,fontWeight:800,color:'#FFAA00',fontFamily:'Syne,sans-serif',marginBottom:4}}>{balance.toLocaleString('fr-FR')} F CFA</div><div style={{fontSize:12,color:'rgba(255,255,255,0.85)'}}>{Math.floor(balance/100)} vote{Math.floor(balance/100)!==1?'s':''} disponibles</div></div>
      <div style={{...card,marginBottom:12,background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))',border:'none'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><div><div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:3}}>💰 Total encaissé</div><div style={{fontSize:11,color:'rgba(255,255,255,0.85)'}}>Votes reçus sur tes vidéos · Visible par tous</div></div><div style={{textAlign:'right'}}><div style={{fontSize:20,fontWeight:800,color:'#FFAA00',fontFamily:'Syne,sans-serif'}}>{totalEarned.toLocaleString('fr-FR')} F</div><span style={{background:'rgba(255,170,0,0.12)',border:'1px solid rgba(255,170,0,0.25)',borderRadius:20,padding:'2px 8px',fontSize:10,color:'#FFAA00',fontWeight:700}}>PUBLIC</span></div></div></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{...card,textAlign:'center',background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))',border:'none'}}><div style={{fontSize:28,marginBottom:10}}>⚡</div><div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:6}}>Recharger</div><div style={{fontSize:11,color:'rgba(255,255,255,0.85)',marginBottom:14,lineHeight:1.5}}>Acheter des étoiles et cœurs via FedaPay, MTN, Moov.</div><button onClick={()=>router.push('/recharge')} style={btnPrimary}>Recharger mon compte</button></div>
        <div style={{...card,textAlign:'center',background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))',border:'none'}}><div style={{fontSize:28,marginBottom:10}}>💸</div><div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:6}}>Retrait</div><div style={{fontSize:11,color:'rgba(255,255,255,0.85)',marginBottom:14,lineHeight:1.5}}>Retirer tes gains vers ton Mobile Money ou compte bancaire.</div><button onClick={()=>router.push('/retrait')} style={{...btnSecondary,display:'inline-block'}}>Faire un retrait</button></div>
      </div>
    </div>
  );
}

export default function ComptePage() {
  const router=useRouter();
  const [activeTab,setActiveTab]=useState<TabId>('dashboard');
  const [profile,setProfile]=useState<UserProfile|null>(null);
  const [userVideos,setUserVideos]=useState<UserVideo[]>([]);
  const [contests,setContests]=useState<Contest[]>([]);
  const [balance,setBalance]=useState(0);
  const [totalEarned,setTotalEarned]=useState(0);
  const [votesEmis,setVotesEmis]=useState(0);
  const [loading,setLoading]=useState(true);
  const [videosLoading,setVideosLoading]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [favContests,setFavContests]=useState<string[]>(()=>typeof window==='undefined'?[]:JSON.parse(localStorage.getItem('dkdk_fav_contests')||'[]'));
  const [favCandidates,setFavCandidates]=useState<string[]>(()=>typeof window==='undefined'?[]:JSON.parse(localStorage.getItem('dkdk_fav_candidates')||'[]'));

  function toggleFavContest(id:string){setFavContests(p=>{const n=p.includes(id)?p.filter(x=>x!==id):[...p,id];localStorage.setItem('dkdk_fav_contests',JSON.stringify(n));return n;});}
  function toggleFavCandidate(id:string){setFavCandidates(p=>{const n=p.includes(id)?p.filter(x=>x!==id):[...p,id];localStorage.setItem('dkdk_fav_candidates',JSON.stringify(n));return n;});}

  const fetchVideos=useCallback(async(userId:string)=>{
    setVideosLoading(true);
    try{const res=await fetch(`${API}/users/${userId}/videos`,{headers:{Authorization:`Bearer ${getToken()}`}});if(!res.ok)return;const d=await res.json();setUserVideos(d.videos??d??[]);}catch{}finally{setVideosLoading(false);}
  },[]);

  useEffect(()=>{
    const t=getToken();if(!t){router.push('/auth/login');return;}
    const dec=decodeToken(t);if(!dec?.userId){router.push('/auth/login');return;}
    const uid=dec.userId;
    fetch(`${API}/users/${uid}/profile`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.ok?r.json():null).then(d=>{if(d)setProfile(d.profile??d);}).catch(()=>{const s=localStorage.getItem('dkdk_user');if(s){try{setProfile(JSON.parse(s));}catch{}}});
    fetchVideos(uid);
    fetch(`${API}/contests`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.json()).then((res:any)=>{const raw:any[]=res.data||res.contests||[];setContests(raw.filter((c:any)=>c.status==='active'||c.status==='pending').map((c:any)=>({id:c.id,title:c.title,discipline:c.discipline,comp_type:c.comp_type,status:c.status,ends_at:c.ends_at,candidates:(c.candidates||[]).map((cd:any)=>({id:cd.id,name:cd.name,stage_name:cd.stage_name||cd.name,track_title:cd.track_title,track_artist:cd.track_artist,votes:cd.votes||0,percentage:50,video:cd.video?{id:cd.video.id,storage_url:cd.video.storage_url,thumbnail_url:cd.video.thumbnail_url}:undefined}))})));}).catch(()=>{}).finally(()=>setLoading(false));
    fetch(`${API}/votes/balance`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.json()).then((w:any)=>{setBalance(w.balance??w.wallet??0);setVotesEmis(w.votes_count??w.voteCount??0);}).catch(()=>{});
    fetch(`${API}/users/earnings`,{headers:{Authorization:`Bearer ${t}`}}).then(r=>r.ok?r.json():null).then(d=>{if(d)setTotalEarned(d.total_earned??d.earnings??0);}).catch(()=>{});
  },[router,fetchVideos]);

  const handleLogout=()=>{localStorage.removeItem('dkdk_token');localStorage.removeItem('dkdk_user');router.push('/home');};
  const approved=userVideos.filter(v=>v.status==='approved');

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f',color:'#f0f0f0',fontFamily:'DM Sans,sans-serif',paddingBottom:60}}>
      <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(8,8,15,0.95)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'0 20px 0 0',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <Link href="/home" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:7}}><LogoDikiDiki width={200}/></Link>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <TranslateWidget/>
          <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,170,0,0.08)',border:'1px solid rgba(246,245,244,0.2)',borderRadius:20,padding:'5px 12px'}}><span style={{fontSize:13}}>💰</span><span style={{fontSize:13,fontWeight:700,color:'#FFAA00'}}>{balance.toLocaleString('fr-FR')} F</span></div>
          <div onClick={()=>setActiveTab('dashboard')} style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#FF6B00,#FFD700)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,cursor:'pointer',flexShrink:0}}>👤</div>
        </div>
      </div>

      <div style={{background:'rgba(8,8,15,0.8)',borderBottom:'1px solid rgb(7,7,7)',padding:'0 20px',display:'flex',gap:2,overflowX:'auto',scrollbarWidth:'none'}}>
        {TABS.map(tab=>(<button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{display:'flex',alignItems:'center',gap:6,padding:'14px 16px',background:'none',border:'none',borderBottom:`2px solid ${activeTab===tab.id?'#FFAA00':'transparent'}`,color:activeTab===tab.id?'#FFAA00':'rgba(255,255,255,0.4)',fontSize:13,fontWeight:activeTab===tab.id?700:400,cursor:'pointer',whiteSpace:'nowrap',transition:'all .2s',fontFamily:'DM Sans,sans-serif'}}><span>{tab.emoji}</span><span>{tab.label}</span></button>))}
      </div>

      <div style={{maxWidth:660,margin:'0 auto',padding:'20px 16px'}}>
        {activeTab==='dashboard'&&<DashboardSection profile={profile} balance={balance} votesEmis={votesEmis} totalEarned={totalEarned} videoCount={userVideos.length} onEditProfile={()=>setShowEdit(true)}/>}
        {activeTab==='videos'&&<MesVideosSection videos={userVideos} loading={videosLoading} contests={contests} router={router} onRefresh={()=>{const t=getToken();const d=t?decodeToken(t):null;if(d?.userId)fetchVideos(d.userId);}}/>}
        {activeTab==='competitions'&&(loading?<div style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.8)'}}>⏳ Chargement…</div>:<CompetitionsSection contests={contests} balance={balance} approvedVideos={approved} onVoted={nb=>setBalance(nb)} favContests={favContests} favCandidates={favCandidates} onToggleFavContest={toggleFavContest} onToggleFavCandidate={toggleFavCandidate}/>)}
        {activeTab==='education'&&<EducationSection router={router}/>}
        {activeTab==='finances'&&<FinancesSection balance={balance} totalEarned={totalEarned} router={router}/>}
        {activeTab==='settings'&&(
          <div>
            <div style={card}><div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:16,fontFamily:'Syne,sans-serif'}}>🔒 Confidentialité</div><ConfidentialiteSection earnings={totalEarned}/></div>
            <div style={{...card,marginTop:12}}><div style={{fontSize:15,fontWeight:700,color:'#fff',marginBottom:12,fontFamily:'Syne,sans-serif'}}>⚙️ Compte</div><button onClick={handleLogout} style={{background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:50,padding:'10px 20px',fontSize:13,fontWeight:600,color:'#f87171',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>🚪 Se déconnecter</button></div>
          </div>
        )}
      </div>

      {showEdit&&profile&&<EditProfileModal profile={profile} onClose={()=>setShowEdit(false)} onSaved={p=>{setProfile(p);setShowEdit(false);}}/>}
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:100}}><TickerBand/></div>
    </div>
  );
}
