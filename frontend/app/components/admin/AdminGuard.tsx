'use client';
import { useAdminAuth } from './AdminAuthContext';
import { useRouter }    from 'next/navigation';
import { useEffect }    from 'react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { admin, loading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !admin) {
      router.replace('/admin/login');
    }
  }, [admin, loading, router]);

  if (loading) return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #1e1e2e', borderTopColor: '#FFAA00', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 14px' }} />
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
          <span style={{ color: '#FFAA00' }}>Diki</span>
          <span style={{ color: '#fff', margin: '0 2px' }}>-</span>
          <span style={{ color: '#FFAA00' }}>Diki</span>
        </div>
        <div style={{ fontSize: 12, color: '#4a4a6a', fontFamily: 'DM Sans, sans-serif' }}>Vérification en cours…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (!admin) return null;

  return <>{children}</>;
}