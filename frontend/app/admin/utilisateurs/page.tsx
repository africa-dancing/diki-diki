'use client';
// frontend/app/admin/utilisateurs/page.tsx
// Liste des membres inscrits (lecture admin depuis GET /v1/users).
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

interface Membre {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  wallet: number | null;
  created_at: string;
}

export default function AdminUtilisateursPage() {
  const { admin } = useAdminAuth();
  const [membres, setMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [q, setQ]             = useState('');

  const charger = () => {
    if (!admin?.token) return;
    setLoading(true); setError('');
    fetch(`${API}/users`, { cache: 'no-store', headers: { Authorization: `Bearer ${admin.token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setMembres(Array.isArray(d) ? d : (d?.data ?? [])))
      .catch(() => setError('Erreur de chargement des membres.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [admin]);

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return s || '—'; }
  };
  const fmtWallet = (n: number | null) => (n ?? 0).toLocaleString('fr-FR');

  const filtered = membres.filter(u => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (u.name || '').toLowerCase().includes(t)
        || (u.email || '').toLowerCase().includes(t)
        || (u.phone || '').toLowerCase().includes(t);
  });

  const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8a8aa8', textTransform: 'uppercase', letterSpacing: '.5px', padding: '10px 12px', borderBottom: '1px solid #1e1e2e', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { fontSize: 13, color: '#e8e0d0', padding: '11px 12px', borderBottom: '1px solid #15151f', whiteSpace: 'nowrap' };

  const roleBadge = (role: string | null) => {
    const isAdmin = role === 'admin';
    const isMod   = role === 'moderateur' || role === 'moderator';
    const bg = isAdmin ? 'rgba(255,170,0,0.14)' : isMod ? 'rgba(126,3,128,0.20)' : 'rgba(255,255,255,0.06)';
    const fg = isAdmin ? OR : isMod ? '#d98cff' : '#b8b2a4';
    const label = isAdmin ? 'Admin' : isMod ? 'Modérateur' : 'Membre';
    return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>{label}</span>;
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 1100 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif', margin: 0 }}>👥 Utilisateurs</h1>
            <button onClick={charger} style={{ background: 'rgba(255,170,0,0.10)', border: '1px solid rgba(255,170,0,0.3)', color: OR, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>↻ Rafraîchir</button>
          </div>
          <p style={{ fontSize: 13, color: '#8a8aa8', margin: '0 0 18px' }}>
            {loading ? 'Chargement…' : `${membres.length} membre${membres.length > 1 ? 's' : ''} inscrit${membres.length > 1 ? 's' : ''}`}
          </p>

          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Rechercher par nom, email ou téléphone…"
            style={{ width: '100%', maxWidth: 420, background: '#12121c', border: '1px solid #1e1e2e', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#e8e0d0', outline: 'none', marginBottom: 18 }}
          />

          {loading ? (
            <div style={{ color: '#8a8aa8', fontSize: 14, padding: '30px 0' }}>Chargement des membres…</div>
          ) : error ? (
            <div style={{ background: 'rgba(230,60,60,0.1)', border: '1px solid rgba(230,60,60,0.25)', borderRadius: 10, padding: '12px 16px', color: '#ff7070', fontSize: 13 }}>{error}</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: '#8a8aa8', fontSize: 14, padding: '30px 0' }}>
              {membres.length === 0 ? "Aucun membre inscrit pour l'instant." : 'Aucun résultat pour cette recherche.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid #1e1e2e', borderRadius: 12, background: '#0d0d14' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={th}>Nom</th>
                    <th style={th}>Email</th>
                    <th style={th}>Téléphone</th>
                    <th style={th}>Rôle</th>
                    <th style={{ ...th, textAlign: 'right' }}>Portefeuille</th>
                    <th style={th}>Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td style={{ ...td, fontWeight: 600 }}>{u.name || '—'}</td>
                      <td style={{ ...td, color: '#b8b2a4' }}>{u.email || '—'}</td>
                      <td style={{ ...td, color: '#b8b2a4' }}>{u.phone || '—'}</td>
                      <td style={td}>{roleBadge(u.role)}</td>
                      <td style={{ ...td, textAlign: 'right', color: OR, fontWeight: 700 }}>{fmtWallet(u.wallet)} F</td>
                      <td style={{ ...td, color: '#8a8aa8' }}>{fmtDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </AdminGuard>
  );
}
