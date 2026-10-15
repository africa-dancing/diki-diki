/* app/faq/page.tsx
   DKDK_FAQ — FAQ pilotable depuis l'Admin. Le contenu vient de la base
   (GET /v1/faq) au lieu d'être écrit en dur. Même rendu qu'avant.
   L'item de type 'formats' affiche le tableau des formats EN DIRECT (inchangé).
   Les réponses acceptent : sauts de ligne, **gras**, puces (•) et liens [texte](url). */
'use client';
import Navbar from '../components/Navbar';
import EcouterPage, { lireTexte } from '../components/EcouterPage';/*DKDK_FAQ_NAVBAR_IMPORT*/
import EchosAvantagesBlock from '../components/EchosAvantagesBlock';/*DKDK_FAQ_AVANTAGES_IMPORT*/
import { useState, useEffect, useRef } from 'react';

const OR = 'var(--or)';
const OR2 = 'var(--or2)';
const BG = 'var(--bg)';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/v1';

const s: Record<string, React.CSSProperties> = {
  page:    { background: BG, minHeight: '100vh', color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif", padding: '0 0 80px' },
  divider: { height: 1, background: 'var(--line)', margin: '32px 0' },
  body:    { maxWidth: 760, margin: '0 auto', padding: '0 24px' },
  catTitle:{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: OR, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 12, marginTop: 32 },
  item:    { borderBottom: '1px solid var(--line)', overflow: 'hidden' },
  q:       { width: '100%', background: 'none', border: 'none', color: 'var(--ink)', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, textAlign: 'left' as const, padding: '16px 0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  a:       { fontSize: 14, lineHeight: 1.8, color: 'var(--ink-soft)', padding: '0 0 16px' },
  contact: { background: 'linear-gradient(135deg, rgba(126, 3, 128, 0.52), rgba(237,7,15))', border: '1px solid rgb(10, 0, 0)', borderRadius: 12, padding: '24px', marginTop: 48, textAlign: 'center' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' },
  ctaBtn:  { display: 'block', width: 'fit-content', marginTop: 12, marginLeft: 'auto', marginRight: 'auto', background: `linear-gradient(90deg,${OR},${OR2})`, color: 'var(--on-accent)', fontWeight: 700, fontSize: 14, padding: '10px 24px', borderRadius: 8, textDecoration: 'none' },
  state:   { fontSize: 14, color: 'var(--ink-soft)', padding: '12px 0', textAlign: 'center' as const },
};

/*DKDK_FORMATS_GRID — grille dynamique des formats, lue en direct depuis l'Admin.*/
interface FmtRow { id: string; code: string; libelle: string; nb_candidats: number; nb_etapes: number; nb_videos: number; objectif_etape: number; actif: boolean; ordre?: number; }
interface BlocRow { id: string; format_code: string; niveau: number; objectif: number; nb_gagnants: number; }
const fmtF = (n: number): string => (n ?? 0).toLocaleString('fr-FR') + ' F';

function FormatsGrid() {
  const [fmts, setFmts]       = useState<FmtRow[]>([]);
  const [blocs, setBlocs]     = useState<BlocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState(false);
  const [detail, setDetail]   = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/challenge-formats`, { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error('formats'))),
      fetch(`${API}/bloc-objectifs`, { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error('blocs'))),
    ])
      .then(([f, b]) => {
        setFmts((Array.isArray(f) ? f : (f?.data ?? [])) as FmtRow[]);
        setBlocs((Array.isArray(b) ? b : (b?.data ?? [])) as BlocRow[]);
      })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  const candOf = (code: string): number => fmts.find(f => f.code === code)?.nb_candidats ?? (parseInt(code.replace('C', ''), 10) || 0);
  const gagnantsFmt = (f: FmtRow): number | null => {
    const exact = blocs.find(b => b.format_code === f.code && b.niveau === f.nb_videos);
    if (exact) return exact.nb_gagnants;
    const any = blocs.filter(b => b.format_code === f.code).sort((a, c) => c.niveau - a.niveau)[0];
    return any ? any.nb_gagnants : null;
  };

  if (loading) return <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '6px 0' }}>Chargement des formats…</div>;
  if (err) return <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '6px 0' }}>Impossible de charger les formats pour le moment. Réessaie un peu plus tard.</div>;

  const th: React.CSSProperties = { textAlign: 'left', fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--or)', padding: '9px 10px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { fontSize: 13, color: 'var(--ink)', padding: '9px 10px', borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap' };
  const tdMut: React.CSSProperties = { ...td, color: 'var(--ink-soft)' };
  const blocsActifs = blocs.filter(b => fmts.some(f => f.code === b.format_code));

  return (
    <div style={{ margin: '4px 0 2px' }}>
      <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 14 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr>
              <th style={th}>Format</th><th style={th}>Candidats</th><th style={th}>Étapes</th><th style={th}>Vidéos</th><th style={th}>Objectif/étape</th><th style={th}>Gagnants</th><th style={th}>Éliminés</th>
            </tr>
          </thead>
          <tbody>
            {fmts.map(f => {
              const g = gagnantsFmt(f);
              const elim = g != null ? f.nb_candidats - g : null;
              return (
                <tr key={f.id}>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--or)' }}>{f.code}</td>
                  <td style={tdMut}>{f.nb_candidats}</td>
                  <td style={tdMut}>{f.nb_etapes}</td>
                  <td style={tdMut}>{f.nb_videos}</td>
                  <td style={td}>{fmtF(f.objectif_etape)}</td>
                  <td style={{ ...td, color: 'var(--green, #4ade80)', fontWeight: 700 }}>{g != null ? g : '—'}</td>
                  <td style={{ ...td, color: 'var(--red, #ff6b6b)', fontWeight: 700 }}>{elim != null ? elim : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={() => setDetail(v => !v)} style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--or)', fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: '7px 14px', cursor: 'pointer' }}>
        {detail ? '▾ Masquer le détail par niveau' : '▸ Voir le détail par niveau (bloc groupé)'}
      </button>
      {detail && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12, marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr><th style={th}>Format</th><th style={th}>Niveau</th><th style={th}>Vidéos</th><th style={th}>Objectif</th><th style={th}>Gagnants</th><th style={th}>Éliminés</th></tr>
            </thead>
            <tbody>
              {blocsActifs.map(b => (
                <tr key={b.id}>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--or)' }}>{b.format_code}</td>
                  <td style={tdMut}>Niveau {b.niveau}</td>
                  <td style={tdMut}>{b.niveau} vidéo{b.niveau > 1 ? 's' : ''}</td>
                  <td style={td}>{fmtF(b.objectif)}</td>
                  <td style={{ ...td, color: 'var(--green, #4ade80)', fontWeight: 700 }}>{b.nb_gagnants}</td>
                  <td style={{ ...td, color: 'var(--red, #ff6b6b)', fontWeight: 700 }}>{candOf(b.format_code) - b.nb_gagnants}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Rendu d'une ligne : liens [texte](url) + **gras**.
function renderRich(line: string) {
  const nodes: React.ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g;
  let last = 0; let m: RegExpExecArray | null; let key = 0;
  const pushText = (txt: string) => {
    const parts = txt.split(/\*\*(.+?)\*\*/g);
    parts.forEach((seg, j) => nodes.push(j % 2 === 1
      ? <strong key={'b' + (key++)} style={{ fontSize: 17, fontWeight: 800, color: OR }}>{seg}</strong>
      : <span key={'s' + (key++)}>{seg}</span>));
  };
  while ((m = linkRe.exec(line)) !== null) {
    if (m.index > last) pushText(line.slice(last, m.index));
    const url = m[2];
    nodes.push(<a key={'l' + (key++)} href={url} target={url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ color: OR, textDecoration: 'underline', fontWeight: 700 }}>{m[1]}</a>);
    last = m.index + m[0].length;
  }
  if (last < line.length) pushText(line.slice(last));
  return nodes;
}

function FaqItem({ q, a, node }: { q: string; a: string; node?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [lecture, setLecture] = useState(false);
  const refContenu = useRef<HTMLDivElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const lines = (a || '').split('\n');

  useEffect(() => () => { stopRef.current?.(); }, []);

  const ecouter = () => {
    if (lecture) { stopRef.current?.(); setLecture(false); return; }
    const txt = q + '. ' + (refContenu.current?.innerText || a || '');
    setLecture(true);
    stopRef.current = lireTexte(txt, () => setLecture(false));
  };
  const basculer = () => {
    if (open) { stopRef.current?.(); setLecture(false); setOpen(false); }
    else setOpen(true);
  };

  return (
    <div style={s.item}>
      <button style={s.q} onClick={basculer}>
        <span>{q}</span>
        <span style={{ color: OR, fontSize: 18, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none', display: 'inline-block' }}>+</span>
      </button>
      {open && (
        <div style={s.a}>
          <div ref={refContenu}>
            {lines.map((line, i) => (
              <span key={i}>{renderRich(line)}{i < lines.length - 1 && <br />}</span>
            ))}
            {node ? <div style={{ marginTop: 12 }}>{node}</div> : null}
          </div>
          <button onClick={ecouter} data-noread="true"
            style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 7, background: 'transparent', border: `1px solid ${OR}`, color: OR, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12.5, padding: '7px 14px', borderRadius: 999, cursor: 'pointer' }}>
            {lecture ? '\u23f9\ufe0f Arr\u00eater' : '\ud83d\udd0a \u00c9couter la r\u00e9ponse'}
          </button>
        </div>
      )}
    </div>
  );
}

type FaqCat = { id: string; libelle: string; items: { id: string; type: string; question: string; reponse: string }[] };

export default function FAQPage() {
  const [cats, setCats] = useState<FaqCat[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const r = await fetch(`${API}/faq`, { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok || !j.success) { if (!annule) setState('error'); return; }
        const d = (j.data || []) as FaqCat[];
        if (!annule) { setCats(d); setState(d.length ? 'ready' : 'empty'); }
      } catch { if (!annule) setState('error'); }
    })();
    return () => { annule = true; };
  }, []);

  return (
    <div style={s.page}>
      <Navbar />
      <EcouterPage />{/*DKDK_FAQ_NAVBAR_USE*/}
      <div style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%,hsl(339, 98%, 49%) 0%,transparent 70%)', paddingTop: 8 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 4px' }}>
          <section style={{ background: 'linear-gradient(135deg,rgba(126,3,128,0.52),rgba(237,7,15))', border: '1px solid rgb(10,0,0)', borderRadius: 16, padding: '24px 20px', textAlign: 'center', color: '#fff', boxShadow: '0 8px 40px rgba(225,29,143,0.35)' }}>
            <span style={{ display: 'inline-block', background: 'linear-gradient(135deg,#FF6B00,#FFD700)', color: 'var(--on-accent)', fontWeight: 800, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 6 }}>Aide</span>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, lineHeight: 1.1, margin: '12px 0 8px', color: '#fff', textTransform: 'uppercase' }}>Questions Fréquentes</h1>
            <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, maxWidth: '52ch', margin: '0 auto', lineHeight: 1.55 }}>Tout ce que vous devez savoir sur Diki-Diki.</p>
          </section>
        </div>
      </div>

      <div style={s.divider} />

      <div style={s.body}>
        {state === 'loading' && <p style={s.state}>Chargement de la FAQ…</p>}
        {state === 'error' && <p style={s.state}>Impossible de charger la FAQ pour le moment. Réessaie un peu plus tard.</p>}
        {state === 'empty' && <p style={s.state}>La FAQ sera bientôt disponible.</p>}
        {state === 'ready' && cats.map((c) => (
          <div key={c.id}>
            <p style={s.catTitle}>{c.libelle}</p>
            {c.items.map((it) => {
              const node = it.type === 'formats' ? <FormatsGrid /> : it.type === 'avantages' ? <EchosAvantagesBlock /> : undefined;
              const a = it.type === 'avantages' ? '' : it.reponse;
              return <FaqItem key={it.id} q={it.question} a={a} node={node} />;
            })}
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
