/* DKDK_MESSAGERIE — Boite de messagerie interne (V1). */
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';

function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }
function myId(): string | null {
  try { const t = getToken() || ''; return (JSON.parse(atob(t.split('.')[1] || '')) || {}).userId || null; } catch { return null; }
}
async function authFetch(path: string, opts: any = {}) {
  const token = getToken();
  return fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
  });
}
function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), j = Math.floor(diff / 86400000);
  if (m < 1) return "à l'instant"; if (m < 60) return `il y a ${m} min`; if (h < 24) return `il y a ${h}h`;
  if (j < 7) return `il y a ${j}j`; return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface Convo { user_id: string; name: string; last_body: string; last_at: string; unread: number; }
interface Msg { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null; }

export default function MessagesPage() {
  const router = useRouter();
  const me = myId();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [active, setActive] = useState<string | null>(null);   // other user id
  const [other, setOther] = useState<{ id: string; name: string } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [canMsg, setCanMsg] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [blocks, setBlocks] = useState<{ user_id: string; name: string }[]>([]);
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
  }, []);

  useEffect(() => {
    if (!getToken()) { router.push('/auth/login?redirect=/messages'); return; }
    loadInbox(); loadSettings();
    try {
      const sp = new URLSearchParams(window.location.search);
      const to = sp.get('to');
      if (to) { setActive(to); loadThread(to); }
    } catch {}
  }, [router, loadInbox, loadSettings, loadThread]);

  useEffect(() => { if (active) loadThread(active); }, [active, loadThread]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const open = (uid: string) => { setActive(uid); };
  const back = () => { setActive(null); setOther(null); setMsgs([]); setInfo(''); loadInbox(); };

  const send = async () => {
    const body = draft.trim(); if (!body || !active) return;
    setSending(true); setInfo('');
    try {
      const r = await authFetch('/messages', { method: 'POST', body: JSON.stringify({ recipient_id: active, body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setInfo(d.message || "Envoi impossible."); setSending(false); return; }
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
      if (blocked) { await authFetch('/messages/block/' + active, { method: 'DELETE' }); }
      else { await authFetch('/messages/block', { method: 'POST', body: JSON.stringify({ user_id: active }) }); }
      await loadThread(active); await loadSettings();
    } catch {}
  };
  const saveEnabled = async (val: boolean) => {
    setEnabled(val);
    try { await authFetch('/messages/settings', { method: 'PUT', body: JSON.stringify({ enabled: val }) }); } catch {}
  };
  const unblock = async (uid: string) => {
    try { await authFetch('/messages/block/' + uid, { method: 'DELETE' }); await loadSettings(); } catch {}
  };

  const card: React.CSSProperties = { background: '#12121a', border: '1px solid rgba(255,170,0,0.18)', borderRadius: 14 };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f3f1ea' }}>
      <Navbar />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '14px 14px 40px' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, margin: 0 }}>💬 Messagerie</h1>
          <button onClick={() => setShowSettings(s => !s)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#cfcfe0', borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}>⚙️ Réglages</button>
        </div>

        {/* Réglages */}
        {showSettings && (
          <div style={{ ...card, padding: 14, marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={enabled} onChange={e => saveEnabled(e.target.checked)} />
              Autoriser les autres à m'envoyer des messages
            </label>
            <div style={{ fontSize: 12, color: '#a7a7ba', marginTop: 6 }}>Désactivé, personne ne peut plus t'écrire (tu peux toujours répondre aux fils existants).</div>
            {blocks.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: OR, marginBottom: 6 }}>Bloqués</div>
                {blocks.map(b => (
                  <div key={b.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '5px 0' }}>
                    <span>{b.name}</span>
                    <button onClick={() => unblock(b.user_id)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.25)', color: '#cfcfe0', borderRadius: 6, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}>Débloquer</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {info && <div style={{ ...card, padding: '10px 12px', marginBottom: 12, borderColor: 'rgba(255,170,0,0.4)', fontSize: 13, color: '#FFD27a' }}>{info}</div>}

        {/* Vue boîte de réception */}
        {!active && (
          <div style={{ ...card, overflow: 'hidden' }}>
            {convos.length === 0 && (
              <div style={{ padding: 28, textAlign: 'center', color: '#a7a7ba', fontSize: 14 }}>Aucun message pour l'instant.<br />Ouvre le profil d'un candidat et clique sur « ✉️ Message » pour lui écrire.</div>
            )}
            {convos.map(c => (
              <button key={c.user_id} onClick={() => open(c.user_id)} style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 12, alignItems: 'center', padding: '12px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #20202c', cursor: 'pointer', color: '#f3f1ea' }}>
                <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#000' }}>{(c.name || '?').charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: '#7a7a8c' }}>{timeAgo(c.last_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: c.unread > 0 ? '#f3f1ea' : '#8a8a99', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.last_body}</div>
                </div>
                {c.unread > 0 && <span style={{ flexShrink: 0, background: '#FF1414', color: '#fff', fontSize: 11, fontWeight: 800, minWidth: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{c.unread}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Vue fil de conversation */}
        {active && (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', height: '70vh', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #20202c' }}>
              <button onClick={back} style={{ background: 'transparent', border: 'none', color: OR, fontSize: 20, cursor: 'pointer' }}>←</button>
              <div style={{ flex: 1, fontWeight: 700 }}>{other?.name || 'Conversation'}</div>
              <button onClick={toggleBlock} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: blocked ? '#4ade80' : '#f87171', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>{blocked ? 'Débloquer' : 'Bloquer'}</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msgs.length === 0 && <div style={{ textAlign: 'center', color: '#a7a7ba', fontSize: 13, margin: 'auto' }}>Écris le premier message 👇</div>}
              {msgs.map(m => {
                const mine = m.sender_id === me;
                return (
                  <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                    <div onClick={() => !mine && report(m.id)} title={!mine ? 'Cliquer pour signaler' : ''} style={{ background: mine ? 'linear-gradient(135deg,#FFAA00,#FF6B00)' : '#1e1e2a', color: mine ? '#000' : '#f3f1ea', padding: '8px 12px', borderRadius: 12, fontSize: 14, cursor: mine ? 'default' : 'pointer', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.body}</div>
                    <div style={{ fontSize: 10, color: '#7a7a8c', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{timeAgo(m.created_at)}</div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {canMsg ? (
              <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #20202c' }}>
                <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} maxLength={1000} placeholder="Écris ton message…" style={{ flex: 1, background: '#0a0a0f', border: '1px solid rgba(255,170,0,0.25)', borderRadius: 20, padding: '10px 14px', color: '#fff', fontSize: 14 }} />
                <button onClick={send} disabled={sending || !draft.trim()} style={{ background: OR, color: '#000', fontWeight: 800, border: 'none', borderRadius: 20, padding: '0 18px', cursor: sending ? 'default' : 'pointer', opacity: sending || !draft.trim() ? 0.6 : 1 }}>Envoyer</button>
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: '1px solid #20202c', fontSize: 13, color: '#a7a7ba', textAlign: 'center' }}>{blocked ? 'Échange bloqué.' : "Tu ne peux pas écrire à cette personne (elle n'est pas candidate ou a désactivé les messages)."}</div>
            )}
          </div>
        )}

        <div style={{ fontSize: 11, color: '#6b6b7a', marginTop: 14, textAlign: 'center' }}>Reste courtois. Aucun vote ni paiement ne se traite ici — propositions de votes hors plateforme interdites.</div>
      </div>
    </div>
  );
}
