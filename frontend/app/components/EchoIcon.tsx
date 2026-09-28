'use client';
import { useId } from 'react';

/**
 * Diki-Diki — Icône « Écho »
 * Ondes concentriques (version couleur unie). L'Écho prend la couleur du STATUT :
 *   messager    -> vert
 *   porteparole -> jaune
 *   ambassadeur -> rouge
 *   heraut      -> arc-en-ciel (dégradé)
 *
 * Géométrie figée le 28/09/2026 : viewBox 64×64 · point r=5.5 · anneau r=14 (op .82) · anneau r=23 (op .45) · trait 4.5.
 */

export type StatutEcho = 'messager' | 'porteparole' | 'ambassadeur' | 'heraut';

const COULEURS: Record<Exclude<StatutEcho, 'heraut'>, string> = {
  messager: '#1FB673',    // vert
  porteparole: '#FFC233', // jaune
  ambassadeur: '#FF3B23', // rouge
};

// Variantes un peu foncées pour un fond très clair (vert & jaune) — optionnel.
const COULEURS_FOND_CLAIR: Partial<Record<StatutEcho, string>> = {
  messager: '#159E5A',
  porteparole: '#E0A100',
};

export interface EchoIconProps {
  /** Statut du votant : détermine la couleur. Défaut : "messager". */
  statut?: StatutEcho;
  /** Taille en px (carré). Défaut : 20. */
  size?: number;
  /** Passer true sur un fond très clair pour foncer légèrement vert & jaune. */
  fondClair?: boolean;
  /** Libellé accessible. Défaut : "Écho". */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function EchoIcon({
  statut = 'messager',
  size = 20,
  fondClair = false,
  title = 'Écho',
  className,
  style,
}: EchoIconProps) {
  const gid = useId(); // id unique -> pas de collision de dégradé si plusieurs Héraut sur la page

  if (statut === 'heraut') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={title} className={className} style={style}>
        <defs>
          <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FF3B23" />
            <stop offset="0.22" stopColor="#FF9F1C" />
            <stop offset="0.42" stopColor="#FFD21E" />
            <stop offset="0.6" stopColor="#1FB673" />
            <stop offset="0.8" stopColor="#2B8CFF" />
            <stop offset="1" stopColor="#A24BFF" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="5.5" fill={`url(#${gid})`} />
        <circle cx="32" cy="32" r="14" fill="none" stroke={`url(#${gid})`} strokeWidth="4.5" opacity="0.9" />
        <circle cx="32" cy="32" r="23" fill="none" stroke={`url(#${gid})`} strokeWidth="4.5" opacity="0.55" />
      </svg>
    );
  }

  const c = (fondClair && COULEURS_FOND_CLAIR[statut]) || COULEURS[statut];

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={title} className={className} style={style}>
      <circle cx="32" cy="32" r="5.5" fill={c} />
      <circle cx="32" cy="32" r="14" fill="none" stroke={c} strokeWidth="4.5" opacity="0.82" />
      <circle cx="32" cy="32" r="23" fill="none" stroke={c} strokeWidth="4.5" opacity="0.45" />
    </svg>
  );
}
