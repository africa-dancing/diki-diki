'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';

interface Categorie  { id: string; name: string; emoji: string | null; ordre: number | null; }
interface Discipline { id: string; name: string; emoji: string | null; }
interface Champ      { id: string; ordre: number; titre: string; type: string; obligatoire: boolean; actif?: boolean; }
interface Choix      { id: string; valeur: string; ordre: number; actif: boolean; }

const carte: any = { background: '#0d0d14', border: '1px solid #1e1e2e', borderRadius: 12, padding: 16, marginBottom: 16 };
const titre: any = { fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: OR, marginBottom: 10 };
const champ: any = { background: '#14141c', border: '1px solid #2a2a3a', borderRadius: 8, padding: '7px 10px', color: '#fff', fontSize: 13, marginRight: 8, marginBottom: 8 };
const btn:   any = { background: OR, border: 'none', borderRadius: 8, padding: '7px 14px', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' };
const btnSup:any = { background: 'transparent', border: '1px solid #ff4d4d', borderRadius: 8, padding: '4px 10px', color: '#ff4d4d', fontSize: 12, cursor: 'pointer' };

function ligneStyle(actif: boolean): any {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 12px', marginBottom: 6, borderRadius: 8, cursor: 'pointer',
    background: actif ? 'rgba(255,170,0,0.12)' : '#14141c',
    border: actif ? '1px solid ' + OR : '1px solid #23232f',
  };
}

