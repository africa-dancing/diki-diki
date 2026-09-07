'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

const SOLID = 'linear-gradient(135deg,#FF6B00,#FFD700)';
const ON_ACCENT = '#150c00';
const HERO = 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))';

// Constantes par format (max_participants) : objectif à réunir / étape,
// nombre de champions, partage du podium, prime de participation.
interface FormatCfg { objectif: number; champions: number; podium: string; prime: string; }
const FORMATS: Record<number, FormatCfg> = {
  2:  { objectif: 2500000,  champions: 1, podium: '100 %',              prime: '20 %' },
  4:  { objectif: 4000000,  champions: 2, podium: '65 % / 35 %',        prime: '20 %' },
  6:  { objectif: 5000000,  champions: 3, podium: '60 % / 25 % / 15 %', prime: '20 %' },
  8:  { objectif: 7000000,  champions: 3, podium: '60 % / 25 % / 15 %', prime: '20 %' },
  12: { objectif: 9000000,  champions: 3, podium: '60 % / 25 % / 15 %', prime: '20 %' },
  16: { objectif: 15000000, champions: 3, podium: '60 % / 25 % / 15 %', prime: '20 %' },
};
function cfgFor(n: number): FormatCfg {
  return FORMATS[n] ?? { objectif: 0, champions: 1, podium: '100 %', prime: '20 %' };
}

interface Etape {
  round_number: number;
  libelle: string;
  track_titre: string | null;
  track_artiste: string | null;
}
interface Appel {
  id: string;
  title: string | null;
  discipline: string | null;
  modele: string | null;
  max_participants: number;
  appel_deadline: string | null;
  createur_nom: string | null;
  createur_pays: string | null;
  officiel?: boolean;
  acceptes: number;
  en_revision: number;
  en_attente: number;
  etapes: Etape[];
}
interface Aggregates {
  appels_ouverts: number;
  places_a_saisir: number;
  candidats_engages: number;
  disciplines: number;
}

function fmt(n: number): string {
  return (n ?? 0).toLocaleString('fr-FR');
}

