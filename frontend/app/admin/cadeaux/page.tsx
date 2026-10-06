'use client';
// frontend/app/admin/cadeaux/page.tsx
// DKDK_TIRAGE — Fidélité « Les Échos » PHASE 5 : Cadeaux & tirages (ADMIN).
// Cadeaux MATÉRIELS, JAMAIS du cash. Tirage provably-fair (préparer = commit, exécuter = reveal).
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';
const INK = '#e8e0d0';
const LINE = 'rgba(255,255,255,0.1)';
const F = (n: number) => Math.round(Number(n || 0)).toLocaleString('fr-FR') + ' F';

function seasonActuelle(): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return d.getFullYear() + '-S' + q;
}
function seasonPrecedente(): string {
  const d = new Date();
  let y = d.getFullYear();
  let q = Math.floor(d.getMonth() / 3) + 1;
  q -= 1; if (q === 0) { q = 4; y -= 1; }
  return y + '-S' + q;
}

interface Lot { id?: string; type: string; mois: number | null; libelle: string; valeur: number; actif: boolean; ordre: number; statut_min?: string | null; lettre?: string | null; }
interface Tirage { id: string; type: string; saison: string; statut: string; graine_hash: string; graine?: string; pool_taille: number; pot_disponible: number; pot_utilise: number; nb_gagnants: number; executed_at?: string; }

const LOT_VIDE: Lot = { type: 'local', mois: 1, libelle: '', valeur: 0, actif: true, ordre: 0, statut_min: null, lettre: null };
const STATUTS: { code: string; nom: string }[] = [
  { code: '', nom: 'Tous statuts' },
  { code: 'messager', nom: 'Le Messager' },
  { code: 'porteparole', nom: 'Le Porte-parole' },
  { code: 'ambassadeur', nom: "L'Ambassadeur" },
  { code: 'heraut', nom: 'Le Héraut' },
];
const statutCourt = (c?: string | null) => (({ messager: 'Messager', porteparole: 'Porte-parole', ambassadeur: 'Ambassadeur', heraut: 'Héraut' } as Record<string, string>)[c || ''] || 'Tous');
// Dégradés couleurs (vraies teintes Diki : vert #1FB673, jaune #FFC233, rouge logo #FE0000 ; Héraut = arc-en-ciel)
const GRAD = {
  vert: 'linear-gradient(135deg,#1FB673,#12935C)',
  jaune: 'linear-gradient(135deg,#FFC233,#E6A200)',
  rouge: 'linear-gradient(135deg,#FE0000,#C80000)',
  heraut: 'linear-gradient(to top right,#FF3B23,#FF9F1C,#FFD21E,#1FB673,#2B8CFF,#A24BFF)',
  grand: 'linear-gradient(135deg,#FFC24D,#E08A00)',
} as const;
const STATUT_GRAD: Record<string, string> = { messager: GRAD.vert, porteparole: GRAD.jaune, ambassadeur: GRAD.rouge, heraut: GRAD.heraut };
const LETTRE_GRAD: Record<string, string> = { C: GRAD.vert, B: GRAD.jaune, A: GRAD.rouge };
const BADGE_SHADOW = '0 1px 3px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)';
const encreStatut = (c?: string | null) => (c === 'ambassadeur' ? '#fff' : '#140a02');
const encreLettre = (l?: string | null) => (l === 'A' ? '#fff' : '#140a02');

