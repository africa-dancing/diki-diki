'use client';
import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';

/*DKDK_CONTACT_V4*/
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

const OR = '#FFAA00';
const OR2 = '#FF6B00';
const MAGENTA = '#7e0380';
const BG = '#0a0a0f';

const s: Record<string, React.CSSProperties> = {
  page:    { background: BG, minHeight: '100vh', color: '#e8e0d0', fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' },
  badgeWrap: { padding: '16px', display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const },
  badge:   { background: `linear-gradient(135deg,${OR},${OR2})`, color: '#000', fontSize: 12, padding: '5px 12px', borderRadius: 20, fontWeight: 800 },
  hero:    { padding: '16px 24px 32px', background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', textAlign: 'center' as const },
  h1:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 'clamp(1.4rem,4vw,2rem)', lineHeight: 1.1, margin: '0 0 8px', background: 'linear-gradient(135deg,#f0f0f0,#888)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  sub:     { color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: 0 },
  divider: { height: 1, background: 'rgba(255,255,255,0.06)', margin: '24px 0 32px' },
  body:    { maxWidth: 760, margin: '0 auto', padding: '0 24px' },

  gridReseaux: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 },
  gridPanneaux:{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 },

  card:    { background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(126,3,128,0.6)`, borderTop: `2px solid ${MAGENTA}`, borderRadius: 12, padding: '18px 10px', textAlign: 'center' as const, textDecoration: 'none', display: 'block', color: '#e8e0d0', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", width: '100%' },
  cardReseau:{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(126,3,128,0.6)`, borderTop: `2px solid ${MAGENTA}`, borderRadius: 12, padding: '14px 8px', textAlign: 'center' as const, textDecoration: 'none', display: 'block', color: '#e8e0d0' },
  cardIcon:{ fontSize: 24, marginBottom: 6 },
  cardIconSm:{ fontSize: 22, marginBottom: 4 },
  cardT:   { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 6 },
  cardTsm: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 11, color: '#fff' },
  cardS:   { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 },
  cardSsm: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  cardL:   { color: OR, fontSize: 12, fontWeight: 600 },

  formBox: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,170,0,0.12)', borderRadius: 16, padding: '32px' },
  formH:   { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: '#fff', marginBottom: 24, textAlign: 'center' as const },
  label:   { display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 },
  input:   { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 8, color: '#fff', fontSize: 15, padding: '12px 14px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 },
  select:  { width: '100%', background: '#111', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 8, color: '#fff', fontSize: 15, padding: '12px 14px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 },
  textarea:{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 8, color: '#fff', fontSize: 15, padding: '12px 14px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'DM Sans', sans-serif", marginBottom: 16, resize: 'vertical' as const, minHeight: 120 },
  btn:     { width: '100%', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, padding:'14px', cursor: 'pointer', fontFamily: "'Syne', sans-serif", lineHeight: 1.5 },
  btnEmail:{ display: 'block', fontSize: 13, fontWeight: 600, marginTop: 2 },
  success: { background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.2)', borderRadius: 10, padding: '20px', textAlign: 'center' as const, color: '#00c864' },
};

const subjects = [
  'Problème de paiement',
  'Problème de compte',
  'Signalement de contenu',
  'Demande de retrait',
  'Bug technique',
  'Partenariat / Presse',
  'Autre',
];

const normLink = (v: string) => {
  if (!v) return '';
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return 'https://' + v;
};

const WhatsAppIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ marginBottom: 5 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
  </svg>
);

export default function ContactPage() {
  const [form, setForm] = useState({ nom: '', email: '', sujet: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const [cfg, setCfg] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch(`${API}/settings`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        const map: Record<string, string> = {};
        (j?.data ?? []).forEach((it: any) => { map[it.key] = it.value ?? ''; });
        setCfg(map);
      })
      .catch(() => {});
  }, []);

  const waRaw    = (cfg.contact_whatsapp || '').trim();
  const waDigits = waRaw.replace(/[^\d]/g, '');
  const waLink   = waDigits ? `https://wa.me/${waDigits}` : '';

  const email = (cfg.contact_email || '').trim() || 'support@diki-diki.com';

  const fbLink = normLink((cfg.contact_facebook || '').trim());
  const igLink = normLink((cfg.contact_instagram || '').trim());
  const tkLink = normLink((cfg.contact_tiktok || '').trim());

  const reseaux: { key: string; node: React.ReactNode; href: string }[] = [];
  if (waLink) reseaux.push({ key: 'wa', href: waLink, node: (<><WhatsAppIcon /><div style={s.cardTsm}>WhatsApp</div><div style={s.cardSsm}>Discuter</div></>) });
  if (fbLink) reseaux.push({ key: 'fb', href: fbLink, node: (<><div style={s.cardIconSm}>📘</div><div style={s.cardTsm}>Facebook</div><div style={s.cardSsm}>Suivre</div></>) });
  if (igLink) reseaux.push({ key: 'ig', href: igLink, node: (<><div style={s.cardIconSm}>📸</div><div style={s.cardTsm}>Instagram</div><div style={s.cardSsm}>Suivre</div></>) });
  if (tkLink) reseaux.push({ key: 'tk', href: tkLink, node: (<><div style={s.cardIconSm}>🎵</div><div style={s.cardTsm}>TikTok</div><div style={s.cardSsm}>Suivre</div></>) });

  // Clic panneau -> pre-remplit le sujet et defile vers le formulaire
  const allerAuFormulaire = (sujet: string) => {
    setForm(f => ({ ...f, sujet }));
    setSent(false);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <Navbar />

      <div style={s.badgeWrap}>
        <span style={s.badge}>🎭 Support</span>
      </div>

      <div style={s.hero}>
        <h1 style={s.h1}>Nous contacter</h1>
        <p style={s.sub}>Notre équipe vous répond sous 24h ouvrables</p>
      </div>

      

      <div style={s.body}>

        {/* Ligne 1 : reseaux (dynamiques, liens externes) */}
        {reseaux.length > 0 && (
          <div style={{ ...s.gridReseaux, gridTemplateColumns: `repeat(${reseaux.length}, 1fr)` }}>
            {reseaux.map(r => (
              <a key={r.key} href={r.href} target="_blank" rel="noopener noreferrer" style={s.cardReseau}>
                {r.node}
              </a>
            ))}
          </div>
        )}

        {/* Ligne 2 : Bug & Partenariat (defilent vers le formulaire) + FAQ (lien) */}
        <div style={s.gridPanneaux}>
          <button type="button" style={s.card} onClick={() => allerAuFormulaire('Bug technique')}>
            <div style={s.cardIcon}>🐛</div>
            <div style={s.cardT}>Bug & technique</div>
            <div style={s.cardS}>Signaler un problème</div>
            <div style={s.cardL}>Signaler un bug</div>
          </button>

          <button type="button" style={s.card} onClick={() => allerAuFormulaire('Partenariat / Presse')}>
            <div style={s.cardIcon}>🤝</div>
            <div style={s.cardT}>Partenariat</div>
            <div style={s.cardS}>Presse & collaborations</div>
            <div style={s.cardL}>Nous écrire</div>
          </button>

          <a href="/faq" style={s.card}>
            <div style={s.cardIcon}>❓</div>
            <div style={s.cardT}>FAQ</div>
            <div style={s.cardS}>Questions fréquentes</div>
            <div style={s.cardL}>Consulter la FAQ</div>
          </a>
        </div>

        {/* Formulaire */}
        <div style={s.formBox} ref={formRef}>
          <p style={s.formH}>✉️ Envoyer un message pour toute demande générale</p>
          {sent ? (
            <div style={s.success}>
              <p style={{ fontSize: 24, margin: '0 0 8px' }}>✅</p>
              <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>Message envoyé !</p>
              <p style={{ fontSize: 14, opacity: 0.8, margin: 0 }}>Nous vous répondrons à <strong>{form.email}</strong> sous 24h.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={s.label}>Nom complet *</label>
                  <input required style={s.input} placeholder="Votre nom" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Email *</label>
                  <input required type="email" style={s.input} placeholder="votre@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <label style={s.label}>Sujet *</label>
              <select required style={s.select} value={form.sujet} onChange={e => setForm({ ...form, sujet: e.target.value })}>
                <option value="">Choisissez un sujet</option>
                {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
              </select>
              <label style={s.label}>Message *</label>
              <textarea required style={s.textarea} placeholder="Décrivez votre demande en détail..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
              <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? '⏳ Envoi en cours...' : (
                  <>🚀 Envoyer le message au<span style={s.btnEmail}>{email}</span></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
