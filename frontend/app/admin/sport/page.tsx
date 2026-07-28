'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';

interface Epreuve {
  id: string; sport: string; sport_slug: string; epreuve: string;
  niveau: number | null; libelle: string; regle: string | null;
  emoji: string; ordre: number; actif: boolean;
}

function AdminSportInner() {
  const { admin } = useAdminAuth();
  const [liste, setListe]   = useState<Epreuve[]>([]);
  const [loading, setLoad]  = useState(false);
  const [info, setInfo]     = useState('');
  const [erreur, setErreur] = useState('');

  // Edition en cours
  const [editId, setEditId]     = useState<string | null>(null);
  const [eLibelle, setELibelle] = useState('');
  const [eRegle, setERegle]     = useState('');
  const [eOrdre, setEOrdre]     = useState('');
  const [eActif, setEActif]     = useState(true);
  const [saving, setSaving]     = useState(false);
  const [nSport, setNSport]       = useState(''); /*DKDK_SPORT_FORM_AJOUT*/
  const [nEpreuve, setNEpreuve]   = useState('');
  const [nLibelle, setNLibelle]   = useState('');
  const [nRegle, setNRegle]       = useState('');
  const [nNiveau, setNNiveau]     = useState('');
  const [nOrdre, setNOrdre]       = useState('');
  const [ajoutBusy, setAjoutBusy] = useState(false);
  const slugify = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const ajouterEpreuve = async () => {
    if (!nSport.trim() || !nEpreuve.trim() || !nLibelle.trim()) { setErreur('Sport, epreuve et libelle sont obligatoires.'); return; }
    setAjoutBusy(true); setInfo(''); setErreur('');
    try {
      const body: any = {
        sport: nSport.trim(), sport_slug: slugify(nSport), epreuve: nEpreuve.trim(), libelle: nLibelle.trim(),
        regle: nRegle.trim() || null,
        niveau: nNiveau.trim() ? parseInt(nNiveau, 10) : null,
        ordre: nOrdre.trim() ? parseInt(nOrdre, 10) : 0,
      };
      const r = await fetch(API + '/sport/admin/epreuves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + admin?.token },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.success) { setErreur(j.error || 'Ajout echoue.'); return; }
      setInfo('Epreuve ajoutee.');
      setNSport(''); setNEpreuve(''); setNLibelle(''); setNRegle(''); setNNiveau(''); setNOrdre('');
      charger();
    } catch (e) { setErreur('Erreur reseau.'); }
    finally { setAjoutBusy(false); }
  };

  const charger = async () => {
    setLoad(true); setErreur('');
    try {
      const r = await fetch(API + '/sport/admin/epreuves', {
        headers: { Authorization: 'Bearer ' + admin?.token },
      });
      const j = await r.json();
      if (!j.success) { setErreur(j.error || 'Chargement echoue.'); return; }
      setListe(j.data || []);
    } catch (e) { setErreur('Erreur reseau.'); }
    finally { setLoad(false); }
  };

  useEffect(() => { charger(); }, []);

  const ouvrirEdition = (ep: Epreuve) => {
    setEditId(ep.id);
    setELibelle(ep.libelle || '');
    setERegle(ep.regle || '');
    setEOrdre(String(ep.ordre ?? 0));
    setEActif(ep.actif);
    setInfo(''); setErreur('');
  };

  const annuler = () => { setEditId(null); };

  const enregistrer = async (id: string) => {
    setSaving(true); setInfo(''); setErreur('');
    try {
      var ordreNum = parseInt(eOrdre, 10); if (isNaN(ordreNum)) ordreNum = 0;
      const r = await fetch(API + '/sport/admin/epreuves/' + id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + admin?.token,
        },
        body: JSON.stringify({
          libelle: eLibelle,
          regle: eRegle === '' ? null : eRegle,
          ordre: ordreNum,
          actif: eActif,
        }),
      });
      const j = await r.json();
      if (!j.success) { setErreur(j.error || 'Enregistrement echoue.'); return; }
      setInfo('Epreuve mise a jour.');
      setEditId(null);
      charger();
    } catch (e) { setErreur('Erreur reseau.'); }
    finally { setSaving(false); }
  };

  const supprimer = async (ep: Epreuve) => {
    if (!window.confirm('Supprimer cette epreuve ? ' + ep.sport + ' - ' + ep.libelle)) return;
    setInfo(''); setErreur('');
    try {
      const r = await fetch(API + '/sport/admin/epreuves/' + ep.id, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + admin?.token },
      });
      const j = await r.json();
      if (!j.success) { setErreur(j.error || 'Suppression echouee.'); return; }
      setInfo('Epreuve supprimee.');
      charger();
    } catch (e) { setErreur('Erreur reseau.'); }
  };

  // Regroupe par sport pour l'affichage
  const groupes: { [k: string]: Epreuve[] } = {};
  liste.forEach((ep) => {
    if (!groupes[ep.sport]) groupes[ep.sport] = [];
    groupes[ep.sport].push(ep);
  });
  const sportsOrdonnes = Object.keys(groupes);

  const inp: React.CSSProperties = { background:'#0a0a0f', border:'1px solid #1e1e2e', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:14, width:'100%', boxSizing:'border-box' };
  const lbl: React.CSSProperties = { fontSize:12, color:'#a0a0c0', marginBottom:4, display:'block' };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif' }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'32px 28px', maxWidth:1000 }}>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:28, marginBottom:6 }}>
          <span style={{ color: OR }}>Sport</span> &mdash; Epreuves &amp; regles
        </h1>
        <p style={{ fontSize:14, color:'#a0a0c0', marginBottom:20 }}>Modifie les libelles, les regles (notamment les katas, vides au depart), l&apos;ordre et l&apos;activation.</p>

        <button onClick={charger} disabled={loading} style={{ marginBottom:16, padding:'8px 16px', borderRadius:8, border:'1px solid #1e1e2e', background:'#0d0d14', color:OR, fontWeight:600, fontSize:13, cursor:'pointer' }}>
          {loading ? 'Chargement...' : 'Rafraichir'}
        </button>

        {/*DKDK_SPORT_FORM_AJOUT*/}
        <div style={{ background:'#0d0d14', border:'1px solid #1e1e2e', borderRadius:10, padding:'16px', marginBottom:20 }}>
          <div style={{ fontSize:15, fontWeight:700, color:OR, marginBottom:12, fontFamily:'Syne, sans-serif' }}>+ Ajouter une epreuve</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div><label style={lbl}>Sport *</label><input style={inp} value={nSport} onChange={(e) => setNSport(e.target.value)} placeholder='Ex : Football' /></div>
            <div><label style={lbl}>Epreuve *</label><input style={inp} value={nEpreuve} onChange={(e) => setNEpreuve(e.target.value)} placeholder='Ex : Jonglages' /></div>
          </div>
          <div style={{ marginBottom:10 }}><label style={lbl}>Libelle *</label><input style={inp} value={nLibelle} onChange={(e) => setNLibelle(e.target.value)} placeholder='Ex : Jonglages - Niveau 1' /></div>
          <div style={{ marginBottom:10 }}><label style={lbl}>Regle (optionnel)</label><textarea style={{ ...inp, minHeight:60, resize:'vertical', fontFamily:'inherit' }} value={nRegle} onChange={(e) => setNRegle(e.target.value)} placeholder='Decris la regle...' /></div>
          <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div style={{ width:120 }}><label style={lbl}>Niveau</label><input style={inp} type='number' value={nNiveau} onChange={(e) => setNNiveau(e.target.value)} /></div>
            <div style={{ width:120 }}><label style={lbl}>Ordre</label><input style={inp} type='number' value={nOrdre} onChange={(e) => setNOrdre(e.target.value)} /></div>
            <button onClick={ajouterEpreuve} disabled={ajoutBusy} style={{ padding:'9px 18px', borderRadius:8, border:'none', background:OR, color:'#000', fontWeight:700, fontSize:13, cursor:'pointer' }}>{ajoutBusy ? 'Ajout...' : 'Ajouter'}</button>
          </div>
        </div>

        {info ? <div style={{ color:'#4ade80', marginBottom:12, fontSize:14 }}>{info}</div> : null}
        {erreur ? <div style={{ color:'#ed070f', marginBottom:12, fontSize:14 }}>{erreur}</div> : null}

        {sportsOrdonnes.map((sp) => (
          <div key={sp} style={{ marginBottom:24 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#f0f0f0', marginBottom:10, fontFamily:'Syne, sans-serif' }}>
              {groupes[sp][0]?.emoji} {sp}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {groupes[sp].map((ep) => (
                <div key={ep.id} style={{ background:'#0d0d14', border:'1px solid #1e1e2e', borderRadius:10, padding:'14px 16px' }}>
                  {editId === ep.id ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <div>
                        <label style={lbl}>Libelle</label>
                        <input style={inp} value={eLibelle} onChange={(e) => setELibelle(e.target.value)} />
                      </div>
                      <div>
                        <label style={lbl}>Regle de l&apos;epreuve</label>
                        <textarea style={{ ...inp, minHeight:70, resize:'vertical', fontFamily:'inherit' }} value={eRegle} onChange={(e) => setERegle(e.target.value)} placeholder='Decris la regle a respecter...' />
                      </div>
                      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                        <div style={{ width:120 }}>
                          <label style={lbl}>Ordre</label>
                          <input style={inp} type='number' value={eOrdre} onChange={(e) => setEOrdre(e.target.value)} />
                        </div>
                        <label style={{ fontSize:14, color:'#e0e0e0', display:'flex', alignItems:'center', gap:6, marginTop:18, cursor:'pointer' }}>
                          <input type='checkbox' checked={eActif} onChange={(e) => setEActif(e.target.checked)} /> Actif
                        </label>
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:4 }}>
                        <button onClick={() => enregistrer(ep.id)} disabled={saving} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:OR, color:'#000', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                          {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button onClick={annuler} style={{ padding:'8px 18px', borderRadius:8, border:'1px solid #1e1e2e', background:'#0d0d14', color:'#a0a0c0', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:220 }}>
                        <div style={{ fontSize:15, fontWeight:700, color: ep.actif ? '#fff' : '#6a6a8a' }}>
                          {ep.libelle} {ep.actif ? '' : '(inactif)'}
                        </div>
                        <div style={{ fontSize:13, color: ep.regle ? '#a0a0c0' : '#ed8a3a', marginTop:3 }}>
                          {ep.regle ? ep.regle : 'Regle a completer'}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => ouvrirEdition(ep)} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #1e1e2e', background:'#0d0d14', color:OR, fontWeight:600, fontSize:13, cursor:'pointer' }}>
                          Editer
                        </button>
                        <button onClick={() => supprimer(ep)} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid #3a1e1e', background:'#0d0d14', color:'#ed070f', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                          Suppr.
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {(!loading && liste.length === 0) ? <div style={{ color:'#6a6a8a' }}>Aucune epreuve.</div> : null}
      </div>
    </div>
  );
}

export default function AdminSportPage() {
  return <AdminGuard><AdminSportInner /></AdminGuard>;
}
