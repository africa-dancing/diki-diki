'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LogoDikiDiki from '../components/LogoDikiDiki';
import { useAnalytics } from '../hooks/useAnalytics'; /*DKDK_HEARTBEAT*/

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

type UploadMode = 'url' | 'file';

interface Category   { id: string; name: string; emoji: string; }
interface Discipline { id: string; name: string; emoji: string; category_id: string; description?: string; }
interface Subject    { id: string; name: string; discipline_id: string; }

// ── Données statiques — pas besoin de routes backend ──────────────
const STATIC_CATEGORIES: Category[] = [
  { id: 'scene',   name: 'Arts de la scène', emoji: '🎭' },
  { id: 'musique', name: 'Musique',           emoji: '🎵' },
  { id: 'parole',  name: 'Arts de la parole', emoji: '🎤' },
  { id: 'sport',   name: 'Sport',            emoji: '🥋' },
];

const STATIC_DISCIPLINES: Record<string, Discipline[]> = {
  scene: [
    { id: 'danse',   name: 'Danse',   emoji: '💃', category_id: 'scene', description: 'Chor&eacute;graphie sur sc&egrave;ne, tous styles' },
    { id: 'humour',  name: 'Humour',  emoji: '😂', category_id: 'scene', description: 'Sketchs, imitations, humour' },
  ],
  musique: [
    { id: 'instrument', name: 'Instrument', emoji: '🎸', category_id: 'musique', description: 'Jeu instrumental (guitare, piano, kora, percussion&hellip;)' },
    { id: 'acapella',   name: 'A cappella', emoji: '🎙️', category_id: 'musique', description: 'Chant sans aucun instrument, voix seule(s)' },
  ],
  parole: [
    { id: 'chant',   name: 'Chant',   emoji: '🎤', category_id: 'parole', description: 'Performance vocale accompagn&eacute;e (instru, bande-son&hellip;)' },
    { id: 'poesie',  name: 'Poésie',  emoji: '📜', category_id: 'parole', description: 'Slam, d&eacute;clamation, vers' },
    { id: 'conte',   name: 'Conte',   emoji: '📖', category_id: 'parole', description: 'R&eacute;cit, narration orale' },
  ],
};

const STATIC_SUBJECTS: Record<string, Subject[]> = {
  danse:       [{ id: 'afrobeats', name: 'Afrobeats', discipline_id: 'danse' }, { id: 'contemporain', name: 'Contemporain', discipline_id: 'danse' }, { id: 'traditionnel', name: 'Traditionnel', discipline_id: 'danse' }],
  chant:       [{ id: 'soul', name: 'Soul / RnB', discipline_id: 'chant' }, { id: 'gospel', name: 'Gospel', discipline_id: 'chant' }, { id: 'variete', name: 'Variété', discipline_id: 'chant' }],
  instrument:  [{ id: 'guitare', name: 'Guitare', discipline_id: 'instrument' }, { id: 'piano', name: 'Piano', discipline_id: 'instrument' }, { id: 'kora', name: 'Kora / Balafon', discipline_id: 'instrument' }],
  acapella:    [{ id: 'solo', name: 'Solo', discipline_id: 'acapella' }, { id: 'groupe', name: 'Groupe', discipline_id: 'acapella' }],
  humour:      [{ id: 'standup', name: 'Stand-up', discipline_id: 'humour' }, { id: 'sketch', name: 'Sketch', discipline_id: 'humour' }],
  poesie:      [{ id: 'slam', name: 'Slam', discipline_id: 'poesie' }, { id: 'classique', name: 'Classique', discipline_id: 'poesie' }],
  conte:       [{ id: 'traditionnel_c', name: 'Traditionnel', discipline_id: 'conte' }, { id: 'moderne', name: 'Moderne', discipline_id: 'conte' }],
};

function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

