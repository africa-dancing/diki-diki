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
  login:     (email: string, password: string) => Promise<{ success: boolean; error?: string; totp_required?: boolean }>;
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

  // Session en attente : mot de passe valide, TOTP pas encore verifie.
  const [pendingAuth, setPendingAuth] = useState<AdminUser | null>(null); /*DKDK_TOTP_FRONT*/

  async function login(email: string, password: string) {
    /*DKDK_TOTP_FRONT*/
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

      // Le role est porte par le JWT : on ne fait pas confiance au client.
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

      // SÉCURITÉ (H1) : c'est le BACKEND qui tranche. S'il renvoie totp_pending,
      // le jeton reçu est "en attente" (inutilisable pour l'admin) tant que le code
      // n'est pas validé. On ne se fie plus à un appel de statut séparé.
      const totpRequis = !!data.totp_pending;

      if (!totpRequis) {
        // Pas de TOTP configure : session ouverte directement.
        setAdmin(adminUser);
        sessionStorage.setItem('dkdk_admin', JSON.stringify(adminUser));
        return { success: true, totp_required: false };
      }

      // TOTP requis : on garde la session en attente, rien n'est stocke.
      setPendingAuth(adminUser);
      return { success: true, totp_required: true };
    } catch (e: any) {
      return { success: false, error: 'Erreur de connexion.' };
    }
  }

  // Verifie le code a 6 chiffres cote backend, puis ouvre la session.
  async function verifyOTP(code: string) {
    /*DKDK_TOTP_FRONT*/
    if (!pendingAuth) return { success: false, error: 'Session expiree. Recommence.' };

    try {
      const res = await fetch(API + '/auth/totp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + pendingAuth.token,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Code incorrect.' };
      }

      // SÉCURITÉ (H1) : on remplace le jeton "en attente" par le VRAI jeton complet
      // renvoyé par le backend après validation du code.
      const fullUser = { ...pendingAuth, token: data.token || pendingAuth.token };
      setAdmin(fullUser);
      sessionStorage.setItem('dkdk_admin', JSON.stringify(fullUser));
      setPendingAuth(null);
      return { success: true };
    } catch {
      return { success: false, error: 'Erreur de connexion.' };
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