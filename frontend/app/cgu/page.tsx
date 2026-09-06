'use client';
import Navbar from '../components/Navbar';

const OR = '#FFAA00';
const OR2 = '#FF6B00';
const BG = '#0a0a0f';

const MAJ = '5 septembre 2026';

const s: Record<string, React.CSSProperties> = {
  page:    { background: BG, minHeight: '100vh', color: '#e8e0d0', fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' },
  hero:    { padding: '40px 24px 28px', background: 'radial-gradient(ellipse 55% 42px at 50% 16px,hsl(339, 98%, 49%) 0%,transparent 72%)', textAlign: 'center' as const },
  badge:   { display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: '#0a0a0f', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, marginBottom: 16, textTransform: 'uppercase' as const },
  h1:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 30, color: '#fa0404', margin: '0 0 8px', lineHeight: 1.2, textTransform: 'uppercase' as const },
  sub:     { color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 },
  maj:     { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 10 },
  divider: { height: 1, background: 'rgba(255,255,255,0.10)', margin: '28px 0' },
  body:    { maxWidth: 780, margin: '0 auto', padding: '0 24px' },

  toc:     { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 22px', marginBottom: 12 },
  tocTit:  { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: OR, letterSpacing: 2, textTransform: 'uppercase' as const, margin: '0 0 12px' },
  tocLink: { display: 'block', color: '#e8e0d0', textDecoration: 'none', fontSize: 15, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },

  note:    { background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.35)', borderRadius: 10, padding: '14px 18px', margin: '18px 0', fontSize: 13.5, lineHeight: 1.7, color: 'rgba(232,224,208,0.92)' },

  docTit:  { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: '#fff', textTransform: 'uppercase' as const, letterSpacing: 0.5, margin: '48px 0 4px', scrollMarginTop: 20 },
  docSub:  { color: 'rgba(255,255,255,0.45)', fontSize: 13.5, margin: '0 0 8px' },
  artH:    { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15.5, color: OR, margin: '26px 0 8px' },
  para:    { fontSize: 14, lineHeight: 1.85, color: 'rgba(232,224,208,0.82)', margin: '0 0 10px' },
  ph:      { background: 'rgba(237,7,15,0.18)', border: '1px dashed rgba(237,7,15,0.6)', borderRadius: 4, padding: '1px 6px', color: '#ffd7d7', fontSize: 13 },

  toTop:   { display: 'inline-block', color: 'rgb(26,255,0)', fontSize: 12, textDecoration: 'none', marginTop: 14 },
  footer:  { maxWidth: 780, margin: '40px auto 0', padding: '0 24px', color: 'rgba(255,255,255,0.35)', fontSize: 12.5, lineHeight: 1.7, textAlign: 'center' as const },
  print:   { background: 'none', border: '1px solid rgba(255,255,255,0.25)', color: '#e8e0d0', fontSize: 12.5, padding: '7px 16px', borderRadius: 8, cursor: 'pointer', marginTop: 14, fontFamily: "'DM Sans', sans-serif" },
};

// ── Rendu d'un paragraphe : surligne les 〔placeholders à compléter〕 ───────────
function renderLine(text: string, key: number) {
  const parts = text.split(/(〔[^〕]*〕)/g);
  return (
    <span key={key}>
      {parts.map((p, i) =>
        p.startsWith('〔') && p.endsWith('〕')
          ? <span key={i} style={s.ph}>{p}</span>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}
function Body({ text }: { text: string }) {
  const paras = text.split('\n\n');
  return (
    <>
      {paras.map((para, pi) => (
        <p key={pi} style={s.para}>
          {para.split('\n').map((line, li, arr) => (
            <span key={li}>{renderLine(line, li)}{li < arr.length - 1 && <br />}</span>
          ))}
        </p>
      ))}
    </>
  );
}

type Article = { h?: string; b: string };
type Doc = { id: string; title: string; sub?: string; note?: string; articles: Article[] };

const DOCS: Doc[] = [
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'mentions',
    title: '1 · Mentions légales',
    sub: "Identité de l'éditeur et de l'hébergeur du site",
    articles: [
      { h: "Éditeur de la plateforme", b:
`La plateforme Diki-Diki, accessible à l'adresse www.diki-diki.com (ci-après « la Plateforme »), est éditée par IGEJPS, entreprise individuelle (établissement) immatriculée en République du Bénin, exploitant la marque commerciale « Diki-Diki ».

Registre du Commerce et du Crédit Mobilier (RCCM) : RB/COT/25 A 109871 (Greffe du Tribunal de commerce de Cotonou, 21 mai 2025).
Identifiant Fiscal Unique (IFU) : 0202012131359.
Siège social : Îlot 282, Parcelle M, quartier Ayélawadjè Agongomè, 3ᵉ arrondissement, Cotonou (Littoral), Bénin.
Représentant légal / Directeur de la publication : M. Gnonlonfoun Ifèdé Jean-Pierre Erick.
Adresse électronique de contact : support@diki-diki.com.
Téléphone : +229 01 96 40 28 34.` },
      { h: "Hébergement", b:
`Interface web (frontend) : Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
Serveur applicatif (backend) : Railway Corp. — États-Unis.
Base de données et authentification : Supabase.
Stockage et diffusion des vidéos : Cloudflare, Inc.

Ces prestataires assurent l'hébergement technique de la Plateforme. Leurs coordonnées précises peuvent être obtenues sur demande à support@diki-diki.com.` },
      { h: "Prestataires de paiement", b:
`Les encaissements (recharges, votes) et les décaissements (retraits de gains) sont opérés par des prestataires de services de paiement agréés :
• FedaPay — pour le Bénin et les marchés d'Afrique de l'Ouest francophone couverts ;
• PawaPay — pour les autres marchés africains.

Diki-Diki ne conserve aucune donnée bancaire complète ni code secret (PIN) : ces informations sont saisies et traitées directement par le prestataire de paiement.` },
      { h: "Propriété intellectuelle", b:
`La marque « Diki-Diki », les logos, l'identité visuelle, les textes, l'architecture et le code de la Plateforme sont la propriété exclusive de l'éditeur et sont protégés par le droit de la propriété intellectuelle. Toute reproduction non autorisée est interdite.

Les vidéos et prestations mises en ligne demeurent la propriété de leurs auteurs (les candidats), qui concèdent à la Plateforme une licence de diffusion dans les conditions prévues par les Conditions Générales d'Utilisation.` },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'cgu',
    title: "2 · Conditions Générales d'Utilisation (CGU)",
    sub: "Les règles d'accès et d'usage de la Plateforme",
    articles: [
      { h: "Article 1 — Objet", b:
`Les présentes Conditions Générales d'Utilisation (« CGU ») définissent les modalités d'accès et d'utilisation de la Plateforme Diki-Diki, ainsi que les droits et obligations de l'éditeur et de ses utilisateurs. Toute utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU.` },
      { h: "Article 2 — Définitions", b:
`• Plateforme : le site www.diki-diki.com et ses services.
• Visiteur : toute personne qui consulte la Plateforme sans être inscrite.
• Candidat : utilisateur inscrit qui téléverse une ou plusieurs vidéos afin de concourir.
• Votant : utilisateur qui soutient des candidats au moyen de votes payants.
• Challenge : une compétition entre candidats sur une discipline et un format donnés.
• Étoile ★ / Cœur ❤️ : les deux unités de vote payant (voir le Règlement des challenges).
• Cagnotte : la somme des votes d'un challenge.
• Compte de votes : le solde rechargeable servant à voter ; il n'est pas retirable.
• Compte de retrait : le solde constitué des gains (podium et primes) ; il est retirable.
• Prime de participation : le gain versé à un candidat éliminé.` },
      { h: "Article 3 — Acceptation et modification des CGU", b:
`L'utilisateur reconnaît avoir pris connaissance des présentes CGU et les accepter. L'éditeur peut les modifier à tout moment pour les adapter à l'évolution de la Plateforme ou à la réglementation. La version applicable est celle en vigueur à la date d'utilisation ; la date de dernière mise à jour figure en tête de page. Les modifications substantielles sont portées à la connaissance des utilisateurs.` },
      { h: "Article 4 — Inscription et conditions d'accès", b:
`La consultation des vidéos est libre et gratuite. La création de challenges, la participation et le vote nécessitent la création d'un compte.

L'utilisateur garantit être âgé d'au moins 18 ans et disposer de la pleine capacité juridique. Les services impliquant un paiement ou un versement de gains sont strictement réservés aux personnes majeures.

L'utilisateur s'engage à fournir des informations exactes, notamment son identité réelle, indispensable au versement des gains et à la lutte contre la fraude. Un seul compte est autorisé par personne.` },
      { h: "Article 5 — Compte et sécurité", b:
`L'utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée depuis son compte. Il informe sans délai l'éditeur de toute utilisation non autorisée. L'éditeur ne saurait être tenu responsable des conséquences d'un défaut de vigilance de l'utilisateur sur ses identifiants.` },
      { h: "Article 6 — Contenus des candidats (vidéos)", b:
`En téléversant une vidéo, le candidat garantit :
• en être l'auteur ou détenir tous les droits nécessaires ;
• avoir obtenu l'autorisation des personnes identifiables apparaissant dans la vidéo ;
• que le contenu ne viole aucun droit de tiers ni aucune loi.

Le candidat concède à la Plateforme une licence non exclusive, gratuite, pour la durée de mise en ligne, aux fins d'héberger, diffuser, représenter et promouvoir la vidéo sur la Plateforme et ses canaux de communication. Le candidat conserve la propriété de son œuvre et peut en demander le retrait, sous réserve des challenges en cours.

Sont notamment interdits les contenus illicites, diffamatoires, haineux, discriminatoires, violents, à caractère sexuel, portant atteinte à la dignité des personnes, mettant en scène des mineurs de façon inappropriée, ou contrevenant aux droits de propriété intellectuelle de tiers.` },
      { h: "Article 7 — Modération", b:
`L'éditeur peut, à tout moment et sans préavis, refuser, retirer ou suspendre tout contenu ne respectant pas les présentes CGU, et suspendre ou fermer le compte de l'utilisateur concerné. La modération peut intervenir avant ou après publication. Le jugement des prestations dans un challenge, lui, relève exclusivement des votes du public et non de la modération.` },
      { h: "Article 8 — Votes, comptes d'argent et opérations", b:
`Le vote est payant et constitue à la fois le mode de départage des candidats et le financement des gains. Les modalités détaillées (valeurs des votes, cagnotte, commission, répartition, primes) figurent dans le Règlement des challenges, qui fait partie intégrante des présentes CGU.

La Plateforme distingue deux soldes strictement séparés :
• le Compte de votes, alimenté par les recharges de l'utilisateur et servant exclusivement à voter ou s'inscrire : il n'est pas retirable ;
• le Compte de retrait, constitué des gains (part du podium et primes de participation) : il est retirable dans les conditions du Règlement.

Les votes sont fermes et définitifs : une fois exprimés, ils ne sont pas remboursables, sauf annulation d'un challenge par l'éditeur.` },
      { h: "Article 9 — Intégrité et lutte contre la fraude", b:
`Sont notamment interdits : l'auto-vote, la création de comptes multiples, l'usage de moyens de paiement frauduleux, la manipulation des votes ou des scores, et tout comportement visant à fausser un challenge. En cas de fraude avérée, l'éditeur peut annuler les votes et gains concernés, suspendre ou fermer le compte, retenir les sommes issues de la fraude, et engager toute action utile.` },
      { h: "Article 10 — Responsabilité", b:
`L'éditeur est tenu d'une obligation de moyens quant au fonctionnement de la Plateforme. Il ne garantit pas une disponibilité ininterrompue et ne saurait être tenu responsable des interruptions, dysfonctionnements ou pertes de données imputables à un cas de force majeure, à un prestataire tiers (hébergeur, opérateur Mobile Money, prestataire de paiement) ou à l'utilisateur lui-même. L'éditeur n'est pas responsable des contenus mis en ligne par les candidats.` },
      { h: "Article 11 — Données personnelles", b:
`Le traitement des données personnelles est décrit dans la Politique de confidentialité, qui fait partie intégrante des présentes CGU.` },
      { h: "Article 12 — Suspension, résiliation et suppression du compte", b:
`L'utilisateur peut supprimer son compte à tout moment depuis ses paramètres ; ses données sont supprimées dans les conditions de la Politique de confidentialité, sous réserve des obligations légales de conservation. L'éditeur peut suspendre ou résilier un compte en cas de manquement aux présentes CGU. Un solde de retrait acquis de bonne foi reste dû à l'utilisateur, sous réserve des vérifications anti-fraude.` },
      { h: "Article 13 — Droit applicable et litiges", b:
`Les présentes CGU sont régies par le droit béninois. En cas de litige, les parties rechercheront une solution amiable, notamment via la page Contact. À défaut d'accord, le litige sera porté devant les juridictions compétentes de Cotonou (Bénin), sous réserve des dispositions impératives protégeant le consommateur.` },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'reglement',
    title: '3 · Règlement des challenges',
    sub: "Le fonctionnement des compétitions, des votes et des gains",
    note: "Diki-Diki est une compétition de talents : le classement résulte exclusivement des votes du public, jamais d'un tirage au sort ni du hasard. Ce Règlement décrit la mécanique réellement appliquée par la Plateforme.",
    articles: [
      { h: "Article 1 — Objet et organisateur", b:
`Le présent Règlement régit l'organisation des challenges sur la Plateforme Diki-Diki, éditée par IGEJPS (voir Mentions légales). Il complète les CGU et s'impose à tout candidat et tout votant.` },
      { h: "Article 2 — Nature de la compétition", b:
`Un challenge est une compétition de talents artistiques ou sportifs. Le résultat est déterminé uniquement par le soutien du public exprimé au travers des votes payants. Aucun gain n'est acquis par la voie du sort, par tirage au sort ni par une note technique automatique : le classement, et donc les gains, résultent exclusivement des votes du public. La participation en tant que candidat est gratuite. À ce titre, Diki-Diki n'organise pas un jeu dont le gain serait acquis par le hasard.` },
      { h: "Article 3 — Conditions de participation", b:
`Pour concourir, le candidat doit : être âgé d'au moins 18 ans ; disposer d'un compte vérifié à son identité réelle ; avoir au moins une vidéo approuvée dont il est l'auteur ; et accepter le présent Règlement. La participation en tant que candidat est gratuite ; seuls les votants paient.` },
      { h: "Article 4 — Formats de challenge", b:
`Un format est défini par son nombre de candidats. Il fixe le nombre d'étapes, l'objectif de cagnotte par étape, le nombre de gagnants et d'éliminés :

• C2 — 2 candidats · 1 étape · objectif 2 500 000 F · 1 gagnant · 1 éliminé
• C4 — 4 candidats · 2 étapes · objectif 4 000 000 F · 2 gagnants · 2 éliminés
• C6 — 6 candidats · 3 étapes · objectif 5 000 000 F · 3 gagnants · 3 éliminés
• C8 — 8 candidats · 4 étapes · objectif 7 000 000 F · 3 gagnants · 5 éliminés
• C12 — 12 candidats · 4 étapes · objectif 9 000 000 F · 3 gagnants · 9 éliminés
• C16 — 16 candidats · 4 étapes · objectif 15 000 000 F · 3 gagnants · 13 éliminés

L'« objectif par étape » est le montant à collecter pour qu'une étape se ferme ; ce n'est pas le gain d'un candidat. Ces valeurs sont paramétrables par l'administrateur et le total « gagnants + éliminés » est toujours égal au nombre de candidats.` },
      { h: "Article 5 — Modèles : Parcours et Bloc groupé", b:
`• Parcours (élimination progressive) : le challenge se déroule en plusieurs étapes ; à chaque étape le candidat fournit une vidéo, le public vote, et les moins votés sont éliminés jusqu'au podium final. Les scores repartent de zéro à chaque étape.
• Bloc groupé (classement final) : le candidat fournit toutes ses vidéos d'emblée ; un seul décompte final établit le classement.` },
      { h: "Article 6 — Le vote", b:
`Le public soutient les candidats par deux unités de vote payant :
• Étoile ★ = 100 F CFA, poids 1 au classement ;
• Cœur ❤️ = 200 F CFA, poids 2 au classement.

Le vote peut se faire par paliers (100, 200, 500, 1 000 F) ou par saisie libre. Chaque vote débite le Compte de votes, augmente le score du candidat, et alimente la cagnotte du challenge. Les votes sont fermes, définitifs et non remboursables, sauf annulation du challenge par l'éditeur.` },
      { h: "Article 7 — Cagnotte, commission et net", b:
`La cagnotte d'un challenge est la somme de tous ses votes. La Plateforme prélève sur cette cagnotte une commission (actuellement 50 %, paramétrable par l'administrateur). Le solde après commission constitue le « net », destiné à être partagé entre les gagnants.` },
      { h: "Article 8 — Fermeture d'une étape et départage", b:
`Une étape se ferme dès que le montant collecté atteint son objectif ; le résultat est alors figé. En cas d'égalité de score à une place décisive, un délai supplémentaire laisse les votes départager les candidats ; si l'égalité persiste, un classement de départage s'applique (le plus d'étoiles, puis de cœurs, puis l'ordre d'inscription). Un même challenge ne peut donner lieu qu'à une seule distribution de cagnotte (verrou anti-double-versement).` },
      { h: "Article 9 — Répartition du podium", b:
`Le net est partagé entre les gagnants selon leur nombre :
• 1 gagnant (C2) : 100 % ;
• 2 gagnants (C4) : 65 % au 1er, 35 % au 2e ;
• 3 gagnants (C6, C8, C12, C16) : 60 % au 1er, 25 % au 2e, 15 % au 3e.

Ces pourcentages sont paramétrables par l'administrateur.` },
      { h: "Article 10 — Primes de participation", b:
`Chaque candidat éliminé reçoit une prime de participation, égale à un pourcentage (actuellement 20 %) de ce que ses propres votes ont rapporté. Ces primes sont financées par la commission de la Plateforme, et non prélevées sur la part du podium.` },
      { h: "Article 11 — Invariant financier", b:
`La Plateforme ne distribue jamais plus que ce qui a été collecté : la somme réellement versée (podium + primes) ne dépasse en aucun cas la cagnotte du challenge.` },
      { h: "Article 12 — Versement et retrait des gains", b:
`Les gains (podium et primes) sont crédités au Compte de retrait du bénéficiaire, distinct du Compte de votes. Le retrait s'effectue par Mobile Money, selon le pays et l'opérateur disponibles. Le retrait est soumis à un montant minimum et à des frais correspondant à ceux du prestataire de paiement, répercutés à l'identique et affichés avant confirmation. La couverture géographique s'ouvre progressivement à travers l'Afrique ; tant que le pays d'un bénéficiaire n'est pas ouvert, ses gains restent disponibles sur son Compte de retrait.` },
      { h: "Article 13 — Fiscalité", b:
`Chaque bénéficiaire est seul responsable des déclarations et obligations fiscales applicables à ses gains dans son pays de résidence.` },
      { h: "Article 14 — Fraude, modification et annulation", b:
`En cas de fraude (auto-vote, comptes multiples, manipulation…), l'éditeur peut annuler les votes et gains concernés et exclure le contrevenant. En cas de force majeure, de défaillance technique majeure ou de fraude massive compromettant l'équité, l'éditeur peut suspendre, reporter ou annuler un challenge ; en cas d'annulation, les votes correspondants sont, dans la mesure du possible, restitués aux votants.` },
      { h: "Article 15 — Réclamations et loi applicable", b:
`Toute réclamation relative à un challenge peut être adressée via la page Contact. Le présent Règlement est régi par le droit béninois ; tout litige relève des juridictions compétentes de Cotonou (Bénin), après tentative de résolution amiable.` },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  {
    id: 'confidentialite',
    title: '4 · Politique de confidentialité',
    sub: "Comment nous traitons vos données personnelles",
    articles: [
      { h: "Article 1 — Responsable du traitement", b:
`Le responsable du traitement des données personnelles est IGEJPS, éditeur de la Plateforme Diki-Diki (voir Mentions légales). Contact : support@diki-diki.com.` },
      { h: "Article 2 — Données collectées", b:
`La Plateforme collecte, selon les usages :
• Données d'identité : nom, prénom.
• Données de contact : adresse électronique, numéro de téléphone.
• Données de compte : identifiants de connexion, rôle (candidat, votant).
• Contenus : vidéos téléversées, commentaires.
• Données financières : solde des comptes, historique des transactions (recharges, votes, gains, retraits), numéro Mobile Money de réception. La Plateforme ne collecte ni ne conserve les codes secrets (PIN) ni les données de carte : ils sont traités directement par le prestataire de paiement.
• Données techniques : journaux de connexion, adresse IP, données d'appareil, cookies.` },
      { h: "Article 3 — Finalités et bases légales", b:
`Les données sont traitées pour : fournir et gérer le service (exécution du contrat) ; organiser les challenges, votes et versements (exécution du contrat) ; assurer la sécurité, la modération et la lutte contre la fraude (intérêt légitime) ; envoyer les notifications liées au service ; et respecter les obligations légales et comptables applicables.` },
      { h: "Article 4 — Destinataires et sous-traitants", b:
`Les données sont accessibles au personnel habilité de l'éditeur et à ses sous-traitants techniques, tenus à la confidentialité : hébergement et base de données (Supabase, Vercel, Railway), stockage vidéo (Cloudflare), prestataires de paiement (FedaPay, PawaPay), et services d'envoi de messages (SMS / e-mail). Les données ne sont ni vendues ni cédées à des tiers à des fins commerciales.` },
      { h: "Article 5 — Transferts hors du Bénin", b:
`Certains prestataires d'hébergement sont situés hors du Bénin. Les transferts nécessaires au fonctionnement de la Plateforme sont encadrés par des garanties contractuelles appropriées auprès de ces prestataires.` },
      { h: "Article 6 — Durée de conservation", b:
`Les données de compte sont conservées tant que le compte est actif. En cas de suppression du compte, les données personnelles sont supprimées dans un délai de 30 jours, à l'exception des données que l'éditeur doit conserver pour respecter ses obligations légales et comptables (notamment l'historique des transactions financières), conservées pour la durée légale applicable.` },
      { h: "Article 7 — Sécurité", b:
`L'éditeur met en œuvre des mesures techniques et organisationnelles raisonnables pour protéger les données contre la perte, l'accès non autorisé ou la divulgation. Aucun système n'étant infaillible, l'utilisateur contribue à cette sécurité en protégeant ses identifiants.` },
      { h: "Article 8 — Vos droits", b:
`Conformément à la loi n° 2017-20 du 20 avril 2018 portant Code du numérique en République du Bénin, l'utilisateur dispose des droits d'accès, de rectification, d'effacement, d'opposition et de limitation concernant ses données. Ces droits s'exercent en écrivant à support@diki-diki.com. En cas de difficulté, l'utilisateur peut saisir l'Autorité de Protection des Données à caractère Personnel (APDP) du Bénin.` },
      { h: "Article 9 — Cookies", b:
`La Plateforme utilise des cookies et technologies similaires strictement nécessaires à son fonctionnement (session, sécurité) et, le cas échéant, à la mesure d'audience. L'utilisateur peut configurer son navigateur pour limiter les cookies non essentiels ; certaines fonctionnalités peuvent alors être affectées.` },
      { h: "Article 10 — Mineurs", b:
`La Plateforme est réservée aux personnes majeures (18 ans et plus). L'éditeur ne collecte pas sciemment de données de mineurs ; tout compte identifié comme appartenant à un mineur sera clôturé.` },
      { h: "Article 11 — Modifications", b:
`La présente Politique peut être mise à jour pour refléter l'évolution de la Plateforme ou de la réglementation. La date de dernière mise à jour figure en tête de page.` },
    ],
  },
];

export default function CGUPage() {
  return (
    <div style={s.page}>
      <Navbar />

      <div style={s.hero}>
        <div style={s.badge}>Informations légales</div>
        <h1 style={s.h1}>Conditions & Règlement</h1>
        <p style={s.sub}>Mentions légales · CGU · Règlement des challenges · Confidentialité</p>
        <p style={s.maj}>Dernière mise à jour : {MAJ} · Version 1</p>
      </div>

      <div style={s.divider} />

      <div style={s.body}>
        {/* Sommaire */}
        <nav id="top" style={s.toc}>
          <p style={s.tocTit}>Sommaire</p>
          {DOCS.map(d => (
            <a key={d.id} href={`#${d.id}`} style={s.tocLink}>{d.title}</a>
          ))}
        </nav>

        {/* Documents */}
        {DOCS.map(doc => (
          <section key={doc.id}>
            <h2 id={doc.id} style={s.docTit}>{doc.title}</h2>
            {doc.sub && <p style={s.docSub}>{doc.sub}</p>}
            {doc.note && <div style={s.note}>ℹ️ {doc.note}</div>}
            {doc.articles.map((art, i) => (
              <div key={i}>
                {art.h && <h3 style={s.artH}>{art.h}</h3>}
                <Body text={art.b} />
              </div>
            ))}
            <a href="#top" style={s.toTop}>↑ Retour au sommaire</a>
          </section>
        ))}
      </div>

      <div style={s.footer}>
        <p>Diki-Diki — La scène des talents africains · www.diki-diki.com<br/>
        Pour toute question relative aux présentes conditions : <a href="/contact" style={{ color: OR, textDecoration: 'none' }}>page Contact</a> ou support@diki-diki.com.</p>
        <button style={s.print} onClick={() => { if (typeof window !== 'undefined') window.print(); }}>🖨️ Imprimer / Enregistrer en PDF</button>
      </div>
    </div>
  );
}
