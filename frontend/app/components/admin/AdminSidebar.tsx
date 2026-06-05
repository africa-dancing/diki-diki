'use client';
import { useAdminAuth } from './AdminAuthContext';
import { usePathname }  from 'next/navigation';
import Link             from 'next/link';
import LogoDikiDiki from "../LogoDikiDiki";

const MENU = [
  { href: '/admin',            icon: '🏠', label: 'Dashboard'         },
  { href: '/admin/moderation', icon: '🎬', label: 'Moderation videos' },
  { href: '/admin/stats',      icon: '📊', label: 'Statistiques'      },
  { href: '/admin/ticker',     icon: '📢', label: 'Bande defilante'   },
];

export function AdminSidebar() {
  const { admin, logout } = useAdminAuth();
  const pathname          = usePathname();

  return (
    <div style={{ width: 210, background: '#0d0d14', borderRight: '1px solid #1e1e2e', display: 'flex', flexDirection: 'column', minHeight: '100vh', flexShrink: 0 }}>

      {/* Info admin */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e2e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,170,0,0.12)', border: '1px solid rgba(255,170,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#FFAA00', flexShrink: 0 }}>
            {admin?.email[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#e0e0e0' }}>
              {admin?.role === 'admin' ? 'Administrateur' : 'Modérateur'}
            </div>
            <div style={{ fontSize: 10, color: '#4a4a6a', marginTop: 1 }}>
              {admin?.email.split('@')[0]}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#2a2a4a', letterSpacing: '1px', padding: '8px 16px 4px', textTransform: 'uppercase' }}>Navigation</div>
        {MENU.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', textDecoration: 'none', fontSize: 12, fontWeight: 500, transition: 'all .15s', borderLeft: `2px solid ${active ? '#FFAA00' : 'transparent'}`, background: active ? 'rgba(255,170,0,0.06)' : 'transparent', color: active ? '#FFAA00' : '#6a6a8a' }}>
              <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Lien vers la plateforme */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid #1e1e2e' }}>
        <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4a4a6a', textDecoration: 'none', marginBottom: 8 }}>
          ← Retour à la plateforme
        </Link>
        <button onClick={logout} style={{ width: '100%', padding: '8px', fontSize: 12, fontWeight: 500, borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
          🚪 Déconnexion
        </button>
      </div>
    </div>
  );
}