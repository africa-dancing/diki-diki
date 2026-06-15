'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

export default function AjouterMusiquePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [artiste, setArtiste] = useState('');
  const [titre, setTitre] = useState('');
  const [album, setAlbum] = useState('');
  const [dureeSec, setDureeSec] = useState('');
  const [pays, setPays] = useState('');
  const [continent, setContinent] = useState('');
  const [danse, setDanse] = useState('');
  const [style, setStyle] = useState('');
  const [source, setSource] = useState('manuel');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setMsg(''); setSearching(true);
    try {
      const t = getToken();
      const res = await fetch(`${API}/musiques/lookup?q=${encodeURIComponent(query.trim())}`, { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (!data.success) { setMsg(data.error || 'Recherche impossible.'); setSearching(false); return; }
      if (!data.data) { setMsg('Aucun resultat trouve. Tu peux remplir a la main.'); setSearching(false); return; }
      const d = data.data;
      setArtiste(d.artiste || ''); setTitre(d.titre || ''); setAlbum(d.album || '');
      setDureeSec(d.duree_sec ? String(d.duree_sec) : ''); setPays(d.pays_origine || '');
      setContinent(d.continent || ''); setSource('musicbrainz');
      setMsg('Infos trouvees ! Complete la danse et le style, puis soumets.');
    } catch {
      setMsg('Erreur reseau.');
    }
    setSearching(false);
  };

  const submit = async () => {
    setMsg('');
    if (!artiste.trim() || !titre.trim()) { setMsg('Artiste et titre obligatoires.'); return; }
    setSubmitting(true);
    try {
      const t = getToken();
      if (!t) { router.push('/auth/login'); return; }
      const res = await fetch(`${API}/musiques`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          artiste: artiste.trim(), titre: titre.trim(), album: album.trim() || undefined,
          duree_sec: dureeSec ? parseInt(dureeSec, 10) : undefined,
          pays_origine: pays.trim() || undefined, continent: continent.trim() || undefined,
          danse: danse.trim() || undefined, style: style.trim() || undefined, source,
        }),
      });
      const data = await res.json();
      if (!data.success) { setMsg(data.error || 'Erreur.'); setSubmitting(false); return; }
      router.push('/mediatheque?soumis=1');
    } catch {
      setMsg('Erreur reseau.'); setSubmitting(false);
    }
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, marginBottom: 14 } as const;
  const labelStyle = { fontSize: 13, fontWeight: 700, color: OR, marginBottom: 6, display: 'block' } as const;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f0', fontFamily: 'DM Sans,sans-serif', paddingBottom: 80 }}>
      <Navbar />
      <div style={{ padding: '16px 24px 10px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 'clamp(0.75rem,3vw,1.9rem)', lineHeight: 1.1, whiteSpace: 'nowrap', background: 'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Mediatheque <span style={{ background: 'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Diki-Diki</span>
        </h1>
      </div>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 20, fontWeight: 800, color: '#fefefe' }}>Ajouter un morceau</h1>
        </div>

        <label style={labelStyle}>Recherche automatique (MusicBrainz)</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input style={{ ...inputStyle, marginBottom: 0 }} value={query} onChange={e => setQuery(e.target.value)} placeholder='Ex : Aya Nakamura Djadja' onKeyDown={e => { if (e.key === 'Enter') search(); }} />
          <button onClick={search} disabled={searching} style={{ padding: '0 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: searching ? 'wait' : 'pointer', border: 'none', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', whiteSpace: 'nowrap' }}>{searching ? '...' : 'Rechercher'}</button>
        </div>

        <label style={labelStyle}>Artiste *</label>
        <input style={inputStyle} value={artiste} onChange={e => setArtiste(e.target.value)} placeholder='Nom de l artiste' />
        <label style={labelStyle}>Titre *</label>
        <input style={inputStyle} value={titre} onChange={e => setTitre(e.target.value)} placeholder='Titre du morceau' />
        <label style={labelStyle}>Album</label>
        <input style={inputStyle} value={album} onChange={e => setAlbum(e.target.value)} placeholder='Album (optionnel)' />

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Pays (code)</label>
            <input style={inputStyle} value={pays} onChange={e => setPays(e.target.value)} placeholder='CI, CD, SN...' />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Continent</label>
            <input style={inputStyle} value={continent} onChange={e => setContinent(e.target.value)} placeholder='Afrique...' />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Danse</label>
            <input style={inputStyle} value={danse} onChange={e => setDanse(e.target.value)} placeholder='Coupe-decale...' />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Style</label>
            <input style={inputStyle} value={style} onChange={e => setStyle(e.target.value)} placeholder='Style...' />
          </div>
        </div>

        {msg && <div style={{ color: msg.includes('trouvees') || msg.includes('trouve') ? '#4ADE80' : '#FF6B6B', fontSize: 13, margin: '8px 0 16px', textAlign: 'center' }}>{msg}</div>}

        <button onClick={submit} disabled={submitting} style={{ width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 800, fontFamily: 'Syne,sans-serif', cursor: submitting ? 'wait' : 'pointer', border: 'none', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', opacity: submitting ? 0.6 : 1, marginTop: 8 }}>
          {submitting ? 'Envoi...' : 'Soumettre le morceau'}
        </button>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 14, lineHeight: 1.6, textAlign: 'center' }}>
          Le morceau sera verifie avant publication dans la mediatheque.
        </div>
      </div>
    </div>
  );
}
