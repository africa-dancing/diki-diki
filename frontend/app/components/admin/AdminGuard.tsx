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
    <div style={{ background: '#121218', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      {/* Animation Diki ★ Diki (identique au splash) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 46, letterSpacing: 1 }}>
        <span className="dk-left"  style={{ color: '#FFAA00', display: 'inline-block' }}>Diki</span>
        <span className="dk-star"  style={{ color: '#E20707', display: 'inline-block' }}>★</span>
        <span className="dk-right" style={{ color: '#FFAA00', display: 'inline-block' }}>Diki</span>
      </div>
      <div style={{ fontSize: 12, color: '#6a6a8a', fontFamily: 'DM Sans, sans-serif' }}>Vérification en cours…</div>
      <style>{`
        @keyframes dkLeft  {0%{opacity:0;transform:translateX(-90px)}25%,75%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(-90px)}}
        @keyframes dkRight {0%{opacity:0;transform:translateX(90px)}25%,75%{opacity:1;transform:translateX(0)}100%{opacity:0;transform:translateX(90px)}}
        @keyframes dkStar  {0%{opacity:0;transform:translate(46px,-72px) scale(.2) rotate(-540deg)}25%,75%{opacity:1;transform:translate(0,0) scale(1) rotate(0)}100%{opacity:0;transform:translate(46px,-72px) scale(.2) rotate(-540deg)}}
        .dk-left  {animation:dkLeft 2.6s ease-in-out infinite}
        .dk-right {animation:dkRight 2.6s ease-in-out infinite}
        .dk-star  {animation:dkStar 2.6s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){.dk-left,.dk-right,.dk-star{animation:none;opacity:1;transform:none}}
      `}</style>
    </div>
  );

  if (!admin) return null;

  return <>{children}</>;
}