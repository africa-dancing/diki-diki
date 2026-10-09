/* app/v/[code]/page.tsx
   DKDK_VOTE_LINK — Page de vote sans friction (rail n°1 de la spec).
   Résout un code public -> un candidat, propose de voter en 2 clics (invité,
   sans compte via one-tap téléphone), puis affiche l'écran de fin :
   « Merci ! Ta voix a porté X » + Échos gagnés + « fais voter un ami » + « récupère tes Échos ».
   N'invente AUCUN montant de gain. Les présélections ★/❤️ viennent des réglages. */
'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import LogoDikiDiki from '../../components/LogoDikiDiki';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

type Resolved = {
  participant: { id: string; name: string | null; avatar_url: string | null; video_id: string | null;
    eliminated: boolean; suspended: boolean; score: number; stars_count: number; hearts_count: number };
  bracket: { id: string; title: string; discipline: string | null; status: string; type: string | null } | null;
  active_round: { round: number; objectif_montant: number; montant_collecte: number; status: string } | null;
  video: { id: string; title: string | null; storage_url: string | null } | null;
  prix: { etoile: number; coeur: number };
  ouvert: boolean;
  ref: string | null;
  canal: string | null;
};

function fmt(n: number) { return (Number(n) || 0).toLocaleString('fr-FR'); }

