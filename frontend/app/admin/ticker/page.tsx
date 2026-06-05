'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';

interface TickerMsg { id: string; message: string; is_active: boolean; created_at: string; }

export default function AdminTickerPage() {
  const { admin } = useAdminAuth();
  const [messages, setMessages] = useState<TickerMsg[]>([]);
  const [loading, setLoading]   = useState(true);
  const [nouveau, setNouveau]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [info, setInfo]         = useState('');

  const charger = () => {
    setLoading(true);
    fetch(`${API}/ticker`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setMessages(d?.data ?? []))
      .catch(() => setInfo('Erreur de chargement.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, []);

  const ajouter = async () => {
    if (!nouveau.trim()) return;
    setBusy(true); setInfo('');
    try {
      const r = await fetch(`${API}/ticker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
        body: JSON.stringify({ message: nouveau.trim() }),
      });
      if (!r.ok) throw new Error();
      setNouveau('');
      setInfo('Message ajoute.');
      charger();
    } catch { setInfo('Erreur lors de l ajout.'); }
    finally { setBusy(false); }
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    setBusy(true); setInfo('');
    try {
      const r = await fetch(`${API}/ticker/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${admin.token}` },
      });
      if (!r.ok) throw new Error();
      setInfo('Message supprime.');
      charger();
    } catch { setInfo('Erreur lors de la suppression.'); }
    finally { setBusy(false); }
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 800 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: OR, margin: '0 0 6px' }}>
            Bande defilante
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
            Messages qui defilent en bas des pages du site.
          </p>

          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <input
              value={nouveau}
              onChange={e => setNouveau(e.target.value)}
              placeholder="Nouveau message (ex: Bienvenue sur Diki-Diki !)"
              style={{ flex: 1, padding: '11px 14px', borderRadius: 8, border: '1px solid rgba(255,170,0,0.25)', background: '#15151c', color: '#fff', fontSize: 14 }}
            />
            <button
              onClick={ajouter} disabled={busy || !nouveau.trim()}
              style={{ background: OR, color: '#000', fontWeight: 700, fontSize: 14, padding: '0 22px', borderRadius: 8, border: 'none', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
            >
              Ajouter
            </button>
          </div>

          {info && <p style={{ fontSize: 13, color: OR, marginBottom: 16 }}>{info}</p>}

          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Chargement...</p>
          ) : messages.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun message. Ajoutez-en un ci-dessus.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 10, background: '#15151c', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 14, color: '#fff' }}>{m.message}</span>
                  <button
                    onClick={() => supprimer(m.id)} disabled={busy}
                    style={{ background: 'transparent', color: '#FF4444', border: '1px solid rgba(255,68,68,0.4)', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}