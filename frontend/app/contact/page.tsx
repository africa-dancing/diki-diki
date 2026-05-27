'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
import { useState } from 'react';
import Link from 'next/link';

const OR = '#FFAA00';
const OR2 = '#FF6B00';
const BG = '#0a0a0f';

const s: Record<string, React.CSSProperties> = {
  page:    { background: BG, minHeight: '100vh', color: '#e8e0d0', fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' },
  header:  { borderBottom: `1px solid rgb(250, 245, 245)`, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:    { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: OR, textDecoration: 'none', letterSpacing: 1 },
  back:    { color: 'rgba(38, 255, 0, 0.82)', fontSize: 13, textDecoration: 'none' },
  hero:    { padding: '48px 24px 32px', maxWidth: 760, margin: '0 auto' },
  badge:   { display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, marginBottom: 16, textTransform: 'uppercase' as const },
  h1:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color: '#f80101', margin: '0 0 8px', lineHeight: 1.2, textAlign: 'center' as const },
  sub:     { color: 'rgb(255, 255, 255)', fontSize: 15, textAlign: 'center' as const },
  divider: { height: 1, background: 'rgba(6, 0, 0, 0.21)', margin: '32px 0' },
  body:    { maxWidth: 760, margin: '0 auto', padding: '0 24px' },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 },
  card:    { background: 'rgba(255,255,255,0.03)', border: '1px solid rgb(255, 234, 0)', borderRadius: 12, padding: '20px', textAlign: 'center' as const },
  cardIcon:{ fontSize: 28, marginBottom: 8 },
  cardT:   { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 6 },
  cardS:   { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 10 },
  cardL:   { color: OR, fontSize: 13, textDecoration: 'none', fontWeight: 600 },
  formBox: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,170,0,0.12)', borderRadius: 16, padding: '32px' },
  formH:   { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: '#fff', marginBottom: 24 },
  label:   { display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 },
  input:   { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 8, color: '#fff', fontSize: 15, padding: '12px 14px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 },
  select:  { width: '100%', background: '#111', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 8, color: '#fff', fontSize: 15, padding: '12px 14px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 },
  textarea:{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 8, color: '#fff', fontSize: 15, padding: '12px 14px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'DM Sans', sans-serif", marginBottom: 16, resize: 'vertical' as const, minHeight: 120 },
  btn:     { width: '100%', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, padding: '14px', cursor: 'pointer', fontFamily: "'Syne', sans-serif" },
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

export default function ContactPage() {
  const [form, setForm] = useState({ nom: '', email: '', sujet: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/home" style={s.logo}><LogoDikiDiki width={200} /></Link>
        <Link href="/home" style={s.back}>← Retour</Link>
      </header>

      <div style={s.hero}>
        <div style={s.badge}>Support</div>
        <h1 style={s.h1}>Nous contacter</h1>
        <p style={s.sub}>Notre équipe vous répond sous 24h ouvrables</p>
      </div>

      <div style={s.divider} />

      <div style={s.body}>

        <div style={s.grid}>
          {[
            { icon: '📩', title: 'Email support', sub: 'Pour toute demande générale', link: 'mailto:support@dikidiki.com', label: 'support@dikidiki.com' },
            { icon: '🐛', title: 'Bug & technique', sub: 'Signaler un problème', link: 'mailto:support@dikidiki.com?subject=Bug technique', label: 'Signaler un bug' },
            { icon: '🤝', title: 'Partenariat', sub: 'Presse & collaborations', link: 'mailto:support@dikidiki.com?subject=Partenariat', label: 'Écrire un email' },
            { icon: '❓', title: 'FAQ', sub: 'Questions fréquentes', link: '/faq', label: 'Consulter la FAQ' },
          ].map(({ icon, title, sub, link, label }) => (
            <div key={title} style={s.card}>
              <div style={s.cardIcon}>{icon}</div>
              <div style={s.cardT}>{title}</div>
              <div style={s.cardS}>{sub}</div>
              <a href={link} style={s.cardL}>{label}</a>
            </div>
          ))}
        </div>

        <div style={s.formBox}>
          <p style={s.formH}>✉️ Envoyer un message</p>

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
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <label style={s.label}>Message *</label>
              <textarea required style={s.textarea} placeholder="Décrivez votre demande en détail..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />

              <button type="submit" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? '⏳ Envoi en cours...' : '🚀 Envoyer le message'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
