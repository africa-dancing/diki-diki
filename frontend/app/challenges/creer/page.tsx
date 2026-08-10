'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';
const CATEGORIES = ['Arts de la scene', 'Musique', 'Arts de la parole'];
const MODES = [{ val: 'normal', label: 'Normal' }, { val: 'improvisation', label: 'Improvisation' }];
const DISCIPLINES = ['Danse', 'Chant', 'A cappella', 'Instrument', 'Humour', 'Poesie'];
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

interface Video { id: string; title?: string; status: string; }

export default function CreerChallengePage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [categorie, setCategorie] = useState('');
  const [mode, setMode] = useState('normal'); /*DKDK_MODE*/
  const [modele, setModele] = useState('parcours'); /*DKDK_MODELE*/
  const [niveau, setNiveau] = useState(1); /*DKDK_NIVEAU*/
  const [blocVideos, setBlocVideos] = useState<string[]>([]); /*DKDK_BLOC_VIDEOS*/
  const [musiques, setMusiques] = useState<any[]>([]); /*DKDK_MUSIQUE_SELECT*/
  const [trackId, setTrackId] = useState('');
  const [formats, setFormats] = useState<any[]>([]); /*DKDK_FORMAT_UI*/
  const [formatCode, setFormatCode] = useState('');
  /*DKDK_CHEMIN_B*/
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [disciplineId, setDisciplineId] = useState('');
  const [champs, setChamps] = useState<any[]>([]);
  const [champsValeurs, setChampsValeurs] = useState<Record<string, string>>({});
  const [existeDeja, setExisteDeja] = useState(false); /*DKDK_CREER_REJOINDRE*/
  const [paiementRequis, setPaiementRequis] = useState(false); /*DKDK_PAIEMENT_UI*/
  const [montantInscription, setMontantInscription] = useState(0);
  const [autreTexte, setAutreTexte] = useState<Record<string, string>>({}); /*DKDK_AUTRE_UI*/
  const [nouvMorceauArtiste, setNouvMorceauArtiste] = useState(''); /*DKDK_NOUVEAU_MORCEAU*/
  const [nouvMorceauTitre, setNouvMorceauTitre] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [style, setStyle] = useState('');
  const [videoId, setVideoId] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  /*DKDK_SPORT_CREATE — creation explicite d'un challenge sport (art -> epreuve -> niveau de difficulte)*/
  const [typeCreation, setTypeCreation] = useState<'artistique' | 'sport'>('artistique');
  const [sportEpreuves, setSportEpreuves] = useState<any[]>([]);
  const [sportArt, setSportArt] = useState('');            // sport_slug
  const [sportEpreuveNom, setSportEpreuveNom] = useState(''); // nom de l'epreuve (regroupe les paliers)
  const [sportDiff, setSportDiff] = useState('');          // slug du niveau de difficulte choisi

  useEffect(() => {
    const t = getToken();
    if (!t) { router.push('/auth/login'); return; }
    /*DKDK_READ_TRACK*/
    const params = new URLSearchParams(window.location.search);
    const preTrack = params.get('track');
    if (preTrack) { setMode('normal'); setTrackId(preTrack); }
    const preVideo = params.get('video'); /*DKDK_PRE_VIDEO*/
    if (preVideo) setVideoId(preVideo);
    fetch(`${API}/videos/my`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then((d: any) => {
        const all: Video[] = d.videos ?? [];
        const approved = all.filter(v => v.status === 'approved');
        setVideos(approved);
        if (approved[0]) setVideoId(approved[0].id);
      })
      .catch(() => {});
    fetch(`${API}/musiques`)
      .then(r => r.json())
      .then((d: any) => { setMusiques(d.data ?? []); })
      .catch(() => {});
    fetch(`${API}/challenge-formats`)
      .then(r => r.json())
      .then((d: any) => { setFormats(Array.isArray(d) ? d : (d.data ?? [])); })
      .catch(() => {});
    /*DKDK_SPORT_CREATE — charger les epreuves sport actives (art -> epreuve -> niveau de difficulte)*/
    fetch(`${API}/sport/epreuves`)
      .then(r => r.json())
      .then((d: any) => { setSportEpreuves(Array.isArray(d) ? d : (d.data ?? [])); })
      .catch(() => {});
    /*DKDK_CHEMIN_B_LOAD*/
    fetch(`${API}/categories`)
      .then(r => r.json())
      .then((cats: any) => {
        const list = Array.isArray(cats) ? cats : (cats?.data ?? []);
        const loisirs = list.find((c: any) => (c.name || '').toLowerCase() === 'loisirs');
        if (!loisirs) return;
        return fetch(`${API}/categories/${loisirs.id}/disciplines`)
          .then(r => r.json())
          .then((ds: any) => {
            const arr = Array.isArray(ds) ? ds : (ds?.data ?? []);
            setDisciplines(arr.filter((d: any) => (d.name || '').toLowerCase() !== 'sport'));
          });
      })
      .catch(() => {});
  }, [router]);

  /*DKDK_CREER_REJOINDRE*/
  useEffect(() => {
    if (!formatCode || !disciplineId) { setExisteDeja(false); return; }
    const champs_valeurs = champs.map((ch: any) => ({ choix_id: champsValeurs[ch.id] })).filter((x: any) => x.choix_id);
    const t = getToken();
    fetch(`${API}/brackets/arena/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ discipline, mode, track_id: mode === 'normal' ? (trackId || undefined) : undefined, format_code: formatCode, champs_valeurs, video_id: videoId }), /*DKDK_PAIEMENT_UI*/
    })
      .then(r => r.json())
      .then((d: any) => {
        setExisteDeja(!!(d?.data?.exists));
        setPaiementRequis(!!(d?.data?.paiement_requis));
        setMontantInscription(d?.data?.montant ?? 0);
      })
      .catch(() => { setExisteDeja(false); setPaiementRequis(false); });
  }, [formatCode, disciplineId, discipline, mode, trackId, champs, champsValeurs, videoId]);

  /*DKDK_CHEMIN_B_CHAMPS*/
  const choisirDiscipline = async (id: string, nom: string) => {
    setDisciplineId(id);
    setDiscipline(nom);
    setChamps([]);
    setChampsValeurs({});
    if (!id) return;
    try {
      const cr = await fetch(`${API}/categories/disciplines/${id}/champs`);
      const cj = await cr.json();
      const listeChamps = (Array.isArray(cj) ? cj : (cj?.data ?? [])).filter((c: any) => c.type === 'liste');
      // charger les choix de chaque champ liste
      const enrichis = await Promise.all(listeChamps.map(async (ch: any) => {
        const rr = await fetch(`${API}/categories/champs/${ch.id}/choix`);
        const rj = await rr.json();
        const choix = (Array.isArray(rj) ? rj : (rj?.data ?? []));
        return { ...ch, choix };
      }));
      setChamps(enrichis);
    } catch { /* silencieux */ }
  };

  /*DKDK_SPORT_CREATE — derivations pour l'ecran sport (art -> epreuve -> niveau de difficulte)*/
  const _slug = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const sportArts = (() => {
    const seen: Record<string, boolean> = {}; const out: any[] = [];
    sportEpreuves.forEach((e: any) => { if (!seen[e.sport_slug]) { seen[e.sport_slug] = true; out.push({ slug: e.sport_slug, name: e.sport, emoji: e.emoji || '🏅' }); } });
    return out;
  })();
  const sportEpreuveNoms = (() => {
    const seen: Record<string, boolean> = {}; const out: string[] = [];
    sportEpreuves.filter((e: any) => e.sport_slug === sportArt).forEach((e: any) => { if (!seen[e.epreuve]) { seen[e.epreuve] = true; out.push(e.epreuve); } });
    return out;
  })();
  const sportRows = sportEpreuves.filter((e: any) => e.sport_slug === sportArt && e.epreuve === sportEpreuveNom);
  const sportDiffOptions = (() => {
    if (sportRows.length === 0) return [] as any[];
    // Cas foot/basket : plusieurs paliers (colonne niveau) -> chaque palier est un niveau de difficulte
    const withNiveau = sportRows.filter((r: any) => r.niveau != null);
    if (withNiveau.length > 0) {
      return withNiveau.slice().sort((a: any, b: any) => a.niveau - b.niveau)
        .map((r: any) => ({ slug: 'niv-' + r.niveau, label: 'Niveau ' + r.niveau, regle: r.regle, }));
    }
    // Cas arts martiaux : une seule ligne avec une liste de formes -> chaque forme est un niveau
    const row = sportRows[0];
    if (row && row.choix_liste) {
      return String(row.choix_liste).split(',').map((s: string) => s.trim()).filter(Boolean)
        .map((f: string, i: number) => ({ slug: _slug(f), label: f + ' (' + (i + 1) + ')', regle: row.regle, }));
    }
    if (row && row.choix_type === 'simple') { const out: any[] = []; for (let i = 1; i <= (row.choix_max || 10); i++) out.push({ slug: 'forme-' + i, label: 'Forme ' + i, regle: row.regle }); return out; }
    if (row && row.choix_type === 'plage') { const out: any[] = []; for (let i = 2; i <= (row.choix_max || 10); i++) out.push({ slug: '1a' + i, label: '1 à ' + i, regle: row.regle }); return out; }
    return [] as any[]; // pas de sous-niveau (ex : Dunks) : l'epreuve EST la cible
  })();
  const sportHasDiff = sportDiffOptions.length > 0;
  const sportRegle = sportHasDiff
    ? (sportDiffOptions.find((o: any) => o.slug === sportDiff)?.regle || '')
    : (sportRows[0]?.regle || '');

  const submit = async () => {
    setMsg('');
    /*DKDK_SPORT_CREATE — parcours de creation sport : art -> epreuve -> niveau de difficulte -> 1 video*/
    if (typeCreation === 'sport') {
      if (!formatCode) { setMsg('Choisis un type de challenge.'); return; }
      if (!sportArt) { setMsg('Choisis un art.'); return; }
      if (!sportEpreuveNom) { setMsg('Choisis une epreuve.'); return; }
      if (sportHasDiff && !sportDiff) { setMsg('Choisis un niveau de difficulte.'); return; }
      if (!videoId) { setMsg('Choisis une video.'); return; }
      const artObj = sportArts.find((a: any) => a.slug === sportArt);
      const diffOpt = sportHasDiff ? sportDiffOptions.find((o: any) => o.slug === sportDiff) : null;
      const difficulteLabel = diffOpt ? diffOpt.label : '';
      const difficulteSlug = diffOpt ? diffOpt.slug : '';
      const styleLabel = sportEpreuveNom + (difficulteLabel ? ' · ' + difficulteLabel : '');
      setSubmitting(true);
      try {
        const t = getToken();
        const res = await fetch(`${API}/brackets/arena/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({
            video_id: videoId,
            categorie: 'Sport',
            discipline: artObj ? artObj.name : sportArt,
            style: styleLabel,
            format_code: formatCode,
            mode: 'normal', modele: 'parcours', niveau: 1,
            video_ids: [videoId],
            sport: {
              art: artObj ? artObj.name : sportArt,
              art_slug: sportArt,
              epreuve: sportEpreuveNom,
              epreuve_slug: _slug(sportEpreuveNom),
              difficulte: difficulteLabel,
              difficulte_slug: difficulteSlug,
              regle: sportRegle || '',
            },
          }),
        });
        const data = await res.json();
        if (!data.success) { setMsg(data.error || 'Erreur.'); setSubmitting(false); return; }
        router.push(`/challenges/${data.data.bracket_id}`);
      } catch { setMsg('Erreur reseau. Reessaie.'); setSubmitting(false); }
      return;
    }
        {modele === 'bloc' && niveau > 1 && videos.length > 0 && (
          <>
            {Array.from({ length: niveau - 1 }).map((_, i) => {
              const dejaPris = [videoId, ...blocVideos.filter((_, j) => j !== i)];
              return (
                <div key={i}>
                  <label style={labelStyle}>Vidéo {i + 2} du bloc</label>
                  <select style={inputStyle} value={blocVideos[i] || ''} onChange={e => { const nv = [...blocVideos]; nv[i] = e.target.value; setBlocVideos(nv); }}>
                    <option value='' style={{ background: '#1a1a1f' }}>-- Choisir une vidéo --</option>
                    {videos.filter(v => !dejaPris.includes(v.id)).map(v => <option key={v.id} value={v.id} style={{ background: '#1a1a1f' }}>{v.title || v.id.slice(0, 8)}</option>)}
                  </select>
                </div>
              );
            })}
          </>
        )}
    /*DKDK_PAIEMENT_UI2 — confirmation B avant debit*/
    if (paiementRequis && videoId) {
      const ok = window.confirm('Cette vidéo est déjà engagée ailleurs. L\'inscrire dans ce challenge coûte ' + montantInscription.toLocaleString('fr-FR') + ' F, débités de ton solde. Confirmer ?');
      if (!ok) return;
    }
    /*DKDK_NOUVEAU_MORCEAU — creer le morceau si le candidat en ajoute un*/
    if (trackId === '__nouveau__') {
      const art = nouvMorceauArtiste.trim();
      const tit = nouvMorceauTitre.trim();
      if (!art || !tit) { setMsg('Renseigne l artiste et le titre du morceau.'); return; }
      try {
        const t = getToken();
        const rm = await fetch(`${API}/musiques`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ artiste: art, titre: tit, source: 'manuel' }),
        });
        const jm = await rm.json();
        if (!jm?.data?.id) { setMsg('Impossible d enregistrer le morceau.'); return; }
        setTrackId(jm.data.id);
      } catch { setMsg('Erreur reseau lors de l enregistrement du morceau.'); return; }
    }
    /*DKDK_AUTRE_UI — resoudre les choix "Autre" vers un vrai choix_id (existant ou cree)*/
    for (const ch of champs) {
      const cxSel = (ch.choix || []).find((c: any) => c.id === champsValeurs[ch.id]);
      if (cxSel && (cxSel.valeur || '').toLowerCase() === 'autre') {
        const txt = (autreTexte[ch.id] || '').trim();
        if (!txt) { setMsg('Precise ta valeur pour ' + ch.titre + '.'); return; }
        try {
          const t = getToken();
          const rr = await fetch(`${API}/categories/champs/${ch.id}/choix-ou-existant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
            body: JSON.stringify({ valeur: txt }),
          });
          const rj = await rr.json();
          if (!rj?.id) { setMsg('Impossible d enregistrer ' + txt + '.'); return; }
          // remplacer le choix "Autre" par le vrai choix, et l'ajouter a la liste locale pour l'affichage
          champsValeurs[ch.id] = rj.id;
          if (!(ch.choix || []).some((c: any) => c.id === rj.id)) ch.choix.push({ id: rj.id, valeur: rj.valeur });
        } catch { setMsg('Erreur reseau lors de l enregistrement du choix.'); return; }
      }
    }
    /*DKDK_SUBMIT_B*/
    const champsRequis = champs.length > 0 && champs.some((ch: any) => !champsValeurs[ch.id]);
    if (!disciplineId || !formatCode || champsRequis || !videoId) {
      setMsg('Remplis tous les champs et choisis une video.'); return;
    }
    /*DKDK_ETAPE4 — validation du bloc de videos*/
    const _bloc = (modele === 'bloc' && niveau > 1) ? blocVideos.slice(0, niveau - 1) : [];
    if (modele === 'bloc' && niveau > 1) {
      if (_bloc.length < niveau - 1 || _bloc.some(x => !x)) { setMsg('Choisis les ' + niveau + ' videos du bloc.'); return; }
      const _all = [videoId, ..._bloc];
      if (new Set(_all).size !== _all.length) { setMsg('Les videos du bloc doivent etre differentes.'); return; }
    }
    setSubmitting(true);
    try {
      const t = getToken();
      const res = await fetch(`${API}/brackets/arena/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify((() => {
          // Construire la liste des valeurs de champs choisies (avec titre + texte pour l'affichage)
          const champs_valeurs = champs.map((ch: any) => {
            const choixId = champsValeurs[ch.id];
            const cx = (ch.choix || []).find((c: any) => c.id === choixId);
            return { champ_id: ch.id, champ_titre: ch.titre, choix_id: choixId, valeur: cx ? cx.valeur : '' };
          }).filter((x: any) => x.valeur);
          // style de compat = concatenation des valeurs (pour le backend actuel)
          const styleCompat = champs_valeurs.map((x: any) => x.valeur).join(' / ');
          return {
            paiement_confirme: paiementRequis, /*DKDK_PAIEMENT_UI2*/
            video_id: videoId,
            categorie: 'Loisirs',
            format_code: formatCode,
            discipline: discipline.trim(),
            style: styleCompat,
            champs_valeurs,
            mode,
            track_id: mode === 'normal' ? (trackId || undefined) : undefined,
            modele, /*DKDK_ETAPE4*/
            niveau,
            video_ids: (modele === 'bloc' && niveau > 1) ? [videoId, ...blocVideos.slice(0, niveau - 1)] : [videoId],
          };
        })()),
      });
      const data = await res.json();
      if (!data.success) { setMsg(data.error || 'Erreur.'); setSubmitting(false); return; }
      router.push(`/challenges/${data.data.bracket_id}`);
    } catch {
      setMsg('Erreur reseau. Reessaie.'); setSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, marginBottom: 16 } as const;
  const labelStyle = { fontSize: 13, fontWeight: 700, color: OR, marginBottom: 6, display: 'block' } as const;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f0', fontFamily: 'DM Sans,sans-serif', paddingBottom: 80 }}>
      <Navbar />
      {/*DKDK_MAGENTA_HERO — halo magenta sous la top-bar (meme effet que la page Contact)*/}
      <div style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', paddingTop: 8 }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 4px' }}>
          <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '20px', textAlign: 'center', boxShadow: '0 8px 40px rgba(225,29,143,0.35)' }}>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: '#fefefe' }}>Créer un challenge</h1>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px' }}>

        {/*DKDK_SPORT_CREATE — choix Artistique vs Sport*/}
        <label style={labelStyle}>Que veux-tu créer ?</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[{ v: 'artistique', l: 'Discipline artistique' }, { v: 'sport', l: 'Sport' }].map(o => (
            <button key={o.v} onClick={() => { setTypeCreation(o.v as any); setMsg(''); }} style={{ flex: 1, minWidth: 140, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: typeCreation === o.v ? `1px solid ${OR}` : '1px solid rgba(255,255,255,0.15)', background: typeCreation === o.v ? `linear-gradient(135deg,#FF6B00,#FFD700)` : 'rgba(255,255,255,0.05)', color: typeCreation === o.v ? '#000' : 'rgba(255,255,255,0.6)' }}>{o.l}</button>
          ))}
        </div>

        {typeCreation === 'artistique' && (<>
        {/*DKDK_MODE_BLOC*/}
        <label style={labelStyle}>Mode</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {MODES.map(m => (
            <button key={m.val} onClick={() => setMode(m.val)} style={{ flex: 1, minWidth: 120, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: mode === m.val ? `1px solid ${OR}` : '1px solid rgba(255,255,255,0.15)', background: mode === m.val ? `linear-gradient(135deg,#FF6B00,#FFD700)` : 'rgba(255,255,255,0.05)', color: mode === m.val ? '#000' : 'rgba(255,255,255,0.6)' }}>{m.label}</button>
          ))}
        </div>
        {/*DKDK_CATEG_REMOVED — categorie toujours Loisirs, plus de selecteur*/}

        <label style={labelStyle}>Modèle de challenge</label>
        <select style={inputStyle} value={modele} onChange={e => { setModele(e.target.value); if (e.target.value === 'parcours') setNiveau(1); }}>
          <option value='parcours' style={{ background: '#1a1a1f' }}>Parcours d'étapes</option>
          <option value='bloc' style={{ background: '#1a1a1f' }}>Bloc groupé</option>
        </select>
        {modele === 'bloc' && (<>
        <label style={labelStyle}>Niveau (nombre de vidéos)</label>
        <select style={inputStyle} value={niveau} onChange={e => setNiveau(parseInt(e.target.value, 10))}>
          <option value={1} style={{ background: '#1a1a1f' }}>Niveau 1 — 1 vidéo</option>
          <option value={2} style={{ background: '#1a1a1f' }}>Niveau 2 — 2 vidéos</option>
          <option value={3} style={{ background: '#1a1a1f' }}>Niveau 3 — 3 vidéos</option>
          <option value={4} style={{ background: '#1a1a1f' }}>Niveau 4 — 4 vidéos</option>
        </select>
        </>)}
        <label style={labelStyle}>Format du challenge</label>
        <select style={inputStyle} value={formatCode} onChange={e => setFormatCode(e.target.value)}>
          <option value='' style={{ background: '#1a1a1f' }}>-- Choisir un format --</option>
          {formats.filter((ff: any) => !(modele === 'bloc' && niveau === 1 && ff.code === 'C2')).map((ff: any) => <option key={ff.code} value={ff.code} style={{ background: '#1a1a1f' }}>{ff.libelle}</option>)}
        </select>

        <label style={labelStyle}>Discipline</label>
        {/*DKDK_DISCIPLINE_SELECT*/}
        {/*DKDK_DISC_DYN*/}
        <select style={inputStyle} value={disciplineId} onChange={e => {
          const opt = disciplines.find((d: any) => d.id === e.target.value);
          choisirDiscipline(e.target.value, opt ? opt.name : '');
        }}>
          <option value='' style={{ background: '#1a1a1f' }}>-- Choisir une discipline --</option>
          {disciplines.map((d: any) => <option key={d.id} value={d.id} style={{ background: '#1a1a1f' }}>{d.name}</option>)}
        </select>

        {/*DKDK_MUSIQUE_COND — musique seulement si la discipline utilise un morceau*/}
        {mode === 'normal' && (disciplines.find((d: any) => d.id === disciplineId)?.avec_musique) && (
          <>
            <label style={labelStyle}>Musique imposee</label>
            <select style={inputStyle} value={trackId} onChange={e => setTrackId(e.target.value)}>
              <option value='' style={{ background: '#1a1a1f' }}>-- Choisir une musique --</option>
              {musiques.map((m: any) => <option key={m.id} value={m.id} style={{ background: '#1a1a1f' }}>{m.titre} - {m.artiste}</option>)}
              <option value='__nouveau__' style={{ background: '#1a1a1f', color: '#e11d8f' }}>+ Mon morceau n'est pas dans la liste</option>
            </select>
            {/*DKDK_NOUVEAU_MORCEAU*/}
            {trackId === '__nouveau__' && (
              <div style={{ marginTop: 8 }}>
                <input style={inputStyle} value={nouvMorceauArtiste} onChange={e => setNouvMorceauArtiste(e.target.value)} placeholder='Artiste du morceau' />
                <input style={inputStyle} value={nouvMorceauTitre} onChange={e => setNouvMorceauTitre(e.target.value)} placeholder='Titre du morceau' />
              </div>
            )}
          </>
        )}
        {/*DKDK_CHAMPS_DYN*/}
        {champs.map((ch: any) => (
          <div key={ch.id}>
            <label style={labelStyle}>{ch.titre}</label>
            <select style={inputStyle} value={champsValeurs[ch.id] || ''} onChange={e => setChampsValeurs({ ...champsValeurs, [ch.id]: e.target.value })}>
              <option value='' style={{ background: '#1a1a1f' }}>-- Choisir --</option>
              {(ch.choix || []).map((cx: any) => <option key={cx.id} value={cx.id} style={{ background: '#1a1a1f' }}>{cx.valeur}</option>)}
            </select>
            {/*DKDK_AUTRE_UI*/}
            {(() => {
              const cxSel = (ch.choix || []).find((c: any) => c.id === champsValeurs[ch.id]);
              const estAutre = cxSel && (cxSel.valeur || '').toLowerCase() === 'autre';
              return estAutre ? (
                <input style={inputStyle} value={autreTexte[ch.id] || ''} onChange={e => setAutreTexte({ ...autreTexte, [ch.id]: e.target.value })} placeholder={'Precise ' + (ch.titre || '').toLowerCase()} />
              ) : null;
            })()}
          </div>
        ))}
        </>)}

        {/*DKDK_SPORT_CREATE — ecran sport : Type -> Art -> Epreuve -> Niveau de difficulte*/}
        {typeCreation === 'sport' && (<>
        <label style={labelStyle}>Type de challenge</label>
        <select style={inputStyle} value={formatCode} onChange={e => setFormatCode(e.target.value)}>
          <option value='' style={{ background: '#1a1a1f' }}>-- Choisir un type --</option>
          {formats.map((ff: any) => <option key={ff.code} value={ff.code} style={{ background: '#1a1a1f' }}>{ff.libelle}</option>)}
        </select>

        <label style={labelStyle}>Art</label>
        <select style={inputStyle} value={sportArt} onChange={e => { setSportArt(e.target.value); setSportEpreuveNom(''); setSportDiff(''); }}>
          <option value='' style={{ background: '#1a1a1f' }}>-- Choisir un art --</option>
          {sportArts.map((a: any) => <option key={a.slug} value={a.slug} style={{ background: '#1a1a1f' }}>{a.emoji} {a.name}</option>)}
        </select>

        {sportArt && (<>
          <label style={labelStyle}>Épreuve</label>
          <select style={inputStyle} value={sportEpreuveNom} onChange={e => { setSportEpreuveNom(e.target.value); setSportDiff(''); }}>
            <option value='' style={{ background: '#1a1a1f' }}>-- Choisir une épreuve --</option>
            {sportEpreuveNoms.map((nom: string) => <option key={nom} value={nom} style={{ background: '#1a1a1f' }}>{nom}</option>)}
          </select>
        </>)}

        {sportEpreuveNom && sportHasDiff && (<>
          <label style={labelStyle}>Niveau de difficulté</label>
          <select style={inputStyle} value={sportDiff} onChange={e => setSportDiff(e.target.value)}>
            <option value='' style={{ background: '#1a1a1f' }}>-- Choisir un niveau --</option>
            {sportDiffOptions.map((o: any) => <option key={o.slug} value={o.slug} style={{ background: '#1a1a1f' }}>{o.label}</option>)}
          </select>
        </>)}

        {sportEpreuveNom && sportRegle && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: -6, marginBottom: 16, lineHeight: 1.5, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)' }}>
            📋 {sportRegle}
          </div>
        )}
        </>)}

        <label style={labelStyle}>Ta vidéo (approuvée)</label>
        {videos.length === 0 ? (
          <div style={{ ...inputStyle, color: 'rgba(255,255,255,0.4)' }}>Aucune vidéo approuvée. Soumets et fais approuver une vidéo d'abord.</div>
        ) : (
          <select style={inputStyle} value={videoId} onChange={e => setVideoId(e.target.value)}>
            {videos.map(v => <option key={v.id} value={v.id} style={{ background: '#1a1a1f' }}>{v.title || v.id.slice(0, 8)}</option>)}
          </select>
        )}

        {/*DKDK_PAIEMENT_UI2 — message A : video deja engagee ailleurs*/}
        {paiementRequis && videoId && (
          <div style={{ color: '#FFAA00', fontSize: 13, marginBottom: 16, textAlign: 'center', border: '1px solid rgba(255,170,0,0.35)', borderRadius: 10, padding: '10px', background: 'rgba(255,170,0,0.08)' }}>
            ⚠️ Cette vidéo est déjà engagée dans un autre challenge — l'inscrire ici coûte {montantInscription.toLocaleString('fr-FR')} F.
          </div>
        )}
        {msg && <div style={{ color: '#FF6B6B', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{msg}</div>}

        <button onClick={submit} disabled={submitting} style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 800, fontFamily: 'Syne,sans-serif', cursor: submitting ? 'wait' : 'pointer', border: 'none', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'En cours...' : (existeDeja ? 'Rejoindre le challenge' : 'Créer le challenge')}
        </button>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 16, lineHeight: 1.6, textAlign: 'center' }}>
          Conditions : compte vérifié · au moins une vidéo approuvée · avoir rechargé 1000 unités au moins une fois. Tu deviens le 1er inscrit.
        </div>
      </div>
    </div>
  );
}