export default function SubmitPage() {
  useAnalytics(); /*DKDK_HEARTBEAT*/
  const router  = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1); // 1=catégorie 2=discipline 3=détails 4=vidéo 5=succès

  const [categories,  setCategories]  = useState<Category[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects,    setSubjects]    = useState<Subject[]>([]);
  /*DKDK_SPORT_EPREUVES*/
  const [sportEpreuves, setSportEpreuves] = useState<any[]>([]);
  /*DKDK_SPORT_EPREUVE_CHOISIE*/
  const [sportEpreuveChoisie, setSportEpreuveChoisie] = useState<any | null>(null);

  const [selectedCategory,   setSelectedCategory]   = useState<Category | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [selectedSubject,    setSelectedSubject]    = useState<Subject | null>(null);
  const [autreInstrument, setAutreInstrument] = useState(''); /*DKDK_AUTRE_INSTR*/
  const [selectedType, setSelectedType] = useState<string>('C16');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [trackTitle,  setTrackTitle]  = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [champs, setChamps] = useState<any[]>([]); /*DKDK_CHAMPS_STATE*/
  const [champChoix, setChampChoix] = useState<Record<string, any[]>>({});
  const [champValues, setChampValues] = useState<Record<string, string>>({});
  const champRecap = champs
    .map((c: any) => champValues[c.id])
    .filter(Boolean)
    .join(' - '); /*DKDK_RECAP_DYN*/
  const recapSubject = champs.length > 0 ? champRecap : (selectedSubject?.name || '');
  /*DKDK_CHAMPS_LOAD*/
  useEffect(() => {
    setChamps([]); setChampChoix({}); setChampValues({});
    const slug = selectedDiscipline?.id;
    if (!slug) return;
    (async () => {
      try {
        const r = await fetch(API + '/categories/disciplines/by-slug/' + slug + '/champs');
        const list = await r.json();
        const arr = Array.isArray(list) ? list : [];
        setChamps(arr);
        const cx: Record<string, any[]> = {};
        for (const c of arr) {
          if (c.type === 'liste') {
            try {
              const rc = await fetch(API + '/categories/champs/' + c.id + '/choix');
              const cj = await rc.json();
              cx[c.id] = Array.isArray(cj) ? cj : [];
            } catch { cx[c.id] = []; }
          }
        }
        setChampChoix(cx);
      } catch { setChamps([]); }
    })();
  }, [selectedDiscipline]);

  const [uploadMode, setUploadMode] = useState<UploadMode>('file');
  const [videoUrl,   setVideoUrl]   = useState('');
  const [file,       setFile]       = useState<File | null>(null);
  const [preview,    setPreview]    = useState<string | null>(null);
  const [duration,   setDuration]   = useState(0);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState('');
  const [audioWarning, setAudioWarning] = useState('');

  /* ── Auth + catégories statiques ── */
  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }
    const stored = localStorage.getItem('dkdk_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    setCategories(STATIC_CATEGORIES);
  }, [router]);

  /* ── Disciplines statiques ── */
  useEffect(() => {
    if (!selectedCategory) return;
    /*DKDK_SPORT_LOAD*/
    if (selectedCategory.id === 'sport') {
      // Charge les epreuves sport depuis l'API, derive les sports uniques
      (async () => {
        try {
          const r = await fetch(API + '/sport/epreuves');
          const j = await r.json();
          const eps: any[] = (j && j.success) ? (j.data || []) : [];
          setSportEpreuves(eps);
          // Derive la liste des sports (1 discipline par sport unique)
          const vus: Record<string, boolean> = {};
          const discs: Discipline[] = [];
          eps.forEach((e) => {
            if (!vus[e.sport_slug]) {
              vus[e.sport_slug] = true;
              discs.push({ id: e.sport_slug, name: e.sport, emoji: e.emoji || '🏅', category_id: 'sport' });
            }
          });
          setDisciplines(discs);
        } catch (e) {
          setDisciplines([]);
        }
      })();
      setSelectedDiscipline(null);
      setSubjects([]); setSelectedSubject(null);
      return;
    }
    setDisciplines(STATIC_DISCIPLINES[selectedCategory.id] ?? []);
    setSelectedDiscipline(null);
    setSubjects([]); setSelectedSubject(null);
  }, [selectedCategory]);

  /* ── Sujets statiques ── */
  useEffect(() => {
    if (!selectedDiscipline) return;
    setSubjects(STATIC_SUBJECTS[selectedDiscipline.id] ?? []);
    setSelectedSubject(null);
  }, [selectedDiscipline]);

  /* ── Fichier ── */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    if (!['video/mp4', 'video/quicktime'].includes(f.type)) {
      setError('Format non supporté. Utilisez MP4 ou MOV.'); return;
    }
    if (f.size / (1024 * 1024) > 500) {
      setError('Fichier trop lourd. Maximum 500 MB.'); return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleVideoLoaded() {
    const d = videoRef.current?.duration || 0;
    setDuration(d);
    if (d > 600) {
      setError('Vidéo trop longue. Maximum 10 minutes.');
      setFile(null); setPreview(null);
      return;
    }
    setAudioWarning('');
    const v = videoRef.current as any;
    setTimeout(() => {
      if (!v) return;
      const noMoz = v.mozHasAudio === false;
      const noWebkit = typeof v.webkitAudioDecodedByteCount === 'number' && v.webkitAudioDecodedByteCount === 0;
      const noTracks = v.audioTracks && v.audioTracks.length === 0;
      if (noMoz || noWebkit || noTracks) {
        setAudioWarning('Cette vidéo ne semble pas avoir de son lisible sur le web. Vérifiez votre fichier ou réexportez-le en MP4 (H.264 / AAC). Vous pouvez tout de même l’envoyer.');
      }
    }, 800);
  }

  function isStep4Valid() {
    if (uploadMode === 'url') return videoUrl.trim().length > 10;
    return !!file && !error;
  }

  /* ── Enregistrer en brouillon ── */
  async function handleSave() {
    if (!isStep4Valid()) return;
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }
    setUploading(true); setProgress(0); setError('');
    try {
      const interval = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 400);

      const champSubject = champs
        .filter((c: any) => c.type === 'liste' || c.type === 'musique')
        .map((c: any) => champValues[c.id])
        .filter(Boolean)
        .join(' - ');
      const champDetails = champs
        .map((c: any) => (champValues[c.id] ? c.titre + ': ' + champValues[c.id] : ''))
        .filter(Boolean)
        .join(' | '); /*DKDK_CHAMP_DETAILS*/
      const effectiveSubject = champs.length > 0 ? (champSubject || undefined) : (selectedSubject?.name || undefined);
      const payload: any = {
        status: 'draft', // ← enregistré en brouillon, pas encore soumis
        challenge_type: selectedType,
        title: title.trim() || `${selectedDiscipline?.name} — ${effectiveSubject || 'Prestation'}`,
        discipline: selectedDiscipline?.name?.toLowerCase(),
        subject: effectiveSubject,
        category: selectedCategory?.name,
        description: description.trim(),
        track_title: trackTitle.trim(),
        track_artist: trackArtist.trim(),
        track_genre: champDetails || undefined,
      };

      /*DKDK_SPORT_DISCIPLINE_COMPOSITE*/
      // Pour le sport, discipline = slug compose (sport-epreuve-numero)
      // afin de regrouper les brackets par choix precis. Les autres disciplines
      // gardent leur discipline simple (deja calculee ci-dessus).
      if (selectedDiscipline?.category_id === 'sport') {
        const slug = (s: string) => (s || '')
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // enleve les accents
          .replace(/[^a-z0-9]+/g, '-')                          // non-alphanum -> tiret
          .replace(/^-+|-+$/g, '');                             // trim tirets
        const parts = [selectedDiscipline?.id];                 // ex: 'karate'
        // (retire) l'epreuve n'entre plus dans le bracket_key : sport + choix suffit /*DKDK_BK_CLEAN*/
        if (selectedSubject?.name)        parts.push(slug(selectedSubject.name));
        payload.discipline = 'sport'; /*DKDK_BRACKET_KEY*/
        payload.bracket_key = parts.filter(Boolean).join('-'); /*DKDK_BRACKET_KEY*/
        // on conserve le vrai nom du sport pour reference/affichage admin
        payload.sport_name = selectedDiscipline?.name;
        payload.sport_epreuve = sportEpreuveChoisie?.epreuve || null;
      }

      if (uploadMode === 'url') {
        payload.video_url = videoUrl.trim();
      } else if (file) {
        const buffer = await file.arrayBuffer();
        payload.file_base64 = Buffer.from(buffer).toString('base64');
        payload.file_name   = file.name;
        payload.mime_type   = file.type;
      }

      const res = await fetch(`${API}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Erreur lors de l\'enregistrement');

      clearInterval(interval);
      setProgress(100);
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue. Vérifiez votre connexion.');
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setStep(1); setSelectedCategory(null); setSelectedDiscipline(null);
    setSelectedSubject(null); setTitle(''); setDescription('');
    setTrackTitle(''); setTrackArtist('');
    setSelectedType('C16');
    setVideoUrl(''); setFile(null); setPreview(null);
    setError(''); setProgress(0);
  }

  if (!user) return null;

  const STEPS = ['Catégorie', 'Discipline', 'Détails', 'Vidéo'];
  const OR = '#FFAA00';

  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg,#FFAA00,#FF6B00)',
    border: 'none', borderRadius: 12,
    padding: '12px 18px', fontSize: 14, fontWeight: 700,
    color: '#000', cursor: 'pointer', flex: 1,
    fontFamily: 'DM Sans, sans-serif',
  };
  const btnBack: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '11px 18px',
    fontSize: 13, fontWeight: 600,
    color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  };
  const inp: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
    padding: '11px 14px', fontSize: 14, color: '#fff',
    outline: 'none', fontFamily: 'DM Sans, sans-serif',
    boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'rgba(255,255,255,0.4)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '.5px',
  };
  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 22,
  };
  const selectCard = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(255,170,0,0.12)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${active ? 'rgba(255,170,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 14, padding: '14px 10px',
    textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', paddingBottom: 80 }}>

      {/* ── Topbar ── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,170,0,0.12)', padding: '0 20px 0 0', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
          <LogoDikiDiki width={130} />
        </Link>
        <button onClick={() => router.push('/home')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
          ✕ Annuler
        </button>
      </div>

      {/*DKDK_HALO*/}
        <div style={{ height: 200, marginTop: 56, background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', marginBottom: -200, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>

        {/* Stepper */}
        {step < 5 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', borderRadius: 18, padding: '22px 20px', marginBottom: 18, textAlign: 'center' }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>🎬</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 6 }}>Ajouter une vidéo</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Étape {step} sur 4 — {STEPS[step - 1]}</div>
              <div style={{ marginTop: 14, background: 'rgba(0,0,0,0.18)', borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
                <span style={{ fontSize: 15 }}>💡</span>
                <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                  Ta vidéo sera d'abord enregistrée en <strong>brouillon</strong>. Tu choisiras la compétition au moment de la soumettre à la modération depuis ton compte.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {STEPS.map((s, i) => (
                <div key={s} style={{ flex: 1 }}>
                  <div style={{ height: 4, borderRadius: 2, background: i < step ? OR : 'rgba(255,255,255,0.08)', transition: 'background .3s' }} />
                  <div style={{ fontSize: 9, color: i < step ? OR : 'rgba(255,255,255,0.25)', marginTop: 4, textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 1 : CATÉGORIE ─── */}
        {step === 1 && (
          <div style={cardStyle}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: 'Syne, sans-serif' }}>Choisissez une catégorie</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Dans quelle famille entre votre prestation ?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {categories.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>⏳ Chargement…</div>
              ) : categories.map(cat => (
                <div key={cat.id} onClick={() => setSelectedCategory(cat)} style={selectCard(selectedCategory?.id === cat.id)}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>{cat.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif' }}>{cat.name}</div>
                </div>
              ))}
            </div>
            <button style={{ ...btnPrimary, width: '100%', flex: 'unset', opacity: selectedCategory ? 1 : 0.4 }} disabled={!selectedCategory} onClick={() => setStep(2)}>
              Continuer → {selectedCategory?.name || 'Choisissez une catégorie'}
            </button>
          </div>
        )}

        {/* ─── ÉTAPE 2 : DISCIPLINE ─── */}
        {step === 2 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>{selectedCategory?.emoji}</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif' }}>{selectedCategory?.name}</div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Choisissez votre discipline</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {disciplines.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>⏳ Chargement…</div>
              ) : disciplines.map(d => (
                <div key={d.id} onClick={() => setSelectedDiscipline(d)} style={selectCard(selectedDiscipline?.id === d.id)}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{d.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif' }}>{d.name}</div>
                  {d.description && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.3 }} dangerouslySetInnerHTML={{ __html: d.description }} />}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnBack} onClick={() => setStep(1)}>← Retour</button>
              <button style={{ ...btnPrimary, opacity: selectedDiscipline ? 1 : 0.4 }} disabled={!selectedDiscipline} onClick={() => setStep(3)}>
                Continuer → {selectedDiscipline?.name || 'Choisissez'}
              </button>
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 3 : DÉTAILS ─── */}
        {step === 3 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>{selectedDiscipline?.emoji}</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif' }}>{selectedDiscipline?.name}</div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Renseignez les détails de votre prestation</div>

            {/* Sujet */}
            {selectedDiscipline?.id === 'instrument' && champs.length === 0 && ( /*DKDK_INSTR_SELECT*/
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Sujet / Morceau <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optionnel)</span></label>
                <select value={selectedSubject?.name || ''} onChange={(e) => {
                  const v = e.target.value;
                  if (!v) { setSelectedSubject(null); return; }
                  if (v === '__autre__') { setSelectedSubject({ id: 'autre', name: autreInstrument || '', discipline_id: 'instrument' }); return; }
                  setSelectedSubject({ id: v, name: v, discipline_id: 'instrument' });
                }} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', cursor: 'pointer' }}>
                  <option value='' style={{ background: '#1a1a24', color: '#fff' }}>&mdash; Choisis ton instrument &mdash;</option>
                  <optgroup label='🥁 Tambours et peaux' style={{ background: '#0d0d14', color: '#FFAA00', fontWeight: 800, fontSize: '13px' }}>
                  <option value='Djembé' style={{ background: '#1a1a24', color: '#fff' }}>Djembé</option>
                  <option value='Tama (tambour parlant)' style={{ background: '#1a1a24', color: '#fff' }}>Tama (tambour parlant)</option>
                  <option value='Doundounba' style={{ background: '#1a1a24', color: '#fff' }}>Doundounba</option>
                  <option value='Bendir' style={{ background: '#1a1a24', color: '#fff' }}>Bendir</option>
                  <option value='Ngoma' style={{ background: '#1a1a24', color: '#fff' }}>Ngoma</option>
                  <option value='Drums' style={{ background: '#1a1a24', color: '#fff' }}>Drums</option>
                  <option value='Batterie' style={{ background: '#1a1a24', color: '#fff' }}>Batterie</option>
                  </optgroup>
                  <optgroup label='🎸 Cordes' style={{ background: '#0d0d14', color: '#FFAA00', fontWeight: 800, fontSize: '13px' }}>
                  <option value='Kora' style={{ background: '#1a1a24', color: '#fff' }}>Kora</option>
                  <option value='N’goni' style={{ background: '#1a1a24', color: '#fff' }}>N’goni</option>
                  <option value='Guembri (ou sintir)' style={{ background: '#1a1a24', color: '#fff' }}>Guembri (ou sintir)</option>
                  <option value='Bolon' style={{ background: '#1a1a24', color: '#fff' }}>Bolon</option>
                  <option value='Imzad' style={{ background: '#1a1a24', color: '#fff' }}>Imzad</option>
                  </optgroup>
                  <optgroup label='🥄 Percussions solides' style={{ background: '#0d0d14', color: '#FFAA00', fontWeight: 800, fontSize: '13px' }}>
                  <option value='Balafon' style={{ background: '#1a1a24', color: '#fff' }}>Balafon</option>
                  <option value='Mbira / Kalimba / Sanza' style={{ background: '#1a1a24', color: '#fff' }}>Mbira / Kalimba / Sanza</option>
                  <option value='Shekere' style={{ background: '#1a1a24', color: '#fff' }}>Shekere</option>
                  <option value='Karkabou' style={{ background: '#1a1a24', color: '#fff' }}>Karkabou</option>
                  <option value='Tambour-fente (ekwe)' style={{ background: '#1a1a24', color: '#fff' }}>Tambour-fente (ekwe)</option>
                  </optgroup>
                  <optgroup label='🎺 Vents' style={{ background: '#0d0d14', color: '#FFAA00', fontWeight: 800, fontSize: '13px' }}>
                  <option value='Algaïta' style={{ background: '#1a1a24', color: '#fff' }}>Algaïta</option>
                  <option value='Flûtes en bambou ou roseau' style={{ background: '#1a1a24', color: '#fff' }}>Flûtes en bambou ou roseau</option>
                  <option value='Trompes et cors' style={{ background: '#1a1a24', color: '#fff' }}>Trompes et cors</option>
                  </optgroup>
                  <option value='__autre__' style={{ background: '#1a1a24', color: '#fff' }}>Autre&hellip;</option>
                </select>
                {selectedSubject?.id === 'autre' && (
                  <input type='text' placeholder='Precise ton instrument' value={autreInstrument} onChange={(e) => { setAutreInstrument(e.target.value); setSelectedSubject({ id: 'autre', name: e.target.value, discipline_id: 'instrument' }); }} style={{ width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                )}
              </div>
            )}

            {/*DKDK_SPORT_DETAIL*/}
                {selectedDiscipline?.category_id === 'sport' && (() => {
                  // epreuves de ce sport (ordonnees)
                  const eps = sportEpreuves.filter((e) => e.sport_slug === selectedDiscipline?.id);
                  const ec = sportEpreuveChoisie;
                  // options du 2e selecteur selon choix_type
                  let opts: string[] = [];
                  if (ec && ec.choix_liste) { /*DKDK_CHOIX_LISTE*/
                    opts = String(ec.choix_liste).split(',').map((s: string) => s.trim()).filter(Boolean);
                  } else if (ec && ec.choix_type === 'simple') {
                    for (let i = 1; i <= (ec.choix_max || 10); i++) opts.push('Forme ' + i); /*DKDK_FALLBACK_FORME*/
                  } else if (ec && ec.choix_type === 'plage') {
                    for (let i = 2; i <= (ec.choix_max || 10); i++) opts.push('1 a ' + i);
                  }
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <label style={lbl}>Epreuve</label>
                      <select value={ec?.id || ''} onChange={(e) => {
                        const found = eps.find((x) => x.id === e.target.value) || null;
                        setSportEpreuveChoisie(found);
                        // reset du choix numero
                        if (!found) { setSelectedSubject(null); return; }
                        // si pas de deroulant (foot/basket), l'epreuve EST le choix final
                        if (!found.choix_type) {
                          setSelectedSubject({ id: found.id, name: found.libelle, discipline_id: selectedDiscipline!.id });
                        } else {
                          setSelectedSubject(null);
                        }
                      }} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', cursor: 'pointer' }}>
                        <option value='' style={{ background: '#1a1a24', color: '#fff' }}>&mdash; Choisis l&apos;epreuve &mdash;</option>
                        {eps.map((e) => (
                          <option key={e.id} value={e.id} style={{ background: '#1a1a24', color: '#fff' }}>{e.libelle}</option>
                        ))}
                      </select>

                      {ec && ec.regle ? (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8, lineHeight: 1.5 }}>{ec.regle}</div>
                      ) : null}

                      {opts.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <label style={lbl}>{ec.choix_liste ? 'Forme' : (ec.choix_type === 'plage' ? 'Enchainement' : 'Numero')} /*DKDK_LABEL_FORME*/</label>
                          <select value={selectedSubject?.name || ''} onChange={(e) => {
                            const v = e.target.value;
                            if (!v) { setSelectedSubject(null); return; }
                            setSelectedSubject({ id: ec.id + ':' + v, name: v, discipline_id: selectedDiscipline!.id });
                          }} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', cursor: 'pointer' }}>
                            <option value='' style={{ background: '#1a1a24', color: '#fff' }}>&mdash; Choisis &mdash;</option>
                            {opts.map((o) => (
                              <option key={o} value={o} style={{ background: '#1a1a24', color: '#fff' }}>{o}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {subjects.length > 0 && champs.length === 0 && selectedDiscipline?.id !== 'instrument' && (
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Sujet / Morceau <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optionnel)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {subjects.map(s => (
                    <div key={s.id} onClick={() => setSelectedSubject(prev => prev?.id === s.id ? null : s)}
                      style={{ padding: '7px 14px', borderRadius: 24, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: selectedSubject?.id === s.id ? 'rgba(255,170,0,0.15)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${selectedSubject?.id === s.id ? OR : 'rgba(255,255,255,0.1)'}`,
                        color: selectedSubject?.id === s.id ? OR : 'rgba(255,255,255,0.6)', transition: 'all .2s',
                      }}>
                      {s.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/*DKDK_TYPE_SELECTOR*/}
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Type de challenge *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6 }}>
                {[
                  { type:'C2',  label:'C2',  desc:'2\nDuel',      rounds:'1 round' },
                  { type:'C4',  label:'C4',  desc:'4\ncandidats', rounds:'2 rounds' },
                  { type:'C8',  label:'C8',  desc:'8\ncandidats', rounds:'3 rounds' },
                  { type:'C12', label:'C12', desc:'12\ncandidats',rounds:'4 rounds' },
                  { type:'C16', label:'C16', desc:'16\ncandidats',rounds:'5 rounds' },
                ].map(t => (
                  <div key={t.type} onClick={() => setSelectedType(t.type)}
                    style={{ background: selectedType === t.type ? 'rgba(255,170,0,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${selectedType === t.type ? 'rgba(255,170,0,0.5)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '8px 4px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: selectedType === t.type ? '#FFAA00' : '#fff', fontFamily: 'Syne, sans-serif' }}>{t.label}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2, whiteSpace: 'pre-line', lineHeight: 1.3 }}>{t.desc}</div>
                    <div style={{ fontSize: 8, color: selectedType === t.type ? '#FFAA00' : 'rgba(255,255,255,0.25)', marginTop: 2 }}>{t.rounds}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
                {{
                  C2:'⚡ Duel direct — 1 adversaire, 1 round, tout se joue là.',
                  C4:'🔥 4 candidats — 2 rounds, demi-finale + finale.',
                  C8:'🏆 8 candidats — 3 rounds, quart + demi + finale.',
                  C12:'🥉 12 candidats — 4 rounds, 3e place attribuée auto.',
                  C16:'👑 16 candidats — 5 rounds avec match bronze inédit.',
                }[selectedType]}
              </div>
            </div>

            {/*DKDK_CHAMPS_RENDER*/ champs.length > 0 && champs.map((c: any) => (
              <div key={c.id} style={{ marginBottom: 12 }}>
                <label style={lbl}>{c.titre}{c.obligatoire ? ' *' : ''}</label>
                {c.type === 'liste' ? (
                  <select style={inp} value={champValues[c.id] || ''} onChange={e => setChampValues(v => ({ ...v, [c.id]: e.target.value }))}>
                    <option value="" style={{ color: '#000', background: '#fff' }}>Choisir...</option>
                    {(champChoix[c.id] || []).map((ch: any) => (
                      <option key={ch.id} value={ch.valeur} style={{ color: '#000', background: '#fff' }}>{ch.valeur}</option>
                    ))}
                  </select>
                ) : c.type === 'texte' ? (
                  <input style={inp} type="text" value={champValues[c.id] || ''} onChange={e => setChampValues(v => ({ ...v, [c.id]: e.target.value }))} />
                ) : (
                  <input style={inp} type="text" placeholder="Recherche a venir" disabled />
                )}
              </div>
            ))}
            {/*DKDK_HIDE_MUSIC_FIELDS*/ selectedDiscipline?.category_id !== 'sport' && (<>
                <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Titre de la piste <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optionnel)</span></label>
              <input style={inp} type="text" placeholder="Ex : Afrobeat Battle" value={trackTitle} onChange={e => setTrackTitle(e.target.value)} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Artiste / Groupe <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optionnel)</span></label>
              <input style={inp} type="text" placeholder="Ex : DJ Kossi" value={trackArtist} onChange={e => setTrackArtist(e.target.value)} />
            </div>
                </>)}

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Titre de la vidéo <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optionnel)</span></label>
              <input style={inp} type="text" placeholder={`Ma prestation de ${selectedDiscipline?.name}…`} value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Description <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optionnel)</span></label>
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 70 }} rows={2} placeholder="Décrivez votre prestation…" value={description} onChange={e => setDescription(e.target.value)} maxLength={500} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnBack} onClick={() => setStep(2)}>← Retour</button>
              <button style={btnPrimary} onClick={() => setStep(4)}>Continuer → Ajouter la vidéo</button>
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 4 : VIDÉO ─── */}
        {step === 4 && (
          <div style={cardStyle}>
            {/* Récap */}
            <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: OR, fontWeight: 600 }}>{selectedCategory?.emoji} {selectedCategory?.name}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>→</span>
              <span style={{ fontSize: 11, color: OR, fontWeight: 600 }}>{selectedDiscipline?.emoji} {selectedDiscipline?.name}</span>
              {recapSubject && <>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>→</span>
                {/*DKDK_RECAP_SPORT*/}
                    <span style={{ fontSize: 11, color: OR, fontWeight: 600 }}>
                      {selectedDiscipline?.category_id === 'sport'
                        ? (selectedDiscipline?.emoji || '🏅') + ' ' + (sportEpreuveChoisie?.libelle ? sportEpreuveChoisie.libelle + ' · ' : '') + selectedSubject.name /*DKDK_RECAP_LIBELLE*/
                        : (selectedDiscipline?.emoji ? selectedDiscipline.emoji + ' ' : '') + recapSubject}
                    </span>
              </>}
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16, fontFamily: 'Syne, sans-serif' }}>🎥 Votre vidéo</div>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
              {(['file'] as UploadMode[]).map(mode => (
                <button key={mode}
                  onClick={() => { setUploadMode(mode); setFile(null); setPreview(null); setVideoUrl(''); setError(''); }}
                  style={{ flex: 1, padding: '9px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all .2s',
                    background: uploadMode === mode ? 'rgba(255,170,0,0.12)' : 'transparent',
                    color: uploadMode === mode ? OR : 'rgba(255,255,255,0.4)',
                    outline: uploadMode === mode ? '1px solid rgba(255,170,0,0.25)' : 'none',
                  }}>
                  {mode === 'url' ? '🔗 Lien vidéo' : '📁 Upload fichier'}
                </button>
              ))}
            </div>

            {uploadMode === 'url' && (
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Lien de la vidéo *</label>
                <input style={inp} type="url" placeholder="https://youtube.com/watch?v=…" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>✅ YouTube, TikTok, Instagram Reels, Vimeo acceptés</div>
              </div>
            )}

            {uploadMode === 'file' && (
              !file ? (
                <div onClick={() => fileRef.current?.click()} style={{ border: '1.5px dashed rgba(255,255,255,0.12)', borderRadius: 14, padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', marginBottom: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🎬</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Cliquez pour choisir votre vidéo</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>MP4 ou MOV · Max 500 MB · Max 10 minutes</div>
                  <input ref={fileRef} type="file" accept="video/mp4,video/quicktime" onChange={handleFileChange} style={{ display: 'none' }} />
                </div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                  <video ref={videoRef} src={preview!} controls onLoadedMetadata={handleVideoLoaded} style={{ width: '100%', maxHeight: 220, background: '#000' }} />
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 3 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{(file.size / (1024 * 1024)).toFixed(1)} MB{duration > 0 ? ` · ${Math.floor(duration / 60)}m${Math.round(duration % 60)}s` : ''}</div>
                    <button onClick={() => { setFile(null); setPreview(null); setError(''); }}
                      style={{ marginTop: 8, background: 'none', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#f87171', cursor: 'pointer' }}>
                      ✕ Changer la vidéo
                    </button>
                  </div>
                </div>
              )
            )}

            {error && (
              <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f87171', marginBottom: 12 }}>
                ⚠️ {error}
              </div>
            )}

            {audioWarning && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f59e0b', marginBottom: 12 }}>
                ⚠️ {audioWarning}
              </div>
            )}

            {uploading && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                  <span>Enregistrement…</span><span>{progress}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                  <div style={{ height: 4, width: `${progress}%`, background: 'linear-gradient(90deg,#FFAA00,#FF6B00)', borderRadius: 2, transition: 'width .3s ease' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnBack} onClick={() => setStep(3)} disabled={uploading}>← Retour</button>
              <button
                style={{ ...btnPrimary, opacity: isStep4Valid() && !uploading ? 1 : 0.4 }}
                disabled={!isStep4Valid() || uploading || !!error}
                onClick={handleSave}
              >
                {uploading ? `Enregistrement ${progress}%…` : '💾 Enregistrer ma vidéo'}
              </button>
            </div>
          </div>
        )}

        {/* ─── ÉTAPE 5 : SUCCÈS ─── */}
        {step === 5 && (
          <div style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>💾</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 900, color: '#4ade80', marginBottom: 8 }}>Vidéo enregistrée !</div>
            <div style={{ fontSize: 13, color: 'rgba(74,222,128,0.65)', lineHeight: 1.8, marginBottom: 8 }}>
              {selectedCategory?.emoji} {selectedCategory?.name}
              {selectedDiscipline && <> → {selectedDiscipline.emoji} {selectedDiscipline.name}</>}
              {recapSubject && <> → {selectedDiscipline?.emoji} {recapSubject}</>}
            </div>

            {/* Rappel du flux */}
            <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 14, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: '#FFAA00', fontWeight: 700, marginBottom: 10 }}>Prochaines étapes :</div>
              {[
                { n: '1', icon: '👤', text: 'Va dans ton compte → Mes vidéos' },
                { n: '2', icon: '🏆', text: 'Clique sur "Soumettre pour validation" et choisis une compétition' },
                { n: '3', icon: '⏳', text: 'Notre équipe valide ta vidéo sous 24 à 48h' },
                { n: '4', icon: '✅', text: 'Vidéo approuvée → visible sur la plateforme' },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#FFAA00', minWidth: 16 }}>{step.n}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{step.icon} {step.text}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={reset} style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 50, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#4ade80', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                + Ajouter une autre vidéo
              </button>
              <button onClick={() => router.push('/compte')} style={{ background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', border: 'none', borderRadius: 50, padding: '10px 22px', fontSize: 13, fontWeight: 700, color: '#000', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                Mes vidéos →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Nav bas ── */} {/*DKDK_SUBMIT_NAVBAR_STYLE_FIX*/}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(8,8,15,0.97)', borderTop: '1px solid rgba(255,170,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 8px 12px', zIndex: 100 }}>
        {[{ label: 'Accueil', Icon: HomeIcon, route: '/home' }, { label: 'Recharger', Icon: RechargeIcon, route: '/recharge' }].map(item => (
          <button key={item.label} onClick={() => router.push(item.route)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', flex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#7e0380', border: '0.5px solid rgba(255,170,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFAA00' }}><item.Icon /></div>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#FFAA00', textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>
          </button>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, marginTop: -10 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#7e0380', border: '2px solid #FFAA00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 24, color: '#FFAA00', fontWeight: 700, lineHeight: 1 }}>+</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#FFAA00', textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'DM Sans, sans-serif' }}>Ajouter</span>
        </div>
        {[{ label: 'Retrait', Icon: BilletIcon, route: '/retrait' }, { label: 'Compte', Icon: UserIcon, route: '/compte' }].map(item => (
          <button key={item.label} onClick={() => router.push(item.route)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', flex: 1 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#7e0380', border: '0.5px solid rgba(255,170,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFAA00' }}><item.Icon /></div>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#FFAA00', textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeIcon()    { return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>; }
function RechargeIcon(){ return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>; }
function BilletIcon()  { return <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="22" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M1 10h2M21 10h2M1 14h2M21 14h2"/></svg>; }
function UserIcon()    { return <svg width={18} height={18} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2} strokeLinecap='round'><circle cx='12' cy='8' r='4'/><path d='M4 21v-1a6 6 0 0 1 12 0v1'/></svg>; }
