'use client';
import { useState, useEffect } from 'react';

/*DKDK_SPLASH*/
// Ecran de demarrage anime Diki-Diki Vision.
// - joue une seule fois par visite (sessionStorage)
// - sequence : traits + VISION -> etoile qui tourne et se fixe -> lettres Diki/Diki
// - disparait quand la page est prete (fondu), au minimum apres la fin de l'anim
// - securite anti-blocage : disparait de force apres 8 s max, quoi qu'il arrive
export default function SplashScreen() {
  // Phase d'animation : 0 = rien, 1 = traits+vision, 2 = etoile, 3 = lettres
  const [phase, setPhase] = useState(0);
  // Affichage global du splash
  const [show, setShow] = useState(true);
  // Fondu de sortie
  const [fadeOut, setFadeOut] = useState(false);
  // Evite le rendu cote serveur (sessionStorage non dispo sur le serveur)
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Deja vu pendant cette visite ? -> on ne rejoue pas.
    let dejaVu = false;
    try {
      dejaVu = sessionStorage.getItem('dkdk_splash_vu') === '1';
    } catch (e) {
      dejaVu = false;
    }
    if (dejaVu) {
      setShow(false);
      return;
    }

    // Sequence d'animation (temps en ms)
    const t1 = setTimeout(() => setPhase(1), 200);   // traits + VISION
    const t2 = setTimeout(() => setPhase(2), 1200);  // etoile arrive et tourne
    const t3 = setTimeout(() => setPhase(3), 2200);  // lettres Diki / Diki

    // Fin normale : quand la page est prete ET l'anim finie (~3,3 s mini)
    const ANIM_MIN = 3300;
    let closed = false;
    const closeSplash = (delay: number) => {
      if (closed) return;
      closed = true;
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setShow(false);
          try { sessionStorage.setItem('dkdk_splash_vu', '1'); } catch (e) {}
        }, 600); // duree du fondu
      }, delay);
    };

    // La page est-elle deja prete ?
    const startTime = Date.now();
    const onReady = () => {
      const elapsed = Date.now() - startTime;
      const reste = Math.max(ANIM_MIN - elapsed, 0);
      closeSplash(reste);
    };

    if (document.readyState === 'complete') {
      onReady();
    } else {
      window.addEventListener('load', onReady);
    }

    // Securite anti-blocage : disparait de force apres 8 s max
    const tSafety = setTimeout(() => closeSplash(0), 8000);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(tSafety);
      window.removeEventListener('load', onReady);
    };
  }, []);

  if (!mounted || !show) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#121218',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.6s ease',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* Logo : Diki ★ Diki */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 58,
          letterSpacing: 1,
        }}
      >
        <span
          style={{
            color: '#FFAA00',
            display: 'inline-block',
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateX(0)' : 'translateX(-340px)',
            transition: 'transform 0.7s cubic-bezier(.2,.8,.2,1), opacity 0.7s',
          }}
        >
          Diki
        </span>
        <span
          style={{
            color: '#E20707',
            display: 'inline-block',
            opacity: phase >= 2 ? 1 : 0,
            transform:
              phase >= 2
                ? 'translate(0,0) scale(1) rotate(0deg)'
                : 'translate(150px,-150px) scale(0.2) rotate(-540deg)',
            transition:
              'transform 1s cubic-bezier(.2,.7,.2,1), opacity 0.6s',
          }}
        >
          ★
        </span>
        <span
          style={{
            color: '#FFAA00',
            display: 'inline-block',
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? 'translateX(0)' : 'translateX(340px)',
            transition:
              'transform 0.7s cubic-bezier(.2,.8,.2,1) 0.15s, opacity 0.7s 0.15s',
          }}
        >
          Diki
        </span>
      </div>

      {/* Traits + VISION */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span
          style={{
            height: 2,
            width: phase >= 1 ? 60 : 0,
            background: '#ffffff',
            display: 'inline-block',
            transition: 'width 0.6s ease',
          }}
        />
        <span
          style={{
            color: '#ffffff',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 600,
            fontSize: 17,
            letterSpacing: 7,
            opacity: phase >= 1 ? 1 : 0,
            transition: 'opacity 0.6s ease',
          }}
        >
          VISION
        </span>
        <span
          style={{
            height: 2,
            width: phase >= 1 ? 60 : 0,
            background: '#ffffff',
            display: 'inline-block',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}
