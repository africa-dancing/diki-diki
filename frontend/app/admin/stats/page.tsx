'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');

interface Stats {
  total_votes:     number;
  total_revenue:   number;
  platform_cut:    number;
  net_cagnotte:    number;
  total_users:     number;
  total_videos:    number;
  pending_videos:  number;
  active_contests: number;
}

interface LiveData {
  total:      number;
  logged_in:  number;
  visitors:   number;
  top_pages:  { page: string; count: number }[];
}

interface Summary {
  views_today:   number;
  views_hour:    number;
  peak_hour:     string;
  peak_visits:   number;
  hourly_visits: number[];
}

const PAGE_LABELS: Record<string, string> = {
  '/home': '🏠 Accueil', '/watch': '▶ Watch', '/compte': '👤 Compte',
  '/submit': '🎬 Soumettre', '/recharge': '⚡ Recharge', '/retrait': '💸 Retrait',
  '/contests': '🏆 Compétitions', '/challenges': '⚡ Challenges',
};

export default function AdminStatsPage() {
  const { admin } = useAdminAuth();
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [live,    setLive]    = useState<LiveData | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [pulse,   setPulse]   = useState(false);

  // Bloque le scroll du body uniquement sur la page Statistiques
  useEffect(() => {
    const b = document.body.style;
    const prev = { overflow: b.overflow, height: b.height, paddingTop: b.paddingTop };
    b.setProperty("overflow", "hidden", "important");
    b.setProperty("height", "100vh", "important");
    b.setProperty("padding-top", "0", "important");
    return () => {
      b.overflow = prev.overflow;
      b.height = prev.height;
      b.paddingTop = prev.paddingTop;
    };
  }, []);
  const liveRef = useRef<NodeJS.Timeout>();
  const OR = '#FFAA00';

  // Charger stats de base
  useEffect(() => {
    if (!admin?.token) return;
    setLoading(true);
    // DKDK_ADMIN_AGG — on lit les VRAIS challenges (brackets) via l'agregation admin, plus les contests vides.
    fetch(`${API}/brackets/admin/stats`, { headers: { Authorization: `Bearer ${admin.token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        const d = res?.data;
        if (!d) { setError('Impossible de charger les statistiques.'); return; }
        setStats({
          total_votes:     d.votes_total ?? 0,
          total_revenue:   d.finances?.total_collecte ?? 0,   // total collecte (brut)
          platform_cut:    d.finances?.platform_cut ?? 0,     // part plateforme (commission)
          net_cagnotte:    d.finances?.net_cagnotte ?? 0,     // cagnotte nette a partager
          total_users:     d.total_users ?? 0,
          total_videos:    d.total_videos ?? 0,
          pending_videos:  d.pending_videos ?? 0,
          active_contests: d.counts?.en_cours ?? 0,           // challenges en cours
        });
      })
      .catch(() => setError('Impossible de charger les statistiques.'))
      .finally(() => setLoading(false));
  }, [admin?.token]);

  // Polling visiteurs temps réel toutes les 10s
  useEffect(() => {
    if (!admin?.token) return;
    const fetchLive = async () => {
      try {
        const [liveRes, summaryRes] = await Promise.all([
          fetch(`${API}/analytics/active`,  { headers: { Authorization: `Bearer ${admin.token}` } }),
          fetch(`${API}/analytics/summary`, { headers: { Authorization: `Bearer ${admin.token}` } }),
        ]);
        if (liveRes.ok)    setLive(await liveRes.json());
        if (summaryRes.ok) setSummary(await summaryRes.json());
        setPulse(p => !p);
      } catch {}
    };
    fetchLive();
    liveRef.current = setInterval(fetchLive, 10_000);
    return () => clearInterval(liveRef.current);
  }, [admin?.token]);

  return (
    <AdminGuard>
      <div style={{ display:'flex', minHeight:'100vh', background:'#0a0a0f' }}>
        <AdminSidebar />
        <main style={{ flex:1, padding:'72px 16px 48px', overflow:'hidden', fontFamily:'DM Sans,sans-serif', position:'relative' }}>

          {/* Header */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:4 }}>📊 Statistiques & Finances</div>
            
          </div>

          {/* ── BLOC TEMPS RÉEL ─────────────────────────────────────── */}
          <div style={{ background:'linear-gradient(135deg,rgba(255,170,0,0.06),rgba(255,107,0,0.03))', border:'1px solid rgba(255,170,0,0.2)', borderRadius:16, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 8px #4ade80', animation:'pulse 2s infinite' }}/>
                <span style={{ fontSize:14, fontWeight:700, color:'#fff', fontFamily:'Syne,sans-serif' }}>Visiteurs en temps réel</span>
              </div>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Actualisé toutes les 10s</span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'Actifs maintenant', val: live?.total     ?? 0, icon:'👥', color:'#fff'     },
                { label:'Connectés',          val: live?.logged_in ?? 0, icon:'🔐', color:OR         },
                { label:'Visiteurs',          val: live?.visitors  ?? 0, icon:'👁',  color:'#60a5fa' },
                { label:'Vues aujourd\'hui',  val: summary?.views_today ?? 0, icon:'📈', color:'#4ade80' },
              ].map(k => (
                <div key={k.label} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'12px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:22, marginBottom:4 }}>{k.icon}</div>
                  <div style={{ fontSize:24, fontWeight:800, color:k.color, fontFamily:'Syne,sans-serif', lineHeight:1 }}>{k.val}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:4 }}>{k.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {/* Top pages */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.6)', marginBottom:10 }}>📱 Pages actives</div>
                {live?.top_pages && live.top_pages.length > 0 ? live.top_pages.map((p, i) => (
                  <div key={p.page} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>{PAGE_LABELS[p.page] ?? p.page}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:OR }}>{p.count}</span>
                  </div>
                )) : (
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', textAlign:'center', padding:'10px 0' }}>Aucun visiteur actif</div>
                )}
              </div>

              {/* Graphe horaire */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.6)' }}>⏰ Trafic par heure</span>
                  {summary?.peak_hour && <span style={{ fontSize:10, color:OR }}>Pic : {summary.peak_hour}</span>}
                </div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:40 }}>
                  {(summary?.hourly_visits ?? new Array(24).fill(0)).map((v, h) => {
                    const max  = Math.max(...(summary?.hourly_visits ?? [1]), 1);
                    const pct  = Math.round((v / max) * 100);
                    const now  = new Date().getHours();
                    const isNow = h === now;
                    return (
                      <div key={h} title={`${h}h : ${v} visites`}
                        style={{ flex:1, height:`${Math.max(pct, 4)}%`, background: isNow ? OR : 'rgba(255,255,255,0.12)', borderRadius:'2px 2px 0 0', transition:'height .3s', cursor:'default' }} />
                    );
                  })}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'rgba(255,255,255,0.2)', marginTop:4 }}>
                  <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                </div>
              </div>
            </div>
          </div>

          {loading && <div style={{ textAlign:'center', padding:'40px', color:'#4a4a6a' }}>⏳ Chargement…</div>}
          {error   && <div style={{ background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:12, padding:'14px', color:'#f87171', marginBottom:20 }}>⚠️ {error}</div>}

          {stats && (
            <>
              {/* KPIs principaux */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:10 }}>
                {[
                  { label:'Votes totaux',       val: fmt(stats.total_votes)+'',          color:OR,        bg:'rgba(255,170,0,0.06)',   border:'rgba(255,170,0,0.2)'    },
                  { label:'Revenus plateforme', val: fmt(stats.platform_cut)+' F',       color:'#4ade80', bg:'rgba(74,222,128,0.06)', border:'rgba(74,222,128,0.2)'   },
                  { label:'Cagnotte nette',     val: fmt(stats.net_cagnotte)+' F',       color:'#60a5fa', bg:'rgba(96,165,250,0.06)', border:'rgba(96,165,250,0.2)'   },
                  { label:'Vidéos en attente',  val: String(stats.pending_videos),       color:'#f87171', bg:'rgba(248,113,113,0.06)',border:'rgba(248,113,113,0.2)'  },
                ].map(k => (
                  <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:14, padding:'12px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:k.color, opacity:.7, letterSpacing:'.5px', marginBottom:6, textTransform:'uppercase' as const }}>{k.label}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:k.color, fontFamily:'Syne,sans-serif' }}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* KPIs secondaires */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:10 }}>
                {[
                  { label:'Challenges en cours', val: String(stats.active_contests),                                           color:'#4ade80'           },
                  { label:'Total vidéos',          val: stats.total_videos > 0 ? fmt(stats.total_videos) : '—',                 color:'rgba(255,255,255,0.5)' },
                  { label:'Utilisateurs',          val: stats.total_users  > 0 ? fmt(stats.total_users)  : '—',                 color:'rgba(255,255,255,0.5)' },
                  { label:'Revenus totaux',        val: fmt(stats.total_revenue)+' F',                                           color:OR                  },
                ].map(k => (
                  <div key={k.label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'10px' }}>
                    <div style={{ fontSize:10, color:'#4a4a6a', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'.5px' }}>{k.label}</div>
                    <div style={{ fontSize:18, fontWeight:700, color:k.color, fontFamily:'Syne,sans-serif' }}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* DKDK_STATS_FICTIF_RETIRE — blocs factices retires (repartition codee en dur + operateurs inventes). Reconstruction sur donnees reelles a venir. */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.12)', borderRadius:14, padding:'14px', textAlign:'center', color:'rgba(255,255,255,0.35)', fontSize:12 }}>
                Répartition détaillée par rang et par opérateur — en cours de reconstruction sur des données réelles.
              </div>
            </>
          )}
          <div style={{ position:'absolute', left:0, right:0, bottom:12, textAlign:'center', fontSize:11, color:'#4a4a6a' }}>Donnees confidentielles - acces administrateur uniquement</div>
        </main>
      </div>
    </AdminGuard>
  );
}
