'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LogoDikiDiki from '../components/LogoDikiDiki';
import { useAnalytics } from '../hooks/useAnalytics'; /*DKDK_HEARTBEAT*/
import { COUNTRIES, BRANDS } from '../retrait/operators'; /*DKDK_RECHARGE_MULTIPAYS*/

// ✅ Étoile rouge — identique au logo
const StarRed = () => <span style={{ color: '#FF0000' }}>★</span>;

// Pays où la recharge est ouverte : TOUS les pays en FCFA (même règle 100 F = 1 unité).
//  · XOF (Afrique de l'Ouest) → FedaPay : Bénin, Côte d'Ivoire, Togo, Burkina, Sénégal, Niger
//  · XAF (Afrique centrale)   → PawaPay : Cameroun, Congo, Gabon
// Les pays à autre monnaie (Kenya, Zambie…) seront ajoutés quand leur tarif sera fixé.
const RECHARGE_COUNTRIES = COUNTRIES.filter(c => c.currency === 'XOF' || c.currency === 'XAF');

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }

const AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000, 500000];

const METHODS = [
  {
    id: 'mtn', label: 'MTN MoMo',
    logo: (
      <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="22" fill="#FFCC00"/>
        <text x="22" y="19" textAnchor="middle" fill="#00008B" fontSize="11" fontWeight="900" fontFamily="Arial,sans-serif">MTN</text>
        <text x="22" y="30" textAnchor="middle" fill="#00008B" fontSize="8" fontWeight="700" fontFamily="Arial,sans-serif">MoMo</text>
      </svg>
    ),
  },
  {
    id: 'moov', label: 'Moov Money',
    logo: (
      <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
        <rect width="44" height="44" rx="10" fill="#0693E3"/>
        <text x="22" y="20" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="900" fontFamily="Arial,sans-serif">moov</text>
        <text x="22" y="31" textAnchor="middle" fill="#FFD700" fontSize="7.5" fontWeight="700" fontFamily="Arial,sans-serif">MONEY</text>
      </svg>
    ),
  },
  {
    id: 'celtiis', label: 'Celtiis Cash',
    logo: (
      <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
        <rect width="44" height="44" rx="10" fill="#E2001A"/>
        <text x="22" y="20" textAnchor="middle" fill="#fff" fontSize="10.5" fontWeight="900" fontFamily="Arial,sans-serif">celtiis</text>
        <text x="22" y="31" textAnchor="middle" fill="#FFD700" fontSize="7.5" fontWeight="700" fontFamily="Arial,sans-serif">CASH</text>
      </svg>
    ),
  },
  {
    id: 'card', label: 'Carte bancaire',
    logo: (
      <svg width="42" height="42" viewBox="0 0 44 44" fill="none">
        <rect width="44" height="44" rx="10" fill="#1A56DB"/>
        <rect x="5" y="11" width="34" height="22" rx="4" fill="#2563EB" stroke="#60A5FA" strokeWidth="1"/>
        <rect x="5" y="17" width="34" height="6" fill="#1E40AF"/>
        <rect x="9" y="25" width="12" height="4" rx="1.5" fill="#93C5FD"/>
        <circle cx="33" cy="27" r="4" fill="#EF4444" fillOpacity="0.85"/>
        <circle cx="37" cy="27" r="4" fill="#FBBF24" fillOpacity="0.85"/>
        <rect x="9" y="12" width="9" height="6" rx="1.5" fill="#FBBF24" fillOpacity="0.65"/>
      </svg>
    ),
  },
];

function fmt(n: number) { return n.toLocaleString('fr-FR'); }

