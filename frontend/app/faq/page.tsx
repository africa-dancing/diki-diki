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
  hero:    { padding: '48px 24px 32px', maxWidth: 760, margin: '0 auto' },
  badge:   { display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, marginBottom: 16, textTransform: 'uppercase' as const },
  h1:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color: '#fa0404', margin: '0 0 8px', lineHeight: 1.2 },
  // ? Couleur neutre � �tait rgb(251, 218, 3)
  sub:     { color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 0 },
  divider: { height: 1, background: 'rgba(10, 7, 0, 0.15)', margin: '32px 0' },
  body:    { maxWidth: 760, margin: '0 auto', padding: '0 24px' },
  catTitle:{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: OR, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 12, marginTop: 32 },
  item:    { borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' },
  q:       { width: '100%', background: 'none', border: 'none', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, textAlign: 'left' as const, padding: '16px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  a:       { fontSize: 14, lineHeight: 1.8, color: 'rgba(232,224,208,0.8)', padding: '0 0 16px' },
  contact: { background: 'rgba(255,170,0,0.06)', border: '1px solid rgba(255,170,0,0.15)', borderRadius: 12, padding: '24px', marginTop: 48, textAlign: 'center' as const },
  ctaBtn:  { display: 'inline-block', marginTop: 12, background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 8, textDecoration: 'none' },
};

const faqs = [
  // ? NOUVEAU � La plateforme
  {
    cat: '?? Diki-Diki Vision � La plateforme',
    items: [
      {
        q: "C'est quoi Diki-Diki Vision ?",
        a: `Diki-Diki Vision est une plateforme panafricaine d'�ducation, du savoir, de loisir et de divertissement.\n\nElle offre un �cosyst�me riche en d�couverte du savoir et permet � la fois � ses utilisateurs de s'affronter dans des jeux de comp�titions en ligne et de gagner de l'argent gr�ce aux votes du public � danse, chant, musique, com�die, po�sie, conte, etc.\n\n?? Ouverte � toute l'Afrique, � toute la diaspora internationale et au reste du monde.`,
      },
      {
        q: "Quels sont les avantages d'�tre sur Diki-Diki Vision ?",
        a: `Pour les artistes :\n� Visibilit� aupr�s d'une audience africaine et internationale\n� Comp�tition �quitable � c'est le public qui vote\n� Gains r�els � le champion remporte 50 % de la cagnotte\n� R�mun�ration sur le contenu �ducatif publi�\n� Appartenir � une communaut� de talents africains en pleine croissance\n\nPour le public :\n� D�couverte de talents que vous n'auriez jamais rencontr�s ailleurs\n� Soutien direct � vos votes vont dans la cagnotte de votre artiste favori\n� Acc�s gratuit � regarder, commenter et partager est enti�rement gratuit, sans inscription`,
      },
    ],
  },

  // ? NOUVEAU � Comprendre le Bracket
  {
    cat: '?? Comprendre le Bracket',
    items: [
      {
        q: "C'est quoi un � bracket � ?",
        a: `Un bracket est un tableau de comp�tition par �limination directe, inspir� des tournois sportifs. Les candidats s'affrontent en duels : le gagnant passe au tour suivant, le perdant est �limin�. Sur Diki-Diki Vision, c'est le public qui vote pour d�signer le gagnant de chaque duel.\n\nStructure d'un bracket :\n� Huiti�me de finale � 16 candidats, 8 duels � 10 jours\n� Quart de finale � 8 candidats, 4 duels � 10 jours\n� Demi-finale � 4 candidats, 2 duels � 10 jours\n� Finale � 2 candidats, 1 duel � 10 jours\n� Champion � remporte 50 % de la cagnotte totale accumul�e`,
      },
      {
        q: "Bracket � Libre / Duel � vs � R�pertoire / Groupe � � quelle diff�rence ?",
        a: `Libre � chaque candidat choisit librement son adversaire et lui envoie une invitation � comp�tir sur le Podium Ar�na Challenge sur un morceau ou une s�quence d'un morceau. L'autre candidat accepte ou d�cline l'invitation. Ils se fixes un d�lai en commun accord pour d�poser leur enregistrement et apr�s validation la comp�tition est lanc�e.\n\nR�pertoire Groupe� tous les candidats font leur choix respectifs et tombent chacun dans un pool; une fois les pools form�s la comp�tition d�marre par les �liminations appel�es Huiti�me de finale puis le Quart de finale, la Demi-finaleet enfin la Finale. Les disciplines sont les suivantes: Le chant par l'nterpr�tation; la danse; la corh�graphie sur le m�me morceau impos� pour tous. Cela permet une comparaison �quitable sur la m�me base artistique et met en valeur l'interpr�tation personnelle de chaque artiste.`,
      },
    ],
  },

  // Sections existantes inchang�es
  {
    cat: '?? Participation',
    items: [
      { q: 'Comment participer � un concours ?', a: "Cr�ez un compte, choisissez le morceau (track) auquel vous souhaitez participer; soumettez une vid�o de votre prestation sur le morceau ou la s�quence depuis la page Challenges. Une fois 16 candidats inscrits, le bracket ou encore la comp�titiond�marre automatiquement." },
      { q: 'Quel type de vid�o puis-je soumettre ?', a: "Toute performance artistique : danse, chant, musique, slam, com�die... La vid�o doit �tre originale, vous appartenir, et respecter les r�gles de la communaut� (pas de contenu violent ou offensant)." },
      { q: "Combien co�te l'inscription � une comp�tition (un bracket) ?", a: "L'inscription est 100% gratuite pour tout candidat. Seul le public paie pour voter (1 vote = 10 F CFA)." },
      { q: 'Puis-je participer � plusieurs concours en m�me temps ?', a: "Oui, vous pouvez vous inscrire � plusieurs brackets simultan�ment, � condition de respecter les r�gles de chaque concours." },
    ],
  },
  {
    cat: '??? Votes & Cagnotte',
    items: [
      { q: 'Comment fonctionne le vote ?', a: "1 vote = 1 unit� = 10 F CFA. Vous choisissez le candidat que vous souhaitez soutenir dans un duel actif, et le montant est d�bit� de votre portefeuille ou pay� directement." },
      { q: "La cagnotte, c'est quoi exactement ?", a: "La cagnotte est l'ensemble des votes accumul�s sur tous les tours d'un bracket. Le champion final remporte 50 % de la cagnotte totale, apr�s d�duction de la commission Diki-Diki Vision." },
      { q: "Que se passe-t-il en cas d'�galit� ?", a: "En cas d'�galit� � la fin d'un duel, une prolongation automatique de 5 jours est accord�e. Si l'�galit� persiste, le jury Diki-Diki tranche." },
      { q: 'Puis-je voter plusieurs fois pour le m�me candidat ?', a: "Oui, vous pouvez voter autant de fois que vous le souhaitez pour un candidat, tant que le duel est actif." },
    ],
  },
  {
    cat: '?? Paiement & Retrait',
    items: [
      { q: 'Comment retirer mes gains ?', a: "Allez dans Portefeuille ? Retrait, saisissez le montant souhait� et votre num�ro Mobile Money. Le virement est trait� sous 72 heures ouvrables." },
      { q: 'Quels moyens de paiement sont accept�s ?', a: "Diki-Diki Vision accepte les paiements via Mobile Money (MTN, Moov, Wave) et carte bancaire, trait�s par notre partenaire FedaPay." },
      { q: 'Mon paiement a �chou�, que faire ?', a: "V�rifiez votre solde Mobile Money ou les informations de votre carte. Si le probl�me persiste, contactez-nous � support@dikidiki.com avec votre num�ro de transaction." },
      { q: 'Y a-t-il des frais sur les retraits ?', a: "Des frais op�rateurs peuvent s'appliquer selon votre op�rateur Mobile Money. Diki-Diki Vision n'applique pas de frais suppl�mentaires sur les retraits." },
    ],
  },
  {
    cat: '?? Compte & S�curit�',
    items: [
      { q: 'Comment r�initialiser mon mot de passe ?', a: "Sur la page de connexion, cliquez sur 'Mot de passe oubli�'. Un lien de r�initialisation vous sera envoy� par email." },
      { q: 'Comment supprimer mon compte ?', a: "Allez dans Param�tres ? Mon compte ? Supprimer mon compte. Cette action est irr�versible et entra�ne la suppression de toutes vos donn�es dans un d�lai de 30 jours." },
      { q: 'Mon compte a �t� suspendu, que faire ?', a: "Contactez notre �quipe � support@dikidiki.com en pr�cisant votre nom d'utilisateur et la raison suppos�e de la suspension. Nous �tudions chaque cas sous 48h." },
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
        <Link href="/home" style={s.back}>? Retour</Link>
      </header>

      <div style={s.hero}>
        <div style={s.badge}>Aide</div>
        <h1 style={s.h1}>Questions Fr�quentes</h1>
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
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: '#fff', margin: '0 0 8px' }}>Vous n'avez pas trouv� votre r�ponse ?</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 4px' }}>Notre �quipe vous r�pond sous 24h</p>
          <a href="mailto:support@dikidiki.com" style={s.ctaBtn}>?? Contacter le support</a>
        </div>
      </div>
    </div>
  );
}


