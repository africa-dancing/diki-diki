'use client';
import { useState }     from 'react';
import { useRouter }    from 'next/navigation';
import { useAdminAuth } from '../../components/admin/AdminAuthContext';

type Step = 'credentials' | 'otp';

export default function AdminLoginPage() {
  const { login, verifyOTP } = useAdminAuth();
  const router               = useRouter();
  const [step,     setStep]     = useState<Step>('credentials');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [otp,      setOtp]      = useState(['', '', '', '']);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  async function handleLogin() {
    if (!email || !password) { setError('Remplissez tous les champs.'); return; }
    setLoading(true); setError('');
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) { setError(res.error || 'Erreur.'); return; }
    setStep('otp');
  }

  async function handleOTP(code: string[]) {
    setLoading(true); setError('');
    const res = await verifyOTP(code.join(''));
    setLoading(false);
    if (!res.success) { setError(res.error || 'Code incorrect.'); return; }
    router.replace('/admin');
  }

  function handleOtpInput(val: string, idx: number) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < 3) document.getElementById(`otp-${idx + 1}`)?.focus();
    if (next.every(d => d)) setTimeout(() => handleOTP(next), 100);
  }

  function handleKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0)
      document.getElementById(`otp-${idx - 1}`)?.focus();
  }

  const OR = '#FFAA00';

  return (
    <div style={{ background: '#0a0a0f', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          
          <div style={{ fontSize: 12, color: '#4a4a6a' }}>Panel Administrateur</div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px' }}>

          {step === 'credentials' && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>Connexion administrateur</div>
              <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 20 }}>Un code OTP sera généré après vérification</div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Email</div>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@dkdk.com"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  style={{ width: '100%', padding: '11px 14px', fontSize: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Mot de passe</div>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="••••••••••••"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    style={{ width: '100%', padding: '11px 40px 11px 14px', fontSize: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14 }}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f87171', marginBottom: 14 }}>⚠️ {error}</div>
              )}

              <button onClick={handleLogin} disabled={loading}
                style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, borderRadius: 12, cursor: 'pointer', fontFamily: 'Syne, sans-serif', border: 'none', background: loading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#FFAA00,#FF6B00)', color: loading ? '#4a4a6a' : '#000' }}>
                {loading ? 'Vérification…' : 'Continuer →'}
              </button>

              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 11, color: '#4a4a6a', textAlign: 'center' }}>
                🔒 Accès réservé à l'administrateur Diki-Diki
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: 4 }}>Code de vérification</div>
              <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 4 }}>Code OTP à 4 chiffres.</div>
              <div style={{ fontSize: 11, color: '#2a2a4a', marginBottom: 20 }}>💻 Mode développement — voir la console VS Code</div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                {otp.map((d, i) => (
                  <input key={i} id={`otp-${i}`} type="tel" maxLength={1} value={d}
                    onChange={e => handleOtpInput(e.target.value, i)}
                    onKeyDown={e => handleKeyDown(e, i)}
                    style={{ width: 56, height: 64, textAlign: 'center', fontSize: 24, fontWeight: 700, background: 'rgba(255,255,255,0.06)', borderRadius: 12, color: OR, outline: 'none', fontFamily: 'DM Sans, sans-serif', border: `1px solid ${d ? OR : 'rgba(255,255,255,0.1)'}` }} />
                ))}
              </div>

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f87171', marginBottom: 14, textAlign: 'center' }}>⚠️ {error}</div>
              )}

              <button onClick={() => { setStep('credentials'); setOtp(['', '', '', '']); setError(''); }}
                style={{ width: '100%', padding: '10px', fontSize: 13, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                ← Retour
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
