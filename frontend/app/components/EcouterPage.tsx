'use client';
import { useEffect, useRef, useState } from 'react';

/* 🔊 Lecteur « Écouter la page » — synthèse vocale GRATUITE du navigateur (Web Speech API).
   Aucune clé API, aucun serveur, fonctionne hors-ligne. Lit le contenu principal de la page
   (le menu <nav>, le pied de page et le bouton lui-même sont exclus). Voix française si dispo.
   Play / Pause / Reprendre / Arrêter. Si le navigateur ne sait pas lire, le bouton ne s'affiche pas. */
export default function EcouterPage() {
  const [etat, setEtat] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [dispo, setDispo] = useState(true);
  const voixRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { setDispo(false); return; }
    const choisir = () => {
      const voix = window.speechSynthesis.getVoices();
      voixRef.current =
        voix.find(v => /^fr/i.test(v.lang) && /google|natural|enhanced|premium/i.test(v.name)) ||
        voix.find(v => /^fr/i.test(v.lang)) || null;
    };
    choisir();
    window.speechSynthesis.onvoiceschanged = choisir;
    return () => { try { window.speechSynthesis.cancel(); } catch {} };
  }, []);

  // Récupère le texte visible de la page, sans le menu / pied de page / lecteur.
  const collecterTexte = (): string => {
    const clone = document.body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('nav, header, footer, script, style, noscript, svg, .dkdk-ecouter, [data-noread]')
      .forEach(e => e.remove());
    clone.style.position = 'fixed'; clone.style.left = '-99999px'; clone.style.top = '0';
    clone.style.width = '800px'; clone.setAttribute('aria-hidden', 'true');
    document.body.appendChild(clone);
    const t = clone.innerText || '';
    document.body.removeChild(clone);
    return t.replace(/ /g, ' ').replace(/[ \t]{2,}/g, ' ').replace(/\n{2,}/g, '\n').trim();
  };

  const lire = () => {
    const synth = window.speechSynthesis;
    if (etat === 'playing') { synth.pause(); setEtat('paused'); return; }
    if (etat === 'paused') { synth.resume(); setEtat('playing'); return; }

    const contenu = collecterTexte();
    if (!contenu) return;
    synth.cancel();
    // Découpe en phrases : contourne le bug de certains navigateurs qui coupent les longs textes.
    const morceaux = (contenu.match(/[^.!?\n]+[.!?]*/g) || [contenu]).map(m => m.trim()).filter(Boolean);
    let i = 0;
    const suivant = () => {
      if (i >= morceaux.length) { setEtat('idle'); return; }
      const u = new SpeechSynthesisUtterance(morceaux[i++]);
      u.lang = 'fr-FR';
      if (voixRef.current) u.voice = voixRef.current;
      u.rate = 1; u.pitch = 1;
      u.onend = suivant;
      u.onerror = () => setEtat('idle');
      synth.speak(u);
    };
    setEtat('playing');
    suivant();
  };

  const arreter = () => { try { window.speechSynthesis.cancel(); } catch {} setEtat('idle'); };

  if (!dispo) return null;

  const OR = 'linear-gradient(135deg,#FFAA00,#FF6B00)';
  const pill: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer',
    borderRadius: 999, padding: '12px 18px', fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
    color: '#140a02', background: OR, boxShadow: '0 8px 24px rgba(255,120,0,0.35)',
  };
  const mini: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(20,10,2,0.9)', color: '#fff',
    width: 44, height: 44, borderRadius: '50%', fontSize: 16,
  };

  return (
    <div className="dkdk-ecouter" data-noread="true"
      style={{ position: 'fixed', right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', zIndex: 3000, display: 'flex', alignItems: 'center', gap: 8 }}>
      {etat === 'idle' && (
        <button onClick={lire} style={pill} aria-label="Écouter la page à voix haute">
          <span style={{ fontSize: 17 }}>🔊</span> Écouter la page
        </button>
      )}
      {etat === 'playing' && (
        <>
          <button onClick={lire} style={pill} aria-label="Mettre en pause la lecture">
            <span style={{ fontSize: 15 }}>⏸️</span> Pause
          </button>
          <button onClick={arreter} style={mini} aria-label="Arrêter la lecture" title="Arrêter">⏹️</button>
        </>
      )}
      {etat === 'paused' && (
        <>
          <button onClick={lire} style={pill} aria-label="Reprendre la lecture">
            <span style={{ fontSize: 15 }}>▶️</span> Reprendre
          </button>
          <button onClick={arreter} style={mini} aria-label="Arrêter la lecture" title="Arrêter">⏹️</button>
        </>
      )}
    </div>
  );
}
