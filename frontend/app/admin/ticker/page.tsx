'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';

interface TickerMsg { id: string; message: string; is_active: boolean; created_at: string; position?: number; }

export default function AdminTickerPage() {
  const { admin } = useAdminAuth();
  const [messages, setMessages] = useState<TickerMsg[]>([]);
  const [loading, setLoading]   = useState(true);
  const [nouveau, setNouveau]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [info, setInfo]         = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editTexte, setEditTexte] = useState('');

  const charger = () => {
    setLoading(true);
    fetch(`${API}/ticker`, { cache: 'no-store' })
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

  const demarrerEdition = (m: TickerMsg) => {
    setEditId(m.id);
    setEditTexte(m.message);
  };

  const annulerEdition = () => {
    setEditId(null);
    setEditTexte('');
  };

  const enregistrerEdition = async (id: string) => {
    if (!editTexte.trim()) return;
    setBusy(true); setInfo('');
    try {
      const r = await fetch(`${API}/ticker/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
        body: JSON.stringify({ message: editTexte.trim() }),
      });
      if (!r.ok) throw new Error();
      setInfo('Message modifie.');
      setEditId(null);
      setEditTexte('');
      charger();
    } catch { setInfo('Erreur lors de la modification.'); }
    finally { setBusy(false); }
  };

  const enregistrerOrdre = async (liste: TickerMsg[]) => {
    setBusy(true); setInfo('');
    try {
      await Promise.all(liste.map((m, idx) =>
        fetch(`${API}/ticker/${m.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
          body: JSON.stringify({ position: idx + 1 }),
        })
      ));
      setInfo('Ordre enregistre.');
    } catch { setInfo('Erreur lors de l enregistrement de l ordre.'); }
    finally { setBusy(false); }
  };

  const onDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) { setDragIndex(null); return; }
    const liste = [...messages];
    const [deplace] = liste.splice(dragIndex, 1);
    liste.splice(dropIndex, 0, deplace);
    setMessages(liste);
    setDragIndex(null);
    enregistrerOrdre(liste);
  };

  const btn = (bg: string, bd: string, col: string) => ({
    background: bg, color: col, border: `1px solid ${bd}`, borderRadius: 6,
    padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  });

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 800 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: OR, margin: '0 0 6px' }}>
            Bande defilante
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
            Messages qui defilent en bas des pages du site. Glissez-deposez pour reordonner.
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
              {messages.map((m, i) => (
                <div
                  key={m.id}
                  draggable={editId !== m.id}
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 10, background: dragIndex === i ? '#2a2118' : '#15151c', border: '1px solid rgba(255,255,255,0.06)', cursor: editId === m.id ? 'default' : 'grab' }}
                >
                  {editId === m.id ? (
                    <>
                      <input
                        value={editTexte}
                        onChange={e => setEditTexte(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255,170,0,0.4)', background: '#0a0a0f', color: '#fff', fontSize: 14 }}
                      />
                      <button onClick={() => enregistrerEdition(m.id)} disabled={busy} style={btn('rgba(74,222,128,0.12)', 'rgba(74,222,128,0.4)', '#4ade80')}>Enregistrer</button>
                      <button onClick={annulerEdition} disabled={busy} style={btn('transparent', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.6)')}>Annuler</button>
                    </>
                  ) : (
                    <>
                      <span style={{ color: OR, fontSize: 16, cursor: 'grab', userSelect: 'none' }}>&#8942;&#8942;</span>
                      <span style={{ fontSize: 14, color: '#fff', flex: 1 }}>{m.message}</span>
                      <button onClick={() => demarrerEdition(m)} disabled={busy} style={btn('rgba(255,170,0,0.12)', 'rgba(255,170,0,0.4)', OR)}>&#9998; Modifier</button>
                      <button onClick={() => supprimer(m.id)} disabled={busy} style={btn('transparent', 'rgba(255,68,68,0.4)', '#FF4444')}>&#128465; Supprimer</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
