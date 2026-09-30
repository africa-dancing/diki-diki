'use client';
// frontend/app/admin/activite/page.tsx
// « Qui fait quoi » — traçabilité : qui crée un appel (Mur) et qui ajoute un morceau (Médiathèque).
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

interface Appel {
  id: string; code: string | null; titre: string | null; discipline: string | null;
  statut: string | null; created_at: string; createur_id: string | null;
  createur_nom: string | null; createur_email: string | null;
}
interface Morceau {
  id: string; titre: string | null; artiste: string | null; statut: string | null;
  created_at: string; auteur_id: string | null; auteur_nom: string | null; auteur_email: string | null;
}

export default function AdminActivitePage() {
  const { admin } = useAdminAuth();
  const [appels, setAppels]     = useState<Appel[]>([]);
  const [morceaux, setMorceaux] = useState<Morceau[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [onglet, setOnglet]     = useState<'appels' | 'morceaux'>('appels');
  const [q, setQ]               = useState('');

  const charger = () => {
    if (!admin?.token) return;
    setLoading(true); setError('');
    fetch(`${API}/admin/activite`, { cache: 'no-store', headers: { Authorization: `Bearer ${admin.token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setAppels(d?.data?.appels ?? []); setMorceaux(d?.data?.morceaux ?? []); })
      .catch(() => setError('Erreur de chargement de l’activité.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [admin]);

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return s || '—'; }
  };

  const statutBadge = (st: string | null) => {
    const s = String(st || '').toLowerCase();
    const ok = ['approved', 'open', 'ouvert', 'ouvrir', 'active', 'in_progress'].includes(s);
    const attente = ['pending', 'waiting_candidates'].includes(s);
    const bg = ok ? 'rgba(74,222,128,0.12)' : attente ? 'rgba(255,170,0,0.12)' : 'rgba(255,255,255,0.06)';
    const fg = ok ? '#4ade80' : attente ? OR : '#b8b2a4';
    return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 }}>{st || '—'}</span>;
  };

  const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8a8aa8', textTransform: 'uppercase', letterSpacing: '.5px', padding: '10px 12px', borderBottom: '1px solid #1e1e2e', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { fontSize: 13, color: '#e8e0d0', padding: '11px 12px', borderBottom: '1px solid #15151f', whiteSpace: 'nowrap' };

  const auteur = (nom: string | null, email: string | null) => (
    <span>
      <span style={{ fontWeight: 600 }}>{nom || 'Compte supprimé'}</span>
      {email && <span style={{ color: '#7a7a8c', fontSize: 11.5 }}>{'  ·  ' + email}</span>}
    </span>
  );

  const t = q.trim().toLowerCase();
  const appelsF = appels.filter(a => !t
    || (a.createur_nom || '').toLowerCase().includes(t)
    || (a.createur_email || '').toLowerCase().includes(t)
    || (a.titre || '').toLowerCase().includes(t)
    || (a.code || '').toLowerCase().includes(t)
    || (a.discipline || '').toLowerCase().includes(t));
  const morceauxF = morceaux.filter(m => !t
    || (m.auteur_nom || '').toLowerCase().includes(t)
    || (m.auteur_email || '').toLowerCase().includes(t)
    || (m.titre || '').toLowerCase().includes(t)
    || (m.artiste || '').toLowerCase().includes(t));

  const tab = (key: 'appels' | 'morceaux', label: string, n: number) => (
    <button onClick={() => setOnglet(key)} style={{
      padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
      border: '1px solid ' + (onglet === key ? 'rgba(255,170,0,0.4)' : '#26263a'),
      background: onglet === key ? 'rgba(255,170,0,0.12)' : 'transparent',
      color: onglet === key ? OR : '#9a9ab0' }}>{label} ({n})</button>
  );

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 1100 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif', margin: 0 }}>🧭 Qui fait quoi</h1>
            <button onClick={charger} style={{ background: 'rgba(255,170,0,0.10)', border: '1px solid rgba(255,170,0,0.3)', color: OR, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>↻ Rafraîchir</button>
          </div>
          <p style={{ fontSize: 13, color: '#8a8aa8', margin: '0 0 16px' }}>
            Qui crée un appel sur le Mur et qui ajoute un morceau dans la Médiathèque. Base du programme de fidélité.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {tab('appels', '📣 Appels créés', appels.length)}
            {tab('morceaux', '🎵 Morceaux ajoutés', morceaux.length)}
          </div>

          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un nom, un email, un titre…"
            style={{ width: '100%', maxWidth: 420, background: '#12121c', border: '1px solid #1e1e2e', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#e8e0d0', outline: 'none', marginBottom: 18 }}
          />

          {loading ? (
            <div style={{ color: '#8a8aa8', fontSize: 14, padding: '30px 0' }}>Chargement de l’activité…</div>
          ) : error ? (
            <div style={{ background: 'rgba(230,60,60,0.1)', border: '1px solid rgba(230,60,60,0.25)', borderRadius: 10, padding: '12px 16px', color: '#ff7070', fontSize: 13 }}>{error}</div>
          ) : onglet === 'appels' ? (
            appelsF.length === 0 ? (
              <div style={{ color: '#8a8aa8', fontSize: 14, padding: '30px 0' }}>Aucun appel créé pour l’instant.</div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #1e1e2e', borderRadius: 12, background: '#0d0d14' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead><tr>
                    <th style={th}>Créateur</th>
                    <th style={th}>Challenge</th>
                    <th style={th}>Discipline</th>
                    <th style={th}>Statut</th>
                    <th style={th}>Créé le</th>
                  </tr></thead>
                  <tbody>
                    {appelsF.map(a => (
                      <tr key={a.id}>
                        <td style={td}>{auteur(a.createur_nom, a.createur_email)}</td>
                        <td style={{ ...td, color: '#b8b2a4' }}>{a.titre || a.code || '—'}{a.code && a.titre ? <span style={{ color: '#7a7a8c' }}>{'  · ' + a.code}</span> : null}</td>
                        <td style={{ ...td, color: '#b8b2a4' }}>{a.discipline || '—'}</td>
                        <td style={td}>{statutBadge(a.statut)}</td>
                        <td style={{ ...td, color: '#8a8aa8' }}>{fmtDate(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            morceauxF.length === 0 ? (
              <div style={{ color: '#8a8aa8', fontSize: 14, padding: '30px 0' }}>Aucun morceau ajouté pour l’instant.</div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #1e1e2e', borderRadius: 12, background: '#0d0d14' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                  <thead><tr>
                    <th style={th}>Auteur</th>
                    <th style={th}>Titre</th>
                    <th style={th}>Artiste</th>
                    <th style={th}>Statut</th>
                    <th style={th}>Ajouté le</th>
                  </tr></thead>
                  <tbody>
                    {morceauxF.map(m => (
                      <tr key={m.id}>
                        <td style={td}>{auteur(m.auteur_nom, m.auteur_email)}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{m.titre || '—'}</td>
                        <td style={{ ...td, color: '#b8b2a4' }}>{m.artiste || '—'}</td>
                        <td style={td}>{statutBadge(m.statut)}</td>
                        <td style={{ ...td, color: '#8a8aa8' }}>{fmtDate(m.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

        </div>
      </div>
    </AdminGuard>
  );
}
