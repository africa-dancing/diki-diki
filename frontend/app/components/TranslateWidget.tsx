'use client';

import { useState, useEffect } from 'react';

interface Language { code: string; label: string; iso: string; }

const LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français',  iso: 'fr' },
  { code: 'en', label: 'English',   iso: 'gb' },
  { code: 'ar', label: 'العربية',    iso: 'sa' },
  { code: 'pt', label: 'Português', iso: 'br' },
  { code: 'es', label: 'Español',   iso: 'es' },
  { code: 'ha', label: 'Hausa',     iso: 'ng' },
  { code: 'sw', label: 'Kiswahili', iso: 'ke' },
  { code: 'yo', label: 'Yorùbá',    iso: 'ng' },
  { code: 'de', label: 'Deutsch',   iso: 'de' },
  { code: 'zh', label: '中文',       iso: 'cn' },
];

function Flag({ iso, size = 24 }: { iso: string; size?: number }) {
  return (
    <img
      src={`https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${iso}.png`}
      srcSet={`https://flagcdn.com/${size * 2}x${Math.round(size * 0.75) * 2}/${iso}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={iso}
      style={{ borderRadius: 3, objectFit: 'cover', flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
      loading="lazy"
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

    document.cookie = `googtrans=/fr/${lang.code}; path=/`;
    document.cookie = `googtrans=/fr/${lang.code}; domain=.${window.location.hostname}; path=/`;

    if (lang.code === 'fr') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=.${window.location.hostname}; path=/`;
      window.location.reload();
      return;
    }

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

    const apply = () => {
      const sel = document.querySelector<HTMLSelectElement>('.goog-te-combo');
      if (sel) { sel.value = lang.code; sel.dispatchEvent(new Event('change')); }
      else setTimeout(apply, 500);
    };
    setTimeout(apply, 800);
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:20, padding:'6px 12px', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:12, fontFamily:'DM Sans, sans-serif', fontWeight:700, height:34 }}>
        <Flag iso={current.iso} size={20} />
        <span style={{ fontSize: 12 }}>{current.label}</span>
        <span style={{ fontSize:8, opacity:0.5 }}>▾</span>
      </button>

      {open && (
        <div style={{ position:'absolute', top:40, right:0, background:'#12121e', border:'1px solid rgba(255,170,0,0.2)', borderRadius:14, padding:6, zIndex:300, minWidth:180, boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
          {LANGUAGES.map(lang => (
            <button key={lang.code} onClick={() => selectLang(lang)} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'8px 12px', background:current.code===lang.code?'rgba(255,170,0,0.1)':'none', border:'none', borderRadius:8, color:current.code===lang.code?'#FFAA00':'#f0f0f0', fontSize:13, fontFamily:'DM Sans, sans-serif', cursor:'pointer', textAlign:'left' as const }}>
              <Flag iso={lang.iso} size={24} />
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
