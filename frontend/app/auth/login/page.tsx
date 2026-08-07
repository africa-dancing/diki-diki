'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoDikiDiki from '../../components/LogoDikiDiki';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
  USER_NOT_FOUND:      'Aucun compte trouvé avec cet email.',
  ACCOUNT_DISABLED:    'Votre compte a été suspendu. Contactez le support.',
  TOO_MANY_ATTEMPTS:   'Trop de tentatives. Réessayez dans 15 minutes.',
  LOGIN_FAILED:        'Email ou mot de passe incorrect.',
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

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
