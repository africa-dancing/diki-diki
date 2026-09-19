'use client';
// frontend/app/reprise/page.tsx
// Page publique : aide aux candidats pour obtenir l'instrumental d'une chanson
// (reprise « sans les paroles »). Consultable par tous les visiteurs.
import Navbar from '../components/Navbar';
import Link from 'next/link';

const OR = 'var(--or)';
const OR2 = 'var(--or2)';
const BG = 'var(--bg)';

const s: Record<string, React.CSSProperties> = {
  page:    { background: BG, minHeight: '100vh', color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' },
  hero:    { padding: '40px 24px 30px', background: 'radial-gradient(ellipse 55% 42px at 50% 16px,hsl(339, 98%, 49%) 0%,transparent 72%)', textAlign: 'center' as const },
  badge:   { display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: 'var(--on-accent)', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, marginBottom: 16, textTransform: 'uppercase' as const },
  h1:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color: 'var(--ink)', margin: '0 0 10px', lineHeight: 1.15, textAlign: 'center' as const },
  h1grad:  { background: `linear-gradient(90deg,${OR},${OR2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' as const, color: 'transparent' },
  sub:     { color: 'var(--ink-soft)', fontSize: 15, lineHeight: 1.6, maxWidth: 460, margin: '0 auto', textAlign: 'center' as const },

  body:    { maxWidth: 720, margin: '0 auto', padding: '0 24px' },
  steps:   { display: 'flex', flexDirection: 'column' as const, gap: 14, marginTop: 8 },
  step:    { position: 'relative' as const, background: 'var(--card, rgba(127,127,127,0.06))', border: '1px solid var(--line)', borderRadius: 16, padding: '20px 20px 20px 66px' },
  stepN:   { position: 'absolute' as const, left: 16, top: 18, width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--on-accent)', background: `linear-gradient(135deg,${OR},${OR2})` },
  stepH:   { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: 'var(--ink)', margin: 0 },
  stepP:   { margin: '7px 0 0', color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.6 },
  tools:   { display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginTop: 12 },
  tool:    { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: OR, background: 'rgba(255,170,0,0.10)', border: '1px solid rgba(255,170,0,0.30)', padding: '6px 11px', borderRadius: 999, textDecoration: 'none' },

  card:    { background: 'var(--card, rgba(127,127,127,0.06))', border: '1px solid var(--line)', borderRadius: 16, padding: '18px 20px', marginTop: 22 },
  cardH:   { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: '0 0 12px' },
  li:      { display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 9 },
  arrow:   { flex: 'none', color: 'rgb(26,255,0)', fontWeight: 800 },

  cta:     { textAlign: 'center' as const, marginTop: 26 },
  ctaBtn:  { display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: 'var(--on-accent)', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, padding: '14px 30px', borderRadius: 12, textDecoration: 'none' },
  ctaNote: { marginTop: 11, fontSize: 13, color: 'var(--ink-soft)' },
};

const b = (t: string) => <strong style={{ color: 'var(--ink)' }}>{t}</strong>;

export default function ReprisePage() {
  return (
    <div style={s.page}>
      <Navbar />

      <div style={s.hero}>
        <div style={s.badge}>Aide · Candidats</div>
        <h1 style={s.h1}>Ta reprise, <span style={s.h1grad}>sans les paroles</span></h1>
        <p style={s.sub}>
          Tu veux chanter sur la musique d&apos;une chanson, sans la voix d&apos;origine ?
          Voici comment obtenir l&apos;instrumental (le « karaoké ») en 3 étapes simples,
          gratuitement, même depuis ton téléphone.
        </p>
      </div>

      <div style={s.body}>
        <div style={s.steps}>
          <div style={s.step}>
            <div style={s.stepN}>1</div>
            <h3 style={s.stepH}>Prépare ta chanson</h3>
            <p style={s.stepP}>Aie sous la main le {b('fichier audio (MP3)')} de la chanson, ou son {b('lien')}. C&apos;est le morceau dont tu veux garder seulement la musique.</p>
          </div>

          <div style={s.step}>
            <div style={s.stepN}>2</div>
            <h3 style={s.stepH}>Passe-la dans un outil gratuit</h3>
            <p style={s.stepP}>Ouvre l&apos;un de ces sites, importe ta chanson : l&apos;IA {b('sépare la voix et l’instrumental')} en quelques secondes.</p>
            <div style={s.tools}>
              <a style={s.tool} href="https://moises.ai" target="_blank" rel="noopener noreferrer">🎵 Moises</a>
              <a style={s.tool} href="https://vocalremover.org" target="_blank" rel="noopener noreferrer">🎚️ vocalremover.org</a>
              <a style={s.tool} href="https://www.lalal.ai" target="_blank" rel="noopener noreferrer">✨ LALAL.AI</a>
            </div>
          </div>

          <div style={s.step}>
            <div style={s.stepN}>3</div>
            <h3 style={s.stepH}>Télécharge &amp; enregistre-toi</h3>
            <p style={s.stepP}>Récupère la piste {b('« instrumental »')}, lance-la, et {b('chante par-dessus')} en te filmant. Ta reprise est prête à soumettre&nbsp;!</p>
          </div>
        </div>

        <div style={s.card}>
          <h2 style={s.cardH}>🎤 Astuces pour un meilleur rendu</h2>
          <div style={s.li}><span style={s.arrow}>→</span><span>Écoute la musique {b('dans un casque')} et filme dans un endroit {b('calme')} : ta voix ressort mieux.</span></div>
          <div style={s.li}><span style={s.arrow}>→</span><span>Trop haut ou trop bas pour toi ? {b('Moises')} permet de {b('changer la tonalité et le tempo')}.</span></div>
          <div style={{ ...s.li, marginBottom: 0 }}><span style={s.arrow}>→</span><span>Fais un {b('essai rapide')} avant la vraie prise, et chante {b('fort et clair')}.</span></div>
        </div>

        <div style={s.cta}>
          <Link href="/auth/register" style={s.ctaBtn}>S&apos;inscrire pour participer →</Link>
          <p style={s.ctaNote}>L&apos;Arène t&apos;attend. Le continent a besoin de ton talent. ★</p>
        </div>
      </div>
    </div>
  );
}
