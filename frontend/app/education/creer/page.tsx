'use client';
import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoDikiDiki from '../../components/LogoDikiDiki';
import { useSearchParams, useRouter } from 'next/navigation';

const OR  = '#FFAA00';
const OR2 = '#FF6B00';
const BG  = '#0a0a0f';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Matiere { id: string; nom: string; emoji: string; }

function CreerPageInner() {
  const params    = useSearchParams();
  const router    = useRouter();
  const matiereId = params.get('matiere') || '';

  const [matieres, setMatieres]   = useState<Matiere[]>([]);
  const [tab, setTab]             = useState<'chapitre' | 'lecon'>('chapitre');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState('');
  const [userId, setUserId]       = useState<string | null>(null);

  const [chMatiere, setChMatiere] = useState(matiereId);
  const [chTitre, setChTitre]     = useState('');
  const [chDesc, setChDesc]       = useState('');

  const [lChapitre, setLChapitre] = useState('');
  const [lTitre, setLTitre]       = useState('');
  const [lDesc, setLDesc]         = useState('');
  const [lFormat, setLFormat]     = useState<'video' | 'texte_video' | 'audio'>('video');
  const [lUrl, setLUrl]           = useState('');
  const [lTexte, setLTexte]       = useState('');
  const [lDuree, setLDuree]       = useState(30);

  useEffect(() => {
    // Vérification d'authentification
    const token = localStorage.getItem('dkdk_token');
    if (!token) {
      router.push('/auth/register?redirect=/education/creer');
      return;
    }
    try {
      const parsed = JSON.parse(token);
      const uid = parsed?.userId || null;
      if (!uid) {
        router.push('/auth/register?redirect=/education/creer');
        return;
      }
      setUserId(uid);
    } catch {
      router.push('/auth/register?redirect=/education/creer');
      return;
    }

    // Charger les matières
    fetch(`${API}/v1/education/matieres`)
      .then(r => r.json())
      .then(d => setMatieres(d.data || []));
  }, []);

  const creerChapitre = async () => {
    if (!userId) {
      alert('Vous devez être connecté pour créer du contenu.');
      router.push('/auth/register?redirect=/education/creer');
      return;
    }
    if (!chTitre || !chMatiere) return alert('Remplissez tous les champs obligatoires.');
    setLoading(true);
    const res  = await fetch(`${API}/v1/education/chapitres`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matiere_id: chMatiere, createur_id: userId, titre: chTitre, description: chDesc }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setSuccess('✅ Chapitre créé avec succès !');
      setTimeout(() => router.push(`/education/${chMatiere}`), 1500);
    } else {
      alert('Erreur : ' + data.error);
    }
  };

  const creerLecon = async () => {
    if (!userId) {
      alert('Vous devez être connecté pour créer du contenu.');
      router.push('/auth/register?redirect=/education/creer');
      return;
    }
    if (!lChapitre || !lTitre || !lFormat) return alert('Remplissez tous les champs obligatoires.');
    setLoading(true);
    const res  = await fetch(`${API}/v1/education/lecons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapitre_id: lChapitre, createur_id: userId, titre: lTitre,
        description: lDesc, format: lFormat, contenu_url: lUrl,
        contenu_text: lTexte, duree_min: lDuree,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setSuccess('✅ Leçon créée avec succès !');
      setTimeout(() => router.push(`/education/chapitre/${lChapitre}`), 1500);
    } else {
      alert('Erreur : ' + data.error);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,170,0,0.15)', borderRadius: 8,
    color: '#fff', fontSize: 14, padding: '12px 14px', outline: 'none',
    fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box', marginBottom: 16,
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.4)',
    marginBottom: 6, fontWeight: 600, letterSpacing: 0.5,
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#e8e0d0' }}>
      <header style={{ borderBottom: '1px solid rgba(255,170,0,0.12)', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/home" style={{ textDecoration: 'none' }}>
          <LogoDikiDiki width={200} />
        </Link>
        <Link href="/education" style={{ color: 'rgb(43, 255, 0)', fontSize: 13, textDecoration: 'none' }}>← Éducation</Link>
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', borderRadius: 18, padding: '22px 20px', marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>🎓</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 6 }}>Partagez votre savoir</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Créez un chapitre ou une leçon pour la communauté</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 32, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
          {(['chapitre', 'lecon'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, background: tab === t ? `linear-gradient(90deg,${OR},${OR2})` : 'none',
              border: 'none', borderRadius: 8,
              color: tab === t ? BG : 'rgba(255,255,255,0.4)',
              fontWeight: 700, fontSize: 14, padding: '10px', cursor: 'pointer',
              fontFamily: "'Syne', sans-serif",
            }}>
              {t === 'chapitre' ? '📚 Chapitre' : '📝 Leçon'}
            </button>
          ))}
        </div>

        {success ? (
          <div style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.2)', borderRadius: 12, padding: '32px', textAlign: 'center', color: '#00c864' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 18 }}>{success}</p>
            <p style={{ fontSize: 13, opacity: 0.7 }}>Redirection en cours...</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,170,0,0.1)', borderRadius: 16, padding: '32px' }}>
            {tab === 'chapitre' ? (
              <>
                <label style={labelStyle}>Matière *</label>
                <select value={chMatiere} onChange={e => setChMatiere(e.target.value)} style={{ ...inputStyle, background: '#111' }}>
                  <option value="">Choisissez une matière</option>
                  {matieres.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.nom}</option>)}
                </select>

                <label style={labelStyle}>Titre du chapitre *</label>
                <input value={chTitre} onChange={e => setChTitre(e.target.value)} style={inputStyle} placeholder="Ex: Les langues du Bénin" />

                <label style={labelStyle}>Description</label>
                <textarea value={chDesc} onChange={e => setChDesc(e.target.value)} style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} placeholder="Décrivez ce chapitre..." />

                <button onClick={creerChapitre} disabled={loading} style={{
                  width: '100%', background: `linear-gradient(90deg,${OR},${OR2})`, color: BG,
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15,
                  padding: '14px', cursor: 'pointer', fontFamily: "'Syne', sans-serif",
                  opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? '⏳ Création...' : '📚 Créer le chapitre'}
                </button>
              </>
            ) : (
              <>
                <label style={labelStyle}>ID du chapitre *</label>
                <input value={lChapitre} onChange={e => setLChapitre(e.target.value)} style={inputStyle} placeholder="Collez l'ID du chapitre" />

                <label style={labelStyle}>Titre de la leçon *</label>
                <input value={lTitre} onChange={e => setLTitre(e.target.value)} style={inputStyle} placeholder="Ex: Le Fon, langue principale du Bénin" />

                <label style={labelStyle}>Description</label>
                <textarea value={lDesc} onChange={e => setLDesc(e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Décrivez cette leçon..." />

                <label style={labelStyle}>Format *</label>
                <select value={lFormat} onChange={e => setLFormat(e.target.value as any)} style={{ ...inputStyle, background: '#111' }}>
                  <option value="video">📹 Vidéo</option>
                  <option value="texte_video">📝 Texte + Vidéo</option>
                  <option value="audio">🎙️ Audio</option>
                </select>

                <label style={labelStyle}>URL du média</label>
                <input value={lUrl} onChange={e => setLUrl(e.target.value)} style={inputStyle} placeholder="https://..." />

                {lFormat === 'texte_video' && (
                  <>
                    <label style={labelStyle}>Contenu texte</label>
                    <textarea value={lTexte} onChange={e => setLTexte(e.target.value)} style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} placeholder="Rédigez votre contenu ici..." />
                  </>
                )}

                <label style={labelStyle}>Durée : {lDuree} minutes</label>
                <input type="range" min={1} max={60} value={lDuree}
                  onChange={e => setLDuree(Number(e.target.value))}
                  style={{ width: '100%', marginBottom: 20, accentColor: OR }} />

                <button onClick={creerLecon} disabled={loading} style={{
                  width: '100%', background: `linear-gradient(90deg,${OR},${OR2})`, color: BG,
                  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15,
                  padding: '14px', cursor: 'pointer', fontFamily: "'Syne', sans-serif",
                  opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? '⏳ Création...' : '📝 Créer la leçon'}
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(255,170,0,0.05)', border: '1px solid rgba(255,170,0,0.1)', borderRadius: 10 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>
            💡 <strong style={{ color: OR }}>Répartition :</strong> 👍 Like = 10 F / ⭐ Étoile = 20 F → vous recevez <strong style={{ color: OR }}>50%</strong> dans votre portefeuille.
          </p>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Pas encore de compte ?{' '}
            <Link href="/auth/register" style={{ color: OR, textDecoration: 'none', fontWeight: 600 }}>
              S'inscrire gratuitement →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
export default function CreerPage() {
  return <Suspense fallback={<div>Chargement...</div>}><CreerPageInner /></Suspense>;
}
