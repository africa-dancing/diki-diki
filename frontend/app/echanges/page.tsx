'use client';
/* DKDK_ECHANGES — Espace d'échanges entre inscrits : Mur d'entraide + Annuaire.
   Entête standard (Navbar + halo magenta + panneau, comme la Médiathèque).
   Réglages de visibilité / nom affiché : déplacés dans Compte → Confidentialité. */
import { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';
const DISCIPLINES = ['Danse', 'Chant', 'Instrument', 'Acapella', 'Humour', 'Poésie', 'Conte', 'Sport'];

interface Post { id: string; auteur_id: string; auteur_nom: string; auteur_avatar: string | null; discipline: string | null; type: string; message: string; created_at: string; }
interface Inscrit { id: string; pseudo: string; avatar: string | null; candidat: boolean; }

function getToken(): string | null { try { return localStorage.getItem('dkdk_token'); } catch { return null; } }
function myId(): string | null { try { const t = localStorage.getItem('dkdk_token') || ''; return (JSON.parse(atob(t.split('.')[1] || '')) || {}).userId || null; } catch { return null; } }
function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}
function initiale(n: string) { return (n || '?').trim().charAt(0).toUpperCase(); }

export default function EchangesPage() {
  const [tab, setTab] = useState<'mur' | 'annuaire'>('mur');
  const [tok, setTok] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const [posts, setPosts] = useState<Post[]>([]);
  const [fDisc, setFDisc] = useState(''); const [fType, setFType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [nDisc, setNDisc] = useState(''); const [nType, setNType] = useState<'solo' | 'groupe'>('solo'); const [nMsg, setNMsg] = useState('');

  const [ann, setAnn] = useState<Inscrit[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => { setTok(getToken()); setMe(myId()); }, []);
  const H = useCallback(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() || ''}` }), []);
  function flash(m: string, ms = 3000) { setToast(m); setTimeout(() => setToast(''), ms); }

  const loadMur = useCallback(async () => {
    const p = new URLSearchParams(); if (fDisc) p.set('discipline', fDisc); if (fType) p.set('type', fType);
    try { const r = await fetch(`${API}/echanges?${p.toString()}`, { headers: H(), cache: 'no-store' }); const j = await r.json(); setPosts(j.data || []); } catch { setPosts([]); }
  }, [fDisc, fType, H]);

  const loadAnn = useCallback(async () => {
    const p = new URLSearchParams(); if (q) p.set('q', q);
    try { const r = await fetch(`${API}/echanges/annuaire?${p.toString()}`, { headers: H(), cache: 'no-store' }); const j = await r.json(); setAnn(j.data || []); } catch { setAnn([]); }
  }, [q, H]);

  useEffect(() => { if (!tok) { setLoading(false); return; } setLoading(true); (tab === 'mur' ? loadMur() : loadAnn()).finally(() => setLoading(false)); /* eslint-disable-next-line */ }, [tab, tok]);
  useEffect(() => { if (tok && tab === 'mur') loadMur(); /* eslint-disable-next-line */ }, [fDisc, fType]);

  async function publier() {
    if (!nMsg.trim()) return;
    try { await fetch(`${API}/echanges`, { method: 'POST', headers: H(), body: JSON.stringify({ discipline: nDisc || null, type: nType, message: nMsg }) }); } catch {}
    setNMsg(''); setNDisc(''); setNType('solo'); setShowForm(false); loadMur();
  }
  async function fermer(id: string) { try { await fetch(`${API}/echanges/${id}/close`, { method: 'POST', headers: H() }); } catch {} loadMur(); }
  async function signaler(id: string) { try { await fetch(`${API}/echanges/${id}/report`, { method: 'POST', headers: H(), body: JSON.stringify({ reason: 'Signalé depuis le mur' }) }); } catch {} flash("Merci, l'annonce a été signalée à la modération."); }

  const AV = (name: string, url: string | null, size: number) => url
    ? <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flex: `0 0 ${size}px` }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', flex: `0 0 ${size}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: size * 0.42, color: '#1a0b00', background: 'linear-gradient(135deg,#FF6B00,#FFD700)' }}>{initiale(name)}</div>;

  const chip = (bg: string, col: string, bd: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: bg, color: col, border: `1px solid ${bd}` });
  const selStyle: React.CSSProperties = { background: 'var(--surface2)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 10, padding: '9px 12px', fontSize: 13, fontWeight: 600 };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'DM Sans,sans-serif', paddingBottom: 80 }}>
      <Navbar />
      {/* HERO — halo magenta collé à la barre (aligné sur Médiathèque / Mur des appels) */}
      <div style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', paddingTop: 8 }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '8px 16px 20px' }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '20px', textAlign: 'center', boxShadow: '0 8px 40px rgba(225,29,143,0.35)' }}>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(0.75rem,3vw,1.9rem)', lineHeight: 1.1, whiteSpace: 'nowrap', marginBottom: 6, background: 'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Espace d&apos;échanges <span style={{ background: 'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diki-Diki</span></h1>
            <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.6 }}>Trouve des partenaires, forme ton groupe, et fais démarrer ton challenge.</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '4px 16px 24px' }}>
        {!tok ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 16 }}>
            <div style={{ fontSize: 15, color: 'var(--ink-soft)', marginBottom: 16 }}>Connecte-toi pour accéder à l’Espace d’échanges.</div>
            <a href="/auth/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#1a0b00', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15, padding: '12px 22px', borderRadius: 12, textDecoration: 'none' }}>Se connecter</a>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
              {(['mur', 'annuaire'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: 13, borderRadius: 13, fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, cursor: 'pointer', border: tab === t ? '1px solid transparent' : '1px solid var(--line)', background: tab === t ? 'linear-gradient(135deg,#FF6B00,#FFD700)' : 'var(--surface)', color: tab === t ? '#1a0b00' : 'var(--ink-soft)' }}>
                  {t === 'mur' ? '🤝 Mur d’entraide' : '📇 Annuaire des inscrits'}
                </button>
              ))}
            </div>

            {toast && <div style={{ background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.4)', color: OR, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>{toast}</div>}

            {tab === 'mur' ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
                  <select value={fDisc} onChange={e => setFDisc(e.target.value)} style={selStyle}><option value="">Toutes disciplines</option>{DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}</select>
                  <select value={fType} onChange={e => setFType(e.target.value)} style={selStyle}><option value="">Solo &amp; Groupe</option><option value="solo">Solo</option><option value="groupe">Groupe</option></select>
                  <button onClick={() => setShowForm(s => !s)} style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#1a0b00', border: 'none', borderRadius: 11, padding: '11px 18px', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>➕ Publier une annonce</button>
                </div>

                {showForm && (
                  <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,170,0,0.35)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                      <select value={nDisc} onChange={e => setNDisc(e.target.value)} style={selStyle}><option value="">Discipline…</option>{DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}</select>
                      <select value={nType} onChange={e => setNType(e.target.value as 'solo' | 'groupe')} style={selStyle}><option value="solo">Solo</option><option value="groupe">Groupe</option></select>
                    </div>
                    <textarea value={nMsg} onChange={e => setNMsg(e.target.value.slice(0, 300))} placeholder="Ex. : Je cherche 3 danseurs pour lancer un challenge Ndombolo cette semaine…" rows={3} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)', fontFamily: 'DM Sans,sans-serif', fontSize: 14, padding: '10px 12px', resize: 'vertical' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{nMsg.length}/300</span>
                      <button onClick={publier} disabled={!nMsg.trim()} style={{ marginLeft: 'auto', background: nMsg.trim() ? 'linear-gradient(135deg,#FF6B00,#FFD700)' : 'var(--surface2)', color: nMsg.trim() ? '#1a0b00' : 'var(--muted)', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 800, fontFamily: 'Syne,sans-serif', fontSize: 14, cursor: nMsg.trim() ? 'pointer' : 'default' }}>Publier</button>
                    </div>
                  </div>
                )}

                {loading ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Chargement…</div>
                  : posts.length === 0 ? <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 16, color: 'var(--ink-soft)' }}>Aucune annonce pour l’instant. Sois le premier à lancer un appel d’entraide ! 🔥</div>
                    : posts.map(p => (
                      <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '16px 18px', marginBottom: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        {AV(p.auteur_nom, p.auteur_avatar, 52)}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 15 }}>{p.auteur_nom}</span>
                            {p.discipline && <span style={chip('rgba(255,170,0,0.14)', '#FFD700', 'rgba(255,170,0,0.35)')}>{p.discipline}</span>}
                            <span style={chip(p.type === 'groupe' ? 'rgba(225,29,143,0.16)' : 'rgba(140,140,180,0.16)', p.type === 'groupe' ? '#ff8ad0' : '#c9c2e0', p.type === 'groupe' ? 'rgba(225,29,143,0.4)' : 'rgba(160,160,200,0.3)')}>{p.type === 'groupe' ? 'Groupe' : 'Solo'}</span>
                          </div>
                          <div style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{p.message}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 12, color: 'var(--muted)', flexWrap: 'wrap' }}>
                            <span>{timeAgo(p.created_at)}</span>
                            {p.auteur_id === me
                              ? <button onClick={() => fermer(p.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>Fermer mon annonce</button>
                              : <button onClick={() => signaler(p.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>🚩 Signaler</button>}
                            {p.auteur_id !== me && <a href={`/compte?tab=messagerie&to=${p.auteur_id}`} style={{ marginLeft: 'auto', background: 'rgba(255,170,0,0.12)', color: OR, border: '1px solid rgba(255,170,0,0.35)', borderRadius: 9, padding: '7px 14px', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>✉️ Répondre</a>}
                          </div>
                        </div>
                      </div>
                    ))}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                  <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadAnn(); }} placeholder="Rechercher un pseudo…" style={{ ...selStyle, flex: 1, minWidth: 150 }} />
                  <button onClick={loadAnn} style={{ ...selStyle, cursor: 'pointer' }}>🔍</button>
                </div>
                <div style={{ marginBottom: 16, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  🔒 Tu choisis d’apparaître ou non dans l’annuaire, et ton nom affiché, depuis <a href="/compte?tab=settings" style={{ color: OR, fontWeight: 700, textDecoration: 'none' }}>Compte → Confidentialité</a>.
                </div>

                {loading ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Chargement…</div>
                  : ann.length === 0 ? <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--surface)', border: '1px dashed var(--line)', borderRadius: 16, color: 'var(--ink-soft)' }}>Aucun inscrit à afficher pour l’instant.</div>
                    : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 14 }}>
                      {ann.map(u => (
                        <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: 18, textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>{AV(u.pseudo, u.avatar, 60)}</div>
                          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.pseudo}</div>
                          {u.candidat && <div style={{ marginBottom: 12 }}><span style={chip('rgba(255,170,0,0.14)', '#FFD700', 'rgba(255,170,0,0.35)')}>🎤 Candidat</span></div>}
                          <a href={`/compte?tab=messagerie&to=${u.id}`} style={{ display: 'block', background: 'var(--surface2)', border: '1px solid rgba(255,170,0,0.4)', color: OR, borderRadius: 11, padding: 10, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>✉️ Message</a>
                        </div>
                      ))}
                    </div>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
