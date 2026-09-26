'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
// Upload direct vers Railway (le proxy /api est plafonné à 4,5 Mo).
const API_DIRECT = process.env.NEXT_PUBLIC_API_ORIGIN ?? API;
const OR = '#FFAA00';

interface Annonce {
  id: string; annonceur: string; titre?: string; description?: string;
  media_url?: string; media_type?: string; lien_url?: string; pays_cibles?: string;
  frequence?: number; date_debut?: string; date_fin?: string; plafond_impressions?: number | null;
  actif: boolean; impressions?: number; clics?: number; created_at?: string;
}

const vide = { annonceur: '', titre: '', description: '', lien_url: '', pays_cibles: '', frequence: '5', date_debut: '', date_fin: '', plafond_impressions: '' };

export default function AdminPublicitePage() {
  const { admin } = useAdminAuth();
  const [liste, setListe]   = useState<Annonce[]>([]);
  const [f, setF]           = useState<any>({ ...vide });
  const [file, setFile]     = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState(false);
  const [info, setInfo]     = useState('');
  const [pubAccueil, setPubAccueil] = useState(false);

  const charger = () => {
    if (!admin?.token) return;
    setLoading(true);
    fetch(`${API}/annonces`, { headers: { Authorization: `Bearer ${admin.token}` }, cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setListe(d?.data ?? []))
      .catch(() => setInfo('Erreur de chargement.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [admin]);

  useEffect(() => {
    fetch(`${API}/settings`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { const v = (d?.data || []).find((x:any)=>x.key==='pub_accueil_active')?.value; setPubAccueil(String(v).trim()==='1'||String(v).trim()==='true'); })
      .catch(()=>{});
  }, []);

  const basculerAccueil = async () => {
    const next = !pubAccueil;
    setPubAccueil(next); setBusy(true); setInfo('');
    try {
      const r = await fetch(`${API}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
        body: JSON.stringify({ key: 'pub_accueil_active', value: next ? '1' : '0', description: 'Afficher les publicites sur l accueil et le Mur (1=oui, 0=non)' }),
      });
      if (!r.ok) throw new Error();
      setInfo(next ? '✓ Pubs affichées sur l’accueil & le Mur.' : '✓ Pubs coupées de l’accueil.');
    } catch { setPubAccueil(!next); setInfo('✗ Erreur lors du changement.'); }
    finally { setBusy(false); }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const enregistrer = async () => {
    if (!f.annonceur.trim()) { setInfo('✗ Indiquez le nom de l’entreprise.'); return; }
    setBusy(true); setInfo('');
    try {
      const body: any = {
        annonceur: f.annonceur, titre: f.titre, description: f.description, lien_url: f.lien_url,
        pays_cibles: f.pays_cibles, frequence: Number(f.frequence) || 5,
        date_debut: f.date_debut || null, date_fin: f.date_fin || null,
        plafond_impressions: f.plafond_impressions ? Number(f.plafond_impressions) : null,
      };
      if (file) {
        body.file_base64 = await toBase64(file);
        body.file_name = file.name;
        body.mime_type = file.type || 'video/mp4';
      }
      const r = await fetch(`${API_DIRECT}/annonces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      setInfo('✓ Publicité enregistrée.');
      setF({ ...vide }); setFile(null);
      charger();
    } catch { setInfo('✗ Erreur lors de l’enregistrement.'); }
    finally { setBusy(false); }
  };

  const basculer = async (a: Annonce) => {
    setBusy(true);
    try {
      await fetch(`${API}/annonces/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
        body: JSON.stringify({ actif: !a.actif }),
      });
      charger();
    } finally { setBusy(false); }
  };

  const supprimer = async (a: Annonce) => {
    if (!confirm(`Supprimer la publicité de « ${a.annonceur} » ?`)) return;
    setBusy(true);
    try {
      await fetch(`${API}/annonces/${a.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${admin.token}` } });
      charger();
    } finally { setBusy(false); }
  };

  const champ = (label: string, key: string, ph = '', type = 'text') => (
    <div style={{ marginBottom: 13 }}>
      <label style={{ display: 'block', fontSize: 12.5, color: '#b9b9c8', marginBottom: 5 }}>{label}</label>
      <input type={type} value={f[key]} placeholder={ph} onChange={e => setF({ ...f, [key]: e.target.value })}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,170,0,0.22)', background: '#0a0a0f', color: '#fff', fontSize: 14 }} />
    </div>
  );

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 900 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: OR, margin: '0 0 6px' }}>📣 Publicité</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>
            Dépose les spots des entreprises. Le site les diffuse entre deux prestations et compte les vues tout seul.
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,170,0,0.7)', margin: '0 0 24px' }}>
            💡 L’argent de la publicité est une recette de la plateforme — il n’entre jamais dans la cagnotte des votes.
          </p>

          {info && <p style={{ fontSize: 13, color: info.startsWith('✓') ? '#4ade80' : '#f87171', fontWeight: 600, marginBottom: 16 }}>{info}</p>}

          {/* Interrupteur : afficher les pubs sur l'accueil & le Mur */}
          <div style={{ background: '#12121a', border: '1px solid rgba(255,170,0,0.14)', borderRadius: 14, padding: 16, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff' }}>📍 Afficher les pubs sur l'accueil &amp; le Mur</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, lineHeight: 1.5 }}>Emplacement « en attendant » — visible tout de suite, sans vidéos. Les pubs « Actives » ci-dessous s'affichent au public tant que c'est allumé.</div>
              </div>
              <button onClick={basculerAccueil} disabled={busy} aria-label="Basculer l'affichage des pubs sur l'accueil" style={{ flexShrink: 0, width: 58, height: 32, borderRadius: 20, border: 'none', cursor: busy ? 'default' : 'pointer', background: pubAccueil ? '#1baf7a' : '#3a3a48', position: 'relative', transition: 'background .15s' }}>
                <span style={{ position: 'absolute', top: 3, left: pubAccueil ? 29 : 3, width: 26, height: 26, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: pubAccueil ? '#4ade80' : '#7a7a8c', fontWeight: 700, marginTop: 8 }}>{pubAccueil ? '● ALLUMÉ — les pubs actives passent sur l’accueil & le Mur' : '○ COUPÉ — aucune pub affichée au public'}</div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 8, background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 10, padding: '10px 12px', lineHeight: 1.5 }}>💡 Quand tes challenges démarreront, <b>coupe</b> cet interrupteur : les pubs quitteront l'accueil et passeront « entre deux prestations » (dès que cette 2ᵉ partie sera installée).</div>
          </div>

          {/* Formulaire */}
          <div style={{ background: '#12121a', border: '1px solid rgba(255,170,0,0.14)', borderRadius: 14, padding: 18, marginBottom: 22 }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#fff', margin: '0 0 14px' }}>➕ Nouvelle publicité</h3>
            {champ('Nom de l’entreprise (annonceur) *', 'annonceur', 'ex. MTN Bénin')}
            <div style={{ marginBottom: 13 }}>
              <label style={{ display: 'block', fontSize: 12.5, color: '#b9b9c8', marginBottom: 5 }}>Vidéo du spot (MP4, 10 s conseillé) ou image</label>
              <input type="file" accept="video/mp4,video/quicktime,image/*" onChange={e => setFile(e.target.files?.[0] || null)}
                style={{ fontSize: 13, color: '#b9b9c8' }} />
              {file && <span style={{ fontSize: 12, color: OR, marginLeft: 8 }}>{file.name}</span>}
            </div>
            {champ('Accroche (titre affiché)', 'titre', 'ex. La connexion qui fait vibrer le continent')}
            {champ('Sous-texte (optionnel)', 'description', '')}
            {champ('Lien « En savoir plus » (optionnel)', 'lien_url', 'https://…')}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>{champ('Pays ciblé(s) — vide = tous', 'pays_cibles', 'BJ, TG')}</div>
              <div style={{ flex: 1, minWidth: 140 }}>{champ('Passe toutes les… vidéos', 'frequence', '5', 'number')}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>{champ('Début', 'date_debut', '', 'date')}</div>
              <div style={{ flex: 1, minWidth: 140 }}>{champ('Fin', 'date_fin', '', 'date')}</div>
              <div style={{ flex: 1, minWidth: 140 }}>{champ('Plafond de vues (optionnel)', 'plafond_impressions', '', 'number')}</div>
            </div>
            <button onClick={enregistrer} disabled={busy}
              style={{ background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, padding: '12px 20px', border: 'none', borderRadius: 10, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, marginTop: 4 }}>
              {busy ? 'Enregistrement…' : 'Enregistrer la publicité'}
            </button>
          </div>

          {/* Liste */}
          <div style={{ background: '#12121a', border: '1px solid rgba(255,170,0,0.14)', borderRadius: 14, padding: 18 }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, color: '#fff', margin: '0 0 14px' }}>📋 Publicités</h3>
            {loading && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Chargement…</p>}
            {!loading && liste.length === 0 && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Aucune publicité pour l’instant.</p>}
            {!loading && liste.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: '#7a7a8c', fontSize: 11.5, textTransform: 'uppercase' }}>
                      <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #26263a' }}>Annonceur</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #26263a' }}>Statut</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #26263a' }}>Vues</th>
                      <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #26263a' }}>Clics</th>
                      <th style={{ padding: '8px 10px', borderBottom: '1px solid #26263a' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {liste.map(a => (
                      <tr key={a.id}>
                        <td style={{ padding: '11px 10px', borderBottom: '1px solid #26263a' }}>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{a.annonceur}</div>
                          {a.titre && <div style={{ fontSize: 11.5, color: '#7a7a8c' }}>{a.titre}</div>}
                        </td>
                        <td style={{ padding: '11px 10px', borderBottom: '1px solid #26263a' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                            background: a.actif ? 'rgba(27,175,122,.16)' : 'rgba(122,122,140,.16)',
                            color: a.actif ? '#1baf7a' : '#7a7a8c',
                            border: `1px solid ${a.actif ? 'rgba(27,175,122,.4)' : '#26263a'}` }}>
                            {a.actif ? '● Active' : 'En pause'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 10px', borderBottom: '1px solid #26263a', fontFamily: 'Syne, sans-serif', fontWeight: 800, color: OR }}>{(a.impressions ?? 0).toLocaleString('fr-FR')}</td>
                        <td style={{ padding: '11px 10px', borderBottom: '1px solid #26263a' }}>{(a.clics ?? 0).toLocaleString('fr-FR')}</td>
                        <td style={{ padding: '11px 10px', borderBottom: '1px solid #26263a', whiteSpace: 'nowrap' }}>
                          <button onClick={() => basculer(a)} disabled={busy} style={{ background: 'none', border: '1px solid #26263a', color: '#b9b9c8', fontSize: 12, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', marginRight: 6 }}>{a.actif ? 'Pause' : 'Activer'}</button>
                          <button onClick={() => supprimer(a)} disabled={busy} style={{ background: 'none', border: '1px solid rgba(225,6,0,.4)', color: '#e10600', fontSize: 12, padding: '5px 10px', borderRadius: 7, cursor: 'pointer' }}>Supprimer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>La colonne « Vues » est ta preuve à montrer à l’entreprise pour la facturer et la fidéliser.</p>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
