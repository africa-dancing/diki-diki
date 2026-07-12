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

/*DKDK_ADMIN_SECURE*/ // Aucun mot de passe cote client : le backend valide.

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin,   setAdmin]   = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('dkdk_admin');
    if (saved) {
      try { setAdmin(JSON.parse(saved)); } catch {}
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    /*DKDK_ADMIN_SECURE*/
    try {
      const res = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password: password }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        return { success: false, error: 'Email ou mot de passe incorrect.' };
      }

      // Le role est porte par le JWT : on le lit sans faire confiance au client.
      let role = '';
      try {
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        role = payload.role || '';
      } catch { role = ''; }

      if (role !== 'admin' && role !== 'moderateur') {
        return { success: false, error: 'Acces reserve aux administrateurs.' };
      }

      const adminUser: AdminUser = {
        email:    email,
        role:     role === 'admin' ? 'admin' : 'moderator',
        verified: true,
        token:    data.token,
      };
      setAdmin(adminUser);
      sessionStorage.setItem('dkdk_admin', JSON.stringify(adminUser));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: 'Erreur de connexion.' };
    }
  }

  // Conservee pour compatibilite : l'OTP admin sera rebranche cote backend.
  async function verifyOTP(_code: string) {
    return { success: true };
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