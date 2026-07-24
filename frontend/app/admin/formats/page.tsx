'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

interface Format {
  id: string; code: string; libelle: string;
  nb_candidats: number; nb_etapes: number; nb_videos: number;
  objectif_etape: number; actif: boolean; ordre: number;
}

const carte: any = { background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: 12, padding: 16, marginBottom: 16 };
const titre: any = { fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: OR, marginBottom: 10 };
const champ: any = { background: '#14141c', border: '1px solid #2a2a3a', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 13, marginRight: 8, marginBottom: 8 };
const btn:   any = { background: OR, border: 'none', borderRadius: 8, padding: '7px 14px', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' };

const cell: any  = { padding: '9px 12px', fontSize: 13, color: '#fff' };
const cellMut: any = { padding: '9px 12px', fontSize: 13, color: 'rgba(255,255,255,0.45)' };
const thStyle: any = { padding: '9px 12px', fontSize: 11, textAlign: 'left', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 };

function FormatsInner() {
  const { admin } = useAdminAuth();
  const tok = () => ({ Authorization: 'Bearer ' + admin?.token, 'Content-Type': 'application/json' });

  const [formats, setFormats] = useState<Format[]>([]);
  const [info, setInfo]     = useState('');
  const [erreur, setErreur] = useState('');
  const [editId, setEditId] = useState<string>('');
  const [eLib, setELib]     = useState('');
  const [eObj, setEObj]     = useState('');

  const msg = (t: string, ok = true) => { ok ? setInfo(t) : setErreur(t); setTimeout(() => { setInfo(''); setErreur(''); }, 3500); };
  const liste = (j: any) => Array.isArray(j) ? j : (j?.data ?? []);
  const fmt = (n: number) => n.toLocaleString('fr-FR');

  const charger = async () => {
    try { setFormats(liste(await (await fetch(API + '/challenge-formats?all=1')).json())); }
    catch { msg('Chargement impossible', false); }
  };
  useEffect(() => { charger(); }, []);

  const ouvrirEdit = (ff: Format) => { setEditId(ff.id); setELib(ff.libelle); setEObj(String(ff.objectif_etape)); };
  const annuler = () => { setEditId(''); setELib(''); setEObj(''); };

  const enregistrer = async (id: string) => {
    const obj = Number(eObj);
    if (!eLib.trim()) return msg('Le libelle est vide', false);
    if (!Number.isFinite(obj) || obj <= 0) return msg('Objectif invalide', false);
    try {
      const r = await fetch(API + '/challenge-formats/' + id, {
        method: 'PATCH', headers: tok(),
        body: JSON.stringify({ libelle: eLib.trim(), objectif_etape: obj }),
      });
      if (!r.ok) throw new Error();
      annuler(); await charger(); msg('Format mis a jour');
    } catch { msg('Echec de la mise a jour', false); }
  };

  const basculerActif = async (ff: Format) => {
    try {
      const r = await fetch(API + '/challenge-formats/' + ff.id, {
        method: 'PATCH', headers: tok(),
        body: JSON.stringify({ actif: !ff.actif }),
      });
      if (!r.ok) throw new Error();
      await charger(); msg(ff.actif ? 'Format desactive' : 'Format active');
    } catch { msg('Echec du changement de statut', false); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#08080d' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: 24, maxWidth: 900 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 4 }}>
          Formats de challenge
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
          Libelle et objectif par etape sont modifiables. Le nombre de candidats, d&apos;etapes et de videos est structurel.
        </p>

        {info   && <div style={{ ...carte, borderColor: OR, color: OR }}>{info}</div>}
        {erreur && <div style={{ ...carte, borderColor: '#ff4d4d', color: '#ff4d4d' }}>{erreur}</div>}

        <div style={carte}>
          <div style={titre}>Les formats</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #23232f' }}>
                <th style={thStyle}>Code</th>
                <th style={thStyle}>Libelle</th>
                <th style={thStyle}>Cand.</th>
                <th style={thStyle}>Etapes</th>
                <th style={thStyle}>Videos</th>
                <th style={thStyle}>Objectif/etape</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {formats.map((ff) => (
                <tr key={ff.id} style={{ borderBottom: '1px solid #16161f', opacity: ff.actif ? 1 : 0.5 }}>
                  <td style={{ ...cell, fontWeight: 700, color: OR }}>{ff.code}</td>
                  {editId === ff.id ? (
                    <td style={cell}><input style={{ ...champ, width: 180 }} value={eLib} onChange={(e) => setELib(e.target.value)} /></td>
                  ) : (
                    <td style={cell}>{ff.libelle}</td>
                  )}
                  <td style={cellMut}>{ff.nb_candidats}</td>
                  <td style={cellMut}>{ff.nb_etapes}</td>
                  <td style={cellMut}>{ff.nb_videos}</td>
                  {editId === ff.id ? (
                    <td style={cell}><input style={{ ...champ, width: 110 }} value={eObj} onChange={(e) => setEObj(e.target.value)} inputMode="numeric" /></td>
                  ) : (
                    <td style={cell}>{fmt(ff.objectif_etape)} F</td>
                  )}
                  <td style={cell}>
                    <span onClick={() => basculerActif(ff)} style={{ cursor: 'pointer', fontSize: 12, color: ff.actif ? '#3ddc84' : 'rgba(255,255,255,0.4)' }}>
                      {ff.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td style={cell}>
                    {editId === ff.id ? (
                      <span>
                        <button style={{ ...btn, padding: '5px 10px', marginRight: 6 }} onClick={() => enregistrer(ff.id)}>OK</button>
                        <span onClick={annuler} style={{ cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Annuler</span>
                      </span>
                    ) : (
                      <span onClick={() => ouvrirEdit(ff)} style={{ cursor: 'pointer', fontSize: 12, color: OR }}>Modifier</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminFormatsPage() {
  return <AdminGuard><FormatsInner /></AdminGuard>;
}
