'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import LogoDikiDiki from './LogoDikiDiki';
import TranslateWidget from './TranslateWidget';

const DISCIPLINES = [
  { label: 'Danse',      emoji: '💃', value: 'danse' },
  { label: 'Chant',      emoji: '🎤', value: 'chant' },
  { label: 'Instrument', emoji: '🎸', value: 'instrument' },
  { label: 'Acapella',   emoji: '🎵', value: 'acapella' },
  { label: 'Humour',     emoji: '😂', value: 'humour' },
  { label: 'Poésie',     emoji: '✍️', value: 'poesie' },
];

export default function Navbar() {
  const router   = useRouter();
  const pathname = usePathname();
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search,     setSearch]     = useState('');
  const [token,      setToken]      = useState<string | null>(null);
  const [isAdmin,    setIsAdmin]    = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('dkdk_token');
    setToken(t);
    if (t) {
      try {
        const p = JSON.parse(atob(t.split('.')[1]));
        setIsAdmin(p.role === 'admin');
      } catch {}
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/home?q=${encodeURIComponent(search.trim())}`);
      setSearchOpen(false);
      setSearch('');
    }
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <>
      {/* ── Navbar principale ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(6,0,0,0.97)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 12px 0 0',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo collé à gauche */}
        <Link href="/home" style={{ textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <LogoDikiDiki width={130} />
        </Link>

        {/* Icônes droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Sélecteur de langue */}
          <TranslateWidget />

          {/* Loupe */}
          <button
            onClick={() => { setSearchOpen(o => !o); setMenuOpen(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#00CC00', fontSize: 18 }}
          >
            🔍
          </button>

          {/* Compte */}
          <button
            onClick={() => router.push(token ? '/compte' : '/auth/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#FFAA00', fontSize: 20 }}
          >
            👤
          </button>

          {/* Hamburger */}
          <button
            onClick={() => { setMenuOpen(o => !o); setSearchOpen(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <span style={{ width: 20, height: 2, background: '#FF0000', borderRadius: 2, display: 'block', transition: 'transform .3s', transform: menuOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }}/>
            <span style={{ width: 20, height: 2, background: '#FF0000', borderRadius: 2, display: 'block', opacity: menuOpen ? 0 : 1, transition: 'opacity .2s' }}/>
            <span style={{ width: 20, height: 2, background: '#FF0000', borderRadius: 2, display: 'block', transition: 'transform .3s', transform: menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }}/>
          </button>
        </div>
      </nav>

      {/* ── Barre de recherche ── */}
      {searchOpen && (
        <div style={{ background: '#0a0a0f', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 56, zIndex: 99 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 50, padding: '7px 14px' }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>🔍</span>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Candidat, titre, artiste..."
              style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, flex: 1, fontFamily: 'DM Sans, sans-serif' }}
            />
            {search && (
              <button type="submit" style={{ background: 'linear-gradient(135deg,#FFAA00,#FF6B00)', border: 'none', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#000', cursor: 'pointer' }}>OK</button>
            )}
          </form>
        </div>
      )}

      {/* ── Menu déroulant ── */}
      {menuOpen && (
        <div style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '8px 16px 12px', position: 'sticky', top: 56, zIndex: 99 }}>

          {[
            { href: '/home',            label: 'Accueil' },
            { href: '/challenges',      label: 'Challenges' },
            { href: '/education',       label: 'Education & Savoirs' },
            { href: '/faq',             label: 'Comment ça marche' },
            { href: '/auth/register',   label: "S'inscrire", hide: !!token },
          ].filter(l => !l.hide).map(l => (
            <Link
              key={l.href} href={l.href}
              onClick={() => setMenuOpen(false)}
              style={{ color: isActive(l.href) ? '#FFAA00' : '#fff', fontSize: 13, fontWeight: isActive(l.href) ? 700 : 600, textDecoration: 'none', padding: '9px 0', borderBottom: '1px solid #1a1a1a', display: 'block' }}
            >
              {l.label}
            </Link>
          ))}

          <div style={{ padding: '8px 0 4px', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '.1em', fontWeight: 700 }}>DISCIPLINES</div>
          {DISCIPLINES.map(d => (
            <Link
              key={d.value}
              href={`/home?discipline=${d.value}`}
              onClick={() => setMenuOpen(false)}
              style={{ color: '#FF0000', fontSize: 13, fontWeight: 700, textDecoration: 'none', padding: '8px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span>{d.emoji}</span> {d.label}
            </Link>
          ))}

          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ color: '#FFAA00', fontSize: 13, fontWeight: 700, textDecoration: 'none', padding: '9px 0', borderBottom: '1px solid #1a1a1a', display: 'block' }}>
              ⚙️ Admin
            </Link>
          )}
          {token ? (
            <button
              onClick={() => { localStorage.removeItem('dkdk_token'); window.location.href = '/home'; }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.7)', fontSize: 13, cursor: 'pointer', padding: '9px 0', textAlign: 'left', width: '100%', fontFamily: 'DM Sans, sans-serif' }}
            >
              Se déconnecter
            </button>
          ) : (
            <Link href="/auth/login" onClick={() => setMenuOpen(false)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none', padding: '9px 0', display: 'block' }}>
              Connexion
            </Link>
          )}
        </div>
      )}
    </>
  );
}