// Initiales à partir d'un nom (2 lettres max).
function initials(source: string | null | undefined): string {
  const s = (source ?? '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Badge compte à rebours à partir de la deadline ISO.
function countdown(deadline: string | null): string {
  if (!deadline) return 'Appel ouvert';
  const end = new Date(deadline).getTime();
  if (isNaN(end)) return 'Appel ouvert';
  const diff = end - Date.now();
  if (diff <= 0) return 'Appel clos';
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `Ferme dans ${Math.max(1, h)} h`;
  const j = Math.round(h / 24);
  return `Ferme dans ${j} j`;
}

export default function MurDesAppelsPage() {
  const [appels, setAppels]         = useState<Appel[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);

  useEffect(() => {
    fetch(`${API}/brackets/appels`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        setAppels(d?.data?.appels ?? []);
        setAggregates(d?.data?.aggregates ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)',
      fontFamily: 'DM Sans, sans-serif', paddingBottom: 80,
    }}>
      <Navbar />

      {/* HERO — halo magenta collé à la barre + panneau compact (aligné sur /challenges) */}
      <div style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', paddingTop: 8 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 4px' }}>
          <section style={{
            background: HERO, border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '20px',
            textAlign: 'center', color: '#fff', boxShadow: '0 8px 40px rgba(225,29,143,0.35)',
          }}>
            <span style={{
              display: 'inline-block', background: SOLID, color: ON_ACCENT,
              fontWeight: 800, fontSize: 11, letterSpacing: '0.16em',
              textTransform: 'uppercase', padding: '5px 12px', borderRadius: 6,
            }}>Rejoins l&apos;Arène</span>
            <h1 style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, lineHeight: 1.1,
              margin: '12px 0 8px', color: '#fff',
            }}>Le Mur des appels</h1>
            <p style={{
              color: 'rgba(255,255,255,0.9)', fontSize: 13, maxWidth: '46ch',
              margin: '0 auto', lineHeight: 1.5,
            }}>
              Un artiste lance son challenge et fixe les morceaux, étape par étape.
              À toi d&apos;accepter… ou de proposer mieux.
            </p>
          </section>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>

        {/* AGRÉGATS */}
        {aggregates && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10,
            margin: '18px 0',
          }}>
            <StatBox value={aggregates.appels_ouverts} label="appels ouverts" />
            <StatBox value={aggregates.places_a_saisir} label="places à saisir" highlight />
            <StatBox value={aggregates.candidats_engages} label="candidats engagés" />
            <StatBox value={aggregates.disciplines} label="disciplines" />
          </div>
        )}

        {/* COMMENT ÇA MARCHE */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10,
          margin: '20px 0 10px',
        }}>
          <HowStep n="1 · Le créateur" text="fixe les morceaux de chaque étape et publie son appel." />
          <HowStep n="2 · Toi" text="tu cliques Accepter, ou tu demandes une révision d'une étape." />
          <HowStep n="3 · Tous d'accord" text="une seule décision par étape, et le challenge démarre." />
        </div>

        {/* LANCE TON PROPRE APPEL */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 26px',
          background: 'linear-gradient(180deg,rgba(255,170,0,0.12),rgba(255,107,0,0.04))',
          border: '1px dashed rgba(255,140,0,0.5)', borderRadius: 14, padding: '14px 16px',
        }}>
          <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--or)', lineHeight: 1 }}>＋</span>
          <div style={{ flex: 1 }}>
            <b style={{ fontWeight: 700, fontSize: 15 }}>Lance ton propre appel</b>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Choisis ta discipline, tes morceaux par étape, et invite l&apos;Afrique.
            </span>
          </div>
          <Link href="/challenges/creer" style={{
            textDecoration: 'none', background: SOLID, color: ON_ACCENT,
            fontWeight: 700, borderRadius: 10, fontSize: 13.5,
            padding: '10px 16px', whiteSpace: 'nowrap',
          }}>Créer</Link>
        </div>

        {/* LABEL SECTION */}
        <div style={{
          fontWeight: 700, fontSize: 12, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--or)',
          margin: '8px 4px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span>Appels ouverts</span>
          <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        {/* ÉTATS */}
        {loading && (
          <p style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: '30px 0' }}>
            Chargement…
          </p>
        )}

        {!loading && error && (
          <p style={{ color: 'var(--ink-dim)', textAlign: 'center', padding: '24px 0', fontSize: 13.5 }}>
            Impossible de charger les appels pour le moment. Réessaie un peu plus tard.
          </p>
        )}

        {!loading && !error && appels.length === 0 && (
          <EmptyState />
        )}

        {!loading && !error && appels.map(a => <AppelCard key={a.id} appel={a} />)}

        <footer style={{
          margin: '26px auto 0', color: 'var(--ink-dim)', fontSize: 12,
          textAlign: 'center', lineHeight: 1.6,
        }}>
          Les montants affichés sont des <b style={{ color: 'var(--ink-soft)' }}>objectifs à réunir</b> en votes,
          jamais des gains promis. Ton gain dépend du soutien du public.
        </footer>

      </div>
    </div>
  );
}

/* ---------- Sous-composants ---------- */

function StatBox({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(180deg,rgba(255,170,0,0.14),rgba(255,107,0,0.05))' : 'var(--surface)',
      border: highlight ? '1px solid rgba(255,140,0,0.45)' : '1px solid var(--line)',
      borderRadius: 12, padding: '13px 8px', textAlign: 'center',
    }}>
      <div style={{
        fontWeight: 800, fontSize: highlight ? 24 : 22,
        color: highlight ? 'var(--or)' : 'var(--ink)', lineHeight: 1.1,
      }}>{fmt(value)}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function HowStep({ n, text }: { n: string; text: string }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 12, padding: '13px 12px',
    }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--or)', letterSpacing: '0.05em' }}>{n}</div>
      <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>{text}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px dashed var(--line-strong)',
      borderRadius: 16, padding: '40px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 34, marginBottom: 10 }}>📣</div>
      <h2 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 8px', color: 'var(--ink)' }}>
        Aucun appel ouvert pour le moment
      </h2>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14, maxWidth: '42ch', margin: '0 auto 20px', lineHeight: 1.5 }}>
        L&apos;Arène attend son prochain créateur. Sois le premier à lancer un appel,
        fixe tes morceaux et invite le continent à te rejoindre.
      </p>
      <Link href="/challenges/creer" style={{
        display: 'inline-block', textDecoration: 'none', background: SOLID,
        color: ON_ACCENT, fontWeight: 700, borderRadius: 10, fontSize: 14,
        padding: '12px 22px',
      }}>Créer un challenge</Link>
    </div>
  );
}

