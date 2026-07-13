'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard }   from '../components/admin/AdminGuard';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { useAdminAuth } from '../components/admin/AdminAuthContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';
const OR2 = '#FF6B00';
const G   = 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))';

const DISCS = ['danse','chant','humour','poesie','conte','musique','instrument','acapella'];
const DISC_EMOJI: Record<string,string> = { danse:'💃',chant:'🎤',humour:'😂',poesie:'📜',conte:'📖',musique:'🎵',instrument:'🎸',acapella:'🎙️' };
const DISC_FR:    Record<string,string> = { danse:'Danse',chant:'Chant',humour:'Humour',poesie:'Poésie',conte:'Conte',musique:'Musique',instrument:'Instrument',acapella:'A cappella' };

interface Contest {
  id: string; title: string; discipline: string; comp_type: string;
  status: string; ends_at: string; starts_at?: string; description?: string;
  candidates?: { votes?: number }[];
}

const STATUS_META: Record<string,{label:string;color:string;bg:string}> = {
  active:  { label:'● En cours',  color:'#4ade80', bg:'rgba(74,222,128,0.1)'   },
  pending: { label:'○ À venir',   color:OR,        bg:'rgba(255,170,0,0.1)'    },
  ended:   { label:'⏹ Terminé',  color:'#f87171', bg:'rgba(248,113,113,0.1)'  },
  paused:  { label:'⏸ En pause', color:'#60a5fa', bg:'rgba(96,165,250,0.1)'   },
};

function fmt(n: number) { return n.toLocaleString('fr-FR'); }

/*DKDK_SANTE_WIDGET*/
function SanteWidget(props: { token?: string; router: any }) {
  const [bw, setBw] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(API + "/monitoring/stats", { headers: { Authorization: "Bearer " + props.token } })
      .then(function(r){ return r.json(); })
      .then(function(j){ if (alive && j && j.success) setBw((j.data && j.data.videos && j.data.videos.bandwidth_gb) || 0); })
      .catch(function(){});
    return function(){ alive = false; };
  }, []);
  /*DKDK_QUOTA_REEL*/
  // Quota lu depuis settings (reglable dans /admin/reglages).
  // Repli : les vraies limites du plan Supabase FREE (~5 Go Egress/mois),
  // et NON les 250 Go du plan Pro qui etaient codes en dur ici.
  const [QUOTA,  setQuota]  = useState(5);
  const [ORANGE, setOrange] = useState(3);
  const [ROUGE,  setRouge]  = useState(4.5);

  useEffect(() => {
    let vivant = true;
    fetch(API + "/settings", { cache: "no-store" })
      .then(function(r){ return r.json(); })
      .then(function(j){
        if (!vivant || !j) return;
        var s = j.data || j;
        if (s.infra_quota_gb)  setQuota(parseFloat(s.infra_quota_gb));
        if (s.infra_orange_gb) setOrange(parseFloat(s.infra_orange_gb));
        if (s.infra_rouge_gb)  setRouge(parseFloat(s.infra_rouge_gb));
      })
      .catch(function(){});
    return function(){ vivant = false; };
  }, []);
  const val = bw || 0;
  const pct = Math.min(100, Math.round((val / QUOTA) * 100));
  let col = "#4ade80";
  if (val >= ROUGE) col = "#ed070f"; else if (val >= ORANGE) col = "#FFAA00";
  return (
    <div onClick={() => props.router.push("/admin/monitoring")} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid #1e1e2e", borderRadius:14, padding:"16px 18px", marginBottom:24, cursor:"pointer" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#e0e0e0", fontFamily:"Syne,sans-serif" }}>Sante infra &mdash; Bande passante</span>
        <span style={{ fontSize:12, fontWeight:700, color:col }}>{val.toLocaleString("fr-FR")} Go / {QUOTA} Go</span>
      </div>
      <div style={{ height:10, background:"#1e1e2e", borderRadius:5, overflow:"hidden" }}>
        <div style={{ width:pct + "%", height:"100%", background:col, transition:"width .3s" }} />
      </div>
      <div style={{ fontSize:10, color:"#4a4a6a", marginTop:6 }}>{pct} % du quota &mdash; cliquer pour le detail</div>
    </div>
  );
}

