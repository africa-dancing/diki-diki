'use client';
// DÉTAIL D'UN CHALLENGE — vue complète (hero, objectif par étape, sujets, candidats, LIRE -> Watch)
// Remplace l'ancienne maquette "duels". Affichage seul, données réelles via /brackets/:id/appel. /*DKDK_CHALLENGE_DETAIL*/
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = 'var(--or)';
const GRADS = ['linear-gradient(135deg,#7b2ff7,#f107a3)','linear-gradient(135deg,#f7971e,#ffd200)','linear-gradient(135deg,#11998e,#38ef7d)','linear-gradient(135deg,#fc4a1a,#f7b733)','linear-gradient(135deg,#4568dc,#b06ab3)','linear-gradient(135deg,#e53935,#e35d5b)','linear-gradient(135deg,#00c6ff,#0072ff)','linear-gradient(135deg,#f953c6,#b91d73)','linear-gradient(135deg,#43cea2,#185a9d)','linear-gradient(135deg,#ff512f,#dd2476)','linear-gradient(135deg,#c94b4b,#4b134f)','linear-gradient(135deg,#0cebeb,#29ffc6)'];

interface Etape { round_number: number; libelle: string; track_titre: string | null; track_artiste: string | null; ref_url?: string | null; }
interface Cand { user_id: string; name: string | null; avatar_url: string | null; video_id: string | null; }
interface Detail {
  id: string; title: string; discipline: string; modele: string; status: string;
  max_participants: number; niveau?: number | null; current_round?: number | null;
  total_cagnotte?: number; acceptes?: number; officiel?: boolean;
  etapes?: Etape[]; candidats?: Cand[]; objectif_info?: any;
}

