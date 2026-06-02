'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

interface AdminUser {
  email:    string;
  role:     'admin' | 'moderator';
  verified: boolean;
  token:    string; // JWT backend
}

interface AdminAuthContext {
  admin:     AdminUser | null;
  loading:   boolean;
  login:     (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout:    () => void;
}

const AdminAuth = createContext<AdminAuthContext | null>(null);

// ✅ Comptes admin Diki-Diki
const ADMIN_ACCOUNTS = [
  { email: 'admin@dikidiki.com', password: 'Admin2026!', role: 'admin' as const },
  { email: 'ifedeg@gmail.com', password: 'Admin2026!', role: 'admin' as const },
];

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin,   setAdmin]   = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ email: string; password: string; role: 'admin' | 'moderator' } | null>(null);
  const [otp,     setOtp]     = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('dkdk_admin');
    if (saved) {
      try { setAdmin(JSON.parse(saved)); } catch {}
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const account = ADMIN_ACCOUNTS.find(a => a.email === email && a.password === password);
    if (!account) return { success: false, error: 'Email ou mot de passe incorrect.' };

    // Générer OTP 4 chiffres
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setOtp(code);
    setPending({ email: account.email, password: account.password, role: account.role });

    // Dev : console. Production : SMS via Africa's Talking
    console.log(`\n🔐 [DIKI-DIKI ADMIN] Code OTP pour ${email} : ${code}\n`);

    // TODO production : envoyer SMS via Africa's Talking
    // await fetch(`${API}/admin/send-otp`, { method:'POST', body: JSON.stringify({ email, code }) });

    return { success: true };
  }

  async function verifyOTP(code: string) {
    if (!pending) return { success: false, error: 'Session expirée.' };
    if (code !== otp) return { success: false, error: 'Code incorrect.' };

    try {
      // Appel backend pour obtenir le JWT admin
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: pending.email, password: pending.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erreur backend');

      const adminUser: AdminUser = {
        email:    pending.email,
        role:     pending.role,
        verified: true,
        token:    data.token,
      };
      setAdmin(adminUser);
      sessionStorage.setItem('dkdk_admin', JSON.stringify(adminUser));
      setPending(null);
      setOtp('');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message ?? 'Erreur de connexion.' };
    }
  }

  function logout() {
    setAdmin(null);
    sessionStorage.removeItem('dkdk_admin');
  }

  return (
    <AdminAuth.Provider value={{ admin, loading, login, verifyOTP, logout }}>
      {children}
    </AdminAuth.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuth);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}