export default function RechargePage() {
  useAnalytics(); /*DKDK_HEARTBEAT*/
  const router = useRouter();
  /*DKDK_RETOUR_URL*/ const [retourUrl, setRetourUrl] = useState('');
  const [initialBalance, setInitialBalance] = useState(0);
  const [rechargeUnits,  setRechargeUnits]  = useState(0);
  /*DKDK_UNIT_VALUE*/ const [unitValue, setUnitValue] = useState(100); // 1 unite = X F (settings)
  /*DKDK_MIN_RECHARGE*/ const [minRecharge, setMinRecharge] = useState(100);
  const [selectedAmount, setSelectedAmount] = useState(2000);
  const [customAmount,   setCustomAmount]   = useState('');
  const [method,  setMethod]  = useState('mtn');
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');
  /*DKDK_RECHARGE_PAYS*/
  const [countryIso, setCountryIso] = useState('BJ');
  const [pawaWait,   setPawaWait]   = useState(false); // écran « Confirme sur ton téléphone »
  const country = COUNTRIES.find(c => c.iso === countryIso) || COUNTRIES[0];
  const isPawa  = country.provider === 'pawapay';
  // Opérateurs proposés selon le pays (Bénin garde ses logos, les autres viennent de BRANDS).
  const payOperators: string[] = isPawa ? country.operators : ['mtn', 'moov', 'celtiis'];

  /*DKDK_VERIF_NUM*/
  // Le SMS de verification coute 17 F. Il ne part donc PAS a
  // l inscription, mais ici : au moment ou l utilisateur veut
  // mettre de l argent. C est la seule fois ou les 17 F sont justifies.
  const [besoinVerif, setBesoinVerif] = useState(false);
  const [codeOtp,     setCodeOtp]     = useState('');
  const [otpEnvoye,   setOtpEnvoye]   = useState(false);
  const [verifMsg,    setVerifMsg]    = useState('');
  const [verifLoad,   setVerifLoad]   = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }
    /*DKDK_LIRE_URL*/
    try {
      const sp = new URLSearchParams(window.location.search);
      const m = parseInt((sp.get('montant') || '').replace(/\D/g, '')) || 0;
      if (m > 0) { setCustomAmount(String(m)); setSelectedAmount(0); }
      const r = sp.get('retour'); if (r && r.startsWith('/')) setRetourUrl(r);
    } catch {}
    fetch(`${API}/users/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setInitialBalance(d.balance ?? 0); })
      .catch(() => {});
    fetch(`${API}/votes/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setRechargeUnits(Math.floor((d.wallet ?? d.balance ?? 0) / unitValue)); })
      .catch(() => {});
    /*DKDK_UNIT_FETCH*/
    fetch(`${API}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        const rows = res?.data || [];
        const uv = rows.find((x: any) => x.key === 'recharge_unit_value');
        if (uv?.value) setUnitValue(Number(uv.value));
        const mr = rows.find((x) => x.key === 'min_recharge'); if (mr?.value) setMinRecharge(Number(mr.value));
      })
      .catch(() => {});
  }, [router]);

  const amount = customAmount ? parseInt(customAmount.replace(/\D/g, '')) || 0 : selectedAmount;
  /*DKDK_UNIT_CALC*/ const units  = Math.floor(amount / unitValue);

  /*DKDK_VERIF_NUM*/
  // Envoie le SMS de verification. C est le SEUL endroit de toute la
  // plateforme ou les 17 F sont depenses : au moment ou l utilisateur
  // veut mettre de l argent, donc quand ca en vaut la peine.
  const envoyerCode = async () => {
    if (!phone.trim()) { setVerifMsg('Renseigne ton numero ci-dessus.'); return; }
    setVerifLoad(true); setVerifMsg('');
    try {
      const r = await fetch(`${API}/auth/phone/attach`, { /*DKDK_ATTACH_FRONT*/
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'SEND_FAILED');
      setOtpEnvoye(true);
      setVerifMsg('Code envoye par SMS. Il est valable 10 minutes.');
    } catch (e: any) {
      setVerifMsg(e.message === 'USER_NOT_FOUND'
        ? 'Ce numero ne correspond pas a ton compte.'
        : 'Envoi impossible. Reessaie dans un instant.');
    } finally { setVerifLoad(false); }
  };

  // Valide le code recu. Une fois passe, le compte est verifie
  // definitivement : l utilisateur ne recevra plus jamais de SMS.
  const validerCode = async () => {
    if (codeOtp.length < 4) { setVerifMsg('Saisis le code recu.'); return; }
    setVerifLoad(true); setVerifMsg('');
    try {
      const r = await fetch(`${API}/auth/phone/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ otp: codeOtp }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'OTP_INVALID');
      setBesoinVerif(false);
      setOtpEnvoye(false);
      setCodeOtp('');
      setVerifMsg('');
      setError('Numero verifie. Tu peux maintenant recharger.');
    } catch (e: any) {
      const msgs: Record<string, string> = {
        OTP_EXPIRED: 'Code expire. Demande un nouveau code.',
        OTP_INVALID: 'Code incorrect. Verifie et reessaie.',
      };
      setVerifMsg(msgs[e.message] || 'Verification impossible.');
    } finally { setVerifLoad(false); }
  };

  const handleRecharge = async () => {
    if (!amount || amount < minRecharge) { setError('Montant minimum : ${minRecharge} F CFA.'); return; }
    if (method !== 'card' && !phone.trim()) { setError('Numéro de téléphone requis.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount, method, operator: method, phone: phone.trim(), country: countryIso }), /*DKDK_OPERATOR_FIELD DKDK_RECHARGE_PAYS*/
      });
      const data = await res.json();
      /*DKDK_VERIF_NUM*/
      // Numero pas encore verifie : on affiche l encart plutot qu une erreur.
      if (res.status === 403 && data.error === 'PHONE_NOT_VERIFIED') {
        setBesoinVerif(true);
        setError('');
        setLoading(false);
        return;
      }

      /*DKDK_ERR_MSG*/
      if (!res.ok) {
        const _code = String(data.error || data.message || '');
        const _msgs: Record<string, string> = {
          MISSING_FIELDS:   'Informations incompletes. Verifie le montant et le numero.',
          INVALID_AMOUNT:   'Montant invalide (entre 100 et 100 000 F CFA).',
          PAYMENT_FAILED:   'Le service de paiement est indisponible. Reessaie dans un instant.',
          TX_INSERT_FAILED: 'Erreur lors de l enregistrement. Aucun montant n a ete debite.',
          TOKEN_INVALID:    'Ta session a expire. Reconnecte-toi.',
          USER_NOT_FOUND:   'Compte introuvable. Reconnecte-toi.',
        };
        throw new Error(_msgs[_code] || ('Echec de la recharge' + (_code ? ' (' + _code + ')' : '') + '.'));
      }
      /*DKDK_CLEAR_VOTE_CTX*/ // Une recharge n'est pas un vote : on purge tout contexte de retour de vote pour eviter un mauvais libelle au callback.
      try { localStorage.removeItem('dkdk_pending_return'); } catch {}
      // FedaPay (Bénin) : redirection vers le checkout hébergé.
      if (data.paymentUrl || data.payment_url) { window.location.href = (data.paymentUrl || data.payment_url); return; } /*DKDK_PAYMENT_URL*/
      // PawaPay : pas de redirection — l'utilisateur confirme le paiement sur son téléphone.
      // On sonde le solde : le callback crédite le compte dès que le paiement est confirmé.
      if (data.provider === 'pawapay' || data.depositId) { /*DKDK_PAWAPAY_WAIT*/
        const before = initialBalance;
        setPawaWait(true);
        let tries = 0;
        const poll = setInterval(async () => {
          tries++;
          try {
            const rb = await fetch(`${API}/users/balance`, { headers: { Authorization: `Bearer ${getToken()}` } });
            const db = rb.ok ? await rb.json() : null;
            const bal = (db && typeof db.balance === 'number') ? db.balance : before;
            if (bal > before) { clearInterval(poll); setInitialBalance(bal); setPawaWait(false); setSuccess(true); }
          } catch {}
          if (tries >= 24) clearInterval(poll); // ~1,5 min de sondage
        }, 4000);
        return;
      }
      throw new Error('Reponse inattendue du serveur. Aucun montant n a ete debite.');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  /* ── Écran d'attente PawaPay : « Confirme sur ton téléphone » ── */
  if (pawaWait) return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--ink)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'0 24px', textAlign:'center', fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ fontSize:56 }}>📲</div>
      <div style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:800 }}>Confirme sur ton téléphone</div>
      <div style={{ fontSize:14, color:'var(--ink-soft)', maxWidth:'42ch', lineHeight:1.6 }}>
        Une demande de paiement Mobile Money de <strong style={{ color:'var(--ink)' }}>{fmt(amount)} F CFA</strong> vient d'être envoyée sur ton téléphone ({country.flag} {country.name}). Valide-la avec ton code Mobile Money — ton compte sera crédité automatiquement dès la confirmation.
      </div>
      <div style={{ fontSize:12.5, color:'var(--ink-dim)' }}>⏳ En attente de la confirmation…</div>
      <button onClick={() => setPawaWait(false)} style={{ marginTop:8, background:'transparent', border:'1px solid var(--line-strong)', borderRadius:50, padding:'10px 20px', color:'var(--ink-soft)', cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>Fermer</button>
    </div>
  );

  /* ── Écran succès ── */
  if (success) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ fontSize: 60 }}>✅</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#4ade80' }}>Rechargement réussi !</div>
      <div style={{ fontSize: 14, color: 'var(--ink-soft)', textAlign: 'center' }}>
        {fmt(amount)} F CFA → +{fmt(units)} unités sur Compte Voter & Soutenir
      </div>
      <button
        onClick={() => router.push(retourUrl || '/compte')}
        style={{ background: 'linear-gradient(135deg,#FF6B00,#FFD700)', border: 'none', borderRadius: 50, padding: '12px 28px', fontSize: 14, fontWeight: 700, color: '#000', cursor: 'pointer', marginTop: 8 }}
      >
        Retourner à mon compte →
      </button>
    </div>
  );

  /* ── Styles réutilisables ── */
  const sectionTitle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
    color: 'var(--ink-dim)', textTransform: 'uppercase', marginBottom: 10,
  };

  const phoneInput: React.CSSProperties = {
    width: '100%', background: 'var(--surface)',
    border: '1px solid var(--line)', borderRadius: 12,
    padding: '13px 16px', fontSize: 14, color: 'var(--ink)',
    outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 70% 90px at 50% 18px,hsl(339, 98%, 49%) 0%,transparent 70%) no-repeat, var(--bg)', color: 'var(--ink)', fontFamily: 'DM Sans, sans-serif', paddingTop: 56 }}>

      {/* ── TOPBAR (toujours sombre — comme sur les autres pages, pour le logo) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: 'rgba(8,8,15,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,170,0,0.12)',
        padding: '0 24px 0 0', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo à gauche — identique aux autres pages */}
        <Link href="/home" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <LogoDikiDiki width={130} />
        </Link>

        {/* Annuler à droite */}
        <button
          onClick={() => router.push(retourUrl || '/compte')}
          style={{ background: 'var(--nav-surface)', border: '1px solid var(--nav-line)', borderRadius: 50, padding: '7px 18px', fontSize: 12, fontWeight: 600, color: 'var(--nav-ink-soft)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          ✕ Annuler
        </button>
      </div>

      {/* ── COLONNE UNIQUE CENTRÉE ── */}
      {/*DKDK_HALO*/}
        {/*DKDK_HALO — halo magenta pleine largeur : voir le fond du conteneur racine*/}
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* Titre */}
        <div style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', borderRadius: 18, padding: '22px 20px', marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>⚡</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 6 }}>Recharger mon compte</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Choisissez un montant et un mode de paiement</div>
        </div>

        {/* ── Soldes ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'rgba(255,170,0,0.10)', border: '1px solid rgba(255,170,0,0.32)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: 'var(--or)', fontWeight: 800, letterSpacing: '.1em', marginBottom: 5 }}>COMPTE DE RETRAIT</div>{/*DKDK_RENAME_RETRAIT*/}
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: 'var(--or)' }}>{fmt(initialBalance)} F</div>
            <div style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 3 }}>Dépôts · Retraits · Gains</div>
          </div>
          <div style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.32)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: '#4f46e5', fontWeight: 800, letterSpacing: '.1em', marginBottom: 5 }}>COMPTE VOTER & SOUTENIR</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#4f46e5' }}>{fmt(rechargeUnits)} unités</div>
            <div style={{ fontSize: 10, color: 'var(--ink-dim)', marginTop: 3 }}><StarRed /> Voter · ❤️ Liker</div>
          </div>
        </div>

        {/* ── Info unités ── */}
        <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.18)', borderRadius: 12, padding: '11px 14px', fontSize: 12, color: 'var(--or)', fontWeight: 600, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0 }}>💡</span>
          <span><strong>{`1 unité = ${unitValue} F CFA`}</strong> — chaque unité devient <StarRed /> étoile (voter) ou ❤️ cœur (liker) selon ton choix</span>
        </div>

        {/* ── Montants ── */}
        <div style={sectionTitle}>Choisir un montant</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
          {AMOUNTS.map(a => {
            const isSel = selectedAmount === a && !customAmount;
            return (
              <button
                key={a}
                onClick={() => { setSelectedAmount(a); setCustomAmount(''); }}
                style={{
                  background: isSel ? 'linear-gradient(135deg,rgba(255,170,0,0.18),rgba(255,107,0,0.12))' : 'var(--surface)',
                  border: `1px solid ${isSel ? 'var(--or)' : 'var(--line)'}`,
                  borderRadius: 12, padding: '13px 8px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'all .2s', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? 'var(--or)' : 'var(--ink-soft)' }}>
                  {fmt(a)} F
                </div>
                <div style={{ fontSize: 10, color: isSel ? 'var(--or)' : 'var(--ink-dim)', marginTop: 2 }}>
                  {fmt(Math.floor(a / unitValue))} unités
                </div>
              </button>
            );
          })}
        </div>
        {/*DKDK_CUSTOM_AMOUNT*/}
        <input
          inputMode="numeric"
          placeholder={`Autre montant (${fmt(minRecharge)} – 1 000 000 F, multiples de 100)`}
          value={customAmount}
          onChange={e => setCustomAmount(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            if (!customAmount) return;
            let v = parseInt(customAmount.replace(/\D/g, "")) || 0;
            if (v > 1000000) v = 1000000;
            v = Math.round(v / 100) * 100;
            if (v > 0 && v < minRecharge) v = minRecharge;
            setCustomAmount(v > 0 ? String(v) : "");
            if (v > 0) setSelectedAmount(0);
          }}
          style={{
            width: "100%", boxSizing: "border-box", marginBottom: 10,
            background: customAmount ? "linear-gradient(135deg,rgba(255,170,0,0.18),rgba(255,107,0,0.12))" : "var(--surface)",
            border: `1px solid ${customAmount ? "var(--or)" : "var(--line)"}`,
            borderRadius: 12, padding: "13px 12px", fontSize: 13, fontWeight: 700,
            color: customAmount ? "var(--or)" : "var(--ink-soft)",
            fontFamily: "DM Sans, sans-serif", outline: "none",
          }}
        />

        

        {/* ── Pays ── */}
        <div style={sectionTitle}>Pays de paiement</div>
        <select
          value={countryIso}
          onChange={e => {
            const iso = e.target.value;
            setCountryIso(iso);
            const c = COUNTRIES.find(x => x.iso === iso);
            const ops = (c && c.provider === 'pawapay') ? c.operators : ['mtn', 'moov', 'celtiis'];
            setMethod(ops[0] || 'mtn');
            setError('');
          }}
          style={{ ...phoneInput, marginBottom: 20, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}
        >
          {RECHARGE_COUNTRIES.map(c => (
            <option key={c.iso} value={c.iso} style={{ background: 'var(--bg-soft)', color: 'var(--ink)' }}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>

        {/* ── Mode de paiement ── */}
        <div style={sectionTitle}>Mode de paiement</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
          {payOperators.map(id => {
            const isSel = method === id;
            const meth = METHODS.find(m => m.id === id); // logo dédié (Bénin : mtn/moov/celtiis)
            const b = BRANDS[id];
            const label = meth?.label || b?.label || id;
            return (
              <div
                key={id}
                onClick={() => setMethod(id)}
                style={{
                  background: isSel ? 'rgba(255,170,0,0.08)' : 'var(--surface)',
                  border: `1px solid ${isSel ? 'var(--or)' : 'var(--line)'}`,
                  borderRadius: 14, padding: '14px 8px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'all .2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                {meth?.logo || (
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: b?.bg || 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: b?.fg || 'var(--ink)', fontWeight: 800, fontSize: 11 }}>
                    {(b?.label || id).slice(0, 3).toUpperCase()}
                  </div>
                )}
                <div style={{ fontSize: 11, fontWeight: 600, color: isSel ? 'var(--or)' : 'var(--ink-soft)' }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Numéro téléphone ── */}
        {method !== 'card' ? (
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>
              Numéro {METHODS.find(x => x.id === method)?.label || BRANDS[method]?.label || 'Mobile Money'}
            </div>
            <input
              type="tel"
              placeholder={`${country.prefix} …`}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={phoneInput}
            />
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: 'var(--ink-soft)', textAlign: 'center', marginBottom: 24 }}>
            🔒 Redirection vers la page de paiement sécurisée FedaPay
          </div>
        )}

        {/* ── Erreur ── */}
        {/*DKDK_VERIF_NUM*/}
        {besoinVerif && (
          <div style={{ background: 'rgba(255,170,0,0.07)', border: '1px solid rgba(255,170,0,0.3)', borderRadius: 14, padding: '18px 20px', marginBottom: 18 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--or)', marginBottom: 6 }}>
              Verifie ton numero
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 14 }}>
              Avant de recharger, nous devons confirmer que ce numero est bien le tien.
              Tu ne le feras qu une seule fois.
            </div>

            {!otpEnvoye ? (
              <button onClick={envoyerCode} disabled={verifLoad}
                style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', border: 'none', borderRadius: 10, color: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, cursor: verifLoad ? 'wait' : 'pointer', opacity: verifLoad ? 0.6 : 1 }}>
                {verifLoad ? 'Envoi...' : 'Recevoir le code par SMS'}
              </button>
            ) : (
              <div>
                <input value={codeOtp} onChange={e => setCodeOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Code a 6 chiffres" inputMode="numeric" maxLength={6}
                  style={{ width: '100%', padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 10, color: 'var(--or)', fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center', outline: 'none', marginBottom: 10 }} />
                <button onClick={validerCode} disabled={verifLoad}
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', border: 'none', borderRadius: 10, color: '#0a0a0f', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, cursor: verifLoad ? 'wait' : 'pointer', opacity: verifLoad ? 0.6 : 1 }}>
                  {verifLoad ? 'Verification...' : 'Valider'}
                </button>
                <button onClick={envoyerCode} disabled={verifLoad}
                  style={{ width: '100%', padding: '8px', background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontFamily: 'DM Sans, sans-serif', fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                  Renvoyer le code
                </button>
              </div>
            )}

            {verifMsg && (
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, lineHeight: 1.5 }}>{verifMsg}</div>
            )}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '11px 14px', fontSize: 13, color: '#f87171', marginBottom: 20 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Résumé ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--ink-soft)' }}>Montant</span>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{amount > 0 ? `${fmt(amount)} F CFA` : '—'}</span>
          </div>
          <div style={{ height: 1, background: 'var(--line)', margin: '10px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--ink-soft)' }}>Unités créditées</span>
            <span style={{ fontWeight: 700, color: 'var(--or)' }}>{units > 0 ? `${fmt(units)} unités` : '—'}</span>
          </div>
        </div>

        {/* ── CTA ── */}
        <button
          onClick={handleRecharge}
          disabled={loading || !amount || amount < minRecharge}
          style={{
            width: '100%',
            background: loading || !amount || amount < minRecharge
              ? 'var(--surface2)'
              : 'linear-gradient(135deg,#FF6B00,#FFD700)',
            border: 'none', borderRadius: 14,
            padding: '16px', fontSize: 15, fontWeight: 800,
            color: loading || !amount || amount < minRecharge ? 'var(--ink-dim)' : '#000',
            cursor: loading || !amount || amount < minRecharge ? 'not-allowed' : 'pointer',
            fontFamily: 'Syne, sans-serif',
            transition: 'all .2s',
          }}
        >
          {loading ? '⏳ Traitement en cours…' : amount >= minRecharge ? `⚡ Recharger ${fmt(amount)} F` : '⚡ Recharger'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-dim)', marginTop: 12 }}>
          🔒 Paiement sécurisé via FedaPay · IGEJPS · RCCM RB/COT/25 A 109871
        </div>

      </div>
    </div>
  );
}