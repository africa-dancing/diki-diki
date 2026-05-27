'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LogoDikiDiki from '../components/LogoDikiDiki';

// ✅ Étoile rouge — identique au logo
const StarRed = () => <span style={{ color: '#FF0000' }}>★</span>;

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
        <rect width="44" height="44" rx="10" fill="#00A650"/>
        <text x="22" y="20" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="900" fontFamily="Arial,sans-serif">moov</text>
        <text x="22" y="31" textAnchor="middle" fill="#FFD700" fontSize="7.5" fontWeight="700" fontFamily="Arial,sans-serif">MONEY</text>
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
  const router = useRouter();
  const [initialBalance, setInitialBalance] = useState(0);
  const [soutenirUnits,  setSoutenirUnits]  = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(2000);
  const [customAmount,   setCustomAmount]   = useState('');
  const [method,  setMethod]  = useState('mtn');
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }
    fetch(`${API}/users/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setInitialBalance(d.balance ?? 0); })
      .catch(() => {});
    fetch(`${API}/votes/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSoutenirUnits(Math.floor((d.wallet ?? d.balance ?? 0) / 100)); })
      .catch(() => {});
  }, [router]);

  const amount = customAmount ? parseInt(customAmount.replace(/\D/g, '')) || 0 : selectedAmount;
  const units  = Math.floor(amount / 100);

  const handleRecharge = async () => {
    if (!amount || amount < 500) { setError('Montant minimum : 500 F CFA.'); return; }
    if (method !== 'card' && !phone.trim()) { setError('Numéro de téléphone requis.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount, method, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erreur');
      if (data.payment_url) { window.location.href = data.payment_url; return; }
      setSuccess(true);
      setSoutenirUnits(u => u + units);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  /* ── Écran succès ── */
  if (success) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ fontSize: 60 }}>✅</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#4ade80' }}>Rechargement réussi !</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
        {fmt(amount)} F CFA → +{fmt(units)} unités sur Compte Soutenir
      </div>
      <button
        onClick={() => router.push('/compte')}
        style={{ background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', border: 'none', borderRadius: 50, padding: '12px 28px', fontSize: 14, fontWeight: 700, color: '#000', cursor: 'pointer', marginTop: 8 }}
      >
        Retourner à mon compte →
      </button>
    </div>
  );

  /* ── Styles réutilisables ── */
  const sectionTitle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
    color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 10,
  };

  const phoneInput: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
    padding: '13px 16px', fontSize: 14, color: '#f0f0f0',
    outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f0', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,15,0.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo à gauche — identique aux autres pages */}
        <Link href="/home" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <LogoDikiDiki width={200} />
        </Link>

        {/* Annuler à droite */}
        <button
          onClick={() => router.push('/compte')}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '7px 18px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          ✕ Annuler
        </button>
      </div>

      {/* ── COLONNE UNIQUE CENTRÉE ── */}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '28px 20px 80px' }}>

        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: '#fff', marginBottom: 6 }}>
            Recharger mon compte
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            Choisissez un montant et un mode de paiement
          </div>
        </div>

        {/* ── Soldes ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.2)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: 'rgba(255,170,0,0.6)', fontWeight: 700, letterSpacing: '.1em', marginBottom: 5 }}>COMPTE INITIAL</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#FFAA00' }}>{fmt(initialBalance)} F</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>Dépôts · Retraits · Gains</div>
          </div>
          <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 9, color: 'rgba(99,102,241,0.8)', fontWeight: 700, letterSpacing: '.1em', marginBottom: 5 }}>COMPTE SOUTENIR</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#818cf8' }}>{fmt(soutenirUnits)} unités</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}><StarRed /> Voter · ❤️ Liker</div>
          </div>
        </div>

        {/* ── Info unités ── */}
        <div style={{ background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.18)', borderRadius: 12, padding: '11px 14px', fontSize: 12, color: 'rgba(255,170,0,0.85)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0 }}>💡</span>
          <span><strong>1 unité = 10 F CFA</strong> — chaque unité devient <StarRed /> étoile (voter) ou ❤️ cœur (liker) selon ton choix</span>
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
                  background: isSel ? 'linear-gradient(135deg,rgba(255,170,0,0.18),rgba(255,107,0,0.12))' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSel ? '#FFAA00' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12, padding: '13px 8px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'all .2s', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? '#FFAA00' : 'rgba(255,255,255,0.7)' }}>
                  {fmt(a)} F
                </div>
                <div style={{ fontSize: 10, color: isSel ? 'rgba(255,170,0,0.6)' : 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {fmt(Math.floor(a / 100))} unités
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Montant personnalisé ── */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 600, pointerEvents: 'none' }}>F</span>
          <input
            type="number"
            placeholder="Ou saisir un montant personnalisé…"
            value={customAmount}
            onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
            style={{ ...phoneInput, paddingLeft: 32 }}
          />
        </div>

        {/* ── Mode de paiement ── */}
        <div style={sectionTitle}>Mode de paiement</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
          {METHODS.map(m => {
            const isSel = method === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  background: isSel ? 'rgba(255,170,0,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isSel ? '#FFAA00' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 14, padding: '14px 8px',
                  cursor: 'pointer', textAlign: 'center',
                  transition: 'all .2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}
              >
                {m.logo}
                <div style={{ fontSize: 11, fontWeight: 600, color: isSel ? '#FFAA00' : 'rgba(255,255,255,0.5)' }}>
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Numéro téléphone ── */}
        {method !== 'card' ? (
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>
              Numéro {method === 'mtn' ? 'MTN MoMo' : 'Moov Money'}
            </div>
            <input
              type="tel"
              placeholder={method === 'mtn' ? '+229 01 XX XX XX XX' : '+229 02 XX XX XX XX'}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={phoneInput}
            />
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 24 }}>
            🔒 Redirection vers la page de paiement sécurisée FedaPay
          </div>
        )}

        {/* ── Erreur ── */}
        {error && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 12, padding: '11px 14px', fontSize: 13, color: '#f87171', marginBottom: 20 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Résumé ── */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Montant</span>
            <span style={{ fontWeight: 700, color: '#fff' }}>{amount > 0 ? `${fmt(amount)} F CFA` : '—'}</span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '10px 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>Unités créditées</span>
            <span style={{ fontWeight: 700, color: '#FFAA00' }}>{units > 0 ? `${fmt(units)} unités` : '—'}</span>
          </div>
        </div>

        {/* ── CTA ── */}
        <button
          onClick={handleRecharge}
          disabled={loading || !amount || amount < 500}
          style={{
            width: '100%',
            background: loading || !amount || amount < 500
              ? 'rgba(255,255,255,0.06)'
              : 'linear-gradient(135deg,#FFAA00,#FF6B00)',
            border: 'none', borderRadius: 14,
            padding: '16px', fontSize: 15, fontWeight: 800,
            color: loading || !amount || amount < 500 ? 'rgba(255,255,255,0.25)' : '#000',
            cursor: loading || !amount || amount < 500 ? 'not-allowed' : 'pointer',
            fontFamily: 'Syne, sans-serif',
            transition: 'all .2s',
          }}
        >
          {loading ? '⏳ Traitement en cours…' : amount >= 500 ? `⚡ Recharger ${fmt(amount)} F` : '⚡ Recharger'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>
          🔒 Paiement sécurisé via FedaPay · IGEJPS · RCCM RB/COT/25 A 109871
        </div>

      </div>
    </div>
  );
}