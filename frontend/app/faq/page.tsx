'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
import Navbar from '../components/Navbar';
import { useState } from 'react';
import Link from 'next/link';

const OR = '#FFAA00';
const OR2 = '#FF6B00';
const BG = '#0a0a0f';

const s: Record<string, React.CSSProperties> = {
  page:    { background: BG, minHeight: '100vh', color: '#e8e0d0', fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' },
  header:  { borderBottom: `1px solid rgb(249, 246, 246)`, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:    { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: OR, textDecoration: 'none', letterSpacing: 1 },
  back:    { color: 'rgb(26, 255, 0)', fontSize: 13, textDecoration: 'none' },
  hero:    { padding: '48px 24px 32px', maxWidth: 760, margin: '0 auto', textAlign: 'center' as const },
  badge:   { display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, marginBottom: 16, textTransform: 'uppercase' as const },
  h1:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color: '#fa0404', margin: '0 0 8px', lineHeight: 1.2, textTransform: 'uppercase' as const, textAlign: 'center' as const },
  sub:     { color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 0, textAlign: 'center' as const },
  divider: { height: 1, background: 'rgba(10, 7, 0, 0.15)', margin: '32px 0' },
  body:    { maxWidth: 760, margin: '0 auto', padding: '0 24px' },
  catTitle:{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: OR, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 12, marginTop: 32 },
  item:    { borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' },
  q:       { width: '100%', background: 'none', border: 'none', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, textAlign: 'left' as const, padding: '16px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  a:       { fontSize: 14, lineHeight: 1.8, color: 'rgba(232,224,208,0.8)', padding: '0 0 16px' },
  contact: { background: 'linear-gradient(135deg,rgba(126, 3, 128, 0.52),rgba(237,7,15))', border:'1px solid rgb(10, 0, 0)', borderRadius:16, padding:'20px', marginBottom:20 },
  ctaBtn:  { display: 'block', width: 'fit-content', marginTop: 12, marginLeft: 'auto', marginRight: 'auto', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 8, textDecoration: 'none' },
};

const faqs = [
  {
    cat: '🌍 Diki-Diki Vision — La plateforme',
    items: [
      {
        q: "C'est quoi Diki-Diki Vision ?",
        a: `Diki-Diki Vision est une plateforme panafricaine d'éducation, du savoir, de loisir et de divertissement.\n\nElle offre un écosystème riche en découverte du savoir et permet à la fois à ses utilisateurs de s'affronter dans des jeux de compétitions en ligne et de gagner de l'argent grâce aux votes du public — danse, chant, musique, comédie, poésie, conte, etc.\n\n🌍 Ouverte à toute l'Afrique, à toute la diaspora internationale et au reste du monde.`,
      },
      {
        q: "Quels sont les avantages d'être sur Diki-Diki Vision ?",
        a: `Pour les artistes :\n• Visibilité auprès d'une audience africaine et internationale\n• Compétition équitable — c'est le public qui vote\n• Gains réels — le champion remporte 50 % de la cagnotte\n• Rémunération sur le contenu éducatif publié\n• Appartenir à une communauté de talents africains en pleine croissance\n\nPour le public :\n• Découverte de talents que vous n'auriez jamais rencontrés ailleurs\n• Soutien direct — vos votes vont dans la cagnotte de votre artiste favori\n• Accès gratuit — regarder, commenter et partager est entièrement gratuit, sans inscription`,
      },
    ],
  },
  {
    cat: '🏆 Comprendre le Bracket',
    items: [
      {
        q: "C'est quoi un « bracket » ?",
        a: `Un bracket est un tableau de compétition par élimination directe, inspiré des tournois sportifs. Les candidats s'affrontent en duels : le gagnant passe au tour suivant, le perdant est éliminé. Sur Diki-Diki Vision, c'est le public qui vote pour désigner le gagnant de chaque duel.\n\nStructure d'un bracket :\n• Huitième de finale — 16 candidats, 8 duels — 10 jours\n• Quart de finale — 8 candidats, 4 duels — 10 jours\n• Demi-finale — 4 candidats, 2 duels — 10 jours\n• Finale — 2 candidats, 1 duel — 10 jours\n• Champion — remporte 50 % de la cagnotte totale accumulée`,
      },
      {
        q: "Bracket « Libre / Duel » vs « Répertoire / Groupe » — quelle différence ?",
        a: `Libre — chaque candidat choisit librement son adversaire et lui envoie une invitation à compétir sur le Podium Aréna Challenge sur un morceau ou une séquence d'un morceau. L'autre candidat accepte ou décline l'invitation. Ils se fixent un délai en commun accord pour déposer leur enregistrement et après validation la compétition est lancée.\n\nRépertoire Groupe — tous les candidats font leurs choix respectifs et tombent chacun dans un pool ; une fois les pools formés, la compétition démarre par les éliminations appelées Huitième de finale puis le Quart de finale, la Demi-finale et enfin la Finale. Les disciplines sont les suivantes : le chant par l'interprétation ; la danse ; la chorégraphie sur le même morceau imposé pour tous. Cela permet une comparaison équitable sur la même base artistique et met en valeur l'interprétation personnelle de chaque artiste.`,
      },
    ],
  },
  {
    cat: '🎤 Participation',
    items: [
      { q: 'Comment participer à un concours ?', a: "Créez un compte, choisissez le morceau (track) auquel vous souhaitez participer ; soumettez une vidéo de votre prestation sur le morceau ou la séquence depuis la page Challenges. Une fois 16 candidats inscrits, le bracket (ou encore la compétition) démarre automatiquement." },
      { q: 'Quel type de vidéo puis-je soumettre ?', a: "Toute performance artistique : danse, chant, musique, slam, comédie... La vidéo doit être originale, vous appartenir, et respecter les règles de la communauté (pas de contenu violent ou offensant)." },
      { q: "Combien coûte l'inscription à une compétition (un bracket) ?", a: "L'inscription est 100 % gratuite pour tout candidat. Seul le public paie pour voter (1 vote = 10 F CFA)." },
      { q: 'Puis-je participer à plusieurs concours en même temps ?', a: "Oui, vous pouvez vous inscrire à plusieurs brackets simultanément, à condition de respecter les règles de chaque concours." },
    ],
  },
  {
    cat: '🗳️ Votes & Cagnotte',
    items: [
      { q: 'Comment fonctionne le vote ?', a: "1 vote = 1 unité = 10 F CFA. Vous choisissez le candidat que vous souhaitez soutenir dans un duel actif, et le montant est débité de votre portefeuille ou payé directement." },
      { q: "La cagnotte, c'est quoi exactement ?", a: "La cagnotte est l'ensemble des votes accumulés sur tous les tours d'un bracket. Le champion final remporte 50 % de la cagnotte totale, après déduction de la commission Diki-Diki Vision." },
      { q: "Que se passe-t-il en cas d'égalité ?", a: "En cas d'égalité à la fin d'un duel, une prolongation automatique de 5 jours est accordée. Si l'égalité persiste, le jury Diki-Diki tranche." },
      { q: 'Puis-je voter plusieurs fois pour le même candidat ?', a: "Oui, vous pouvez voter autant de fois que vous le souhaitez pour un candidat, tant que le duel est actif." },
    ],
  },
  {
    cat: '💳 Paiement & Retrait',
    items: [
      { q: 'Comment retirer mes gains ?', a: "Allez dans Portefeuille → Retrait, saisissez le montant souhaité et votre numéro Mobile Money. Le virement est traité sous 72 heures ouvrables." },
      { q: 'Quels moyens de paiement sont acceptés ?', a: "Diki-Diki Vision accepte les paiements via Mobile Money (MTN, Moov, Wave) et carte bancaire, traités par notre partenaire FedaPay." },
      { q: 'Mon paiement a échoué, que faire ?', a: "Vérifiez votre solde Mobile Money ou les informations de votre carte. Si le problème persiste, contactez-nous à support@dikidiki.com avec votre numéro de transaction." },
      { q: 'Y a-t-il des frais sur les retraits ?', a: "Des frais opérateurs peuvent s'appliquer selon votre opérateur Mobile Money. Diki-Diki Vision n'applique pas de frais supplémentaires sur les retraits." },
    ],
  },
  {
    cat: '🔒 Compte & Sécurité',
    items: [
      { q: 'Comment réinitialiser mon mot de passe ?', a: "Sur la page de connexion, cliquez sur « Mot de passe oublié ». Un lien de réinitialisation vous sera envoyé par email." },
      { q: 'Comment supprimer mon compte ?', a: "Allez dans Paramètres → Mon compte → Supprimer mon compte. Cette action est irréversible et entraîne la suppression de toutes vos données dans un délai de 30 jours." },
      { q: 'Mon compte a été suspendu, que faire ?', a: "Contactez notre équipe à support@dikidiki.com en précisant votre nom d'utilisateur et la raison supposée de la suspension. Nous étudions chaque cas sous 48 h." },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={s.item}>
      <button style={s.q} onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span style={{ color: OR, fontSize: 18, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none', display: 'inline-block' }}>+</span>
      </button>
      {open && (
        <div style={s.a}>
          {a.split('\n').map((line, i) => (
            <span key={i}>{line}{i < a.split('\n').length - 1 && <br />}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div style={s.page}>
      <header style={s.header}>
        <Link href="/home" style={s.logo}><LogoDikiDiki width={200} /></Link>
        <Link href="/home" style={s.back}>← Retour</Link>
      </header>

      <div style={s.hero}>
        <div style={s.badge}>Aide</div>
        <h1 style={s.h1}>Questions Fréquentes</h1>
        <p style={s.sub}>Tout ce que vous devez savoir sur Diki-Diki.</p>
      </div>

      <div style={s.divider} />

      <div style={s.body}>
        {faqs.map(({ cat, items }) => (
          <div key={cat}>
            <p style={s.catTitle}>{cat}</p>
            {items.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
          </div>
        ))}

        <div style={s.contact}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: '#ffffff', margin: '0 0 8px', textAlign: 'center' as const, width: '100%' }}>Vous n'avez pas trouvé votre réponse ?</p>
          <p style={{ color: 'rgb(255, 255, 255)', fontSize: 14, margin: '0 0 4px', textAlign: 'center' as const, width: '100%' }}>Notre équipe vous répond sous 24 h</p>
          <a href="mailto:support@dikidiki.com" style={s.ctaBtn}>📧 Contacter le support</a>
        </div>
      </div>
    </div>
  );
}
