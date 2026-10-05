'use client';
// frontend/app/admin/manuel/page.tsx
// DKDK_MANUEL — Manuel de gestion du poste Admin (guide des 19 menus).
// Rendu en ISOLATION via Shadow DOM : aucun iframe (donc aucun blocage de mise en cadre),
// aucune collision de styles avec l'app admin. Le document est encapsule dans un shadow root.
import { AdminGuard }   from '../../components/admin/AdminGuard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useEffect, useRef } from 'react';

const MANUEL_INNER = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap">
<style>

/* Layout : TOC collant à gauche + colonne de lecture à droite ; empilé sous 900px.
   Palette : neutres chauds + accent OR Diki-Diki, magenta secondaire, sémantiques ok/alerte. */
:host{
  --bg:#f7f2ea; --surface:#ffffff; --surface-2:#fbf7f0;
  --fg:#211b15; --muted:#726757; --line:#e7dccb;
  --accent:#FFAA00; --accent-ink:#9a5d00; --accent-soft:rgba(255,170,0,.14);
  --magenta:#b0208c; --magenta-soft:rgba(176,32,140,.10);
  --danger:#c0392b; --danger-soft:rgba(192,57,43,.10);
  --ok:#1f8f52; --ok-soft:rgba(31,143,82,.12);
  --display:'Syne',system-ui,sans-serif;
  --body:'DM Sans',system-ui,sans-serif;
  --maxw:70ch;
  color-scheme:light;
}
@media (prefers-color-scheme:dark){:host:not([data-theme="light"]){
  --bg:#0d0d12; --surface:#16161d; --surface-2:#1b1b23;
  --fg:#ece6da; --muted:#9a9183; --line:#2a2a34;
  --accent:#FFAA00; --accent-ink:#ffbf3d; --accent-soft:rgba(255,170,0,.13);
  --magenta:#e879c8; --magenta-soft:rgba(232,121,200,.12);
  --danger:#f87171; --danger-soft:rgba(248,113,113,.12);
  --ok:#4ade80; --ok-soft:rgba(74,222,128,.12);
  color-scheme:dark;
}}
:host[data-theme="dark"]{
  --bg:#0d0d12; --surface:#16161d; --surface-2:#1b1b23;
  --fg:#ece6da; --muted:#9a9183; --line:#2a2a34;
  --accent:#FFAA00; --accent-ink:#ffbf3d; --accent-soft:rgba(255,170,0,.13);
  --magenta:#e879c8; --magenta-soft:rgba(232,121,200,.12);
  --danger:#f87171; --danger-soft:rgba(248,113,113,.12);
  --ok:#4ade80; --ok-soft:rgba(74,222,128,.12);
  color-scheme:dark;
}
*{box-sizing:border-box}
:host{margin:0}
:host{background:var(--bg);color:var(--fg);font-family:var(--body);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--accent-ink)}
h1,h2,h3{font-family:var(--display);text-wrap:balance;line-height:1.15;margin:0}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.86em;background:var(--accent-soft);color:var(--accent-ink);padding:.08em .4em;border-radius:5px;word-break:break-word}

/* Barre de titre */
.topbar{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.topbar-in{max-width:1180px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:12px 20px}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.star{color:var(--accent);font-size:20px;flex:none}
.brand b{font-family:var(--display);font-weight:800;font-size:17px;letter-spacing:-.01em}
.brand span{color:var(--muted);font-size:12.5px}
.toggle{margin-left:auto;flex:none;font:inherit;font-size:13px;font-weight:600;color:var(--fg);background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:7px 13px;cursor:pointer;display:inline-flex;gap:7px;align-items:center}
.toggle:hover{border-color:var(--accent)}

/* Grille principale */
.wrap{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:248px minmax(0,1fr);gap:40px;padding:0 20px;padding-block:28px 72px}
@media (max-width:900px){.wrap{grid-template-columns:1fr;gap:8px}}

/* Sommaire */
.toc{position:sticky;top:calc(env(safe-area-inset-top,0px) + 74px);align-self:start;max-height:calc(100vh - 100px);overflow:auto;font-size:13.5px}
@media (max-width:900px){.toc{position:static;max-height:none;border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:6px}
  .toc details{}.toc>.toc-list{display:none}.toc[data-open] >.toc-list{display:block}}
.toc-eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:11px;font-weight:700;color:var(--muted);padding:4px 10px 10px}
.toc a{display:flex;gap:9px;align-items:baseline;text-decoration:none;color:var(--fg);padding:6px 10px;border-radius:8px;border-left:2px solid transparent}
.toc a:hover{background:var(--accent-soft)}
.toc a.on{background:var(--accent-soft);border-left-color:var(--accent);color:var(--accent-ink);font-weight:600}
.toc a .n{color:var(--muted);font-variant-numeric:tabular-nums;font-size:12px;min-width:16px}
.toc a.lead{font-weight:600}

