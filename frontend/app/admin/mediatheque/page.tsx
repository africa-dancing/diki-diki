'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';

interface Form {
  artiste: string; titre: string; album: string; duree_sec: string;
  pays_origine: string; continent: string; danse: string; style: string; cover_url: string;
}
const VIDE: Form = { artiste: '', titre: '', album: '', duree_sec: '', pays_origine: '', continent: '', danse: '', style: '', cover_url: '' };

function AdminMediathequeInner() {
  const { admin } = useAdminAuth();
  const [form, setForm]       = useState<Form>(VIDE);
  const [recherche, setRech]  = useState('');
  const [busy, setBusy]       = useState(false);
  const [lookupBusy, setLB]   = useState(false);
  const [info, setInfo]       = useState('');
  const [erreur, setErreur]   = useState('');

  /*DKDK_LISTE_FRONT*/
  const [liste, setListe]     = useState<any[]>([]);
  const [loadingList, setLL]  = useState(false);

  const chargerListe = async () => {
    setLL(true);
    try {
      const r = await fetch(API + '/musiques/admin/list', {
        headers: { Authorization: 'Bearer ' + admin?.token },
      });
      const j = await r.json();
      if (j.success) setListe(j.data || []);
    } catch (e) {} finally { setLL(false); }
  };

  useEffect(() => { chargerListe(); }, []);

  const maj = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const lookup = async () => {
    if (!recherche.trim()) return;
    setLB(true); setErreur(''); setInfo('');
    try {
      const r = await fetch(`${API}/musiques/lookup?q=${encodeURIComponent(recherche.trim())}`, {
        headers: { Authorization: `Bearer ${admin?.token}` },
      });
      const j = await r.json();
      if (!j.success) { setErreur(j.error || 'Recherche echouee.'); return; }
      if (!j.data) { setErreur('Aucun resultat trouve.'); return; }
      const d = j.data;
      setForm(f => ({
        ...f,
        artiste: d.artiste || f.artiste,
        titre: d.titre || f.titre,
        album: d.album || f.album,
        duree_sec: d.duree_sec ? String(d.duree_sec) : f.duree_sec,
        pays_origine: d.pays_origine || f.pays_origine,
        continent: d.continent || f.continent,
      }));
      setInfo('Champs pre-remplis depuis MusicBrainz. Verifiez puis ajoutez.');
    } catch (e: any) {
      setErreur('Erreur reseau lors de la recherche.');
    } finally { setLB(false); }
  };

  const ajouter = async () => {
    setErreur(''); setInfo('');
    if (!form.artiste.trim() || !form.titre.trim()) { setErreur('Artiste et titre obligatoires.'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/musiques/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin?.token}` },
        body: JSON.stringify({
          artiste: form.artiste.trim(),
          titre: form.titre.trim(),
          album: form.album.trim() || undefined,
          duree_sec: form.duree_sec ? parseInt(form.duree_sec, 10) : undefined,
          pays_origine: form.pays_origine.trim() || undefined,
          continent: form.continent.trim() || undefined,
          danse: form.danse.trim() || undefined,
          style: form.style.trim() || undefined,
          cover_url: form.cover_url.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!j.success) { setErreur(j.error || 'Ajout echoue.'); return; }
      setInfo('Musique ajoutee a la mediatheque.');
      setForm(VIDE); setRech('');
      chargerListe();
    } catch (e: any) {
      setErreur('Erreur reseau lors de l ajout.');
    } finally { setBusy(false); }
  };

  const champ = (label: string, k: keyof Form, ph = '', type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <label style={lbl}>{label}</label>
      <input type={type} value={form[k]} placeholder={ph}
        onChange={e => maj(k, e.target.value)}
        style={inp} />
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '32px 28px', maxWidth: 760 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, marginBottom: 6 }}>
          <span style={{ color: OR }}>Mediatheque</span> — Ajouter une musique
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 24 }}>
          Les musiques ajoutees ici sont disponibles immediatement pour les challenges (source admin, validees).
        </p>

        <div style={{ background: '#12121e', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 14, padding: 18, marginBottom: 22 }}>
          <label style={lbl}>Recherche automatique (MusicBrainz)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={recherche} placeholder="Ex : artiste + titre"
              onChange={e => setRech(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') lookup(); }}
              style={{ ...inp, marginBottom: 0, flex: 1 }} />
            <button onClick={lookup} disabled={lookupBusy} style={btnSec}>
              {lookupBusy ? '...' : 'Rechercher'}
            </button>
          </div>
        </div>

        {champ('Artiste *', 'artiste')}
        {champ('Titre *', 'titre')}
        {champ('Album', 'album')}
        {champ('Duree (secondes)', 'duree_sec', 'Ex : 210', 'number')}
        {champ('Pays d origine', 'pays_origine', 'Ex : BJ')}
        {champ('Continent', 'continent', 'Ex : Afrique')}
        {champ('Danse', 'danse')}
        {champ('Style', 'style')}
        {champ('URL pochette', 'cover_url')}

        {erreur && <div style={{ color: '#ff5555', fontSize: 13, marginBottom: 12 }}>{erreur}</div>}
        {info && <div style={{ color: '#3ddc84', fontSize: 13, marginBottom: 12 }}>{info}</div>}

        <button onClick={ajouter} disabled={busy} style={btnMain}>
          {busy ? 'Ajout en cours...' : 'Ajouter a la mediatheque'}
        </button>

        {liste.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 12 }}>
              Musiques dans la mediatheque ({liste.length})
            </h2>
            <div style={{ background: '#12121e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 70px 90px', gap: 8, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.12)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', fontFamily: 'Syne, sans-serif' }}>
                <div>TITRE</div><div>ARTISTE</div><div>DUREE</div><div>STATUT</div>
              </div>
              {liste.map((m: any) => (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 70px 90px', gap: 8, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{m.titre}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)' }}>{m.artiste}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)' }}>{m.duree_sec ? m.duree_sec + 's' : '-'}</div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: m.status === 'approved' ? 'rgba(61,220,132,0.15)' : 'rgba(255,170,0,0.15)', color: m.status === 'approved' ? '#3ddc84' : OR }}>
                      {m.status === 'approved' ? 'Validee' : 'En attente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingList && liste.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 20 }}>Chargement de la liste...</p>
        )}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 6, fontFamily: 'Syne, sans-serif' };
const inp: React.CSSProperties = { width: '100%', background: '#000', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9, padding: '10px 12px', color: '#fff', fontSize: 14, fontFamily: 'DM Sans, sans-serif', marginBottom: 0, boxSizing: 'border-box' };
const btnMain: React.CSSProperties = { background: OR, color: '#0a0a0f', border: 'none', borderRadius: 9, padding: '12px 28px', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Syne, sans-serif' };
const btnSec: React.CSSProperties = { background: 'rgba(255,170,0,0.15)', color: OR, border: '1px solid rgba(255,170,0,0.4)', borderRadius: 9, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Syne, sans-serif' };

export default function AdminMediathequePage() {
  return <AdminGuard><AdminMediathequeInner /></AdminGuard>;
}