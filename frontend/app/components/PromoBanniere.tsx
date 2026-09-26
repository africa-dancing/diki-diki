'use client';
import { useRouter } from 'next/navigation';

/* Bannière de promotion / recrutement (pré-lancement).
   Toujours visible sur l'accueil et le Mur des appels tant qu'il n'y a pas encore de vidéos. */
export default function PromoBanniere() {
  const router = useRouter();

  return (
    <div style={{ padding: '16px 16px 4px', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: 680,
        background: 'linear-gradient(135deg,rgba(126,3,128,0.55),rgba(237,7,15,0.9))',
        border: '1px solid rgba(255,170,0,0.35)', borderRadius: 18, padding: '26px 22px',
        textAlign: 'center', boxShadow: '0 12px 40px -14px rgba(237,7,15,0.6)',
      }}>
        <span style={{ display: 'inline-block', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.25)', color: '#FFD700', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', padding: '4px 12px', borderRadius: 20, marginBottom: 12 }}>🔥 L&apos;ARÈNE OUVRE BIENTÔT</span>

        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 'clamp(22px,5vw,32px)', lineHeight: 1.1, margin: 0, color: '#fff' }}>
          Sois parmi les <span style={{ background: 'linear-gradient(90deg,#FF6B00,#FFD700)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>premiers talents</span> de Diki-Diki
        </h1>

        <p style={{ fontSize: 14, color: '#ffeef0', marginTop: 10, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
          Danse, chant, humour, sport… Dépose ta vidéo, le public te soutient par ses votes, et la cagnotte récompense les meilleurs. Le continent t&apos;attend.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 18 }}>
          <button onClick={() => router.push('/submit')} style={{ background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, padding: '13px 22px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>🎬 Je dépose ma vidéo</button>
          <button onClick={() => router.push('/faq')} style={{ background: 'rgba(0,0,0,0.25)', color: '#fff', fontWeight: 700, fontSize: 14, padding: '13px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>Comment ça marche ?</button>
        </div>
      </div>
    </div>
  );
}
