// frontend/lib/track.ts
// Helper d'événements marketing (TikTok + Meta). Sûr : ne fait rien tant que
// le consentement n'a pas chargé les pixels. À importer partout dans l'app.
//   import { track } from '@/lib/track';  // ou chemin relatif
//   track('purchase', { value: 1000, currency: 'XOF' });

export type DkdkEvent =
  | 'register'          // création de compte
  | 'vote'              // vote payant
  | 'purchase'          // recharge réussie (value + currency)
  | 'view_content'      // vue d'un candidat / challenge
  | 'initiate_checkout';// ouverture du panneau de recharge

export function track(event: DkdkEvent, params?: Record<string, any>): void {
  if (typeof window === 'undefined') return;
  const w = window as any;
  try {
    if (typeof w.dkdkTrack === 'function') w.dkdkTrack(event, params || {});
  } catch {
    /* silencieux : le tracking ne doit jamais casser l'app */
  }
}
