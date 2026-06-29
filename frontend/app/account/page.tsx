'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TickerBand from '../components/TickerBand';
import TranslateWidget from '../components/TranslateWidget';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';
const OR  = '#FFAA00';
const OR2 = '#FF6B00';

function getToken() { return typeof window === 'undefined' ? null : localStorage.getItem('dkdk_token'); }
function decodeToken(t: string) {
  try { return JSON.parse(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); } catch { return null; }
}

type Tab = 'email' | 'password' | 'security' | 'danger';
const TABS: { id: Tab; emoji: string; label: string }[] = [
  { id:'email',    emoji:'📧', label:'Adresse email'   },
  { id:'password', emoji:'🔑', label:'Mot de passe'    },
  { id:'security', emoji:'🛡️', label:'Sécurité'        },
  { id:'danger',   emoji:'⚠️', label:'Zone de danger'  },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width:44, height:24, borderRadius:12, background:on?OR:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', padding:2, cursor:'pointer', flexShrink:0, transition:'background .25s' }}>
      <div style={{ width:20, height:20, borderRadius:'50%', background:on?'#fff':'rgba(255,255,255,0.4)', marginLeft:on?'auto':0, transition:'margin .25s' }}/>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [tab,       setTab]       = useState<Tab>('email');
  const [email,     setEmail]     = useState('');
  const [newEmail,  setNewEmail]  = useState('');
  const [oldPwd,    setOldPwd]    = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [confirmPwd,setConfirmPwd]= useState('');
  const [phone,     setPhone]     = useState('');
  const [twoFA,     setTwoFA]     = useState(false);
  const [loginAlert,setLoginAlert]= useState(true);
  const [saving,    setSaving]    = useState(false);
  const [success,   setSuccess]   = useState('');
  const [error,     setError]     = useState('');
  const [showOld,   setShowOld]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [deleteText,setDeleteText]= useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/auth/login'); return; }
    const dec = decodeToken(token);
    if (!dec?.userId) { router.push('/auth/login'); return; }
    fetch(`${API}/users/${dec.userId}/profile`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.ok?r.json():null).then(d=>{
        const p = d?.profile ?? d;
        if (p?.email) setEmail(p.email);
        if (p?.phone) setPhone(p.phone);
      }).catch(()=>{});
  }, [router]);

  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); } else { setSuccess(msg); setError(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const handleEmailChange = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) { flash('Email invalide.', true); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/users/email`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`}, body:JSON.stringify({ email: newEmail.trim() }) });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Erreur');
      setEmail(newEmail.trim()); setNewEmail('');
      flash('✅ Email mis à jour avec succès.');
    } catch(e:any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (!oldPwd || !newPwd || !confirmPwd) { flash('Tous les champs sont requis.', true); return; }
    if (newPwd !== confirmPwd)             { flash('Les mots de passe ne correspondent pas.', true); return; }
    if (newPwd.length < 8)                { flash('Le mot de passe doit faire au moins 8 caractères.', true); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/users/password`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`}, body:JSON.stringify({ old_password: oldPwd, new_password: newPwd }) });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Erreur');
      setOldPwd(''); setNewPwd(''); setConfirmPwd('');
      flash('✅ Mot de passe modifié avec succès.');
    } catch(e:any) { flash(e.message, true); }
    finally { setSaving(false); }
  };

  const handleSecuritySave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/users/security`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${getToken()}`}, body:JSON.stringify({ phone: phone.trim(), two_fa: twoFA, login_alert: loginAlert }) });
      flash('✅ Paramètres de sécurité enregistrés.');
    } catch { flash('Erreur lors de l\'enregistrement.', true); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'SUPPRIMER') { flash('Tape SUPPRIMER pour confirmer.', true); return; }
    setSaving(true);
    try {
      await fetch(`${API}/users/account`, { method:'DELETE', headers:{ Authorization:`Bearer ${getToken()}` } });
      localStorage.removeItem('dkdk_token');
      localStorage.removeItem('dkdk_user');
      router.push('/home');
    } catch { flash('Erreur lors de la suppression.', true); }
    finally { setSaving(false); }
  };

  const inp: React.CSSProperties = { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'11px 14px', fontSize:14, color:'#fff', outline:'none', fontFamily:'DM Sans,sans-serif', boxSizing:'border-box' as const };
  const lbl: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', marginBottom:6, textTransform:'uppercase' as const, letterSpacing:'.5px' };
  const card: React.CSSProperties = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'20px', marginBottom:14 };
  const btnPrimary: React.CSSProperties = { background:`linear-gradient(135deg,${OR},${OR2})`, border:'none', borderRadius:50, padding:'10px 24px', fontSize:13, fontWeight:700, color:'#000', cursor:'pointer' };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#f0f0f0', fontFamily:'DM Sans,sans-serif', paddingBottom:80 }}>

      {/* Topbar */}
      <div style={{ position:'sticky', top:0, zIndex:100, background:'rgba(8,8,15,0.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,170,0,0.1)', padding:'0 20px', height:54, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/home" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.05rem' }}>
            <span style={{color:OR}}>Diki</span><span style={{color:'#fff',margin:'0 2px'}}>-</span><span style={{color:OR}}>Diki</span>
          </span>
          <span style={{ fontSize:'.42rem', fontWeight:700, color:'#fff', border:'1px solid rgba(255,255,255,.6)', borderRadius:3, padding:'1px 4px', letterSpacing:'.08em' }}>VISION</span>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <TranslateWidget />
          <Link href="/compte" style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B00,#FFD700)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, textDecoration:'none' }}>
            👤
          </Link>
        </div>
      </div>

      {/* Header */}
      <div style={{ background:'linear-gradient(180deg,rgba(255,170,0,0.05) 0%,transparent 100%)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'20px' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'#fff', marginBottom:4 }}>⚙️ Paramètres du compte</h1>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>Gérez vos informations de connexion et la sécurité de votre compte</div>
        </div>
      </div>

      {/* Onglets — boutons dégradé vert */}
      <div style={{ background:'linear-gradient(135deg,#FFAA00,#FF6B00)', padding:'10px 20px', display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>{ setTab(t.id); setSuccess(''); setError(''); }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:50, fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' as const, border: tab===t.id ? '2px solid #fff' : '2px solid transparent', background: tab===t.id ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#16a34a,#15803d)', color:'#fff', boxShadow: tab===t.id ? '0 2px 10px rgba(34,197,94,0.4)' : 'none', transition:'all .2s' }}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 20px' }}>

        {/* Messages */}
        {success && <div style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#4ade80', marginBottom:16 }}>{success}</div>}
        {error   && <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#f87171', marginBottom:16 }}>⚠️ {error}</div>}

        {/* ── EMAIL ── */}
        {tab==='email' && (
          <div>
            <div style={card}>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:16, fontFamily:'Syne,sans-serif' }}>📧 Adresse email actuelle</div>
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'rgba(255,255,255,0.6)', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
                <span>📬</span><span>{email || '—'}</span>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:12, fontFamily:'Syne,sans-serif' }}>Modifier l'email</div>
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Nouvel email *</label>
                <input style={inp} type="email" placeholder="nouveau@email.com" value={newEmail} onChange={e=>setNewEmail(e.target.value)}/>
              </div>
              <div style={{ background:'rgba(255,170,0,0.04)', border:'1px solid rgba(255,170,0,0.15)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'rgba(255,170,0,0.7)', marginBottom:16 }}>
                ℹ️ Un email de confirmation sera envoyé à la nouvelle adresse.
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={handleEmailChange} disabled={saving||!newEmail} style={{...btnPrimary, opacity:!newEmail||saving?0.5:1}}>
                  {saving?'⏳…':'📧 Mettre à jour l\'email'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MOT DE PASSE ── */}
        {tab==='password' && (
          <div>
            <div style={card}>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:16, fontFamily:'Syne,sans-serif' }}>🔑 Changer le mot de passe</div>
              {[
                { label:'Mot de passe actuel *', val:oldPwd, set:setOldPwd, show:showOld, toggle:()=>setShowOld(s=>!s), ph:'Ton mot de passe actuel' },
                { label:'Nouveau mot de passe *', val:newPwd, set:setNewPwd, show:showNew, toggle:()=>setShowNew(s=>!s), ph:'Min. 8 caractères' },
                { label:'Confirmer le nouveau mot de passe *', val:confirmPwd, set:setConfirmPwd, show:showConf, toggle:()=>setShowConf(s=>!s), ph:'Répéter le nouveau mot de passe' },
              ].map(f => (
                <div key={f.label} style={{ marginBottom:14 }}>
                  <label style={lbl}>{f.label}</label>
                  <div style={{ position:'relative' as const }}>
                    <input style={{...inp, paddingRight:44}} type={f.show?'text':'password'} placeholder={f.ph} value={f.val} onChange={e=>f.set(e.target.value)}/>
                    <button onClick={f.toggle} style={{ position:'absolute' as const, right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', fontSize:16, cursor:'pointer', color:'rgba(255,255,255,0.4)' }}>
                      {f.show?'🙈':'👁'}
                    </button>
                  </div>
                </div>
              ))}

              {/* Force du mot de passe */}
              {newPwd && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:5 }}>Force du mot de passe</div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.08)', borderRadius:2 }}>
                    <div style={{ height:4, borderRadius:2, width: newPwd.length<6?'25%':newPwd.length<8?'50%':newPwd.length<12?'75%':'100%', background: newPwd.length<6?'#f87171':newPwd.length<8?OR:newPwd.length<12?'#4ade80':'#00ff88', transition:'all .3s' }}/>
                  </div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:4 }}>
                    {newPwd.length<6?'Trop court':newPwd.length<8?'Faible':newPwd.length<12?'Bon':'Excellent'}
                  </div>
                </div>
              )}

              <div style={{ background:'rgba(255,170,0,0.04)', border:'1px solid rgba(255,170,0,0.15)', borderRadius:8, padding:'10px 14px', fontSize:12, color:'rgba(255,170,0,0.7)', marginBottom:16, lineHeight:1.6 }}>
                ℹ️ Conseils : Min. 8 caractères, mélange majuscules, chiffres et symboles.
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={handlePasswordChange} disabled={saving} style={{...btnPrimary, opacity:saving?0.5:1}}>
                  {saving?'⏳…':'🔑 Changer le mot de passe'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SÉCURITÉ ── */}
        {tab==='security' && (
          <div>
            <div style={card}>
              <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:16, fontFamily:'Syne,sans-serif' }}>🛡️ Paramètres de sécurité</div>

              {/* Téléphone */}
              <div style={{ marginBottom:20 }}>
                <label style={lbl}>Numéro de téléphone</label>
                <input style={inp} type="tel" placeholder="+229 01 XX XX XX XX" value={phone} onChange={e=>setPhone(e.target.value)}/>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:5 }}>Utilisé pour la vérification par SMS</div>
              </div>

              {/* Toggles */}
              {[
                { key:'2fa',   icon:'📱', label:'Authentification à deux facteurs (2FA)', desc:'Reçois un code SMS à chaque connexion', val:twoFA,     set:setTwoFA     },
                { key:'alert', icon:'🔔', label:'Alertes de connexion',                   desc:'Reçois un email quand quelqu\'un se connecte à ton compte', val:loginAlert, set:setLoginAlert },
              ].map(row => (
                <div key={row.key} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flex:1 }}>
                    <span style={{ fontSize:20 }}>{row.icon}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:2 }}>{row.label}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>{row.desc}</div>
                    </div>
                  </div>
                  <Toggle on={row.val} onToggle={()=>row.set(s=>!s)}/>
                </div>
              ))}

              {/* Sessions actives */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 16px', marginTop:10, marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:20 }}>💻</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff', marginBottom:2 }}>Sessions actives</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)' }}>Déconnecter tous les autres appareils</div>
                    </div>
                  </div>
                  <button onClick={async()=>{ await fetch(`${API}/users/sessions`, {method:'DELETE',headers:{Authorization:`Bearer ${getToken()}`}}); flash('✅ Toutes les autres sessions fermées.'); }}
                    style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:20, padding:'6px 14px', fontSize:12, color:'#f87171', cursor:'pointer' }}>
                    Déconnecter tout
                  </button>
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={handleSecuritySave} disabled={saving} style={{...btnPrimary, opacity:saving?0.5:1}}>
                  {saving?'⏳…':'💾 Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ZONE DE DANGER ── */}
        {tab==='danger' && (
          <div>
            {/* Désactiver le compte */}
            <div style={{ background:'rgba(251,146,60,0.06)', border:'1px solid rgba(251,146,60,0.2)', borderRadius:14, padding:'20px', marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#fb923c', marginBottom:8, fontFamily:'Syne,sans-serif' }}>⏸ Désactiver temporairement</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:14, lineHeight:1.6 }}>
                Ton compte sera masqué et inaccessible. Tu pourras le réactiver en te reconnectant.
              </div>
              <button onClick={async()=>{ await fetch(`${API}/users/deactivate`,{method:'PUT',headers:{Authorization:`Bearer ${getToken()}`}}); localStorage.removeItem('dkdk_token'); router.push('/home'); }}
                style={{ background:'rgba(251,146,60,0.1)', border:'1px solid rgba(251,146,60,0.3)', borderRadius:50, padding:'9px 20px', fontSize:13, fontWeight:600, color:'#fb923c', cursor:'pointer' }}>
                ⏸ Désactiver mon compte
              </button>
            </div>

            {/* Supprimer le compte */}
            <div style={{ background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:14, padding:'20px' }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#f87171', marginBottom:8, fontFamily:'Syne,sans-serif' }}>🗑️ Supprimer définitivement</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:16, lineHeight:1.6 }}>
                ⚠️ Action irréversible. Toutes tes données, vidéos et historique seront définitivement supprimés.<br/>
                <br/>
                <span style={{ color:'rgba(251,146,60,0.8)', fontWeight:600 }}>💰 Compte de Retrait :</span>{/*DKDK_RENAME_RETRAIT_ACC*/} <span style={{ color:'rgba(255,255,255,0.45)' }}>ton solde restant en F CFA sera remboursé automatiquement vers ton dernier moyen de paiement sous 7 jours ouvrés.</span><br/>
                <span style={{ color:'rgba(248,113,113,0.8)', fontWeight:600 }}>⭐ Compte Soutenir :</span> <span style={{ color:'rgba(255,255,255,0.45)' }}>tes unités non utilisées (étoiles et cœurs) seront définitivement perdues — elles ne sont pas remboursables.</span>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{...lbl, color:'rgba(248,113,113,0.6)'}}>Tape <strong style={{color:'#f87171'}}>SUPPRIMER</strong> pour confirmer</label>
                <input style={{...inp, border:'1px solid rgba(248,113,113,0.3)', background:'rgba(248,113,113,0.05)'}} type="text" placeholder="SUPPRIMER" value={deleteText} onChange={e=>setDeleteText(e.target.value)}/>
              </div>
              <button onClick={handleDeleteAccount} disabled={saving||deleteText!=='SUPPRIMER'}
                style={{ background:deleteText==='SUPPRIMER'?'rgba(248,113,113,0.15)':'rgba(255,255,255,0.04)', border:`1px solid ${deleteText==='SUPPRIMER'?'rgba(248,113,113,0.5)':'rgba(255,255,255,0.1)'}`, borderRadius:50, padding:'9px 20px', fontSize:13, fontWeight:600, color:deleteText==='SUPPRIMER'?'#f87171':'rgba(255,255,255,0.3)', cursor:deleteText==='SUPPRIMER'?'pointer':'not-allowed' }}>
                {saving?'⏳ Suppression…':'🗑️ Supprimer définitivement mon compte'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:100 }}>
        <TickerBand />
      </div>
    </div>
  );
}
