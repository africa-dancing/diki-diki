'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  country?: string;
  role?: string;
}

const COUNTRIES = [
  { code: 'BJ', name: 'Benin',             dial: '+229' },
  { code: 'CI', name: "Cote d'Ivoire",     dial: '+225' },
  { code: 'SN', name: 'Senegal',           dial: '+221' },
  { code: 'CM', name: 'Cameroun',          dial: '+237' },
  { code: 'CG', name: 'Congo-Brazzaville', dial: '+242' },
  { code: 'CD', name: 'Congo RDC',         dial: '+243' },
  { code: 'GA', name: 'Gabon',             dial: '+241' },
  { code: 'ML', name: 'Mali',              dial: '+223' },
  { code: 'BF', name: 'Burkina Faso',      dial: '+226' },
  { code: 'TG', name: 'Togo',             dial: '+228' },
  { code: 'NE', name: 'Niger',             dial: '+227' },
  { code: 'GN', name: 'Guinee',            dial: '+224' },
  { code: 'NG', name: 'Nigeria',           dial: '+234' },
  { code: 'GH', name: 'Ghana',            dial: '+233' },
  { code: 'KE', name: 'Kenya',             dial: '+254' },
  { code: 'TZ', name: 'Tanzanie',          dial: '+255' },
  { code: 'UG', name: 'Ouganda',           dial: '+256' },
  { code: 'RW', name: 'Rwanda',            dial: '+250' },
  { code: 'MA', name: 'Maroc',             dial: '+212' },
  { code: 'TN', name: 'Tunisie',           dial: '+216' },
  { code: 'DZ', name: 'Algerie',           dial: '+213' },
  { code: 'EG', name: 'Egypte',            dial: '+20'  },
  { code: 'MG', name: 'Madagascar',        dial: '+261' },
  { code: 'XX', name: 'Autre',             dial: ''     },
];

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', country: '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [tab, setTab] = useState<'profile' | 'security' | 'danger'>('profile');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showDotMenu, setShowDotMenu] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const stored = localStorage.getItem('dkdk_user');
    const token  = localStorage.getItem('pac_token');
    if (!stored || !token) { router.push('/auth/login'); return; }
    const u: User = JSON.parse(stored);
    setUser(u);
    setForm({ name: u.name || '', email: u.email || '', phone: u.phone || '', country: u.country || '' });
  }, []);

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function showMsg(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  }

  function getPwStrength(pw: string) {
    if (pw.length === 0) return 0;
    if (pw.length < 6)   return 1;
    if (pw.length < 10)  return 2;
    return 3;
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { showMsg('Le nom est requis.', false); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('pac_token');
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = { ...user, ...form };
        setUser(updated as User);
        localStorage.setItem('dkdk_user', JSON.stringify(updated));
        showMsg('Profil mis a jour avec succes !', true);
      } else {
        showMsg('Erreur lors de la mise a jour.', false);
      }
    } catch { showMsg('Erreur reseau.', false); }
    finally { setSaving(false); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwForm.current)               { showMsg('Entre ton mot de passe actuel.', false); return; }
    if (pwForm.next.length < 8)        { showMsg('Nouveau mot de passe trop court (min. 8).', false); return; }
    if (pwForm.next !== pwForm.confirm) { showMsg('Les mots de passe ne correspondent pas.', false); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('pac_token');
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      if (res.ok) {
        setPwForm({ current: '', next: '', confirm: '' });
        showMsg('Mot de passe modifie avec succes !', true);
      } else {
        const data = await res.json();
        showMsg(data.error === 'INVALID_PASSWORD' ? 'Mot de passe actuel incorrect.' : 'Erreur.', false);
      }
    } catch { showMsg('Erreur reseau.', false); }
    finally { setSaving(false); }
  }

  function handleLogout() {
    localStorage.removeItem('pac_token');
    localStorage.removeItem('dkdk_user');
    router.push('/auth/login');
  }

  if (!user) return null;

  const pwStrength = getPwStrength(pwForm.next);
  const pwColor = pwStrength === 3 ? '#22c55e' : pwStrength === 2 ? '#FF8C00' : '#ef4444';
  const pwLabel = pwStrength === 3 ? 'Tres fort' : pwStrength === 2 ? 'Correct' : pwStrength === 1 ? 'Trop court' : 'Minimum 8 caracteres';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .acc{min-height:100vh;background:#08080f;font-family:'DM Sans',sans-serif;padding-bottom:90px}
        .acc::before{content:'';position:fixed;inset:0;background-image:repeating-linear-gradient(45deg,transparent,transparent 40px,rgba(255,184,0,.02) 40px,rgba(255,184,0,.02) 41px);pointer-events:none}

        /* BLOC 1 : Topbar */
        .topbar{background:rgba(255,255,255,.03);border-bottom:0.5px solid rgba(255,255,255,.07);padding:0 16px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;backdrop-filter:blur(20px)}
        .logo{display:flex;align-items:center;gap:8px;text-decoration:none}
        .logo-badge{width:34px;height:34px;background:#FF8C00;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:15px}
        .topbar-actions{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.05);border:0.5px solid rgba(255,255,255,.1);border-radius:10px;padding:5px 10px}
        .topbar-btn{background:none;border:none;cursor:pointer;padding:2px 4px;display:flex;align-items:center;color:rgba(255,255,255,.5);font-family:'DM Sans',sans-serif;font-size:12px;white-space:nowrap}
        .topbar-sep{width:1px;height:18px;background:rgba(255,255,255,.1)}

        /* Search bar */
        .search-bar{padding:0 16px 10px;animation:fadeIn .2s}

        /* Dot menu */
        .dot-menu{margin:0 16px 10px;background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.08);border-radius:12px;padding:6px;animation:fadeIn .2s}
        .dot-item{padding:10px 14px;font-size:13px;color:rgba(255,255,255,.6);cursor:pointer;border-radius:8px;display:flex;align-items:center;gap:10px;transition:background .2s}
        .dot-item:hover{background:rgba(255,255,255,.06)}

        /* BLOC 2 : Hero orange */
        .hero{background:#FF8C00;border-radius:16px;padding:16px 20px;margin-bottom:12px;display:flex;align-items:center;gap:14px}
        .avatar-wrap{position:relative;flex-shrink:0}
        .avatar{width:64px;height:64px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#FF8C00;border:3px solid rgba(0,0,0,0.15);cursor:pointer;overflow:hidden;position:relative}
        .avatar-cam{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.25);font-size:9px;color:#fff;text-align:center;padding:2px 0}
        .hero-name{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#000;margin-bottom:2px}
        .hero-email{font-size:13px;color:rgba(0,0,0,0.65);margin-bottom:6px}
        .hero-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(0,0,0,0.12);color:#000;font-size:11px;padding:2px 10px;border-radius:20px;border:0.5px solid rgba(0,0,0,0.2)}

        /* BLOC 3 : Onglets */
        .tabs{display:flex;gap:4px;background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.08);border-radius:14px;padding:4px;margin-bottom:14px}
        .tab-btn{flex:1;padding:9px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;border:none;border-radius:10px;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.4);background:transparent}
        .tab-btn.active{background:rgba(255,140,0,.12);color:#FF8C00;border:0.5px solid rgba(255,140,0,.25)}

        /* BLOC 4 : Contenu */
        .card{background:rgba(255,255,255,.04);border:0.5px solid rgba(255,255,255,.08);border-radius:20px;padding:22px;margin-bottom:14px}
        .card-title{font-size:14px;font-weight:500;color:#fff;margin-bottom:18px;display:flex;align-items:center;gap:8px}
        .field{margin-bottom:14px}
        .field label{display:block;font-size:11px;font-weight:600;color:rgba(255,255,255,.4);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
        .field input,.field select{width:100%;background:rgba(255,255,255,.06);border:0.5px solid rgba(255,255,255,.1);border-radius:12px;padding:12px 14px;font-family:'DM Sans',sans-serif;font-size:14px;color:#fff;outline:none;transition:border-color .2s;appearance:none}
        .field input:focus,.field select:focus{border-color:#FF8C00;background:rgba(255,140,0,.05)}
        .field input::placeholder{color:rgba(255,255,255,.2)}
        .field select option{background:#1a1a2e;color:#fff}
        .field select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath stroke='rgba(255,255,255,0.4)' stroke-width='2' fill='none' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-color:rgba(255,255,255,.06);padding-right:38px}
        .row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .input-wrap{position:relative}
        .input-wrap input{padding-right:46px}
        .eye-btn{position:absolute;right:13px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.35);font-size:18px;padding:4px}
        .pwd-bars{display:flex;gap:4px;margin-top:7px}
        .pwd-bar{flex:1;height:3px;border-radius:2px;transition:background .3s}
        .hint{font-size:11px;color:rgba(255,255,255,.3);margin-top:5px}
        .btn-primary{width:100%;padding:14px;background:#FF8C00;border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#000;cursor:pointer;transition:opacity .2s}
        .btn-primary:hover:not(:disabled){opacity:.9}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-danger{width:100%;padding:14px;background:rgba(220,38,38,.1);border:0.5px solid rgba(220,38,38,.3);border-radius:12px;font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#ff7070;cursor:pointer}
        .btn-logout{width:100%;padding:14px;background:rgba(255,255,255,.05);border:0.5px solid rgba(255,255,255,.1);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;color:rgba(255,255,255,.6);cursor:pointer;margin-bottom:12px}
        .danger-box{background:rgba(220,38,38,.06);border:0.5px solid rgba(220,38,38,.2);border-radius:12px;padding:14px 16px;margin-bottom:12px}
        .danger-title{font-size:13px;font-weight:600;color:#ff7070;margin-bottom:3px}
        .danger-sub{font-size:12px;color:rgba(255,112,112,.7)}
        .msg{padding:12px 16px;border-radius:12px;font-size:13px;margin-bottom:14px;text-align:center}
        .msg.ok{background:rgba(34,197,94,.1);border:0.5px solid rgba(34,197,94,.25);color:#4ade80}
        .msg.err{background:rgba(220,38,38,.1);border:0.5px solid rgba(220,38,38,.25);color:#ff7070}

        /* BLOC 5 : Nav bas noir mat */
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;background:#1c1c1e;border-top:0.5px solid rgba(255,255,255,.08);display:flex;justify-content:space-around;align-items:center;padding:10px 0 18px;z-index:100}
        .nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:#FF8C00;opacity:0.45;text-decoration:none;transition:opacity .2s}
        .nav-item.active{opacity:1}
        .nav-item:hover{opacity:.8}
        .nav-icon{font-size:22px}
        .nav-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
        .nav-add{width:40px;height:40px;border-radius:50%;background:#FF8C00;display:flex;align-items:center;justify-content:center;margin-top:-12px}

        .spinner{display:inline-block;width:16px;height:16px;border:2px solid rgba(0,0,0,.3);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="acc">

        {/* BLOC 1 : Topbar */}
        <div className="topbar">
          <Link href="/vote" className="logo">
            <div className="logo-badge">🏆</div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: '17px', fontWeight: 800, letterSpacing: '-.5px' }}>
              <span style={{ color: '#fff' }}>Podium </span>
              <span style={{ color: '#FF8C00' }}>Arena </span>
              <span style={{ color: '#000' }}>Challenge</span>
            </span>
          </Link>
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={() => { setShowSearch(s => !s); setShowDotMenu(false); }}>
              <span style={{ fontSize: '17px' }}>🔍</span>
            </button>
            <div className="topbar-sep"/>
            <button className="topbar-btn" onClick={handleLogout}>Deconnexion</button>
            <div className="topbar-sep"/>
            <button className="topbar-btn" onClick={() => { setShowDotMenu(s => !s); setShowSearch(false); }}>
              <span style={{ fontSize: '17px', letterSpacing: '2px' }}>···</span>
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px 16px' }}>

          {/* Barre de recherche */}
          {showSearch && (
            <div className="search-bar">
              <input type="text" placeholder="Rechercher un competiteur, une discipline..." autoFocus
                style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.1)', color: '#fff', fontSize: '14px', outline: 'none', fontFamily: 'DM Sans,sans-serif' }}
              />
            </div>
          )}

          {/* Menu 3 points */}
          {showDotMenu && (
            <div className="dot-menu">
              <div className="dot-item">🔗 Partager mon profil</div>
              <div className="dot-item">❓ Aide et support</div>
            </div>
          )}

          {/* BLOC 2 : Hero orange */}
          <div className="hero">
            <div className="avatar-wrap">
              <div className="avatar" title="Changer la photo de profil">
                {getInitials(user.name)}
                <div className="avatar-cam">📷</div>
              </div>
            </div>
            <div>
              <div className="hero-name">{user.name}</div>
              <div className="hero-email">{user.email || user.phone || 'Compte PAC'}</div>
              <div className="hero-badge">🌍 {user.country || 'Pays non renseigne'}</div>
            </div>
          </div>

          {/* BLOC 3 : Onglets */}
          <div className="tabs">
            <button className={`tab-btn ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>👤 Profil</button>
            <button className={`tab-btn ${tab === 'security' ? 'active' : ''}`} onClick={() => setTab('security')}>🔒 Securite</button>
            <button className={`tab-btn ${tab === 'danger' ? 'active' : ''}`} onClick={() => setTab('danger')}>⚠️ Compte</button>
          </div>

          {msg && <div className={`msg ${msg.ok ? 'ok' : 'err'}`}>{msg.ok ? '✅' : '⚠️'} {msg.text}</div>}

          {/* BLOC 4a : Profil */}
          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile}>
              <div className="card">
                <div className="card-title">👤 Informations personnelles</div>
                <div className="field">
                  <label>Nom complet *</label>
                  <input type="text" placeholder="Ton nom complet" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
                </div>
                <div className="row-2">
                  <div className="field">
                    <label>Email</label>
                    <input type="email" placeholder="ton@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
                  </div>
                  <div className="field">
                    <label>Telephone</label>
                    <input type="tel" placeholder="+229 97 000 000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
                  </div>
                </div>
                <div className="field">
                  <label>Pays</label>
                  <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                    <option value="">-- Selectionnez votre pays --</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name} ({c.dial})</option>)}
                  </select>
                </div>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving && <span className="spinner"/>}{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          )}

          {/* BLOC 4b : Securite */}
          {tab === 'security' && (
            <form onSubmit={handleChangePassword}>
              <div className="card">
                <div className="card-title">🔒 Changer le mot de passe</div>
                <div className="field">
                  <label>Mot de passe actuel</label>
                  <div className="input-wrap">
                    <input type={showPw.current ? 'text' : 'password'} placeholder="••••••••" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}/>
                    <button type="button" className="eye-btn" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}>{showPw.current ? '🙈' : '👁'}</button>
                  </div>
                </div>
                <div className="field">
                  <label>Nouveau mot de passe</label>
                  <div className="input-wrap">
                    <input type={showPw.next ? 'text' : 'password'} placeholder="Min. 8 caracteres" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} autoComplete="new-password"/>
                    <button type="button" className="eye-btn" onClick={() => setShowPw(s => ({ ...s, next: !s.next }))}>{showPw.next ? '🙈' : '👁'}</button>
                  </div>
                  {pwForm.next.length > 0 && (
                    <div className="pwd-bars">
                      <div className="pwd-bar" style={{ background: pwStrength >= 1 ? pwColor : 'rgba(255,255,255,.1)' }}/>
                      <div className="pwd-bar" style={{ background: pwStrength >= 2 ? pwColor : 'rgba(255,255,255,.1)' }}/>
                      <div className="pwd-bar" style={{ background: pwStrength >= 3 ? pwColor : 'rgba(255,255,255,.1)' }}/>
                    </div>
                  )}
                  <div className="hint" style={{ color: pwForm.next.length > 0 ? pwColor : undefined }}>{pwLabel}</div>
                </div>
                <div className="field">
                  <label>Confirmer le nouveau mot de passe</label>
                  <div className="input-wrap">
                    <input type={showPw.confirm ? 'text' : 'password'} placeholder="••••••••" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} autoComplete="new-password"/>
                    <button type="button" className="eye-btn" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}>{showPw.confirm ? '🙈' : '👁'}</button>
                  </div>
                  {pwForm.confirm.length > 0 && (
                    <div className="hint" style={{ color: pwForm.next === pwForm.confirm ? '#22c55e' : '#ef4444' }}>
                      {pwForm.next === pwForm.confirm ? '✓ Mots de passe identiques' : '✗ Ne correspondent pas'}
                    </div>
                  )}
                </div>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving && <span className="spinner"/>}{saving ? 'Modification...' : 'Modifier le mot de passe'}
                </button>
              </div>
            </form>
          )}

          {/* BLOC 4c : Danger */}
          {tab === 'danger' && (
            <div className="card">
              <div className="card-title">⚙️ Gestion du compte</div>
              <button className="btn-logout" onClick={handleLogout}>🚪 Se deconnecter</button>
              <div className="danger-box">
                <div className="danger-title">Supprimer mon compte</div>
                <div className="danger-sub">Action irreversible — toutes les donnees seront supprimees definitivement.</div>
              </div>
              <button className="btn-danger" onClick={() => {
                if (confirm('Es-tu sur ? Cette action est irreversible.')) alert('Fonctionnalite a venir.');
              }}>
                🗑️ Supprimer mon compte
              </button>
            </div>
          )}
        </div>

      
        {/* BLOC 5 : Navigation bas gris foncé */}
<div className="bottom-nav">
  <Link href="/vote" className="nav-item">
    <span className="nav-icon">🏠</span>
    <span className="nav-label">Accueil</span>
  </Link>
  <a href="/recharge" target="_blank" className="nav-item">
    <span className="nav-icon">💳</span>
    <span className="nav-label">Recharger</span>
  </a>
  <Link href="/submit" className="nav-item" style={{ marginTop: '-18px' }}>
    <div style={{
      width: '58px', height: '58px', borderRadius: '50%',
      background: '#111', border: '2px solid #FF8C00',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 18px rgba(255,140,0,0.35)',
    }}>
      <span style={{ fontSize: '32px', color: '#FF8C00', fontWeight: 700, lineHeight: 1 }}>+</span>
    </div>
    <span className="nav-label" style={{ marginTop: '4px' }}>Ajouter</span>
  </Link>
  <Link href="/account" className="nav-item">
    <span className="nav-icon">💾</span>
    <span className="nav-label">Enregistrer</span>
  </Link>
  <Link href="/account" className="nav-item">
    <span className="nav-icon">🔗</span>
    <span className="nav-label">Partager</span>
  </Link>
</div>
      </div>
    </>
  );
}
