'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/* Bannière de promotion / recrutement — DÉPLIABLE, repliée par défaut (discrète).
   Une barre compacte cliquable ; un clic déplie le texte complet + les boutons. */
export default function PromoBanniere() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ padding: '10px 16px 4px', display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: '100%', maxWidth: 680,
        background: 'linear-gradient(135deg,rgba(126,3,128,0.55),rgba(237,7,15,0.9))',
        border: '1px solid rgba(255,170,0,0.35)', borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 10px 30px -14px rgba(237,7,15,0.55)',
      }}>
        {/* Barre compacte cliquable */}
        <button onClick={() => setOpen(o => !o)} aria-expanded={open}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <span style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.25)', color: '#FFD700', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>🔥 L&apos;ARÈNE OUVRE BIENTÔT</span>
          <span style={{ flex: 1, fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: '#fff' }}>Deviens candidat</span>
          <span style={{ fontSize: 13, color: '#fff', transition: 'transform .25s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>

        {/* Contenu déplié */}
        {open && (
          <div style={{ padding: '0 16px 16px' }}>
            <p style={{ fontSize: 13, color: '#ffeef0', lineHeight: 1.5, margin: '0 0 14px' }}>
              Danse, chant, humour, sport… Dépose ta vidéo, le public te soutient par ses votes, et la cagnotte récompense les meilleurs. Le continent t&apos;attend.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/submit')} style={{ background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: '#000', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, padding: '11px 18px', borderRadius: 11, border: 'none', cursor: 'pointer' }}>🎬 Je dépose ma vidéo</button>
              <button onClick={() => router.push('/faq')} style={{ background: 'rgba(0,0,0,0.25)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '11px 16px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>Comment ça marche ?</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
