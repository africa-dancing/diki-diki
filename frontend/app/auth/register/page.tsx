'use client';

import LogoDikiDiki from '../../components/LogoDikiDiki';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 1 | 2;
type FormData = { name: string; email: string; phone: string; password: string; country: string; };

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
  EMAIL_ALREADY_EXISTS: 'Cet email est deja utilise.',
  PHONE_ALREADY_EXISTS: 'Ce numero est deja utilise.',
  OTP_EXPIRED:          'Code expire. Clique sur Renvoyer.',
  OTP_INVALID:          'Code incorrect. Verifie tes SMS.',
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>(1);
  const [form, setForm]         = useState<FormData>({ name:'', email:'', phone:'', password:'', country:'BJ' });
  const [otp, setOtp]           = useState(['','','','','','']);
  const [loading, setLoading]   = useState(false);
  const [resendCD, setResendCD] = useState(0);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);
  const otpRefs                 = useRef<(HTMLInputElement|null)[]>([]);

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    if (resendCD <= 0) return;
    const t = setTimeout(() => setResendCD(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCD]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.length < 2)      { setError('Nom trop court.'); return; }
    if (!form.email.includes('@')) { setError('Email invalide.'); return; }
    if (form.phone.length < 6)     { setError('Telephone invalide.'); return; }
    if (form.password.length < 8)  { setError('Mot de passe trop court (min. 8 car.).'); return; }
    setLoading(true);
    try {
      const country   = COUNTRIES.find(c => c.code === form.country);
      const fullPhone = form.phone.startsWith('+') ? form.phone : `${country?.dial||''}${form.phone}`;
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, phone: fullPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'REGISTER_FAILED');
      sessionStorage.setItem('pac_reg_phone', fullPhone);
      setStep(2); setResendCD(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err: any) {
      setError(ERRORS[err.message] || 'Une erreur est survenue.');
    } finally { setLoading(false); }
  }

  function handleOtpInput(i: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const n = [...otp]; n[i] = value.slice(-1); setOtp(n); setError('');
    if (value && i < 5) otpRefs.current[i+1]?.focus();
  }
  function handleOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i-1]?.focus();
  }
  function handleOtpPaste(e: React.ClipboardEvent) {
    const t = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);
    if (t.length === 6) { setOtp(t.split('')); otpRefs.current[5]?.focus(); }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    const code  = otp.join('');
    const phone = sessionStorage.getItem('pac_reg_phone') || '';
    if (code.length < 6) { setError('Saisis les 6 chiffres.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP_FAILED');
      localStorage.setItem('dkdk_token', data.token);
      localStorage.setItem('dkdk_user', JSON.stringify(data.user));
      sessionStorage.removeItem('pac_reg_phone');
      router.push('/home');
    } catch (err: any) {
      setError(ERRORS[err.message] || 'Code incorrect.');
      setOtp(['','','','','','']); otpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  }

  async function handleResend() {
    if (resendCD > 0) return;
    const phone = sessionStorage.getItem('pac_reg_phone') || '';
    try {
      await fetch(`${API}/auth/resend-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      setResendCD(60); setOtp(['','','','','','']); otpRefs.current[0]?.focus();
    } catch { setError('Impossible de renvoyer le code.'); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .reg-bg{min-height:100vh;background:#08080f;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'DM Sans',sans-serif;position:relative;overflow:hidden}
        .reg-bg::before{content:'';position:fixed;inset:0;background-image:repeating-linear-gradient(45deg,transparent,transparent 40px,rgba(255,184,0,.03) 40px,rgba(255,184,0,.03) 41px),repeating-linear-gradient(-45deg,transparent,transparent 40px,rgba(255,184,0,.03) 40px,rgba(255,184,0,.03) 41px);pointer-events:none}
        .glow-tr{position:fixed;top:-150px;right:-100px;width:450px;height:450px;background:radial-gradient(circle,rgba(255,107,0,.1) 0%,transparent 70%);pointer-events:none}
        .glow-bl{position:fixed;bottom:-150px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(255,184,0,.08) 0%,transparent 70%);pointer-events:none}
        .reg-card{position:relative;width:100%;max-width:480px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:44px 40px;backdrop-filter:blur(20px)}
        .logo-area{display:flex;align-items:center;justify-content:center;margin-bottom:28px}
        .social-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
        .btn-social{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#fff;cursor:pointer}
        .btn-social svg{width:18px;height:18px}
        .divider{display:flex;align-items:center;gap:12px;margin:18px 0;color:rgba(255,255,255,.2);font-size:13px}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.1)}
        .field{margin-bottom:13px}
        .field label{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
        .input-wrap{position:relative}
        .field input,.field select{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 16px;font-family:'DM Sans',sans-serif;font-size:15px;color:#fff;outline:none;transition:border-color .2s;appearance:none}
        .field input:focus,.field select:focus{border-color:#FFAA00;background:rgba(255,170,0,.05)}
        .field input::placeholder{color:rgba(255,255,255,.22)}
        .field select option{background:#1a1a2e;color:#fff}
        .eye-btn{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-size:18px;padding:4px}
        .row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .pwd-strength{display:flex;gap:4px;margin-top:7px}
        .pwd-bar{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.1);transition:background .3s}
        .pwd-bar.weak{background:#FF4444}.pwd-bar.medium{background:#FFAA00}.pwd-bar.strong{background:#44FF88}
        .otp-info{background:rgba(255,170,0,.08);border:1px solid rgba(255,170,0,.2);border-radius:12px;padding:14px 16px;font-size:14px;color:rgba(255,255,255,.7);margin-bottom:22px;line-height:1.5}
        .otp-info strong{color:#FFAA00}
        .otp-grid{display:flex;gap:10px;justify-content:center;margin-bottom:8px}
        .otp-cell{width:52px;height:60px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;text-align:center;font-family:'Syne',sans-serif;font-size:24px;font-weight:700;color:#fff;outline:none;transition:border-color .2s,transform .1s}
        .otp-cell:focus{border-color:#FFAA00;background:rgba(255,170,0,.08);transform:scale(1.05)}
        .otp-cell.filled{border-color:rgba(255,170,0,.4)}
        .resend-row{text-align:center;margin:14px 0;font-size:14px;color:rgba(255,255,255,.4)}
        .resend-btn{background:none;border:none;color:#FFAA00;font-size:14px;font-weight:600;cursor:pointer}
        .resend-btn:disabled{color:rgba(255,170,0,.4);cursor:not-allowed}
        .error-msg{background:rgba(230,60,60,.1);border:1px solid rgba(230,60,60,.25);border-radius:10px;padding:11px 15px;font-size:13px;color:#ff7070;margin-bottom:14px}
        .btn-primary{width:100%;padding:15px;background:linear-gradient(135deg,#FFAA00,#FF6B00);border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#000;cursor:pointer;transition:opacity .2s}
        .btn-primary:hover:not(:disabled){opacity:.9}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .btn-back{display:flex;align-items:center;gap:6px;background:none;border:none;color:rgba(255,255,255,.4);font-size:14px;cursor:pointer;margin-bottom:18px;padding:0}
        .login-link{text-align:center;font-size:14px;color:rgba(255,255,255,.4);margin-top:22px}
        .login-link a{color:#FFAA00;text-decoration:none;font-weight:600}
        .spinner{display:inline-block;width:18px;height:18px;border:2px solid rgba(0,0,0,.3);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:8px}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="reg-bg">
        <div className="glow-tr"/><div className="glow-bl"/>
        <div className="reg-card">

          {/* ── Logo ── */}
          <div className="logo-area">
  <LogoDikiDiki width={200} />
</div>

          {/* ── Étape 1 : Inscription ── */}
          {step === 1 && (
            <>
              <h1 style={{
                fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800,
                color: '#fff', marginBottom: 6, letterSpacing: '-.5px',
              }}>
                Crée ton compte!
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginBottom: 24 }}>
                Pour participer aux challenges artistiques
              </p>

              <div className="social-row">
                <button className="btn-social">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button className="btn-social">
                  <svg viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
              </div>

              <div className="divider">ou avec email</div>

              <form onSubmit={handleRegister}>
                <div className="field">
                  <label>Nom complet</label>
                  <input name="name" type="text" placeholder="Ton nom d artiste" value={form.name} onChange={handleChange}/>
                </div>
                <div className="field">
                  <label>Email</label>
                  <input name="email" type="email" placeholder="ton@email.com" value={form.email} onChange={handleChange}/>
                </div>
                <div className="row-2">
                  <div className="field">
                    <label>Pays</label>
                    <select name="country" value={form.country} onChange={handleChange}>
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.dial})</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Telephone</label>
                    <input name="phone" type="tel" placeholder="97 000 000" value={form.phone} onChange={handleChange}/>
                  </div>
                </div>
                <div className="field">
                  <label>Mot de passe</label>
                  <div className="input-wrap">
                    <input name="password" type={showPass ? 'text' : 'password'} placeholder="Min. 8 caracteres" value={form.password} onChange={handleChange} autoComplete="new-password"/>
                    <button type="button" className="eye-btn" onClick={() => setShowPass(s => !s)}>
                      {showPass ? '🙈' : '👁'}
                    </button>
                  </div>
                  <div className="pwd-strength">
                    {[0,1,2].map(i => {
                      const l = form.password.length;
                      const cls = l >= 12 ? 'strong' : l >= 8 ? 'medium' : l > 0 ? 'weak' : '';
                      const show = (i === 0 && l > 0) || (i === 1 && l >= 8) || (i === 2 && l >= 12);
                      return <div key={i} className={`pwd-bar ${show ? cls : ''}`}/>;
                    })}
                  </div>
                </div>
                {error && <div className="error-msg">⚠️ {error}</div>}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading && <span className="spinner"/>}
                  {loading ? 'Creation...' : 'Creer mon compte →'}
                </button>
              </form>

              <div className="login-link">
                Deja un compte ? <Link href="/auth/login">Se connecter</Link>
              </div>
            </>
          )}

          {/* ── Étape 2 : OTP ── */}
          {step === 2 && (
            <>
              <button className="btn-back" onClick={() => { setStep(1); setOtp(['','','','','','']); setError(''); }}>
                ← Retour
              </button>
              <h1 style={{
                fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800,
                color: '#fff', marginBottom: 16, letterSpacing: '-.5px',
              }}>
                Vérifie ton numéro
              </h1>
              <div className="otp-info">
                📱 Un code à 6 chiffres a été envoyé au<br/>
                <strong>{typeof window !== 'undefined' ? sessionStorage.getItem('pac_reg_phone') : ''}</strong>
              </div>
              <form onSubmit={handleVerifyOTP}>
                <div className="otp-grid" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      className={`otp-cell${digit ? ' filled' : ''}`}
                      type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpInput(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>
                <div className="resend-row">
                  Pas recu ?{' '}
                  <button type="button" className="resend-btn" onClick={handleResend} disabled={resendCD > 0}>
                    {resendCD > 0 ? `Renvoyer dans ${resendCD}s` : 'Renvoyer le code'}
                  </button>
                </div>
                {error && <div className="error-msg">⚠️ {error}</div>}
                <button type="submit" className="btn-primary" disabled={loading || otp.join('').length < 6}>
                  {loading && <span className="spinner"/>}
                  {loading ? 'Verification...' : 'Valider mon compte ✓'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </>
  );
}