const fmtF = (n: any) => Number(n || 0).toLocaleString('fr-FR') + ' F';

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/brackets/${id}/appel`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => setD(j.data))
      .catch(() => setError('Impossible de charger ce challenge.'))
      .finally(() => setLoading(false));
  }, [id]);

  const started = d?.status === 'active' || d?.status === 'in_progress';
  const cur = started ? (d?.current_round || 1) : 0;
  const etat = (n: number): 'done' | 'current' | 'next' | 'future' => {
    if (!started) return n === 1 ? 'next' : 'future';
    if (n < cur) return 'done';
    if (n === cur) return 'current';
    return 'future';
  };
  const rowStyle = (s: string): React.CSSProperties => {
    if (s === 'current' || s === 'next') return { background: 'linear-gradient(135deg,rgba(255,178,36,.16),rgba(255,122,26,.06))', border: '1px solid rgba(255,170,0,.5)', boxShadow: '0 0 18px -6px rgba(255,170,0,.5)' };
    if (s === 'done') return { opacity: .6 };
    return { opacity: .4 };
  };
  const tagFor = (s: string) => {
    if (s === 'done') return { t: '✓ Atteinte', bg: 'rgba(47,224,111,.14)', c: '#2fe06f' };
    if (s === 'current') return { t: '\u{1F3AF} En cours', bg: 'linear-gradient(135deg,#FF6B00,#FFD700)', c: '#150c00' };
    if (s === 'next') return { t: '\u{1F3AF} Prochaine', bg: 'linear-gradient(135deg,#FF6B00,#FFD700)', c: '#150c00' };
    return { t: 'À venir', bg: 'rgba(255,255,255,.06)', c: 'var(--ink-dim)' };
  };

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '16px 18px' };
  const vid = (d?.candidats || []).map(c => c.video_id).find(Boolean);
  const oi = d?.objectif_info;
  const badge = started ? `● En cours${d?.current_round ? ' · Étape ' + d.current_round : ''}` : (d?.status === 'done' ? '● Terminé' : '● Inscriptions ouvertes');
  const badgeBg = started || d?.status === 'done' ? 'linear-gradient(135deg,#FF6B00,#FFD700)' : 'linear-gradient(135deg,#2fe06f,#12b455)';
  const badgeColor = started || d?.status === 'done' ? '#150c00' : '#063';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'DM Sans, sans-serif', paddingBottom: 70 }}>
      <Navbar />
      <style>{`.dkdk-det-cols{display:grid;grid-template-columns:1fr;gap:16px}@media(min-width:820px){.dkdk-det-cols{grid-template-columns:1fr 1fr}}`}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '14px 16px 0' }}>
        <Link href="/challenges" style={{ color: 'var(--ink-soft)', fontSize: 13, textDecoration: 'none' }}>&larr; Les challenges</Link>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--ink-soft)', marginTop: 40 }}>Chargement&hellip;</p>
      ) : error || !d ? (
        <p style={{ textAlign: 'center', color: 'var(--red,#ff6b6b)', marginTop: 40 }}>{error || 'Introuvable.'}</p>
      ) : (
        <>
          {/* HERO magenta */}
          <div style={{ background: 'radial-gradient(ellipse 70% 70% at 50% -20%,hsl(339,98%,49%) 0%,transparent 65%)', paddingTop: 8 }}>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '10px 16px 4px' }}>
              <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 18, padding: '24px 20px', textAlign: 'center', color: '#fff', boxShadow: '0 8px 40px rgba(225,29,143,.35)' }}>
                <span style={{ display: 'inline-block', fontWeight: 800, fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 20, background: badgeBg, color: badgeColor }}>{badge}</span>
                <div style={{ color: '#ffd7de', fontSize: 12, fontWeight: 800, marginTop: 8, letterSpacing: '.08em' }}>C{d.max_participants} · {d.max_participants} candidats</div>
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, margin: '6px 0 10px', color: '#fff' }}>{d.title}</h1>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(0,0,0,.28)', border: '1px solid rgba(255,255,255,.3)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{d.discipline}</span>
                  {d.officiel && <span style={{ fontSize: 11, fontWeight: 700, color: '#150c00', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', borderRadius: 999, padding: '3px 10px' }}>Appel officiel</span>}
                </div>
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 16px' }}>
            {/* Ligne d'infos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, margin: '16px 0' }}>
              {[
                { k: 'Modèle', v: d.modele === 'bloc' ? 'Bloc groupé' : 'Parcours' },
                { k: d.modele === 'bloc' ? 'Vidéos' : 'Étapes', v: String(d.etapes?.length || d.niveau || '—') },
                { k: 'Candidats', v: `${d.acceptes ?? 0} / ${d.max_participants}` },
                { k: 'Cagnotte', v: fmtF(d.total_cagnotte) },
              ].map(m => (
                <div key={m.k} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.k}</div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, marginTop: 3 }}>{m.v}</div>
                </div>
              ))}
            </div>

            <div className="dkdk-det-cols">
              {/* Objectif par étape */}
              {oi && (
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: OR, marginBottom: 12 }}>{'\u{1F3AF}'} Objectif à collecter{oi.modele === 'parcours' ? ' (par étape)' : ''}</div>
                  {oi.modele === 'parcours' ? (
                    <>
                      {(oi.etapes || []).map((e: any) => {
                        const s = etat(e.etape); const tg = tagFor(s);
                        return (
                          <div key={e.etape} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, marginBottom: 8, flexWrap: 'wrap', ...rowStyle(s) }}>
                            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 12, minWidth: 62, color: s === 'current' || s === 'next' ? OR : undefined }}>Étape {e.etape}</span>
                            <span style={{ flex: 1, fontSize: 13, minWidth: 90 }}>{e.classement ? 'Classement' : 'Qualification'}</span>
                            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: s === 'current' ? 17 : 15, color: s === 'current' || s === 'next' ? OR : 'var(--ink)' }}>{e.objectif ? fmtF(e.objectif) : '—'}</span>
                            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, background: tg.bg, color: tg.c }}>{tg.t}</span>
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4, borderTop: '1px solid var(--line)' }}>
                        <span style={{ color: OR, fontWeight: 700, fontSize: 13 }}>Enveloppe totale</span>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17, color: OR }}>{fmtF(oi.enveloppe)}</span>
                      </div>
                    </>
                  ) : oi.objectif ? (
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--ink)' }}>{fmtF(oi.objectif)}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>À définir</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 10, lineHeight: 1.5 }}>Seuil à réunir en votes pour fermer {oi.modele === 'parcours' ? 'chaque étape' : 'le challenge'} — ce n&apos;est pas un gain.</div>
                </div>
              )}

              {/* Ce qu'il faut présenter */}
              {d.etapes && d.etapes.length > 0 && (
                <div style={card}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: OR, marginBottom: 12 }}>{'\u{1F4CB}'} Ce qu&apos;il faut présenter</div>
                  {d.etapes.slice().sort((a, b) => a.round_number - b.round_number).map(e => {
                    const s = etat(e.round_number);
                    return (
                      <div key={e.round_number} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--line)', ...(s === 'future' ? { opacity: .45 } : {}) }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: s === 'current' || s === 'next' ? OR : (s === 'future' ? 'var(--ink-dim)' : OR), minWidth: 62 }}>{d.modele === 'bloc' ? 'Vidéo' : 'Étape'} {e.round_number}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: s === 'current' ? 700 : 400 }}>{e.libelle || 'Libre'}{e.track_titre ? <span style={{ color: 'var(--ink-soft)' }}> — {e.track_titre}{e.track_artiste ? ' · ' + e.track_artiste : ''}</span> : null}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Candidats — toujours visible : photos + places a prendre */}
            <div style={{ ...card, marginTop: 16 }}>
              {(() => {
                const cands = d.candidats || [];
                const maxp = d.max_participants || 0;
                const acc = d.acceptes ?? cands.length;
                const displayMax = Math.min(maxp, 16);
                const empty = Math.max(0, displayMax - cands.length);
                const restantes = Math.max(0, maxp - acc);
                return (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: OR, marginBottom: 12 }}>{'\u{1F525}'} Les candidats de ce challenge ({cands.length}/{maxp})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {cands.slice(0, 16).map((c, i) => {
                        const initials = (c.name || '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '\u2605';
                        return (
                          <div key={c.user_id || i} title={c.name || 'Candidat'} style={{ position: 'relative', width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,170,0,.5)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: GRADS[i % GRADS.length], color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13 }}>
                            <span>{initials}</span>
                            {c.user_id && <img src={`${API}/users/${c.user_id}/avatar-file`} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                          </div>
                        );
                      })}
                      {Array.from({ length: empty }).map((_, i) => (
                        <div key={'slot' + i} style={{ width: 40, height: 40, borderRadius: '50%', border: '2px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-dim)', fontSize: 18, background: 'rgba(255,255,255,.02)' }}>+</div>
                      ))}
                      {maxp > 16 && <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,170,0,.16)', color: OR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 12 }}>+{maxp - 16}</div>}
                    </div>
                    {restantes > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10 }}><b style={{ color: 'var(--ink)' }}>{restantes} place{restantes > 1 ? 's' : ''} à prendre</b> — {cands.length === 0 ? 'sois le premier à relever ce défi et à faire vibrer toute une communauté !' : 'rejoins l’arène avant qu’elle ne soit complète !'}</div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Rappel argent honnête */}
            <div style={{ ...card, background: 'rgba(255,170,0,.06)', border: '1px solid rgba(255,170,0,.25)', marginTop: 16 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{'\u{1F4B0}'} <b>Aucun montant garanti</b> — tout dépend du soutien du public. Les votes forment une cagnotte partagée entre les gagnants ; chaque éliminé reçoit une prime de participation.</div>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 16 }}>
              {started && vid ? (
                <span role="button" tabIndex={0} onClick={() => router.push(`/watch/${vid}`)}
                  style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, padding: '14px', borderRadius: 14, cursor: 'pointer' }}>
                  {'▶️'} LIRE CE CHALLENGE
                </span>
              ) : (
                <Link href={`/challenges/appels/${d.id}`}
                  style={{ display: 'block', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--or)', color: 'var(--or)', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, padding: '14px', borderRadius: 14, textDecoration: 'none' }}>
                  {'\u{1F3A7}'} Rejoindre cet appel
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