function AppelCard({ appel }: { appel: Appel }) {
  const cfg     = cfgFor(appel.max_participants);
  const officiel = !!appel.officiel;
  const nom     = officiel ? 'Création' : (appel.createur_nom || 'Créateur');
  const ava     = officiel ? 'DKM' : initials(appel.createur_nom || appel.title || 'Créateur');
  const disc    = appel.discipline || 'talent';
  const nEtapes = appel.etapes?.length ?? 0;
  const cd    = countdown(appel.appel_deadline);
  const open  = cd !== 'Appel clos';
  const pct   = appel.max_participants > 0
    ? Math.min(100, Math.round((appel.acceptes / appel.max_participants) * 100))
    : 0;

  return (
    <article style={{
      background: 'linear-gradient(180deg,var(--surface2),var(--surface))',
      border: open ? '1px solid rgba(255,150,0,0.4)' : '1px solid var(--line)',
      borderRadius: 16, padding: 20, marginBottom: 16,
      position: 'relative', overflow: 'hidden',
      boxShadow: open ? '0 0 0 1px rgba(255,150,0,0.12),0 24px 60px -30px rgba(237,28,36,0.35)' : 'none',
    }}>
      {open && (
        <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: SOLID }} />
      )}

      {/* Ligne créateur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flex: 'none',
          display: 'grid', placeItems: 'center', fontWeight: 800,
          fontSize: officiel ? 13 : 16,
          color: officiel ? ON_ACCENT : 'var(--ink)',
          background: officiel ? SOLID : 'var(--surface2)',
          border: officiel ? 'none' : '1px solid var(--line-strong)',
        }}>{ava}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <b style={{ fontWeight: 700, fontSize: 16 }}>{nom}</b>
            {officiel && (
              <span style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: ON_ACCENT, background: SOLID, borderRadius: 6, padding: '2px 7px',
              }}>Officiel</span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            {officiel
              ? 'Publication officielle · Diki-Diki'
              : `Créateur${appel.createur_pays ? ` · ${appel.createur_pays}` : ''}`}
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          color: open ? 'var(--or)' : 'var(--ink-dim)',
          border: `1px solid ${open ? 'rgba(255,170,0,0.4)' : 'var(--line)'}`,
          background: open ? 'rgba(255,170,0,0.12)' : 'var(--surface)',
          borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap',
        }}>{cd}</span>
      </div>

      {/* Phrase d'invite */}
      <p style={{ fontSize: 15.5, lineHeight: 1.5, margin: '16px 0 4px' }}>
        <span style={{ fontSize: 20, verticalAlign: -2 }}>🎧</span>{' '}
        {officiel
          ? <>Défi <b>officiel Diki-Diki</b> — challenge de <b>{disc}</b>. Rejoins l&apos;Arène !</>
          : <>Je suis <b>{nom}</b>, et je t&apos;invite dans mon challenge de <b>{disc}</b>.</>}
      </p>

      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0' }}>
        <Chip>Format <b style={{ color: 'var(--or)' }}>C{appel.max_participants}</b></Chip>
        <Chip><b style={{ color: 'var(--or)' }}>{appel.max_participants}</b> candidats</Chip>
        <Chip><b style={{ color: 'var(--or)' }}>{nEtapes}</b> étape{nEtapes > 1 ? 's' : ''}</Chip>
        <Chip>🏆 <b style={{ color: 'var(--green)' }}>{cfg.champions}</b> gagnant{cfg.champions > 1 ? 's' : ''}</Chip>
        <Chip><b style={{ color: 'var(--red)' }}>{appel.max_participants - cfg.champions}</b> éliminé{(appel.max_participants - cfg.champions) > 1 ? 's' : ''}</Chip>
        {appel.modele && <Chip>Modèle <b style={{ color: 'var(--or)' }}>{appel.modele}</b></Chip>}
      </div>

      {/* Morceaux imposés par étape */}
      {nEtapes > 0 && (
        <div style={{ margin: '16px 0', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            fontWeight: 700, fontSize: 11.5, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-soft)',
            padding: '10px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--line)',
          }}>Les morceaux imposés, par étape</div>
          {appel.etapes.map((e, i) => (
            <div key={e.round_number ?? i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              borderBottom: i < appel.etapes.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              <span style={{
                fontWeight: 800, fontSize: 12, color: ON_ACCENT, background: SOLID,
                borderRadius: 7, padding: '5px 8px', whiteSpace: 'nowrap',
              }}>Étape {e.round_number ?? i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                  {e.track_titre || e.libelle}
                </div>
                {(e.track_artiste || (e.track_titre && e.libelle)) && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    {e.track_artiste || e.libelle}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--or)', lineHeight: 1.1 }}>{fmt(cfg.objectif)} F</div>
                <div style={{ fontSize: 10, color: 'var(--ink-dim)', letterSpacing: '.04em', textTransform: 'uppercase' }}>objectif</div>
              </div>
            </div>
          ))}
          {/* Cumul des objectifs (indicatif) */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '11px 14px', background: 'var(--surface)', borderTop: '1px solid var(--line-strong)',
          }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 600 }}>
              Cumul des objectifs · {nEtapes} étape{nEtapes > 1 ? 's' : ''}{' '}
              <span style={{ color: 'var(--ink-dim)' }}>(à titre indicatif)</span>
            </span>
            <b style={{ fontSize: 14.5, color: 'var(--ink)' }}>{fmt(cfg.objectif * nEtapes)} F</b>
          </div>
        </div>
      )}

      {/* Bloc argent (garde-fou : objectif/étape + parts % + prime, jamais un gain fixe) */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'flex-start',
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '13px 14px', margin: '14px 0',
        fontSize: 13, lineHeight: 1.55, color: 'var(--ink-soft)',
      }}>
        <span style={{ fontSize: 17, lineHeight: 1.2 }}>💰</span>
        <div>
          <b style={{ color: 'var(--ink)' }}>Objectif par étape : {fmt(cfg.objectif)} F</b> à réunir en votes.
          À la fin, la cagnotte (moins la commission) est partagée entre les{' '}
          <b style={{ color: 'var(--ink)' }}>{cfg.champions} champion{cfg.champions > 1 ? 's' : ''} — {cfg.podium}</b> —,
          et les éliminés reçoivent une prime. Ton gain dépend du soutien du public.
        </div>
      </div>

      {/* Places */}
      <div style={{ margin: '16px 0 6px' }}>
        <div style={{
          fontWeight: 700, fontSize: 11.5, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'var(--ink-soft)',
          marginBottom: 8, display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Les places</span>
          <span style={{ color: 'var(--ink-dim)' }}>
            {appel.acceptes} acceptée{appel.acceptes > 1 ? 's' : ''} · {appel.max_participants} attendues
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--surface2)', overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: SOLID, borderRadius: 999 }} />
        </div>
      </div>

      {/* Bouton */}
      <Link href={`/challenges/appels/${appel.id}`} style={{
        display: 'block', textAlign: 'center', textDecoration: 'none',
        background: SOLID, color: ON_ACCENT, fontWeight: 700, fontSize: 14,
        borderRadius: 10, padding: 14, marginTop: 16,
      }}>Rejoindre / Voir l&apos;appel</Link>
    </article>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, color: 'var(--ink)',
      background: 'var(--surface2)', border: '1px solid var(--line)',
      borderRadius: 999, padding: '6px 11px',
    }}>{children}</span>
  );
}
