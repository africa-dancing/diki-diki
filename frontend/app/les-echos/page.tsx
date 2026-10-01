'use client';
import Navbar from '../components/Navbar';
import EchoIcon, { StatutEcho } from '../components/EchoIcon';
import Link from 'next/link';

const OR = 'var(--or)';
const OR2 = 'var(--or2)';
const BG = 'var(--bg)';

const s: Record<string, React.CSSProperties> = {
  page:    { background: BG, minHeight: '100vh', color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' },
  hero:    { padding: '40px 24px 30px', background: 'radial-gradient(ellipse 55% 42px at 50% 16px,hsl(339, 98%, 49%) 0%,transparent 72%)', textAlign: 'center' as const },
  badge:   { display: 'inline-block', background: `linear-gradient(90deg,${OR},${OR2})`, color: 'var(--on-accent)', fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '4px 12px', borderRadius: 4, marginBottom: 16, textTransform: 'uppercase' as const },
  h1:      { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 30, color: 'var(--red)', margin: '10px 0 8px', lineHeight: 1.2, textTransform: 'uppercase' as const },
  sub:     { color: 'var(--ink-soft)', fontSize: 15, marginBottom: 0, maxWidth: 620, marginLeft: 'auto', marginRight: 'auto' },
  body:    { maxWidth: 820, margin: '0 auto', padding: '0 24px' },
  h2:      { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: OR, marginTop: 36, marginBottom: 10 },
  p:       { fontSize: 14.5, lineHeight: 1.8, color: 'var(--ink-soft)', margin: '0 0 8px' },
  grid4:   { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 },
  stCard:  { background: 'var(--nav-surface, rgba(255,255,255,0.03))', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 10px', textAlign: 'center' as const },
  stName:  { fontWeight: 800, fontSize: 13.5, marginTop: 10 },
  stMeta:  { color: 'var(--ink-soft)', fontSize: 11.5, marginTop: 2 },
  iconBadge:{ width: 42, height: 42, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: 'radial-gradient(circle at 50% 40%, rgba(255,170,0,0.28), rgba(255,255,255,0.03))', border: '1px solid var(--line)', boxShadow: '0 0 18px rgba(255,170,0,0.25)' },
  grid2:   { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12 },
  liCard:  { border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.5 },
  liStrong:{ fontWeight: 700, color: 'var(--ink)' },
  recomp:  { background: 'linear-gradient(135deg, rgba(126, 3, 128, 0.30), rgba(237,7,15,0.28))', border: '1px solid var(--line)', borderRadius: 12, padding: '20px 22px', marginTop: 20 },
  respo:   { background: 'var(--nav-surface, rgba(255,255,255,0.03))', border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', marginTop: 20 },
  note:    { color: 'var(--ink-soft)', fontSize: 13, marginTop: 10 },
};

type Statut = { emoji: string; nom: string; statut: StatutEcho; saison: string; seuil: string };

const STATUTS: Statut[] = [
  { emoji: '✉️', nom: 'Le Messager',     statut: 'messager',    saison: 'Saison 1', seuil: '15 Échos / mois' },
  { emoji: '🗣️', nom: 'Le Porte-parole', statut: 'porteparole', saison: 'Saison 2', seuil: '30 Échos / mois' },
  { emoji: '🎖️', nom: "L'Ambassadeur",   statut: 'ambassadeur', saison: 'Saison 3', seuil: '45 Échos / mois' },
  { emoji: '📯', nom: 'Le Héraut',       statut: 'heraut',      saison: 'Saison 4', seuil: '60 Échos / mois' },
];

const GAINS = [
  { e: '🗳️', t: 'Voter', v: '+1 Écho par vote payant' },
  { e: '🤝', t: 'Parrainer un ami', v: '+3 Échos — une fois l’ami inscrit et votant' },
  { e: '📣', t: 'Partager (vérifié)', v: '+2 Échos' },
  { e: '💬', t: 'Commenter', v: '+1 Écho' },
];

const AVANTAGES: { statut: StatutEcho; s: string; v: string }[] = [
  { statut: 'messager',    s: 'Dès Le Messager',     v: 'Badge sur ton profil' },
  { statut: 'porteparole', s: 'Dès Le Porte-parole', v: 'Badge à côté de tes soutiens' },
  { statut: 'ambassadeur', s: "Dès L'Ambassadeur",   v: 'Commentaires mis en avant + accès anticipé' },
  { statut: 'heraut',      s: 'Le Héraut',           v: 'Titre honorifique + couleur de pseudo' },
];

export default function LesEchosPage() {
  return (
    <div style={s.page}>
      <Navbar />


      {/* HERO — panneau magenta (aligné sur le Mur des appels) */}
      <div style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', paddingTop: 8 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 4px' }}>
          <section style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '24px 20px', textAlign: 'center', color: '#fff', boxShadow: '0 8px 40px rgba(225,29,143,0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <EchoIcon statut="heraut" size={56} />
            </div>
            <span style={{ display: 'inline-block', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: 'var(--on-accent)', fontWeight: 800, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 6 }}>Programme de fidélité</span>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, lineHeight: 1.1, margin: '12px 0 8px', color: '#fff', textTransform: 'uppercase' }}>Les Échos Diki-Diki</h1>
            <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, maxWidth: '52ch', margin: '0 auto', lineHeight: 1.55 }}>« Chaque soutien te fait résonner. » À chaque vote, un Écho. Plus tu portes les talents, plus ta voix compte dans l'Arène.</p>
          </section>
        </div>
      </div>

      <div style={s.body}>
        {/* C'EST QUOI */}
        <h2 style={s.h2}>C'est quoi, les Échos ?</h2>
        <p style={s.p}>
          <strong style={s.liStrong}>1 vote = 1 Écho.</strong> Les Échos font grandir ton statut et débloquent des avantages.
          Ce ne sont <strong style={s.liStrong}>ni de l'argent ni des votes en plus</strong> : c'est ta réputation de soutien dans l'Arène.
        </p>

        {/* ESCALIER */}
        <h2 style={s.h2}>L'escalier des 4 statuts</h2>
        <p style={s.p}>Une saison dure 3 mois. Ton Écho change de couleur à mesure que tu montes — ta progression, visible en un coup d'œil.</p>
        <div style={s.grid4} className="dkdk-echo-grid4">
          {STATUTS.map((st) => (
            <div key={st.statut} style={s.stCard}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <EchoIcon statut={st.statut} size={42} />
              </div>
              <div style={s.stName}>{st.emoji} {st.nom}</div>
              <div style={s.stMeta}>{st.saison}</div>
              <div style={s.stMeta}>{st.seuil}</div>
            </div>
          ))}
        </div>

        {/* DÉFI DU MOIS */}
        <h2 style={s.h2}>Le défi du mois : les lettres C → B → A</h2>
        <p style={s.p}>
          Atteindre le défi du mois valide une lettre. <strong style={s.liStrong}>3 lettres = saison réussie = montée de statut.</strong> Chaque mois compte, à ton rythme.
        </p>

        {/* COMMENT GAGNER */}
        <h2 style={s.h2}>Comment gagner des Échos</h2>
        <div style={s.grid4} className="dkdk-echo-grid4">
          {GAINS.map((g) => (
            <div key={g.t} style={s.stCard}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <span style={s.iconBadge}>{g.e}</span>
              </div>
              <div style={s.stName}>{g.t}</div>
              <div style={s.stMeta}>{g.v}</div>
            </div>
          ))}
        </div>
        <p style={s.note}>Un coup de pouce gratuit est possible (jusqu'à 20 % du défi), mais l'essentiel reste les votes. Il n'y a jamais de « vote gratuit ».</p>

        {/* AVANTAGES */}
        <h2 style={s.h2}>Tes avantages, statut par statut</h2>
        <div style={s.grid4} className="dkdk-echo-grid4">
          {AVANTAGES.map((a) => (
            <div key={a.s} style={s.stCard}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <EchoIcon statut={a.statut} size={42} />
              </div>
              <div style={s.stName}>{a.s}</div>
              <div style={s.stMeta}>{a.v}</div>
            </div>
          ))}
        </div>

        {/* RÉCOMPENSES — PRUDENT */}
        <div style={s.recomp}>
          <h2 style={{ ...s.h2, marginTop: 0 }}>Et des récompenses ?</h2>
          <p style={s.p}>
            Un programme de récompenses pour les membres les plus fidèles est <strong style={s.liStrong}>en préparation</strong>.
            Il sera dévoilé dès qu'il sera prêt — reste actif pour en faire partie ! <em>(Aucun cadeau garanti ni promis à ce stade.)</em>
          </p>
        </div>

        {/* JEU RESPONSABLE */}
        <div style={s.respo}>
          <h2 style={{ ...s.h2, marginTop: 0 }}>Un jeu responsable</h2>
          <p style={{ ...s.p, marginBottom: 0 }}>
            Diki-Diki n'oblige personne à dépenser. L'encouragement est bienveillant, jamais culpabilisant. Les badges et statuts obtenus ne sont jamais repris. Seuls les votes du public décident du classement des talents.
          </p>
        </div>
      </div>

      <style>{`@media (max-width: 560px){
        .dkdk-echo-grid4 { grid-template-columns: repeat(2, 1fr) !important; }
      }`}</style>
    </div>
  );
}