function CreateModal({ onClose, onCreated, token }: { onClose:()=>void; onCreated:()=>void; token:string }) {
  const [form, setForm] = useState({
    title: '', discipline: 'danse', comp_type: 'duo',
    starts_at: '', ends_at: '', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const [done,   setDone]   = useState(false);

  const inp: React.CSSProperties = {
    width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
    borderRadius:10, padding:'10px 14px', fontSize:13, color:'#fff', outline:'none',
    fontFamily:'DM Sans,sans-serif', boxSizing:'border-box',
  };
  const lbl: React.CSSProperties = {
    display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)',
    marginBottom:5, textTransform:'uppercase', letterSpacing:'.5px',
  };

  async function submit() {
    if (!form.title.trim()) { setErr('Le titre est requis.'); return; }
    if (!form.ends_at)      { setErr('La date de fin est requise.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch(`${API}/contests`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          title:       form.title.trim(),
          discipline:  form.discipline,
          comp_type:   form.comp_type,
          starts_at:   form.starts_at || new Date().toISOString(),
          ends_at:     new Date(form.ends_at).toISOString(),
          description: form.description,
          status:      'active',
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message ?? d.error ?? 'Erreur serveur');
      setDone(true);
      setTimeout(() => { onCreated(); onClose(); }, 1500);
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#12121e',border:'1px solid rgba(255,170,0,0.25)',borderRadius:20,width:'100%',maxWidth:520,overflow:'hidden' }}>
        <div style={{ background:G,padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ fontSize:17,fontWeight:800,color:'#fff',fontFamily:'Syne,sans-serif' }}>🏆 Créer une compétition</div>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',fontSize:14,cursor:'pointer' }}>✕</button>
        </div>
        {done ? (
          <div style={{ padding:40,textAlign:'center' }}>
            <div style={{ fontSize:48,marginBottom:12 }}>🎉</div>
            <p style={{ color:'#4ade80',fontWeight:700,fontSize:15 }}>Compétition créée avec succès !</p>
          </div>
        ) : (
          <div style={{ padding:'22px',display:'flex',flexDirection:'column',gap:14 }}>
            <div><label style={lbl}>Titre *</label><input style={inp} type="text" placeholder="Ex: Battle Danse Afrobeats" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <div>
                <label style={lbl}>Discipline *</label>
                <select style={{...inp,cursor:'pointer'}} value={form.discipline} onChange={e=>setForm(f=>({...f,discipline:e.target.value}))}>
                  {DISCS.map(d=><option key={d} value={d}>{DISC_EMOJI[d]} {DISC_FR[d]}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Type *</label>
                <select style={{...inp,cursor:'pointer'}} value={form.comp_type} onChange={e=>setForm(f=>({...f,comp_type:e.target.value}))}>
                  <option value="duo">Duo (2 candidats)</option>
                  <option value="groupe">Groupe (3+)</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
              <div><label style={lbl}>Date de début</label><input style={inp} type="datetime-local" value={form.starts_at} onChange={e=>setForm(f=>({...f,starts_at:e.target.value}))}/></div>
              <div><label style={lbl}>Date de fin *</label><input style={inp} type="datetime-local" value={form.ends_at} onChange={e=>setForm(f=>({...f,ends_at:e.target.value}))}/></div>
            </div>
            <div><label style={lbl}>Description (facultatif)</label><textarea style={{...inp,resize:'vertical',minHeight:70}} placeholder="Décrivez la compétition…" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
            {err && <div style={{ background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#f87171' }}>⚠️ {err}</div>}
            <div style={{ display:'flex',gap:10,justifyContent:'flex-end',paddingTop:4 }}>
              <button onClick={onClose} style={{ background:'transparent',border:'1px solid rgba(255,255,255,0.15)',borderRadius:50,padding:'9px 18px',fontSize:13,color:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'DM Sans,sans-serif' }}>Annuler</button>
              <button onClick={submit} disabled={saving} style={{ background:`linear-gradient(135deg,${OR},${OR2})`,border:'none',borderRadius:50,padding:'9px 22px',fontSize:13,fontWeight:700,color:'#000',cursor:'pointer',fontFamily:'DM Sans,sans-serif',opacity:saving?0.6:1 }}>
                {saving ? '⏳ Création…' : '✅ Créer la compétition'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EditModal({ contest, onClose, onSaved, token }: { contest:Contest; onClose:()=>void; onSaved:()=>void; token:string }) {
  const [form, setForm] = useState({
    title:       contest.title,
    discipline:  contest.discipline,
    comp_type:   contest.comp_type,
    status:      contest.status,
    ends_at:     contest.ends_at ? new Date(contest.ends_at).toISOString().slice(0,16) : '',
    description: contest.description ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const inp: React.CSSProperties = { width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#fff',outline:'none',fontFamily:'DM Sans,sans-serif',boxSizing:'border-box' };
  const lbl: React.CSSProperties = { display:'block',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.5px' };

  async function save() {
    setSaving(true); setErr('');
    try {
      const res = await fetch(`${API}/contests/${contest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({ ...form, ends_at: new Date(form.ends_at).toISOString() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message ?? 'Erreur');
      setDone(true);
      setTimeout(() => { onSaved(); onClose(); }, 1200);
    } catch(e:any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#12121e',border:'1px solid rgba(255,170,0,0.25)',borderRadius:20,width:'100%',maxWidth:520,overflow:'hidden' }}>
        <div style={{ background:'rgba(255,170,0,0.08)',borderBottom:'1px solid rgba(255,170,0,0.2)',padding:'18px 22px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ fontSize:17,fontWeight:800,color:'#fff',fontFamily:'Syne,sans-serif' }}>✏️ Modifier la compétition</div>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',fontSize:14,cursor:'pointer' }}>✕</button>
        </div>
        {done ? (
          <div style={{ padding:40,textAlign:'center' }}><div style={{ fontSize:44,marginBottom:10 }}>✅</div><p style={{ color:'#4ade80',fontWeight:700 }}>Compétition mise à jour !</p></div>
        ) : (
          <div style={{ padding:'22px',display:'flex',flexDirection:'column',gap:14 }}>
            <div><label style={lbl}>Titre</label><input style={inp} type="text" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
              <div>
                <label style={lbl}>Discipline</label>
                <select style={{...inp,cursor:'pointer'}} value={form.discipline} onChange={e=>setForm(f=>({...f,discipline:e.target.value}))}>
                  {DISCS.map(d=><option key={d} value={d}>{DISC_EMOJI[d]} {DISC_FR[d]}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select style={{...inp,cursor:'pointer'}} value={form.comp_type} onChange={e=>setForm(f=>({...f,comp_type:e.target.value}))}>
                  <option value="duo">Duo</option>
                  <option value="groupe">Groupe</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Statut</label>
                <select style={{...inp,cursor:'pointer'}} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  <option value="pending">À venir</option>
                  <option value="active">En cours</option>
                  <option value="paused">En pause</option>
                  <option value="ended">Terminé</option>
                </select>
              </div>
            </div>
            <div><label style={lbl}>Date de fin</label><input style={inp} type="datetime-local" value={form.ends_at} onChange={e=>setForm(f=>({...f,ends_at:e.target.value}))}/></div>
            <div><label style={lbl}>Description</label><textarea style={{...inp,resize:'vertical',minHeight:60}} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
            {err && <div style={{ background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#f87171' }}>⚠️ {err}</div>}
            <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
              <button onClick={onClose} style={{ background:'transparent',border:'1px solid rgba(255,255,255,0.15)',borderRadius:50,padding:'9px 18px',fontSize:13,color:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'DM Sans,sans-serif' }}>Annuler</button>
              <button onClick={save} disabled={saving} style={{ background:`linear-gradient(135deg,${OR},${OR2})`,border:'none',borderRadius:50,padding:'9px 22px',fontSize:13,fontWeight:700,color:'#000',cursor:'pointer',fontFamily:'DM Sans,sans-serif',opacity:saving?0.6:1 }}>
                {saving ? '⏳ Enregistrement…' : '💾 Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const [contests,    setContests]    = useState<Contest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editContest, setEditContest] = useState<Contest|null>(null);
  const [deleting,    setDeleting]    = useState<string|null>(null);
  const [msg,         setMsg]         = useState('');
  const [msgType,     setMsgType]     = useState<'success'|'error'>('success');

  function showMsg(t: string, type: 'success'|'error' = 'success') {
    setMsg(t); setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  }

  async function loadContests() {
    if (!admin?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/contests`, { headers: { Authorization:`Bearer ${admin.token}` } });
      const d = await res.json();
      setContests(d?.contests ?? d?.data ?? d ?? []);
    } catch { showMsg('Impossible de charger les compétitions.', 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadContests(); }, [admin?.token]);

  async function deleteContest(id: string, title: string) {
    if (!confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API}/contests/${id}`, {
        method: 'DELETE',
        headers: { Authorization:`Bearer ${admin?.token}` },
      });
      if (!res.ok) throw new Error();
      setContests(prev => prev.filter(c => c.id !== id));
      showMsg(`✓ "${title}" supprimée.`);
    } catch { showMsg('Erreur lors de la suppression.', 'error'); }
    finally { setDeleting(null); }
  }

  async function toggleStatus(contest: Contest) {
    const newStatus = contest.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`${API}/contests/${contest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${admin?.token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setContests(prev => prev.map(c => c.id === contest.id ? { ...c, status: newStatus } : c));
      showMsg(`✓ Statut mis à jour : ${newStatus}`);
    } catch { showMsg('Erreur lors de la mise à jour.', 'error'); }
  }

  const activeCount  = contests.filter(c => c.status === 'active').length;
  const pendingCount = contests.filter(c => c.status === 'pending').length;
  const endedCount   = contests.filter(c => c.status === 'ended').length;
  const totalVotes   = contests.reduce((s,c) => s + (c.candidates ?? []).reduce((vs,cd) => vs + (cd.votes ?? 0), 0), 0);

  return (
    <AdminGuard>
      <div style={{ display:'flex', minHeight:'100vh', background:'#0a0a0f' }}>
        <AdminSidebar />
        <main style={{ flex:1, padding:'24px', overflow:'auto', fontFamily:'DM Sans,sans-serif' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:4 }}>⚙️ Dashboard Admin</div>
              <div style={{ fontSize:12, color:'#4a4a6a' }}>Gestion complète de la plateforme Diki-Diki</div>
            </div>
            <button onClick={() => setShowCreate(true)}
              style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'10px 22px', fontSize:13, fontWeight:700, color:'#000', cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:8 }}>
              🏆 + Créer une compétition
            </button>
          </div>

          {/* Stats rapides */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'En cours',    val:activeCount,  color:'#4ade80', bg:'rgba(74,222,128,0.06)',   border:'rgba(74,222,128,0.2)',   icon:'🟢' },
              { label:'À venir',     val:pendingCount, color:OR,        bg:'rgba(255,170,0,0.06)',    border:'rgba(255,170,0,0.2)',    icon:'⏳' },
              { label:'Terminées',   val:endedCount,   color:'#f87171', bg:'rgba(248,113,113,0.06)', border:'rgba(248,113,113,0.2)', icon:'⏹' },
              { label:'Total votes', val:fmt(totalVotes), color:'#60a5fa', bg:'rgba(96,165,250,0.06)', border:'rgba(96,165,250,0.2)', icon:'★', iconColor:'#FF0000' },
            ].map(k => (
              <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:14, padding:'16px' }}>
                <div style={{ fontSize:20, marginBottom:6, color:(k as any).iconColor || 'inherit' }}>{k.icon}</div>
                <div style={{ fontSize:22, fontWeight:800, color:k.color, fontFamily:'Syne,sans-serif' }}>{k.val}</div>
                <div style={{ fontSize:11, color:k.color, opacity:.7, marginTop:4 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/*DKDK_SANTE_USE*/}
            <SanteWidget token={admin?.token} router={router} />

            {/* Liens raccourcis */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
            {[
              { label:'🎬 Modération vidéos', desc:'Approuver ou rejeter les vidéos', href:'/admin/moderation', color:'#FFAA00' },
              { label:'📊 Statistiques',       desc:'Finances et trafic en temps réel', href:'/admin/stats',      color:'#4ade80' },
              { label:'👥 Utilisateurs',       desc:'Gérer les comptes utilisateurs',   href:'/admin/stats',      color:'#60a5fa' },
            ].map(l => (
              <div key={l.label} onClick={() => router.push(l.href)}
                style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${l.color}30`, borderRadius:14, padding:'18px', cursor:'pointer' }}>
                <div style={{ fontSize:15, fontWeight:700, color:l.color, marginBottom:6, fontFamily:'Syne,sans-serif' }}>{l.label}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{l.desc}</div>
              </div>
            ))}
          </div>

          {/* Message */}
          {msg && (
            <div style={{ background:msgType==='success'?'rgba(74,222,128,0.08)':'rgba(248,113,113,0.08)', border:`1px solid ${msgType==='success'?'rgba(74,222,128,0.25)':'rgba(248,113,113,0.25)'}`, borderRadius:10, padding:'10px 16px', fontSize:12, color:msgType==='success'?'#4ade80':'#f87171', marginBottom:16 }}>
              {msg}
            </div>
          )}

          {/* Liste compétitions */}
          <div style={{ marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', fontFamily:'Syne,sans-serif' }}>🏆 Toutes les compétitions ({contests.length})</div>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#4a4a6a' }}>⏳ Chargement…</div>
          ) : contests.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,170,0,0.2)', borderRadius:16 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🏆</div>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14, marginBottom:16 }}>Aucune compétition pour l'instant.</p>
              <button onClick={() => setShowCreate(true)}
                style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'10px 22px', fontSize:13, fontWeight:700, color:'#000', cursor:'pointer' }}>
                + Créer la première compétition
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {contests.map(c => {
                const st     = STATUS_META[c.status] ?? STATUS_META.pending;
                const votes  = (c.candidates ?? []).reduce((s,cd) => s + (cd.votes ?? 0), 0);
                const days   = Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 86400000));
                return (
                  <div key={c.id} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <div style={{ fontSize:24 }}>{DISC_EMOJI[c.discipline] ?? '🏆'}</div>
                    <div style={{ flex:1, minWidth:160 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4, fontFamily:'Syne,sans-serif' }}>{c.title}</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color }}>{st.label}</span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{DISC_FR[c.discipline] ?? c.discipline} · {c.comp_type}</span>
                        {c.status !== 'ended' && <span style={{ fontSize:11, color:days<=3?'#f87171':'rgba(255,255,255,0.3)' }}>⏱ {days}j restants</span>}
                        <span style={{ fontSize:11, color:OR }}><span style={{color:"#FF0000"}}>★</span> {fmt(votes)} votes</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
                      {(c.status === 'active' || c.status === 'paused') && (
                        <button onClick={() => toggleStatus(c)}
                          style={{ padding:'6px 12px', fontSize:11, fontWeight:700, borderRadius:8, cursor:'pointer', fontFamily:'DM Sans,sans-serif', background:c.status==='active'?'rgba(96,165,250,0.1)':'rgba(74,222,128,0.1)', border:`1px solid ${c.status==='active'?'rgba(96,165,250,0.3)':'rgba(74,222,128,0.3)'}`, color:c.status==='active'?'#60a5fa':'#4ade80' }}>
                          {c.status === 'active' ? '⏸ Pause' : '▶ Relancer'}
                        </button>
                      )}
                      <button onClick={() => setEditContest(c)}
                        style={{ padding:'6px 12px', fontSize:11, fontWeight:700, borderRadius:8, cursor:'pointer', fontFamily:'DM Sans,sans-serif', background:'rgba(255,170,0,0.1)', border:'1px solid rgba(255,170,0,0.3)', color:OR }}>
                        ✏️ Modifier
                      </button>
                      <button onClick={() => deleteContest(c.id, c.title)} disabled={deleting===c.id}
                        style={{ padding:'6px 12px', fontSize:11, fontWeight:700, borderRadius:8, cursor:'pointer', fontFamily:'DM Sans,sans-serif', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', color:'#f87171', opacity:deleting===c.id?0.5:1 }}>
                        {deleting===c.id ? '⏳' : '🗑 Supprimer'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {showCreate  && <CreateModal onClose={()=>setShowCreate(false)}   onCreated={loadContests} token={admin?.token??''} />}
      {editContest && <EditModal   contest={editContest} onClose={()=>setEditContest(null)} onSaved={loadContests} token={admin?.token??''} />}
    </AdminGuard>
  );
}
