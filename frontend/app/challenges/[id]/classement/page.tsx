/* app/challenges/[id]/classement/page.tsx
   DKDK — « Podium · Classement des votes » d'un challenge (dynamique, vrais candidats).
   Charge GET /v1/brackets/:id/classement. Bascule Étape en cours / Cumul du parcours.
   Chaque « Soutenir » mène à la page de vote sans friction /v/<code>. Aucun gain promis. */
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const GOLD = '#FFAA00';

type Cand = {
  participant_id: string; public_code: string | null; nom: string | null; avatar_url: string | null;
  video_id: string | null; etoiles: number; coeurs: number; voix_etape: number; voix_cumul: number;
  eliminated: boolean; suspended: boolean;
};
type Bracket = { id: string; title: string | null; discipline: string | null; status: string; type: string | null; mode: string | null; current_round: number | null; max_participants: number | null };

const fmt = (n: number) => (Number(n) || 0).toLocaleString('fr-FR');
const initiale = (nom: string | null) => (nom && nom.trim() ? nom.trim()[0].toUpperCase() : '?');

export default function ClassementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [cands, setCands] = useState<Cand[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [mode, setMode] = useState<'etape' | 'cumul'>('etape');

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const r = await fetch(`${API}/brackets/${id}/classement`, { cache: 'no-store' });
        if (r.status === 404) { if (!annule) setState('notfound'); return; }
        const j = await r.json();
        if (!r.ok || !j.success) { if (!annule) setState('error'); return; }
        if (!annule) {
          setBracket(j.data.bracket);
          setCands((j.data.candidats || []) as Cand[]);
          if (j.data.bracket?.mode === 'bloc') setMode('cumul');
          setState('ready');
        }
      } catch { if (!annule) setState('error'); }
    })();
    return () => { annule = true; };
  }, [id]);

  const bloc = bracket?.mode === 'bloc';
  const vkey = (c: Cand) => (mode === 'cumul' ? c.voix_cumul : c.voix_etape);

  const sorted = useMemo(() => {
    return [...cands].sort((a, b) => (vkey(b) - vkey(a)) || ((a.eliminated ? 1 : 0) - (b.eliminated ? 1 : 0)));
  }, [cands, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = sorted.reduce((s, c) => s + vkey(c), 0);
  const maxV = sorted.length ? Math.max(1, vkey(sorted[0])) : 1;
  const ouvert = bracket && (bracket.status === 'active' || bracket.status === 'in_progress');
  const votable = (c: Cand) => !!ouvert && !!c.public_code && !c.eliminated && !c.suspended;
  const soutenir = (c: Cand) => { if (votable(c)) router.push(`/v/${c.public_code}`); };

  // ---- styles ----
  const page: React.CSSProperties = { background: '#0a0a0f', minHeight: '100vh', color: '#ece7da', fontFamily: 'DM Sans, system-ui, sans-serif', paddingBottom: 60 };
  const wrap: React.CSSProperties = { maxWidth: 860, margin: '0 auto', padding: '0 16px' };
  const card: React.CSSProperties = { background: '#15151c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '16px 10px 14px', textAlign: 'center' };
  const voteBtn = (primary: boolean, on: boolean): React.CSSProperties => ({
    display: 'block', width: '100%', marginTop: 12, borderRadius: 50, padding: '9px 0', fontSize: 13, fontWeight: 800, cursor: on ? 'pointer' : 'not-allowed',
    border: primary ? 'none' : '1px solid ' + GOLD, color: primary ? '#140a02' : GOLD,
    background: primary ? 'linear-gradient(135deg,#FFAA00,#FF6B00)' : 'transparent', opacity: on ? 1 : 0.4,
  });
  const voteSm = (on: boolean): React.CSSProperties => ({ flex: 'none', background: 'transparent', border: '1px solid ' + GOLD, color: GOLD, fontWeight: 800, fontSize: 12, padding: '7px 14px', borderRadius: 50, cursor: on ? 'pointer' : 'not-allowed', opacity: on ? 1 : 0.4 });
  const avaStyle = (big: boolean): React.CSSProperties => ({ width: big ? 66 : 40, height: big ? 66 : 40, borderRadius: big ? '50%' : 10, margin: big ? '6px auto 8px' : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: big ? 24 : 15, color: '#fff', overflow: 'hidden', background: 'linear-gradient(135deg,#7e0380,#ed070f)', flex: 'none' });

  const PodiumCard = ({ c, rang }: { c: Cand; rang: number }) => {
    const first = rang === 1;
    const pct = total > 0 ? Math.round((vkey(c) / total) * 100) : 0;
    return (
      <div style={{ ...card, ...(first ? { borderColor: 'rgba(255,170,0,0.5)', boxShadow: '0 10px 40px rgba(255,170,0,0.14)', transform: 'translateY(-8px)' } : {}), opacity: c.eliminated ? 0.6 : 1 }}>
        {first && <div style={{ fontSize: 26, marginBottom: -4 }}>👑</div>}
        <div style={avaStyle(true)}>{c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initiale(c.nom)}</div>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{c.nom || 'Candidat'}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 1 }}>{bracket?.max_participants ? 'C' + bracket.max_participants : ''}{bracket?.discipline ? ' · ' + bracket.discipline : ''}</div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 800, color: GOLD, margin: '8px 0 2px' }}>{rang}</div>
        <div style={{ fontWeight: 800, fontSize: 20 }}>{fmt(vkey(c))} <small style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 12 }}>voix</small></div>
        {first && total > 0 && <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, marginTop: 2 }}>{pct} % des voix</div>}
        {mode === 'etape' && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>★ {fmt(c.etoiles)} · ❤️ {fmt(c.coeurs)}</div>}
        {c.eliminated
          ? <div style={{ marginTop: 10, fontSize: 11, color: '#ff8a8a', fontWeight: 700 }}>Éliminé — prime de participation</div>
          : <button style={voteBtn(first, votable(c))} disabled={!votable(c)} onClick={() => soutenir(c)}>Soutenir</button>}
      </div>
    );
  };

  return (
    <div style={page}>
      <Navbar />
      <div style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339,98%,49%) 0%,transparent 70%)', paddingTop: 8 }}>
        <div style={{ ...wrap, textAlign: 'center', padding: '26px 16px 6px' }}>
          <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#140a02', fontWeight: 800, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 6 }}>Podium</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 28, margin: '10px 0 8px', textTransform: 'uppercase' }}>Classement des votes</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13.5, maxWidth: '56ch', margin: '0 auto', lineHeight: 1.6 }}>
            Seules les voix <b>payées et confirmées</b> par l'opérateur comptent. Le classement se recalcule en direct, et <b>tous les candidats y figurent</b>.
          </p>
        </div>
      </div>

      <div style={wrap}>
        {state === 'loading' && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 30 }}>Chargement du classement…</p>}
        {state === 'notfound' && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 30 }}>Challenge introuvable.</p>}
        {state === 'error' && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 30 }}>Impossible de charger le classement pour le moment.</p>}

        {state === 'ready' && (
          <>
            <div style={{ textAlign: 'center', color: GOLD, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 10 }}>
              {bracket?.title || 'Challenge'}{bracket?.current_round ? ' · Étape ' + bracket.current_round : ''}
            </div>

            {!bloc && (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '16px auto 4px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 50, overflow: 'hidden' }}>
                  <button onClick={() => setMode('etape')} style={{ background: mode === 'etape' ? 'linear-gradient(135deg,#FFAA00,#FF6B00)' : 'transparent', color: mode === 'etape' ? '#140a02' : 'rgba(255,255,255,0.6)', border: 'none', fontSize: 13, fontWeight: 700, padding: '10px 20px', cursor: 'pointer' }}>Étape en cours</button>
                  <button onClick={() => setMode('cumul')} style={{ background: mode === 'cumul' ? 'linear-gradient(135deg,#FFAA00,#FF6B00)' : 'transparent', color: mode === 'cumul' ? '#140a02' : 'rgba(255,255,255,0.6)', border: 'none', fontSize: 13, fontWeight: 700, padding: '10px 20px', cursor: 'pointer' }}>Cumul du parcours</button>
                </div>
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '6px 0 20px' }}>
                  Les scores repartent de zéro à chaque étape · le podium final se joue sur le cumul
                </div>
              </>
            )}

            {sorted.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: 24 }}>Pas encore de candidats.</p>
            ) : (
              <>
                {/* PODIUM */}
                <div style={{ display: 'grid', gridTemplateColumns: sorted.length >= 3 ? '1fr 1.15fr 1fr' : 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, alignItems: 'end', marginTop: bloc ? 16 : 0 }}>
                  {sorted.length >= 3
                    ? <>
                        <PodiumCard c={sorted[1]} rang={2} />
                        <PodiumCard c={sorted[0]} rang={1} />
                        <PodiumCard c={sorted[2]} rang={3} />
                      </>
                    : sorted.slice(0, 3).map((c, i) => <PodiumCard key={c.participant_id} c={c} rang={i + 1} />)}
                </div>

                {/* LISTE */}
                <div style={{ marginTop: 28 }}>
                  {sorted.slice(3).map((c, i) => {
                    const rang = i + 4;
                    const w = Math.max(2, Math.round((vkey(c) / maxV) * 100));
                    return (
                      <div key={c.participant_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 2px', borderTop: '1px solid rgba(255,255,255,0.1)', opacity: c.eliminated ? 0.5 : 1 }}>
                        <div style={{ width: 22, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{rang}</div>
                        <div style={{ ...avaStyle(false), filter: c.eliminated ? 'grayscale(1)' : 'none' }}>{c.avatar_url ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initiale(c.nom)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.nom || 'Candidat'}{c.eliminated && <span style={{ fontSize: 10, color: '#ff8a8a', fontWeight: 700 }}> · Éliminé</span>}
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11.5 }}>{c.eliminated ? 'Prime de participation' : (mode === 'etape' ? `★ ${fmt(c.etoiles)} · ❤️ ${fmt(c.coeurs)}` : (bracket?.discipline || ''))}</div>
                          <div style={{ height: 5, borderRadius: 50, background: 'rgba(255,255,255,0.08)', marginTop: 6, overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: w + '%', background: 'linear-gradient(90deg,#FFC233,#FF6B00)' }} /></div>
                        </div>
                        <div style={{ textAlign: 'right', flex: 'none', minWidth: 60 }}><b style={{ fontSize: 16 }}>{fmt(vkey(c))}</b><small style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>voix</small></div>
                        {!c.eliminated && <button style={voteSm(votable(c))} disabled={!votable(c)} onClick={() => soutenir(c)}>Soutenir</button>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 26, padding: 16, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.6, textAlign: 'center' }}>
                  💡 Une <b>★ étoile</b> = 1 voix (100 F), un <b>❤️ cœur</b> = 2 voix (200 F). Ton vote ne compte qu'après confirmation du paiement. Le public seul décide — jamais une note technique. <b>Aucun gain chiffré promis.</b>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
