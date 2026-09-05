'use client';
import LogoDikiDiki from '../components/LogoDikiDiki';
import Navbar from '../components/Navbar';/*DKDK_FAQ_NAVBAR_IMPORT*/
import TranslateWidget from '../components/TranslateWidget';
import { useState } from 'react';
import Link from 'next/link';

const OR = '#FFAA00';
const OR2 = '#FF6B00';
const BG = '#0a0a0f';

const s: Record<string, React.CSSProperties> = {
  page:    { background: BG, minHeight: '100vh', color: '#e8e0d0', fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' },/*DKDK_FAQ_PADTOP*/
  header:  { borderBottom: `1px solid rgb(249, 246, 246)`, padding: '20px 12px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:    { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: OR, textDecoration: 'none', letterSpacing: 1 },
  back:    { color: 'rgb(26, 255, 0)', fontSize: 13, textDecoration: 'none' },
  hero:    { padding: '40px 24px 36px', background: 'radial-gradient(ellipse 55% 42px at 50% 16px,hsl(339, 98%, 49%) 0%,transparent 72%)', textAlign: 'center' as const },/*DKDK_FAQ_HALO*/
  badge:   { display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, marginBottom: 16, textTransform: 'uppercase' as const },
  h1:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color: '#fa0404', margin: '0 0 8px', lineHeight: 1.2, textTransform: 'uppercase' as const, textAlign: 'center' as const },
  sub:     { color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 0, textAlign: 'center' as const },
  divider: { height: 1, background: 'rgba(10, 7, 0, 0.15)', margin: '32px 0' },
  body:    { maxWidth: 760, margin: '0 auto', padding: '0 24px' },
  catTitle:{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: OR, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 12, marginTop: 32 },
  item:    { borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' },
  q:       { width: '100%', background: 'none', border: 'none', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, textAlign: 'left' as const, padding: '16px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  a:       { fontSize: 14, lineHeight: 1.8, color: 'rgba(232,224,208,0.8)', padding: '0 0 16px' },
  contact: { background: 'linear-gradient(135deg, rgba(126, 3, 128, 0.52), rgba(237,7,15))', border: '1px solid rgb(10, 0, 0)', borderRadius: 12, padding: '24px', marginTop: 48, textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' },
  ctaBtn:  { display: 'block', width: 'fit-content', marginTop: 12, marginLeft: 'auto', marginRight: 'auto', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 8, textDecoration: 'none' },
};

const faqs = [
  {
    cat: '🌍 Diki-Diki — La plateforme',
    items: [
      {
        q: "C'est quoi Diki-Diki ?",
        a: `Diki-Diki est la scène des talents africains : une plateforme panafricaine de challenges artistiques et sportifs, où c'est le public qui départage les candidats — par des votes payants.\n\nLes candidats soumettent des vidéos de leur prestation et s'affrontent dans un challenge. Le public les soutient en envoyant des étoiles ★ ou des cœurs ❤️. Ces votes forment une cagnotte commune, partagée à la fin entre les gagnants ; les candidats éliminés reçoivent une prime de participation.\n\nLe vote payant est à la fois le jury (seul le public tranche, jamais une note technique) et le moteur : c'est lui qui constitue le prix à gagner.\n\nDisciplines : danse, chant, instrument, humour, poésie, conte, théâtre… et disciplines sportives. 🌍 Ouverte à toute l'Afrique et à la diaspora.`,
      },
      {
        q: "Qui peut utiliser Diki-Diki ?",
        a: `Trois profils, non figés — on passe volontiers de l'un à l'autre :\n\n• Le visiteur regarde les vidéos, librement et gratuitement.\n• Le candidat s'inscrit, téléverse au moins une vidéo et concourt ; il dispose d'un compte pour recevoir ses gains.\n• Le votant soutient les candidats par des votes payants — c'est de lui que dépend tout : il départage les candidats et constitue la cagnotte.\n\nRegarder, commenter et partager est entièrement gratuit. Seul le vote est payant.`,
      },
      {
        q: "Quels sont les avantages d'être sur Diki-Diki ?",
        a: `Pour les candidats :\n• Une scène monétisée et équitable — c'est le public qui vote, pas un jury technique.\n• Des gains réels : le podium se partage la cagnotte, et même les éliminés reçoivent une prime de participation.\n• Inscription 100 % gratuite, et une visibilité auprès d'une audience africaine et internationale.\n\nPour le public :\n• Découvrir des talents et les soutenir directement — vos votes alimentent leur cagnotte.\n• Un accès libre et gratuit pour regarder, commenter et partager.`,
      },
    ],
  },
  {
    cat: '🏆 Comprendre le Challenge',
    items: [
      {
        q: "C'est quoi un challenge ?",
        a: `Un challenge est une compétition entre candidats sur une même discipline. Le public vote en envoyant des étoiles ★ (100 F CFA, poids 1) ou des cœurs ❤️ (200 F CFA, poids 2), ce qui fait monter le score des candidats.\n\nChaque étape se ferme lorsqu'elle atteint son objectif de cagnotte (défini par le format). À la fin, les gagnants se partagent la cagnotte et les éliminés reçoivent une prime.`,
      },
      {
        q: "Quels sont les formats de challenge ?",
        a: `Il existe 6 formats, selon le nombre de candidats. Chaque format fixe le nombre d'étapes, de gagnants et d'éliminés :\n\n• C2 — 2 candidats · 1 étape · 1 gagnant · 1 éliminé\n• C4 — 4 candidats · 2 étapes · 2 gagnants · 2 éliminés\n• C6 — 6 candidats · 3 étapes · 3 gagnants · 3 éliminés\n• C8 — 8 candidats · 4 étapes · 3 gagnants · 5 éliminés\n• C12 — 12 candidats · 4 étapes · 3 gagnants · 9 éliminés\n• C16 — 16 candidats · 4 étapes · 3 gagnants · 13 éliminés\n\nLe total « gagnants + éliminés » est toujours égal au nombre de candidats.`,
      },
      {
        q: "Parcours ou Bloc groupé : quelle différence ?",
        a: `Un challenge suit l'un de deux modèles :\n\n• Parcours (élimination progressive) — étape par étape : à chaque étape le candidat fournit une vidéo, le public vote, et les moins votés sont éliminés. On recommence jusqu'au podium final.\n\n• Bloc groupé (classement final) — le candidat fournit toutes ses vidéos d'emblée ; il n'y a qu'un seul décompte à la fin, un seul classement.`,
      },
      {
        q: "Comment les gagnants et les éliminés sont-ils désignés ?",
        a: `Uniquement par les votes du public. À chaque étape, les candidats sont classés par score ; les mieux classés continuent, les moins votés sont éliminés. Les scores repartent de zéro à chaque nouvelle étape.\n\nEn cas d'égalité à une place décisive, un court délai supplémentaire laisse les votes départager. Si l'égalité persiste, un classement de départage s'applique : le plus d'étoiles, puis le plus de cœurs, puis l'ordre d'inscription.`,
      },
      {
        q: "Qui peut créer un challenge ?",
        a: `Pour créer ou rejoindre un challenge, il faut :\n• être majeur (18 ans et plus) ;\n• avoir un compte vérifié à votre nom réel (nécessaire pour être payé) ;\n• disposer d'au moins une vidéo approuvée dont vous êtes l'auteur ;\n• accepter le règlement du concours.\n\nLe créateur devient le 1er candidat, et le challenge démarre automatiquement dès que le nombre de candidats du format est atteint.`,
      },
    ],
  },
  {
    cat: '🎤 Participation',
    items: [
      { q: 'Comment participer à un challenge ?', a: "Soumettez une vidéo de votre prestation, choisissez la discipline et le format (C2 à C16). Une fois la vidéo approuvée, créez un challenge ou rejoignez-en un. Il démarre quand tous les candidats sont inscrits." },
      { q: 'Quel type de vidéo puis-je soumettre ?', a: "Toute prestation artistique ou sportive originale qui vous appartient : danse, chant, instrument, humour, poésie… au format vidéo standard (MP4 ou MOV), dans le respect des règles de la communauté." },
      { q: "Combien coûte l'inscription à un challenge ?", a: "L'inscription est 100 % gratuite pour les candidats. Seul le public paie, en votant." },
      { q: 'Puis-je participer à plusieurs challenges en même temps ?', a: "Oui, vous pouvez rejoindre plusieurs challenges. Chaque challenge est prévu pour sa propre vidéo ; réutiliser une même vidéo dans un autre challenge reste possible mais est encadré par la plateforme (des frais d'inscription, fixés par l'administration, peuvent s'appliquer)." },
      { q: 'Puis-je changer ma vidéo entre deux étapes ?', a: "Oui — c'est le principe du modèle Parcours : vous soumettez une nouvelle vidéo avant chaque nouvelle étape, depuis Mes vidéos, et vos scores repartent de zéro à chaque étape.\n\nEn modèle Bloc groupé, à l'inverse, vous fournissez toutes vos vidéos dès le départ, pour un seul classement final." },
    ],
  },
  {
    cat: '🗳️ Votes & Cagnotte',
    items: [
      { q: 'Comment fonctionne le vote ?', a: "Deux façons de soutenir :\n• ★ Étoile = 100 F CFA (poids +1 au classement)\n• ❤️ Cœur = 200 F CFA (poids +2 au classement)\n\nVous pouvez voter par paliers (100, 200, 500, 1 000 F) ou saisir une quantité libre. Chaque vote fait monter le score du candidat et alimente la cagnotte du challenge." },
      { q: "Comment la cagnotte est-elle partagée ?", a: "La cagnotte, c'est l'ensemble des votes d'un challenge. La plateforme prélève une commission (50 %) ; le reste — le net — revient au podium, selon le format :\n\n• C2 (1 gagnant) : 100 %\n• C4 (2 gagnants) : 65 % / 35 %\n• C6, C8, C12, C16 (3 gagnants) : 60 % / 25 % / 15 %\n\nRègle intangible : on ne distribue jamais plus que ce qui a été collecté." },
      { q: "Que gagne un candidat éliminé ?", a: "Toute participation est récompensée : chaque éliminé reçoit une prime de participation, égale à 20 % de ce que ses propres votes ont rapporté. Ces primes sont financées par la commission de la plateforme, pas par la part du podium." },
      { q: "L'objectif d'une étape, est-ce mon gain ?", a: "Non — c'est une confusion fréquente. L'objectif d'une étape est le montant à collecter pour qu'elle se ferme, pas un gain de candidat. Votre gain réel dépend de la cagnotte réellement collectée, moins la commission, partagée selon le podium." },
      { q: "Qu'est-ce que « Soutenir » un artiste ?", a: "En dehors des périodes de vote d'un challenge (entre deux étapes, ou pour une vidéo hors challenge), vous pouvez Soutenir directement un artiste. Le montant est fixé par la plateforme et affiché au moment de soutenir ; une part revient directement à l'artiste soutenu." },
      { q: 'Puis-je voter plusieurs fois pour le même candidat ?', a: "Oui, autant d'étoiles ou de cœurs que vous le souhaitez, tant que l'étape est active et que votre solde le permet." },
    ],
  },
  {
    cat: '💳 Paiement & Retrait',
    items: [
      { q: 'Comment retirer mes gains ?', a: "Allez dans votre Compte → Retrait, saisissez le montant, choisissez votre pays et votre opérateur Mobile Money, puis votre numéro de réception. Le virement est en général reçu en quelques minutes.\n\nSeuls les gains (podium ou prime de participation) sont retirables. L'argent chargé pour voter, lui, ne se retire pas." },
      { q: 'Dans quels pays puis-je retirer mes gains ?', a: "Le retrait Mobile Money s'ouvre progressivement à travers l'Afrique :\n\n✅ Disponible : 🇧🇯 Bénin\n\n🔓 En cours d'ouverture (Afrique de l'Ouest francophone) : 🇨🇮 Côte d'Ivoire, 🇸🇳 Sénégal, 🇹🇬 Togo, 🇧🇫 Burkina Faso, 🇳🇪 Niger\n\n🌍 Bientôt (reste de l'Afrique) : Ghana, Nigeria, Kenya, Tanzanie, Ouganda, Rwanda, Cameroun, RD Congo, Gabon, Congo-Brazzaville, Zambie, Malawi, Mozambique, Éthiopie, Sierra Leone, Lesotho\n\n💳 À venir : Afrique du Nord et australe (paiement par carte)\n\nSi ton pays n'est pas encore ouvert, tes gains restent en sécurité sur ton Compte de Retrait en attendant." },
      { q: 'Quels moyens de paiement sont acceptés ?', a: "Le Mobile Money, selon ton pays : MTN, Moov, Orange, Wave, Celtiis… traités par notre partenaire FedaPay (et bientôt PawaPay pour élargir la couverture à toute l'Afrique)." },
      { q: 'Y a-t-il des frais sur les retraits ?', a: "Oui : des frais fixes de 150 F CFA par retrait s'appliquent. Ce sont les frais de notre partenaire de paiement, répercutés à l'identique — Diki-Diki ne prend aucune marge dessus. Ils sont affichés clairement dans le récapitulatif avant de confirmer (« Vous recevrez : montant − 150 F »)." },
      { q: 'Mon retrait a échoué, que faire ?', a: "Pas d'inquiétude : en cas d'échec, tes gains restent disponibles sur ton Compte de Retrait — rien n'est perdu. Réessaie un peu plus tard, et si le problème persiste, contacte-nous via la page Contact → raccourci « Retrait & paiement »." },
    ],
  },
  {
    cat: '🔒 Compte & Sécurité',
    items: [
      { q: 'Comment réinitialiser mon mot de passe ?', a: "Sur la page de connexion, cliquez sur « Mot de passe oublié ». Un lien de réinitialisation vous sera envoyé." },
      { q: 'Comment supprimer mon compte ?', a: "Allez dans Paramètres → Mon compte → Supprimer mon compte. L'action est irréversible ; vos données sont supprimées dans un délai de 30 jours." },
      { q: 'Mon compte a été suspendu, que faire ?', a: "Contactez-nous via la page Contact en précisant votre nom d'utilisateur et la raison supposée. Nous étudions chaque cas sous 48 h." },
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
      <Navbar />{/*DKDK_FAQ_NAVBAR_USE*/}
      {/*DKDK_FAQ_HERO*/}

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
          <a href="/contact" style={s.ctaBtn}>📧 Contacter le support</a>
        </div>
      </div>
    </div>
  );
}
