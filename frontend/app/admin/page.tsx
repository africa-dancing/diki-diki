'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard }   from '../components/admin/AdminGuard';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { useAdminAuth } from '../components/admin/AdminAuthContext';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';
const OR2 = '#FF6B00';

const DISC_EMOJI: Record<string,string> = { danse:'💃',chant:'🎤',humour:'😂',poesie:'📜',conte:'📖',musique:'🎵',instrument:'🎸',acapella:'🎙️' };
const DISC_FR:    Record<string,string> = { danse:'Danse',chant:'Chant',humour:'Humour',poesie:'Poésie',conte:'Conte',musique:'Musique',instrument:'Instrument',acapella:'A cappella' };

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

export default function AdminPage() {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const [bstats, setBstats] = useState<any>(null); /*DKDK_ADMIN_AGG — vrais chiffres des brackets*/

  async function loadBstats() {
    if (!admin?.token) return;
    try {
      const res = await fetch(`${API}/brackets/admin/stats`, { headers: { Authorization:`Bearer ${admin.token}` } });
      const d = await res.json();
      setBstats(d?.data ?? null);
    } catch { /* silencieux : les chiffres restent a 0 si indispo */ }
  }

  useEffect(() => { loadBstats(); }, [admin?.token]);

  /*DKDK_ADMIN_AGG — comptes issus des vrais challenges (brackets)*/
  const activeCount  = bstats?.counts?.en_cours     ?? 0;
  const pendingCount = bstats?.counts?.en_formation ?? 0;
  const endedCount   = bstats?.counts?.terminees    ?? 0;
  const totalVotes   = bstats?.votes_total          ?? 0;
  const challenges: any[] = bstats?.challenges ?? [];

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
            <button onClick={() => router.push('/challenges/creer')}
              style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'10px 22px', fontSize:13, fontWeight:700, color:'#000', cursor:'pointer', fontFamily:'DM Sans,sans-serif', display:'flex', alignItems:'center', gap:8 }}>
              🏆 + Créer un challenge
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

          {/* Liste challenges — vrais challenges (brackets) DKDK_ADMIN_AGG */}
          <div style={{ marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', fontFamily:'Syne,sans-serif' }}>🏆 Toutes les challenges ({challenges.length})</div>
          </div>

          {!bstats ? (
            <div style={{ textAlign:'center', padding:'60px', color:'#4a4a6a' }}>⏳ Chargement…</div>
          ) : challenges.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px', background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,170,0,0.2)', borderRadius:16 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🏆</div>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14, marginBottom:16 }}>Aucun challenge pour l'instant.</p>
              <button onClick={() => router.push('/challenges/creer')}
                style={{ background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'10px 22px', fontSize:13, fontWeight:700, color:'#000', cursor:'pointer' }}>
                + Créer la première challenge
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {challenges.map((c:any) => {
                const stMap: Record<string, {label:string;color:string;bg:string}> = {
                  in_progress:        { label:'⚔️ En cours',     color:'#FFAA00', bg:'rgba(255,170,0,0.12)'  },
                  active:             { label:'⚔️ En cours',     color:'#FFAA00', bg:'rgba(255,170,0,0.12)'  },
                  waiting_candidates: { label:'📝 En formation', color:'#4ade80', bg:'rgba(74,222,128,0.12)' },
                  open:               { label:'📝 En formation', color:'#4ade80', bg:'rgba(74,222,128,0.12)' },
                  ouvrir:             { label:'📝 En formation', color:'#4ade80', bg:'rgba(74,222,128,0.12)' },
                  ouvert:             { label:'📝 En formation', color:'#4ade80', bg:'rgba(74,222,128,0.12)' },
                  done:               { label:'🏁 Terminé',      color:'#f87171', bg:'rgba(248,113,113,0.12)'},
                };
                const st = stMap[c.status] ?? { label:c.status, color:'rgba(255,255,255,0.4)', bg:'rgba(255,255,255,0.05)' };
                return (
                  <div key={c.id} onClick={() => router.push('/challenges/' + c.id)}
                    style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 18px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap', cursor:'pointer' }}>
                    <div style={{ fontSize:24 }}>{DISC_EMOJI[c.discipline] ?? '🏆'}</div>
                    <div style={{ flex:1, minWidth:160 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:4, fontFamily:'Syne,sans-serif' }}>{c.title}</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color }}>{st.label}</span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{c.code ? c.code : ('C' + c.max_participants)} · {DISC_FR[c.discipline] ?? c.discipline ?? '—'}</span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>👥 {c.participants ?? 0}/{c.max_participants}</span>
                        <span style={{ fontSize:11, color:'#f7c205', fontWeight:700 }}>🏆 {fmt(c.total_cagnotte ?? 0)} F</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AdminGuard>
  );
}
