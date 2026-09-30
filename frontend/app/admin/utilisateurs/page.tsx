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
  status?: string | null;
  created_at: string;
}

export default function AdminUtilisateursPage() {
  const { admin } = useAdminAuth();
  const [membres, setMembres] = useState<Membre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [q, setQ]             = useState('');
  const [busy, setBusy]       = useState<string | null>(null);
  const [showBannis, setShowBannis] = useState(false);
  const [compose, setCompose] = useState<null | { mode: 'one' | 'group'; user?: Membre }>(null);
  const [msgTitre, setMsgTitre] = useState('Bienvenue dans l\u2019Ar\u00e8ne Diki-Diki \ud83c\udf89');
  const [msgTexte, setMsgTexte] = useState("Akwaba ! Bienvenue dans l'Ar\u00e8ne Diki-Diki, la sc\u00e8ne des talents africains. D\u00e9couvre les challenges, soutiens tes talents favoris et, quand tu es pr\u00eat, lance-toi. Le continent a besoin de ton talent !");
  const [onlyNew, setOnlyNew] = useState(false);
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const toast = (type: 'ok' | 'err', text: string) => { setFlash({ type, text }); window.setTimeout(() => setFlash(null), 4500); };

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

  const supprimer = async (u: Membre) => {
    if (!admin?.token) return;
    const ok = window.confirm(
      'Supprimer cet utilisateur ?\n\n'
      + (u.name || 'Sans nom') + '\n'
      + (u.email || u.phone || '') + '\n\n'
      + 'Son compte sera banni (reversible) : il ne pourra plus se connecter. Confirmer ?'
    );
    if (!ok) return;
    setBusy(u.id);
    try {
      const r = await fetch(`${API}/users/${u.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${admin.token}` } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { window.alert((d && d.message) || 'Suppression impossible.'); return; }
      charger();
    } catch { window.alert('Erreur reseau : suppression impossible.'); }
    finally { setBusy(null); }
  };

  const reactiver = async (u: Membre) => {
    if (!admin?.token) return;
    const ok = window.confirm('Reactiver le compte de ' + (u.name || u.email || 'cet utilisateur') + ' ?');
    if (!ok) return;
    setBusy(u.id);
    try {
      const r = await fetch(`${API}/users/${u.id}/reactiver`, { method: 'PATCH', headers: { Authorization: `Bearer ${admin.token}` } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { window.alert((d && d.message) || 'Reactivation impossible.'); return; }
      charger();
    } catch { window.alert('Erreur reseau : reactivation impossible.'); }
    finally { setBusy(null); }
  };

  const supprimerDefinitif = async (u: Membre) => {
    if (!admin?.token) return;
    const ok = window.confirm(
      'SUPPRESSION DEFINITIVE (irreversible)\n\n'
      + (u.name || 'Sans nom') + '\n'
      + (u.email || u.phone || '') + '\n\n'
      + 'Ce compte banni sera efface DEFINITIVEMENT de la base. Cette action est IRREVERSIBLE.\n'
      + 'Elle sera refusee si le compte a le moindre historique (transactions, votes, participations).\n\n'
      + 'Confirmer la suppression definitive ?'
    );
    if (!ok) return;
    setBusy(u.id);
    try {
      const r = await fetch(`${API}/users/${u.id}/definitif`, { method: 'DELETE', headers: { Authorization: `Bearer ${admin.token}` } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { window.alert((d && d.message) || 'Suppression definitive impossible.'); return; }
      charger();
    } catch { window.alert('Erreur reseau : suppression definitive impossible.'); }
    finally { setBusy(null); }
  };



  const membresCibles = (): Membre[] => {
    if (compose && compose.mode === 'one' && compose.user) return [compose.user];
    let list = membres.filter(u => {
      const role = String(u.role || '').toLowerCase();
      const estAdmin = role === 'admin' || role === 'moderateur' || role === 'moderator';
      return !estAdmin && u.status !== 'banned';
    });
    if (onlyNew) {
      const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
      list = list.filter(u => { const t = Date.parse(u.created_at); return !isNaN(t) && t >= cutoff; });
    }
    return list;
  };

  const envoyerMessage = async () => {
    if (!admin?.token) return;
    const cibles = membresCibles();
    if (cibles.length === 0) { toast('err', 'Aucun destinataire.'); return; }
    if (!msgTexte.trim()) { toast('err', 'Le message est vide.'); return; }
    setSending(true);
    try {
      const r = await fetch(`${API}/admin/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
        body: JSON.stringify({ user_ids: cibles.map(u => u.id), title: msgTitre, message: msgTexte }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast('err', (d && d.message) || 'Envoi impossible.'); return; }
      const n = (d.sent ?? cibles.length);
      setCompose(null);
      toast('ok', '\u2705 Message envoy\u00e9 \u00e0 ' + n + ' membre' + (n > 1 ? 's' : '') + '.');
    } catch { toast('err', 'Erreur reseau : envoi impossible.'); }
    finally { setSending(false); }
  };

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return s || '—'; }
  };
  const fmtWallet = (n: number | null) => (n ?? 0).toLocaleString('fr-FR');

  const nbBannis = membres.filter(u => u.status === 'banned').length;
  const filtered = membres.filter(u => {
    if (!showBannis && u.status === 'banned') return false;
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

  const btnSup: React.CSSProperties = { background: 'rgba(230,60,60,0.10)', border: '1px solid rgba(230,60,60,0.35)', color: '#ff7070', fontSize: 12, fontWeight: 700, padding: '6px 11px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' };
  const btnReact: React.CSSProperties = { background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.35)', color: '#4ade80', fontSize: 12, fontWeight: 700, padding: '6px 11px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' };
  const btnDef: React.CSSProperties = { background: 'rgba(230,60,60,0.85)', border: '1px solid #ff4d4d', color: '#fff', fontSize: 12, fontWeight: 700, padding: '6px 11px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' };
  const btnMsg: React.CSSProperties = { background: 'rgba(74,163,255,0.12)', border: '1px solid rgba(74,163,255,0.4)', color: '#7ab8ff', fontSize: 12, fontWeight: 700, padding: '6px 11px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 1100 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne, sans-serif', margin: 0 }}>👥 Utilisateurs</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setCompose({ mode: 'group' })} style={{ background: 'rgba(74,163,255,0.14)', border: '1px solid rgba(74,163,255,0.4)', color: '#7ab8ff', fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>✉️ Message de bienvenue</button>
              <button onClick={() => setShowBannis(v => !v)} style={{ background: showBannis ? 'rgba(230,60,60,0.14)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (showBannis ? 'rgba(230,60,60,0.4)' : '#2a2a3a'), color: showBannis ? '#ff8a8a' : '#9a9ab0', fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>
                {showBannis ? '🙈 Masquer les bannis' : `👁 Afficher les bannis${nbBannis ? ' (' + nbBannis + ')' : ''}`}
              </button>
              <button onClick={charger} style={{ background: 'rgba(255,170,0,0.10)', border: '1px solid rgba(255,170,0,0.3)', color: OR, fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>↻ Rafraîchir</button>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#8a8aa8', margin: '0 0 18px' }}>
            {loading ? 'Chargement…' : `${membres.length} membre${membres.length > 1 ? 's' : ''} inscrit${membres.length > 1 ? 's' : ''}${nbBannis && !showBannis ? ` · ${nbBannis} banni${nbBannis > 1 ? 's' : ''} masqué${nbBannis > 1 ? 's' : ''}` : ''}`}
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
                    <th style={{ ...th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td style={{ ...td, fontWeight: 600, opacity: u.status === 'banned' ? 0.5 : 1 }}>
                        {u.name || '—'}
                        {u.status === 'banned' && <span style={{ marginLeft: 8, background: 'rgba(230,60,60,0.15)', color: '#ff7070', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>banni</span>}
                      </td>
                      <td style={{ ...td, color: '#b8b2a4' }}>{u.email || '—'}</td>
                      <td style={{ ...td, color: '#b8b2a4' }}><TelAvecDrapeau phone={u.phone} /></td>
                      <td style={td}>{roleBadge(u.role)}</td>
                      <td style={{ ...td, textAlign: 'right', color: OR, fontWeight: 700 }}>{fmtWallet(u.wallet)} F</td>
                      <td style={{ ...td, color: '#8a8aa8' }}>{fmtDate(u.created_at)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {(() => {
                          const role = String(u.role || '').toLowerCase();
                          const estAdmin = role === 'admin' || role === 'moderateur' || role === 'moderator';
                          const estMoi = !!admin?.email && u.email === admin.email;
                          if (estAdmin || estMoi) return <span style={{ color: '#4a4a5a', fontSize: 12 }}>—</span>;
                          if (u.status === 'banned') return (
                            <span style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button onClick={() => reactiver(u)} disabled={busy === u.id} style={btnReact}>{busy === u.id ? '…' : '↺ Réactiver'}</button>
                              <button onClick={() => supprimerDefinitif(u)} disabled={busy === u.id} style={btnDef} title="Effacer definitivement de la base (irreversible)">{busy === u.id ? '…' : '✖ Supprimer définitivement'}</button>
                            </span>
                          );
                          return (
                            <span style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button onClick={() => setCompose({ mode: 'one', user: u })} style={btnMsg}>✉️ Message</button>
                              <button onClick={() => supprimer(u)} disabled={busy === u.id} style={btnSup}>{busy === u.id ? '…' : '🗑 Supprimer'}</button>
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {compose && (() => {
          const cibles = membresCibles();
          const estGroupe = compose.mode === 'group';
          return (
            <div onClick={() => !sending && setCompose(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#12121c', border: '1px solid rgba(74,163,255,0.3)', borderRadius: 14, padding: 22, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, color: '#fff', margin: '0 0 4px' }}>✉️ Message de bienvenue</h3>
                <p style={{ fontSize: 12.5, color: '#8a8aa8', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Envoi d’une notification in-app (gratuite, visible dans « Notifications » du membre). Aucun SMS n’est envoyé.
                </p>

                <div style={{ background: '#0d0d16', border: '1px solid #1e1e2e', borderRadius: 10, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#e8e0d0' }}>
                  {estGroupe ? (
                    <span><b style={{ color: '#7ab8ff' }}>{cibles.length}</b> destinataire{cibles.length > 1 ? 's' : ''} (membres, hors admins et bannis).</span>
                  ) : (
                    <span>Destinataire : <b style={{ color: '#7ab8ff' }}>{compose.user?.name || compose.user?.email || compose.user?.phone || 'membre'}</b></span>
                  )}
                </div>

                {estGroupe && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#b8b2a4', marginBottom: 14, cursor: 'pointer' }}>
                    <input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)} />
                    Seulement les nouveaux inscrits (7 derniers jours)
                  </label>
                )}

                <div style={{ marginBottom: 13 }}>
                  <label style={{ display: 'block', fontSize: 12.5, color: '#b9b9c8', marginBottom: 5, fontWeight: 700 }}>Titre</label>
                  <input type="text" value={msgTitre} maxLength={100} onChange={e => setMsgTitre(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #2c2c44', background: '#0a0a12', color: '#fff', fontSize: 14 }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12.5, color: '#b9b9c8', marginBottom: 5, fontWeight: 700 }}>Message</label>
                  <textarea value={msgTexte} maxLength={2000} onChange={e => setMsgTexte(e.target.value)} rows={5} style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #2c2c44', background: '#0a0a12', color: '#fff', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={envoyerMessage} disabled={sending || cibles.length === 0} style={{ background: 'linear-gradient(135deg,#2f9de0,#38d3ef)', color: '#012', border: 'none', fontWeight: 800, fontSize: 14, padding: '11px 18px', borderRadius: 10, cursor: sending ? 'default' : 'pointer', opacity: (sending || cibles.length === 0) ? 0.6 : 1 }}>{sending ? '\u2026' : ('Envoyer \u00e0 ' + cibles.length + ' membre' + (cibles.length > 1 ? 's' : ''))}</button>
                  <button onClick={() => setCompose(null)} disabled={sending} style={{ background: 'none', border: '1px solid #26263a', color: '#b9b9c8', fontSize: 13, padding: '11px 18px', borderRadius: 10, cursor: 'pointer' }}>Annuler</button>
                </div>
              </div>
            </div>
          );
        })()}

        </div>
      </div>
        {flash && (
          <div style={{ position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, maxWidth: 'calc(100vw - 32px)',
            background: flash.type === 'ok' ? 'rgba(27,175,122,0.16)' : 'rgba(230,60,60,0.16)',
            border: '1px solid ' + (flash.type === 'ok' ? 'rgba(27,175,122,0.6)' : 'rgba(230,60,60,0.6)'),
            color: flash.type === 'ok' ? '#4ade80' : '#ff7070', fontSize: 14, fontWeight: 700,
            padding: '13px 20px', borderRadius: 12, boxShadow: '0 12px 30px -8px rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={() => setFlash(null)} role="status">
            {flash.text}
          </div>
        )}

    </AdminGuard>
  );
}
