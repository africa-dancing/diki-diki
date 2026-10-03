/* DKDK_COMPTE_TABS — barre d'onglets partagee de l'espace Compte.
   Utilisee par /compte (onSelect = changement d'onglet interne) et par les
   pages-onglets autonomes comme /mon-affiche (navigation via /compte?tab=...). */
'use client';
import { useRouter } from 'next/navigation';

type TabDef = { id: string; emoji: string; label: string };
const TABS: TabDef[] = [
  { id: 'dashboard',    emoji: '📊', label: 'Tableau de bord' },
  { id: 'videos',       emoji: '🎬', label: 'Mes vidéos' },
  { id: 'competitions', emoji: '🏆', label: 'Mes challenges' },
  { id: 'education',    emoji: '📚', label: 'Éducation & Savoirs' },
  { id: 'finances',     emoji: '💳', label: 'Finances' },
  { id: 'messagerie',   emoji: '💬', label: 'Messagerie' },
  { id: 'settings',     emoji: '🔒', label: 'Confidentialité' },
];

export default function CompteTabs({ current, onSelect }: { current: string; onSelect?: (id: string) => void }) {
  const router = useRouter();
  const go = (id: string) => {
    if (id === 'affiche') { router.push('/mon-affiche'); return; }
    if (id === 'education') return; // bientôt
    if (onSelect) onSelect(id); else router.push('/compte?tab=' + id);
  };
  const base: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '14px 16px', background: 'none', border: 'none', fontSize: 13, whiteSpace: 'nowrap', transition: 'all .2s', fontFamily: 'DM Sans,sans-serif' };
  const tab = (id: string, soon = false): React.CSSProperties => ({ ...base, borderBottom: `2px solid ${current === id ? 'var(--or)' : 'transparent'}`, color: soon ? 'var(--ink-soft)' : (current === id ? 'var(--or)' : 'var(--ink)'), fontWeight: current === id ? 800 : 600, cursor: soon ? 'not-allowed' : 'pointer' });
  return (
    <div style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)', padding: '0 20px', display: 'flex', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {TABS.map(t => {
        const soon = t.id === 'education';
        const items = [
          <button key={t.id} onClick={() => go(t.id)} disabled={soon} style={tab(t.id, soon)}>
            <span>{t.emoji}</span><span>{t.label}</span>
            {soon && <span style={{ background: 'rgba(255,170,0,0.15)', color: 'var(--or)', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, marginLeft: 2 }}>bientôt</span>}
          </button>,
        ];
        if (t.id === 'videos') items.push(
          <button key="tab-affiche" onClick={() => go('affiche')} style={tab('affiche')}>
            <span>🖼️</span><span>Mon affiche</span>
          </button>
        );
        return items;
      })}
      <button onClick={() => router.push('/home')} style={{ ...base, marginLeft: 'auto', color: 'var(--ink)', fontWeight: 700, cursor: 'pointer' }}>&#8592; &#127968; Accueil</button>
    </div>
  );
}
