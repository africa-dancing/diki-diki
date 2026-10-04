'use client';
// frontend/app/admin/messages-signales/page.tsx
// DKDK_MSG_SIGNALES — Moderation de la messagerie interne.
// Liste les messages SIGNALES par un utilisateur (reported) et ceux AUTO-DETECTES
// (flagged : sollicitation de vote/paiement hors plateforme). Lecture + action
// "Marquer traite" (leve les drapeaux, ne supprime rien). Aucune logique d'argent.
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

type Vue = 'tous' | 'signales' | 'auto';

interface Signalement {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  flagged: boolean | null;
  flag_reason: string | null;
  reported: boolean | null;
  reported_reason: string | null;
  sender_name: string;
  sender_username: string | null;
  recipient_name: string;
  recipient_username: string | null;
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return s; }
}
function handle(u: string | null) { return u ? '@' + u : ''; }

export default function AdminMessagesSignalesPage() {
  const { admin } = useAdminAuth();
  const [items, setItems]     = useState<Signalement[]>([]);
  const [loading, setLoading] = useState(true);
  const [vue, setVue]         = useState<Vue>('tous');
  const [info, setInfo]       = useState('');
  const [busy, setBusy]       = useState<string | null>(null);

  const charger = () => {
    if (!admin?.token) return;
    setLoading(true); setInfo('');
    fetch(`${API}/messages/admin/reported`, { cache: 'no-store', headers: { Authorization: `Bearer ${admin.token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setItems(d?.data ?? []))
      .catch(() => setInfo('Erreur de chargement.'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [admin?.token]);

  const resoudre = (id: string) => {
    if (!admin?.token) return;
    setBusy(id);
    fetch(`${API}/messages/admin/reported/${id}/resolve`, { method: 'POST', headers: { Authorization: `Bearer ${admin.token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success) setItems(prev => prev.filter(m => m.id !== id)); else setInfo('Action impossible.'); })
      .catch(() => setInfo('Action impossible.'))
      .finally(() => setBusy(null));
  };

  const liste = items.filter(m =>
    vue === 'tous' ? true : vue === 'signales' ? !!m.reported : !!m.flagged
  );
  const nbSignales = items.filter(m => m.reported).length;
  const nbAuto     = items.filter(m => m.flagged).length;

  const onglet = (v: Vue, label: string) => {
    const actif = vue === v;
    return (
      <button key={v} onClick={() => setVue(v)} style={{
        padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        borderRadius: 999, border: `1px solid ${actif ? OR : 'rgba(255,255,255,0.18)'}`,
        color: actif ? OR : 'rgba(255,255,255,0.7)',
        background: actif ? 'rgba(255,170,0,0.12)' : 'transparent',
      }}>{label}</button>
    );
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: OR, margin: 0 }}>🚩 Messages signalés</h1>
            <button onClick={charger} disabled={loading} style={{ background: 'transparent', color: OR, border: '1px solid rgba(255,170,0,0.4)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}>↻ Actualiser</button>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
            Modération de la messagerie interne. <b style={{ color: '#ff8a8a' }}>🚩 Signalés</b> = remontés par un utilisateur · <b style={{ color: '#ffc233' }}>⚠️ Auto-détectés</b> = sollicitation de vote/paiement hors plateforme repérée automatiquement. « Marquer traité » lève les drapeaux sans supprimer le message.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {onglet('tous', `Tous (${items.length})`)}
            {onglet('signales', `🚩 Signalés (${nbSignales})`)}
            {onglet('auto', `⚠️ Auto-détectés (${nbAuto})`)}
          </div>

          {info && <div style={{ color: '#ff8a8a', fontSize: 13, marginBottom: 12 }}>{info}</div>}

          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Chargement…</div>
          ) : liste.length === 0 ? (
            <div style={{ padding: '28px 20px', borderRadius: 12, background: '#15151c', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', color: 'rgba(255,255,255,0.55)' }}>
              ✅ Rien à modérer ici pour le moment.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {liste.map(m => (
                <div key={m.id} style={{ padding: '16px 18px', borderRadius: 12, background: '#15151c', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {m.reported && <span style={{ fontSize: 11, fontWeight: 800, color: '#ff6b6b', background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.4)', borderRadius: 999, padding: '2px 9px' }}>🚩 SIGNALÉ</span>}
                    {m.flagged && <span style={{ fontSize: 11, fontWeight: 800, color: '#ffc233', background: 'rgba(255,194,51,0.12)', border: '1px solid rgba(255,194,51,0.4)', borderRadius: 999, padding: '2px 9px' }}>⚠️ AUTO-DÉTECTÉ</span>}
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{fmtDate(m.created_at)}</span>
                  </div>

                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginBottom: 10 }}>
                    <b style={{ color: '#e8e0d0' }}>{m.sender_name}</b> {handle(m.sender_username)} <span style={{ color: OR }}>→</span> <b style={{ color: '#e8e0d0' }}>{m.recipient_name}</b> {handle(m.recipient_username)}
                  </div>

                  <div style={{ fontSize: 14, lineHeight: 1.6, color: '#d8d2c4', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '10px 12px' }}>{m.body}</div>

                  {(m.reported_reason || m.flag_reason) && (
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 10, lineHeight: 1.5 }}>
                      {m.reported_reason && <div><b style={{ color: '#ff8a8a' }}>Motif du signalement :</b> {m.reported_reason}</div>}
                      {m.flag_reason && <div><b style={{ color: '#ffc233' }}>Détection auto :</b> {m.flag_reason}</div>}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button onClick={() => resoudre(m.id)} disabled={busy === m.id} style={{ background: OR, color: '#1a1200', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: busy === m.id ? 'default' : 'pointer', opacity: busy === m.id ? 0.6 : 1 }}>
                      {busy === m.id ? '…' : '✓ Marquer traité'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
