'use client';
// frontend/app/admin/challenges/creer-appel/page.tsx
// MODE MODÉRATEUR — Ouvrir un appel (challenge) sans être candidat ni fournir de vidéo. /*DKDK_MODERATEUR_APPEL*/
// Les candidats rejoignent ensuite via le Mur des appels. Aucune logique d'argent ici.
import { AdminGuard }   from '../../../components/admin/AdminGuard';
import { AdminSidebar } from '../../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../../components/admin/AdminAuthContext';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

const FORMATS = ['C2', 'C4', 'C6', 'C8', 'C12', 'C16'];

function slug(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function CreerAppelInner() {
  const { admin } = useAdminAuth();
  const search = useSearchParams();
  const editId = (search?.get('id') || '').trim(); /*DKDK_MODERATEUR_APPEL — mode edition si ?id=*/
  const [categorie, setCategorie]   = useState<'artistique' | 'sport'>('artistique');
  const [discipline, setDiscipline] = useState('');
  const [formatCode, setFormatCode] = useState('C2');
  const [modele, setModele]         = useState<'bloc' | 'parcours'>('bloc');
  const [mode, setMode]             = useState<'normal' | 'improvisation'>('normal');
  const [niveau, setNiveau]         = useState(1);
  const [allowGroups, setAllowGroups] = useState(false);
  // sport
  const [art, setArt]         = useState('');
  const [epreuve, setEpreuve] = useState('');
  const [regle, setRegle]     = useState('');
  // sujets par étape (un libellé/morceau par vidéo)
  const [sujets, setSujets] = useState<string[]>(['']);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState('');
  const [ok, setOk]     = useState('');
  // Panneau OBJECTIFS — miroir de la taxonomie (aucun montant en dur) /*DKDK_TAXO_OBJECTIF*/
  const [taxo, setTaxo]         = useState<any>(null);
  const [taxoLoad, setTaxoLoad] = useState(false);

  // Mode ÉDITION : charge l'appel existant et pré-remplit le formulaire /*DKDK_MODERATEUR_APPEL*/
  useEffect(() => {
    if (!editId) return;
    fetch(`${API}/brackets/${editId}/appel`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (!j?.success || !j.data) return;
        const d = j.data;
        const isSport = d.categorie === 'sport';
        setCategorie(isSport ? 'sport' : 'artistique');
        if (isSport) { setArt(d.discipline || ''); setEpreuve(d.style || ''); }
        else { setDiscipline(d.discipline || ''); }
        if (d.max_participants) setFormatCode('C' + d.max_participants);
        if (d.modele) setModele(d.modele === 'parcours' ? 'parcours' : 'bloc');
        if (d.mode) setMode(d.mode === 'improvisation' ? 'improvisation' : 'normal');
        setAllowGroups(!!d.allow_groups);
        const nv = Math.max(1, Math.min(4, d.niveau || (d.etapes?.length || 1)));
        setNiveau(nv);
        const et = (d.etapes || []).slice().sort((a: any, b: any) => a.round_number - b.round_number).map((e: any) => e.libelle || '');
        const arr: string[] = [];
        for (let i = 0; i < nv; i++) arr.push(et[i] || '');
        setSujets(arr);
      })
      .catch(() => {});
  }, [editId]);

  // Interroge la taxonomie dès qu'on change modèle / format / niveau /*DKDK_TAXO_OBJECTIF*/
  useEffect(() => {
    if (!admin?.token || !formatCode) { setTaxo(null); return; }
    let annule = false;
    setTaxoLoad(true);
    const q = `format_code=${encodeURIComponent(formatCode)}&modele=${modele}&niveau=${niveau}`;
    fetch(`${API}/brackets/taxonomie/objectif?${q}`, { headers: { Authorization: `Bearer ${admin.token}` }, cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (!annule) setTaxo(j?.success ? j.data : null); })
      .catch(() => { if (!annule) setTaxo(null); })
      .finally(() => { if (!annule) setTaxoLoad(false); });
    return () => { annule = true; };
  }, [admin?.token, formatCode, modele, niveau]);

  // niveau = nombre de vidéos/étapes → autant de champs "sujet"
  const changerNiveau = (n: number) => {
    const v = Math.max(1, Math.min(4, n || 1));
    setNiveau(v);
    setSujets(prev => {
      const a = [...prev];
      while (a.length < v) a.push('');
      return a.slice(0, v);
    });
  };

  const majSujet = (i: number, val: string) => setSujets(prev => prev.map((s, idx) => idx === i ? val : s));
  const fmtF = (n: number) => (n || 0).toLocaleString('fr-FR') + ' F';

  const submit = async () => {
    setMsg(''); setOk('');
    if (categorie === 'artistique' && !discipline.trim()) { setMsg('Indique la discipline (ex. Humour, Chant, Danse).'); return; }
    if (categorie === 'sport' && (!art.trim() || !epreuve.trim())) { setMsg('Indique l’art et l’épreuve.'); return; }
    setBusy(true);
    try {
      const body: any = {
        categorie, format_code: formatCode, modele, mode, niveau, allow_groups: allowGroups,
        discipline: categorie === 'sport' ? art.trim() : discipline.trim(),
        style: categorie === 'sport' ? epreuve.trim() : '',
        sujets: sujets.map((libelle, i) => ({ round_number: i + 1, libelle: libelle.trim() })).filter(s => s.libelle),
      };
      if (categorie === 'sport') {
        body.sport = {
          art: art.trim(), art_slug: slug(art),
          epreuve: epreuve.trim(), epreuve_slug: slug(epreuve),
          regle: regle.trim() || null,
        };
      }
      const r = await fetch(editId ? `${API}/brackets/admin/appel/${editId}` : `${API}/brackets/admin/appel`, {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin?.token}` },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.success) { setMsg(j?.error || 'Erreur lors de l’enregistrement.'); }
      else if (editId) { setOk('✅ Appel mis à jour !'); }
      else if (j.data?.created === false) { setOk('Un appel identique est déjà ouvert (id ' + String(j.data.bracket_id || '').slice(0, 8) + ').'); }
      else { setOk('✅ Appel ouvert ! (id ' + String(j.data?.bracket_id || '').slice(0, 8) + ') — il apparaît sur le Mur des appels.'); }
    } catch { setMsg('Erreur réseau.'); }
    setBusy(false);
  };

  const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: OR, marginBottom: 6 };
  const inp: React.CSSProperties = {
    width: '100%', background: '#15151c', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10,
    padding: '10px 12px', fontSize: 14, color: '#e8e0d0', outline: 'none', boxSizing: 'border-box',
  };
  const seg = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
    border: `1px solid ${active ? OR : 'rgba(255,255,255,0.14)'}`,
    background: active ? 'rgba(255,170,0,0.14)' : 'transparent', color: active ? OR : 'rgba(255,255,255,0.6)',
  });

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#e8e0d0' }}>
        <AdminSidebar />
        <div style={{ flex: 1, padding: '32px 28px', maxWidth: 680 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: OR, margin: '0 0 6px' }}>
            {editId ? 'Éditer l’appel' : 'Ouvrir un appel'}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
            Crée un challenge ouvert aux candidatures, <b>sans</b> être candidat ni fournir de vidéo. Les talents le rejoindront depuis le Mur des appels.
          </p>

          {/* Catégorie */}
          <label style={lbl}>Catégorie</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div onClick={() => setCategorie('artistique')} style={seg(categorie === 'artistique')}>🎭 Artistique</div>
            <div onClick={() => setCategorie('sport')} style={seg(categorie === 'sport')}>🥋 Sport</div>
          </div>

          {categorie === 'artistique' ? (
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Discipline</label>
              <input style={inp} list="disc-list" value={discipline} onChange={e => setDiscipline(e.target.value)} placeholder="Toute discipline : Danse, Chant, Humour, Poésie…" />
              <datalist id="disc-list">
                <option value="Danse" /><option value="Chant" /><option value="Humour" /><option value="Instrument" />
                <option value="A cappella" /><option value="Poésie" /><option value="Conte" />
              </datalist>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Champ libre : tu peux saisir n’importe quelle discipline.</div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Art martial / Sport</label>
                <input style={inp} value={art} onChange={e => setArt(e.target.value)} placeholder="Taekwondo…" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Épreuve</label>
                <input style={inp} value={epreuve} onChange={e => setEpreuve(e.target.value)} placeholder="Enchaînement de poomsae…" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Règle <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(optionnel)</span></label>
                <input style={inp} value={regle} onChange={e => setRegle(e.target.value)} placeholder="Consigne affichée au candidat…" />
              </div>
            </>
          )}

          {/* Format */}
          <label style={lbl}>Format</label>
          <select style={{ ...inp, marginBottom: 16 }} value={formatCode} onChange={e => setFormatCode(e.target.value)}>
            {FORMATS.map(f => <option key={f} value={f} style={{ background: '#15151c' }}>{f}</option>)}
          </select>

          {/* Modèle */}
          <label style={lbl}>Modèle</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div onClick={() => setModele('bloc')} style={seg(modele === 'bloc')}>Bloc groupé</div>
            <div onClick={() => setModele('parcours')} style={seg(modele === 'parcours')}>Parcours d’étapes</div>
          </div>

          {/* Mode */}
          <label style={lbl}>Mode</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div onClick={() => setMode('normal')} style={seg(mode === 'normal')}>Normal</div>
            <div onClick={() => setMode('improvisation')} style={seg(mode === 'improvisation')}>Improvisation</div>
          </div>

          {/* Niveau (nb de vidéos) */}
          <label style={lbl}>Nombre de vidéos par candidat (niveau)</label>
          <select style={{ ...inp, marginBottom: 16 }} value={niveau} onChange={e => changerNiveau(parseInt(e.target.value, 10))}>
            {[1, 2, 3, 4].map(n => <option key={n} value={n} style={{ background: '#15151c' }}>{n} vidéo{n > 1 ? 's' : ''}</option>)}
          </select>

          {/* Panneau OBJECTIFS — lu depuis la taxonomie (jamais en dur) /*DKDK_TAXO_OBJECTIF*/}
          <div style={{ marginBottom: 16, background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.28)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: OR, marginBottom: 8 }}>
              🎯 Objectif à collecter <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>— lu dans la taxonomie ({modele === 'bloc' ? 'Bloc groupé' : 'Parcours d’étapes'})</span>
            </div>
            {taxoLoad ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Lecture de la taxonomie…</div>
            ) : !taxo ? (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Choisis un modèle et un format.</div>
            ) : taxo.modele === 'bloc' ? (
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: taxo.objectif ? '#fff' : '#ff9b6b' }}>
                  {taxo.objectif ? fmtF(taxo.objectif) : '— non défini'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '2px 0 10px' }}>
                  Objectif du challenge — {formatCode} · niveau {taxo.niveau} ({niveau} vidéo{niveau > 1 ? 's' : ''})
                </div>
                {(taxo.grille || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Grille du format — croissante avec le niveau (plus de vidéos = plus exigeant) :</div>
                    {taxo.grille.map((g: any) => {
                      const actif = g.niveau === taxo.niveau;
                      return (
                        <div key={g.niveau} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 8px', borderRadius: 6, marginBottom: 2,
                          background: actif ? 'rgba(255,170,0,0.16)' : 'transparent', border: `1px solid ${actif ? 'rgba(255,170,0,0.45)' : 'transparent'}` }}>
                          <span style={{ color: actif ? OR : 'rgba(255,255,255,0.6)', fontWeight: actif ? 700 : 400 }}>Niveau {g.niveau} · {g.niveau} vidéo{g.niveau > 1 ? 's' : ''}{actif ? ' ← ce challenge' : ''}</span>
                          <span style={{ color: g.objectif ? (actif ? '#fff' : 'rgba(255,255,255,0.75)') : '#ff9b6b', fontWeight: actif ? 800 : 600 }}>{g.objectif ? fmtF(g.objectif) : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!taxo.objectif && <div style={{ fontSize: 11, color: '#ff9b6b', marginTop: 6 }}>⚠️ Niveau {niveau} non défini dans la taxonomie — à renseigner avant d’ouvrir l’appel.</div>}
              </div>
            ) : (
              <div>
                {(taxo.etapes || []).map((e: any) => (
                  <div key={e.etape} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Étape {e.etape}{e.classement ? ' · classement' : ''}</span>
                    <span style={{ color: e.objectif ? '#fff' : '#ff9b6b', fontWeight: 700 }}>{e.objectif ? fmtF(e.objectif) : '— non défini'}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingTop: 8, marginTop: 4 }}>
                  <span style={{ color: OR, fontWeight: 700 }}>Enveloppe totale</span>
                  <span style={{ color: OR, fontWeight: 800 }}>{fmtF(taxo.enveloppe)}</span>
                </div>
                {!taxo.complet && <div style={{ fontSize: 11, color: '#ff9b6b', marginTop: 6 }}>⚠️ Certaines étapes n’ont pas d’objectif dans la taxonomie.</div>}
              </div>
            )}
            {taxo && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 10 }}>
              Source : {taxo.source}. Ce montant n’est pas un gain : c’est le seuil à collecter pour fermer {modele === 'bloc' ? 'le challenge' : 'l’étape'}.
            </div>}
          </div>

          {/* Sujets par étape */}
          <label style={lbl}>Sujet / morceau imposé par étape</label>
          <div style={{ marginBottom: 16 }}>
            {sujets.map((s, i) => (
              <input key={i} style={{ ...inp, marginBottom: 8 }} value={s} onChange={e => majSujet(i, e.target.value)}
                placeholder={`Étape ${i + 1} — ex. Le Rémunérateur · Faveur Mukoko`} />
            ))}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              Laisse vide si l’étape est libre (ex. improvisation).
            </div>
          </div>

          {/* Groupes */}
          <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={allowGroups} onChange={e => setAllowGroups(e.target.checked)} />
            Autoriser les groupes (sinon solo)
          </label>

          {msg && <div style={{ color: '#ff6b6b', fontSize: 13, margin: '16px 0' }}>{msg}</div>}
          {ok && <div style={{ color: '#4ade80', fontSize: 13, margin: '16px 0' }}>{ok}</div>}

          <button onClick={submit} disabled={busy}
            style={{ marginTop: 20, width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: busy ? 'default' : 'pointer',
              background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#150c00', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, opacity: busy ? 0.7 : 1 }}>
            {busy ? (editId ? 'Enregistrement…' : 'Création…') : (editId ? 'Enregistrer les modifications' : 'Ouvrir l’appel')}
          </button>
        </div>
      </div>
    </AdminGuard>
  );
}

export default function CreerAppelPage() {
  return (
    <Suspense fallback={null}>
      <CreerAppelInner />
    </Suspense>
  );
}
