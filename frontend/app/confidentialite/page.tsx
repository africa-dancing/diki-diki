'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
import Link from 'next/link';

const OR = '#FFAA00';
const OR2 = '#FF6B00';
const BG = '#0a0a0f';

const s: Record<string, React.CSSProperties> = {
  page:    { background: BG, minHeight: '100vh', color: '#e8e0d0', fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' },
  header:  { borderBottom: `1px solid rgba(255,170,0,0.15)`, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:    { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: OR, textDecoration: 'none', letterSpacing: 1 },
  back:    { color: 'rgba(255,170,0,0.6)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 },
  hero:    { padding: '48px 24px 32px', maxWidth: 760, margin: '0 auto' },
  badge:   { display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, marginBottom: 16, textTransform: 'uppercase' as const },
  h1:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color: '#fff', margin: '0 0 8px', lineHeight: 1.2 },
  meta:    { color: 'rgba(255,255,255,0.35)', fontSize: 13, marginBottom: 0 },
  body:    { maxWidth: 760, margin: '0 auto', padding: '0 24px' },
  section: { marginBottom: 40 },
  h2:      { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: OR, margin: '0 0 12px', paddingBottom: 8, borderBottom: '1px solid rgba(255,170,0,0.15)' },
  p:       { fontSize: 15, lineHeight: 1.8, color: 'rgba(232,224,208,0.85)', margin: '0 0 12px' },
  ul:      { paddingLeft: 20, margin: '0 0 12px' },
  li:      { fontSize: 15, lineHeight: 1.8, color: 'rgba(232,224,208,0.85)', marginBottom: 6 },
  accent:  { color: OR },
  divider: { height: 1, background: 'rgba(255,170,0,0.08)', margin: '32px 0' },
  table:   { width: '100%', borderCollapse: 'collapse' as const, marginBottom: 16 },
  th:      { textAlign: 'left' as const, padding: '10px 12px', background: 'rgba(255,170,0,0.08)', color: OR, fontSize: 13, fontWeight: 600, borderBottom: '1px solid rgba(255,170,0,0.15)' },
  td:      { padding: '10px 12px', fontSize: 14, color: 'rgba(232,224,208,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  contact: { background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 12, padding: '24px', marginTop: 40 },
  contactT:{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: OR, marginBottom: 8 },
};

export default function ConfidentialitePage() {
  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/home" style={s.logo}><LogoDikiDiki width={180} /></Link>
        <Link href="/home" style={s.back}>← Retour</Link>
      </header>

      <div style={s.hero}>
        <div style={s.badge}>Légal</div>
        <h1 style={s.h1}>Politique de Confidentialité</h1>
        <p style={s.meta}><LogoDikiDiki width={180} /> SARL — Dernière mise à jour : 21 mai 2026</p>
      </div>

      <div style={s.divider} />

      <div style={s.body}>

        <div style={s.section}>
          <h2 style={s.h2}>1. Responsable du traitement</h2>
          <p style={s.p}><span style={s.accent}><LogoDikiDiki width={180} /> SARL</span>, société à responsabilité limitée constituée selon le droit OHADA, est responsable du traitement de vos données personnelles collectées via la plateforme <LogoDikiDiki width={180} /> Vision.</p>
          <p style={s.p}>Contact DPO : <a href="mailto:support@dikidiki.com" style={{ color: OR }}>support@dikidiki.com</a></p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>2. Données collectées</h2>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Donnée</th>
                <th style={s.th}>Finalité</th>
                <th style={s.th}>Base légale</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Nom, prénom, email', 'Création et gestion du compte', 'Contrat'],
                ['Numéro de téléphone', 'Authentification OTP via Africa\'s Talking', 'Contrat'],
                ['Vidéos soumises', 'Participation aux concours', 'Consentement'],
                ['Données de vote et paiement', 'Traitement des transactions via FedaPay', 'Contrat'],
                ['Logs de connexion', 'Sécurité et prévention de la fraude', 'Intérêt légitime'],
                ['Notifications push', 'Communication sur les concours', 'Consentement'],
              ].map(([d, f, b]) => (
                <tr key={d}>
                  <td style={s.td}>{d}</td>
                  <td style={s.td}>{f}</td>
                  <td style={{ ...s.td, color: OR }}>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>3. Durée de conservation</h2>
          <ul style={s.ul}>
            <li style={s.li}>Données de compte : conservées pendant toute la durée d'activité du compte + <span style={s.accent}>3 ans</span> après suppression.</li>
            <li style={s.li}>Données de transaction : <span style={s.accent}>10 ans</span> conformément aux obligations comptables.</li>
            <li style={s.li}>Logs de connexion : <span style={s.accent}>12 mois</span>.</li>
            <li style={s.li}>Vidéos : supprimées sur demande ou 6 mois après la fin du concours.</li>
          </ul>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>4. Partage des données</h2>
          <p style={s.p}>Vos données ne sont jamais vendues à des tiers. Elles peuvent être partagées avec :</p>
          <ul style={s.ul}>
            <li style={s.li}><span style={s.accent}>Supabase</span> — hébergement de la base de données (serveurs sécurisés)</li>
            <li style={s.li}><span style={s.accent}>FedaPay</span> — traitement des paiements</li>
            <li style={s.li}><span style={s.accent}>Africa's Talking</span> — envoi de SMS OTP</li>
            <li style={s.li}><span style={s.accent}>Upstash</span> — cache Redis pour les performances</li>
          </ul>
          <p style={s.p}>Ces partenaires sont soumis à des obligations contractuelles strictes de confidentialité.</p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>5. Vos droits</h2>
          <p style={s.p}>Conformément aux réglementations applicables, vous disposez des droits suivants :</p>
          <ul style={s.ul}>
            <li style={s.li}><strong>Droit d'accès</strong> : consulter les données vous concernant</li>
            <li style={s.li}><strong>Droit de rectification</strong> : corriger des données inexactes</li>
            <li style={s.li}><strong>Droit à l'effacement</strong> : demander la suppression de votre compte et de vos données</li>
            <li style={s.li}><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
            <li style={s.li}><strong>Droit d'opposition</strong> : vous opposer à certains traitements</li>
          </ul>
          <p style={s.p}>Pour exercer ces droits : <a href="mailto:support@dikidiki.com" style={{ color: OR }}>support@dikidiki.com</a></p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>6. Cookies</h2>
          <p style={s.p}><LogoDikiDiki width={180} /> Vision utilise uniquement des cookies techniques strictement nécessaires au fonctionnement de la plateforme (authentification, session). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.</p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>7. Sécurité</h2>
          <p style={s.p}>Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement des communications (HTTPS), authentification à deux facteurs (OTP), Row Level Security sur Supabase, et accès limité aux données sensibles.</p>
        </div>

        <div style={s.contact}>
          <p style={s.contactT}>📩 Exercer vos droits</p>
          <p style={{ ...s.p, margin: 0 }}>Contactez notre équipe à <a href="mailto:support@dikidiki.com" style={{ color: OR }}>support@dikidiki.com</a> — Réponse sous 30 jours ouvrables.</p>
        </div>

      </div>
    </div>
  );
}
