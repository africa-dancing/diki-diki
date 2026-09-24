'use client';

import LogoDikiDiki from '../../components/LogoDikiDiki';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const COUNTRIES = [
  { code: 'BJ', name: 'Benin',         dial: '+229' },
  { code: 'CI', name: 'Cote d Ivoire', dial: '+225' },
  { code: 'BF', name: 'Burkina Faso',  dial: '+226' },
  { code: 'CM', name: 'Cameroun',      dial: '+237' },
  { code: 'TG', name: 'Togo',          dial: '+228' },
  { code: 'SN', name: 'Senegal',       dial: '+221' },
  { code: 'ML', name: 'Mali',          dial: '+223' },
  { code: 'GH', name: 'Ghana',         dial: '+233' },
  { code: 'NG', name: 'Nigeria',       dial: '+234' },
];

const ERRORS: Record<string, string> = {
  PHONE_ALREADY_USED: 'Ce numero est deja utilise par un autre compte.',
  VALIDATION_ERROR:   'Numero invalide. Verifie et reessaie.',
  ATTACH_FAILED:      'Enregistrement impossible. Reessaie.',
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AjouterNumeroPage() {
  const router = useRouter();
  const [country, setCountry] = useState('+229');
  const [phone, setPhone]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [countries, setCountries] = useState<any[]>([]);
  const [redirect, setRedirect]   = useState('/home');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('dkdk_token') : null;
    if (!token) { router.replace('/auth/login'); return; }
    try {
      const p = new URLSearchParams(window.location.search).get('redirect');
      if (p && p.startsWith('/')) setRedirect(p);
    } catch {}
    fetch(`${API}/pays-monnaies/`).then(r => r.ok ? r.json() : []).then(rows => {
      if (Array.isArray(rows) && rows.length) setCountries(rows);
    }).catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (phone.trim().length < 6) { setError('Numero invalide.'); return; }
    const token = localStorage.getItem('dkdk_token');
    if (!token) { router.replace('/auth/login'); return; }
    const fullPhone = phone.trim().startsWith('+') ? phone.trim() : `${country}${phone.trim()}`;
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'TOKEN_MISSING' || data.error === 'TOKEN_INVALID') { router.replace('/auth/login'); return; }
        setError(ERRORS[data.error] || 'Enregistrement impossible. Reessaie.');
        setLoading(false);
        return;
      }
      // Met a jour l'utilisateur stocke (numero + verifie)
      try {
        const raw = localStorage.getItem('dkdk_user');
        if (raw) {
          const u = JSON.parse(raw);
          u.phone = data.phone || fullPhone;
          u.is_verified = true;
          u.phone_verified = true;
          localStorage.setItem('dkdk_user', JSON.stringify(u));
        }
      } catch {}
      router.push(redirect);
    } catch {
      setError('Enregistrement impossible. Reessaie.');
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .reg-bg{--bg:#0a0a0f;--bg-soft:#131019;--surface:rgba(255,255,255,.055);--line:rgba(255,255,255,.13);--ink:#f3eee4;--ink-soft:rgba(243,238,228,.76);--ink-dim:rgba(243,238,228,.56);--or:#FFB224;--or2:#FF7A1A;--on-accent:#150c00;min-height:100vh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px;font-family:'DM Sans',sans-serif;position:relative;overflow:hidden}
        .reg-bg::before{content:'';position:fixed;inset:0;background-image:repeating-linear-gradient(45deg,transparent,transparent 40px,rgba(255,184,0,.03) 40px,rgba(255,184,0,.03) 41px),repeating-linear-gradient(-45deg,transparent,transparent 40px,rgba(255,184,0,.03) 40px,rgba(255,184,0,.03) 41px);pointer-events:none}
        .reg-card{position:relative;width:100%;max-width:480px;background:var(--surface);border:1px solid rgba(126,3,128,.6);border-top:2px solid #7e0380;border-radius:24px;padding:44px 40px;backdrop-filter:blur(20px)}
        .logo-area{display:flex;align-items:center;justify-content:center;margin-bottom:28px}
        .info-box{background:rgba(255,170,0,.08);border:1px solid rgba(255,170,0,.2);border-radius:12px;padding:14px 16px;font-size:14px;color:var(--ink-soft);margin-bottom:22px;line-height:1.5}
        .info-box strong{color:var(--or)}
        .field{margin-bottom:13px}
        .field label{display:block;font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
        .field input,.field select{width:100%;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:13px 16px;font-family:'DM Sans',sans-serif;font-size:15px;color:var(--ink);outline:none;transition:border-color .2s;appearance:none}
        .field input:focus,.field select:focus{border-color:var(--or);background:rgba(255,170,0,.05)}
        .field input::placeholder{color:var(--ink-dim)}
        .field select option{background:var(--bg-soft);color:var(--ink)}
        .row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .error-msg{background:rgba(230,60,60,.1);border:1px solid rgba(230,60,60,.25);border-radius:10px;padding:11px 15px;font-size:13px;color:#ff7070;margin-bottom:14px}
        .btn-primary{width:100%;padding:15px;margin-top:6px;background:linear-gradient(135deg,var(--or),var(--or2));border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--on-accent);cursor:pointer;transition:opacity .2s}
        .btn-primary:hover:not(:disabled){opacity:.9}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .skip-link{text-align:center;font-size:14px;color:var(--ink-soft);margin-top:20px}
        .skip-link a{color:var(--or);text-decoration:none;font-weight:600;cursor:pointer}
        .spinner{display:inline-block;width:18px;height:18px;border:2px solid rgba(0,0,0,.3);border-top-color:var(--on-accent);border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:8px}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="reg-bg">
        <div className="reg-card">
          <div className="logo-area">
            <LogoDikiDiki width={200} />
          </div>

          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: 'var(--ink)', marginBottom: 6, letterSpacing: '-.5px', textAlign: 'center' }}>
            Ajoute ton numero
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 20, textAlign: 'center' }}>
            Une derniere etape pour participer pleinement
          </p>

          <div className="info-box">
            Pour <strong>voter</strong>, <strong>recharger</strong> ou <strong>retirer</strong>, on a besoin de ton numero (celui de ton <strong>Mobile Money</strong>). C'est une seule fois, et tu peux naviguer sans ca.
          </div>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="row-2">
              <div className="field">
                <label>Pays</label>
                <select value={country} onChange={e => setCountry(e.target.value)}>
                  {(countries.length ? countries : COUNTRIES.map(c => ({ indicatif: c.dial, pays: c.name }))).map((c: any) => (
                    <option key={c.indicatif} value={c.indicatif}>{c.pays} ({c.indicatif})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Telephone</label>
                <input type="tel" placeholder="97 000 000" value={phone} onChange={e => { setPhone(e.target.value); setError(''); }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" />Enregistrement...</> : 'Valider mon numero'}
            </button>
          </form>

          <div className="skip-link">
            <a onClick={() => router.push('/home')}>Plus tard, aller a l'accueil</a>
          </div>
        </div>
      </div>
    </>
  );
}
