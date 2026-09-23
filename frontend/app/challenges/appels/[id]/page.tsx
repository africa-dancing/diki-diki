'use client';
// frontend/app/challenges/appels/[id]/page.tsx
// DÉTAIL D'UN APPEL — le candidat voit le morceau imposé de chaque étape et REJOINT l'appel. /*DKDK_MODERATEUR_APPEL*/
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = 'var(--or)';

function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

/*DKDK_REF_URL — transforme un lien YouTube en URL d'integration (lecteur)*/
function ytEmbed(url?: string | null): string | null {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
const fmtF = (n: number) => (n || 0).toLocaleString('fr-FR') + ' F';

interface Etape { round_number: number; libelle: string; track_titre: string | null; track_artiste: string | null; ref_url?: string | null; }
interface Appel {
  id: string; title: string; discipline: string; modele: string; status: string;
  max_participants: number; appel_deadline: string | null; niveau?: number;
  createur_nom: string | null; officiel: boolean; objectif_info?: any;
  acceptes: number; en_revision: number; en_attente: number;
  etapes: Etape[];
}
interface Video { id: string; title: string; status: string; }

export default function AppelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');

  const [appel, setAppel]   = useState<Appel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoId, setVideoId] = useState('');
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState('');
  const [ok, setOk]         = useState('');
  const [connecte, setConnecte] = useState(false);

  const charger = () => {
    setLoading(true); setError('');
    fetch(`${API}/brackets/${id}/appel`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (j?.success) setAppel(j.data); else setError(j?.error || 'Appel introuvable.'); })
      .catch(() => setError('Erreur de chargement.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (id) charger(); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    const t = getToken();
    setConnecte(!!t);
    if (!t) return;
    fetch(`${API}/videos/my`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        const approved: Video[] = (d?.videos ?? []).filter((v: Video) => v.status === 'approved');
        setVideos(approved);
        if (approved[0]) setVideoId(approved[0].id);
      })
      .catch(() => {});
  }, []);

  const rejoindre = async (paiement_confirme = false) => {
    setMsg(''); setOk('');
    const t = getToken();
    if (!t) { router.push('/auth/login'); return; }
    if (!videoId) { setMsg('Choisis une vidéo approuvée (ou fais-en approuver une d’abord).'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/brackets/${id}/accepter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ video_id: videoId, paiement_confirme }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        const e = String(j?.error || '');
        if (e.startsWith('PAIEMENT_REQUIS:')) {
          const montant = e.split(':')[1];
          if (confirm(`Cette vidéo est déjà engagée dans un autre challenge. L’inscrire ici coûte ${montant} F. Continuer ?`)) {
            setBusy(false); return rejoindre(true);
          }
          setMsg('Inscription annulée.');
        } else { setMsg(e || 'Impossible de rejoindre.'); }
      } else {
        setOk('✅ Tu as rejoint l’appel ! Quand toutes les places seront prises, le challenge démarre.');
        charger();
      }
    } catch { setMsg('Erreur réseau.'); }
    setBusy(false);
  };

  const fmtDate = (s?: string | null) => {
    if (!s) return null;
    try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }); }
    catch { return s; }
  };

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 20, marginBottom: 16 };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'DM Sans, sans-serif', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <Link href="/challenges/appels" style={{ color: 'var(--ink-soft)', fontSize: 13, textDecoration: 'none' }}>&larr; Le Mur des appels</Link>

        {loading ? (
          <p style={{ color: 'var(--ink-soft)', marginTop: 24 }}>Chargement…</p>
        ) : error ? (
          <p style={{ color: 'var(--red, #ff6b6b)', marginTop: 24 }}>{error}</p>
        ) : appel ? (
          <>
            <div style={{ ...card, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: OR }}>{appel.discipline}</span>
                {appel.officiel && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#150c00', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', borderRadius: 999, padding: '2px 10px' }}>Appel officiel Diki-Diki</span>
                )}
              </div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, margin: '0 0 10px' }}>{appel.title}</h1>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-soft)' }}>
                <span><b style={{ color: 'var(--ink)' }}>{Math.max(0, appel.max_participants - appel.acceptes)}</b> place(s) restante(s) sur {appel.max_participants}</span>
                <span>{appel.modele === 'bloc' ? 'Bloc groupé' : 'Parcours d’étapes'}</span>
                {appel.appel_deadline && <span>Clôture : {fmtDate(appel.appel_deadline)}</span>}
              </div>
            </div>

            {/* Sujets imposés par étape */}
            {appel.etapes && appel.etapes.length > 0 && (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: OR, marginBottom: 12 }}>Ce qu’il faut présenter</div>
                {appel.etapes.sort((a, b) => a.round_number - b.round_number).map(e => (
                  <div key={e.round_number} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: OR, minWidth: 58 }}>{appel.modele === 'parcours' ? 'Étape' : 'Vidéo'} {e.round_number}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: 'var(--ink)' }}>
                        {e.libelle || 'Libre'}
                        {e.track_titre ? <span style={{ color: 'var(--ink-soft)' }}> — {e.track_titre}{e.track_artiste ? ' · ' + e.track_artiste : ''}</span> : null}
                      </div>
                      {ytEmbed(e.ref_url) ? (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 11, color: OR, fontWeight: 700, marginBottom: 4 }}>▶ Version de référence — écoute-la pour bien t&apos;y conformer</div>
                          <div style={{ position: 'relative', width: '100%', maxWidth: 420, aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
                            <iframe src={ytEmbed(e.ref_url) as string} title={`Référence ${e.round_number}`} loading="lazy"
                              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Objectif(s) a collecter — lu dans la taxonomie /*DKDK_TAXO_OBJECTIF*/}
            {appel.objectif_info && (
              <div style={card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: OR, marginBottom: 10 }}>Objectif à collecter</div>
                {appel.objectif_info.modele === 'parcours' ? (
                  <div>
                    {(appel.objectif_info.etapes || []).map((e: any) => (
                      <div key={e.etape} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ color: 'var(--ink-soft)' }}>Étape {e.etape}{e.classement ? ' · classement' : ''}</span>
                        <b style={{ color: e.objectif ? 'var(--ink)' : 'var(--ink-dim)' }}>{e.objectif ? fmtF(e.objectif) : '—'}</b>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, paddingTop: 8 }}>
                      <span style={{ color: OR, fontWeight: 700 }}>Enveloppe totale</span>
                      <b style={{ color: OR }}>{fmtF(appel.objectif_info.enveloppe)}</b>
                    </div>
                  </div>
                ) : appel.objectif_info.objectif ? (
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--ink)' }}>{fmtF(appel.objectif_info.objectif)}</div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--ink-dim)' }}>À définir</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 10, lineHeight: 1.5 }}>
                  Seuil à réunir en votes pour fermer {appel.objectif_info.modele === 'parcours' ? 'chaque étape' : 'le challenge'} — ce n’est pas un gain.
                </div>
              </div>
            )}

            {/* Rappel argent honnête */}
            <div style={{ ...card, background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.25)' }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                💰 <b>Aucun montant garanti</b> — tout dépend du soutien du public. Les votes forment une cagnotte partagée entre les gagnants ; chaque éliminé reçoit une prime de participation.
              </div>
            </div>

            {/* Rejoindre */}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 700, color: OR, marginBottom: 12 }}>Rejoindre cet appel</div>
              {!connecte ? (
                <Link href="/auth/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#150c00', fontWeight: 800, fontFamily: 'Syne, sans-serif', borderRadius: 12, padding: '12px 18px', textDecoration: 'none' }}>Se connecter pour rejoindre</Link>
              ) : videos.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  Tu n’as pas encore de vidéo approuvée. <Link href="/submit" style={{ color: OR }}>Dépose une vidéo</Link>, fais-la valider, puis reviens rejoindre l’appel.
                </div>
              ) : (
                <>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', marginBottom: 6 }}>Ta vidéo (approuvée)</label>
                  <select value={videoId} onChange={e => setVideoId(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 10, padding: '10px 12px', color: 'var(--ink)', fontSize: 14, marginBottom: 12 }}>
                    {videos.map(v => <option key={v.id} value={v.id} style={{ background: 'var(--bg-soft)' }}>{v.title || v.id.slice(0, 8)}</option>)}
                  </select>
                  <button onClick={() => rejoindre(false)} disabled={busy}
                    style={{ width: '100%', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#150c00', fontWeight: 800, fontFamily: 'Syne, sans-serif', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 }}>
                    {busy ? 'En cours…' : 'Rejoindre l’appel'}
                  </button>
                  {appel.modele === 'bloc' && (
                    <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 8 }}>
                      Astuce : pour un bloc à plusieurs vidéos, tu ajouteras les vidéos suivantes depuis ton compte après avoir rejoint.
                    </div>
                  )}
                </>
              )}
              {msg && <div style={{ color: 'var(--red, #ff6b6b)', fontSize: 13, marginTop: 12 }}>{msg}</div>}
              {ok && <div style={{ color: 'var(--green, #4ade80)', fontSize: 13, marginTop: 12 }}>{ok}</div>}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
