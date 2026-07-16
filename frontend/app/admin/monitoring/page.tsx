'use client';
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR = '#FFAA00';
const QUOTA_GB = 5; /*DKDK_QUOTA_REEL*/
const SEUIL_ORANGE_GB = 3;
const SEUIL_ROUGE_GB = 4.5;

function fmt(n: number) {
  return (n ?? 0).toLocaleString('fr-FR');
}

function Carte(props: { titre: string; valeur: string; sous?: string }) {
  return (
    <div style={{ background:'#0d0d14', border:'1px solid #1e1e2e', borderRadius:12, padding:'16px 18px' }}>
      <div style={{ fontSize:11, color:'#6a6a8a', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>{props.titre}</div>
      <div style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:800, color:'#fff', marginTop:6 }}>{props.valeur}</div>
      {props.sous ? <div style={{ fontSize:11, color:'#4a4a6a', marginTop:3 }}>{props.sous}</div> : null}
    </div>
  );
}

function MonitoringInner() {
  const { admin } = useAdminAuth();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoad]  = useState(false);
  const [erreur, setErreur] = useState("");
    /*DKDK_SOLVABILITE_BLOC*/
    const [caisse, setCaisse]   = useState("");
    const [solv, setSolv]       = useState<any>(null);
    const [solvLoad, setSolvLoad] = useState(false);
    const chargerSolvabilite = async () => {
      setSolvLoad(true);
      try {
        var c = parseFloat(caisse); if (!isFinite(c) || c < 0) c = 0;
        const r = await fetch(API + '/monitoring/solvabilite?caisse=' + c, {
          headers: { Authorization: 'Bearer ' + admin?.token },
        });
        const j = await r.json();
        if (j.success) setSolv(j.data);
      } catch (e) { /* silencieux */ }
      finally { setSolvLoad(false); }
    };

  const charger = async () => {
    setLoad(true); setErreur("");
    try {
      const r = await fetch(API + '/monitoring/stats', {
        headers: { Authorization: 'Bearer ' + admin?.token },
      });
      const j = await r.json();
      if (!j.success) { setErreur(j.error || 'Chargement echoue.'); return; }
      setData(j.data);
    } catch (e: any) {
      setErreur('Erreur reseau.');
    } finally { setLoad(false); }
  };

  useEffect(() => { charger(); }, []);

  const v = data?.videos;
  const bwGb = v?.bandwidth_gb ?? 0;
  const pct = Math.min(100, Math.round((bwGb / QUOTA_GB) * 100));
  let couleur = '#4ade80';
  if (bwGb >= SEUIL_ROUGE_GB) couleur = "#ed070f";
  else if (bwGb >= SEUIL_ORANGE_GB) couleur = OR;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'DM Sans, sans-serif' }}>
      <AdminSidebar />
      <div style={{ flex:1, padding:'32px 28px', maxWidth:900 }}>
        <h1 style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:26, marginBottom:6 }}>
          <span style={{ color: OR }}>Monitoring</span> &mdash; Sante de la plateforme
        </h1>
        <p style={{ fontSize:13, color:'#6a6a8a', marginBottom:20 }}>Stockage, bande passante et activite en temps reel.</p>

        <button onClick={charger} disabled={loading} style={{ marginBottom:20, padding:'8px 16px', borderRadius:8, border:'1px solid #1e1e2e', background:'#0d0d14', color:OR, fontWeight:600, fontSize:12, cursor:'pointer' }}>
          {loading ? 'Chargement...' : 'Rafraichir'}
        </button>

        {erreur ? <div style={{ color:'#ed070f', marginBottom:16, fontSize:13 }}>{erreur}</div> : null}

        {data ? (
          <>
            <div style={{ background:'#0d0d14', border:'1px solid #1e1e2e', borderRadius:12, padding:'18px 20px', marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#e0e0e0' }}>Bande passante (SUM vues x taille)</span>
                <span style={{ fontSize:13, fontWeight:700, color:couleur }}>{fmt(bwGb)} Go / {QUOTA_GB} Go</span>
              </div>
              <div style={{ height:14, background:'#1e1e2e', borderRadius:7, overflow:'hidden' }}>
                <div style={{ width:pct + '%', height:'100%', background:couleur, transition:'width .3s' }} />
              </div>
              <div style={{ fontSize:11, color:'#4a4a6a', marginTop:6 }}>{pct} % du quota Supabase Free. Alerte orange a {SEUIL_ORANGE_GB} Go, rouge a {SEUIL_ROUGE_GB} Go.</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:14 }}>
              <Carte titre="Stockage total" valeur={fmt(v?.storage_gb) + " Go"} sous={fmt(v?.storage_mb) + " Mo"} />
              <Carte titre="Videos" valeur={fmt(v?.total) } sous={"Vues cumulees : " + fmt(v?.total_views)} />
              <Carte titre="Utilisateurs" valeur={fmt(data?.users?.total)} />
              <Carte titre="OTP envoyes" valeur={fmt(data?.otps?.total)} sous={"Verifies : " + fmt(data?.otps?.verified)} />
              <Carte titre="Votes" valeur={fmt(data?.votes?.total)} />
              <Carte titre="Brackets" valeur={fmt(data?.brackets?.total)} />
              <Carte titre="Transactions" valeur={fmt(data?.transactions?.total)} sous={"Reussies (montant) : " + fmt(data?.transactions?.amount_success) + " F"} />
              <Carte titre="Commission encaissee" valeur={fmt(data?.transactions?.fee_success) + " F"} sous={"Sur transactions reussies"} />
            </div>

            {/*DKDK_SOLVABILITE_BLOC*/}
                <div style={{ background:'#0d0d14', border:'1px solid #1e1e2e', borderRadius:12, padding:'18px 20px', marginTop:20 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#e0e0e0', marginBottom:12 }}>Solvabilite &mdash; ce que la plateforme doit vs sa caisse</div>
                  <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
                    <input type="number" value={caisse} onChange={(e) => setCaisse(e.target.value)} placeholder="Caisse FedaPay (F)"
                      style={{ background:'#0a0a0f', border:'1px solid #1e1e2e', borderRadius:8, padding:'8px 12px', color:'#fff', fontSize:13, width:180 }} />
                    <button onClick={chargerSolvabilite} disabled={solvLoad}
                      style={{ padding:'8px 16px', borderRadius:8, border:'1px solid #1e1e2e', background:'#0d0d14', color:OR, fontWeight:600, fontSize:12, cursor:'pointer' }}>
                      {solvLoad ? 'Calcul...' : 'Calculer'}
                    </button>
                    <span style={{ fontSize:11, color:'#4a4a6a' }}>Montant “Disponible” lu sur le dashboard FedaPay.</span>
                  </div>
                  {solv ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:14 }}>
                      <Carte titre="Passif total (du aux users)" valeur={fmt(solv.passif_total) + " F"}
                        sous={"Votes : " + fmt(solv.detail?.poche1_votes_non_depenses) + " F + Gains : " + fmt(solv.detail?.poche2_gains_non_retires) + " F"} />
                      <Carte titre="Caisse FedaPay (saisie)" valeur={fmt(solv.caisse_fedapay) + " F"} />
                      <div style={{ background:'#0d0d14', border:'1px solid ' + (solv.solvable ? '#1e3a24' : '#3a1e1e'), borderRadius:12, padding:'16px 18px' }}>
                        <div style={{ fontSize:11, color:'#6a6a8a', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Retirable par admin</div>
                        <div style={{ fontFamily:'Syne, sans-serif', fontSize:24, fontWeight:800, color:(solv.solvable ? '#4ade80' : '#ed070f'), marginTop:6 }}>{fmt(solv.retirable_par_admin)} F</div>
                        <div style={{ fontSize:11, color:(solv.solvable ? '#4ade80' : '#ed070f'), marginTop:3 }}>{solv.solvable ? 'Solvable' : 'INSOLVABLE - ne pas retirer'}</div>
                      </div>
                    </div>
                  ) : <div style={{ fontSize:12, color:'#6a6a8a' }}>Saisis la caisse FedaPay puis clique sur Calculer.</div>}
                </div>

                <div style={{ fontSize:11, color:'#4a4a6a', marginTop:20 }}>Genere le {data?.generated_at}</div>
          </>
        ) : (!loading && !erreur ? <div style={{ color:'#6a6a8a' }}>Aucune donnee.</div> : null)}
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  return <AdminGuard><MonitoringInner /></AdminGuard>;
}
