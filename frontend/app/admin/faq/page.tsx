/* app/admin/faq/page.tsx
   DKDK_FAQ — Écran Admin : gérer la FAQ (catégories + questions) en direct.
   Ajouter / modifier / supprimer / réordonner / activer-désactiver.
   Admin uniquement (AdminGuard). Aucune logique d'argent. */
'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useEffect, useState, useCallback } from 'react';

const API  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR   = '#FFAA00';
const INK  = '#e8e0d0';
const LINE = 'rgba(255,255,255,0.12)';
const CARD = '#15151c';

type Cat  = { id: string; libelle: string; ordre: number; actif: boolean };
type Item = { id: string; categorie_id: string; type: string; question: string; reponse: string; ordre: number; actif: boolean };

const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid ' + LINE, borderRadius: 8, color: INK, padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' };
const btn: React.CSSProperties = { border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnOr: React.CSSProperties = { ...btn, background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', color: '#140a02' };
const btnGhost: React.CSSProperties = { ...btn, background: 'transparent', border: '1px solid ' + LINE, color: INK };
const btnDanger: React.CSSProperties = { ...btn, background: 'transparent', border: '1px solid rgba(255,80,80,0.4)', color: '#ff8a8a' };
const lbl: React.CSSProperties = { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'block' };

export default function AdminFaqPage() {
  const { admin } = useAdminAuth();
  const [cats, setCats]   = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const H = useCallback(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${admin?.token}` }), [admin?.token]);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const charger = useCallback(() => {
    if (!admin?.token) return;
    setLoading(true);
    fetch(`${API}/faq/admin/all`, { cache: 'no-store', headers: H() })
      .then(r => r.json())
      .then(j => {
        if (j && j.success) {
          setCats(((j.data.categories || []) as Cat[]).slice().sort((a, b) => a.ordre - b.ordre));
          setItems(((j.data.items || []) as Item[]).slice().sort((a, b) => a.ordre - b.ordre));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [admin?.token, H]);
  useEffect(() => { charger(); }, [admin?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchCat  = (id: string, p: Partial<Cat>)  => setCats(cs => cs.map(c => c.id === id ? { ...c, ...p } : c));
  const patchItem = (id: string, p: Partial<Item>) => setItems(is => is.map(i => i.id === id ? { ...i, ...p } : i));

  const saveCat = async (c: Cat) => {
    await fetch(`${API}/faq/admin/categories/${c.id}`, { method: 'PUT', headers: H(), body: JSON.stringify({ libelle: c.libelle, ordre: Number(c.ordre) || 0, actif: c.actif }) });
    flash('Catégorie enregistrée ✓');
  };
  const addCat = async () => {
    await fetch(`${API}/faq/admin/categories`, { method: 'POST', headers: H(), body: JSON.stringify({ libelle: 'Nouvelle catégorie', ordre: cats.length + 1 }) });
    charger();
  };
  const delCat = async (c: Cat) => {
    if (!window.confirm('Supprimer la catégorie « ' + c.libelle + ' » et TOUTES ses questions ?')) return;
    await fetch(`${API}/faq/admin/categories/${c.id}`, { method: 'DELETE', headers: H() });
    charger();
  };

  const saveItem = async (it: Item) => {
    await fetch(`${API}/faq/admin/items/${it.id}`, { method: 'PUT', headers: H(), body: JSON.stringify({ categorie_id: it.categorie_id, question: it.question, reponse: it.reponse, type: it.type, ordre: Number(it.ordre) || 0, actif: it.actif }) });
    flash('Question enregistrée ✓');
  };
  const addItem = async (catId: string) => {
    const n = items.filter(i => i.categorie_id === catId).length + 1;
    await fetch(`${API}/faq/admin/items`, { method: 'POST', headers: H(), body: JSON.stringify({ categorie_id: catId, type: 'texte', question: 'Nouvelle question', reponse: '', ordre: n }) });
    charger();
  };
  const delItem = async (it: Item) => {
    if (!window.confirm('Supprimer cette question ?')) return;
    await fetch(`${API}/faq/admin/items/${it.id}`, { method: 'DELETE', headers: H() });
    charger();
  };

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f', color: INK }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '24px 20px 60px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, margin: '0 0 4px' }}>❓ FAQ — contenu de la page d'aide</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '0 0 6px' }}>
            Ajoute, modifie, réordonne ou masque les questions. Tout se reflète en direct sur la page publique /faq.
          </p>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid ' + LINE, borderRadius: 8, padding: '8px 12px', marginBottom: 16, lineHeight: 1.6 }}>
            Mise en forme des réponses : saut de ligne = nouvelle ligne · <b style={{ color: OR }}>**gras**</b> · puce = commence la ligne par « • » · lien = <code>[texte](https://…)</code>.<br />
            Type « <b>formats</b> » = la réponse affiche en plus le <b>tableau des formats en direct</b> (une seule question devrait l'utiliser).
          </div>

          <button style={{ ...btnOr, marginBottom: 18 }} onClick={addCat}>➕ Ajouter une catégorie</button>
          {msg && <span style={{ marginLeft: 12, color: '#4ade80', fontSize: 13 }}>{msg}</span>}

          {loading ? <p style={{ color: 'rgba(255,255,255,0.6)' }}>Chargement…</p> : cats.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Aucune catégorie. La base n'est peut-être pas encore initialisée (exécute le SQL de reprise), ou ajoute-en une.</p>
          ) : cats.map(c => (
            <section key={c.id} style={{ background: CARD, border: '1px solid ' + LINE, borderRadius: 14, padding: 16, marginBottom: 18, opacity: c.actif ? 1 : 0.55 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label style={lbl}>Catégorie</label>
                  <input style={inp} value={c.libelle} onChange={e => patchCat(c.id, { libelle: e.target.value })} />
                </div>
                <div style={{ width: 80 }}>
                  <label style={lbl}>Ordre</label>
                  <input style={inp} type="number" value={c.ordre} onChange={e => patchCat(c.id, { ordre: Number(e.target.value) })} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 8 }}>
                  <input type="checkbox" checked={c.actif} onChange={e => patchCat(c.id, { actif: e.target.checked })} /> Visible
                </label>
                <button style={btnOr} onClick={() => saveCat(c)}>💾</button>
                <button style={btnDanger} onClick={() => delCat(c)}>🗑️</button>
              </div>

              {items.filter(i => i.categorie_id === c.id).map(it => (
                <div key={it.id} style={{ border: '1px solid ' + LINE, borderRadius: 10, padding: 12, marginBottom: 10, background: 'rgba(255,255,255,0.02)', opacity: it.actif ? 1 : 0.55 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <label style={lbl}>Question</label>
                      <input style={inp} value={it.question} onChange={e => patchItem(it.id, { question: e.target.value })} />
                    </div>
                    <div style={{ width: 110 }}>
                      <label style={lbl}>Type</label>
                      <select style={inp} value={it.type} onChange={e => patchItem(it.id, { type: e.target.value })}>
                        <option value="texte">texte</option>
                        <option value="formats">formats</option>
                        <option value="avantages">avantages (bloc Échos)</option>
                      </select>
                    </div>
                    <div style={{ width: 70 }}>
                      <label style={lbl}>Ordre</label>
                      <input style={inp} type="number" value={it.ordre} onChange={e => patchItem(it.id, { ordre: Number(e.target.value) })} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, paddingBottom: 8 }}>
                      <input type="checkbox" checked={it.actif} onChange={e => patchItem(it.id, { actif: e.target.checked })} /> Visible
                    </label>
                  </div>
                  <label style={lbl}>Réponse</label>
                  <textarea style={{ ...inp, minHeight: 90, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} value={it.reponse} onChange={e => patchItem(it.id, { reponse: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button style={btnOr} onClick={() => saveItem(it)}>💾 Enregistrer</button>
                    <button style={btnDanger} onClick={() => delItem(it)}>🗑️ Supprimer</button>
                  </div>
                </div>
              ))}

              <button style={btnGhost} onClick={() => addItem(c.id)}>➕ Ajouter une question</button>
            </section>
          ))}
        </main>
      </div>
    </AdminGuard>
  );
}