export default function AdminCadeauxPage() {
  const { admin } = useAdminAuth();
  const [pots, setPots] = useState<any>(null);
  const [catalogue, setCatalogue] = useState<Lot[]>([]);
  const [tirages, setTirages] = useState<Tirage[]>([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(''); const [err, setErr] = useState('');
  const [form, setForm] = useState<Lot>(LOT_VIDE);
  const [prep, setPrep] = useState<{ type: string; saison: string; mode: string; lettre: string }>({ type: 'local', saison: seasonPrecedente(), mode: 'saison', lettre: 'A' });
  const [detail, setDetail] = useState<any>(null);
  const [lotsChoisis, setLotsChoisis] = useState<Record<string, boolean>>({});

  const H = useCallback(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${admin?.token}` }), [admin?.token]);

  const charger = useCallback(() => {
    if (!admin?.token) return;
    setLoading(true); setErr('');
    fetch(`${API}/tirages/dashboard`, { cache: 'no-store', headers: H() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) { setPots(d.data.pots); setCatalogue(d.data.catalogue || []); setTirages(d.data.tirages || []); } })
      .catch(() => setErr('Erreur de chargement.'))
      .finally(() => setLoading(false));
  }, [admin?.token, H]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [admin?.token]);

  const sauverLot = () => {
    if (!form.libelle.trim()) { setErr('Libellé requis.'); return; }
    setInfo(''); setErr('');
    fetch(`${API}/tirages/catalog`, { method: 'POST', headers: H(), body: JSON.stringify(form) })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success) { setInfo('✅ Cadeau enregistré.'); setForm({ ...LOT_VIDE, type: form.type }); charger(); } else setErr('Échec.'); })
      .catch(() => setErr('Erreur réseau.'));
  };
  const supprimerLot = (id?: string) => {
    if (!id) return;
    fetch(`${API}/tirages/catalog/${id}`, { method: 'DELETE', headers: H() })
      .then(() => charger()).catch(() => setErr('Erreur réseau.'));
  };

  const preparer = () => {
    setInfo(''); setErr('');
    fetch(`${API}/tirages/prepare`, { method: 'POST', headers: H(), body: JSON.stringify(prep) })
      .then(r => r.json())
      .then(d => { if (d?.success) { setInfo(`✅ Tirage préparé — ${d.data.pool_taille} participant(s) éligible(s). Empreinte publiée.`); charger(); } else setErr('Échec : ' + (d?.error || '')); })
      .catch(() => setErr('Erreur réseau.'));
  };

  const tousStatuts = () => {
    if (!prep.saison.trim()) { setErr('Indique la saison.'); return; }
    if (!window.confirm('Lancer un tirage SIMULTANÉ sur TOUS les statuts ? Une seule graine, chaque statut reçoit ses cadeaux. La graine sera révélée et les gagnants désignés (irréversible).')) return;
    setInfo(''); setErr('');
    fetch(`${API}/tirages/run-all-statuts`, { method: 'POST', headers: H(), body: JSON.stringify({ saison: prep.saison, mode: prep.mode, lettre: prep.mode === 'lettre' ? prep.lettre : undefined }) })
      .then(r => r.json())
      .then(d => { if (d?.success) { const b = (d.data.breakdown || []).map((x: any) => `${x.statut} ${x.gagnants}/${x.pool}`).join(' · '); setInfo(`🎁 Tirage simultané exécuté — ${d.data.nb_gagnants} gagnant(s). ${b}`); if (d.data.id) voirDetail(d.data.id); charger(); } else setErr('Échec : ' + (d?.error || '')); })
      .catch(() => setErr('Erreur réseau.'));
  };

  const voirDetail = (id: string) => {
    setLotsChoisis({});
    fetch(`${API}/tirages/${id}`, { cache: 'no-store', headers: H() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setDetail(d.data); })
      .catch(() => setErr('Erreur réseau.'));
  };

  const executer = (t: Tirage) => {
    const ids = Object.keys(lotsChoisis).filter(k => lotsChoisis[k]);
    if (!ids.length) { setErr('Choisis au moins un lot.'); return; }
    if (!window.confirm('Lancer le tirage ? La graine sera révélée et les gagnants désignés (irréversible).')) return;
    setInfo(''); setErr('');
    fetch(`${API}/tirages/${t.id}/execute`, { method: 'POST', headers: H(), body: JSON.stringify({ catalogIds: ids }) })
      .then(r => r.json())
      .then(d => { if (d?.success) { setInfo(`🎁 Tirage exécuté — ${d.data.nb_gagnants} gagnant(s).`); voirDetail(t.id); charger(); } else setErr('Échec : ' + (d?.error || '')); })
      .catch(() => setErr('Erreur réseau.'));
  };

  const majRemise = (gid: string, statut: string) => {
    fetch(`${API}/tirages/gagnant/${gid}/remise`, { method: 'POST', headers: H(), body: JSON.stringify({ statut }) })
      .then(() => { if (detail?.tirage?.id) voirDetail(detail.tirage.id); }).catch(() => setErr('Erreur réseau.'));
  };

  const card: React.CSSProperties = { background: '#15151c', border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, marginBottom: 18 };
  const inp: React.CSSProperties = { background: '#0f0f16', color: INK, border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '7px 10px', fontSize: 14 };
  const btn = (bg: string): React.CSSProperties => ({ background: bg, color: '#120b00', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' });
  const gTit: React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: OR, marginBottom: 3 };

  const lotsDuType = catalogue.filter(l => l.type === (detail?.tirage?.type || 'local') && l.actif);

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: INK }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '24px 28px', maxWidth: 1000 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>🎁 Cadeaux &amp; tirages</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 18px' }}>
            Fonds Cadeaux → cadeaux <b>matériels</b> (jamais du cash). Tirage vérifiable : « Préparer » publie une empreinte, « Exécuter » révèle la graine et désigne les gagnants.
          </p>

          {/*DKDK_GUIDE — guide intégré « Ton guide Diki-Diki » (Cadeaux & tirages)*/}
          <details style={{ background: '#15151c', border: '1px solid rgba(255,170,0,0.28)', borderRadius: 14, padding: '14px 16px', marginBottom: 18 }}>
            <summary style={{ cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: OR }}>🧭 Ton guide Diki-Diki — comment utiliser cette page</summary>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13.5, lineHeight: 1.6, color: INK }}>

              <div>
                <div style={gTit}>🎁 À quoi sert cette page</div>
                Le <b>Fonds Cadeaux</b> finance des cadeaux <b>matériels</b> (tech, expériences, parcelle) — <b>jamais du cash</b>. Règle d&apos;or&nbsp;: on ne distribue <b>jamais plus que ce qui a été collecté</b>.
              </div>

              <div>
                <div style={gTit}>💰 Les 3 pots (tout en haut)</div>
                <b>Réserve totale</b> = tout le Fonds accumulé. <b>Pot LOCAL</b> = enveloppe des tirages de saison. <b>Pot GRAND</b> = gros lots accumulés. Le montant affiché est le <b>disponible</b>&nbsp;: un tirage est <b>refusé</b> s&apos;il dépasse ce disponible.
              </div>

              <div>
                <div style={gTit}>➕ Créer un cadeau</div>
                <b>Type</b>&nbsp;: Mensuel (local) ou Grand lot. <b>Mois</b>&nbsp;: le mois du calendrier. <b>Statut</b>&nbsp;: qui peut le recevoir (Le Messager → Le Héraut, ou «&nbsp;Tous&nbsp;»). <b>Lettre C/B/A</b>&nbsp;: le mois <i>dans la saison</i> (C = 1er, B = 2e, A = 3e). Puis <b>Libellé</b> + <b>Valeur cible (F)</b>, et <b>Ajouter</b>. Dans la liste&nbsp;: ✎ pour modifier, 🗑 pour supprimer. Les badges montrent le mois (ou GRAND), le <b>statut</b>, et la <b>lettre</b> en violet.
              </div>

              <div>
                <div style={gTit}>🎯 Statut + Lettre = la précision</div>
                Les deux ensemble rangent tes <b>listes mensuelles par statut</b>. Exemple&nbsp;: un cadeau «&nbsp;<b>Ambassadeur / B</b>&nbsp;» = le lot du <b>2e mois</b> de la saison de L&apos;Ambassadeur. Tu construis ainsi 3 listes (C, B, A) par statut.
              </div>

              <div>
                <div style={gTit}>🎲 Tirage classique (un statut / un type)</div>
                <b>Préparer</b> publie une <b>empreinte</b> (preuve scellée) et fige la liste des participants. <b>Exécuter</b> révèle la <b>graine</b> et désigne les gagnants de façon <b>vérifiable</b>. Tu choisis les lots avant d&apos;exécuter. (Irréversible.)
              </div>

              <div>
                <div style={gTit}>⚡ Tirage simultané « Tous les statuts » (bouton violet)</div>
                Une <b>seule graine</b> pour tout&nbsp;: chaque statut reçoit <b>ses</b> cadeaux (ceux dont le champ «&nbsp;Statut&nbsp;» correspond). Deux modes&nbsp;:<br />
                • <b>Saison entière (C + B + A)</b>&nbsp;: tire dans les 3 mois à la fois (le tirage unique de fin de saison).<br />
                • <b>Par lettre</b>&nbsp;: tire seulement dans la lettre choisie (C, B ou A).<br />
                <b>Éligibles</b>&nbsp;: les votants qui ont <b>validé la saison</b> (≥ 3 mois) — la lettre ne change que les cadeaux, pas qui a droit de gagner.
              </div>

              <div>
                <div style={gTit}>📦 Remise des cadeaux</div>
                Après un tirage, chaque gagnant passe par&nbsp;: <b>à remettre</b> → <b>remis</b> (ou <b>annulé</b>). C&apos;est le suivi de livraison du cadeau — <b>jamais</b> un versement d&apos;argent.
              </div>

              <div style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: '#f87171', marginBottom: 3 }}>🔒 Règles d&apos;or</div>
                Jamais plus que collecté&nbsp;· cadeaux <b>matériels</b> uniquement (jamais de cash)&nbsp;· aucun tirage réel avant la <b>validation juridique</b>.
              </div>

            </div>
          </details>

          {info && <div style={{ ...card, borderColor: 'rgba(74,222,128,0.4)', color: '#4ade80', padding: '10px 14px' }}>{info}</div>}
          {err &&  <div style={{ ...card, borderColor: 'rgba(248,113,113,0.4)', color: '#f87171', padding: '10px 14px' }}>{err}</div>}

          {loading ? <p style={{ opacity: 0.6 }}>Chargement…</p> : (
          <>
            {/* POTS */}
            <div style={card}>
              <div style={{ fontSize: 12, letterSpacing: 0.5, opacity: 0.6, marginBottom: 10 }}>RÉSERVE FONDS CADEAUX</div>
              {pots ? (
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <Pot titre="Réserve totale" val={pots.reserve_totale} sub={`split local ${pots.split_local_pct}%`} />
                  <Pot titre="Pot LOCAL (saison)" val={pots.local.disponible} sub={`alloué ${F(pots.local.alloue)} · utilisé ${F(pots.local.utilise)}`} color="#4ade80" />
                  <Pot titre="Pot GRAND (gros lots)" val={pots.grand.disponible} sub={`alloué ${F(pots.grand.alloue)} · utilisé ${F(pots.grand.utilise)}`} color={OR} />
                </div>
              ) : <p style={{ opacity: 0.6 }}>Aucune donnée.</p>}
            </div>

            {/* CATALOGUE */}
            <div style={card}>
              <div style={{ fontSize: 12, letterSpacing: 0.5, opacity: 0.6, marginBottom: 10 }}>CATALOGUE DES CADEAUX (12 listes mensuelles + grands lots)</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, mois: e.target.value === 'grand' ? null : (form.mois || 1) })} style={inp}>
                  <option value="local">Mensuel (local)</option>
                  <option value="grand">Grand lot</option>
                </select>
                {form.type === 'local' && (
                  <select value={form.mois || 1} onChange={e => setForm({ ...form, mois: parseInt(e.target.value, 10) })} style={inp}>
                    {['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                )}
                <select value={form.statut_min || ''} onChange={e => setForm({ ...form, statut_min: e.target.value || null })} style={inp} title="Statut qui peut recevoir ce cadeau">
                  {STATUTS.map(sx => <option key={sx.code} value={sx.code}>{sx.nom}</option>)}
                </select>
                {form.type === 'local' && (
                  <select value={form.lettre || ''} onChange={e => setForm({ ...form, lettre: e.target.value || null })} style={inp} title="Lettre de la saison (C = 1er mois, B = 2e, A = 3e)">
                    <option value="">Lettre —</option>
                    <option value="C">C (mois 1)</option>
                    <option value="B">B (mois 2)</option>
                    <option value="A">A (mois 3)</option>
                  </select>
                )}
                <input placeholder="Libellé (ex. Smartphone, Moto…)" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} style={{ ...inp, flex: 1, minWidth: 180 }} />
                <input type="number" placeholder="Valeur cible (F)" value={form.valeur || ''} onChange={e => setForm({ ...form, valeur: parseInt(e.target.value || '0', 10) })} style={{ ...inp, width: 140, textAlign: 'right' }} />
                <button onClick={sauverLot} style={btn(OR)}>{form.id ? 'Modifier' : 'Ajouter'}</button>
                {form.id && <button onClick={() => setForm({ ...LOT_VIDE, type: form.type })} style={{ ...btn('#2a2a3a'), color: INK }}>Annuler</button>}
              </div>
              {catalogue.length === 0 ? <p style={{ opacity: 0.6, fontSize: 13 }}>Aucun cadeau — commence par en ajouter un (gabarit à remplir).</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {catalogue.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <span style={{ minWidth: 46, textAlign: 'center', fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 7,
                        background: l.type === 'grand' ? GRAD.grand : (l.lettre ? LETTRE_GRAD[l.lettre] : 'rgba(74,222,128,0.14)'),
                        color: l.type === 'grand' ? '#140a02' : (l.lettre ? encreLettre(l.lettre) : '#4ade80'),
                        boxShadow: (l.type === 'grand' || l.lettre) ? BADGE_SHADOW : 'none' }}>{l.type === 'grand' ? 'GRAND' : 'M' + (l.mois || '?')}</span>
                      <span style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 999, fontWeight: 800, whiteSpace: 'nowrap',
                        background: l.statut_min ? STATUT_GRAD[l.statut_min] : 'rgba(255,255,255,0.06)',
                        color: l.statut_min ? encreStatut(l.statut_min) : 'rgba(232,224,208,0.5)',
                        border: l.statut_min ? 'none' : `1px solid ${LINE}`,
                        boxShadow: l.statut_min ? BADGE_SHADOW : 'none' }}>{statutCourt(l.statut_min)}</span>
                      {l.type === 'local' && l.lettre && <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 999, fontWeight: 800, whiteSpace: 'nowrap',
                        background: LETTRE_GRAD[l.lettre] || 'rgba(255,255,255,0.08)', color: encreLettre(l.lettre), boxShadow: BADGE_SHADOW }}>{l.lettre}</span>}
                      <span style={{ flex: 1 }}>{l.libelle}{!l.actif && <em style={{ opacity: 0.5 }}> (inactif)</em>}</span>
                      <span style={{ fontWeight: 700, color: OR }}>{F(l.valeur)}</span>
                      <button onClick={() => setForm(l)} style={{ ...btn('#2a2a3a'), color: INK, padding: '4px 10px' }}>✎</button>
                      <button onClick={() => supprimerLot(l.id)} style={{ ...btn('rgba(248,113,113,0.15)'), color: '#f87171', padding: '4px 10px' }}>🗑</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRÉPARER UN TIRAGE */}
            <div style={card}>
              <div style={{ fontSize: 12, letterSpacing: 0.5, opacity: 0.6, marginBottom: 10 }}>PRÉPARER UN TIRAGE</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={prep.type} onChange={e => setPrep({ ...prep, type: e.target.value })} style={inp}>
                  <option value="local">Tirage local de saison</option>
                  <option value="grand">Grand tirage (gros lots)</option>
                </select>
                <input placeholder="Saison (ex. 2026-S3)" value={prep.saison} onChange={e => setPrep({ ...prep, saison: e.target.value })} style={{ ...inp, width: 150 }} />
                <button onClick={preparer} style={btn(OR)}>Préparer (publier l'empreinte)</button>
                <span style={{ fontSize: 12, opacity: 0.5 }}>éligibles : votants ayant validé la saison{prep.type === 'grand' ? ' (statut élevé)' : ' (dès Le Messager)'}</span>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${LINE}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={prep.mode} onChange={e => setPrep({ ...prep, mode: e.target.value })} style={inp} title="Mode du tirage simultané">
                  <option value="saison">Saison entière (C + B + A)</option>
                  <option value="lettre">Par lettre</option>
                </select>
                {prep.mode === 'lettre' && (
                  <select value={prep.lettre} onChange={e => setPrep({ ...prep, lettre: e.target.value })} style={inp} title="Lettre à tirer">
                    <option value="C">Lettre C (mois 1)</option>
                    <option value="B">Lettre B (mois 2)</option>
                    <option value="A">Lettre A (mois 3)</option>
                  </select>
                )}
                <button onClick={tousStatuts} style={btn('#7c3aed')}>🎲 Tous les statuts (simultané)</button>
                <span style={{ fontSize: 12, opacity: 0.5 }}>une seule graine · chaque statut reçoit ses cadeaux (champ « Statut »). Mode « saison » = C + B + A ensemble ; « par lettre » = seulement la lettre choisie · utilise la saison ci-dessus</span>
              </div>
            </div>

            {/* LISTE DES TIRAGES */}
            <div style={card}>
              <div style={{ fontSize: 12, letterSpacing: 0.5, opacity: 0.6, marginBottom: 10 }}>TIRAGES</div>
              {tirages.length === 0 ? <p style={{ opacity: 0.6, fontSize: 13 }}>Aucun tirage pour le moment.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tirages.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <span style={{ width: 60, fontWeight: 700, color: t.type === 'grand' ? OR : '#4ade80' }}>{t.type === 'grand' ? 'GRAND' : 'LOCAL'}</span>
                      <span style={{ width: 80 }}>{t.saison}</span>
                      <span style={{ flex: 1, opacity: 0.7 }}>{t.pool_taille} éligibles · {t.statut === 'execute' ? `${t.nb_gagnants} gagnant(s) · ${F(t.pot_utilise)}` : 'empreinte publiée'}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: t.statut === 'execute' ? 'rgba(74,222,128,0.15)' : 'rgba(255,170,0,0.15)', color: t.statut === 'execute' ? '#4ade80' : OR }}>{t.statut}</span>
                      <button onClick={() => voirDetail(t.id)} style={{ ...btn('#2a2a3a'), color: INK, padding: '4px 10px' }}>Détail</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DÉTAIL TIRAGE */}
            {detail?.tirage && (
              <div style={{ ...card, borderColor: 'rgba(255,170,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Tirage {detail.tirage.type === 'grand' ? 'GRAND' : 'LOCAL'} · {detail.tirage.saison}</div>
                  <button onClick={() => setDetail(null)} style={{ ...btn('#2a2a3a'), color: INK, padding: '4px 10px' }}>Fermer</button>
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.6, wordBreak: 'break-all', marginBottom: 10 }}>
                  Empreinte (commit) : {detail.tirage.graine_hash}
                  {detail.tirage.graine && <><br />Graine révélée : {detail.tirage.graine}</>}
                </div>

                {detail.tirage.statut === 'prepare' && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Choisis les lots à attribuer (1 lot = 1 gagnant) :</div>
                    {lotsDuType.length === 0 ? <p style={{ fontSize: 13, color: '#f87171' }}>Aucun cadeau actif de ce type dans le catalogue.</p> : lotsDuType.map(l => (
                      <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0' }}>
                        <input type="checkbox" checked={!!lotsChoisis[l.id!]} onChange={e => setLotsChoisis({ ...lotsChoisis, [l.id!]: e.target.checked })} />
                        {l.libelle} <span style={{ color: OR, fontWeight: 700 }}>{F(l.valeur)}</span>
                      </label>
                    ))}
                    <button onClick={() => executer(detail.tirage)} style={{ ...btn(OR), marginTop: 10 }}>🎲 Exécuter le tirage</button>
                  </div>
                )}

                {detail.gagnants && detail.gagnants.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7, margin: '10px 0 6px' }}>GAGNANTS</div>
                    {detail.gagnants.map((g: any) => (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 4 }}>
                        <span style={{ flex: 1 }}>{g.pseudo} — <b>{g.lot_libelle}</b> <span style={{ color: OR }}>{F(g.lot_valeur)}</span></span>
                        <select value={g.statut_remise} onChange={e => majRemise(g.id, e.target.value)} style={{ ...inp, padding: '4px 8px' }}>
                          <option value="a_remettre">À remettre</option>
                          <option value="remis">Remis</option>
                          <option value="annule">Annulé</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}

function Pot({ titre, val, sub, color }: { titre: string; val: number; sub?: string; color?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 180, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ fontSize: 11.5, opacity: 0.6 }}>{titre}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || '#e8e0d0', margin: '2px 0' }}>{F(val)}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.45 }}>{sub}</div>}
    </div>
  );
}