function VoteLinkInner() {
  const { code } = useParams<{ code: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const refParam = sp.get('ref');
  const canalParam = sp.get('canal');
  const voted = sp.get('voted') === '1';

  const [data, setData] = useState<Resolved | null>(null);
  const [screen, setScreen] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');

  // Choix du soutien
  const [vType, setVType] = useState<'star' | 'heart'>('star');
  const [qty, setQty] = useState(1);

  // Flux invité / paiement
  const [flow, setFlow] = useState<'idle' | 'phone' | 'otp' | 'prepay'>('idle');
  const [phone, setPhone] = useState('');
  const [cgu, setCgu] = useState(false);
  const [otp, setOtp] = useState('');
  const [payUrl, setPayUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  // Échos (écran de fin) — n'affiche un nombre que si le module est actif
  const [echosActif, setEchosActif] = useState(false);
  const [echoParVote, setEchoParVote] = useState(1);

  const token = typeof window !== 'undefined' ? localStorage.getItem('dkdk_token') : null;

  const prix = data?.prix ?? { etoile: 100, coeur: 200 };
  const unit = vType === 'heart' ? prix.coeur : prix.etoile;
  const total = unit * qty;

  // Résolution du code (ajoute noclick=1 au retour post-vote pour ne pas fausser le KPI)
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const q = new URLSearchParams();
        if (refParam) q.set('ref', refParam);
        if (canalParam) q.set('canal', canalParam);
        if (voted) q.set('noclick', '1');
        const res = await fetch(`${API}/vote-link/${code}?${q.toString()}`, { cache: 'no-store' });
        if (res.status === 404) { if (!annule) setScreen('notfound'); return; }
        const j = await res.json();
        if (!res.ok || !j.success) { if (!annule) setScreen('error'); return; }
        if (!annule) { setData(j.data as Resolved); setScreen('ready'); }
      } catch { if (!annule) setScreen('error'); }
    })();
    return () => { annule = true; };
  }, [code, refParam, canalParam, voted]);

  // Statut du module Échos (barème public)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/gamification/public`);
        const j = await r.json();
        const b = j && j.data && j.data.bareme;
        if (b && b.module_actif) { setEchosActif(true); setEchoParVote(Number(b.echo_par_vote || 1)); }
      } catch { /* la page reste correcte sans */ }
    })();
  }, []);

  const phoneOk = /^\+?[1-9]\d{7,14}$/.test(phone.trim());

  // Lance le paiement du vote (invité ou connecté)
  const payNow = useCallback(async (jwt: string) => {
    if (!data) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch(`${API}/payment/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({
          participant_id: data.participant.id,
          vote_type: vType,
          qty,
          phone: phone.trim(),
          ambassadeur_code: refParam || code,
          canal: canalParam || 'direct',
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.paymentUrl) throw new Error(j.error || 'Paiement indisponible');
      const returnPath = `/v/${code}?voted=1&t=${vType}&q=${qty}`;
      try {
        localStorage.setItem('dkdk_pending_return', JSON.stringify({
          participant_id: data.participant.id, vote_type: vType, qty, phone: phone.trim(),
          returnPath, ts: Date.now(),
        }));
      } catch {}
      setPayUrl(j.paymentUrl); setFlow('prepay');
    } catch (e: any) { setErr(e.message || 'Erreur'); }
    finally { setBusy(false); }
  }, [data, vType, qty, phone, refParam, canalParam, code]);

  const onSoutenir = () => {
    setErr('');
    if (!data || !data.ouvert) return;
    setFlow('phone');
  };

  const onPhoneNext = async () => {
    setErr('');
    if (!phoneOk) { setErr('Numéro invalide.'); return; }
    if (token) { payNow(token); return; }         // déjà connecté : on paie directement
    if (!cgu) { setErr('Merci d’accepter les règles pour continuer.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/one-tap/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), accepted: true }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Envoi impossible');
      setFlow('otp');
    } catch (e: any) { setErr(e.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const onOtpVerify = async () => {
    setErr('');
    if (otp.trim().length !== 6) { setErr('Code à 6 chiffres.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/one-tap/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });
      const j = await res.json();
      if (!res.ok || !j.token) throw new Error(j.error || 'Code incorrect');
      try {
        localStorage.setItem('dkdk_token', j.token);
        localStorage.setItem('dkdk_user', JSON.stringify(j.user));
      } catch {}
      await payNow(j.token);
    } catch (e: any) { setErr(e.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  // « Fais voter un ami » : partage le MÊME lien (le copain tombe sur le même candidat)
  const shareUrl = (typeof window !== 'undefined' ? window.location.origin : '') + `/v/${code}`;
  const onShare = async () => {
    const nom = data?.participant?.name || 'ce talent';
    const txt = `Soutiens ${nom} sur Diki-Diki — un vote et tu le fais monter dans l’Arène !`;
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title: 'Diki-Diki', text: txt, url: shareUrl });
        return;
      }
    } catch { /* annulé -> on bascule sur copie */ }
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  };

  // ---------- styles ----------
  const wrap: React.CSSProperties = {
    minHeight: '100vh', background: '#0a0a0f',
    backgroundImage: 'radial-gradient(ellipse 85% 55% at 50% -8%, hsl(339,98%,49%) 0%, transparent 70%)',
    color: '#ece7da', fontFamily: 'DM Sans, system-ui, sans-serif',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '18px 16px 48px', boxSizing: 'border-box',
  };
  const card: React.CSSProperties = {
    width: '100%', maxWidth: 440, background: 'rgba(21,21,28,0.92)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 18, boxSizing: 'border-box',
  };
  const h1: React.CSSProperties = { fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, margin: '2px 0 2px' };
  const sub: React.CSSProperties = { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 };
  const btnGold: React.CSSProperties = {
    background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', border: 'none', borderRadius: 50,
    padding: '14px 22px', fontSize: 15, fontWeight: 800, color: '#140a02', cursor: 'pointer',
    fontFamily: 'Syne, sans-serif', width: '100%',
  };
  const btnGhost: React.CSSProperties = {
    background: 'transparent', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 50,
    padding: '12px 20px', fontSize: 13.5, fontWeight: 600, color: 'rgba(255,255,255,0.8)',
    cursor: 'pointer', fontFamily: 'Syne, sans-serif', width: '100%',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: '13px 14px',
    color: '#fff', fontSize: 16, outline: 'none',
  };
  const errBox = err ? (
    <div style={{ background: 'rgba(255,59,35,0.12)', border: '1px solid rgba(255,59,35,0.4)', color: '#ff9f93', borderRadius: 10, padding: '9px 12px', fontSize: 13, margin: '10px 0 0' }}>{err}</div>
  ) : null;

  const Header = (
    <div style={{ marginBottom: 14 }}><LogoDikiDiki width={132} /></div>
  );

  // ---------- écrans d'état ----------
  if (screen === 'loading') {
    return <div style={wrap}>{Header}<div style={{ ...card, textAlign: 'center' }}><div style={{ fontSize: 30 }}>⏳</div><div style={{ ...sub, marginTop: 8 }}>Un instant…</div></div></div>;
  }
  if (screen === 'notfound' || !data) {
    return (
      <div style={wrap}>{Header}
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>🔎</div>
          <div style={h1}>Lien introuvable</div>
          <div style={sub}>Ce lien de vote n’existe pas ou a expiré.</div>
          <button style={{ ...btnGhost, marginTop: 16 }} onClick={() => router.push('/challenges')}>Voir les challenges</button>
        </div>
      </div>
    );
  }

  const p = data.participant;
  const nom = p.name || 'Ce talent';
  const ar = data.active_round;
  const reste = ar && ar.objectif_montant ? Math.max(0, Number(ar.objectif_montant) - Number(ar.montant_collecte || 0)) : null;
  const pct = ar && ar.objectif_montant ? Math.min(100, Math.round((Number(ar.montant_collecte || 0) / Number(ar.objectif_montant)) * 100)) : null;

  const ProgressBar = (ar && ar.objectif_montant) ? (
    <div style={{ marginTop: 12 }}>
      <div style={{ height: 9, borderRadius: 50, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#FFC233,#FF6B00)' }} />
      </div>
      <div style={{ ...sub, marginTop: 6, fontSize: 12 }}>
        {reste && reste > 0 ? `Plus que ${fmt(reste)} F pour boucler cette étape` : 'Objectif de l’étape atteint 🎉'}
      </div>
    </div>
  ) : null;

  // ---------- ÉCRAN DE FIN (retour post-vote) ----------
  if (voted) {
    const q0 = Math.max(1, Number(sp.get('q') || '1'));
    const t0 = sp.get('t') === 'heart' ? 2 : 1;
    const echos = echosActif ? t0 * q0 * echoParVote : 0;
    return (
      <div style={wrap}>{Header}
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🎉</div>
          <div style={h1}>Merci ! Ta voix a porté {nom}</div>
          <div style={sub}>Ton soutien vient d’être pris en compte. {typeof p.score === 'number' ? `Il/elle totalise ${fmt(p.score)} point(s) de soutien.` : ''}</div>
          {ProgressBar}
          {echos > 0 && (
            <div style={{ marginTop: 16, background: 'rgba(255,194,51,0.1)', border: '1px solid rgba(255,194,51,0.35)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#FFC233' }}>🌟 Tu viens de gagner {fmt(echos)} Écho{echos > 1 ? 's' : ''} !</div>
              <div style={{ ...sub, marginTop: 4 }}>Les Échos te font monter en statut et ouvrent la vitrine des cadeaux.</div>
            </div>
          )}
          <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
            <button style={btnGold} onClick={onShare}>{copied ? 'Lien copié ✓' : '🔗 Fais voter un ami'}</button>
            <button style={btnGhost} onClick={() => router.push('/les-echos')}>🌟 Récupère tes Échos</button>
            <button style={{ ...btnGhost, border: 'none', color: 'rgba(255,255,255,0.55)' }} onClick={() => router.push(`/v/${code}`)}>Voter encore</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- PRÉPAIEMENT (consigne avant Mobile Money) ----------
  if (flow === 'prepay') {
    return (
      <div style={wrap}>{Header}
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>📲</div>
          <div style={h1}>Garde ton téléphone à portée</div>
          <div style={sub}>Tu vas recevoir une demande Mobile Money pour <b style={{ color: '#fff' }}>{fmt(total)} F</b>. Valide-la avec ton code secret <b style={{ color: '#fff' }}>sans tarder</b> (la fenêtre expire vite).</div>
          <button style={{ ...btnGold, marginTop: 18 }} onClick={() => { if (payUrl) window.location.href = payUrl; }}>Ouvrir Mobile Money</button>
          <button style={{ ...btnGhost, marginTop: 10 }} onClick={() => { setFlow('idle'); setPayUrl(''); }}>Annuler</button>
        </div>
      </div>
    );
  }

  // ---------- IDENTIFICATION INVITÉ (téléphone puis OTP) ----------
  if (flow === 'phone' || flow === 'otp') {
    return (
      <div style={wrap}>{Header}
        <div style={card}>
          <div style={h1}>Soutenir {nom}</div>
          <div style={sub}>{vType === 'heart' ? '❤️ Cœur' : '★ Étoile'} × {qty} = <b style={{ color: '#fff' }}>{fmt(total)} F</b></div>
          {flow === 'phone' && (
            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              <div style={sub}>Entre ton numéro Mobile Money. Pas besoin de créer un compte : un simple code reçu par SMS suffit.</div>
              <input style={inputStyle} inputMode="tel" placeholder="Ex. 97 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} />
              {!token && (
                <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>
                  <input type="checkbox" checked={cgu} onChange={(e) => setCgu(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>J’accepte les règles et conditions de Diki-Diki.</span>
                </label>
              )}
              {errBox}
              <button style={btnGold} disabled={busy} onClick={onPhoneNext}>{busy ? 'Un instant…' : 'Continuer'}</button>
              <button style={{ ...btnGhost, border: 'none', color: 'rgba(255,255,255,0.5)' }} onClick={() => { setFlow('idle'); setErr(''); }}>Retour</button>
            </div>
          )}
          {flow === 'otp' && (
            <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
              <div style={sub}>Entre le code à 6 chiffres reçu par SMS au {phone}.</div>
              <input style={{ ...inputStyle, letterSpacing: 6, textAlign: 'center', fontSize: 22 }} inputMode="numeric" maxLength={6} placeholder="______" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              {errBox}
              <button style={btnGold} disabled={busy} onClick={onOtpVerify}>{busy ? 'Vérification…' : 'Valider et voter'}</button>
              <button style={{ ...btnGhost, border: 'none', color: 'rgba(255,255,255,0.5)' }} onClick={() => { setFlow('phone'); setOtp(''); setErr(''); }}>Changer de numéro</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- PAGE DE VOTE (par défaut) ----------
  const presetsStar = [1, 5, 10];
  const presetsHeart = [1, 3, 5];
  const presets = vType === 'heart' ? presetsHeart : presetsStar;

  return (
    <div style={wrap}>{Header}
      <div style={card}>
        {/* Vidéo */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 16', maxHeight: 420, background: '#000', borderRadius: 14, overflow: 'hidden', margin: '0 auto' }}>
          {data.video && data.video.storage_url ? (
            <video src={data.video.storage_url} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)' }}>Vidéo indisponible</div>
          )}
        </div>

        {/* Identité candidat */}
        <div style={{ marginTop: 12 }}>
          <div style={h1}>{nom}</div>
          <div style={sub}>
            {data.bracket ? data.bracket.title : ''}{data.bracket && data.bracket.discipline ? ` · ${data.bracket.discipline}` : ''}
          </div>
          {ProgressBar}
        </div>

        {!data.ouvert ? (
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>Le vote est fermé pour ce talent</div>
            <div style={{ ...sub, marginTop: 4 }}>{p.eliminated ? 'Ce candidat n’est plus en lice sur cette étape.' : 'Reviens bientôt, ou découvre les challenges en cours.'}</div>
            <button style={{ ...btnGhost, marginTop: 12 }} onClick={() => router.push('/challenges')}>Voir les challenges</button>
          </div>
        ) : (
          <>
            {/* Choix étoile / cœur */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setVType('star'); setQty(1); }}
                style={{ padding: '14px 8px', borderRadius: 14, cursor: 'pointer', fontWeight: 800, fontFamily: 'Syne, sans-serif',
                  border: vType === 'star' ? '2px solid #FFC233' : '1px solid rgba(255,255,255,0.14)',
                  background: vType === 'star' ? 'rgba(255,194,51,0.14)' : 'rgba(255,255,255,0.04)', color: '#fff' }}>
                <div style={{ fontSize: 22 }}>★</div><div style={{ fontSize: 13 }}>Étoile</div><div style={{ ...sub, fontSize: 12 }}>{fmt(prix.etoile)} F</div>
              </button>
              <button onClick={() => { setVType('heart'); setQty(1); }}
                style={{ padding: '14px 8px', borderRadius: 14, cursor: 'pointer', fontWeight: 800, fontFamily: 'Syne, sans-serif',
                  border: vType === 'heart' ? '2px solid #FF3B6B' : '1px solid rgba(255,255,255,0.14)',
                  background: vType === 'heart' ? 'rgba(255,59,107,0.14)' : 'rgba(255,255,255,0.04)', color: '#fff' }}>
                <div style={{ fontSize: 22 }}>❤️</div><div style={{ fontSize: 13 }}>Cœur</div><div style={{ ...sub, fontSize: 12 }}>{fmt(prix.coeur)} F</div>
              </button>
            </div>

            {/* Quantité : présélections + pas à pas */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {presets.map((n) => (
                <button key={n} onClick={() => setQty(n)}
                  style={{ flex: 1, minWidth: 60, padding: '9px 6px', borderRadius: 10, cursor: 'pointer', fontWeight: 700,
                    border: qty === n ? '2px solid #FFAA00' : '1px solid rgba(255,255,255,0.14)',
                    background: qty === n ? 'rgba(255,170,0,0.14)' : 'rgba(255,255,255,0.04)', color: '#fff' }}>
                  ×{n}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 10 }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>−</button>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, minWidth: 40, textAlign: 'center' }}>{qty}</div>
              <button onClick={() => setQty((q) => Math.min(1000, q + 1))} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>+</button>
            </div>

            {/* Total + action */}
            <div style={{ textAlign: 'center', marginTop: 14, fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18 }}>
              Total : {fmt(total)} F
            </div>
            <button style={{ ...btnGold, marginTop: 12 }} onClick={onSoutenir}>Soutenir {nom}</button>
            <div style={{ ...sub, fontSize: 11.5, textAlign: 'center', marginTop: 8 }}>
              Vote par le public uniquement. Aucun gain promis : ton vote alimente la cagnotte partagée du challenge.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function VoteLinkPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0f' }} />}>
      <VoteLinkInner />
    </Suspense>
  );
}