function TaxonomieInner() {
  const { admin } = useAdminAuth();
  const tok = () => ({ Authorization: 'Bearer ' + admin?.token, 'Content-Type': 'application/json' });

  const [cats, setCats]   = useState<Categorie[]>([]);
  const [discs, setDiscs] = useState<Discipline[]>([]);
  const [champs, setChamps] = useState<Champ[]>([]);
  const [choix, setChoix] = useState<Choix[]>([]);

  const [catSel, setCatSel]     = useState<string>('');
  const [discSel, setDiscSel]   = useState<string>('');
  const [champSel, setChampSel] = useState<string>('');

  const [info, setInfo]     = useState('');
  const [erreur, setErreur] = useState('');

  const [nCat, setNCat]         = useState({ name: '', emoji: '', ordre: '' });
  const [nDisc, setNDisc]       = useState({ name: '', emoji: '' });
  const [nChamp, setNChamp]     = useState({ titre: '', type: 'liste', ordre: '1' });
  const [nChoix, setNChoix]     = useState('');

  const msg = (t: string, ok = true) => { ok ? setInfo(t) : setErreur(t); setTimeout(() => { setInfo(''); setErreur(''); }, 3500); };
  const liste = (j: any) => Array.isArray(j) ? j : (j?.data ?? []);

  const chargerCats = async () => {
    try { setCats(liste(await (await fetch(API + '/categories')).json())); }
    catch { msg('Erreur reseau.', false); }
  };
  const chargerDiscs = async (id: string) => {
    setCatSel(id); setDiscSel(''); setChampSel(''); setChamps([]); setChoix([]);
    try { setDiscs(liste(await (await fetch(API + '/categories/' + id + '/disciplines')).json())); }
    catch { msg('Erreur reseau.', false); }
  };
  const chargerChamps = async (id: string) => {
    setDiscSel(id); setChampSel(''); setChoix([]);
    try { setChamps(liste(await (await fetch(API + '/categories/disciplines/' + id + '/champs?all=1')).json())); }
    catch { msg('Erreur reseau.', false); }
  };
  const chargerChoix = async (id: string) => {
    setChampSel(id);
    try { setChoix(liste(await (await fetch(API + '/categories/champs/' + id + '/choix?all=1')).json())); }
    catch { msg('Erreur reseau.', false); }
  };

  useEffect(() => { chargerCats(); }, []);

  const ajouterCat = async () => {
    if (!nCat.name.trim()) return;
    const r = await fetch(API + '/categories', { method: 'POST', headers: tok(), body: JSON.stringify({ name: nCat.name.trim(), emoji: nCat.emoji || null, ordre: Number(nCat.ordre) || 0 }) });
    if (!r.ok) return msg('Ajout impossible.', false);
    setNCat({ name: '', emoji: '', ordre: '' }); msg('Categorie ajoutee.'); chargerCats();
  };
  const supprimerCat = async (id: string) => {
    if (!confirm('Supprimer cette categorie ? Ses disciplines seront aussi supprimees.')) return;
    const r = await fetch(API + '/categories/' + id, { method: 'DELETE', headers: tok() });
    if (!r.ok) return msg('Suppression impossible.', false);
    msg('Categorie supprimee.'); setCatSel(''); setDiscs([]); chargerCats();
  };

  const ajouterDisc = async () => {
    if (!nDisc.name.trim() || !catSel) return;
    const r = await fetch(API + '/categories/disciplines', { method: 'POST', headers: tok(), body: JSON.stringify({ category_id: catSel, name: nDisc.name.trim(), emoji: nDisc.emoji || null }) });
    if (!r.ok) return msg('Ajout impossible.', false);
    setNDisc({ name: '', emoji: '' }); msg('Discipline ajoutee.'); chargerDiscs(catSel);
  };
  const supprimerDisc = async (id: string) => {
    if (!confirm('Supprimer cette discipline ? Ses champs seront aussi supprimes.')) return;
    const r = await fetch(API + '/categories/disciplines/' + id, { method: 'DELETE', headers: tok() });
    if (!r.ok) return msg('Suppression impossible.', false);
    msg('Discipline supprimee.'); chargerDiscs(catSel);
  };

  const ajouterChamp = async () => {
    if (!nChamp.titre.trim() || !discSel) return;
    const r = await fetch(API + '/categories/disciplines/' + discSel + '/champs', { method: 'POST', headers: tok(), body: JSON.stringify({ titre: nChamp.titre.trim(), type: nChamp.type, ordre: Number(nChamp.ordre) || 1, obligatoire: false }) });
    if (!r.ok) return msg('Ajout impossible (ordre deja pris ?).', false);
    setNChamp({ titre: '', type: 'liste', ordre: '1' }); msg('Champ ajoute.'); chargerChamps(discSel);
  };
  const supprimerChamp = async (id: string) => {
    if (!confirm('Supprimer ce champ ? Ses choix seront aussi supprimes.')) return;
    const r = await fetch(API + '/categories/champs/' + id, { method: 'DELETE', headers: tok() });
    if (!r.ok) return msg('Suppression impossible.', false);
    msg('Champ supprime.'); chargerChamps(discSel);
  };

  const ajouterChoix = async () => {
    if (!nChoix.trim() || !champSel) return;
    const r = await fetch(API + '/categories/champs/' + champSel + '/choix', { method: 'POST', headers: tok(), body: JSON.stringify({ valeur: nChoix.trim(), ordre: choix.length }) });
    if (!r.ok) return msg('Ajout impossible (doublon ?).', false);
    setNChoix(''); msg('Choix ajoute.'); chargerChoix(champSel);
  };
  /*DKDK_ADMIN_RESTORE*/
  const restaurerChamp = async (id: string) => {
    const r = await fetch(API + '/categories/champs/' + id + '/restore', { method: 'POST', headers: tok() });
    if (!r.ok) return msg('Restauration impossible.', false);
    msg('Detail restaure.'); chargerChamps(discSel);
  };
  const restaurerChoix = async (id: string) => {
    const r = await fetch(API + '/categories/choix/' + id + '/restore', { method: 'POST', headers: tok() });
    if (!r.ok) return msg('Restauration impossible.', false);
    msg('Choix restaure.'); chargerChoix(champSel);
  };
  /*DKDK_ADMIN_MOVE*/
  const deplacerChamp = async (id: string, direction: string) => {
    const r = await fetch(API + '/categories/champs/' + id + '/move', { method: 'POST', headers: tok(), body: JSON.stringify({ direction }) });
    if (!r.ok) return msg('Deplacement impossible.', false);
    chargerChamps(discSel);
  };
  const renommerChamp = async (id: string, actuel: string) => {
    const t = prompt('Nouveau titre du detail :', actuel);
    if (!t || !t.trim()) return;
    const r = await fetch(API + '/categories/champs/' + id, { method: 'PATCH', headers: tok(), body: JSON.stringify({ titre: t.trim() }) });
    if (!r.ok) return msg('Renommage impossible.', false);
    msg('Detail renomme.'); chargerChamps(discSel);
  };
  const deplacerChoix = async (id: string, direction: string) => {
    const r = await fetch(API + '/categories/choix/' + id + '/move', { method: 'POST', headers: tok(), body: JSON.stringify({ direction }) });
    if (!r.ok) return msg('Deplacement impossible.', false);
    chargerChoix(champSel);
  };
  const renommerChoix = async (id: string, actuel: string) => {
    const v = prompt('Nouvelle valeur :', actuel);
    if (!v || !v.trim()) return;
    const r = await fetch(API + '/categories/choix/' + id, { method: 'PATCH', headers: tok(), body: JSON.stringify({ valeur: v.trim() }) });
    if (!r.ok) return msg('Renommage impossible.', false);
    msg('Choix renomme.'); chargerChoix(champSel);
  };
  const supprimerChoix = async (id: string) => {
    const r = await fetch(API + '/categories/choix/' + id, { method: 'DELETE', headers: tok() });
    if (!r.ok) return msg('Suppression impossible.', false);
    msg('Choix supprime.'); chargerChoix(champSel);
  };

  const champCourant = champs.find(c => c.id === champSel);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
      <AdminSidebar />
      <div style={{ flex: 1, padding: '26px 30px', color: '#fff' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, marginBottom: 4 }}>
          <span style={{ color: OR }}>Taxonomie</span> — categories, disciplines et details
        </h1>
        <p style={{ color: '#8a8aa8', fontSize: 13, marginBottom: 20 }}>
          Clique sur une categorie pour voir ses disciplines, sur une discipline pour voir ses details, sur un detail pour voir ses choix.
        </p>

        {info   && <div style={{ ...carte, borderColor: '#2ecc71', color: '#2ecc71' }}>{info}</div>}
        {erreur && <div style={{ ...carte, borderColor: '#ff4d4d', color: '#ff4d4d' }}>{erreur}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

          <div style={carte}>
            <div style={titre}>1. Categories</div>
            {cats.map(c => (
              <div key={c.id} style={ligneStyle(c.id === catSel)} onClick={() => chargerDiscs(c.id)}>
                <span>{c.emoji} {c.name}</span>
                <button style={btnSup} onClick={e => { e.stopPropagation(); supprimerCat(c.id); }}>Suppr.</button>
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <input style={{ ...champ, width: 110 }} placeholder="Nom" value={nCat.name} onChange={e => setNCat({ ...nCat, name: e.target.value })} />
              <input style={{ ...champ, width: 54 }} placeholder="Emoji" value={nCat.emoji} onChange={e => setNCat({ ...nCat, emoji: e.target.value })} />
              <input style={{ ...champ, width: 54 }} placeholder="Ordre" value={nCat.ordre} onChange={e => setNCat({ ...nCat, ordre: e.target.value })} />
              <button style={btn} onClick={ajouterCat}>Ajouter</button>
            </div>
          </div>

          <div style={carte}>
            <div style={titre}>2. Disciplines</div>
            {!catSel && <div style={{ color: '#8a8aa8', fontSize: 13 }}>Choisis une categorie.</div>}
            {discs.map(d => (
              <div key={d.id} style={ligneStyle(d.id === discSel)} onClick={() => chargerChamps(d.id)}>
                <span>{d.emoji} {d.name}</span>
                <button style={btnSup} onClick={e => { e.stopPropagation(); supprimerDisc(d.id); }}>Suppr.</button>
              </div>
            ))}
            {catSel && (
              <div style={{ marginTop: 12 }}>
                <input style={{ ...champ, width: 130 }} placeholder="Nom" value={nDisc.name} onChange={e => setNDisc({ ...nDisc, name: e.target.value })} />
                <input style={{ ...champ, width: 54 }} placeholder="Emoji" value={nDisc.emoji} onChange={e => setNDisc({ ...nDisc, emoji: e.target.value })} />
                <button style={btn} onClick={ajouterDisc}>Ajouter</button>
              </div>
            )}
          </div>

          <div style={carte}>
            <div style={titre}>3. Details de la discipline</div>
            {!discSel && <div style={{ color: '#8a8aa8', fontSize: 13 }}>Choisis une discipline.</div>}
            {champs.map(c => (
              <div key={c.id} style={ligneStyle(c.id === champSel)} onClick={() => chargerChoix(c.id)}>
                <span style={{ opacity: c.actif === false ? 0.4 : 1 }}>{c.ordre}. {c.titre} <span style={{ color: '#8a8aa8', fontSize: 12 }}>({c.type}{c.actif === false ? ', desactive' : ''})</span></span>
                <span style={{ display: 'flex', gap: 4 }}>
                  <button style={btnSup} onClick={e => { e.stopPropagation(); deplacerChamp(c.id, 'up'); }}>Haut</button>
                  <button style={btnSup} onClick={e => { e.stopPropagation(); deplacerChamp(c.id, 'down'); }}>Bas</button>
                  <button style={btnSup} onClick={e => { e.stopPropagation(); renommerChamp(c.id, c.titre); }}>Renommer</button>
                {c.actif === false
                  ? <button style={btnSup} onClick={e => { e.stopPropagation(); restaurerChamp(c.id); }}>Restaurer</button>
                  : <button style={btnSup} onClick={e => { e.stopPropagation(); supprimerChamp(c.id); }}>Suppr.</button>}
                </span>
              </div>
            ))}
            {discSel && (
              <div style={{ marginTop: 12 }}>
                <input style={{ ...champ, width: 120 }} placeholder="Titre affiche" value={nChamp.titre} onChange={e => setNChamp({ ...nChamp, titre: e.target.value })} />
                <select style={{ ...champ, width: 100 }} value={nChamp.type} onChange={e => setNChamp({ ...nChamp, type: e.target.value })}>
                  <option value="liste">Liste</option>
                  <option value="musique">Mediatheque</option>
                  <option value="texte">Texte libre</option>
                </select>
                <input style={{ ...champ, width: 54 }} placeholder="1-9" value={nChamp.ordre} onChange={e => setNChamp({ ...nChamp, ordre: e.target.value })} />
                <button style={btn} onClick={ajouterChamp}>Ajouter</button>
                <div style={{ color: '#8a8aa8', fontSize: 12, marginTop: 8 }}>
                  Liste et Mediatheque separent les brackets. Texte libre est informatif.
                </div>
              </div>
            )}
          </div>

          <div style={carte}>
            <div style={titre}>4. Choix du detail</div>
            {!champSel && <div style={{ color: '#8a8aa8', fontSize: 13 }}>Choisis un detail.</div>}
            {champSel && champCourant?.type !== 'liste' && (
              <div style={{ color: '#8a8aa8', fontSize: 13 }}>
                Ce detail est de type "{champCourant?.type}" : il n a pas de choix a saisir.
              </div>
            )}
            {champSel && champCourant?.type === 'liste' && (
              <>
                {choix.map(v => (
                  <div key={v.id} style={ligneStyle(false)}>
                    <span style={{ opacity: v.actif === false ? 0.4 : 1 }}>{v.valeur}{v.actif === false ? ' (desactive)' : ''}</span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button style={btnSup} onClick={() => deplacerChoix(v.id, 'up')}>Haut</button>
                      <button style={btnSup} onClick={() => deplacerChoix(v.id, 'down')}>Bas</button>
                      <button style={btnSup} onClick={() => renommerChoix(v.id, v.valeur)}>Renommer</button>
                    {v.actif === false
                      ? <button style={btnSup} onClick={() => restaurerChoix(v.id)}>Restaurer</button>
                      : <button style={btnSup} onClick={() => supprimerChoix(v.id)}>Suppr.</button>}
                    </span>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <input style={{ ...champ, width: 150 }} placeholder="Valeur" value={nChoix} onChange={e => setNChoix(e.target.value)} />
                  <button style={btn} onClick={ajouterChoix}>Ajouter</button>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function AdminTaxonomiePage() {
  return <AdminGuard><TaxonomieInner /></AdminGuard>;
}