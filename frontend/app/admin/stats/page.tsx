'use client';
import { AdminGuard }   from '../components/admin/AdminGuard';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { useAdminAuth } from '../components/admin/AdminAuthContext';
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
  operators?: { name: string; pct: number; color: string }[];
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

const DEFAULT_OPERATORS = [
  { name: 'MTN MoMo',       pct: 42, color: '#FFD700' },
  { name: 'Moov Money',     pct: 28, color: '#0057FF' },
  { name: 'Carte bancaire', pct: 18, color: '#4ade80' },
  { name: 'Orange Money',   pct:  8, color: '#FF6B00' },
  { name: 'Autres',         pct:  4, color: '#8B2FC9' },
];

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
  const liveRef = useRef<NodeJS.Timeout>();
  const OR = '#FFAA00';

  // Charger stats de base
  useEffect(() => {
    if (!admin?.token) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/contests`, { headers: { Authorization: `Bearer ${admin.token}` } })
        .then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/videos?status=pending`, { headers: { Authorization: `Bearer ${admin.token}` } })
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([contestsData, pendingData]) => {
      const contests       = contestsData?.contests ?? contestsData?.data ?? contestsData ?? [];
      const activeContests = Array.isArray(contests) ? contests.filter((c: any) => c.status === 'active').length : 0;
      const pending        = pendingData?.videos?.length ?? (Array.isArray(pendingData) ? pendingData.length : 0);
      const totalVotes     = Array.isArray(contests) ? contests.reduce((s: number, c: any) =>
        s + (c.candidates ?? []).reduce((vs: number, cd: any) => vs + (cd.votes ?? 0), 0), 0) : 0;
      const revenue = totalVotes * 100;
      setStats({ total_votes: totalVotes, total_revenue: revenue, platform_cut: revenue * 0.5, net_cagnotte: revenue * 0.5, total_users: 0, total_videos: 0, pending_videos: pending, active_contests: activeContests, operators: DEFAULT_OPERATORS });
    }).catch(() => setError('Impossible de charger les statistiques.'))
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
        <main style={{ flex:1, padding:'24px', overflow:'auto', fontFamily:'DM Sans,sans-serif' }}>

          {/* Header */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:4 }}>📊 Statistiques & Finances</div>
            <div style={{ fontSize:12, color:'#4a4a6a' }}>Données confidentielles — accès administrateur uniquement</div>
          </div>

          {/* ── BLOC TEMPS RÉEL ─────────────────────────────────────── */}
          <div style={{ background:'linear-gradient(135deg,rgba(255,170,0,0.06),rgba(255,107,0,0.03))', border:'1px solid rgba(255,170,0,0.2)', borderRadius:16, padding:'18px 20px', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
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
                <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:60 }}>
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
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                {[
                  { label:'Votes totaux',       val: fmt(stats.total_votes)+'',          color:OR,        bg:'rgba(255,170,0,0.06)',   border:'rgba(255,170,0,0.2)'    },
                  { label:'Revenus plateforme', val: fmt(stats.platform_cut)+' F',       color:'#4ade80', bg:'rgba(74,222,128,0.06)', border:'rgba(74,222,128,0.2)'   },
                  { label:'Cagnotte nette',     val: fmt(stats.net_cagnotte)+' F',       color:'#60a5fa', bg:'rgba(96,165,250,0.06)', border:'rgba(96,165,250,0.2)'   },
                  { label:'Vidéos en attente',  val: String(stats.pending_videos),       color:'#f87171', bg:'rgba(248,113,113,0.06)',border:'rgba(248,113,113,0.2)'  },
                ].map(k => (
                  <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:14, padding:'16px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:k.color, opacity:.7, letterSpacing:'.5px', marginBottom:6, textTransform:'uppercase' as const }}>{k.label}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:k.color, fontFamily:'Syne,sans-serif' }}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* KPIs secondaires */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
                {[
                  { label:'Compétitions actives', val: String(stats.active_contests),                                           color:'#4ade80'           },
                  { label:'Total vidéos',          val: stats.total_videos > 0 ? fmt(stats.total_videos) : '—',                 color:'rgba(255,255,255,0.5)' },
                  { label:'Utilisateurs',          val: stats.total_users  > 0 ? fmt(stats.total_users)  : '—',                 color:'rgba(255,255,255,0.5)' },
                  { label:'Revenus totaux',        val: fmt(stats.total_revenue)+' F',                                           color:OR                  },
                ].map(k => (
                  <div key={k.label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'14px' }}>
                    <div style={{ fontSize:10, color:'#4a4a6a', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'.5px' }}>{k.label}</div>
                    <div style={{ fontSize:18, fontWeight:700, color:k.color, fontFamily:'Syne,sans-serif' }}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* Répartition + Opérateurs */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'20px' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:16 }}>Répartition des revenus</div>
                  {[
                    { label:'Diki-Diki (50%)',     pct:50,   val:stats.platform_cut,        color:OR        },
                    { label:'🥇 1er prix (37.5%)', pct:37.5, val:stats.net_cagnotte * 0.75, color:'#4ade80' },
                    { label:'🥈 2e prix (12.5%)',  pct:12.5, val:stats.net_cagnotte * 0.25, color:'#60a5fa' },
                  ].map(r => (
                    <div key={r.label} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
                        <span style={{ color:'#a0a0c0' }}>{r.label}</span>
                        <span style={{ color:r.color, fontWeight:700 }}>{fmt(r.val)} F</span>
                      </div>
                      <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:3 }}>
                        <div style={{ height:5, borderRadius:3, width:`${r.pct * 2}%`, background:r.color }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'20px' }}>
                  <div style={{ fontSize:14, fontWeight:700, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:16 }}>Revenus par opérateur</div>
                  {(stats.operators ?? DEFAULT_OPERATORS).map(r => (
                    <div key={r.name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <div style={{ fontSize:11, color:'#6a6a8a', width:110, flexShrink:0 }}>{r.name}</div>
                      <div style={{ flex:1, height:5, background:'rgba(255,255,255,0.05)', borderRadius:3 }}>
                        <div style={{ height:5, borderRadius:3, width:`${r.pct}%`, background:r.color }} />
                      </div>
                      <div style={{ fontSize:11, color:r.color, width:32, textAlign:'right' as const }}>{r.pct}%</div>
                      <div style={{ fontSize:11, color:'#4a4a6a', width:80, textAlign:'right' as const }}>{fmt(Math.round(stats.platform_cut * r.pct / 100))} F</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </AdminGuard>
  );
}
