'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { COUNTRIES, BRANDS, getCountry, currencyRule } from './operators';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }
function fmt(n: number) { return n.toLocaleString('fr-FR'); }

export default function RetraitPage() {
  const router = useRouter();
  const [initialBalance, setInitialBalance]   = useState(0);
  const [totalEarned, setTotalEarned]         = useState(0);
  const [countryIso, setCountryIso]           = useState('BJ');
  const [amount, setAmount]                   = useState('');
  const [method, setMethod]                   = useState('mtn'); // id d'opérateur
  const [phone, setPhone]                     = useState('');
  const [holder, setHolder]                   = useState('');
  const [loading, setLoading]                 = useState(false);
  const [success, setSuccess]                 = useState(false);
  const [error, setError]                     = useState('');
  const [confirmed, setConfirmed]             = useState(false);

  const country = getCountry(countryIso) || COUNTRIES[0];
  const rule = currencyRule(country.currency);
  const MIN = rule.min;   // minimum de retrait pour la devise du pays
  const CUR = rule.label; // libellé de la devise (F CFA, GNF…)

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

  // Quand on change de pays : on sélectionne son premier opérateur et on réinitialise.
  function changeCountry(iso: string) {
    const c = getCountry(iso);
    setCountryIso(iso);
    setMethod(c && c.operators.length ? c.operators[0] : '');
    setConfirmed(false);
    setError('');
  }

  const amountNum = parseInt(amount.replace(/\D/g, '')) || 0;
  const FEE = rule.feePct ? Math.ceil(amountNum * rule.feePct) : rule.fee; // frais fixes (FedaPay) ou % (PawaPay)
  const isValid   = country.enabled && amountNum >= MIN && amountNum <= initialBalance && amountNum <= 2000000 && !!phone && !!method;

  const handleWithdraw = async () => {
    if (!isValid) return;
    if (!confirmed) { setConfirmed(true); return; } // double confirmation
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/payment/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        /*DKDK_MULTIPAYS — on envoie country + operator ; le backend route vers FedaPay ou PawaPay*/
        body: JSON.stringify({ amount: amountNum, country: country.iso, operator: method, method, phone: phone.trim(), holder: holder.trim() }),
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
        <div style={{ fontSize:14, color:'rgba(255,255,255,0.5)', marginBottom:6 }}>{fmt(amountNum)} {CUR} en cours de traitement</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:28, lineHeight:1.7 }}>
          Ton virement est en cours, tu devrais le recevoir en <strong style={{ color:'#fff' }}>quelques minutes</strong>.<br/>
          Nouveau solde Compte de Retrait : <strong style={{ color:OR }}>{fmt(initialBalance)} {CUR}</strong>
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

      <div style={{ maxWidth:520, margin:'0 auto', padding:'24px 16px' }}>
        <div style={{ background:'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', borderRadius:18, padding:'22px 20px', marginBottom:20, textAlign:'center' }}>
          <div style={{ fontSize:38, marginBottom:8 }}>💸</div>
          <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:20, color:'#fff', marginBottom:6 }}>Retirer mes gains</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.85)', lineHeight:1.6 }}>Transfert depuis ton Compte de Retrait vers ton Mobile Money</div>
        </div>

        {/* Compte de Retrait */}
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
          🔒 Le Compte Voter &amp; Soutenir (étoiles/cœurs) ne permet pas de retrait. Seul le Compte de Retrait peut être retiré.
        </div>

        {/* Pays */}
        <div style={card}>
          <label style={lbl}>Pays de réception</label>
          <select
            value={countryIso}
            onChange={e => changeCountry(e.target.value)}
            style={{ ...inp, appearance:'none', WebkitAppearance:'none', cursor:'pointer' }}
          >
            {COUNTRIES.map(c => (
              <option key={c.iso} value={c.iso} style={{ background:'#12121a', color:'#fff' }}>
                {c.flag} {c.name}{c.enabled ? '' : ' — bientôt'}
              </option>
            ))}
          </select>
        </div>

        {/* Montant */}
        <div style={card}>
          <label style={lbl}>Montant à retirer (min. {fmt(MIN)} {CUR})</label>
          <input style={inp} type="text" placeholder="Ex : 5 000"
            value={amount} onChange={e => { setAmount(e.target.value); setConfirmed(false); }} />
          {amountNum > 0 && amountNum < MIN && (
            <div style={{ fontSize:11, color:'#f87171', marginTop:6 }}>Montant minimum : {fmt(MIN)} {CUR}</div>
          )}
          {amountNum > initialBalance && (
            <div style={{ fontSize:11, color:'#f87171', marginTop:6 }}>Montant supérieur à ton solde disponible</div>
          )}
        </div>

        {/* Méthode — opérateurs du pays sélectionné */}
        <div style={card}>
          <label style={lbl}>Opérateur Mobile Money</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom: country.enabled ? 16 : 4 }}>
            {country.operators.map(id => {
              const b = BRANDS[id]; if (!b) return null;
              const selected = method === id;
              return (
                <div key={id} onClick={() => { setMethod(id); setConfirmed(false); }}
                  style={{ background:b.bg, border:`2px solid ${selected?'#fff':'transparent'}`, borderRadius:14, padding:'14px 6px', textAlign:'center' as const, cursor:'pointer', transition:'all .2s', boxShadow: selected?'0 0 0 1px rgba(255,255,255,0.35)':'none', minHeight:56, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ fontSize:12, fontWeight:800, color:b.fg, lineHeight:1.2 }}>{b.label}</div>
                </div>
              );
            })}
          </div>

          {country.enabled ? (
            <>
              <label style={lbl}>Numéro de réception</label>
              <input style={{ ...inp, marginBottom:10 }} type="tel" placeholder={`${country.prefix} …`} value={phone} onChange={e => { setPhone(e.target.value); setConfirmed(false); }} />
              <label style={lbl}>Titulaire du compte</label>
              <input style={inp} type="text" placeholder="Nom complet" value={holder} onChange={e => { setHolder(e.target.value); setConfirmed(false); }} />
            </>
          ) : (
            <div style={{ background:'rgba(255,170,0,0.06)', border:'1px solid rgba(255,170,0,0.25)', borderRadius:10, padding:'11px 14px', fontSize:12.5, color:OR, lineHeight:1.5 }}>
              🚧 Les retraits pour <strong>{country.flag} {country.name}</strong> arrivent bientôt.
              Tu vois ici les opérateurs qui y seront disponibles ({country.operators.map(id => BRANDS[id]?.label).filter(Boolean).join(', ')}).
            </div>
          )}
        </div>

        {/* Récapitulatif — seulement si le pays est actif */}
        {country.enabled && amountNum >= MIN && amountNum <= initialBalance && (
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>Récapitulatif</div>
            {[
              { lbl:'Montant demandé',            val:`${fmt(amountNum)} ${CUR}`,                          color:'#fff' },
              { lbl:'Frais de retrait (FedaPay)', val:`${fmt(FEE)} ${CUR}`,                         color:'rgba(255,255,255,0.85)' },
              { lbl:'Vous recevrez',              val:`${fmt(Math.max(0, amountNum - FEE))} ${CUR}`, color:OR },
              { lbl:'Solde après retrait',        val:`${fmt(initialBalance - amountNum)} ${CUR}`,          color:'rgba(255,255,255,0.5)' },
              { lbl:'Délai de traitement',        val:'quelques minutes',                                  color:'rgba(255,255,255,0.5)' },
            ].map((r, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop: i>0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{r.lbl}</span>
                <span style={{ fontSize:12, fontWeight:i>=2?700:400, color:r.color }}>{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation */}
        {confirmed && country.enabled && (
          <div style={{ background:'rgba(255,170,0,0.06)', border:'1px solid rgba(255,170,0,0.25)', borderRadius:12, padding:'12px 16px', marginBottom:14, fontSize:13, color:OR }}>
            ⚠️ Confirme le retrait de <strong>{fmt(amountNum)} {CUR}</strong> vers {BRANDS[method]?.label || method}.
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
            {loading ? '⏳ Traitement…' : confirmed ? `✅ Confirmer le retrait de ${fmt(amountNum)} ${CUR}` : `💸 Retirer ${amountNum ? fmt(amountNum) + ' ' + CUR : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
