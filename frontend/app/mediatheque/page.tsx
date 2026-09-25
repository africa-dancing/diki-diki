'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';
const CONTINENTS = ['Tous', 'Afrique', 'Europe', 'Amerique', 'Asie'];

interface Musique {
  id: string; artiste: string; titre: string; album?: string;
  duree_sec?: number; pays_origine?: string; continent?: string;
  danse?: string; style?: string; cover_url?: string; ref_url?: string;
}

/*DKDK_REF_URL — lien YouTube -> URL d'integration (lecteur sur place)*/
function ytEmbed(url?: string | null): string | null {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function fmtDuree(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60); const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function MediathequePage() {
  const [musiques, setMusiques] = useState<Musique[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('Tous');
  const [openId, setOpenId] = useState<string | null>(null); /*DKDK_REF_URL — morceau dont le lecteur est ouvert*/
  const [hover, setHover] = useState<{ id: string; titre: string; danse?: string; top: number } | null>(null); /*DKDK_TRACK_BUBBLE — bulle flottante (survol PC + toucher mobile)*/

  useEffect(() => {
    setLoading(true);
    const url = filtre === 'Tous' ? `${API}/musiques` : `${API}/musiques?continent=${encodeURIComponent(filtre)}`;
    fetch(url)
      .then(r => r.json())
      .then((d: any) => { setMusiques(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filtre]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'DM Sans,sans-serif', paddingBottom: 80 }}>
      <Navbar />
      <div style={{ padding: '16px 24px 32px', minHeight: 64, background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)' }} />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px' }}>

        <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(0.75rem,3vw,1.9rem)', lineHeight: 1.1, whiteSpace: 'nowrap', marginBottom: 6, background: 'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Médiathèque <span style={{ background: 'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diki-Diki</span></h1>
          <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.6 }}>Découvre le répertoire musical du continent, et propose les tiens pour les challenges futurs.</div>
        </div>

        {/* Bulle guide — appel a l'action */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--surface)', border: '1px solid rgba(255,170,0,0.35)', borderRadius: 14, padding: '13px 15px', marginBottom: 14, boxShadow: '0 0 14px -4px rgba(255,170,0,0.35)' }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>🧭</span>
          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.55 }}>
            <b style={{ color: 'var(--or)', fontFamily: 'Syne,sans-serif' }}>Tu comptes participer à des challenges ?</b><br/>
            Complète cette liste avec <b>tes morceaux préférés</b> : ils pourront servir de références pour les prochains défis de l&apos;Arène.
          </div>
        </div>

        <Link href='/mediatheque/ajouter' style={{ display: 'block', textAlign: 'center', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', fontWeight: 800, fontFamily: 'Syne,sans-serif', fontSize: 15, padding: '14px', borderRadius: 14, textDecoration: 'none', marginBottom: 20 }}>
          + Ajouter un morceau
        </Link>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {CONTINENTS.map(c => (
            <button key={c} onClick={() => setFiltre(c)} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: filtre === c ? `1px solid ${OR}` : '1px solid var(--line)', background: filtre === c ? OR : 'var(--surface)', color: filtre === c ? '#000' : 'var(--ink-soft)' }}>{c}</button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-dim)' }}>Chargement...</div>}

        {!loading && musiques.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{'\u{1F3B5}'}</div>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Syne,sans-serif', marginBottom: 6 }}>Aucun morceau pour le moment</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Sois le premier a proposer un morceau !</div>
          </div>
        )}

        <div onMouseLeave={() => setHover(null)}>
        {!loading && musiques.map(m => (
          <div key={m.id}
            onMouseEnter={(e) => setHover({ id: m.id, titre: m.titre, danse: m.danse, top: Math.max(72, e.currentTarget.getBoundingClientRect().top) })}
            onClick={(e) => { const top = Math.max(72, e.currentTarget.getBoundingClientRect().top); setHover(h => (h && h.id === m.id) ? null : { id: m.id, titre: m.titre, danse: m.danse, top }); }}
            style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface2)', border: '1px solid var(--line-strong)', borderRadius: 14, padding: '14px', marginBottom: 12, cursor: 'pointer' }}>
            <div style={{ width: 54, height: 54, borderRadius: 10, background: m.cover_url ? `url(${m.cover_url}) center/cover` : 'linear-gradient(135deg,#FF6B00,#FFD700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'rgb(126,3,128)', flexShrink: 0 }}>{!m.cover_url && '\u266A'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', fontFamily: 'Syne,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.titre}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{m.artiste}{m.album ? ` - ${m.album}` : ''}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {m.danse && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(225,6,0,0.14)', border: '1px solid rgba(225,6,0,0.35)', color: '#e10600', fontWeight: 800 }}>{m.danse}</span>}
                {m.pays_origine && <img src={`https://flagcdn.com/${m.pays_origine.toLowerCase()}.svg`} alt={m.pays_origine} title={m.pays_origine} style={{ width: 18, height: 'auto', borderRadius: 3, objectFit: 'cover', verticalAlign: 'middle' }} />}
              </div>
              {ytEmbed(m.ref_url) ? (
                <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={(e) => { e.stopPropagation(); setOpenId(openId === m.id ? null : m.id); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--or)', fontWeight: 700 }}>
                    {openId === m.id ? '▾ Fermer le lecteur' : '▶ Écouter'}
                  </button>
                  {openId === m.id ? (
                    <div style={{ position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', marginTop: 6 }}>
                      <iframe src={ytEmbed(m.ref_url) as string} title={m.titre} loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {m.duree_sec ? <div style={{ fontSize: 12, color: 'var(--ink-soft)', flexShrink: 0 }}>{fmtDuree(m.duree_sec)}</div> : null}
            {/*DKDK_PARTICIPER*/}
            <Link href={`/challenges/creer?track=${m.id}`} onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', whiteSpace: 'nowrap' }}>Participer</Link>
          </div>
        ))}
        </div>

      </div>

        {/* Bulle flottante au survol d'un morceau (desktop) */}
        {hover && (
          <div className="dkdk-track-bubble" style={{ position: 'fixed', top: hover.top, right: 24, width: 264, zIndex: 60, transition: 'top .18s ease', background: 'var(--surface)', border: '1px solid rgba(255,170,0,0.45)', borderRadius: 14, padding: '13px 15px', boxShadow: '0 10px 30px -8px rgba(0,0,0,0.55), 0 0 16px -4px rgba(255,170,0,0.4)', pointerEvents: 'auto' }}>
            <span className="dkdk-bx" onClick={() => setHover(null)} style={{ position: 'absolute', top: 8, right: 10, fontSize: 16, lineHeight: 1, color: 'var(--ink-dim)', cursor: 'pointer', display: 'none' }}>✕</span>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--or)', fontFamily: 'Syne,sans-serif', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 22 }}>🎧 {hover.titre}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.55 }}>
              {hover.danse ? <>Morceau idéal pour un challenge de <b>{hover.danse}</b>.</> : <>Un morceau à reprendre dans tes challenges.</>}<br/>
              Ça t&apos;inspire ? Clique <b>« Participer »</b> et lance ton défi !
            </div>
          </div>
        )}
        <style>{`@media (max-width: 640px){ .dkdk-track-bubble{ left:12px !important; right:12px !important; bottom:16px !important; top:auto !important; width:auto !important; } .dkdk-track-bubble .dkdk-bx{ display:block !important; } }`}</style>
    </div>
  );
}