/* Contenu */
.content{min-width:0;max-width:var(--maxw)}
.hero{border:1px solid var(--line);border-radius:18px;background:
  radial-gradient(120% 100% at 100% 0,var(--magenta-soft),transparent 60%),var(--surface);
  padding:26px 26px 22px;margin-bottom:26px}
.kicker{display:inline-block;text-transform:uppercase;letter-spacing:.14em;font-size:11.5px;font-weight:700;color:var(--accent-ink);background:var(--accent-soft);padding:5px 11px;border-radius:999px;margin-bottom:14px}
.hero h1{font-size:clamp(27px,5vw,40px);font-weight:800;letter-spacing:-.02em}
.hero p{color:var(--muted);margin:12px 0 0;max-width:58ch}

.goldrules{display:grid;gap:12px;margin:22px 0 8px}
@media (min-width:620px){.goldrules{grid-template-columns:repeat(3,1fr)}}
.rule{border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:14px 15px}
.rule h3{font-size:14.5px;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.rule p{margin:0;font-size:13.5px;color:var(--muted)}
.rule .dot{width:9px;height:9px;border-radius:50%;flex:none}

.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12.5px;color:var(--muted);border:1px dashed var(--line);border-radius:12px;padding:12px 14px;margin-top:20px}
.legend b{color:var(--fg)}

/* Sections menu */
section.menu{scroll-margin-top:90px;padding-top:30px;margin-top:30px;border-top:1px solid var(--line)}
section.menu:first-of-type{border-top:0}
.mhead{display:flex;gap:13px;align-items:flex-start;margin-bottom:4px}
.micon{font-size:24px;line-height:1.3;flex:none;width:42px;height:42px;display:grid;place-items:center;background:var(--accent-soft);border-radius:12px}
.mtitle{min-width:0}
.mtitle h2{font-size:21px;font-weight:700;letter-spacing:-.01em}
.mtitle .path{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:var(--muted);margin-top:3px;display:inline-block}
.sub{font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;color:var(--muted);margin:18px 0 8px}
.content p{margin:0 0 10px}
.content ul,.content ol{margin:0 0 10px;padding-left:1.25em}
.content li{margin:5px 0}
.content li::marker{color:var(--accent-ink)}
.tag{display:inline-block;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;vertical-align:middle;margin-left:6px}
.tag.money{background:var(--danger-soft);color:var(--danger)}
.tag.safe{background:var(--ok-soft);color:var(--ok)}
.tag.law{background:var(--magenta-soft);color:var(--magenta)}

.warn{border-left:3px solid var(--danger);background:var(--danger-soft);border-radius:0 10px 10px 0;padding:11px 14px;margin:10px 0;font-size:14px}
.tip{border-left:3px solid var(--ok);background:var(--ok-soft);border-radius:0 10px 10px 0;padding:11px 14px;margin:10px 0;font-size:14px}
.warn b,.tip b{font-weight:700}

.foot{max-width:var(--maxw);color:var(--muted);font-size:13px;border-top:1px solid var(--line);margin-top:34px;padding-top:18px}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
:host{scroll-behavior:smooth}

</style>
<header class="topbar">
  <div class="topbar-in">
    <div class="brand">
      <span class="star">★</span>
      <div style="min-width:0">
        <b>Manuel Admin Diki&#8209;Diki</b><br>
        <span>Gérer la plateforme, menu par menu</span>
      </div>
    </div>
    <button class="toggle" id="themeBtn" aria-label="Changer de thème"><span id="themeIco">🌙</span><span id="themeTxt">Sombre</span></button>
  </div>
</header>

