'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }
function fmt(n: number) { return n.toLocaleString('fr-FR'); }

const METHODS = [
  { id: 'mtn',  label: 'MTN MoMo',      gradient: 'linear-gradient(135deg,#FFAA00,#FF6B00)',
    logo: (
      <svg width="38" height="38" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="22" fill="#FFCC00"/>
        <text x="22" y="19" textAnchor="middle" fill="#00008B" fontSize="11" fontWeight="900" fontFamily="Arial,sans-serif">MTN</text>
        <text x="22" y="30" textAnchor="middle" fill="#00008B" fontSize="8" fontWeight="700" fontFamily="Arial,sans-serif">MoMo</text>
      </svg>
    )
  },
  { id: 'moov', label: 'Moov Money',     gradient: 'linear-gradient(135deg,#FFAA00,#FF6B00)',
    logo: (
      <svg width="38" height="38" viewBox="0 0 44 44" fill="none">
        <rect width="44" height="44" rx="10" fill="#00A650"/>
        <text x="22" y="20" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="900" fontFamily="Arial,sans-serif">moov</text>
        <text x="22" y="31" textAnchor="middle" fill="#FFD700" fontSize="7.5" fontWeight="700" fontFamily="Arial,sans-serif">MONEY</text>
      </svg>
    )
  },
  { id: 'bank', label: 'Virement',       gradient: 'linear-gradient(135deg,#FFAA00,#FF6B00)',
    logo: (
      <svg width="38" height="38" viewBox="0 0 44 44" fill="none">
        <rect width="44" height="44" rx="10" fill="#1E3A5F"/>
        <rect x="7" y="20" width="30" height="14" rx="2" fill="#2563EB" stroke="#93C5FD" strokeWidth="0.8"/>
        <rect x="10" y="16" width="24" height="6" rx="1" fill="#1D4ED8"/>
        <polygon points="22,8 35,16 9,16" fill="#3B82F6"/>
        <rect x="12" y="23" width="4" height="8" rx="1" fill="#93C5FD"/>
        <rect x="20" y="23" width="4" height="8" rx="1" fill="#93C5FD"/>
        <rect x="28" y="23" width="4" height="8" rx="1" fill="#93C5FD"/>
        <rect x="7" y="34" width="30" height="2" rx="1" fill="#60A5FA"/>
      </svg>
    )
  },
];

