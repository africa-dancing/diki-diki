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
  contact: { background: 'linear-gradient(135deg, rgba(126, 3, 128, 0.52), rgba(237,7,15))', border: '1px solid rgb(10, 0, 0)', borderRadius: 12, padding: '24px', marginTop: 48, textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' },
  ctaBtn:  { display: 'block', width: 'fit-content', marginTop: 12, marginLeft: 'auto', marginRight: 'auto', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 8, textDecoration: 'none' },
};

const faqs = [
  {
    cat: '🌍 Diki-Diki — La plateforme',
    items: [
      {
        q: "C'est quoi Diki-Diki ?",
        a: `Diki-Diki est une plateforme panafricaine de compétitions artistiques avec votes monétisés en temps réel.\n\nLes artistes soumettent leurs vidéos de prestation et s'affrontent dans des challenges par élimination. Le public vote en envoyant des étoiles ★ ou des cœurs ❤️, et la cagnotte est distribuée au podium à la fin du challenge.\n\nDisciplines : danse, chant, instrument, acapella, humour, poésie, conte, théâtre.\n\n🌍 Ouverte à toute l'Afrique, à toute la diaspora internationale et au reste du monde.`,
      },
      {
        q: "Quels sont les avantages d'être sur Diki-Diki ?",
        a: `Pour les artistes :\n• Visibilité auprès d'une audience africaine et internationale\n• Compétition équitable — c'est le public qui vote\n• Gains réels — le podium se partage la cagnotte (60 % champion, 25 % 2e, 15 % 3e)\n• Compte créé automatiquement — voter ne nécessite qu'un numéro de téléphone\n• Appartenir à une communauté de talents africains en pleine croissance\n\nPour le public :\n• Découverte de talents que vous n'auriez jamais rencontrés ailleurs\n• Soutien direct — vos votes alimentent la cagnotte de vos artistes favoris\n• Accès gratuit — regarder, commenter et partager est entièrement gratuit`,
      },
    ],
  },
  {
    cat: '🏆 Comprendre le Challenge',
    items: [
      {
        q: "C'est quoi un challenge Diki-Diki ?",
        a: `Un challenge est une compétition par élimination où les candidats s'affrontent devant le public. À chaque étape, les candidats les mieux votés passent au tour suivant. Le public vote en envoyant des étoiles ★ (100 F CFA) ou des cœurs ❤️ (200 F CFA).\n\n5 types de challenges selon le nombre de candidats :\n• C2 — 2 candidats, 1 étape (Finale directe)\n• C4 — 4 candidats, 2 étapes (Demi + Finale)\n• C8 — 8 candidats, 3 étapes (Quart + Demi + Finale)\n• C12 — 12 candidats, 4 étapes (+ 3e place automatique)\n• C16 — 16 candidats, 5 étapes (+ Match bronze inédit pour la 3e place)\n\nChaque étape se clôture quand l'objectif de cagnotte est atteint.`,
      },
      {
        q: "Comment les gagnants sont-ils désignés ?",
        a: `À chaque étape, les candidats sont classés par score (votes reçus). Les mieux classés passent au tour suivant, les autres sont éliminés.\n\nEn cas d'égalité à la place limite, l'étape se prolonge naturellement jusqu'à ce qu'un vote départage les candidats.\n\nEn C16, les 2 candidats éliminés en demi-finale s'affrontent dans un match bronze pour la 3e place avant la grande finale.`,
      },
      {
        q: "Qui peut créer un challenge ?",
        a: `Tout utilisateur vérifié ayant rechargé au minimum 1 000 F CFA sur sa vie de compte et disposant d'au moins une vidéo approuvée peut créer un challenge.\n\nLe créateur est automatiquement inscrit comme 1er candidat. Le challenge démarre quand tous les candidats sont inscrits.`,
      },
    ],
  },
  {
    cat: '🎤 Participation',
    items: [
      { q: 'Comment participer à un challenge ?', a: "Soumettez une vidéo de votre prestation depuis la page Ajouter. Choisissez votre type de challenge (C2 à C16). Une fois votre vidéo approuvée, rejoignez un challenge existant ou créez le vôtre. Le challenge démarre quand tous les candidats sont inscrits." },
      { q: 'Quel type de vidéo puis-je soumettre ?', a: "Toute performance artistique originale : danse, chant, instrument, humour, poésie... Format MP4 ou MOV, maximum 500 MB et 10 minutes. La vidéo doit vous appartenir et respecter les règles de la communauté." },
      { q: "Combien coûte l'inscription à un challenge ?", a: "L'inscription est 100 % gratuite pour tout candidat. Seul le public paie pour voter." },
      { q: 'Puis-je participer à plusieurs challenges en même temps ?', a: "Oui, vous pouvez vous inscrire à plusieurs challenges simultanément, à condition de disposer d'une vidéo approuvée pour chacun." },
      { q: 'Puis-je changer ma vidéo entre deux étapes ?', a: "Oui ! Le modèle une vidéo par étape vous permet de soumettre une nouvelle vidéo avant le début de chaque nouvelle étape. Allez dans Mes vidéos → Soumettre pour cette étape." },
    ],
  },
  {
    cat: '🗳️ Votes & Cagnotte',
    items: [
      { q: 'Comment fonctionne le vote ?', a: "Deux types de votes :\n• ★ Étoile = 1 unité = 100 F CFA (poids +1 dans le classement)\n• ❤️ Cœur = 2 unités = 200 F CFA (poids +2 dans le classement)\n\nTous les montants votés alimentent directement la cagnotte du challenge après déduction de la commission plateforme (50 %)." },
      { q: "La cagnotte, c'est quoi exactement ?", a: "La cagnotte est l'ensemble des votes accumulés sur toutes les étapes d'un challenge. À la fin :\n• C2/C4 : 100 % au champion\n• C8 : 65 % champion, 35 % 2e\n• C12/C16 : 60 % champion, 25 % 2e, 15 % 3e\n\nCes pourcentages sont appliqués sur le montant net après commission plateforme (50 %)." },
      { q: "Qu'est-ce que le Soutenir ?", a: "Hors période de vote active (entre deux étapes ou pour une vidéo sans challenge), vous pouvez Soutenir un artiste pour 10 F CFA. 50 % vont directement à l'artiste, 50 % à la plateforme." },
      { q: 'Puis-je voter plusieurs fois pour le même candidat ?', a: "Oui, vous pouvez envoyer autant d'étoiles ou de cœurs que vous souhaitez, tant que l'étape est active et que votre solde le permet." },
      { q: "Que se passe-t-il en cas d'égalité ?", a: "L'étape se prolonge naturellement jusqu'à ce qu'un vote départage les candidats à égalité. Les votes continuent d'être acceptés normalement." },
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
          <a href="mailto:support@dikidiki.com" style={s.ctaBtn}>📧 Contacter le support</a>
        </div>
      </div>
    </div>
  );
}
