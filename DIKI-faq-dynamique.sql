-- =====================================================================
-- Diki-Diki — FAQ pilotable depuis l'Admin : schema + reprise de l'existant
-- A executer dans Supabase (schema public). Idempotent : le seed est
-- ignore si des categories existent deja. (Desactiver la traduction Chrome.)
-- =====================================================================
create extension if not exists pgcrypto;

create table if not exists public.faq_categories (
  id         uuid primary key default gen_random_uuid(),
  libelle    text not null,
  ordre      int  not null default 0,
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.faq_items (
  id           uuid primary key default gen_random_uuid(),
  categorie_id uuid not null references public.faq_categories(id) on delete cascade,
  type         text not null default 'texte',
  question     text not null,
  reponse      text not null default '',
  ordre        int  not null default 0,
  actif        boolean not null default true,
  updated_at   timestamptz not null default now()
);
create index if not exists ix_faq_items_cat on public.faq_items(categorie_id);

-- ---- Reprise de la FAQ actuelle (une seule fois) ----
do $$
declare cid uuid;
begin
  if exists (select 1 from public.faq_categories) then raise notice 'FAQ deja initialisee — seed ignore.'; return; end if;

  insert into public.faq_categories(libelle,ordre,actif) values ($dkdk$🌍 Diki-Diki — La plateforme$dkdk$, 1, true) returning id into cid;
  insert into public.faq_items(categorie_id,type,question,reponse,ordre,actif) values
    (cid,$dkdk$texte$dkdk$,$dkdk$C'est quoi Diki-Diki ?$dkdk$,$dkdk$Diki-Diki, c'est un acte employé pour arracher le sourire à quelqu'un — un geste cher au peuple du Congo. Et c'est exactement ce que tu viens vivre ici : une Arène où les talents d'Afrique t'émerveillent, où le public les porte, et d'où chacun repart le sourire aux lèvres. Voilà pourquoi nous l'avons nommée Diki-Diki, la scène des talents africains.

Une plateforme culturelle et panafricaine de challenges artistiques et sportifs, où c'est le public qui départage les candidats par des votes payants.

Les candidats soumettent des vidéos de leur prestation et s'affrontent dans un challenge. Le public les soutient en envoyant des étoiles ★ ou des cœurs ❤️. Ces votes forment une cagnotte commune, partagée à la fin entre les gagnants ; les candidats éliminés reçoivent une prime de participation.

Le vote payant est à la fois le jury (seul le public tranche, jamais une note technique) et le moteur : c'est lui qui constitue le prix à gagner.

Disciplines : danse, chant, instrument, humour, poésie, conte, théâtre, basket, foot, taekwondo, karaté, shotokan, kung-fu, wushu, taï-chi.
🌍 Ouverte à toute l'Afrique et à la diaspora.$dkdk$,1,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Qui peut utiliser Diki-Diki ?$dkdk$,$dkdk$Trois profils, non figés — on passe volontiers de l'un à l'autre :

• Le visiteur regarde les vidéos, librement et gratuitement.
• Le candidat s'inscrit, téléverse au moins une vidéo et concourt ; il dispose d'un compte pour recevoir ses gains.
• Le votant soutient les candidats par des votes payants — c'est de lui que dépend tout : il départage les candidats et constitue la cagnotte.

Regarder, commenter et partager est entièrement gratuit. Seul le vote est payant.$dkdk$,2,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Quels sont les avantages d'être sur Diki-Diki ?$dkdk$,$dkdk$Deux familles d'avantages, selon que tu participes ou que tu soutiens.

🎤 Pour les candidats participants :
• Une scène monétisée et équitable — c'est le public qui vote, jamais un jury technique.
• Des gains réels : le podium se partage la cagnotte, et même éliminé tu reçois une prime de participation — ici, on ne repart jamais les mains vides.
• Inscription 100 % gratuite.
• Une vraie visibilité auprès d'une audience africaine et de la diaspora, et ton lien de vote personnel à partager (TikTok, WhatsApp, lives…).
• Et si tu votes aussi pour d'autres talents, tu profites en plus du programme de fidélité ci-dessous.

🗳️ Pour le public, dès ton inscription et ton 1er vote — le programme de fidélité « Les Échos » :
À chaque vote, tu gagnes 1 Écho (1 vote = 1 Écho). Les Échos ne sont ni de l'argent ni des votes en plus : ils font grandir ton statut et débloquent des avantages. Tu montes en relevant un petit défi chaque mois (une saison = 3 mois), sans aucune pression.

Tes avantages, statut par statut (comme affichés sur la page « Les Échos ») :
• ✉️ Dès Le Messager : badge sur ton profil.
• 🗣️ Dès Le Porte-parole : badge à côté de tes soutiens.
• 🎖️ Dès L'Ambassadeur : commentaires mis en avant + accès anticipé.
• 📯 Le Héraut : titre honorifique + couleur de pseudo.

🎁 Et les cadeaux ? Chaque statut a ses « cadeaux de ce niveau », affichés sur la page « Les Échos » et détaillés sur la page « Cadeaux à gagner ». Ils sont indicatifs, jamais promis : ce que tu peux réellement recevoir dépend des règles du programme et de ce qui est collecté, et les Échos ne se convertissent jamais en argent.$dkdk$,3,true);

  insert into public.faq_categories(libelle,ordre,actif) values ($dkdk$🏆 Comprendre le Challenge$dkdk$, 2, true) returning id into cid;
  insert into public.faq_items(categorie_id,type,question,reponse,ordre,actif) values
    (cid,$dkdk$texte$dkdk$,$dkdk$C'est quoi un challenge ?$dkdk$,$dkdk$Un challenge est une compétition entre candidats sur une même discipline. Le public vote en envoyant des étoiles ★ (100 F CFA, poids 1) ou des cœurs ❤️ (200 F CFA, poids 2), ce qui fait monter le score des candidats.

Chaque étape se ferme lorsqu'elle atteint son objectif de cagnotte (défini par le format). À la fin, les gagnants se partagent la cagnotte et les éliminés reçoivent une prime.$dkdk$,1,true),
    (cid,$dkdk$formats$dkdk$,$dkdk$Quels sont les formats de challenge ?$dkdk$,$dkdk$Voici les formats proposés, tenus à jour automatiquement d'après l'Admin. ⚠️ L'objectif indiqué est le montant de cagnotte à réunir par étape (le seuil qui ferme l'étape) — ce n'est PAS un gain de candidat ; le gain réel dépend de la cagnotte réellement collectée, moins la commission, partagée selon le podium (voir « Comment la cagnotte est-elle partagée ? »).$dkdk$,2,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Parcours ou Bloc groupé : quelle différence ?$dkdk$,$dkdk$Un challenge suit l'un de deux modèles :

• **Parcours** (élimination progressive) — étape par étape : à chaque étape le candidat fournit une vidéo, le public vote, et les moins votés sont éliminés. La dernière étape est un « match de classement » : les finalistes s'affrontent une dernière fois, sans élimination. L'ordre du podium (1er, 2e, 3e) tient compte du total des votes cumulés sur l'ensemble des étapes du parcours, pas seulement de ceux de cette dernière étape.

• **Bloc groupé** (classement final) — le candidat fournit toutes ses vidéos d'emblée ; il n'y a qu'un seul décompte à la fin, un seul classement.$dkdk$,3,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Un challenge en solo ou en groupe ?$dkdk$,$dkdk$Chaque challenge est d'un seul type : Solo ou Groupes — jamais les deux mélangés. On oppose donc solo contre solo, ou groupe contre groupe (il serait injuste d'opposer une personne seule à une troupe).

C'est le créateur du challenge qui choisit librement ce type au moment de la création (Solo par défaut). Tous ceux qui rejoignent le challenge suivent ce type : dans un challenge Groupes, chacun s'inscrit avec son groupe et son nom de groupe ; dans un challenge Solo, chacun concourt individuellement.

Selon la discipline, le mode « Groupes » s'affiche avec le bon mot : Multi-voix au chant, Troupe en danse, Ensemble aux instruments, Équipe au sport.

Côté cagnotte, rien ne change : un groupe compte comme une seule inscription — une place, une vidéo par étape, un seul gain s'il gagne ou une seule prime s'il est éliminé. Le partage éventuel entre les membres du groupe se fait entre eux, en dehors de la plateforme.$dkdk$,4,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Comment les gagnants et les éliminés sont-ils désignés ?$dkdk$,$dkdk$Uniquement par les votes du public. À chaque étape, les candidats sont classés par score ; les mieux classés continuent, les moins votés sont éliminés. Les scores qui déterminent les éliminations repartent de zéro à chaque nouvelle étape.

La dernière étape est un match de classement : plus personne n'est éliminé. L'ordre du podium (1er, 2e, 3e) est établi sur le total des votes cumulés par chaque finaliste sur l'ensemble des étapes — les votes des étapes précédentes comptent aussi, pas seulement ceux de la dernière.

En cas d'égalité à une place décisive, un court délai supplémentaire laisse les votes départager. Si l'égalité persiste, un classement de départage s'applique : le plus d'étoiles, puis le plus de cœurs, puis l'ordre d'inscription.$dkdk$,5,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Qui peut créer un challenge ?$dkdk$,$dkdk$Pour créer ou rejoindre un challenge, il faut :
• être majeur (18 ans et plus) ;
• avoir un compte vérifié à votre nom réel (nécessaire pour être payé) ;
• disposer d'au moins une vidéo approuvée dont vous êtes l'auteur ;
• accepter le règlement du concours.

Le créateur devient le 1er candidat, et le challenge démarre automatiquement dès que le nombre de candidats du format est atteint.$dkdk$,6,true);

  insert into public.faq_categories(libelle,ordre,actif) values ($dkdk$🎤 Participation$dkdk$, 3, true) returning id into cid;
  insert into public.faq_items(categorie_id,type,question,reponse,ordre,actif) values
    (cid,$dkdk$texte$dkdk$,$dkdk$Comment participer à un challenge, étape par étape ?$dkdk$,$dkdk$1. Créez un compte et vérifiez-le à votre vrai nom (indispensable pour recevoir vos gains).
2. Déposez une vidéo de votre prestation depuis « Ajouter une vidéo » : elle passe en modération, puis, une fois approuvée, devient utilisable dans un challenge.
3. Choisissez votre voie : rejoignez un appel ouvert depuis le Mur des appels, ou créez votre propre challenge (discipline, format, modèle).
4. Le challenge démarre automatiquement dès que le nombre de candidats du format est atteint (par exemple 8 pour un C8). Les étapes s'ouvrent, et le public vote.

Rappel : ce n'est pas un jury technique qui décide — seuls les votes payants du public départagent les candidats.$dkdk$,1,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$De quoi ai-je besoin pour participer ?$dkdk$,$dkdk$Quatre conditions pour concourir :
• être majeur (18 ans et plus) ;
• avoir un compte vérifié à votre vrai nom (nécessaire pour être payé) ;
• disposer d'au moins une vidéo approuvée dont vous êtes l'auteur ;
• accepter le Règlement du concours.

Regarder les vidéos et voter ne demandent rien de tout cela : seule la participation en tant que candidat l'exige.$dkdk$,2,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Quel type de vidéo puis-je soumettre ?$dkdk$,$dkdk$Une prestation artistique ou sportive dont vous êtes l'auteur : danse, chant, instrument, humour, poésie, conte… ou une discipline sportive.

• Format : vidéo standard MP4 ou MOV, jusqu'à 500 Mo.
• Une seule prestation identifiable par vidéo, filmée correctement (image et son clairs).
• Si l'appel impose un morceau précis (parfois avec une vidéo de référence à écouter), votre prestation doit s'y conformer.
• Reprises : vous devez assumer les droits de la chanson reprise ; pour le chant, privilégiez l'instrumental « sans les paroles » (voir la question suivante).

Tout contenu offensant, volé ou hors sujet est refusé en modération.$dkdk$,3,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Reprise sans paroles : comment chanter sans la voix d'origine ?$dkdk$,$dkdk$Pour une reprise en chant, tu chantes sur la musique de la chanson, sans la voix d'origine. Voici comment obtenir l'instrumental (le « karaoké »), gratuitement, même depuis ton téléphone :

1. Prépare ta chanson : aie sous la main le fichier audio (MP3) ou son lien.
2. Passe-la dans un outil gratuit qui sépare la voix et l'instrumental : moises.ai, vocalremover.org ou lalal.ai.
3. Télécharge la piste « instrumental », lance-la et chante par-dessus en te filmant.

Astuces : écoute la musique au casque et filme dans un endroit calme ; si le morceau est trop haut ou trop bas pour toi, Moises permet de changer la tonalité et le tempo. Un guide pas à pas est aussi disponible sur la page « Reprise sans paroles » (menu Comment ça marche).$dkdk$,4,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Comment rejoindre un appel sur le Mur des appels ?$dkdk$,$dkdk$Le Mur des appels liste les challenges ouverts. Ouvrez celui qui vous inspire : vous y voyez la discipline, le format, les morceaux imposés (souvent avec une vidéo de référence à écouter) et l'objectif à collecter.

Pour rejoindre : touchez le panneau, choisissez une de vos vidéos approuvées, puis validez « Rejoindre l'appel ». Dès que toutes les places sont prises, le challenge démarre automatiquement.$dkdk$,5,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Combien coûte l'inscription à un challenge ?$dkdk$,$dkdk$Pour les candidats, l'inscription à un challenge est 100 % gratuite.

Les votes du public n'ont rien à voir avec l'inscription : voter n'est pas un « droit d'entrée ». Les votes servent à soutenir les candidats et à constituer la cagnotte du challenge — ils ne sont en aucun cas reliés à l'inscription d'un candidat.

Seule exception : réutiliser une même vidéo déjà engagée dans un autre challenge peut entraîner des frais d'inscription, fixés par l'administration et affichés avant de confirmer.$dkdk$,6,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Puis-je participer à plusieurs challenges en même temps ?$dkdk$,$dkdk$Oui, vous pouvez rejoindre plusieurs challenges. Chaque challenge est prévu pour sa propre vidéo ; réutiliser une même vidéo dans un autre challenge reste possible mais est encadré par la plateforme (des frais d'inscription, fixés par l'administration, peuvent s'appliquer).$dkdk$,7,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Puis-je changer ma vidéo entre deux étapes ?$dkdk$,$dkdk$Oui — c'est le principe du modèle **Parcours** : vous soumettez une nouvelle vidéo avant chaque nouvelle étape, depuis Mes vidéos. Les scores qui déterminent les éliminations repartent de zéro à chaque étape, mais le classement final du podium tient compte du total des votes cumulés sur toutes les étapes (voir « Comment les gagnants et les éliminés sont-ils désignés ? »).

En modèle **Bloc groupé**, à l'inverse, vous fournissez toutes vos vidéos dès le départ, pour un seul classement final.$dkdk$,8,true);

  insert into public.faq_categories(libelle,ordre,actif) values ($dkdk$🗳️ Votes & Cagnotte$dkdk$, 4, true) returning id into cid;
  insert into public.faq_items(categorie_id,type,question,reponse,ordre,actif) values
    (cid,$dkdk$texte$dkdk$,$dkdk$📌 Ce qu'il faut retenir$dkdk$,$dkdk$1. Voter, c'est envoyer des réactions (étoiles ★ et cœurs/likes ❤️) à un candidat.
2. Ces réactions ont une valeur financière : elles sont monétisables — chaque vote alimente la cagnotte du challenge.
3. Le vote du public a donc un double rôle : soutenir un candidat ET générer de l'argent (le prix à partager à la fin).$dkdk$,1,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Comment fonctionne le vote ?$dkdk$,$dkdk$Deux façons de soutenir :
• ★ Étoile = 100 F CFA (poids +1 au classement)
• ❤️ Cœur = 200 F CFA (poids +2 au classement)

Vous pouvez voter par paliers (100, 200, 500, 1 000 F) ou saisir une quantité libre. Chaque vote fait monter le score du candidat et alimente la cagnotte du challenge.$dkdk$,2,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Peut-on voter sans créer de compte ?$dkdk$,$dkdk$Oui. Quand tu arrives sur la page d'un candidat (par exemple via son lien de vote personnel), tu le soutiens en 2 temps : tu choisis ★ ou ❤️ et la quantité, puis tu valides avec ton numéro Mobile Money et un code reçu par SMS — sans créer de compte au préalable. Le vote n'est compté qu'une fois le paiement confirmé par l'opérateur. Juste après, un écran te remercie, te montre que ta voix a fait monter le candidat, et te propose de faire voter un ami. En votant, tu peux aussi cumuler des Échos, le programme de fidélité « Les Échos » de Diki-Diki.$dkdk$,3,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$C'est quoi mon lien de vote personnel ? (candidats)$dkdk$,$dkdk$Chaque candidat a un lien court et personnel, de la forme diki-diki.com/v/… , qui mène droit sur sa page de vote. Tu le retrouves dans ton espace Compte → Mes challenges, dans le bloc « Mes liens de vote » : tu peux le copier, le partager (TikTok, WhatsApp, tes lives…) ou afficher son QR code. Plus tu le partages, plus le public te trouve en un clic et te soutient, sans avoir à chercher ton nom. La plateforme mesure les clics et les votes venus de ton lien, pour que tu voies ce que ton partage rapporte.$dkdk$,4,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Comment la cagnotte est-elle partagée ?$dkdk$,$dkdk$La cagnotte, c'est l'ensemble des votes d'un challenge. La plateforme prélève une commission (50 %) ; le reste — le net — revient au podium, selon le format :

• C2 (1 gagnant) : 100 %
• C4 (2 gagnants) : 65 % / 35 %
• C6, C8, C12, C16 (3 gagnants) : 60 % / 25 % / 15 %

Sur sa commission, la plateforme finance aussi les primes de participation des éliminés et réserve une part au programme de fidélité (« Les Échos »), qui récompense les membres les plus actifs. Aucun cadeau n'est garanti ni promis, et les Échos ne se convertissent jamais en argent.

Règle intangible : on ne distribue jamais plus que ce qui a été collecté.$dkdk$,5,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Que gagne un candidat éliminé ?$dkdk$,$dkdk$Toute participation est récompensée : chaque éliminé reçoit une prime de participation, égale à 20 % de ce que ses propres votes ont rapporté. Ces primes sont financées par la commission de la plateforme, pas par la part du podium.$dkdk$,6,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$L'objectif d'une étape, est-ce mon gain ?$dkdk$,$dkdk$Non — c'est une confusion fréquente. L'objectif d'une étape est le montant à collecter pour qu'elle se ferme, pas un gain de candidat. Votre gain réel dépend de la cagnotte réellement collectée, moins la commission, partagée selon le podium.$dkdk$,7,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Qu'est-ce que « Soutenir » un artiste ?$dkdk$,$dkdk$En dehors des périodes de vote d'un challenge (entre deux étapes, ou pour une vidéo hors challenge), vous pouvez Soutenir directement un artiste. Le montant est fixé par la plateforme et affiché au moment de soutenir ; une part revient directement à l'artiste soutenu.$dkdk$,8,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Puis-je voter plusieurs fois pour le même candidat ?$dkdk$,$dkdk$Oui, autant de fois que vous le souhaitez, tant que l'étape est active et que votre solde le permet. Un même envoi est limité à 1 000 unités au maximum — au-delà, il suffit de renvoyer un vote.$dkdk$,9,true);

  insert into public.faq_categories(libelle,ordre,actif) values ($dkdk$💳 Paiement & Retrait$dkdk$, 5, true) returning id into cid;
  insert into public.faq_items(categorie_id,type,question,reponse,ordre,actif) values
    (cid,$dkdk$texte$dkdk$,$dkdk$Comment retirer mes gains ?$dkdk$,$dkdk$Allez dans votre Compte → Retrait, saisissez le montant, choisissez votre pays et votre opérateur Mobile Money, puis votre numéro de réception. Le virement est en général reçu en quelques minutes.

Seuls les gains (podium ou prime de participation) sont retirables. L'argent chargé pour voter, lui, ne se retire pas.$dkdk$,1,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Dans quels pays puis-je retirer mes gains ?$dkdk$,$dkdk$Le retrait Mobile Money s'ouvre progressivement à travers l'Afrique :

✅ Disponible : 🇧🇯 Bénin

🔓 En cours d'ouverture (Afrique de l'Ouest francophone) : 🇨🇮 Côte d'Ivoire, 🇸🇳 Sénégal, 🇹🇬 Togo, 🇧🇫 Burkina Faso, 🇳🇪 Niger

🌍 Bientôt (reste de l'Afrique) : Ghana, Nigeria, Kenya, Tanzanie, Ouganda, Rwanda, Cameroun, RD Congo, Gabon, Congo-Brazzaville, Zambie, Malawi, Mozambique, Éthiopie, Sierra Leone, Lesotho

💳 À venir : Afrique du Nord et australe (paiement par carte)

Si ton pays n'est pas encore ouvert, tes gains restent en sécurité sur ton Compte de Retrait en attendant.$dkdk$,2,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Quels moyens de paiement sont acceptés ?$dkdk$,$dkdk$Le Mobile Money, selon ton pays : MTN, Moov, Orange, Wave, Celtiis… traités par notre partenaire FedaPay (et bientôt PawaPay pour élargir la couverture à toute l'Afrique).$dkdk$,3,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Y a-t-il des frais sur les retraits ?$dkdk$,$dkdk$Oui : des frais fixes de 150 F CFA par retrait s'appliquent. Ce sont les frais de notre partenaire de paiement, répercutés à l'identique — Diki-Diki ne prend aucune marge dessus. Ils sont affichés clairement dans le récapitulatif avant de confirmer (« Vous recevrez : montant − 150 F »).$dkdk$,4,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Mon retrait a échoué, que faire ?$dkdk$,$dkdk$Pas d'inquiétude : en cas d'échec, tes gains restent disponibles sur ton Compte de Retrait — rien n'est perdu. Réessaie un peu plus tard, et si le problème persiste, contacte-nous via la page Contact → raccourci « Retrait & paiement ».$dkdk$,5,true);

  insert into public.faq_categories(libelle,ordre,actif) values ($dkdk$🔒 Compte & Sécurité$dkdk$, 6, true) returning id into cid;
  insert into public.faq_items(categorie_id,type,question,reponse,ordre,actif) values
    (cid,$dkdk$texte$dkdk$,$dkdk$Comment réinitialiser mon mot de passe ?$dkdk$,$dkdk$Sur la page de connexion, cliquez sur « Mot de passe oublié ». Un lien de réinitialisation vous sera envoyé.$dkdk$,1,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Comment supprimer mon compte ?$dkdk$,$dkdk$Allez dans Paramètres → Mon compte → Supprimer mon compte. L'action est irréversible ; vos données sont supprimées dans un délai de 30 jours.$dkdk$,2,true),
    (cid,$dkdk$texte$dkdk$,$dkdk$Mon compte a été suspendu, que faire ?$dkdk$,$dkdk$Contactez-nous via la page Contact en précisant votre nom d'utilisateur et la raison supposée. Nous étudions chaque cas sous 48 h.$dkdk$,3,true);
end $$;

notify pgrst, 'reload schema';