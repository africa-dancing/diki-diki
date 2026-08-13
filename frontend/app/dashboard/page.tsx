'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Ancienne page de gestion (orpheline, basee sur "contests") : redirige vers l'admin. /*DKDK_DASHBOARD_REDIRECT*/
export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin'); }, [router]);
  return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', fontFamily:'DM Sans,sans-serif', fontSize:14 }}>
      Redirection…
    </div>
  );
}
