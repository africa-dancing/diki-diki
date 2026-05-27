'use client';

import { useState, useEffect } from 'react';

interface Language { code: string; label: string; flag: string; iso: string; }

const LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français',   flag: '🇫🇷', iso: 'fr' },
  { code: 'en', label: 'English',    flag: '🇬🇧', iso: 'gb' },
  { code: 'ar', label: 'العربية',    flag: '🇸🇦', iso: 'sa' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷', iso: 'br' },
  { code: 'es', label: 'Español',    flag: '🇪🇸', iso: 'es' },
  { code: 'ha', label: 'Hausa',      flag: '🇳🇬', iso: 'ng' },
  { code: 'sw', label: 'Kiswahili',  flag: '🇰🇪', iso: 'ke' },
  { code: 'yo', label: 'Yorùbá',     flag: '🇳🇬', iso: 'ng' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪', iso: 'de' },
  { code: 'zh', label: '中文',        flag: '🇨🇳', iso: 'cn' },
];

function FlagImg({ iso, size = 20 }: { iso: string; size?: number }) {
  return (
    <img
      src={`https://flagcdn.com/w${size}/${iso}.png`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={iso}
      style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
    />
  );
}

export default function TranslateWidget() {
  const [open, setOpen]       = useState(false);
  const [current, setCurrent] = useState<Language>(LANGUAGES[0]);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dkdk_lang') : null;
    if (saved) { const f = LANGUAGES.find(l => l.code === saved); if (f) setCurrent(f); }
  }, []);

  // Fermer dropdown en cliquant ailleurs
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const selectLang = (lang: Language) => {
    setCurrent(lang);
    setOpen(false);
    localStorage.setItem('dkdk_lang', lang.code);

    // Cookie Google Translate
    document.cookie = `googtrans=/fr/${lang.code}; path=/`;
    document.cookie = `googtrans=/fr/${lang.code}; domain=.${window.location.hostname}; path=/`;

    if (lang.code === 'fr') {
      // Reset traduction
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=.${window.location.hostname}; path=/`;
      window.location.reload();
      return;
    }

    // Charger Google Translate si pas encore chargé
    if (!(window as any).google?.translate) {
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'fr', autoDisplay: false },
          'gt-container'
        );
      };
      if (!document.getElementById('gt-script')) {
        const s = document.createElement('script');
        s.id = 'gt-script';
        s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.head.appendChild(s);
      }
    }

    // Appliquer la langue après chargement
    const apply = () => {
      const sel = document.querySelector<HTMLSelectElement>('.goog-te-combo');
      if (sel) { sel.value = lang.code; sel.dispatchEvent(new Event('change')); }
      else setTimeout(apply, 500);
    };
    setTimeout(apply, 800);
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'8px 18px', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:14, fontFamily:'DM Sans, sans-serif', fontWeight:700, height:38 }}>
        <FlagImg iso={current.iso} size={20} />
        <span>{current.label}</span>
        <span style={{ fontSize:9, opacity:0.5 }}>▾</span>
      </button>

      {open && (
        <div style={{ position:'absolute', top:38, right:0, background:'#12121e', border:'1px solid rgba(255,170,0,0.2)', borderRadius:14, padding:6, zIndex:300, minWidth:165, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
          {LANGUAGES.map(lang => (
            <button key={lang.code} onClick={() => selectLang(lang)} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'8px 12px', background:current.code===lang.code?'rgba(255,170,0,0.1)':'none', border:'none', borderRadius:8, color:current.code===lang.code?'#FFAA00':'#f0f0f0', fontSize:13, fontFamily:'DM Sans, sans-serif', cursor:'pointer', textAlign:'left' as const }}>
              <FlagImg iso={lang.iso} size={22} />
              <span>{lang.label}</span>
              {current.code === lang.code && <span style={{ marginLeft:'auto', fontSize:10 }}>✓</span>}
            </button>
          ))}
        </div>
      )}

      <div id="gt-container" style={{ display:'none' }} />
    </div>
  );
}