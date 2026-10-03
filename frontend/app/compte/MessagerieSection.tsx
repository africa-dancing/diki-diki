/* DKDK_MESSAGERIE — Section Messagerie integree a l'espace Compte (design commun). */
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }
function myId(): string | null {
  try { const t = getToken() || ''; return (JSON.parse(atob(t.split('.')[1] || '')) || {}).userId || null; } catch { return null; }
}
async function authFetch(path: string, opts: any = {}) {
  return fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken(), ...(opts.headers || {}) } });
}
function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), j = Math.floor(diff / 86400000);
  if (m < 1) return "à l'instant"; if (m < 60) return `il y a ${m} min`; if (h < 24) return `il y a ${h}h`;
  if (j < 7) return `il y a ${j}j`; return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface Convo { user_id: string; name: string; username?: string | null; last_body: string; last_at: string; unread: number; }
interface Msg { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null; }

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, marginBottom: 12 };

export default function MessagerieSection() {
  const me = myId();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [other, setOther] = useState<{ id: string; name: string; username?: string | null } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [canMsg, setCanMsg] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [blocks, setBlocks] = useState<{ user_id: string; name: string }[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; username: string | null; candidate: boolean }[]>([]);
  const [myHandle, setMyHandle] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState('');
  const [handleMsg, setHandleMsg] = useState('');
  const [savingHandle, setSavingHandle] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadInbox = useCallback(async () => {
    try { const r = await authFetch('/messages'); if (r.ok) { const d = await r.json(); setConvos(d.data || []); } } catch {}
  }, []);
  const loadThread = useCallback(async (uid: string) => {
    try {
      const r = await authFetch('/messages/thread/' + uid);
      if (r.ok) { const d = await r.json(); setOther(d.other || { id: uid, name: 'Utilisateur' }); setMsgs(d.data || []); setCanMsg(!!d.can_message); setBlocked(!!d.blocked); }
    } catch {}
  }, []);
  const loadSettings = useCallback(async () => {
    try { const r = await authFetch('/messages/settings'); if (r.ok) { const d = await r.json(); setEnabled(d.messages_enabled !== false); } } catch {}
    try { const r = await authFetch('/messages/blocks'); if (r.ok) { const d = await r.json(); setBlocks(d.data || []); } } catch {}
    try { const r = await authFetch('/users/me/username'); if (r.ok) { const d = await r.json(); setMyHandle(d.username || null); setHandleInput(d.username || ''); } } catch {}
  }, []);

  useEffect(() => {
    loadInbox(); loadSettings();
    try { const to = new URLSearchParams(window.location.search).get('to'); if (to) setActive(to); } catch {}
  }, [loadInbox, loadSettings]);
  useEffect(() => { if (active) loadThread(active); }, [active, loadThread]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  useEffect(() => {
    const term = q.trim(); if (term.length < 2) { setResults([]); return; }
    let alive = true;
    const t = setTimeout(async () => { try { const r = await authFetch('/users/search?q=' + encodeURIComponent(term)); if (r.ok && alive) { const d = await r.json(); setResults(d.data || []); } } catch {} }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  const saveHandle = async () => {
    const u = handleInput.trim().toLowerCase().replace(/^@/, '');
    setSavingHandle(true); setHandleMsg('');
    try { const r = await authFetch('/users/username', { method: 'PUT', body: JSON.stringify({ username: u }) }); const d = await r.json().catch(() => ({})); if (!r.ok) setHandleMsg(d.message || 'Impossible.'); else { setMyHandle(d.username); setHandleMsg('✓ Pseudo enregistré : @' + d.username); } } catch { setHandleMsg('Erreur réseau.'); }
    setSavingHandle(false);
  };
  const openUser = (uid: string) => { setQ(''); setResults([]); setActive(uid); };

  const back = () => { setActive(null); setOther(null); setMsgs([]); setInfo(''); loadInbox(); };
  const send = async () => {
    const body = draft.trim(); if (!body || !active) return;
    setSending(true); setInfo('');
    try {
      const r = await authFetch('/messages', { method: 'POST', body: JSON.stringify({ recipient_id: active, body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setInfo(d.message || 'Envoi impossible.'); setSending(false); return; }
      setDraft(''); await loadThread(active);
    } catch { setInfo('Erreur réseau.'); }
    setSending(false);
  };
  const report = async (id: string) => {
    const reason = window.prompt('Signaler ce message — motif (facultatif) :') ?? '';
    try { const r = await authFetch('/messages/' + id + '/report', { method: 'POST', body: JSON.stringify({ reason }) }); if (r.ok) setInfo('Message signalé à la modération. Merci.'); } catch {}
  };
  const toggleBlock = async () => {
    if (!active) return;
    try {
      if (blocked) await authFetch('/messages/block/' + active, { method: 'DELETE' });
      else await authFetch('/messages/block', { method: 'POST', body: JSON.stringify({ user_id: active }) });
      await loadThread(active); await loadSettings();
    } catch {}
  };
  const saveEnabled = async (val: boolean) => { setEnabled(val); try { await authFetch('/messages/settings', { method: 'PUT', body: JSON.stringify({ enabled: val }) }); } catch {} };
  const unblock = async (uid: string) => { try { await authFetch('/messages/block/' + uid, { method: 'DELETE' }); await loadSettings(); } catch {} };

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', borderRadius: 18, padding: '18px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#fff' }}>💬 Messagerie</div>
        <button onClick={() => setShowSettings(s => !s)} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: 50, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>⚙️ Réglages</button>
      </div>

      {showSettings && (
        <div style={{ ...card, padding: 14 }}>
          <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Ton pseudo (@)</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8 }}>{myHandle ? <>Actuel : <b style={{ color: 'var(--or)' }}>@{myHandle}</b></> : "Choisis un pseudo unique pour qu'on puisse te trouver et t'écrire par ton nom."}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--ink-soft)' }}>@</span>
              <input value={handleInput} onChange={e => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} maxLength={20} placeholder="ton_pseudo" style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '8px 12px', color: 'var(--ink)', fontSize: 14 }} />
              <button onClick={saveHandle} disabled={savingHandle || handleInput.trim().length < 3} style={{ background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#150c00', fontWeight: 800, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', opacity: savingHandle || handleInput.trim().length < 3 ? 0.6 : 1 }}>Enregistrer</button>
            </div>
            {handleMsg && <div style={{ fontSize: 12, color: 'var(--or)', marginTop: 6 }}>{handleMsg}</div>}
            <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 4 }}>3 à 20 caractères : lettres minuscules, chiffres, _</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>
            <input type="checkbox" checked={enabled} onChange={e => saveEnabled(e.target.checked)} />
            Autoriser les autres à m'envoyer des messages
          </label>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>Désactivé, personne ne peut plus t'écrire (tu peux toujours répondre aux fils existants).</div>
          {blocks.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--or)', marginBottom: 6 }}>Bloqués</div>
              {blocks.map(b => (
                <div key={b.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--ink)', padding: '5px 0' }}>
                  <span>{b.name}</span>
                  <button onClick={() => unblock(b.user_id)} style={{ background: 'transparent', border: '1px solid var(--line-strong)', color: 'var(--ink)', borderRadius: 50, padding: '3px 12px', fontSize: 12, cursor: 'pointer' }}>Débloquer</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {info && <div style={{ ...card, padding: '10px 12px', borderColor: 'rgba(255,170,0,0.4)', fontSize: 13, color: 'var(--or)' }}>{info}</div>}

      {!active && (
        <>
        <div style={{ ...card, padding: 10 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="🔍 Rechercher un utilisateur (@pseudo ou nom)…" style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 50, padding: '10px 14px', color: 'var(--ink)', fontSize: 14 }} />
          {results.map(u => (
            <button key={u.id} onClick={() => openUser(u.id)} style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, alignItems: 'center', padding: '8px 6px', background: 'transparent', border: 'none', borderTop: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink)', marginTop: 4 }}>
              <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#150c00', fontSize: 13 }}>{(u.name || '?').charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{u.name}{u.username ? <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}> · @{u.username}</span> : null}</div>
                <div style={{ fontSize: 11, color: u.candidate ? '#4ade80' : 'var(--ink-soft)' }}>{u.candidate ? 'Candidat — tu peux lui écrire' : "N'est pas candidat"}</div>
              </div>
            </button>
          ))}
          {q.trim().length >= 2 && results.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8, textAlign: 'center' }}>Aucun utilisateur trouvé.</div>}
        </div>
        <div style={{ ...card, overflow: 'hidden' }}>
          {convos.length === 0 && (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14 }}>Aucun message pour l'instant.<br />Ouvre une vidéo et clique sur « ✉️ Message » sous le candidat pour lui écrire.</div>
          )}
          {convos.map(c => (
            <button key={c.user_id} onClick={() => setActive(c.user_id)} style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 12, alignItems: 'center', padding: '12px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer', color: 'var(--ink)' }}>
              <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#150c00' }}>{(c.name || '?').charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}{c.username ? <span style={{ color: 'var(--ink-soft)', fontWeight: 400, fontSize: 12 }}> @{c.username}</span> : null}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{timeAgo(c.last_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: c.unread > 0 ? 'var(--ink)' : 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_body}</div>
              </div>
              {c.unread > 0 && <span style={{ flexShrink: 0, background: '#FF1414', color: '#fff', fontSize: 11, fontWeight: 800, minWidth: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{c.unread}</span>}
            </button>
          ))}
        </div>
        </>
      )}

      {active && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '64vh', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
            <button onClick={back} style={{ background: 'transparent', border: 'none', color: 'var(--or)', fontSize: 20, cursor: 'pointer' }}>←</button>
            <div style={{ flex: 1, fontWeight: 700, color: 'var(--ink)' }}>{other?.name || 'Conversation'}{other?.username ? <span style={{ color: 'var(--ink-soft)', fontWeight: 400, fontSize: 12 }}> @{other.username}</span> : null}</div>
            <button onClick={toggleBlock} style={{ background: 'transparent', border: '1px solid var(--line-strong)', color: blocked ? '#4ade80' : '#f87171', borderRadius: 50, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>{blocked ? 'Débloquer' : 'Bloquer'}</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {msgs.length === 0 && <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13, margin: 'auto' }}>Écris le premier message 👇</div>}
            {msgs.map(m => {
              const mine = m.sender_id === me;
              return (
                <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div onClick={() => !mine && report(m.id)} title={!mine ? 'Cliquer pour signaler' : ''} style={{ background: mine ? 'linear-gradient(135deg,#FF6B00,#FFD700)' : 'var(--surface)', border: mine ? 'none' : '1px solid var(--line)', color: mine ? '#150c00' : 'var(--ink)', padding: '8px 12px', borderRadius: 12, fontSize: 14, cursor: mine ? 'default' : 'pointer', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{timeAgo(m.created_at)}</div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {canMsg ? (
            <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--line)' }}>
              <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} maxLength={1000} placeholder="Écris ton message…" style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--line-strong)', borderRadius: 50, padding: '10px 14px', color: 'var(--ink)', fontSize: 14 }} />
              <button onClick={send} disabled={sending || !draft.trim()} style={{ background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#150c00', fontWeight: 800, border: 'none', borderRadius: 50, padding: '0 18px', cursor: sending ? 'default' : 'pointer', opacity: sending || !draft.trim() ? 0.6 : 1 }}>Envoyer</button>
            </div>
          ) : (
            <div style={{ padding: 12, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center' }}>{blocked ? 'Échange bloqué.' : "Tu ne peux pas écrire à cette personne (elle n'est pas candidate ou a désactivé les messages)."}</div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--ink-dim)', marginTop: 4, textAlign: 'center' }}>Reste courtois. Aucun vote ni paiement ne se traite ici — propositions de votes hors plateforme interdites.</div>
    </div>
  );
}
