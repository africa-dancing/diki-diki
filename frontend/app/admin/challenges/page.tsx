'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';

interface Challenge {
  id: string; code: string | null; title: string | null;
  discipline: string | null; categorie: string | null; style: string | null;
  status: string; current_round: number | null; total_cagnotte: number | null;
  max_participants: number | null; created_at: string;
  bracket_participants: { count: number }[];
}

const STATUT_LABEL: { [k: string]: string } = {
  waiting_candidates: 'Inscriptions ouvertes',
  open: 'Ouvert',
  in_progress: 'En cours',
  done: 'Termine',
};
const STATUT_COULEUR: { [k: string]: string } = {
  waiting_candidates: '#38bdf8',
  open: '#38bdf8',
  in_progress: '#4ade80',
  done: '#a0a0c0',
};

function AdminChallengesInner() {
  const { admin } = useAdminAuth();
  const [liste, setListe]   = useState<Challenge[]>([]);
  const [loading, setLoad]  = useState(false);
  const [info, setInfo]     = useState('');
  const [erreur, setErreur] = useState('');
  const [detailId, setDetailId]     = useState<string | null>(null);
  const [detailTitre, setDetailTitre] = useState('');
  const [videos, setVideos]         = useState<any[]>([]);
  const [detailLoad, setDetailLoad] = useState(false);
  const [suppr, setSuppr] = useState<string | null>(null);

  const charger = async () => {
    setLoad(true); setErreur('');
    try {
      const r = await fetch(API + '/brackets/', { headers: { Authorization: 'Bearer ' + admin?.token } });
      const j = await r.json();
      if (!j.success) { setErreur(j.error || 'Chargement echoue.'); return; }
      setListe(j.data || []);
    } catch (e) { setErreur('Erreur reseau.'); }
    finally { setLoad(false); }
  };

  useEffect(() => { charger(); }, []);

  const ouvrirDetail = async (ch: Challenge) => {
    setDetailId(ch.id);
    setDetailTitre(ch.title || ch.code || 'Challenge');
    setVideos([]);
    setDetailLoad(true);
    try {
      const r = await fetch(API + '/brackets/' + ch.id, { headers: { Authorization: 'Bearer ' + admin?.token } });
      const j = await r.json();
      const parts = j?.data?.participants || j?.participants || [];
      setVideos(Array.isArray(parts) ? parts : []);
    } catch (e) { setVideos([]); }
    finally { setDetailLoad(false); }
  };

  const fermerDetail = () => { setDetailId(null); setVideos([]); };
  /*DKDK_TOGGLE_SUSPEND*/
  const toggleSuspend = async (v: any) => {
    const pid = v.id || v.participant_id;
    if (!pid) return;
    try {
      const r = await fetch(API + '/brackets/participant/' + pid + '/suspend', { method: 'POST', headers: { Authorization: 'Bearer ' + admin?.token } });
      const j = await r.json();
      if (j.success) {
        setVideos((prev: any[]) => prev.map((x: any) => ((x.id || x.participant_id) === pid ? { ...x, suspended_at: j.suspended_at } : x)));
      } else { setErreur(j.error || 'Action echouee.'); }
    } catch (e) { setErreur('Erreur reseau.'); }
  };

  const supprimer = async (ch: Challenge) => {
    if (!window.confirm('Supprimer definitivement ce challenge non demarre ? Action irreversible.')) return;
    setSuppr(ch.id); setInfo(''); setErreur('');
    try {
      const r = await fetch(API + '/brackets/arena/' + ch.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + admin?.token } });
      const j = await r.json();
      if (!j.success) { setErreur(j.error || 'Suppression echouee.'); return; }
      setInfo('Challenge supprime.');
      charger();
    } catch (e) { setErreur('Erreur reseau.'); }
    finally { setSuppr(null); }
  };

  const groupes: { [k: string]: Challenge[] } = {};
  liste.forEach((ch) => {
    const cat = ch.categorie || 'Sans categorie';
    if (!groupes[cat]) groupes[cat] = [];
    groupes[cat].push(ch);
  });
  const categories = Object.keys(groupes).sort();

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif' }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'32px 28px', maxWidth:1100 }}>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:28, marginBottom:6 }}>
          <span style={{ color: OR }}>Challenges</span> &mdash; gestion
        </h1>
        <p style={{ fontSize:14, color:'#a0a0c0', marginBottom:20 }}>Tous les challenges, classes par categorie. Clique un challenge pour voir ses videos.</p>

        <button onClick={charger} disabled={loading} style={{ marginBottom:16, padding:'8px 16px', borderRadius:8, border:'1px solid #1e1e2e', background:'#0d0d14', color:OR, fontWeight:600, fontSize:13, cursor:'pointer' }}>
          {loading ? 'Chargement...' : 'Rafraichir'}
        </button>

        {info ? <div style={{ color:'#4ade80', marginBottom:12, fontSize:14 }}>{info}</div> : null}
        {erreur ? <div style={{ color:'#ed070f', marginBottom:12, fontSize:14 }}>{erreur}</div> : null}
        {liste.length === 0 && !loading ? <div style={{ color:'#6a6a8a', fontSize:14 }}>Aucun challenge.</div> : null}

        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom:24 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#f0f0f0', marginBottom:10, fontFamily:'Syne, sans-serif' }}>
              {cat} <span style={{ fontSize:13, color:'#6a6a8a' }}>({groupes[cat].length})</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {groupes[cat].map((ch) => {
                const nbP = ch.bracket_participants?.[0]?.count ?? 0;
                const supprimable = ch.status === 'waiting_candidates';
                return (
                  <div key={ch.id} style={{ background:'#0d0d14', border:'1px solid #1e1e2e', borderRadius:10, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <div onClick={() => ouvrirDetail(ch)} style={{ flex:1, minWidth:220, cursor:'pointer' }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{ch.title || ch.code || 'Challenge'}</div>
                      <div style={{ fontSize:12, color:'#a0a0c0', marginTop:3, display:'flex', gap:10, flexWrap:'wrap' }}>
                        <span>{ch.code}</span>
                        {ch.discipline ? <span>&middot; {ch.discipline}</span> : null}
                        {ch.style ? <span>&middot; {ch.style}</span> : null}
                        <span>&middot; {nbP}/{ch.max_participants} candidats</span>
                        <span style={{ color: STATUT_COULEUR[ch.status] || '#a0a0c0', fontWeight:700 }}>&middot; {STATUT_LABEL[ch.status] || ch.status}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <button onClick={() => ouvrirDetail(ch)} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #1e1e2e', background:'#0a0a0f', color:OR, fontWeight:600, fontSize:12, cursor:'pointer' }}>Videos</button>
                      {supprimable ? (
                        <button onClick={() => supprimer(ch)} disabled={suppr === ch.id} style={{ padding:'8px 14px', borderRadius:8, border:'none', background:'#ed070f', color:'#fff', fontWeight:700, fontSize:12, cursor:'pointer', opacity: suppr === ch.id ? 0.6 : 1 }}>{suppr === ch.id ? '...' : 'Supprimer'}</button>
                      ) : (
                        <span style={{ fontSize:11, color:'#6a6a8a', fontStyle:'italic' }}>Demarre</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {detailId ? (
          <div onClick={fermerDetail} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:1000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background:'#0d0d14', border:'1px solid #1e1e2e', borderRadius:14, padding:'24px', maxWidth:560, width:'100%', maxHeight:'80vh', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <div style={{ fontSize:18, fontWeight:800, color:OR, fontFamily:'Syne, sans-serif' }}>{detailTitre}</div>
                <button onClick={fermerDetail} style={{ background:'none', border:'none', color:'#a0a0c0', fontSize:22, cursor:'pointer', lineHeight:1 }}>&times;</button>
              </div>
              <div style={{ fontSize:13, color:'#a0a0c0', marginBottom:14 }}>Videos engagees :</div>
              {detailLoad ? (
                <div style={{ color:'#6a6a8a', fontSize:14 }}>Chargement...</div>
              ) : videos.length === 0 ? (
                <div style={{ color:'#6a6a8a', fontSize:14 }}>Aucune video engagee.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {videos.map((v: any, i: number) => (
                    <div key={v.id || v.participant_id || i} style={{ background:'#0a0a0f', border:'1px solid #1e1e2e', borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ flex:1, fontSize:13, color:'#fff' }}>{v.users?.name || v.title || v.video_title || v.pseudo || v.user_pseudo || ('Candidat ' + (i + 1))}{v.suspended_at ? <span style={{ color:'#ed9b07', fontWeight:700, fontSize:11 }}> &middot; suspendu</span> : null}</span>
                      {v.score !== undefined ? <span style={{ fontSize:12, color:OR, fontWeight:700 }}>{v.score} pts</span> : null}
                      <button onClick={() => toggleSuspend(v)} style={{ padding:'6px 12px', borderRadius:8, border:'none', background: v.suspended_at ? '#4ade80' : '#ed9b07', color:'#0a0a0f', fontWeight:700, fontSize:12, cursor:'pointer' }}>{v.suspended_at ? 'Reactiver' : 'Suspendre'}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminChallengesPage() {
  return (
    <AdminGuard>
      <AdminChallengesInner />
    </AdminGuard>
  );
}
