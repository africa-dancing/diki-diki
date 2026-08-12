// backend/src/cron/bracket.cron.ts
import { checkAndAdvanceRounds } from '../services/bracket.service';

/**
 * Lance le cron bracket.
 * Appelé depuis index.ts au démarrage du serveur.
 * Tourne toutes les heures.
 */
export function startBracketCron() {
  const INTERVAL_MS = 3 * 60 * 1000; // 3 minutes (filet de securite) /*DKDK_CRON_3MIN*/
  // Note : la fermeture se fait normalement DES le vote qui atteint l'objectif (voir /arena/vote-pool).
  // Ce cron n'est qu'un filet de securite au cas ou un declenchement immediat serait manque.

  console.log('⚡ [BRACKET CRON] Démarré — vérification toutes les 3 minutes (filet de sécurité)');

  let enCours = false; // anti-chevauchement : jamais deux passages simultanes /*DKDK_CRON_LOCK*/
  const run = async () => {
    if (enCours) return;
    enCours = true;
    try {
      await checkAndAdvanceRounds();
    } catch (err: any) {
      console.error('🔴 [BRACKET CRON] Erreur :', err.message);
    } finally {
      enCours = false;
    }
  };

  // Lancement immédiat au démarrage
  run();

  // Puis toutes les 3 minutes
  setInterval(run, INTERVAL_MS);
}