<div class="wrap">

  <!-- SOMMAIRE -->
  <nav class="toc" id="toc" aria-label="Sommaire">
    <div class="toc-eyebrow">Sommaire</div>
    <div class="toc-list">
      <a href="#intro" class="lead"><span class="n">•</span> Avant de commencer</a>
      <a href="#dashboard"><span class="n">1</span> Dashboard</a>
      <a href="#utilisateurs"><span class="n">2</span> Utilisateurs</a>
      <a href="#activite"><span class="n">3</span> Qui fait quoi</a>
      <a href="#moderation"><span class="n">4</span> Modération vidéos</a>
      <a href="#messages-signales"><span class="n">5</span> Messages signalés</a>
      <a href="#fidelite"><span class="n">6</span> Fidélité (Échos)</a>
      <a href="#cadeaux"><span class="n">7</span> Cadeaux &amp; tirages</a>
      <a href="#mediatheque"><span class="n">8</span> Médiathèque</a>
      <a href="#reglages"><span class="n">9</span> Réglages Challenge</a>
      <a href="#formats"><span class="n">10</span> Formats de challenge</a>
      <a href="#challenges"><span class="n">11</span> Challenges</a>
      <a href="#appel"><span class="n">12</span> Ouvrir un appel</a>
      <a href="#publicite"><span class="n">13</span> Publicité</a>
      <a href="#sport"><span class="n">14</span> Sport</a>
      <a href="#taxonomie"><span class="n">15</span> Taxonomie</a>
      <a href="#communiquer"><span class="n">16</span> Communiquer</a>
      <a href="#messages"><span class="n">17</span> Messages</a>
      <a href="#stats"><span class="n">18</span> Statistiques</a>
      <a href="#monitoring"><span class="n">19</span> Monitoring</a>
    </div>
  </nav>

  <!-- CONTENU -->
  <main class="content">

    <div class="hero" id="intro">
      <span class="kicker">Poste administrateur</span>
      <h1>Piloter l'Arène, en confiance</h1>
      <p>Ce guide passe en revue chaque menu de la barre latérale admin, du Dashboard au Monitoring. Pour chacun : à quoi il sert, comment l'utiliser pas à pas, et les pièges à éviter. Tu restes le visage de Diki&#8209;Diki — chaleureux avec les talents, rigoureux avec l'argent.</p>

      <div class="goldrules">
        <div class="rule"><h3><span class="dot" style="background:var(--danger)"></span>L'argent, avec prudence</h3><p>Commission, répartitions, recharges, retraits : on ne change rien à la légère. Règle sacrée : on ne distribue jamais plus que ce qui est collecté.</p></div>
        <div class="rule"><h3><span class="dot" style="background:var(--accent)"></span>Les objectifs, ton domaine</h3><p>Les objectifs à collecter se posent dans « Formats de challenge ». Un objectif d'étape n'est jamais un montant « à gagner ».</p></div>
        <div class="rule"><h3><span class="dot" style="background:var(--magenta)"></span>Rien ne se supprime vite</h3><p>Suppression = souvent irréversible. On bannit avant de supprimer un compte, et on vérifie toujours deux fois.</p></div>
      </div>

      <p style="margin-top:16px"><b>Accès.</b> Connecte-toi avec ton compte administrateur (double-facteur activé). La barre latérale de gauche est ta navigation. Un <b>modérateur</b> voit les mêmes menus mais avec des droits plus limités que l'<b>administrateur</b>.</p>

      <div class="legend">
        <span><b>Codes couleur des pièges :</b></span>
        <span><span class="tag money">💰 Argent</span> touche des sommes réelles</span>
        <span><span class="tag law">⚖️ Juridique</span> cadre loterie/jeux</span>
        <span><span class="tag safe">✓ Sans risque</span> aucune incidence financière</span>
      </div>
    </div>

    <!-- 1 -->
    <section class="menu" id="dashboard">
      <div class="mhead"><div class="micon">🏠</div><div class="mtitle"><h2>1 · Dashboard <span class="tag safe">✓ Sans risque</span></h2><span class="path">/admin</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Ta page d'accueil et ton tableau de pilotage. Elle donne l'état général de l'Arène d'un coup d'œil et des raccourcis vers les actions courantes.</p>
      <div class="sub">Ce que tu y trouves</div>
      <ul>
        <li>Les <b>compteurs</b> : challenges <i>En cours</i>, <i>À venir</i>, <i>Terminés</i>, et le <i>total des votes</i>.</li>
        <li>Des <b>raccourcis</b> rapides : Modération vidéos, Statistiques, Utilisateurs.</li>
        <li>La <b>liste des challenges récents</b>, avec une pastille de statut (⚔️ En cours, 📝 En formation, 🏁 Terminé).</li>
      </ul>
      <div class="sub">Comment faire</div>
      <ol>
        <li>Lis les compteurs pour prendre la température de la plateforme.</li>
        <li>Clique un raccourci ou un challenge de la liste pour aller droit à l'action.</li>
      </ol>
      <div class="tip">C'est une vue de <b>pilotage</b> : on y lit, on ne modifie pas d'argent. Commence ta journée ici.</div>
    </section>

    <!-- 2 -->
    <section class="menu" id="utilisateurs">
      <div class="mhead"><div class="micon">👥</div><div class="mtitle"><h2>2 · Utilisateurs <span class="tag money">💰 Prudence</span></h2><span class="path">/admin/utilisateurs</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Gérer les comptes de la communauté : candidats et votants. Rechercher une personne, consulter son profil, intervenir sur son compte.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li><b>Rechercher</b> : par nom, e-mail ou pays dans la barre de recherche.</li>
        <li><b>✏️ Modifier le profil</b> : corriger les informations d'un compte (nom, pays, pseudo…).</li>
        <li><b>Envoyer un message</b> : notification in-app + e-mail (ex. message de bienvenue).</li>
        <li><b>Bannir</b> un compte problématique : il passe au statut « banni » et ne peut plus agir.</li>
        <li><b>Réactiver</b> : repasser un compte banni en « actif ».</li>
        <li><b>Supprimer définitivement</b> : seulement <b>après</b> l'avoir banni.</li>
      </ul>
      <div class="warn"><b>⚠️ Pièges.</b> La <b>suppression est irréversible</b> et exige un bannissement préalable. On ne touche <b>jamais</b> aux mots de passe. Tous les comptes doivent être <b>majeurs (18+)</b>.</div>
    </section>

    <!-- 3 -->
    <section class="menu" id="activite">
      <div class="mhead"><div class="micon">🧭</div><div class="mtitle"><h2>3 · Qui fait quoi <span class="tag safe">✓ Sans risque</span></h2><span class="path">/admin/activite</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Voir, par utilisateur, sa contribution réelle à la plateforme : utile pour repérer les membres actifs et détecter les comportements suspects.</p>
      <div class="sub">Ce que tu y vois</div>
      <ul>
        <li>📣 <b>Appels créés</b> par la personne.</li>
        <li>🎵 <b>Morceaux ajoutés</b> à la médiathèque.</li>
        <li>🖼️ <b>Affiches générées</b> : total, valides et <b>suspectes</b>.</li>
      </ul>
      <div class="sub">Comment faire</div>
      <ol><li>Tape un nom, un e-mail ou un titre dans la recherche pour filtrer l'activité.</li></ol>
      <div class="tip">Les affiches <b>suspectes</b> (non rattachées à un vrai challenge) <b>ne rapportent aucun Écho</b> : c'est un garde-fou anti-triche. Cet écran t'aide à les repérer.</div>
    </section>

    <!-- 4 -->
    <section class="menu" id="moderation">
      <div class="mhead"><div class="micon">🎬</div><div class="mtitle"><h2>4 · Modération vidéos <span class="tag safe">✓ Sans risque</span></h2><span class="path">/admin/moderation</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Contrôler chaque vidéo soumise <b>avant</b> qu'elle apparaisse publiquement dans l'Arène.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li><b>Approuver</b> : la vidéo devient visible et entre en compétition.</li>
        <li><b>Refuser</b> : choisis un <b>motif</b> — non conforme aux CGU, discipline mal renseignée, qualité insuffisante, durée dépassée, visage non visible, contenu violent/offensant, titre/description manquant, ou « Autre ». Le candidat reçoit ce motif.</li>
        <li><b>Supprimer définitivement</b> une vidéo déjà en ligne.</li>
      </ul>
      <div class="warn"><b>⚠️ Pièges.</b> La suppression est <b>irréversible</b>. Un refus demande un motif clair. Reste <b>respectueux</b> : Diki&#8209;Diki récompense l'authenticité, jamais d'élimination humiliante.</div>
    </section>

    <!-- 5 -->
    <section class="menu" id="messages-signales">
      <div class="mhead"><div class="micon">🚩</div><div class="mtitle"><h2>5 · Messages signalés <span class="tag safe">✓ Sans risque</span></h2><span class="path">/admin/messages-signales</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Modérer la messagerie interne entre membres : traiter les messages signalés par les utilisateurs et ceux détectés automatiquement.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li>Filtre <b>Tous</b> / <b>🚩 Signalés</b> (signalés par les membres) et repère les ⚠️ auto-détectés (spam, tentative de contournement).</li>
        <li>Lis le motif et les pseudos concernés.</li>
        <li>Clique <b>« Marquer traité »</b> une fois la situation réglée.</li>
      </ul>
      <div class="tip">Flux <b>sans argent</b>. Agis vite sur les tentatives de contournement (échange de numéros, incitations hors plateforme).</div>
    </section>

    <!-- 6 -->
    <section class="menu" id="fidelite">
      <div class="mhead"><div class="micon">🎖️</div><div class="mtitle"><h2>6 · Fidélité (Échos) <span class="tag safe">✓ Sans argent</span></h2><span class="path">/admin/gamification</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Piloter le programme de reconnaissance des votants, « Les Échos ». Les Échos ne sont <b>ni de l'argent ni des votes</b> : c'est une couche d'engagement, totalement séparée de la cagnotte.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li><b>Interrupteur maître</b> : <b>Activer</b> / <b>Désactiver</b> tout le programme en un clic.</li>
        <li>Régler le <b>barème</b> : Échos par vote payant (étoile = 1, cœur = 2 par défaut), Parrainage, Partage vérifié, Commentaire vérifié, et le <b>plafond du coup de pouce gratuit (%)</b>.</li>
        <li><b>Enregistrer le barème</b> pour appliquer.</li>
      </ul>
      <div class="tip">Entièrement <b>réversible</b>. Aujourd'hui, seuls le <b>vote</b>, l'<b>affiche valide</b> et le <b>commentaire</b> créditent réellement des Échos. Parrainage et partage « générique » sont au barème mais pas encore branchés.</div>
    </section>

    <!-- 7 -->
    <section class="menu" id="cadeaux">
      <div class="mhead"><div class="micon">🎁</div><div class="mtitle"><h2>7 · Cadeaux &amp; tirages <span class="tag money">💰 Argent</span> <span class="tag law">⚖️ Juridique</span></h2><span class="path">/admin/cadeaux</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Gérer le <b>Fonds Cadeaux</b> et organiser les <b>tirages</b> qui récompensent les votants fidèles. Les cadeaux sont <b>matériels</b> — jamais du cash.</p>
      <div class="sub">Comment faire</div>
      <ol>
        <li><b>Lis les pots</b> : la réserve totale, le pot <b>Local</b> (60 %, petits cadeaux de saison) et le pot <b>Grand</b> (40 %, gros lots). La réserve se remplit toute seule (10 % de chaque cagnotte de challenge terminé).</li>
        <li><b>Remplis le catalogue</b> : ajoute des cadeaux « Mensuel (local) » (par mois) et des « Grand lot », chacun avec sa <b>valeur cible</b>.</li>
        <li><b>Prépare un tirage</b> (fin de saison) : choisis le type et la saison, puis « Préparer » → ça fige la liste des éligibles et publie une <b>empreinte</b> (preuve d'honnêteté).</li>
        <li><b>Exécute</b> : ouvre le détail, coche les lots (1 lot = 1 gagnant), puis « Exécuter » → la graine est révélée et les gagnants désignés de façon <b>vérifiable</b>.</li>
        <li><b>Remets les cadeaux</b> : chaque gagnant est « À remettre » ; après remise de l'objet, bascule sur « Remis ».</li>
      </ol>
      <div class="warn"><b>⚠️ Pièges.</b> <b>Argent réel + cadre juridique loterie.</b> On ne peut pas lancer un tirage dont les lots dépassent le pot disponible. <b>Jamais de cash</b> : uniquement des objets. Éligibilité des gagnants : votants ayant validé la saison (dès « Le Messager »).</div>
    </section>

    <!-- 8 -->
    <section class="menu" id="mediatheque">
      <div class="mhead"><div class="micon">🎵</div><div class="mtitle"><h2>8 · Médiathèque <span class="tag safe">✓ Sans risque</span></h2><span class="path">/admin/mediatheque</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Gérer la bibliothèque de <b>morceaux imposés</b> utilisés dans les challenges musique et danse.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li><b>Rechercher via Deezer</b> : les champs (artiste, titre…) se pré-remplissent automatiquement.</li>
        <li><b>Vérifier</b> les champs pré-remplis, puis <b>Ajouter</b> le morceau.</li>
        <li><b>Modifier</b> ou <b>Supprimer</b> un morceau existant.</li>
      </ul>
      <div class="tip">Vérifie toujours les champs venus de Deezer avant d'ajouter. <b>Artiste et titre sont obligatoires.</b></div>
    </section>

    <!-- 9 -->
    <section class="menu" id="reglages">
      <div class="mhead"><div class="micon">⚙️</div><div class="mtitle"><h2>9 · Réglages Challenge <span class="tag money">💰 Argent</span></h2><span class="path">/admin/reglages</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Les réglages généraux de l'Arène, <b>y compris ceux qui touchent l'argent</b>.</p>
      <div class="sub">Ce que tu peux régler</div>
      <ul>
        <li>La <b>commission de la plateforme (%)</b>.</li>
        <li>Les <b>répartitions du podium</b> : C2/C4 (1 lauréat), C8 (2 lauréats), C12/C16 (3 lauréats).</li>
        <li>Le <b>prix de l'étoile et du cœur</b>.</li>
        <li>Des réglages d'ambiance : lien de la chaîne YouTube, effet lumineux de l'étoile du logo, vidéo de bienvenue, bandeau d'accueil…</li>
      </ul>
      <div class="warn"><b>⚠️ Pièges.</b> La <b>commission</b> et les <b>répartitions</b> modifient les <b>gains réels</b> des candidats. Ne les change qu'en pleine connaissance de cause, idéalement après préparation et validation. Rappelle-toi l'invariant : on ne distribue jamais plus que ce qui est collecté.</div>
    </section>

    <!-- 10 -->
    <section class="menu" id="formats">
      <div class="mhead"><div class="micon">🏆</div><div class="mtitle"><h2>10 · Formats de challenge <span class="tag money">💰 Argent</span></h2><span class="path">/admin/formats</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Définir les paramètres de chaque format (C2 → C16) : c'est <b>ici</b> que tu poses tes objectifs de collecte.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li>Pour un format : modifier le <b>libellé</b>, l'<b>objectif à collecter</b>, le <b>nombre d'étapes</b> et le <b>nombre de vidéos</b>, puis <b>Enregistrer</b>.</li>
        <li><b>Activer / Désactiver</b> un format pour l'ouvrir ou le fermer aux créations.</li>
      </ul>
      <div class="warn"><b>⚠️ Pièges.</b> Les <b>objectifs de collecte sont ton domaine exclusif</b> — personne d'autre ne les fixe. Et attention : un <b>objectif n'est pas un gain</b>, c'est le seuil qui déclenche la fermeture d'une étape. Garde la cohérence entre nombre d'étapes et nombre de vidéos.</div>
    </section>

    <!-- 11 -->
    <section class="menu" id="challenges">
      <div class="mhead"><div class="micon">📋</div><div class="mtitle"><h2>11 · Challenges <span class="tag money">💰 Prudence</span></h2><span class="path">/admin/challenges</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>La vue d'ensemble de <b>tous les challenges</b> et de leur cycle de vie : appel, inscriptions ouvertes, en cours, terminé.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li>Filtrer et parcourir les challenges par statut.</li>
        <li><b>Éditer</b> un challenge (ça ouvre l'écran « Ouvrir un appel » pré-rempli).</li>
        <li><b>Supprimer</b> un challenge.</li>
      </ul>
      <div class="warn"><b>⚠️ Pièges.</b> Supprimer un challenge est <b>irréversible</b>. Sois particulièrement prudent avec un challenge qui a déjà une <b>cagnotte en cours</b> : vérifie toujours avant d'agir.</div>
    </section>

    <!-- 12 -->
    <section class="menu" id="appel">
      <div class="mhead"><div class="micon">📣</div><div class="mtitle"><h2>12 · Ouvrir un appel <span class="tag safe">✓ Création</span></h2><span class="path">/admin/challenges/creer-appel</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Créer (ou éditer) un <b>appel à candidats</b> en tant que modérateur, sans avoir à concourir toi-même. C'est l'outil d'amorçage du contenu.</p>
      <div class="sub">Comment faire</div>
      <ol>
        <li>Choisis la <b>discipline</b> et la <b>catégorie</b> (ex. Danse, Chant, Humour, un sport…).</li>
        <li>Choisis le <b>format</b> (C2 → C16), le <b>modèle</b> (Parcours ou Bloc groupé) et la <b>formation</b> (solo / groupe).</li>
        <li>Saisis les <b>morceaux ou sujets imposés</b> — une entrée par vidéo.</li>
        <li>Utilise « <b>Relire l'objectif depuis la taxonomie</b> » pour vérifier le montant, puis <b>Enregistre</b>.</li>
      </ol>
      <div class="warn"><b>⚠️ Règle d'unicité.</b> Deux challenges sont « identiques » s'ils partagent <b>formation + discipline + modèle + format</b>. Pour un 2ᵉ challenge d'une même discipline, fais varier l'un de ces axes (le morceau ne suffit pas). L'objectif vient des <b>Formats</b> (ton domaine).</div>
    </section>

    <!-- 13 -->
    <section class="menu" id="publicite">
      <div class="mhead"><div class="micon">📣</div><div class="mtitle"><h2>13 · Publicité <span class="tag money">💰 Recette</span></h2><span class="path">/admin/publicite</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>La régie publicitaire : gérer les annonceurs et leurs encarts. C'est une <b>recette séparée de la cagnotte</b>.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li><b>Ajouter</b> une publicité : nom de l'entreprise (annonceur), visuel, lien…</li>
        <li><b>Activer / désactiver</b>, <b>modifier</b> ou <b>supprimer</b> une annonce.</li>
      </ul>
      <div class="tip">L'argent de la publicité ne se mélange <b>jamais</b> à la cagnotte des votes. L'affichage interstitiel pour les spectateurs et la conformité HAAC/TVA restent à finaliser.</div>
    </section>

    <!-- 14 -->
    <section class="menu" id="sport">
      <div class="mhead"><div class="micon">🥋</div><div class="mtitle"><h2>14 · Sport <span class="tag safe">✓ Sans risque</span></h2><span class="path">/admin/sport</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Gérer le catalogue des <b>épreuves sportives</b>. Un sport apparaît sur la plateforme dès qu'il a au moins une épreuve.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li><b>Ajouter une épreuve</b> : sport, épreuve et libellé sont obligatoires.</li>
        <li><b>Modifier</b> ou <b>supprimer</b> une épreuve.</li>
      </ul>
      <div class="tip">Aucun code nécessaire : créer une épreuve suffit à faire apparaître sa discipline sportive côté candidats.</div>
    </section>

    <!-- 15 -->
    <section class="menu" id="taxonomie">
      <div class="mhead"><div class="micon">🗂️</div><div class="mtitle"><h2>15 · Taxonomie <span class="tag safe">✓ Structure</span></h2><span class="path">/admin/taxonomie</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>L'ossature du catalogue : <b>catégories</b>, <b>disciplines</b> et <b>champs</b>. C'est la structure sur laquelle s'appuient les appels et les objectifs « miroir ».</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li><b>Ajouter / supprimer</b> une catégorie, une discipline.</li>
        <li><b>Ajouter un champ</b> en précisant son <b>ordre</b> d'affichage.</li>
      </ul>
      <div class="tip">Si un ajout échoue avec « ordre déjà pris », choisis un numéro d'ordre libre. La taxonomie alimente directement l'écran « Ouvrir un appel ».</div>
    </section>

    <!-- 16 -->
    <section class="menu" id="communiquer">
      <div class="mhead"><div class="micon">📢</div><div class="mtitle"><h2>16 · Communiquer <span class="tag safe">✓ Public</span></h2><span class="path">/admin/ticker</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Gérer les <b>bandes défilantes</b> (annonces qui défilent sur le site public).</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li><b>Ajouter</b> un message (ex. « Bienvenue sur Diki&#8209;Diki ! »).</li>
        <li><b>Modifier</b>, <b>supprimer</b>, et <b>réordonner</b> les messages (puis enregistrer l'ordre).</li>
      </ul>
      <div class="tip">Ces messages sont <b>publics</b> : soigne le ton panafricain et chaleureux, et n'annonce jamais de gain fixe ni de montant « à gagner ».</div>
    </section>

    <!-- 17 -->
    <section class="menu" id="messages">
      <div class="mhead"><div class="micon">✉️</div><div class="mtitle"><h2>17 · Messages <span class="tag safe">✓ Sans risque</span></h2><span class="path">/admin/contact</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>La boîte des <b>messages de contact</b> envoyés depuis le site, avec une corbeille.</p>
      <div class="sub">Comment faire</div>
      <ul>
        <li><b>Lire</b> et <b>répondre</b> (le sujet se préfixe « Re: »).</li>
        <li><b>Mettre à la corbeille</b>, <b>restaurer</b>, ou <b>supprimer définitivement</b>.</li>
      </ul>
      <div class="warn"><b>⚠️ Piège.</b> La <b>suppression définitive</b> (depuis la corbeille) est irréversible. Les envois passent par Resend ; les réponses arrivent sur l'adresse de support configurée.</div>
    </section>

    <!-- 18 -->
    <section class="menu" id="stats">
      <div class="mhead"><div class="micon">📊</div><div class="mtitle"><h2>18 · Statistiques <span class="tag safe">✓ Lecture</span></h2><span class="path">/admin/stats</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>Le tableau de bord chiffré, en temps réel, pour piloter la croissance.</p>
      <div class="sub">Ce que tu y lis</div>
      <ul>
        <li><b>Audience</b> : actifs maintenant, connectés, visiteurs, vues du jour.</li>
        <li><b>Argent</b> : votes totaux, revenus plateforme, cagnotte nette.</li>
        <li><b>Activité</b> : vidéos en attente, challenges en cours. Onglets <b>Soumettre</b> / <b>Compétitions</b>.</li>
      </ul>
      <div class="tip">Ne confonds pas <b>« revenus plateforme »</b> (ta part) et <b>« cagnotte nette »</b> (ce qui revient aux candidats). Cet écran est ton meilleur allié pendant l'amorçage.</div>
    </section>

    <!-- 19 -->
    <section class="menu" id="monitoring">
      <div class="mhead"><div class="micon">📈</div><div class="mtitle"><h2>19 · Monitoring <span class="tag safe">✓ Technique</span></h2><span class="path">/admin/monitoring</span></div></div>
      <div class="sub">À quoi ça sert</div>
      <p>La santé technique de l'infrastructure : le « tableau de bord moteur » de la plateforme.</p>
      <div class="sub">Ce que tu y surveilles</div>
      <ul>
        <li><b>Stockage total</b> et nombre de <b>vidéos</b> (+ vues cumulées).</li>
        <li><b>Utilisateurs</b> (+ OTP envoyés / vérifiés), <b>votes</b>, <b>brackets</b>.</li>
        <li><b>Transactions</b> : réussies et montant, <b>commission encaissée</b>.</li>
        <li>Bouton <b>Rafraîchir</b> pour une lecture à l'instant T.</li>
      </ul>
      <div class="tip">Garde un œil sur le <b>stockage</b> (les vidéos pèsent lourd) et sur le ratio de <b>transactions réussies</b> : une chute soudaine signale souvent un souci côté opérateur de paiement.</div>
    </section>

    <div class="foot">
      <p><b>En cas de doute sur une règle d'argent</b>, reste prudent : oriente vers les règles officielles plutôt que d'improviser un chiffre. Trois portes à ne jamais forcer : le feu vert juridique avant un grand lancement, une boucle d'argent prouvée avant d'ouvrir en grand, et un tirage qui ne dépasse jamais le pot disponible.</p>
      <p>Manuel de gestion du poste administrateur — Diki&#8209;Diki, l'Arène Culturelle Panafricaine.</p>
    </div>

  </main>
</div>`;

export default function AdminManuelPage() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current as any;
    if (!host || host.shadowRoot) return;
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = MANUEL_INNER;

    const systemDark = () => !!(window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches);
    const current = () => { const t = host.getAttribute('data-theme'); return t ? t : (systemDark() ? 'dark' : 'light'); };
    const btn = sr.getElementById('themeBtn');
    const ico = sr.getElementById('themeIco');
    const txt = sr.getElementById('themeTxt');
    const paint = () => { const dark = current() === 'dark'; if (ico) ico.textContent = dark ? '\u2600\uFE0F' : '\uD83C\uDF19'; if (txt) txt.textContent = dark ? 'Clair' : 'Sombre'; };
    try { const saved = localStorage.getItem('dkdk_manuel_theme'); if (saved) host.setAttribute('data-theme', saved); } catch (e) {}
    paint();
    if (btn) btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      host.setAttribute('data-theme', next);
      try { localStorage.setItem('dkdk_manuel_theme', next); } catch (e) {}
      paint();
    });

    const links = Array.prototype.slice.call(sr.querySelectorAll('.toc a'));
    links.forEach((a: any) => {
      a.addEventListener('click', (ev: Event) => {
        ev.preventDefault();
        const id = (a.getAttribute('href') || '').slice(1);
        const tgt = sr.getElementById(id);
        if (tgt) tgt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    const map: any = {}; links.forEach((a: any) => { map[(a.getAttribute('href') || '').slice(1)] = a; });
    try {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { links.forEach((a: any) => a.classList.remove('on')); const a = map[(en.target as any).id]; if (a) a.classList.add('on'); } });
      }, { root: host, rootMargin: '-15% 0px -75% 0px', threshold: 0 });
      sr.querySelectorAll('section.menu, #intro').forEach((s: any) => obs.observe(s));
    } catch (e) {}
  }, []);

  return (
    <AdminGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
        <AdminSidebar />
        <div ref={ref} style={{ flex: 1, minWidth: 0, height: '100vh', overflow: 'auto' }} />
      </div>
    </AdminGuard>
  );
}
