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
  contact: { background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 12, padding: '24px', marginTop: 40 },
  contactT:{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: OR, marginBottom: 8 },
};

export default function CGUPage() {
  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/home" style={s.logo}>Diki★Diki</Link>
        <Link href="/home" style={s.back}>← Retour</Link>
      </header>

      <div style={s.hero}>
        <div style={s.badge}>Légal</div>
        <h1 style={s.h1}>Conditions Générales d'Utilisation</h1>
        <p style={s.meta}><LogoDikiDiki width={180} /> SARL — Dernière mise à jour : 21 mai 2026</p>
      </div>

      <div style={s.divider} />

      <div style={s.body}>

        <div style={s.section}>
          <h2 style={s.h2}>1. Présentation de la plateforme</h2>
          <p style={s.p}><LogoDikiDiki width={180} /> Vision est le premier réseau social numérique panafricain crée pour valoriser et promouvoir les cultures africaines partout où elles existent, éditée par <span style={s.accent}><LogoDikiDiki width={180} /> SARL</span>, société à responsabilité limitée constituée selon le droit OHADA et dont le siège social est situé au Bénin.</p>
          <p style={s.p}>La plateforme permet aux utilisateurs de soumettre des vidéos de performance, de participer à des concours par élimination, et de voter pour leurs artistes favoris via un système de paiement sécurisé.</p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>2. Acceptation des conditions</h2>
          <p style={s.p}>L'accès et l'utilisation de <LogoDikiDiki width={180} /> Vision impliquent l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser la plateforme.</p>
          <p style={s.p}><LogoDikiDiki width={180} /> SARL se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés par notification dans l'application.</p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>3. Inscription et compte utilisateur</h2>
          <ul style={s.ul}>
            <li style={s.li}>L'inscription est ouverte à toute personne physique âgée d'au moins <span style={s.accent}>18 ans</span>.</li>
            <li style={s.li}>Chaque utilisateur ne peut créer qu'un seul compte. Tout compte dupliqué pourra être supprimé.</li>
            <li style={s.li}>L'utilisateur est responsable de la confidentialité de ses identifiants de connexion.</li>
            <li style={s.li}>Les informations fournies lors de l'inscription doivent être exactes et à jour.</li>
          </ul>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>4. Participation aux concours</h2>
          <p style={s.p}>Les candidats soumettent des vidéos de performance selon les règles propres à chaque concours. <LogoDikiDiki width={180} /> SARL se réserve le droit de refuser ou de supprimer toute vidéo ne respectant pas les critères de qualité ou les règles de la communauté.</p>
          <ul style={s.ul}>
            <li style={s.li}>Les vidéos doivent être originales et appartenir au candidat.</li>
            <li style={s.li}>Tout contenu plagié, violent, ou contraire aux bonnes mœurs est interdit.</li>
            <li style={s.li}>La participation à un bracket est totalement gratuite pour tout candidat.</li>
          </ul>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>5. Système de votes et cagnotte</h2>
          <p style={s.p}>Le vote est payant. Chaque vote correspond à <span style={s.accent}>1 unité = 10 F CFA</span>. Les votes sont traités via FedaPay, partenaire de paiement officiel de <LogoDikiDiki width={180} /> Vision.</p>
          <ul style={s.ul}>
            <li style={s.li}>La cagnotte s'accumule sur l'ensemble des tours d'un bracket.</li>
            <li style={s.li}>Le champion remporte <span style={s.accent}>50 %</span> de la cagnotte totale, après déduction de la commission <LogoDikiDiki width={180} />.</li>
            <li style={s.li}>En cas d'égalité à la fin d'un duel, une prolongation de 5 jours est automatiquement accordée.</li>
            <li style={s.li}>Les votes sont définitifs et non remboursables.</li>
          </ul>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>6. Portefeuille et retraits</h2>
          <p style={s.p}>Les gains sont crédités sur le portefeuille numérique de l'utilisateur (table <code>portefeuilles</code>). Les retraits sont soumis à vérification d'identité et peuvent prendre jusqu'à 72 heures ouvrables.</p>
          <p style={s.p}><LogoDikiDiki width={180} /> SARL se réserve le droit de bloquer un retrait en cas de suspicion de fraude ou d'utilisation abusive de la plateforme.</p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>7. Propriété intellectuelle</h2>
          <p style={s.p}>En soumettant une vidéo sur <LogoDikiDiki width={180} /> Vision, le candidat accorde à <LogoDikiDiki width={180} /> SARL une licence non exclusive, mondiale et gratuite pour diffuser, promouvoir et utiliser ce contenu dans le cadre de la plateforme et de ses communications.</p>
          <p style={s.p}>La marque <span style={s.accent}><LogoDikiDiki width={180} /></span>, son logo, son interface et son code source sont la propriété exclusive de <LogoDikiDiki width={180} /> SARL.</p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>8. Responsabilité</h2>
          <p style={s.p}><LogoDikiDiki width={180} /> SARL ne saurait être tenu responsable des interruptions de service dues à des maintenances, des défaillances techniques ou des cas de force majeure. La plateforme est fournie "en l'état".</p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>9. Résiliation</h2>
          <p style={s.p}>Tout utilisateur peut supprimer son compte à tout moment depuis les paramètres de son profil. <LogoDikiDiki width={180} /> SARL peut suspendre ou résilier un compte en cas de violation des présentes CGU, sans préavis.</p>
        </div>

        <div style={s.section}>
          <h2 style={s.h2}>10. Droit applicable</h2>
          <p style={s.p}>Les présentes CGU sont régies par le droit béninois et les règlements de l'espace OHADA. Tout litige sera soumis aux juridictions compétentes du Bénin.</p>
        </div>

        <div style={s.contact}>
          <p style={s.contactT}>📩 Contact</p>
          <p style={{ ...s.p, margin: 0 }}>Pour toute question relative aux présentes CGU : <a href="mailto:support@dikidiki.com" style={{ color: OR }}>support@dikidiki.com</a></p>
        </div>

      </div>
    </div>
  );
}
