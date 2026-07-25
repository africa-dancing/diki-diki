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
  const [musiques, setMusiques] = useState<any[]>([]); /*DKDK_MUSIQUE_SELECT*/
  const [trackId, setTrackId] = useState('');
  const [formats, setFormats] = useState<any[]>([]); /*DKDK_FORMAT_UI*/
  const [formatCode, setFormatCode] = useState('');
  /*DKDK_CHEMIN_B*/
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [disciplineId, setDisciplineId] = useState('');
  const [champs, setChamps] = useState<any[]>([]);
  const [champsValeurs, setChampsValeurs] = useState<Record<string, string>>({});
  const [discipline, setDiscipline] = useState('');
  const [style, setStyle] = useState('');
  const [videoId, setVideoId] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const submit = async () => {
    setMsg('');
    /*DKDK_SUBMIT_B*/
    const champsRequis = champs.length > 0 && champs.some((ch: any) => !champsValeurs[ch.id]);
    if (!disciplineId || !formatCode || champsRequis || !videoId) {
      setMsg('Remplis tous les champs et choisis une video.'); return;
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
            video_id: videoId,
            categorie: 'Loisirs',
            format_code: formatCode,
            discipline: discipline.trim(),
            style: styleCompat,
            champs_valeurs,
            mode,
            track_id: mode === 'normal' ? (trackId || undefined) : undefined,
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
      <div style={{ padding: '16px 24px 10px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(0.75rem,3vw,1.9rem)', lineHeight: 1.1, whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Podium Challenges <span style={{ background: 'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Arena</span>
        </h1>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: '#fefefe' }}>Créer un challenge</h1>
        </div>

        {/*DKDK_MODE_BLOC*/}
        <label style={labelStyle}>Mode</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {MODES.map(m => (
            <button key={m.val} onClick={() => setMode(m.val)} style={{ flex: 1, minWidth: 120, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: mode === m.val ? `1px solid ${OR}` : '1px solid rgba(255,255,255,0.15)', background: mode === m.val ? `linear-gradient(135deg,#FF6B00,#FFD700)` : 'rgba(255,255,255,0.05)', color: mode === m.val ? '#000' : 'rgba(255,255,255,0.6)' }}>{m.label}</button>
          ))}
        </div>
        {/*DKDK_CATEG_REMOVED — categorie toujours Loisirs, plus de selecteur*/}

        <label style={labelStyle}>Format du challenge</label>
        <select style={inputStyle} value={formatCode} onChange={e => setFormatCode(e.target.value)}>
          <option value='' style={{ background: '#1a1a1f' }}>-- Choisir un format --</option>
          {formats.map((ff: any) => <option key={ff.code} value={ff.code} style={{ background: '#1a1a1f' }}>{ff.libelle}</option>)}
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

        {mode === 'normal' && (
          <>
            <label style={labelStyle}>Musique imposee</label>
            <select style={inputStyle} value={trackId} onChange={e => setTrackId(e.target.value)}>
              <option value='' style={{ background: '#1a1a1f' }}>-- Choisir une musique --</option>
              {musiques.map((m: any) => <option key={m.id} value={m.id} style={{ background: '#1a1a1f' }}>{m.titre} - {m.artiste}</option>)}
            </select>
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
          </div>
        ))}

        <label style={labelStyle}>Ta vidéo (approuvée)</label>
        {videos.length === 0 ? (
          <div style={{ ...inputStyle, color: 'rgba(255,255,255,0.4)' }}>Aucune vidéo approuvée. Soumets et fais approuver une vidéo d'abord.</div>
        ) : (
          <select style={inputStyle} value={videoId} onChange={e => setVideoId(e.target.value)}>
            {videos.map(v => <option key={v.id} value={v.id} style={{ background: '#1a1a1f' }}>{v.title || v.id.slice(0, 8)}</option>)}
          </select>
        )}

        {msg && <div style={{ color: '#FF6B6B', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>{msg}</div>}

        <button onClick={submit} disabled={submitting} style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 800, fontFamily: 'Syne,sans-serif', cursor: submitting ? 'wait' : 'pointer', border: 'none', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Création...' : 'Lancer le challenge'}
        </button>

        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 16, lineHeight: 1.6, textAlign: 'center' }}>
          Conditions : compte vérifié · au moins une vidéo approuvée · avoir rechargé 1000 unités au moins une fois. Tu deviens le 1er inscrit.
        </div>
      </div>
    </div>
  );
}
