'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import LogoDikiDiki from '../../components/LogoDikiDiki';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }
function fmt(n: number) { return n.toLocaleString('fr-FR'); }

/*DKDK_CALLBACK_PAGE*/
function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  const status = params.get('status') || '';
  const txId   = params.get('id') || '';

  const [phase, setPhase]     = useState<'checking' | 'ok' | 'ko'>('checking');
  const [balance, setBalance] = useState<number | null>(null);
  /*DKDK_CB_RETURN*/
  // Contexte du vote conserve avant le depart vers FedaPay (page watch).
  // S'il est present, c'etait un vote : on renvoie au challenge et on
  // propose un reessai en 1 clic (paiement neuf) au lieu d'aller vers /recharge.
  const [pendingReturn, setPendingReturn] = useState<any>(null);
  const [retrying, setRetrying]           = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dkdk_pending_return');
      if (raw) {
        const ctx = JSON.parse(raw);
        // On ignore un contexte trop vieux (> 30 min) pour eviter un reessai errone.
        if (ctx && ctx.ts && Date.now() - ctx.ts < 1800000) setPendingReturn(ctx);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const approved = status.toLowerCase() === 'approved';
    if (!approved) { setPhase('ko'); return; }

    // Le webhook credite le wallet en arriere-plan. On lui laisse
    // le temps d arriver avant de lire le solde.
    let annule = false;
    const lireSolde = async () => {
      try {
        const token = getToken();
        if (!token) { if (!annule) setPhase('ok'); return; }
        /*DKDK_VOTES_BALANCE*/ const res = await fetch(API + '/votes/balance', {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (res.ok) {
          const data = await res.json();
          const b = data.balance ?? data.wallet ?? null;
          if (!annule && b !== null) setBalance(Number(b));
        }
      } catch (_e) {
        // Silencieux : le paiement est valide, seul l affichage du solde echoue.
      }
      if (!annule) {
        setPhase('ok');
        // Succes : le contexte a rempli son role, on le nettoie.
        try { localStorage.removeItem('dkdk_pending_return'); } catch {}
      }
    };

    const t = setTimeout(lireSolde, 2500);
    return () => { annule = true; clearTimeout(t); };
  }, [status]);

  /*DKDK_RETRY_1CLIC*/
  // Reessai en 1 clic : on relance un paiement TOUT NEUF (session MTN fraiche)
  // a partir du contexte conserve, sans redemander le numero ni l'OTP.
  const retryVote = async () => {
    const token = getToken();
    if (!pendingReturn || !pendingReturn.participant_id || !token) {
      router.push(pendingReturn?.returnPath || '/recharge');
      return;
    }
    setRetrying(true);
    try {
      const res = await fetch(API + '/payment/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          participant_id: pendingReturn.participant_id,
          vote_type:      pendingReturn.vote_type,
          qty:            pendingReturn.qty,
          phone:          pendingReturn.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.paymentUrl) throw new Error(data.error || 'Erreur');
      // On rafraichit l'horodatage du contexte pour la prochaine boucle retour/reessai.
      try {
        localStorage.setItem('dkdk_pending_return', JSON.stringify({ ...pendingReturn, ts: Date.now() }));
      } catch {}
      window.location.href = data.paymentUrl;
    } catch (_e) {
      setRetrying(false);
      router.push(pendingReturn?.returnPath || '/recharge');
    }
  };

  const wrap: React.CSSProperties = {
    minHeight: '100vh',
    background: '#0a0a0f',
    backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 16, padding: 24, fontFamily: 'DM Sans, sans-serif', textAlign: 'center',
  };

  const btn: React.CSSProperties = {
    background: 'linear-gradient(135deg,#FFAA00,#FF6B00)',
    border: 'none', borderRadius: 50, padding: '13px 30px',
    fontSize: 14, fontWeight: 700, color: '#000', cursor: 'pointer',
    fontFamily: 'Syne, sans-serif', marginTop: 8,
  };

  const btnGhost: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.18)', borderRadius: 50, padding: '12px 26px',
    fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', cursor: 'pointer',
    fontFamily: 'Syne, sans-serif',
  };

  // ---- En cours de verification ----
  if (phase === 'checking') {
    return (
      <div style={wrap}>
        <LogoDikiDiki width={150} />
        <div style={{ fontSize: 44, marginTop: 8 }}>{'⏳'}</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: '#FFAA00' }}>
          Confirmation en cours…
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 320, lineHeight: 1.6 }}>
          Nous verifions ton paiement aupres de FedaPay. Ne ferme pas cette page.
        </div>
      </div>
    );
  }

  // ---- Paiement reussi ----
  if (phase === 'ok') {
    const estVote = !!(pendingReturn && pendingReturn.returnPath);
    return (
      <div style={wrap}>
        <LogoDikiDiki width={150} />
        <div style={{ fontSize: 56, marginTop: 8 }}>{'✅'}</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#4ade80' }}>
          {estVote ? 'Vote confirme !' : 'Paiement confirme !'}
        </div>
        {balance !== null ? (
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
            Nouveau solde : <strong style={{ color: '#FFAA00' }}>{fmt(balance)} F CFA</strong>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
              {fmt(Math.floor(balance / 100))} votes disponibles
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 320, lineHeight: 1.6 }}>
            {estVote ? 'Ton vote est pris en compte.' : 'Ton compte sera credite dans quelques instants.'}
          </div>
        )}
        {estVote ? (
          <button style={btn} onClick={() => { try { localStorage.removeItem('dkdk_pending_return'); } catch {} router.push(pendingReturn.returnPath); }}>
            Retour au challenge {'→'}
          </button>
        ) : (
          <button style={btn} onClick={() => router.push('/compte')}>
            Voir mon compte {'→'}
          </button>
        )}
        <button style={btnGhost} onClick={() => router.push('/home')}>
          Retour a l accueil
        </button>
      </div>
    );
  }

  // ---- Paiement echoue ou annule ----
  const estVoteKo = !!(pendingReturn && pendingReturn.participant_id);
  return (
    <div style={wrap}>
      <LogoDikiDiki width={150} />
      <div style={{ fontSize: 56, marginTop: 8 }}>{'⚠️'}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color: '#FF6B00' }}>
        Paiement non abouti
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', maxWidth: 340, lineHeight: 1.6 }}>
        Le paiement a ete annule ou a expire. <strong>Aucun montant n a ete debite.</strong>
        {txId ? (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
            Reference : {txId}
          </div>
        ) : null}
      </div>
      {estVoteKo && (
        /*DKDK_CB_COACH*/
        <div style={{ background:'rgba(255,170,0,0.10)', border:'1px solid rgba(255,170,0,0.35)', borderRadius:12, padding:'11px 14px', maxWidth:340, fontSize:12.5, color:'rgba(255,255,255,0.8)', lineHeight:1.55 }}>
          <b style={{ color:'#FFAA00' }}>⏱️ Cette fois, valide vite :</b> garde ton téléphone en main et saisis ton code PIN <b>en moins d&apos;une minute</b>. La fenêtre de MTN expire très rapidement.
        </div>
      )}
      {estVoteKo ? (
        <button style={{ ...btn, background: retrying ? 'rgba(255,170,0,0.5)' : 'linear-gradient(135deg,#4ade80,#16a34a)', color:'#03210f' }} onClick={retryVote} disabled={retrying}>
          {retrying ? '⏳…' : 'Réessayer mon vote maintenant →'}
        </button>
      ) : (
        <button style={btn} onClick={() => router.push('/recharge')}>
          Reessayer
        </button>
      )}
      <button style={btnGhost} onClick={() => { try { localStorage.removeItem('dkdk_pending_return'); } catch {} router.push(estVoteKo ? pendingReturn.returnPath : '/home'); }}>
        {estVoteKo ? 'Retour au challenge' : 'Retour a l accueil'}
      </button>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0f' }} />}>
      <CallbackInner />
    </Suspense>
  );
}