export default function RetraitPage() {
  const router = useRouter();
  const [initialBalance, setInitialBalance]   = useState(0);
  const [totalEarned, setTotalEarned]         = useState(0);
  const [amount, setAmount]                   = useState('');
  const [method, setMethod]                   = useState('mtn');
  const [phone, setPhone]                     = useState('');
  const [holder, setHolder]                   = useState('');
  const [bankDetails, setBankDetails]         = useState('');
  const [loading, setLoading]                 = useState(false);
  const [success, setSuccess]                 = useState(false);
  const [error, setError]                     = useState('');
  const [confirmed, setConfirmed]             = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }

    fetch(`${API}/users/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setInitialBalance(d.data?.solde_retirable ?? 0) /*DKDK_RETRAIT_FIX*/; })
      .catch(() => {});

    fetch(`${API}/users/earnings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTotalEarned(d.total_earned ?? d.earnings ?? 0); })
      .catch(() => {});
  }, [router]);

  const amountNum = parseInt(amount.replace(/\D/g, '')) || 0;
  const isValid   = amountNum >= 1000 && amountNum <= initialBalance && amountNum <= 2000000 && (method === 'bank' ? !!holder && !!bankDetails : !!phone);

  const handleWithdraw = async () => {
    if (!isValid) return;
    if (!confirmed) { setConfirmed(true); return; } // double confirmation
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/payment/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ amount: amountNum, method, phone: phone.trim(), holder: holder.trim(), bank_details: bankDetails.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'Erreur lors du retrait');
      setSuccess(true);
      setInitialBalance(b => b - amountNum);
    } catch (e: any) { setError(e.message); setConfirmed(false); }
    finally { setLoading(false); }
  };

  const OR = '#FFAA00';
  const card: React.CSSProperties = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:'18px 20px', marginBottom:14 };
  const lbl: React.CSSProperties  = { display:'block', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:7, textTransform:'uppercase', letterSpacing:'.5px' };
  const inp: React.CSSProperties  = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'11px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'DM Sans, sans-serif', boxSizing:'border-box' as const };
  const btnP: React.CSSProperties = { background:'linear-gradient(135deg,#FFAA00,#FF6B00)', border:'none', borderRadius:50, padding:'12px 24px', fontSize:14, fontWeight:700, color:'#000', cursor:'pointer', fontFamily:'DM Sans, sans-serif' };
  const btnS: React.CSSProperties = { background:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:50, padding:'11px 20px', fontSize:13, color:'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:'DM Sans, sans-serif' };

  if (success) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f0', fontFamily:'DM Sans, sans-serif' }}>
      <div style={{ maxWidth:520, margin:'0 auto', padding:'80px 16px', textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>💸</div>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:900, color:'#4ade80', marginBottom:8 }}>Demande de retrait envoyée !</div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>{fmt(amountNum)} F CFA en cours de traitement</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:28, lineHeight:1.7 }}>
          Ton virement sera effectué sous <strong style={{ color:'#fff' }}>48h ouvrées</strong>.<br/>
          Nouveau solde Compte de Retrait : <strong style={{ color:OR }}>{fmt(initialBalance)} F CFA</strong>
        </div>
        <button onClick={() => router.push('/compte')} style={btnP}>Retourner à mon compte</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'radial-gradient(ellipse 70% 90px at 50% 18px,hsl(339, 98%, 49%) 0%,transparent 70%) no-repeat, #0a0a0f', color:'#f0f0f0', fontFamily:'DM Sans, sans-serif', paddingBottom:60, paddingTop:56 }}>

      {/* Topbar */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, background:'rgba(8,8,15,0.97)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,170,0,0.12)', padding:'0 20px 0 0', height:56, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/home" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.15rem' }}>
            <LogoDikiDiki width={130} />
          </span>
          
        </Link>
        <button onClick={() => router.push('/compte')} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'6px 14px', color:'rgba(255,255,255,0.5)', fontSize:12, cursor:'pointer' }}>
          ✕ Annuler
        </button>
      </div>

      {/*DKDK_HALO*/}
        {/*DKDK_HALO — halo magenta pleine largeur : voir le fond du conteneur racine*/}
        <div style={{ maxWidth:520, margin:'0 auto', padding:'24px 16px' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', borderRadius:18, padding:'22px 20px', marginBottom:20, textAlign:'center' }}>
          <div style={{ fontSize:38, marginBottom:8 }}>💸</div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'#fff', marginBottom:6 }}>Retirer mes gains</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.85)', lineHeight:1.6 }}>Transfert depuis ton Compte de Retrait vers Mobile Money ou compte bancaire</div>
        </div>

        {/* Compte de Retrait *//*DKDK_RENAME_RETRAIT_PAGE*/}
        <div style={{ background:'rgba(56,130,220,0.08)', border:'1px solid rgba(56,130,220,0.25)', borderRadius:16, padding:'16px 18px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:10, color:'rgba(56,130,220,0.8)', fontWeight:700, letterSpacing:'.08em', marginBottom:4 }}>COMPTE DE RETRAIT — disponible</div>
              <div style={{ fontSize:26, fontWeight:800, color:'#60a5fa', fontFamily:'Syne,sans-serif' }}>{fmt(initialBalance)} F CFA</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:3 }}>
                dont {fmt(totalEarned)} F issus de tes gains candidat
              </div>
            </div>
            <span style={{ fontSize:32 }}>💳</span>
          </div>
        </div>

        {/* Info Compte Voter & Soutenir */}
        <div style={{ background:'rgba(255,80,80,0.05)', border:'1px solid rgba(255,80,80,0.18)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'rgba(255,120,120,0.8)' }}>
          🔒 Le Compte Voter & Soutenir (étoiles/cœurs) ne permet pas de retrait. Seul le Compte de Retrait peut être retiré.
        </div>

        {/* Montant */}
        <div style={card}>
          <label style={lbl}>Montant à retirer (min. 1 000 F)</label>
          <input style={inp} type="text" placeholder="Ex : 5 000"
            value={amount} onChange={e => { setAmount(e.target.value); setConfirmed(false); }} />
          {amountNum > 0 && amountNum < 1000 && (
            <div style={{ fontSize:11, color:'#f87171', marginTop:6 }}>Montant minimum : 1 000 F CFA</div>
          )}
          {amountNum > initialBalance && (
            <div style={{ fontSize:11, color:'#f87171', marginTop:6 }}>Montant supérieur à ton solde disponible</div>
          )}
        </div>

        {/* Méthode */}
        <div style={card}>
          <label style={lbl}>Méthode de retrait</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
            {METHODS.map(m => (
              <div key={m.id} onClick={() => { setMethod(m.id); setConfirmed(false); }}
                style={{ background: m.gradient, border:`2px solid ${method===m.id?'#fff':'transparent'}`, borderRadius:14, padding:'10px 6px', textAlign:'center' as const, cursor:'pointer', transition:'all .2s', boxShadow: method===m.id?'0 0 0 1px rgba(255,255,255,0.3)':'none', display:'flex', flexDirection:'column' as const, alignItems:'center', gap:5 }}>
                {m.logo}
                <div style={{ fontSize:10, fontWeight:700, color:'#000' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {method !== 'bank' ? (
            <>
              <label style={lbl}>Numéro de réception</label>
              <input style={{ ...inp, marginBottom:10 }} type="tel" placeholder="+229 01 XX XX XX XX" value={phone} onChange={e => { setPhone(e.target.value); setConfirmed(false); }} />
              <label style={lbl}>Titulaire du compte</label>
              <input style={inp} type="text" placeholder="Nom complet" value={holder} onChange={e => { setHolder(e.target.value); setConfirmed(false); }} />
            </>
          ) : (
            <>
              <label style={lbl}>Titulaire du compte bancaire</label>
              <input style={{ ...inp, marginBottom:10 }} type="text" placeholder="Nom complet" value={holder} onChange={e => { setHolder(e.target.value); setConfirmed(false); }} />
              <label style={lbl}>IBAN / Coordonnées bancaires</label>
              <textarea style={{ ...inp, resize:'vertical', minHeight:60 }} placeholder="IBAN, banque, agence…" value={bankDetails} onChange={e => { setBankDetails(e.target.value); setConfirmed(false); }} />
            </>
          )}
        </div>

        {/* Récapitulatif */}
        {amountNum >= 1000 && amountNum <= initialBalance && (
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>Récapitulatif</div>
            {[
              { lbl:'Montant demandé',       val:`${fmt(amountNum)} F CFA`,          color:'#fff' },
              { lbl:'Frais de retrait (2%)',  val:`${fmt(Math.ceil(amountNum * 0.02))} F CFA`,                 color:'rgba(255,255,255,0.85)' },
              { lbl:'Vous recevrez',          val:`${fmt(amountNum - Math.ceil(amountNum * 0.02))} F CFA`,     color:OR },
              { lbl:'Solde après retrait',   val:`${fmt(initialBalance - amountNum)} F CFA`, color:'rgba(255,255,255,0.5)' },
              { lbl:'Délai de traitement',   val:'48h ouvrées',                      color:'rgba(255,255,255,0.5)' },
            ].map((r, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop: i>0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{r.lbl}</span>
                <span style={{ fontSize:12, fontWeight:i>=2?700:400, color:r.color }}>{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation */}
        {confirmed && (
          <div style={{ background:'rgba(255,170,0,0.06)', border:'1px solid rgba(255,170,0,0.25)', borderRadius:12, padding:'12px 16px', marginBottom:14, fontSize:13, color:OR }}>
            ⚠️ Confirme le retrait de <strong>{fmt(amountNum)} F CFA</strong> vers {method === 'mtn' ? 'MTN MoMo' : method === 'moov' ? 'Moov Money' : 'virement bancaire'}.
            Cette action est irréversible.
          </div>
        )}

        {error && (
          <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#f87171', marginBottom:14 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => router.push('/compte')} style={btnS}>Annuler</button>
          <button onClick={handleWithdraw} disabled={!isValid || loading}
            style={{ ...btnP, flex:1, opacity: !isValid || loading ? 0.5 : 1,
              background: confirmed ? 'linear-gradient(135deg,#f87171,#ef4444)' : 'linear-gradient(135deg,#FFAA00,#FF6B00)',
            }}>
            {loading ? '⏳ Traitement…' : confirmed ? `✅ Confirmer le retrait de ${fmt(amountNum)} F` : `💸 Retirer ${amountNum ? fmt(amountNum) + ' F CFA' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}