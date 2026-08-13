'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Le systeme "contests" est retire : cette page redirige vers les challenges (brackets). /*DKDK_CONTESTS_REDIRECT*/
export default function ContestsPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/challenges'); }, [router]);
  return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', fontFamily:'DM Sans,sans-serif', fontSize:14 }}>
      Redirection vers les challenges…
    </div>
  );
}
