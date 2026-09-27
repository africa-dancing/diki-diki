'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoDikiDiki from '../../components/LogoDikiDiki';
import { firebaseConfigured, signInWithGoogleIdToken } from '../../../lib/firebase';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
  USER_NOT_FOUND:      'Aucun compte trouvé avec cet email.',
  ACCOUNT_DISABLED:    'Votre compte a été suspendu. Contactez le support.',
  TOO_MANY_ATTEMPTS:   'Trop de tentatives. Réessayez dans 15 minutes.',
  LOGIN_FAILED:        'Email ou mot de passe incorrect.',
  CGU_NOT_ACCEPTED:    'Aucun compte Google trouvé avec cette adresse. Crée d’abord ton compte.',
  SOCIAL_AUTH_FAILED:  'Connexion Google impossible. Réessaie.',
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [expired, setExpired]   = useState(false);
  useEffect(() => { try { if (new URLSearchParams(window.location.search).get('expired') === '1') setExpired(true); } catch (e) {} }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.includes('@')) { setError('Email invalide.'); return; }
    if (form.password.length < 6)  { setError('Mot de passe trop court.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'LOGIN_FAILED');

      localStorage.setItem('dkdk_token', data.token);
      localStorage.setItem('dkdk_user', JSON.stringify(data.user));
      router.push('/home');
    } catch (err: any) {
      setError(ERRORS[err.message] || 'Email ou mot de passe incorrect.');
    } finally { setLoading(false); }
  }

  async function handleGoogle() {
    setError('');
    if (!firebaseConfigured) { setError('La connexion Google sera bientôt disponible.'); return; }
    setLoading(true);
    try {
      const idToken = await signInWithGoogleIdToken();
      const res = await fetch(`${API}/auth/social`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', token: idToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(ERRORS[data.error] || 'Connexion Google impossible. Réessaie.'); setLoading(false); return; }
      localStorage.setItem('dkdk_token', data.token);
      localStorage.setItem('dkdk_user', JSON.stringify(data.user));
      if (!data.user || !data.user.phone) { router.push('/auth/ajouter-numero'); return; }
      router.push('/home');
    } catch (e: any) {
      const code = e && e.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') { setLoading(false); return; }
      setError('Connexion Google impossible. Réessaie.'); setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .login-bg{min-height:100vh;background:#08080f;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'DM Sans',sans-serif;position:relative;overflow:hidden}
        .login-bg::before{content:'';position:fixed;inset:0;background-image:repeating-linear-gradient(45deg,transparent,transparent 40px,rgba(255,184,0,.03) 40px,rgba(255,184,0,.03) 41px),repeating-linear-gradient(-45deg,transparent,transparent 40px,rgba(255,184,0,.03) 40px,rgba(255,184,0,.03) 41px);pointer-events:none}
        .glow-tr{position:fixed;top:-150px;right:-100px;width:450px;height:450px;background:radial-gradient(circle,rgba(255,107,0,.1) 0%,transparent 70%);pointer-events:none}
        .glow-bl{position:fixed;bottom:-150px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(255,184,0,.08) 0%,transparent 70%);pointer-events:none}
        .login-card{position:relative;width:100%;max-width:440px;background:rgba(255,255,255,.04);border:1px solid rgba(126,3,128,.6);border-top:2px solid #7e0380;border-radius:24px;padding:44px 40px;backdrop-filter:blur(20px)}
        .logo-area{display:flex;align-items:center;justify-content:center;margin-bottom:32px}
        .field{margin-bottom:16px}
        .field label{display:block;font-size:12px;font-weight:600;color:rgba(255,255,255,.5);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
        .input-wrap{position:relative}
        .field input{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:13px 16px;font-family:'DM Sans',sans-serif;font-size:15px;color:#fff;outline:none;transition:border-color .2s}
        .field input:focus{border-color:#FFAA00;background:rgba(255,170,0,.05)}
        .field input::placeholder{color:rgba(255,255,255,.22)}
        .eye-btn{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-size:18px;padding:4px}
        .error-msg{background:rgba(230,60,60,.1);border:1px solid rgba(230,60,60,.25);border-radius:10px;padding:11px 15px;font-size:13px;color:#ff7070;margin-bottom:16px}
        .btn-primary{width:100%;padding:15px;background:linear-gradient(135deg,#FFAA00,#FF6B00);border:none;border-radius:12px;font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#000;cursor:pointer;transition:opacity .2s;margin-top:4px}
        .btn-primary:hover:not(:disabled){opacity:.9}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed}
        .register-link{text-align:center;font-size:14px;color:rgba(255,255,255,.4);margin-top:22px}
        .register-link a{color:#FFAA00;text-decoration:none;font-weight:600}
        .forgot-link{text-align:right;margin-top:6px}
        .forgot-link a{font-size:12px;color:rgba(255,170,0,.6);text-decoration:none}
        .forgot-link a:hover{color:#FFAA00}
        .social-row{margin-bottom:4px}
        .btn-social{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:13px;background:#fff;border:1px solid rgba(255,255,255,.1);border-radius:12px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;color:#1a1a1a;cursor:pointer;transition:opacity .2s}
        .btn-social:hover:not(:disabled){opacity:.92}
        .btn-social:disabled{opacity:.5;cursor:not-allowed}
        .btn-social svg{width:20px;height:20px}
        .divider{display:flex;align-items:center;gap:12px;margin:18px 0;color:rgba(255,255,255,.35);font-size:13px}
        .divider::before,.divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.12)}
        .spinner{display:inline-block;width:18px;height:18px;border:2px solid rgba(0,0,0,.3);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:8px}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="login-bg">
        
        <div className="login-card">

          <div className="logo-area">
            <LogoDikiDiki width={200} />
          </div>

          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6, textAlign: 'center' }}>
            Connexion
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginBottom: 28, textAlign: 'center' }}>
            Accède à ton espace Diki-Diki
          </p>

          {expired && <div className="error-msg" style={{ background:'rgba(255,170,0,0.1)', border:'1px solid rgba(255,170,0,0.3)', color:'#FFD27a' }}>⏳ Ta session a expiré. Reconnecte-toi pour continuer.</div>}

          <div className="social-row">
            <button type="button" className="btn-social" onClick={handleGoogle} disabled={loading}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </button>
          </div>

          <div className="divider">ou avec ton email</div>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Email</label>
              <input name="email" type="email" placeholder="ton@email.com" value={form.email} onChange={handleChange} autoFocus />
            </div>

            <div className="field">
              <label>Mot de passe</label>
              <div className="input-wrap">
                <input name="password" type={showPass ? 'text' : 'password'} placeholder="Ton mot de passe" value={form.password} onChange={handleChange} autoComplete="current-password" />
                <button type="button" className="eye-btn" onClick={() => setShowPass(s => !s)}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              <div className="forgot-link">
                <a href="mailto:ifedeg@gmail.com?subject=Réinitialisation mot de passe Diki-Diki">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            {error && <div className="error-msg">⚠️ {error}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading && <span className="spinner"/>}
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>

          <div className="register-link">
            Pas encore de compte ? <Link href="/auth/register">S'inscrire</Link>
          </div>

        </div>
      </div>
    </>
  );
}
