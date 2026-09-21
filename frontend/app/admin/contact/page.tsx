'use client';
// frontend/app/admin/contact/page.tsx
// Messages de contact — lecture fiable depuis la base (indépendant de l'e-mail Resend).
// Deux vues : « Reçus » (actifs) et « Corbeille » (suppression douce, restaurable).
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

type Vue = 'recus' | 'corbeille';

interface ContactMsg {
  id: string;
  nom: string;
  email: string;
  sujet: string;
  message: string;
  email_envoye: boolean | null;
  created_at: string;
  supprime_le?: string | null;
}

export default function AdminContactPage() {
  const { admin } = useAdminAuth();
  const [vue, setVue]           = useState<Vue>('recus');
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [loading, setLoading]   = useState(true);
  const [info, setInfo]         = useState('');

  const charger = (v: Vue = vue) => {
    setLoading(true); setInfo('');
    const url = v === 'corbeille' ? `${API}/contact/corbeille` : `${API}/contact`;
    fetch(url, { cache: 'no-store', headers: { Authorization: `Bearer ${admin?.token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => setMessages(d?.data ?? []))
      .catch(() => setInfo('Erreur de chargement.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (admin?.token) charger(vue); /* eslint-disable-next-line */ }, [vue, admin]);

  const fmtDate = (s?: string | null) => {
    if (!s) return '';
    try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return s; }
  };

  const retirer = (id: string) => setMessages(prev => prev.filter(m => m.id !== id));

  // Reçus → 🗑 met à la corbeille (suppression douce)
  const mettreCorbeille = async (id: string) => {
    if (!confirm('Mettre ce message à la corbeille ?')) return;
    setInfo('');
    try {
      const r = await fetch(`${API}/contact/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${admin?.token}` } });
      if (!r.ok) throw new Error();
      retirer(id);
    } catch { setInfo('Erreur lors de la mise à la corbeille.'); }
  };

  // Corbeille → ♻ restaurer
  const restaurer = async (id: string) => {
    setInfo('');
    try {
      const r = await fetch(`${API}/contact/${id}/restore`, { method: 'POST', headers: { Authorization: `Bearer ${admin?.token}` } });
      if (!r.ok) throw new Error();
      retirer(id);
    } catch { setInfo('Erreur lors de la restauration.'); }
  };

  // Corbeille → suppression DÉFINITIVE
  const supprimerDefinitif = async (id: string) => {
    if (!confirm('Supprimer DÉFINITIVEMENT ce message ? Cette action est irréversible.')) return;
    setInfo('');
    try {
      const r = await fetch(`${API}/contact/${id}/definitif`, { method: 'DELETE', headers: { Authorization: `Bearer ${admin?.token}` } });
      if (!r.ok) throw new Error();
      retirer(id);
    } catch { setInfo('Erreur lors de la suppression définitive.'); }
  };

  const pill = (col: string, bd: string) => ({
    color: col, background: 'transparent', border: `1px solid ${bd}`, borderRadius: 999,
    padding: '2px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', textDecoration: 'none' as const,
  });

  const onglet = (v: Vue, label: string) => (
    <button
      onClick={() => setVue(v)}
      style={{
        background: vue === v ? 'rgba(255,170,0,0.12)' : 'transparent',
        color: vue === v ? OR : 'rgba(255,255,255,0.55)',
        border: `1px solid ${vue === v ? 'rgba(255,170,0,0.4)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 860 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: OR, margin: 0 }}>
              Messages de contact
            </h1>
            <button
              onClick={() => charger(vue)} disabled={loading}
              style={{ background: 'transparent', color: OR, border: `1px solid rgba(255,170,0,0.4)`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              ↻ Rafraîchir
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {onglet('recus', '📥 Reçus')}
            {onglet('corbeille', '🗑 Corbeille')}
          </div>

          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 20px' }}>
            {vue === 'corbeille'
              ? `Messages mis à la corbeille — ${messages.length}. Tu peux les restaurer ou les supprimer définitivement.`
              : `Messages reçus via le formulaire de contact — ${messages.length}.`}
          </p>

          {info && <p style={{ fontSize: 13, color: '#ff6b6b', marginBottom: 16 }}>{info}</p>}

          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Chargement...</p>
          ) : messages.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>
              {vue === 'corbeille' ? 'La corbeille est vide.' : 'Aucun message pour l’instant.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map(m => (
                <div
                  key={m.id}
                  style={{ padding: '16px 18px', borderRadius: 12, background: '#15151c', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>{m.sujet}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{fmtDate(m.created_at)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10, fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>
                    <span><b style={{ color: '#e8e0d0' }}>{m.nom}</b> · {m.email}</span>
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.sujet)}`} style={pill(OR, 'rgba(255,170,0,0.35)')}>↩ Répondre</a>

                    {vue === 'recus' ? (
                      <>
                        <span style={{ fontSize: 11, color: m.email_envoye ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                          {m.email_envoye ? '📧 alerte e-mail envoyée' : '📥 en base (pas d’e-mail)'}
                        </span>
                        <button onClick={() => mettreCorbeille(m.id)} title="Mettre à la corbeille" style={{ ...pill('#ff9f6b', 'rgba(255,159,107,0.35)'), marginLeft: 'auto' }}>🗑 Corbeille</button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>supprimé le {fmtDate(m.supprime_le)}</span>
                        <button onClick={() => restaurer(m.id)} title="Restaurer" style={{ ...pill('#4ade80', 'rgba(74,222,128,0.4)'), marginLeft: 'auto' }}>♻ Restaurer</button>
                        <button onClick={() => supprimerDefinitif(m.id)} title="Supprimer définitivement" style={pill('#ff6b6b', 'rgba(255,107,107,0.4)')}>🗑 Définitif</button>
                      </>
                    )}
                  </div>

                  <div style={{ fontSize: 14, lineHeight: 1.6, color: '#d8d2c4', whiteSpace: 'pre-wrap' }}>{m.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
