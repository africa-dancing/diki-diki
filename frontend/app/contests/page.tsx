'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }
function fmt(n: number) { return n.toLocaleString('fr-FR'); }

const DISC_EMOJI: Record<string, string> = {
  danse:'💃', chant:'🎤', humour:'😂', poesie:'📜',
  conte:'📖', musique:'🎵', instrument:'🎸', acapella:'🎙️',
};
const DISC_FR: Record<string, string> = {
  danse:'Danse', chant:'Chant', humour:'Humour', poesie:'Poésie',
  conte:'Conte', musique:'Musique', instrument:'Instrument', acapella:'A cappella',
};

interface Candidate {
  id: string; name?: string; stage_name?: string;
  votes?: number; video_id?: string; position?: number;
}
interface Contest {
  id: string; title: string; discipline: string; comp_type: string;
  status: string; starts_at?: string; ends_at: string; description?: string;
  candidates?: Candidate[];
}

function daysLeft(d: string) {
  const n = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  return Math.max(0, n);
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active:  { label: '● En cours',  color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)'  },
  paused:  { label: '⏸ En pause', color: '#FFAA00', bg: 'rgba(255,170,0,0.08)',   border: 'rgba(255,170,0,0.25)'   },
  ended:   { label: '⏹ Terminé',  color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
  pending: { label: '○ À venir',  color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
};

export default function ContestsPage() {
  const router = useRouter();
  const OR = '#FFAA00';

  const [contests, setContests] = useState<Contest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'all' | 'active' | 'ended'>('all');
  const [disc,     setDisc]     = useState('Tous');
  const loggedIn = !!getToken();

  useEffect(() => {
    fetch(`${API}/contests`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setContests(d?.contests ?? d?.data ?? d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const disciplines = ['Tous', ...Array.from(new Set(contests.map(c => c.discipline).filter(Boolean)))];

  const displayed = contests.filter(c => {
    const matchStatus = filter === 'all' || c.status === filter;
    const matchDisc   = disc === 'Tous' || c.discipline === disc;
    return matchStatus && matchDisc;
  });

  const activeCount = contests.filter(c => c.status === 'active').length;
  const endedCount  = contests.filter(c => c.status === 'ended').length;

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18, overflow: 'hidden',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f0', fontFamily: 'DM Sans, sans-serif', paddingBottom: 60 }}>

      {/* Topbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(8,8,15,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,170,0,0.12)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.15rem' }}>
            <span style={{ color: OR }}>Diki</span><span style={{ color: '#fff', margin: '0 3px' }}>-</span><span style={{ color: OR }}>Diki</span>
          </span>
          <span style={{ fontSize: '.48rem', fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,.6)', borderRadius: 3, padding: '1px 4px', letterSpacing: '.08em' }}>VISION</span>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          {loggedIn && (
            <button onClick={() => router.push('/challenges')}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '6px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
              ⚡ Challenges
            </button>
          )}
          <button onClick={() => router.push('/home')}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, padding: '6px 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            ← Accueil
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 50, padding: '5px 14px', marginBottom: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: OR, display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 11, color: OR, fontWeight: 700, letterSpacing: '.06em' }}>{activeCount} COMPÉTITION{activeCount > 1 ? 'S' : ''} EN COURS</span>
          </div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem,4vw,2.6rem)', color: '#fff', marginBottom: 8 }}>
            🏆 Toutes les <span style={{ color: OR }}>compétitions</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 500, margin: '0 auto' }}>
            Découvrez les talents en lice, votez pour vos favoris et suivez les résultats en temps réel.
          </p>
        </div>

        {/* Filtres statut */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
          {[
            { key: 'all',    label: `Toutes (${contests.length})` },
            { key: 'active', label: `En cours (${activeCount})`   },
            { key: 'ended',  label: `Terminées (${endedCount})`   },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              style={{ padding: '7px 16px', borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${filter === f.key ? OR : 'rgba(255,255,255,0.1)'}`, background: filter === f.key ? 'rgba(255,170,0,0.12)' : 'transparent', color: filter === f.key ? OR : 'rgba(255,255,255,0.4)' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Filtres discipline */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
          {disciplines.map(d => (
            <button key={d} onClick={() => setDisc(d)}
              style={{ padding: '5px 14px', borderRadius: 50, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${disc === d ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.07)'}`, background: disc === d ? 'rgba(255,255,255,0.08)' : 'transparent', color: disc === d ? '#fff' : 'rgba(255,255,255,0.35)' }}>
              {d !== 'Tous' ? `${DISC_EMOJI[d] ?? '🎭'} ${DISC_FR[d] ?? d}` : 'Toutes disciplines'}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.2)' }}>⏳ Chargement…</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Aucune compétition dans cette catégorie.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {displayed.map(c => {
              const st       = STATUS_META[c.status] ?? STATUS_META.pending;
              const cands    = c.candidates ?? [];
              const total    = cands.reduce((s, cd) => s + (cd.votes ?? 0), 0);
              const net      = total * 100 * 0.5;
              const sorted   = [...cands].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
              const days     = daysLeft(c.ends_at);
              const isEnded  = c.status === 'ended';

              return (
                <div key={c.id} style={card}>
                  {/* Header carte */}
                  <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 20 }}>{DISC_EMOJI[c.discipline] ?? '🏆'}</span>
                        <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, color: '#fff', margin: 0 }}>{c.title}</h2>
                      </div>
                      {c.description && (
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', lineHeight: 1.5 }}>{c.description}</p>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{DISC_FR[c.discipline] ?? c.discipline} · {c.comp_type}</span>
                        {!isEnded && <span style={{ fontSize: 11, color: days <= 3 ? '#f87171' : 'rgba(255,255,255,0.3)' }}>⏱ {days}j restants</span>}
                        {isEnded && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Terminé le {new Date(c.ends_at).toLocaleDateString('fr-FR')}</span>}
                      </div>
                    </div>

                    {/* Stats votes */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: OR, fontFamily: 'Syne,sans-serif' }}>{fmt(total)}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>votes au total</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Cagnotte : <strong style={{ color: '#4ade80' }}>{fmt(net)} F</strong></div>
                    </div>
                  </div>

                  {/* Candidats */}
                  {cands.length > 0 && (
                    <div style={{ padding: '14px 20px' }}>
                      {isEnded && sorted.length >= 2 && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                          {[
                            { cand: sorted[0], medal: '🥇', prize: Math.round(net * 0.75), color: '#FFD700' },
                            { cand: sorted[1], medal: '🥈', prize: Math.round(net * 0.25), color: '#C0C0C0' },
                          ].map(({ cand, medal, prize, color }) => (
                            <div key={cand.id} style={{ flex: 1, background: `rgba(255,255,255,0.03)`, border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                              <div style={{ fontSize: 24, marginBottom: 4 }}>{medal}</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{cand.stage_name ?? cand.name ?? 'Candidat'}</div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}><span style={{color:'#FF0000'}}>★</span> {fmt(cand.votes ?? 0)} votes</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color }}>+{fmt(prize)} F CFA</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Barre de progression votes */}
                      {!isEnded && cands.length >= 2 && total > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                            <span>{sorted[0]?.stage_name ?? sorted[0]?.name ?? 'Candidat 1'} · {fmt(sorted[0]?.votes ?? 0)} <span style={{color:'#FF0000'}}>★</span></span>
                            <span>{sorted[1]?.stage_name ?? sorted[1]?.name ?? 'Candidat 2'} · {fmt(sorted[1]?.votes ?? 0)} <span style={{color:'#FF0000'}}>★</span></span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ height: '100%', background: OR, width: `${Math.round(((sorted[0]?.votes ?? 0) / total) * 100)}%`, transition: 'width .5s', borderRadius: '4px 0 0 4px' }} />
                            <div style={{ height: '100%', background: '#60a5fa', flex: 1, borderRadius: '0 4px 4px 0' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                            <span>{Math.round(((sorted[0]?.votes ?? 0) / total) * 100)}%</span>
                            <span>{Math.round(((sorted[1]?.votes ?? 0) / total) * 100)}%</span>
                          </div>
                        </div>
                      )}

                      {/* Boutons candidats */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {sorted.slice(0, 4).map((cand, i) => (
                          <button key={cand.id}
                            onClick={() => cand.video_id && router.push(`/watch/${cand.video_id}`)}
                            disabled={!cand.video_id}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 && !isEnded ? 'rgba(255,170,0,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 50, padding: '6px 14px', fontSize: 12, color: '#fff', cursor: cand.video_id ? 'pointer' : 'default', fontFamily: 'DM Sans,sans-serif' }}>
                            {i === 0 && !isEnded && <span style={{ color: OR }}>👑</span>}
                            <span>{cand.stage_name ?? cand.name ?? 'Candidat'}</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}><span style={{color:'#FF0000'}}>★</span> {fmt(cand.votes ?? 0)}</span>
                          </button>
                        ))}
                        {!isEnded && loggedIn && sorted[0]?.video_id && (
                          <button onClick={() => router.push(`/watch/${sorted[0].video_id}`)}
                            style={{ background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', border: 'none', borderRadius: 50, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', marginLeft: 'auto' }}>
                            ★ Voter
                          </button>
                        )}
                        {!loggedIn && !isEnded && (
                          <button onClick={() => router.push('/auth/login')}
                            style={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 50, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: OR, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', marginLeft: 'auto' }}>
                            🔒 Voter
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {cands.length === 0 && (
                    <div style={{ padding: '14px 20px', fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
                      Aucun candidat inscrit pour l'instant.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}
