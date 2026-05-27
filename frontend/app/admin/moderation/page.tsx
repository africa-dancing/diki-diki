'use client';
import { AdminGuard }   from '../components/admin/AdminGuard';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { useAdminAuth } from '../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

const REASONS = [
  'Contenu non conforme aux CGU',
  'Discipline incorrectement renseignée',
  'Qualité vidéo insuffisante',
  'Durée dépassée (max 3 minutes)',
  'Visage du participant non visible',
  'Contenu violent ou offensant',
  'Titre ou description manquant',
  'Autre',
];

interface Video {
  id: string; title: string; discipline?: string;
  storage_url?: string; created_at: string;
  user?: { name?: string; country?: string; id?: string };
  status: string; rejection_reason?: string;
}

function fmt(n: number) { return n.toLocaleString('fr-FR'); }

export default function AdminModerationPage() {
  const { admin } = useAdminAuth();
  const [videos,    setVideos]    = useState<Video[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason,    setReason]    = useState(REASONS[0]);
  const [message,   setMessage]   = useState('');
  const [msgType,   setMsgType]   = useState<'success' | 'error'>('success');
  const [filter,    setFilter]    = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMessage(text); setMsgType(type);
    setTimeout(() => setMessage(''), 4000);
  }

  // ── Charger les vidéos depuis l'API ──
  useEffect(() => {
    if (!admin?.token) return;
    setLoading(true);
    const url = filter === 'all' ? `${API}/videos` : `${API}/videos?status=${filter}`;
    fetch(url, { headers: { Authorization: `Bearer ${admin.token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const list = data?.videos ?? data ?? [];
        setVideos(Array.isArray(list) ? list : []);
      })
      .catch(() => showMsg('Impossible de charger les vidéos.', 'error'))
      .finally(() => setLoading(false));
  }, [admin?.token, filter]);

  // ── Approuver ──
  async function approve(id: string, name: string) {
    try {
      const res = await fetch(`${API}/videos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin?.token}` },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!res.ok) throw new Error();
      setVideos(prev => prev.map(v => v.id === id ? { ...v, status: 'approved' } : v));
      showMsg(`✓ Vidéo de ${name} approuvée — candidat notifié`);
    } catch { showMsg('Erreur lors de la validation.', 'error'); }
  }

  // ── Rejeter ──
  async function reject(id: string, name: string) {
    try {
      const res = await fetch(`${API}/videos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin?.token}` },
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason }),
      });
      if (!res.ok) throw new Error();
      setVideos(prev => prev.map(v => v.id === id ? { ...v, status: 'rejected', rejection_reason: reason } : v));
      setRejecting(null);
      showMsg(`✕ Vidéo de ${name} refusée (${reason}) — candidat notifié`);
    } catch { showMsg('Erreur lors du refus.', 'error'); }
  }

  const pending  = videos.filter(v => v.status === 'pending').length;
  const approved = videos.filter(v => v.status === 'approved').length;
  const rejected = videos.filter(v => v.status === 'rejected').length;

  const sc: Record<string, { bg: string; color: string; border: string; label: string }> = {
    pending:  { bg:'rgba(255,170,0,0.08)',  color:'#FFAA00', border:'rgba(255,170,0,0.25)',  label:'En attente' },
    approved: { bg:'rgba(74,222,128,0.08)', color:'#4ade80', border:'rgba(74,222,128,0.25)', label:'Approuvée'  },
    rejected: { bg:'rgba(248,113,113,0.08)',color:'#f87171', border:'rgba(248,113,113,0.25)',label:'Rejetée'    },
    draft:    { bg:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)', border:'rgba(255,255,255,0.1)', label:'Brouillon' },
  };

  const displayed = filter === 'all' ? videos : videos.filter(v => v.status === filter);

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '24px', overflow: 'auto', fontFamily: 'DM Sans, sans-serif' }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>🎬 Modération vidéos</div>
            <div style={{ fontSize: 12, color: '#4a4a6a' }}>Validez ou refusez les prestations des candidats</div>
          </div>

          {/* Compteurs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'En attente', val: pending,  bg: 'rgba(255,170,0,0.06)',  color: '#FFAA00', filter: 'pending'  as const },
              { label: 'Approuvées', val: approved, bg: 'rgba(74,222,128,0.06)', color: '#4ade80', filter: 'approved' as const },
              { label: 'Refusées',   val: rejected, bg: 'rgba(248,113,113,0.06)',color: '#f87171', filter: 'rejected' as const },
            ].map(k => (
              <div key={k.label} onClick={() => setFilter(f => f === k.filter ? 'all' : k.filter)}
                style={{ background: k.bg, border: `1px solid ${k.color}30`, borderRadius: 14, padding: '16px', cursor: 'pointer', transition: 'all .2s', opacity: filter !== 'all' && filter !== k.filter ? 0.5 : 1 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: k.color, fontFamily: 'Syne, sans-serif' }}>{k.val}</div>
                <div style={{ fontSize: 11, color: k.color, marginTop: 4, opacity: .7 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Message */}
          {message && (
            <div style={{ background: msgType === 'success' ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${msgType === 'success' ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`, borderRadius: 10, padding: '10px 16px', fontSize: 12, color: msgType === 'success' ? '#4ade80' : '#f87171', marginBottom: 16 }}>
              {message}
            </div>
          )}

          {/* Liste vidéos */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#4a4a6a' }}>⏳ Chargement…</div>
          ) : displayed.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#4a4a6a' }}>
              {filter === 'pending' ? '✅ Aucune vidéo en attente de modération' : 'Aucune vidéo dans cette catégorie'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {displayed.map(v => {
                const st = sc[v.status] ?? sc.pending;
                return (
                  <div key={v.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>

                      {/* Miniature */}
                      <div style={{ width: 90, height: 56, background: 'rgba(255,255,255,0.06)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                        🎬
                      </div>

                      {/* Infos */}
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{v.title || 'Sans titre'}</div>
                        <div style={{ fontSize: 11, color: '#6a6a8a', marginBottom: 2 }}>
                          {v.user?.name ?? 'Inconnu'} {v.user?.country ? `· ${v.user.country}` : ''}
                          {v.discipline ? ` · ${v.discipline}` : ''}
                        </div>
                        <div style={{ fontSize: 10, color: '#3a3a5a' }}>
                          Soumis le {new Date(v.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        {v.rejection_reason && (
                          <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>Motif : {v.rejection_reason}</div>
                        )}
                      </div>

                      {/* Badge statut */}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, border: `1px solid ${st.border}`, flexShrink: 0 }}>
                        {st.label}
                      </span>

                      {/* Actions */}
                      {v.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {v.storage_url && (
                            <a href={v.storage_url} target="_blank" rel="noreferrer"
                              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, borderRadius: 8, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                              ▶ Voir
                            </a>
                          )}
                          <button onClick={() => approve(v.id, v.user?.name ?? v.title)}
                            style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                            ✓ Approuver
                          </button>
                          <button onClick={() => setRejecting(v.id)}
                            style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                            ✕ Refuser
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Motif de refus */}
                    {rejecting === v.id && (
                      <div style={{ marginTop: 12, padding: '14px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10 }}>
                        <div style={{ fontSize: 12, color: '#f87171', fontWeight: 600, marginBottom: 8 }}>Motif du refus</div>
                        <select value={reason} onChange={e => setReason(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, color: '#f0f0f0', fontFamily: 'DM Sans, sans-serif', marginBottom: 10 }}>
                          {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => reject(v.id, v.user?.name ?? v.title)}
                            style={{ flex: 1, padding: '9px', fontSize: 13, fontWeight: 700, borderRadius: 10, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: '#f87171', border: 'none', color: '#fff' }}>
                            Confirmer le refus
                          </button>
                          <button onClick={() => setRejecting(null)}
                            style={{ padding: '9px 16px', fontSize: 13, borderRadius: 10, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AdminGuard>
  );
}
