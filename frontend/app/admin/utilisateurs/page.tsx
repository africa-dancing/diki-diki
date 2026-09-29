'use client';
// frontend/app/admin/utilisateurs/page.tsx
// Liste des membres inscrits (lecture admin depuis GET /v1/users).
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

/*DKDK_DRAPEAUX — drapeau du pays deduit de l'indicatif international du numero (vraie image, s'affiche sur Windows) */
const INDICATIFS: [string, string, string][] = [
  ['211','SS','Soudan du Sud'],['212','MA','Maroc'],['213','DZ','Algérie'],['216','TN','Tunisie'],['218','LY','Libye'],
  ['220','GM','Gambie'],['221','SN','Sénégal'],['222','MR','Mauritanie'],['223','ML','Mali'],['224','GN','Guinée'],
  ['225','CI','Côte d’Ivoire'],['226','BF','Burkina Faso'],['227','NE','Niger'],['228','TG','Togo'],['229','BJ','Bénin'],
  ['230','MU','Maurice'],['231','LR','Liberia'],['232','SL','Sierra Leone'],['233','GH','Ghana'],['234','NG','Nigeria'],
  ['235','TD','Tchad'],['236','CF','Centrafrique'],['237','CM','Cameroun'],['238','CV','Cap-Vert'],['239','ST','Sao Tomé-et-Principe'],
  ['240','GQ','Guinée équatoriale'],['241','GA','Gabon'],['242','CG','Congo'],['243','CD','RD Congo'],['244','AO','Angola'],
  ['245','GW','Guinée-Bissau'],['248','SC','Seychelles'],['249','SD','Soudan'],['250','RW','Rwanda'],['251','ET','Éthiopie'],
  ['252','SO','Somalie'],['253','DJ','Djibouti'],['254','KE','Kenya'],['255','TZ','Tanzanie'],['256','UG','Ouganda'],
  ['257','BI','Burundi'],['258','MZ','Mozambique'],['260','ZM','Zambie'],['261','MG','Madagascar'],['262','RE','Réunion / Mayotte'],
  ['263','ZW','Zimbabwe'],['264','NA','Namibie'],['265','MW','Malawi'],['266','LS','Lesotho'],['267','BW','Botswana'],
  ['268','SZ','Eswatini'],['269','KM','Comores'],['291','ER','Érythrée'],
  ['351','PT','Portugal'],['352','LU','Luxembourg'],['971','AE','Émirats arabes unis'],['966','SA','Arabie saoudite'],
  ['20','EG','Égypte'],['27','ZA','Afrique du Sud'],['31','NL','Pays-Bas'],['32','BE','Belgique'],['33','FR','France'],
  ['34','ES','Espagne'],['39','IT','Italie'],['41','CH','Suisse'],['44','GB','Royaume-Uni'],['49','DE','Allemagne'],
  ['86','CN','Chine'],['90','TR','Turquie'],
  ['1','US','États-Unis / Canada'],
];

function infoPays(phone: string | null): { iso: string; nom: string } | null {
  if (!phone) return null;
  let d = phone.replace(/[^0-9]/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (!d) return null;
  let best: [string, string, string] | null = null;
  for (const e of INDICATIFS) {
    if (d.startsWith(e[0]) && (!best || e[0].length > best[0].length)) best = e;
  }
  return best ? { iso: best[1], nom: best[2] } : null;
}

function TelAvecDrapeau({ phone }: { phone: string | null }) {
  if (!phone) return <>—</>;
  const p = infoPays(phone);
  const iso = p ? p.iso.toLowerCase() : null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      {iso ? (
        <img
          src={`https://flagcdn.com/20x15/${iso}.png`}
          srcSet={`https://flagcdn.com/40x30/${iso}.png 2x`}
          width={20}
          height={15}
          alt={p!.nom}
          title={p!.nom}
          loading="lazy"
          style={{ borderRadius: 2, flex: 'none', boxShadow: '0 0 0 1px rgba(255,255,255,0.15)', objectFit: 'cover' }}
        />
      ) : (
        <span aria-hidden style={{ width: 20, textAlign: 'center', opacity: 0.5 }}>🌍</span>
      )}
      <span>{phone}</span>
    </span>
  );
}


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
                      <td style={{ ...td, color: '#b8b2a4' }}><TelAvecDrapeau phone={u.phone} /></td>
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
