'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LogoDikiDiki from '../components/LogoDikiDiki';

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
];

const STATIC_DISCIPLINES: Record<string, Discipline[]> = {
  scene: [
    { id: 'danse',   name: 'Danse',   emoji: '💃', category_id: 'scene', description: 'Chor&eacute;graphie sur sc&egrave;ne, tous styles' },
    { id: 'humour',  name: 'Humour',  emoji: '😂', category_id: 'scene', description: 'Sketchs, imitations, humour' },
    { id: 'theatre', name: 'Théâtre', emoji: '🎭', category_id: 'scene', description: 'Jeu d&apos;acteur, mise en sc&egrave;ne' },
  ],
  musique: [
    { id: 'instrument', name: 'Instrument', emoji: '🎸', category_id: 'musique', description: 'Jeu instrumental (guitare, piano, kora, percussion&hellip;)' },
    { id: 'acapella',   name: 'A cappella', emoji: '🎙️', category_id: 'musique', description: 'Chant sans aucun instrument, voix seule(s)' },
    { id: 'composition',name: 'Composition',emoji: '🎵', category_id: 'musique', description: 'Cr&eacute;ation musicale originale' },
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
  theatre:     [{ id: 'comedie', name: 'Comédie', discipline_id: 'theatre' }, { id: 'drame', name: 'Drame', discipline_id: 'theatre' }],
  composition: [],
};

function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

export default function SubmitPage() {
  const router  = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1); // 1=catégorie 2=discipline 3=détails 4=vidéo 5=succès

  const [categories,  setCategories]  = useState<Category[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subjects,    setSubjects]    = useState<Subject[]>([]);

  const [selectedCategory,   setSelectedCategory]   = useState<Category | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [selectedSubject,    setSelectedSubject]    = useState<Subject | null>(null);
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [trackTitle,  setTrackTitle]  = useState('');
  const [trackArtist, setTrackArtist] = useState('');

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

      const payload: any = {
        status: 'draft', // ← enregistré en brouillon, pas encore soumis
        title: title.trim() || `${selectedDiscipline?.name} — ${selectedSubject?.name || 'Prestation'}`,
        discipline: selectedDiscipline?.name?.toLowerCase(),
        subject: selectedSubject?.name,
        category: selectedCategory?.name,
        description: description.trim(),
        track_title: trackTitle.trim(),
        track_artist: trackArtist.trim(),
      };

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

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px', background: 'radial-gradient(ellipse 90% 40% at 50% 0%, rgba(244,6,99,0.13) 0%, transparent 65%)' }}>

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
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
            {subjects.length > 0 && (
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

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Titre de la piste <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optionnel)</span></label>
              <input style={inp} type="text" placeholder="Ex : Afrobeat Battle" value={trackTitle} onChange={e => setTrackTitle(e.target.value)} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Artiste / Groupe <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optionnel)</span></label>
              <input style={inp} type="text" placeholder="Ex : DJ Kossi" value={trackArtist} onChange={e => setTrackArtist(e.target.value)} />
            </div>

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
              {selectedSubject && <>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>→</span>
                <span style={{ fontSize: 11, color: OR, fontWeight: 600 }}>🎵 {selectedSubject.name}</span>
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
              {selectedSubject && <> → 🎵 {selectedSubject.name}</>}
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

      {/* ── Nav bas ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(8,8,15,0.97)', borderTop: '1px solid rgba(255,170,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 8px 12px', zIndex: 100 }}>
        {[{ label: 'Accueil', icon: '🏠', route: '/home' }, { label: 'Recharger', icon: '💳', route: '/recharge' }].map(item => (
          <button key={item.label} onClick={() => router.push(item.route)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', flex: 1 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{item.icon}</div>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>
          </button>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, marginTop: -10 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#111', border: '2px solid #FFAA00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 26, color: '#FFAA00', fontWeight: 700, lineHeight: 1 }}>+</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#FFAA00', textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'DM Sans, sans-serif' }}>Ajouter</span>
        </div>
        {[{ label: 'Retrait', icon: '💸', route: '/retrait' }, { label: 'Compte', icon: '👤', route: '/compte' }].map(item => (
          <button key={item.label} onClick={() => router.push(item.route)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', flex: 1 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{item.icon}</div>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '.4px', fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
